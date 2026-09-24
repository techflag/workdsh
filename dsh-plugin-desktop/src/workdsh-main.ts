/** Minimal Electron carrier for the bundled WorkDSH release profile. */

import { app, BrowserWindow, shell } from 'electron'
import { spawn, type ChildProcess } from 'node:child_process'
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PROFILE_NAME = 'workdsh'
const RUNTIME_VERSION = '0.1.0-alpha.10+dsh-0.1.7-rc.2'
const READY_PATTERN = /dsh web:\s+(http:\/\/127\.0\.0\.1:\d+\/?\?token=[^\s]+)/u

let runtime: ChildProcess | undefined
let window: BrowserWindow | undefined
let quitting = false

function bundledProfileDirectory(): string {
  const overridden = process.env.WORKDSH_BUNDLED_PROFILE
  if (overridden !== undefined && overridden.length > 0) return overridden
  return join(process.resourcesPath, 'workdsh-runtime', 'profiles', PROFILE_NAME)
}

function runtimeHome(): string {
  const overridden = process.env.WORKDSH_DSH_HOME
  if (overridden !== undefined && overridden.length > 0) return overridden
  return join(app.getPath('userData'), 'dsh-home')
}

function bundledNodeExecutable(): string {
  const overridden = process.env.WORKDSH_NODE_EXECUTABLE
  if (overridden !== undefined && overridden.length > 0) return overridden
  return join(
    process.resourcesPath,
    'workdsh-runtime',
    'node',
    process.platform === 'win32' ? 'node.exe' : 'node',
  )
}

function bundledPrimaryRuntime(): string {
  return join(process.resourcesPath, 'workdsh-runtime', 'primary-runtime')
}

function materializeRuntimeProfile(home: string): string {
  const source = bundledProfileDirectory()
  const target = join(home, 'profiles', PROFILE_NAME)
  const marker = join(target, '.workdsh-desktop-runtime')
  const sourceModules = join(source, 'node_modules')
  const targetModules = join(target, 'node_modules')
  if (!existsSync(sourceModules)) {
    throw new Error(`Bundled WorkDSH runtime is incomplete: ${sourceModules}`)
  }
  mkdirSync(target, { recursive: true })
  for (const name of ['package.json', 'cordis.yml', 'cordis.patch.yml', 'pnpm-lock.yaml', 'pnpm-workspace.yaml']) {
    const from = join(source, name)
    if (existsSync(from)) cpSync(from, join(target, name), { force: true })
  }
  // The released profile grants exact WorkDSH plugin versions permission to run
  // with its bundled DSH runtime. Keep that approval when materializing the
  // profile; without it the sidebar entries render but their panels are denied.
  const sourceCompatibility = join(source, 'compatibility.json')
  const targetCompatibility = join(target, 'compatibility.json')
  if (existsSync(sourceCompatibility) && !existsSync(targetCompatibility)) {
    cpSync(sourceCompatibility, targetCompatibility)
  }
  const installedVersion = existsSync(marker) ? readFileSync(marker, 'utf8').trim() : undefined
  if (existsSync(targetModules) && installedVersion !== RUNTIME_VERSION) {
    const stat = lstatSync(targetModules)
    if (!stat.isSymbolicLink()) {
      throw new Error(
        `WorkDSH cannot replace the existing unmanaged runtime at ${targetModules}. `
        + 'Move that directory, then reopen WorkDSH.',
      )
    }
    readlinkSync(targetModules)
    unlinkSync(targetModules)
  }
  if (!existsSync(targetModules)) {
    symlinkSync(sourceModules, targetModules, process.platform === 'win32' ? 'junction' : 'dir')
  }
  writeFileSync(marker, `${RUNTIME_VERSION}\n`, 'utf8')
  return target
}

function openWindow(url: string): void {
  const icon = fileURLToPath(new URL('../build/app-icon.png', import.meta.url))
  window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 960,
    minHeight: 640,
    title: 'WorkDSH',
    icon,
    backgroundColor: '#111113',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  window.on('page-title-updated', event => {
    event.preventDefault()
    window?.setTitle('WorkDSH')
  })
  window.webContents.setWindowOpenHandler(({ url: target }) => {
    if (target.startsWith('https://') || target.startsWith('http://')) void shell.openExternal(target)
    return { action: 'deny' }
  })
  void window.loadURL(url).then(() => window?.show())
  window.on('closed', () => { window = undefined })
}

function startRuntime(home: string, profileDir: string): void {
  const cli = join(profileDir, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
  if (!existsSync(cli)) throw new Error(`Bundled WorkDSH launcher is missing: ${cli}`)
  const executable = bundledNodeExecutable()
  if (!existsSync(executable)) throw new Error(`Bundled Node.js runtime is missing: ${executable}`)
  const child = spawn(executable, [cli, '--profile', PROFILE_NAME, '--no-open'], {
    env: {
      ...process.env,
      DSH_HOME: home,
      DSH_BUNDLED_PRIMARY_RUNTIME: bundledPrimaryRuntime(),
      ELECTRON_RUN_AS_NODE: undefined,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
  runtime = child
  let ready = false
  let output = ''
  const consume = (chunk: Buffer): void => {
    const text = chunk.toString('utf8')
    process.stderr.write(text)
    if (ready) return
    output = `${output}${text}`.slice(-16_384)
    const match = READY_PATTERN.exec(output)
    if (match?.[1] !== undefined) {
      ready = true
      openWindow(match[1])
    }
  }
  child.stdout.on('data', consume)
  child.stderr.on('data', chunk => process.stderr.write(chunk))
  child.once('error', cause => {
    if (!quitting) throw cause
  })
  child.once('exit', code => {
    runtime = undefined
    if (!quitting && code !== 0) app.quit()
  })
}

function stopRuntime(): void {
  quitting = true
  if (runtime !== undefined && runtime.exitCode === null) runtime.kill('SIGTERM')
  runtime = undefined
}

app.setName('WorkDSH')
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (window === undefined) return
    if (window.isMinimized()) window.restore()
    window.focus()
  })
  app.on('before-quit', stopRuntime)
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
  app.on('activate', () => {
    if (window === undefined) {
      // A healthy runtime always owns a window. Relaunching keeps the profile
      // lifecycle simple after the last macOS window was closed.
      app.relaunch()
      app.quit()
    }
  })
  void app.whenReady().then(() => {
    const home = runtimeHome()
    const profile = process.env.WORKDSH_DSH_HOME === home
      ? join(home, 'profiles', PROFILE_NAME)
      : materializeRuntimeProfile(home)
    startRuntime(home, profile)
  }).catch(cause => {
    process.stderr.write(`WorkDSH failed to start: ${cause instanceof Error ? cause.stack ?? cause.message : String(cause)}\n`)
    app.quit()
  })
}
