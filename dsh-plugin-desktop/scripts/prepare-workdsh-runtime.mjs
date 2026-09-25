#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { delimiter, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DSH_VERSION } from './runtime-version.mjs'
import { verifyPackageDshReferences, verifyProfileRelease } from './verify-profile-release.mjs'

const WORKDSH_VERSION = '0.1.0-alpha.13'
const desktopRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const output = join(desktopRoot, 'build', 'workdsh-runtime')
const destination = join(output, 'profiles', 'workdsh')
const cli = join(destination, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
const releaseMarker = '.workdsh-desktop-release.json'

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} exited with ${result.status}`)
}

function replaceRequired(input, expected, replacement, description) {
  if (!input.includes(expected)) throw new Error(`WorkDSH release installer changed: ${description}`)
  return input.replace(expected, replacement)
}

async function download(url, path) {
  if (existsSync(path)) return
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(60_000) })
      if (response.ok) {
        writeFileSync(path, Buffer.from(await response.arrayBuffer()))
        return
      }
      if (response.status !== 429 && response.status < 500) {
        throw new Error(`Failed to download ${url}: ${response.status}`)
      }
      if (attempt === 4) throw new Error(`Failed to download ${url}: ${response.status} after 5 attempts`)
      console.warn(`Download returned ${response.status}; retrying ${url} (${attempt + 1}/4)`)
    } catch (error) {
      if (attempt === 4 || (error instanceof Error && /^Failed to download .*: 4\d\d$/.test(error.message))) throw error
      console.warn(`Download interrupted; retrying ${url} (${attempt + 1}/4): ${error}`)
    }
    await new Promise(resolve => setTimeout(resolve, 1_000 * 2 ** attempt))
  }
}

async function installReleasedProfile(output) {
  const releaseDir = join(desktopRoot, 'build', `.workdsh-release-${WORKDSH_VERSION}`)
  mkdirSync(releaseDir, { recursive: true })
  const base = `https://github.com/techflag/workdsh/releases/download/v${WORKDSH_VERSION}`
  const manifestPath = join(releaseDir, 'release-manifest.json')
  await download(`${base}/release-manifest.json`, manifestPath)
  const rawInstallerPath = join(releaseDir, 'install-workdsh.original.mjs')
  const installerPath = join(releaseDir, 'install-workdsh.mjs')
  await download(`${base}/install-workdsh.mjs`, rawInstallerPath)
  let installer = readFileSync(rawInstallerPath, 'utf8')
  installer = replaceRequired(installer,
    'profilePackage.packageManager = manifest.packageManager;',
    "profilePackage.packageManager = manifest.packageManager;\n  profilePackage.devEngines = { ...profilePackage.devEngines, packageManager: { name: 'pnpm', version: manifest.packageManager.slice('pnpm@'.length), onFail: 'ignore' } };",
    'package-manager declaration',
  )
  installer = replaceRequired(installer, "const runtimeArgs = ['pnpm', '--dir',", "const runtimeArgs = ['--dir',", 'runtime pnpm invocation')
  installer = replaceRequired(installer, "spawnSync(corepack, ['pnpm', '--dir',", "spawnSync(corepack, ['--dir',", 'profile pnpm invocation')
  if (process.platform === 'win32') {
    installer = replaceRequired(installer, "import { spawnSync } from 'node:child_process';", "import { spawnSync as nativeSpawnSync } from 'node:child_process';", 'Windows spawn import')
    installer = replaceRequired(installer, 'const argv = process.argv.slice(2);', "const portableSpawn = (command, args, options = {}) => nativeSpawnSync(command, args, { ...options, shell: true, timeout: 5 * 60_000 });\nconst argv = process.argv.slice(2);", 'Windows argument handling')
    if (!installer.includes('spawnSync(')) throw new Error('WorkDSH release installer changed: Windows spawn calls')
    installer = installer.replaceAll('spawnSync(', 'portableSpawn(')
  }
  writeFileSync(installerPath, installer)
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  verifyProfileRelease(manifest, DSH_VERSION, releasePackages)
  const installSpawn = process.platform === 'win32' ? 'portableSpawn' : 'spawnSync'
  installer = replaceRequired(readFileSync(installerPath, 'utf8'),
    "  execute(['plugin', '--profile', profile, 'add', join(directory, item.filename)]);",
    `  execute(['plugin', '--profile', profile, 'allow-version', \`\${name}@\${item.version}\`, '--dsh-version', expectedHarness, '--accept-risk']);
  // The DSH plugin-manager wrapper can retain an idle pnpm process after a
  // completed local tarball add. Use the same pinned pnpm directly; the
  // release tarball hash and exact compatibility approval were checked above.
  const profileDir = join(dshHome, 'profiles', profile);
  const added = ${installSpawn}(corepack, ['--dir', profileDir, 'add', '--save-exact', join(directory, item.filename)], { stdio: 'inherit' });
  if (added.error) throw added.error;
  if (added.status !== 0) process.exit(added.status ?? 1);
  // pnpm installs the package but does not activate its DSH bundle. The
  // browser-session provider is inserted by workdsh-bundle's patch instead.
  if (name !== 'workdsh-provider-browser-session') {
    const profilePackage = JSON.parse(readFileSync(profileManifest, 'utf8'));
    const bundles = profilePackage.dsh?.profile?.bundles ?? [];
    if (!bundles.includes(name)) bundles.push(name);
    profilePackage.dsh = { ...profilePackage.dsh, profile: { ...profilePackage.dsh?.profile, bundles } };
    writeFileSync(profileManifest, JSON.stringify(profilePackage, null, 2) + '\\n');
  }`,
    'plugin installation step',
  )
  if (process.platform === 'win32') {
    // pnpm.cmd can leave cmd.exe waiting after pnpm has finished. Execute the
    // pinned JavaScript CLI with the bundled Node process directly instead.
    installer = replaceRequired(installer,
        "const corepack = value('--corepack', 'corepack');",
        "const corepack = value('--corepack', 'corepack');\nconst bundledPnpmCli = join(dirname(corepack), '.dsh-cli', 'node_modules', 'pnpm', 'bin', 'pnpm.mjs');",
        'Windows bundled pnpm path',
      )
    if (!installer.includes('portableSpawn(corepack, [')) throw new Error('WorkDSH release installer changed: Windows pnpm invocation')
    installer = installer.replaceAll('portableSpawn(corepack, [', 'nativeSpawnSync(process.execPath, [bundledPnpmCli, ')
    installer = replaceRequired(installer, 'portableSpawn(corepack, runtimeArgs,', 'nativeSpawnSync(process.execPath, [bundledPnpmCli, ...runtimeArgs],', 'Windows runtime pnpm invocation')
    if (installer.includes('portableSpawn(corepack,') || !installer.includes('bundledPnpmCli')) {
      throw new Error('Windows release installer still invokes pnpm through cmd.exe')
    }
  }
  writeFileSync(installerPath, installer)
  for (const item of manifest.packages) {
    await download(`${base}/${item.filename}`, join(releaseDir, item.filename))
  }

  mkdirSync(output, { recursive: true })
  const bootstrap = join(output, '.dsh-cli')
  rmSync(bootstrap, { recursive: true, force: true })
  mkdirSync(bootstrap, { recursive: true })
  writeFileSync(join(bootstrap, 'package.json'), JSON.stringify({ private: true, dependencies: { '@deepseek-ai/dsh': DSH_VERSION, pnpm: '11.8.0' } }, null, 2) + '\n')
  const overrides = Object.entries(manifest.runtimeOverrides ?? {}).map(([name, version]) => `  ${JSON.stringify(name)}: ${JSON.stringify(version)}`).join('\n')
  writeFileSync(join(bootstrap, 'pnpm-workspace.yaml'), `overrides:\n${overrides}\n`)
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  run(npx, ['--yes', 'pnpm@11.8.0', '--dir', bootstrap, 'install', '--prod', '--ignore-scripts'], { shell: process.platform === 'win32' })
  const bootstrapCli = join(bootstrap, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
  const pnpmCli = join(bootstrap, 'node_modules', 'pnpm', 'bin', 'pnpm.mjs')
  if (!existsSync(pnpmCli)) throw new Error(`Pinned pnpm CLI is missing: ${pnpmCli}`)
  const shim = join(output, process.platform === 'win32' ? 'dsh-runtime.cmd' : 'dsh-runtime')
  const pnpmShim = join(output, process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm')
  if (process.platform === 'win32') {
    writeFileSync(shim, `@echo off\r\n"${process.execPath}" "${bootstrapCli}" %*\r\n`)
    writeFileSync(pnpmShim, `@echo off\r\n\"${process.execPath}\" \"${pnpmCli}\" %*\r\n`)
  } else {
    writeFileSync(shim, `#!/bin/sh\nexec "${process.execPath}" "${bootstrapCli}" \"$@\"\n`)
    writeFileSync(pnpmShim, `#!/bin/sh\nexec \"${process.execPath}\" \"${pnpmCli}\" \"$@\"\n`)
    chmodSync(shim, 0o755)
    chmodSync(pnpmShim, 0o755)
  }
  run(process.execPath, [installerPath, '--directory', releaseDir, '--dsh', shim, '--corepack', pnpmShim], {
    env: { ...process.env, DSH_HOME: output, PATH: `${output}${delimiter}${process.env.PATH ?? ''}` },
  })
  for (const item of manifest.packages) {
    const pkg = JSON.parse(readFileSync(join(destination, 'node_modules', item.name, 'package.json'), 'utf8'))
    if (pkg.version !== item.version) {
      throw new Error(`Installed ${item.name} is ${pkg.version ?? 'unknown'}, expected ${item.version}`)
    }
    verifyPackageDshReferences(pkg, DSH_VERSION)
  }
  writeFileSync(join(destination, releaseMarker), JSON.stringify({ release: WORKDSH_VERSION, harness: DSH_VERSION }) + '\n')
  rmSync(bootstrap, { recursive: true, force: true })
}

async function prepareNodeExecutable(path) {
  mkdirSync(dirname(path), { recursive: true })
  if (process.platform !== 'darwin') {
    cpSync(process.execPath, path)
    if (process.platform !== 'win32') chmodSync(path, 0o755)
    return
  }
  const targetArch = process.env.WORKDSH_MAC_ARCH ?? process.arch
  if (targetArch !== 'x64' && targetArch !== 'arm64') {
    throw new Error(`unsupported macOS target architecture: ${targetArch}`)
  }
  if (targetArch === process.arch) {
    cpSync(process.execPath, path)
    chmodSync(path, 0o755)
    return
  }
  const downloadArch = targetArch
  const cache = join(desktopRoot, 'build', '.workdsh-node')
  const archive = join(cache, `node-v${process.versions.node}-darwin-${downloadArch}.tar.gz`)
  const extracted = join(cache, `node-v${process.versions.node}-darwin-${downloadArch}`, 'bin', 'node')
  mkdirSync(cache, { recursive: true })
  await download(`https://nodejs.org/dist/v${process.versions.node}/node-v${process.versions.node}-darwin-${downloadArch}.tar.gz`, archive)
  if (!existsSync(extracted)) run('/usr/bin/tar', ['-xzf', archive, '-C', cache])
  cpSync(extracted, path)
  chmodSync(path, 0o755)
}

const candidates = [
  process.env.WORKDSH_BUNDLED_PROFILE,
  process.env.WORKDSH_DSH_HOME && join(process.env.WORKDSH_DSH_HOME, 'profiles', 'workdsh'),
].filter(Boolean)
const installedDshVersion = candidate => {
  try {
    return JSON.parse(readFileSync(join(candidate, 'node_modules', '@deepseek-ai', 'dsh', 'package.json'), 'utf8')).version
  } catch {
    return undefined
  }
}
const releasePackages = [
  'workdsh-provider-identity-local', 'workdsh-provider-browser-session', 'workdsh-plugin-audit', 'workdsh-plugin-access',
  'workdsh-plugin-skills', 'workdsh-plugin-experts', 'workdsh-plugin-connectors',
  'workdsh-plugin-activity', 'workdsh-plugin-office', 'workdsh-plugin-library',
  'workdsh-plugin-projects', 'workdsh-bundle',
]
const requiredBundles = releasePackages.filter(name => name !== 'workdsh-provider-browser-session')
const isPreparedProfile = candidate => {
  if (installedDshVersion(candidate) !== DSH_VERSION) return false
  if (!releasePackages.every(name => existsSync(join(candidate, 'node_modules', name, 'package.json')))) return false
  try {
    const marker = JSON.parse(readFileSync(join(candidate, releaseMarker), 'utf8'))
    if (marker.release !== WORKDSH_VERSION || marker.harness !== DSH_VERSION) return false
    for (const name of releasePackages) {
      const pkg = JSON.parse(readFileSync(join(candidate, 'node_modules', name, 'package.json'), 'utf8'))
      verifyPackageDshReferences(pkg, DSH_VERSION)
    }
  } catch {
    return false
  }
  try {
    const profile = JSON.parse(readFileSync(join(candidate, 'package.json'), 'utf8'))
    return requiredBundles.every(name => profile.dsh?.profile?.bundles?.includes(name))
  } catch {
    return false
  }
}
const source = candidates.find(isPreparedProfile)

if (source || !isPreparedProfile(destination) || !existsSync(cli)) {
  const backup = mkdtempSync(join(desktopRoot, 'build', '.workdsh-profile-backup-'))
  rmSync(backup, { recursive: true })
  if (existsSync(output)) renameSync(output, backup)
  try {
    if (source) {
      mkdirSync(dirname(destination), { recursive: true })
      // electron-builder does not follow extra-resource directory links.
      if (process.platform === 'darwin') run('/bin/cp', ['-cR', resolve(source), destination])
      else cpSync(resolve(source), destination, { recursive: true, dereference: true })
    } else {
      // pnpm records the absolute virtual-store location. Installing under a
      // temporary path and renaming it breaks the Profile on Windows.
      await installReleasedProfile(output)
    }
    if (!isPreparedProfile(destination)) throw new Error(`Prepared WorkDSH Profile is incomplete: ${destination}`)
    rmSync(backup, { recursive: true, force: true })
  } catch (error) {
    rmSync(output, { recursive: true, force: true })
    if (existsSync(backup)) renameSync(backup, output)
    throw error
  }
}

if (!existsSync(cli)) throw new Error(`Failed to prepare WorkDSH runtime at ${destination}`)
if (!isPreparedProfile(destination)) {
  throw new Error(`Prepared WorkDSH profile is missing required active bundles: ${destination}`)
}
// Electron already contains Chromium. Fail before packaging if a dependency
// starts shipping a second browser executable inside the profile.
const browserExecutables = new Set([
  'chrome', 'chrome.exe', 'chromium', 'chromium.exe', 'chrome-headless-shell',
  'headless_shell', 'firefox', 'firefox.exe', 'msedge.exe',
])
const scanForBundledBrowser = directory => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) scanForBundledBrowser(path)
    else if (entry.isFile() && browserExecutables.has(entry.name.toLowerCase())) {
      throw new Error(`Standalone browser executable is forbidden in WorkDSH Desktop: ${path}`)
    }
  }
}
scanForBundledBrowser(output)
cpSync(join(destination, 'package.json'), join(output, 'profile-package.json'))
const nodeExecutable = join(output, 'node', process.platform === 'win32' ? 'node.exe' : 'node')
await prepareNodeExecutable(nodeExecutable)
console.log(`Prepared WorkDSH ${WORKDSH_VERSION} runtime at ${output}`)
