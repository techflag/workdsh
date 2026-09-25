#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DSH_VERSION } from './runtime-version.mjs'

const desktopRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const upstreamRoot = resolve(desktopRoot, '..', 'deepseek-harness')
const target = process.platform === 'win32' ? 'win-x64'
  : process.platform === 'darwin' ? `mac-${process.env.WORKDSH_MAC_ARCH ?? process.arch}`
    : undefined
if (target === undefined || !['win-x64', 'mac-arm64', 'mac-x64'].includes(target)) {
  throw new Error(`Unsupported WorkDSH primary runtime target: ${target ?? process.platform}`)
}
const output = join(desktopRoot, 'build', 'workdsh-runtime')
const cache = join(desktopRoot, 'build', '.workdsh-primary-runtime-cache')
const corepack = process.platform === 'win32' ? 'corepack.cmd' : 'corepack'
const preparationTimeout = 12 * 60_000
const result = spawnSync(corepack, [
  'pnpm', 'run', 'prepare:primary-runtime', '--target', target, '--output', output, '--cache', cache,
], {
  cwd: upstreamRoot,
  env: { ...process.env, CI: 'true' },
  stdio: 'inherit',
  shell: process.platform === 'win32',
  timeout: preparationTimeout,
})
if (result.error?.code === 'ETIMEDOUT') {
  throw new Error(`Official primary runtime preparation exceeded ${preparationTimeout / 60_000} minutes for ${target}; check pinned asset downloads and retry the build`, { cause: result.error })
}
if (result.error) throw result.error
if (result.status !== 0) throw new Error(`Official primary runtime preparation failed: ${result.status}`)
const manifestPath = join(output, 'primary-runtime', 'runtime.json')
if (!existsSync(manifestPath) || !existsSync(join(output, 'office-skills'))) {
  throw new Error('Official primary runtime payload is incomplete')
}
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
if (manifest.desktopVersion !== DSH_VERSION || manifest.platform !== process.platform
  || manifest.arch !== target.slice(4)) {
  throw new Error(`Official primary runtime metadata does not match ${target} / ${DSH_VERSION}`)
}
const profile = join(output, 'profiles', 'workdsh')
const packagePath = join(profile, 'package.json')
if (!existsSync(packagePath)) throw new Error('WorkDSH release profile must be prepared first')
const profilePackage = JSON.parse(readFileSync(packagePath, 'utf8'))
const packages = [
  '@deepseek-ai/dsh-tool-workspace-dependencies',
  '@deepseek-ai/dsh-skill-office',
]
if (packages.some(name => profilePackage.dependencies?.[name] !== DSH_VERSION
  || !existsSync(join(profile, 'node_modules', name, 'package.json')))) {
  const pnpm = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  const install = spawnSync(pnpm, [
    '--yes', 'pnpm@11.8.0', '--dir', profile, 'add', '--save-exact',
    ...packages.map(name => `${name}@${DSH_VERSION}`),
  ], { env: process.env, stdio: 'inherit', shell: process.platform === 'win32' })
  if (install.error) throw install.error
  if (install.status !== 0) throw new Error(`Official Office plugins failed to install: ${install.status}`)
}
const patch = `# Official DeepSeek Harness Desktop workspace dependencies and Office skills.\n- insert:\n    - id: workspace-dependencies\n      name: '@deepseek-ai/dsh-tool-workspace-dependencies'\n      config:\n        source: !!js "process.env.DSH_BUNDLED_PRIMARY_RUNTIME"\n        root: !!js "process.getBuiltinModule('node:path').join(process.env.DSH_HOME, 'dsh-runtimes', 'dsh-primary-runtime')"\n    - id: skill-office\n      name: '@deepseek-ai/dsh-skill-office'\n      config:\n        assetRoot: !!js "process.getBuiltinModule('node:path').join(process.env.DSH_BUNDLED_PRIMARY_RUNTIME, '..', 'office-skills')"\n        node: !!js "process.getBuiltinModule('node:path').join(process.env.DSH_BUNDLED_PRIMARY_RUNTIME, 'dependencies', 'node', 'bin', process.platform === 'win32' ? 'node.exe' : 'node')"\n`
writeFileSync(join(profile, 'cordis.patch.yml'), patch)
console.log(`Prepared official DeepSeek Harness ${target} primary runtime at ${output}`)
