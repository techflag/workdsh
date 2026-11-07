#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const runtime = join(root, 'build', 'workdsh-runtime')
const profile = join(runtime, 'profiles', 'workdsh')
const primary = join(runtime, 'primary-runtime')
const node = join(primary, 'dependencies', 'node', 'bin', process.platform === 'win32' ? 'node.exe' : 'node')
for (const path of [join(root, 'lib', 'workdsh-main.js'), profile, node, primary]) {
  if (!existsSync(path)) throw new Error(`WorkDSH development runtime is missing: ${path}. Run yarn dev first.`)
}

const require = createRequire(import.meta.url)
const electron = require('electron')
// The single-instance lock is keyed by userData. Keep development data apart
// from an installed WorkDSH so both can run side by side, and so a development
// Profile install never rewrites the installed application's Home.
const userData = process.env.WORKDSH_DESKTOP_USER_DATA ?? join(root, 'build', 'dev-user-data')
console.log(`WorkDSH development data: ${userData}`)
const startedAt = Date.now()
const child = spawn(electron, [root], {
  cwd: root,
  env: {
    ...process.env,
    ELECTRON_RUN_AS_NODE: undefined,
    WORKDSH_DESKTOP_USER_DATA: userData,
    WORKDSH_BUNDLED_PROFILE: profile,
    WORKDSH_NODE_EXECUTABLE: node,
    WORKDSH_PRIMARY_RUNTIME: primary,
  },
  stdio: 'inherit',
  windowsHide: false,
})
child.on('error', error => {
  console.error(error)
  process.exitCode = 1
})
child.on('exit', code => {
  process.exitCode = code ?? 1
  if (code === 0 && Date.now() - startedAt < 5000) {
    console.error(`WorkDSH exited immediately: another instance already owns ${userData}. Close it before running yarn dev again.`)
  }
})
