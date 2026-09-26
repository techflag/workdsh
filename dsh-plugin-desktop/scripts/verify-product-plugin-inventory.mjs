#!/usr/bin/env node

import { existsSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { PRODUCT_PACKAGES } from './workdsh-package-boundary.mjs'

const runtime = resolve(process.argv[2] ?? fileURLToPath(new URL('../build/workdsh-runtime', import.meta.url)))
const profile = join(runtime, 'profiles', 'workdsh')
const config = join(profile, '.workdsh-plugin-inventory-probe.yml')
const expected = PRODUCT_PACKAGES
const anchor = join(profile, 'node_modules', '@deepseek-ai', 'dsh', 'package.json')
if (!existsSync(anchor)) throw new Error(`Missing bundled DSH installation: ${anchor}`)

process.env.DSH_HOME = runtime
const packages = join(profile, 'node_modules', '@deepseek-ai')
const { boot } = await import(pathToFileURL(join(packages, 'dsh-app-boot', 'lib', 'index.js')).href)
const { default: PluginManager } = await import(pathToFileURL(join(packages, 'dsh-plugin-manager', 'lib', 'index.js')).href)

let ctx
try {
  writeFileSync(config, JSON.stringify([{ id: 'manager', name: 'cordis:manager' }]))
  ctx = await boot('dsh', config, [], root => {
    root.provide('profileContext', {
      name: 'workdsh', dir: profile, home: runtime, cwd: runtime,
      patchPath: join(profile, 'cordis.patch.yml'), installAnchor: anchor,
      startedBundles: [], overlays: [], telemetryDisabledEnv: undefined,
    })
    root.loader.builtins.manager = PluginManager
  })
  const bundles = (await ctx.pluginManager.listBundles()).filter(row => row.name.startsWith('workdsh-'))
  const names = bundles.map(row => row.name).sort()
  if (JSON.stringify(names) !== JSON.stringify(expected)) {
    throw new Error(`Plugin manager exposes ${names.join(', ') || '(none)'}; expected ${expected.join(', ')}`)
  }
  for (const bundle of bundles) {
    if (!bundle.enabled || !bundle.installed || bundle.error) {
      throw new Error(`WorkDSH product bundle is inactive or invalid: ${bundle.name}: ${JSON.stringify(bundle)}`)
    }
  }
  const skillHub = (await ctx.pluginManager.listBundles()).find(row => row.name === '@cocofhu/skillhub')
  if (!skillHub?.enabled || !skillHub.installed || skillHub.error) {
    throw new Error(`SkillHub DSH plugin is inactive or invalid: ${JSON.stringify(skillHub)}`)
  }
  console.log(`Verified plugin manager exposes exactly five WorkDSH product bundles: ${names.join(', ')}`)
} finally {
  try {
    await ctx?.fiber.dispose()
  } finally {
    rmSync(config, { force: true })
  }
}
