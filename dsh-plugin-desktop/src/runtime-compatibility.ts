/** Carry bundled exact-version grants forward without replacing user grants. */
import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

type Grants = Record<string, string[]>

const PACKAGE_VERSION = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*@(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u
const EXACT_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u

function readGrants(filename: string): Grants {
  const parsed: unknown = JSON.parse(readFileSync(filename, 'utf8'))
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${filename} must contain an object of exact-version grants`)
  }
  const grants: Grants = {}
  for (const [key, versions] of Object.entries(parsed)) {
    if (!PACKAGE_VERSION.test(key) || !Array.isArray(versions)
      || !versions.every(version => typeof version === 'string' && EXACT_VERSION.test(version))) {
      throw new Error(`${filename} has an invalid grant for ${key}`)
    }
    grants[key] = versions
  }
  return grants
}

function writeGrants(filename: string, grants: Grants): void {
  const temporary = `${filename}.${process.pid}.${randomUUID()}.tmp`
  try {
    writeFileSync(temporary, `${JSON.stringify(grants, null, 2)}\n`, { mode: 0o600 })
    renameSync(temporary, filename)
  } finally {
    rmSync(temporary, { force: true })
  }
}

/**
 * Merge the release's grants once per bundled runtime version. A same-version
 * restart must not regrant an exemption the user explicitly revoked.
 * A malformed user file remains untouched so DSH can report its own warnings.
 */
export function syncBundledCompatibility(sourceProfile: string, targetProfile: string, runtimeVersion: string): void {
  const marker = join(targetProfile, '.workdsh-desktop-compatibility')
  if (existsSync(marker) && readFileSync(marker, 'utf8').trim() === runtimeVersion) return
  const source = join(sourceProfile, 'compatibility.json')
  const target = join(targetProfile, 'compatibility.json')
  if (!existsSync(source)) {
    writeFileSync(marker, `${runtimeVersion}\n`)
    return
  }
  const bundled = readGrants(source)
  let current: Grants = {}
  if (existsSync(target)) {
    try {
      current = readGrants(target)
    } catch (error) {
      console.warn(`WorkDSH cannot update ${target}; repair it to receive bundled plugin grants: ${String(error)}`)
      return
    }
  }
  for (const [key, versions] of Object.entries(bundled)) {
    current[key] = [...new Set([...(current[key] ?? []), ...versions])]
  }
  writeGrants(target, current)
  writeFileSync(marker, `${runtimeVersion}\n`)
}
