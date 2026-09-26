#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const webRoot = join(root, 'workdsh-web')
const args = process.argv.slice(2)
const sourceArg = args.find(arg => arg.startsWith('--source='))
if (args.length !== 1 || !sourceArg || !['local', 'published'].includes(sourceArg.slice('--source='.length))) {
  throw new Error('Usage: node scripts/package-desktop-release.mjs --source=local|published')
}
const source = sourceArg.slice('--source='.length)
const platform = process.platform
if (platform !== 'darwin' && platform !== 'win32') {
  throw new Error(`Desktop installer packaging requires macOS or Windows; found ${platform}`)
}
const corepack = platform === 'win32' ? 'corepack.cmd' : 'corepack'

function run(label, command, commandArgs, { cwd = root, env = process.env } = {}) {
  console.log(`\n==> ${label}`)
  const result = spawnSync(command, commandArgs, {
    cwd,
    env,
    stdio: 'inherit',
    shell: platform === 'win32' && command === corepack,
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${label} failed with exit code ${result.status}`)
}

run('Install Desktop dependencies', corepack, ['yarn', 'install', '--immutable'])
run('Install the pinned official DSH checkout dependencies', corepack, ['yarn', 'upstream:install'])
run('Check Desktop packaging', corepack, ['yarn', 'workspace', 'dsh-plugin-desktop', platform === 'win32' ? 'check:win-package' : 'check:mac-package'])

if (source === 'local') {
  run('Install Web dependencies', corepack, ['pnpm', 'install', '--frozen-lockfile'], { cwd: webRoot })
  run('Build WorkDSH Web and plugins', corepack, ['pnpm', 'build'], { cwd: webRoot })
  run('Pack this commit\'s WorkDSH Profile', corepack, ['pnpm', 'release:project:pack'], { cwd: webRoot })
  const version = JSON.parse(readFileSync(join(webRoot, 'package.json'), 'utf8')).version
  const manifest = JSON.parse(readFileSync(join(webRoot, '.artifacts', `project-v${version}`, 'release-manifest.json'), 'utf8'))
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
  if (manifest.version !== version || manifest.sourceCommit !== commit || manifest.sourceDirty) {
    const changed = execFileSync('git', ['diff', '--name-only', '--ignore-submodules=dirty', 'HEAD', '--'], { cwd: root, encoding: 'utf8' }).trim()
    throw new Error(`The local Web release candidate is not a clean package of this commit: version=${manifest.version}/${version}, commit=${manifest.sourceCommit}/${commit}, sourceDirty=${manifest.sourceDirty}, changed=${changed || '(none)'}`)
  }
}

const runtimeEnv = { ...process.env, WORKDSH_USE_LOCAL_RELEASE: source === 'local' ? '1' : '0' }
run('Prepare the single WorkDSH DSH Profile', corepack, ['yarn', 'workspace', 'dsh-plugin-desktop', 'prepare:workdsh-runtime'], { env: runtimeEnv })
run('Prepare bundled Python and Node.js', corepack, ['yarn', 'workspace', 'dsh-plugin-desktop', 'prepare:workdsh-primary-runtime'], { env: runtimeEnv })
run('Build the Desktop installer', process.execPath, [join(root, 'dsh-plugin-desktop', 'scripts', platform === 'win32' ? 'package-win.ts' : 'package-mac.ts')], {
  env: { ...runtimeEnv, DSH_PACKAGE_CHECK_ALREADY_RAN: '1' },
})

console.log(`\nDesktop package completed using ${source === 'local' ? 'this commit\'s Web Profile' : 'the published Web Profile'}.`)
