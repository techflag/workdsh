#!/usr/bin/env node
/** Keep the default WorkDSH Profile candidate in sync with the current owned sources. */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PACKAGE_DIRECTORIES, RELEASE_PACKAGES } from './workdsh-package-boundary.mjs'
import { verifyBuiltPackageExports } from './verify-profile-release.mjs'
const desktopRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const root = resolve(desktopRoot, '../..')
const webRoot = join(root, 'apps/web')
const release = join(desktopRoot, 'build/workdsh-profile-release')
const manifestFile = join(release, 'release-manifest.json')
const stampFile = join(release, 'source-fingerprint.txt')
const corepack = process.platform === 'win32' ? 'corepack.cmd' : 'corepack'
if (process.env.WORKDSH_RELEASE_DIRECTORY) {
  console.log('WORKDSH_RELEASE_DIRECTORY selects an explicit Profile candidate; packing stays manual')
  process.exit(0)
}
function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' && command === corepack })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} exited with ${result.status}`)
}
function hashDirectory(directory, hash) {
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name === 'node_modules' || entry.name === '.DS_Store') continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) { hashDirectory(path, hash); continue }
    if (!entry.isFile()) continue
    hash.update(relative(root, path).split(sep).join('/'))
    hash.update(readFileSync(path))
  }
}
function hashFile(path, hash) {
  hash.update(relative(root, path).split(sep).join('/'))
  hash.update(readFileSync(path))
}
/** Fingerprint everything the packed Profile candidate consumes, independent of git. */
function sourceFingerprint() {
  const hash = createHash('sha256')
  for (const name of RELEASE_PACKAGES) hashDirectory(resolve(webRoot, PACKAGE_DIRECTORIES[name]), hash)
  hashFile(join(root, 'upstream.json'), hash)
  hashFile(join(webRoot, 'package.json'), hash)
  hashFile(join(webRoot, 'pnpm-lock.yaml'), hash)
  hashFile(join(webRoot, 'scripts/official-web-clients.mjs'), hash)
  return hash.digest('hex')
}
function builtExportsPresent() {
  try {
    for (const name of RELEASE_PACKAGES) {
      const directory = resolve(webRoot, PACKAGE_DIRECTORIES[name])
      verifyBuiltPackageExports(JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8')), directory)
    }
    return true
  } catch { return false }
}
const fingerprint = sourceFingerprint()
const stamped = existsSync(stampFile) ? readFileSync(stampFile, 'utf8').trim() : null
if (stamped === fingerprint && existsSync(manifestFile)) {
  console.log(`WorkDSH Profile candidate at ${release} already matches the current sources`)
  process.exit(0)
}
run(corepack, ['pnpm', 'install', '--frozen-lockfile'], webRoot)
if (stamped !== fingerprint || !builtExportsPresent()) run(corepack, ['pnpm', 'build'], webRoot)
// Candidate archives are immutable; replace the default directory atomically per pack run.
rmSync(release, { recursive: true, force: true })
run(process.execPath, [join(desktopRoot, 'scripts/pack-workdsh-profile.mjs'), webRoot, release])
writeFileSync(stampFile, fingerprint + '\n')
