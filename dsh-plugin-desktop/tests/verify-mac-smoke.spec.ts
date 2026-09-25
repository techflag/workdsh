import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  verifyMacSmoke,
  type MacSmokeVerificationOptions,
} from '../scripts/verify-mac-smoke.ts'

const temporaryRoots: string[] = []

interface AppFixture {
  readonly root: string
  readonly infoPlist: string
  readonly executable: string
  readonly appAsar: string
  readonly modeOverrides: Map<string, number>
}

function fixture(): AppFixture {
  const root = mkdtempSync(join(tmpdir(), 'dsh-mac-smoke-'))
  temporaryRoots.push(root)
  const contents = join(root, 'WorkDSH.app', 'Contents')
  const macos = join(contents, 'MacOS')
  const resources = join(contents, 'Resources')
  mkdirSync(macos, { recursive: true })
  mkdirSync(resources, { recursive: true })
  const infoPlist = join(contents, 'Info.plist')
  const executable = join(macos, 'WorkDSH')
  const appAsar = join(resources, 'app.asar')
  const modeOverrides = new Map<string, number>()
  writeFileSync(infoPlist, '<?xml version="1.0" encoding="UTF-8"?>')
  writeFileSync(executable, 'binary')
  chmodSync(executable, 0o755)
  modeOverrides.set(executable, 0o755)
  writeFileSync(appAsar, 'packed')
  const runtime = join(resources, 'workdsh-runtime', 'primary-runtime')
  mkdirSync(join(runtime, 'dependencies', 'python', 'bin'), { recursive: true })
  mkdirSync(join(runtime, 'dependencies', 'node', 'bin'), { recursive: true })
  writeFileSync(join(runtime, 'runtime.json'), JSON.stringify({ desktopVersion: '0.1.7-rc.2', platform: 'darwin', arch: 'arm64', python: '3.12.14', node: '24.21.0' }))
  for (const path of [join(runtime, 'dependencies', 'python', 'bin', 'python3'), join(runtime, 'dependencies', 'node', 'bin', 'node')]) {
    writeFileSync(path, 'binary')
    chmodSync(path, 0o755)
    modeOverrides.set(path, 0o755)
  }

  return { root, infoPlist, executable, appAsar, modeOverrides }
}

