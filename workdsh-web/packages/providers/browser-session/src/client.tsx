/** Session-bound right Sidebar view for the managed Agent browser. */

import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client';
import type {} from '@deepseek-ai/dsh-client-ui-session/client';
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client';
import type {} from '@deepseek-ai/dsh-client-ui-slots';
import type {} from '@deepseek-ai/dsh-api-session-controller/client';
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client';
import { browserSessionClient } from './client/api.js';
import { BrowserSessionPane } from './client/BrowserSessionPane.js';
import { browserSessionStyles } from './client/styles.js';

// The Web bundle keeps its Playwright screenshot tab under workdsh-agent-browser.
// Desktop's managed Electron page is a separate provider and must not register
// a second renderer for that same tab kind.
const TAB = 'workdsh-managed-browser';

declare module '@deepseek-ai/dsh-client-ui-sidebar-right/client' {
  interface SidebarRightTabParamsMap { 'workdsh-managed-browser': Record<string, never>; }
}

export const name = 'workdsh-browser-session-client';
export const inject = ['slots', 'sidebarRight', 'sidebarRightTabs', 'sessions'];

export function apply(ctx: Context): void {
  ctx.effect(() => {
    const style = document.createElement('style');
    style.textContent = browserSessionStyles;
    document.head.append(style);
    return () => style.remove();
  }, 'workdsh.browserSession.styles');
  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: TAB, kind: TAB, title: () => '任务浏览器',
    guide: [{ id: 'managed-browser', order: 25, title: () => '任务浏览器', description: () => '查看并操作当前任务的网页' }],
  }));
  ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab', key: TAB,
  }, BrowserSessionPane));

  const sessions = ctx.sessions as unknown as ISessions;
  ctx.effect(() => {
    let stopped = false;
    let checking = false;
    const opened = new Set<string>();
    const tick = async () => {
      if (checking || stopped) return;
      const snapshot = sessions.list.getSnapshot();
      const sessionId = Object.values(snapshot.byId).find(row => (row.retainedBy.mainView ?? 0) > 0)?.id;
      if (!sessionId || opened.has(sessionId)) return;
      checking = true;
      try {
        if (!(await browserSessionClient.status(String(sessionId))).active || stopped) return;
        ctx.sidebarRight.openTabIn(sessionId, TAB, { params: {} });
        if (ctx.sidebarRight.openTabs.getSnapshot().some(tab => tab.sessionId === sessionId && tab.kind === TAB)) {
          opened.add(sessionId);
        }
      } catch { /* The browser provider is optional and may be unavailable. */ }
      finally { checking = false; }
    };
    const timer = window.setInterval(() => void tick(), 1_500);
    void tick();
    return () => { stopped = true; window.clearInterval(timer); };
  }, 'workdsh.browserSession.autoOpen');
}
