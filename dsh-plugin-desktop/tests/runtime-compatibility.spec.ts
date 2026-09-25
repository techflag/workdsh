import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { syncBundledCompatibility } from '../src/runtime-compatibility.ts'

const roots: string[] = []
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
  vi.restoreAllMocks()
})

function profiles(): { source: string, target: string } {
  const root = mkdtempSync(join(tmpdir(), 'workdsh-compatibility-'))
  roots.push(root)
  const source = join(root, 'bundled')
  const target = join(root, 'installed')
  mkdirSync(source)
  mkdirSync(target)
  return { source, target }
}

function writeGrants(profile: string, grants: unknown): void {
  writeFileSync(join(profile, 'compatibility.json'), `${JSON.stringify(grants)}\n`)
}

function grants(profile: string): Record<string, string[]> {
  return JSON.parse(readFileSync(join(profile, 'compatibility.json'), 'utf8')) as Record<string, string[]>
}

describe('bundled compatibility grants', () => {
  it('installs the bundled grants for a new profile', () => {
    const { source, target } = profiles()
    writeGrants(source, { 'workdsh-plugin-projects@1.2.0': ['0.1.7-rc.2'] })

    syncBundledCompatibility(source, target, 'bundle-1+dsh-0.1.7-rc.2')

    expect(grants(target)).toEqual({ 'workdsh-plugin-projects@1.2.0': ['0.1.7-rc.2'] })
  })

  it('adds new release grants while preserving third-party grants on upgrade', () => {
    const { source, target } = profiles()
    writeGrants(source, { 'workdsh-plugin-projects@1.3.0': ['0.1.8'] })
    writeGrants(target, {
      'workdsh-plugin-projects@1.2.0': ['0.1.7-rc.2'],
      'custom-plugin@2.0.0': ['0.1.7-rc.2'],
    })
    writeFileSync(join(target, '.workdsh-desktop-compatibility'), 'bundle-1+dsh-0.1.7-rc.2\n')

    syncBundledCompatibility(source, target, 'bundle-2+dsh-0.1.8')

    expect(grants(target)).toEqual({
      'workdsh-plugin-projects@1.2.0': ['0.1.7-rc.2'],
      'custom-plugin@2.0.0': ['0.1.7-rc.2'],
      'workdsh-plugin-projects@1.3.0': ['0.1.8'],
    })
  })

  it('does not restore a grant revoked after the release was installed', () => {
    const { source, target } = profiles()
    writeGrants(source, { 'workdsh-plugin-projects@1.2.0': ['0.1.7-rc.2'] })
    syncBundledCompatibility(source, target, 'bundle-1+dsh-0.1.7-rc.2')
    writeGrants(target, {})

    syncBundledCompatibility(source, target, 'bundle-1+dsh-0.1.7-rc.2')

    expect(grants(target)).toEqual({})
  })

  it('preserves a revocation across a bundle upgrade while adding new exact pairs', () => {
    const { source, target } = profiles()
    writeGrants(source, { 'workdsh-plugin-projects@1.2.0': ['0.1.7-rc.2'] })
    syncBundledCompatibility(source, target, 'bundle-1+dsh-0.1.7-rc.2')
    writeGrants(target, {})
    writeGrants(source, {
      'workdsh-plugin-projects@1.2.0': ['0.1.7-rc.2', '0.1.8'],
      'workdsh-plugin-skills@2.0.0': ['0.1.8'],
    })

    syncBundledCompatibility(source, target, 'bundle-2+dsh-0.1.8')

    expect(grants(target)).toEqual({
      'workdsh-plugin-projects@1.2.0': ['0.1.8'],
      'workdsh-plugin-skills@2.0.0': ['0.1.8'],
    })
  })

  it('leaves malformed user grants untouched and retries after repair', () => {
    const { source, target } = profiles()
    writeGrants(source, { 'workdsh-plugin-projects@1.3.0': ['0.1.8'] })
    const filename = join(target, 'compatibility.json')
    writeFileSync(filename, '{bad json')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    syncBundledCompatibility(source, target, 'bundle-2+dsh-0.1.8')

    expect(readFileSync(filename, 'utf8')).toBe('{bad json')
    expect(warn).toHaveBeenCalledOnce()
    writeGrants(target, { 'custom-plugin@2.0.0': ['0.1.8'] })
    syncBundledCompatibility(source, target, 'bundle-2+dsh-0.1.8')
    expect(grants(target)).toEqual({
      'custom-plugin@2.0.0': ['0.1.8'],
      'workdsh-plugin-projects@1.3.0': ['0.1.8'],
    })
  })
})