function options(
  overrides: Partial<MacSmokeVerificationOptions> = {},
  modeOverrides: ReadonlyMap<string, number> = new Map(),
) {
  const calls: Array<{ command: string; args: readonly string[] }> = []
  const removeMountPoint = vi.fn()
  const value: MacSmokeVerificationOptions = {
    distDir: '/release/dist',
    targetArch: 'arm64',
    productName: 'WorkDSH',
    listDmgs: () => ['/release/dist/WorkDSH-2.0.1-arm64.dmg'],
    makeMountPoint: () => '/private/tmp/dsh-desktop-dmg-smoke-test',
    run: (command, args) => { calls.push({ command, args: [...args] }) },
    removeMountPoint,
    exists: existsSync,
    stat: path => {
      const result = statSync(path)
      return {
        size: result.size,
        isFile: result.isFile(),
        mode: modeOverrides.get(path) ?? result.mode,
      }
    },
    ...overrides,
  }
  return { calls, removeMountPoint, value }
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function expectSmokeFailure(
  harness: ReturnType<typeof options>,
  expectedDetail: string,
): void {
  let caught: unknown
  try {
    verifyMacSmoke(harness.value)
  } catch (error) {
    caught = error
  }
  expect(caught).toBeInstanceOf(AggregateError)
  const details = (caught as AggregateError).errors
    .map(inner => (inner instanceof Error ? inner.message : String(inner)))
  expect(details.join('\n')).toContain(expectedDetail)
}

describe('macOS DMG smoke artifact verification', () => {
  it('mounts one DMG and accepts a well-formed unsigned application bundle', () => {
    const value = fixture()
    const harness = options({ makeMountPoint: () => value.root }, value.modeOverrides)
    const appPath = join(value.root, 'WorkDSH.app')

    expect(verifyMacSmoke(harness.value)).toEqual({
      appPath,
      dmgPath: '/release/dist/WorkDSH-2.0.1-arm64.dmg',
    })

    expect(harness.calls).toEqual([
      {
        command: 'hdiutil',
        args: [
          'attach', '/release/dist/WorkDSH-2.0.1-arm64.dmg',
          '-mountpoint', value.root, '-nobrowse', '-readonly',
        ],
      },
      { command: 'plutil', args: ['-lint', value.infoPlist] },
      {
        command: 'lipo',
        args: [value.executable, '-verify_arch', 'arm64'],
      },
      ...['python/bin/python3', 'node/bin/node'].map(entry => ({
        command: 'lipo',
        args: [join(value.root, 'WorkDSH.app', 'Contents', 'Resources', 'workdsh-runtime', 'primary-runtime', 'dependencies', entry), '-verify_arch', 'arm64'],
      })),
      { command: 'hdiutil', args: ['detach', value.root] },
    ])
    expect(harness.removeMountPoint).toHaveBeenCalledWith(value.root)
  })

  it('checks only the Intel executable and native modules for an x64 DMG', () => {
    const value = fixture()
    writeFileSync(join(value.root, 'WorkDSH.app', 'Contents', 'Resources', 'workdsh-runtime', 'primary-runtime', 'runtime.json'), JSON.stringify({ desktopVersion: '0.1.7-rc.2', platform: 'darwin', arch: 'x64', python: '3.12.14', node: '24.21.0' }))
    const harness = options({ targetArch: 'x64', makeMountPoint: () => value.root }, value.modeOverrides)
    verifyMacSmoke(harness.value)
    const lipoCalls = harness.calls.filter(call => call.command === 'lipo')
    expect(lipoCalls[0]?.args).toEqual([value.executable, '-verify_arch', 'x86_64'])
    expect(lipoCalls.every(call => call.args.at(-1) === 'x86_64')).toBe(true)
  })

  it('rejects the mount when no DMG is present', () => {
    const harness = options({ listDmgs: () => [] })

    expect(() => verifyMacSmoke(harness.value)).toThrow('requires exactly one DMG')
    expect(harness.calls).toEqual([])
    expect(harness.removeMountPoint).not.toHaveBeenCalled()
  })

  it('rejects a missing Info.plist and still detaches', () => {
    const value = fixture()
    rmSync(value.infoPlist)
    const harness = options({ makeMountPoint: () => value.root }, value.modeOverrides)

    expectSmokeFailure(harness, 'Info.plist')
    expect(harness.calls).toEqual([
      {
        command: 'hdiutil',
        args: ['attach', '/release/dist/WorkDSH-2.0.1-arm64.dmg', '-mountpoint', value.root, '-nobrowse', '-readonly'],
      },
      { command: 'hdiutil', args: ['detach', value.root] },
    ])
    expect(harness.removeMountPoint).toHaveBeenCalledWith(value.root)
  })

  it('rejects an application without its declared main executable', () => {
    const value = fixture()
    rmSync(value.executable)
    const harness = options({ makeMountPoint: () => value.root }, value.modeOverrides)

    expectSmokeFailure(harness, 'main executable')
    expect(harness.removeMountPoint).toHaveBeenCalledWith(value.root)
  })

  it('rejects a non-executable main file', () => {
    const value = fixture()
    chmodSync(value.executable, 0o644)
    value.modeOverrides.set(value.executable, 0o644)
    const harness = options({ makeMountPoint: () => value.root }, value.modeOverrides)

    expectSmokeFailure(harness, 'invalid main executable')
    expect(harness.removeMountPoint).toHaveBeenCalledWith(value.root)
  })

  it('rejects a missing or empty application archive', () => {
    const value = fixture()
    rmSync(value.appAsar)
    const harness = options({ makeMountPoint: () => value.root }, value.modeOverrides)

    expectSmokeFailure(harness, 'app.asar')
    expect(harness.removeMountPoint).toHaveBeenCalledWith(value.root)
  })

  it('rejects a missing bundled Node binary', () => {
    const value = fixture()
    rmSync(join(value.root, 'WorkDSH.app', 'Contents', 'Resources', 'workdsh-runtime', 'primary-runtime', 'dependencies', 'node', 'bin', 'node'))
    const harness = options({ makeMountPoint: () => value.root }, value.modeOverrides)

    expectSmokeFailure(harness, 'missing bundled Node')
  })
})
