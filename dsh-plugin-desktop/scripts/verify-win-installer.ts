/** Verify the unsigned Windows x64 NSIS installer and unpacked executable. */

import { closeSync, openSync, readFileSync, readSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Verify a complete in-memory Windows PE image. */
export function assertPortableExecutableBuffer(data: Buffer, label: string, source: string): void {
  if (data.byteLength < 68 || data.subarray(0, 2).toString('ascii') !== 'MZ') {
    throw new Error(`${label} does not have a Windows PE header: ${source}`)
  }
  const peOffset = data.readUInt32LE(0x3c)
  if (peOffset > data.byteLength - 4) {
    throw new Error(`${label} has an invalid Windows PE offset: ${source}`)
  }
  if (!data.subarray(peOffset, peOffset + 4).equals(Buffer.from('PE\0\0'))) {
    throw new Error(`${label} does not have a Windows PE signature: ${source}`)
  }
}

/** Paths returned after Windows installer verification succeeds. */
export interface WindowsInstallerArtifacts {
  /** NSIS installer path. */
  readonly installerPath: string
  /** Unpacked application executable path. */
  readonly applicationPath: string
}

/** Injectable Windows installer verification boundary. */
export interface WindowsInstallerVerificationOptions {
  /** Desktop package root containing package.json and dist. */
  readonly desktopRoot: string
  /** Product version embedded in the expected artifact name. */
  readonly version: string
}

function readVersion(desktopRoot: string): string {
  const manifest = JSON.parse(readFileSync(join(desktopRoot, 'package.json'), 'utf8')) as {
    version?: unknown
  }
  if (typeof manifest.version !== 'string' || manifest.version.length === 0) {
    throw new Error(`desktop package at ${desktopRoot} has no valid version`)
  }
  return manifest.version
}

/** Verify that a generated Windows artifact has a valid PE header. */
export function assertPortableExecutable(path: string, label: string): void {
  const stat = statSync(path)
  if (!stat.isFile() || stat.size < 68) {
    throw new Error(`${label} is not a non-empty regular file: ${path}`)
  }
  const descriptor = openSync(path, 'r')
  const dosHeader = Buffer.alloc(64)
  try {
    const dosBytesRead = readSync(descriptor, dosHeader, 0, dosHeader.byteLength, 0)
    if (dosBytesRead !== dosHeader.byteLength || dosHeader.subarray(0, 2).toString('ascii') !== 'MZ') {
      throw new Error(`${label} does not have a Windows PE header: ${path}`)
    }
    const peOffset = dosHeader.readUInt32LE(0x3c)
    if (peOffset > stat.size - 4) {
      throw new Error(`${label} has an invalid Windows PE offset: ${path}`)
    }
    const signature = Buffer.alloc(4)
    const signatureBytesRead = readSync(descriptor, signature, 0, signature.byteLength, peOffset)
    if (signatureBytesRead !== signature.byteLength || !signature.equals(Buffer.from('PE\0\0'))) {
      throw new Error(`${label} does not have a Windows PE signature: ${path}`)
    }
  } finally {
    closeSync(descriptor)
  }
}

function defaultOptions(): WindowsInstallerVerificationOptions {
  const desktopRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  return {
    desktopRoot,
    version: readVersion(desktopRoot),
  }
}

/**
 * Verify the exact NSIS installer and unpacked application executable.
 * @param options - Artifact root and expected product version.
 * @returns The verified artifact paths.
 */
export function verifyWindowsInstaller(
  options: WindowsInstallerVerificationOptions = defaultOptions(),
): WindowsInstallerArtifacts {
  const distDir = join(options.desktopRoot, 'dist')
  const installerPath = join(
    distDir,
    `WorkDSH-${options.version}-x64-Setup.exe`,
  )
  const applicationPath = join(distDir, 'win-unpacked', 'WorkDSH.exe')

  assertPortableExecutable(installerPath, 'Windows NSIS installer')
  assertPortableExecutable(applicationPath, 'unpacked Windows application')
  const runtimeRoot = join(distDir, 'win-unpacked', 'resources', 'workdsh-runtime', 'primary-runtime')
  const runtime = JSON.parse(readFileSync(join(runtimeRoot, 'runtime.json'), 'utf8')) as {
    desktopVersion?: unknown
    platform?: unknown
    arch?: unknown
    python?: unknown
    node?: unknown
  }
  if (runtime.desktopVersion !== '0.1.7-rc.2' || runtime.platform !== 'win32'
    || runtime.arch !== 'x64' || runtime.python !== '3.12.14' || runtime.node !== '24.21.0') {
    throw new Error(`Windows installer has mismatched bundled primary runtime: ${JSON.stringify(runtime)}`)
  }
  assertPortableExecutable(join(runtimeRoot, 'dependencies', 'python', 'python.exe'), 'bundled Python')
  assertPortableExecutable(join(runtimeRoot, 'dependencies', 'node', 'bin', 'node.exe'), 'bundled Node')
  return { installerPath, applicationPath }
}

const invokedPath = process.argv[1]
if (invokedPath !== undefined && resolve(invokedPath) === fileURLToPath(import.meta.url)) {
  try {
    const verified = verifyWindowsInstaller()
    console.log(`Windows installer verification passed: ${verified.installerPath}`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
