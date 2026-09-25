/** Build an unsigned macOS DMG smoke artifact on a native macOS host. */

import { spawnSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { withoutMacReleaseSecrets } from './release-preflight.ts'
import { electronBuilderEnvironment } from './electron-builder-environment.ts'

/** Injectable native macOS packaging boundary used by focused tests. */
export interface MacSmokePackageOptions {
  /** Environment inherited by the packaging command. */
  readonly env: NodeJS.ProcessEnv
  /** Platform executing the package build. */
  readonly platform: NodeJS.Platform
  /** Node architecture executing the package build. */
  readonly arch: string
  /** Node version executing the package build. */
  readonly nodeVersion: string
  /** Repository root containing the Yarn workspace. */
  readonly workspaceRoot: string
  /** Desktop package root containing electron-builder configuration. */
  readonly desktopRoot: string
  /** Dedicated smoke output directory, isolated from signed release artifacts. */
  readonly outputDir: string
  /** Remove only the dedicated generated smoke output before packaging. */
  readonly resetOutput: () => void
  /** Absolute electron-builder CLI module. */
  readonly builderCli: string
  /** Local Electron distribution when already installed, avoiding another download. */
  readonly electronDist?: string
  /** Absolute packaged-DMG verification script. */
  readonly verifier: string
  /** Node executable used to run package-local scripts. */
  readonly nodeExecutable: string
  /** Execute one packaging command. */
  readonly run: (
    command: string,
    args: readonly string[],
    cwd: string,
    env: NodeJS.ProcessEnv,
  ) => void
  /** Report non-secret packaging progress. */
  readonly log: (message: string) => void
}

function run(
  command: string,
  args: readonly string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): void {
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit' })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with ${String(result.status)}`)
  }
}

function defaultOptions(): MacSmokePackageOptions {
  const desktopRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const workspaceRoot = resolve(desktopRoot, '..')
  const require = createRequire(import.meta.url)
  const outputDir = resolve(desktopRoot, 'dist', 'mac-smoke', process.env.WORKDSH_MAC_ARCH ?? process.arch)
  const electronDist = resolve(dirname(require.resolve('electron/package.json')), 'dist')
  return {
    env: process.env,
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.versions.node,
    workspaceRoot,
    desktopRoot,
    outputDir,
    resetOutput: () => rmSync(outputDir, { recursive: true, force: true }),
    builderCli: require.resolve('electron-builder/cli.js'),
    ...(existsSync(resolve(electronDist, 'Electron.app')) ? { electronDist } : {}),
    verifier: fileURLToPath(new URL('./verify-mac-smoke.ts', import.meta.url)),
    nodeExecutable: process.execPath,
    run,
    log: message => console.log(message),
  }
}

/**
 * Run the headless release gates and package one unsigned macOS DMG smoke.
 *
 * The signed and notarized release stays a manual step on a credentialed
 * machine; this smoke exists so macOS packaging regressions fail in CI before
 * a manual release. The selected architecture is packaged independently.
 * @param options - Injectable process and command boundaries.
 */
export function packageMacSmoke(options: MacSmokePackageOptions = defaultOptions()): void {
  if (options.platform !== 'darwin') {
    throw new Error('macOS DMG smoke must be built on a native macOS host')
  }
  if (options.arch !== 'x64' && options.arch !== 'arm64') {
    throw new Error(`macOS DMG smoke requires x64 or arm64 Node; received ${options.arch}`)
  }
  const versionMatch = /^(\d+)\.(\d+)\./u.exec(options.nodeVersion)
  const major = Number(versionMatch?.[1])
  const minor = Number(versionMatch?.[2])
  if (!((major === 22 && minor >= 19) || major === 24)) {
    throw new Error(
      `macOS DMG smoke requires Node 22.19+ or Node 24.x with bundled Corepack; received ${options.nodeVersion}`,
    )
  }

  const targetArch = options.env.WORKDSH_MAC_ARCH ?? options.arch
  if (targetArch !== 'x64' && targetArch !== 'arm64') {
    throw new Error(`unsupported macOS target architecture: ${targetArch}`)
  }
  const cleanEnvironment = withoutMacReleaseSecrets(options.env)
  options.log('Building an unsigned macOS DMG smoke; signing and notarization are release-only steps.')
  if (options.env.DSH_PACKAGE_CHECK_ALREADY_RAN !== '1') {
    options.run(
      'corepack',
      ['yarn', 'workspace', 'dsh-plugin-desktop-beta', 'check:mac-package'],
      options.workspaceRoot,
      cleanEnvironment,
    )
  } else {
    options.log('Skipping the macOS package preflight; the package gate already passed.')
  }
  options.resetOutput()
  options.run(
    options.nodeExecutable,
    [
      options.builderCli,
      '--mac',
      'dmg',
      `--${targetArch}`,
      '--publish',
      'never',
      '--config.mac.notarize=false',
      '--config.npmRebuild=false',
      `--config.directories.output=${options.outputDir}`,
      ...(options.electronDist === undefined ? [] : [`--config.electronDist=${options.electronDist}`]),
    ],
    options.desktopRoot,
    electronBuilderEnvironment({
      ...cleanEnvironment,
      CSC_IDENTITY_AUTO_DISCOVERY: 'false',
    }),
  )
  options.run(
    options.nodeExecutable,
    [options.verifier, options.outputDir, targetArch],
    options.desktopRoot,
    cleanEnvironment,
  )
}

const invokedPath = process.argv[1]
if (invokedPath !== undefined && resolve(invokedPath) === fileURLToPath(import.meta.url)) {
  try {
    packageMacSmoke()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
