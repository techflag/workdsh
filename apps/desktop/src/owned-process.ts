/** Stop only the process tree created by this carrier. A parent exit is not a tree exit. */
import { spawn, type ChildProcess } from 'node:child_process'
import { join } from 'node:path'

export interface WindowsProcessIdentity { pid: number, ppid: number, createdAt: number }
interface Ownership { pid: number, startedAt: number, registeredAt: number, exitedAt?: number, known: WindowsProcessIdentity[] }
const ownership = new WeakMap<ChildProcess, Ownership>()
const cleaned = new WeakMap<ChildProcess, Promise<void>>()

/** Call immediately after spawn, with the time captured immediately before it. */
export function trackOwnedProcess(child: ChildProcess, startedAt: number): void {
  if (!child.pid || ownership.has(child)) return
  const state: Ownership = { pid: child.pid, startedAt, registeredAt: Date.now(), known: [] }
  ownership.set(child, state)
  child.once('exit', () => { state.exitedAt = Date.now() })
}

/** Parent IDs alone are insufficient after PID reuse; bound each generation. */
export function selectOwnedWindowsProcesses(rows: WindowsProcessIdentity[], owner: Omit<Ownership, 'known'>, known: WindowsProcessIdentity[] = []): WindowsProcessIdentity[] {
  const generations = new Map(known.map(row => [row.pid, row]))
  const current = new Map(rows.map(row => [row.pid, row]))
  const root = current.get(owner.pid)
  if (root && root.createdAt < owner.startedAt) return [] // Unrelated or inconsistent generation; never claim its tree.
  if (root && root.createdAt >= owner.startedAt && root.createdAt <= owner.registeredAt) generations.set(root.pid, root)
  const rootBirth = generations.get(owner.pid)?.createdAt ?? owner.startedAt
  // A new process may already reuse the root PID. Its children cannot belong
  // to the exited owner; older orphaned descendants can still be reclaimed.
  const rootEnd = Math.min(owner.exitedAt ?? Infinity, root && root.createdAt > owner.registeredAt ? root.createdAt - 1 : Infinity)
  for (let pass = 0; pass < 128; pass++) {
    let added = false
    for (const row of rows) {
      if (row.pid === owner.pid || generations.has(row.pid)) continue
      const parent = generations.get(row.ppid)
      if (row.ppid !== owner.pid && !parent) continue
      const birth = row.ppid === owner.pid ? rootBirth : parent!.createdAt
      const presentParent = current.get(row.ppid)
      const end = row.ppid === owner.pid ? rootEnd : presentParent && presentParent.createdAt !== parent!.createdAt ? presentParent.createdAt - 1 : Infinity
      if (row.createdAt < birth || row.createdAt > end) continue
      generations.set(row.pid, row); added = true
    }
    if (!added) break
  }
  return [...generations.values()].filter(row => current.get(row.pid)?.createdAt === row.createdAt)
}

