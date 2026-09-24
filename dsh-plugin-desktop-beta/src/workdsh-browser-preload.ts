/** Expose only the official Sidebar Browser lease contract to the WorkDSH page. */
import { contextBridge, ipcRenderer } from 'electron'

const IPC = {
  acquire: 'workdsh:browser-acquire',
  release: 'workdsh:browser-release',
  openRequested: 'workdsh:browser-open-requested',
} as const

// The main process also checks the exact sender and origin on every request.
if (process.isMainFrame && location.protocol === 'http:' && location.hostname === '127.0.0.1') {
  const listeners = new Map<string, Set<(url: string) => void>>()
  ipcRenderer.on(IPC.openRequested, (_event, request: unknown) => {
    if (typeof request !== 'object' || request === null || !('lease' in request) || !('url' in request)
      || typeof request.lease !== 'string' || typeof request.url !== 'string') return
    for (const callback of listeners.get(request.lease) ?? []) callback(request.url)
  })
  contextBridge.exposeInMainWorld('dshDesktop', {
    protocolVersion: 1,
    browser: {
      acquire: (workspace: string) => ipcRenderer.invoke(IPC.acquire, workspace),
      release: (lease: string) => ipcRenderer.invoke(IPC.release, lease),
      onOpenRequested: (lease: string, listener: (url: string) => void) => {
        let callbacks = listeners.get(lease)
        if (callbacks === undefined) { callbacks = new Set(); listeners.set(lease, callbacks) }
        callbacks.add(listener)
        return () => {
          callbacks.delete(listener)
          if (callbacks.size === 0 && listeners.get(lease) === callbacks) listeners.delete(lease)
        }
      },
    },
  })
}
