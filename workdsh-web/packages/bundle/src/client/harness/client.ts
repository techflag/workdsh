import { ShellAppearance } from '../components/ShellAppearance.js';
import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-api-remotes/client';
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client';
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client';
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client';
import type {} from '@deepseek-ai/dsh-client-ui-session/client';
import type {} from '@deepseek-ai/dsh-api-session-controller/client';
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client';
import * as workbench from 'workdsh-plugin-workbench';
import { BrandMark, BrandName, DiagnosticsMark } from '../components/Brand.js';
import { DiagnosticsPanel, type Inventory } from '../components/DiagnosticsPanel.js';
import { NavigationLocation } from '../components/NavigationLocation.js';
import { AgentBrowserPage, agentBrowserKind, readAgentBrowserFrame } from '../components/AgentBrowserPage.js';

declare module '@deepseek-ai/dsh-client-ui-sidebar-right/client' {
  interface SidebarRightTabParamsMap { 'workdsh-agent-browser': Record<string, never>; }
}

export const name = 'workdsh-client';
export const inject = ['slots', 'layout', 'remote', 'remote.pluginInventory', 'sessions', 'sidebarRight', 'sidebarRightTabs'];

const productViews: Readonly<Record<string, string>> = {
  experts: 'workdsh-experts', skills: 'workdsh-skills', assistant: 'workdsh-assistant', projects: 'workdsh-projects', 'project-detail': 'workdsh-project-detail',
  library: 'workdsh-library', automation: 'workdsh-automation', more: 'workdsh-more',
};

export function apply(ctx: Context): void {
  let legacyBrowserEnabled = false;
  ctx.effect(() => {
    const controller = new AbortController();
    let disposed = false;
    let unregister: (() => void) | undefined;
    const registerLegacy = () => {
      if (disposed || unregister) return;
      legacyBrowserEnabled = true;
      unregister = ctx.sidebarRightTabs.register({
        id: agentBrowserKind, kind: agentBrowserKind, title: () => '智能体浏览器',
        guide: [{ id: 'agent-browser', order: 25, title: () => '智能体浏览器', description: () => '查看并操作当前会话的网页' }],
      });
    };
    // The Desktop provider owns a different Session page. Keep this legacy
    // Playwright tab only in Web profiles where its Host route is absent.
    void fetch('/api/workdsh-browser-session', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: '{}', signal: controller.signal,
    }).then(response => { if (response.status === 404) registerLegacy(); })
      .catch(() => { if (!controller.signal.aborted) registerLegacy(); });
    return () => { disposed = true; controller.abort(); unregister?.(); };
  }, 'workdsh.agent-browser.tab');
  ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({ name: 'sidebar.right.pane.tab', key: agentBrowserKind }, AgentBrowserPage));
  ctx.effect(() => {
    const sessions = ctx.sessions as unknown as ISessions;
    const opened = new Set<string>();
    let pending = false;
    const poll = async () => {
      if (pending || !legacyBrowserEnabled) return;
      const state = sessions.list.getSnapshot();
      const current = Object.values(state.byId).find(row => (row.retainedBy.mainView ?? 0) > 0)?.id;
      if (!current || opened.has(String(current))) return;
      pending = true;
      try {
        const { frame } = await readAgentBrowserFrame(String(current));
        if (!frame || frame.revision === 0) return;
        opened.add(String(current));
        ctx.sidebarRight.openTabIn(current, agentBrowserKind, { params: {} });
      } catch { /* The browser provider is optional; retry on the next poll. */ }
      finally { pending = false; }
    };
    const timer = window.setInterval(() => { void poll(); }, 900);
    return () => window.clearInterval(timer);
  }, 'workdsh.agent-browser.auto-open');
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({ name: 'shell.overlay', id: 'workdsh-shell-appearance' }, ShellAppearance));
  const diagnostics = new URL(window.location.href).searchParams.get('diagnostics') === '1';
  const viewToPanel = diagnostics ? { ...productViews, diagnostics: 'workdsh-probe' } : productViews;
  const panelToView = Object.fromEntries(Object.entries(viewToPanel).map(([view, panel]) => [panel, view]));
  const selectView = (view: string | null) => {
    const target = view === 'projects' && new URL(window.location.href).searchParams.has('project') ? 'project-detail' : view;
    const requested = target ? viewToPanel[target] : undefined;
    const selected = requested && ctx.slots.entriesOfSlot('main').some(entry => entry.options.key === requested)
      ? requested as Parameters<typeof ctx.layout.selectPanel>[0] : null;
    ctx.layout.selectPanel(selected);
    return selected;
  };

  // Appearance follows the official ThemeRuntime and the user's Settings and
  // system preference; the workbench must not pin a theme or veto theme/change.
  ctx.plugin(workbench);
  ctx.slots.inject('sidebar.brand.name', () => ctx.slots.register({ name: 'sidebar.brand.name', priority: -10 }, BrandName));
  ctx.slots.inject('sidebar.brand.mark', () => ctx.slots.register({ name: 'sidebar.brand.mark', priority: -10 }, BrandMark));
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay', id: 'workdsh-location', inject: () => ({ panelToView, selectView }),
  }, NavigationLocation));

  ctx.slots.inject('main', () => {
    const dispose = diagnostics ? ctx.slots.register({
      name: 'main', key: 'workdsh-probe', inject: () => ({
        inspect: async (): Promise<Inventory> => {
          const response = await ctx.remote.pluginInventory.list();
          if (!response.ok) throw new Error(response.error.code);
          return { total: response.value.entries.length, modules: response.value.entries
            .filter(row => row.moduleName.startsWith('workdsh-'))
            .map(row => ({ module: row.moduleName, phase: row.fiberPhase })) };
        },
        returnToConversation: () => ctx.layout.selectPanel(null),
      }),
    }, DiagnosticsPanel) : () => {};
    return dispose;
  });
  if (diagnostics) ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist', id: 'workdsh-probe', label: 'WorkDSH 接入验证', order: 90,
  }, DiagnosticsMark));
}