async function windowsCommandOnce(script: string, timeoutMs: number): Promise<string> {
  const executable = process.env.SystemRoot ? join(process.env.SystemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe') : 'powershell.exe'
  return new Promise((resolve, reject) => {
    const task = spawn(executable, ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let output = '', error = '', settled = false
    const finish = (failure?: Error): void => {
      if (settled) return
      settled = true; clearTimeout(timer)
      failure ? reject(failure) : resolve(output.trim())
    }
    const timer = setTimeout(() => { task.kill(); finish(new Error('Windows 本机进程清理查询超时')) }, timeoutMs)
    task.stdout!.on('data', chunk => { output += String(chunk); if (output.length > 262_144) { task.kill(); finish(new Error('Windows 本机进程清理查询超出限制')) } })
    task.stderr!.on('data', chunk => { error = (error + String(chunk)).slice(-2048) })
    task.once('error', () => finish(new Error('Windows 本机进程清理工具不可用')))
    task.once('close', code => finish(code === 0 ? undefined : new Error(`Windows 本机进程清理查询失败 (${code})${/access|denied|unauthorized/iu.test(error) ? '，请核对权限' : ''}`)))
  })
}
/** Run a WMI/powershell command, retrying on a transient query timeout (cold WMI
 *  start on first launch). `retries` is the number of additional attempts. */
async function windowsCommand(script: string, timeoutMs: number, retries = 1): Promise<string> {
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try { return await windowsCommandOnce(script, timeoutMs) }
    catch (error) {
      lastError = error
      // Only retry genuine transient timeouts; surface auth/permission/parse errors.
      if (error instanceof Error && error.message.includes('Windows 本机进程清理查询超时') && attempt < retries) continue
      throw error
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Windows 本机进程清理查询超时')
}
/** Native fallback: a single direct taskkill /T /F on the owned root, bypassing
 *  the WMI snapshot entirely. Used when the query path keeps timing out. */
async function windowsKillTreeDirect(pid: number, timeoutMs: number): Promise<void> {
  await windowsCommand(`$ErrorActionPreference='Stop'; & "$env:SystemRoot\\System32\\taskkill.exe" /PID ${pid} /T /F`, timeoutMs, 0)
}
async function windowsSnapshot(pids: number[], timeoutMs: number): Promise<WindowsProcessIdentity[]> {
  const filter = [...new Set(pids)].map(pid => `(ProcessId = ${pid} OR ParentProcessId = ${pid})`).join(' OR ')
  const output = await windowsCommand(`$ErrorActionPreference='Stop'; $rows=@(Get-CimInstance Win32_Process -Filter '${filter}' -Property ProcessId,ParentProcessId,CreationDate | ForEach-Object { [pscustomobject]@{pid=[int]$_.ProcessId;ppid=[int]$_.ParentProcessId;createdAt=([DateTimeOffset]$_.CreationDate).ToUnixTimeMilliseconds()} }); ConvertTo-Json -InputObject $rows -Compress`, timeoutMs)
  const rows: unknown = JSON.parse(output)
  if (!Array.isArray(rows) || rows.some(row => !row || !Number.isInteger(row.pid) || !Number.isInteger(row.ppid) || !Number.isSafeInteger(row.createdAt) || row.pid <= 0)) throw new Error('Windows 本机进程清理查询结果无效')
  return rows as WindowsProcessIdentity[]
}
async function windowsTaskkill(row: WindowsProcessIdentity, timeoutMs: number): Promise<{ status: string, code?: number, output?: string }> {
  // Recheck CreationDate in the same public OS command that invokes taskkill.
  const output = await windowsCommand(`$ErrorActionPreference='Stop'; $current=Get-CimInstance Win32_Process -Filter 'ProcessId = ${row.pid}' -Property ProcessId,CreationDate; if($null -eq $current){ConvertTo-Json @{status='missing'} -Compress;exit 0}; if(([DateTimeOffset]$current.CreationDate).ToUnixTimeMilliseconds() -ne ${row.createdAt}){ConvertTo-Json @{status='reused'} -Compress;exit 0}; $ErrorActionPreference='Continue'; $text=@(& "$env:SystemRoot\\System32\\taskkill.exe" /PID ${row.pid} /T /F 2>&1); $result=$LASTEXITCODE; $ErrorActionPreference='Stop'; ConvertTo-Json @{status='taskkill';code=$result;output=($text|Out-String)} -Compress`, timeoutMs)
  const result = JSON.parse(output) as { status?: unknown, code?: unknown, output?: unknown }
  if (!['missing', 'reused', 'taskkill'].includes(String(result.status)) || (result.status === 'taskkill' && !Number.isInteger(result.code))) throw new Error('Windows 本机进程清理结果无效')
  return result as { status: string, code?: number, output?: string }
}
function processMissing(pid: number): boolean {
  try { process.kill(pid, 0); return false } catch (error) { return (error as NodeJS.ErrnoException).code === 'ESRCH' }
}
async function cleanWindowsTree(child: ChildProcess): Promise<void> {
  const state = ownership.get(child)
  if (!state) throw new Error('Windows 本机进程缺少所有权记录，未停止未知进程')
  const deadline = Date.now() + 45_000
  const budget = (): number => { const remaining = deadline - Date.now(); if (remaining <= 0) throw new Error('Windows 本机进程树清理超时'); return Math.min(15_000, remaining) }
  try {
    for (let pass = 0; pass < 8; pass++) {
      const queried = new Set([state.pid, ...state.known.map(row => row.pid)])
      const rows = await windowsSnapshot([...queried], budget())
      const selected = selectOwnedWindowsProcesses(rows, state, state.known)
      for (const row of selected) if (!state.known.some(known => known.pid === row.pid && known.createdAt === row.createdAt)) state.known.push(row)
      if (state.known.length > 128) throw new Error('Windows 本机进程树超出安全清理范围')
      if (!selected.length) {
        const current = rows.find(row => row.pid === state.pid)
        if (current && (current.createdAt < state.startedAt || current.createdAt > state.registeredAt)) return // New generation, never ours.
        if (processMissing(state.pid)) return
        throw new Error('Windows 本机进程树清理未确认')
      }
      // Discover nested descendants before removing their only visible parent.
      if (selected.some(row => !queried.has(row.pid))) continue
      for (const row of [...selected].sort((a, b) => b.createdAt - a.createdAt)) {
        const result = await windowsTaskkill(row, budget())
        if (result.status === 'taskkill' && result.code !== 0 && !(result.code === 128 && processMissing(row.pid))) {
          throw new Error(`Windows 本机进程树清理失败 (${result.code})${/access|denied|权限|拒绝/iu.test(result.output ?? '') ? '，操作被拒绝' : ''}，未确认停止`)
        }
      }
    }
    throw new Error('Windows 本机进程树清理未确认')
  } catch (error) {
    // On a transient WMI timeout/uncertainty (cold start), fall back to a direct
    // taskkill /T /F on the owned root before surfacing the original failure.
    if (error instanceof Error && /超时|未确认|无效|失败|超出/.test(error.message) && !processMissing(state.pid)) {
      try { await windowsKillTreeDirect(state.pid, 15_000); return } catch { /* surface original error below */ }
    }
    throw error
  }
}

export function cleanOwnedProcessTree(child: ChildProcess): Promise<void> {
  const existing = cleaned.get(child)
  if (existing) return existing
  const pid = child.pid
  let result: Promise<void>
  if (!pid) result = Promise.resolve()
  else if (process.platform !== 'win32') {
    try { process.kill(-pid, 'SIGKILL') } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error }
    result = Promise.resolve()
  } else result = cleanWindowsTree(child)
  const tracked = result.catch(error => { cleaned.delete(child); throw error })
  cleaned.set(child, tracked)
  return tracked
}

export async function stopOwnedProcess(child: ChildProcess): Promise<void> {
  if (process.platform === 'win32') { await cleanOwnedProcessTree(child); return }
  if (child.exitCode !== null || child.signalCode !== null) { await cleanOwnedProcessTree(child); return }
  await new Promise<void>((resolve, reject) => {
    const force = setTimeout(() => { void cleanOwnedProcessTree(child).catch(reject) }, 8000)
    const timeout = setTimeout(() => { clearTimeout(force); reject(new Error('本机进程尚未停止')) }, 12000)
    child.once('exit', () => {
      clearTimeout(force); clearTimeout(timeout)
      void cleanOwnedProcessTree(child).then(resolve, reject)
    })
    if (child.pid) {
      try { process.kill(-child.pid, 'SIGTERM') } catch { child.kill('SIGTERM') }
    } else child.kill('SIGTERM')
  })
}
