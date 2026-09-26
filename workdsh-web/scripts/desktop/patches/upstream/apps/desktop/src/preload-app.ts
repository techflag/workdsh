/** Minimal marker that selects the desktop custom-protocol API carrier. */

import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('dshDesktop', { protocolVersion: 1 })

// WORKDSH TEST PATCH: inset-title-bar integration for the shell window. The macOS traffic
// lights float over the top-left of the web content, so the sidebar logo row reserves
// clearance for them and the drag regions make the frame movable again. Selectors match
// the stable CSS-modules class suffixes of the official layout, not build hashes.
const WORKDSH_SHELL_CSS = `
[class$="_logoRow"] {
  padding-top: 48px !important;
  height: auto !important;
  -webkit-app-region: drag;
}
[class$="_logoRow"] button,
[class$="_logoRow"] a,
[class$="_logoRow"] input,
[class$="_logoRow"] [role="button"] {
  -webkit-app-region: no-drag;
}
header[class$="_header"] {
  -webkit-app-region: drag;
}
header[class$="_header"] [class$="_titleRow"] {
  -webkit-app-region: drag;
}
header[class$="_header"] button,
header[class$="_header"] a,
header[class$="_header"] input,
header[class$="_header"] nav,
header[class$="_header"] [role="button"],
header[class$="_header"] [class$="_headerActions"],
header[class$="_header"] [class$="_headerUtilities"],
header[class$="_header"] [class$="_headerCorner"] {
  -webkit-app-region: no-drag;
}
`

function applyWorkdshShell(): void {
  if (process.platform !== 'darwin') return
  if (document.querySelector('style[data-workdsh-shell]') !== null) return
  document.documentElement.dataset.workdshShell = 'inset'
  const style = document.createElement('style')
  style.dataset.workdshShell = 'inset'
  style.textContent = WORKDSH_SHELL_CSS
  ;(document.head ?? document.documentElement).append(style)
}

if (!document.documentElement) {
  const observer = new MutationObserver(() => {
    if (!document.documentElement) return
    observer.disconnect()
    applyWorkdshShell()
  })
  observer.observe(document, { childList: true })
} else {
  applyWorkdshShell()
}
