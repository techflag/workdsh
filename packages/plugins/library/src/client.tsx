import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-client-connection/client';
import type {} from '@deepseek-ai/dsh-client-ui-layout/client';
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { ReferenceInsert } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { InputTriggerSource } from '@deepseek-ai/dsh-client-ui-input-trigger/client';
import type {} from '@deepseek-ai/dsh-client-ui-input-trigger/client';
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client';
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client';
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client';
import type {} from '@deepseek-ai/dsh-client-ui-session/client';
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client';
import type {} from '@deepseek-ai/dsh-client-ui-slots';
import type {} from '@deepseek-ai/dsh-api-session-controller/client';
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client';
import type {} from '@deepseek-ai/dsh-api-workspace-controller/client';
import { createLibraryClient } from './client/management.js';
import { Icon } from 'workdsh-ui';
import { LibraryPanel } from './client/LibraryPanel.js';
import { LibraryPicker } from './client/LibraryPicker.js';
import { LibraryReferencePage } from './client/LibraryReferencePage.js';
import { createLibraryPreviewRegistry } from './client/preview-registry.js';
import type { LibraryOriginalPreviewRegistry } from 'workdsh-contracts/library';

declare module '@deepseek-ai/cordis' { interface Context { workdshLibraryPreview: LibraryOriginalPreviewRegistry; } }
declare module '@deepseek-ai/dsh-client-ui-sidebar-right/client' { interface SidebarRightTabParamsMap { 'workdsh-library-preview': { assetId: string; revisionId: string; name: string; kind: string }; } }

export const name = 'workdsh-library-client';
export const inject = ['slots', 'layout', 'connection', 'sessions', 'workspaces', 'conversation', 'inputTriggers', 'sidebarRightTabs', 'sidebarRight', 'uiWorkspace'];
export function apply(ctx: Context): void {
  const lifetime = new AbortController(); ctx.effect(() => () => lifetime.abort(), 'workdsh.library.client');
  const management = createLibraryClient(ctx, lifetime.signal);
  const previewRegistry = createLibraryPreviewRegistry();
  ctx.provide('workdshLibraryPreview', previewRegistry);
  const sessions = ctx.sessions as unknown as ISessions;
  const waitForInput = (milliseconds: number) => new Promise<void>((resolve, reject) => {
    lifetime.signal.throwIfAborted();
    const abort = () => { window.clearTimeout(timer); reject(lifetime.signal.reason); };
    const timer = window.setTimeout(() => { lifetime.signal.removeEventListener('abort', abort); resolve(); }, milliseconds);
    lifetime.signal.addEventListener('abort', abort, { once: true });
  });
  type LibraryRef = { assetId: string; revisionId: string; nodeId: string; name: string; kind: string; sessionId?: string };
  const encodeRef = (value: LibraryRef) => encodeURIComponent(JSON.stringify(value));
  const decodeRef = (value: string) => JSON.parse(decodeURIComponent(value)) as LibraryRef;
  const referenceOf = (value: LibraryRef): ReferenceInsert => ({ source: 'workdsh-library', ref: encodeRef(value), label: value.name, appearance: 'file', clipboardText: `@资料库/${value.name}` });
  const insertReference = (sessionId: string, value: LibraryRef): boolean => {
    const binding = sessions.binding(sessionId as never);
    if (!binding) return false;
    const input = ctx.conversation.input.for(binding.ctx);
    const state = input.state.getSnapshot();
    const offset = state.draft.length;
    const scoped = { ...value, sessionId };
    const inserted = binding.ctx.bail(binding.ctx, 'slash/input-insert-reference', { reference: referenceOf(scoped), span: { start: offset, end: offset, draftRev: state.draftRev } }) === true;
    if (inserted) void management.taskSelection(sessionId).then(current => management.setTaskSelection(sessionId, [...new Set([...current.map(row => row.nodeId), value.nodeId])])).catch(() => []);
    return inserted;
  };
  // alpha.2: the list snapshot has no `current`; the shown Session derives from the
  // view owner's mainView retention (same rule as the official ui-session publishMain).
  const currentSessionId = () => {
    const state = sessions.list.getSnapshot();
    return Object.values(state.byId).find(row => (row.retainedBy.mainView ?? 0) > 0)?.id;
  };
  const resolveWorkspace = () => {
    const currentId = currentSessionId();
    const state = sessions.list.getSnapshot();
    const workspaces = ctx.workspaces.list.getSnapshot().items;
    return (currentId ? workspaces.find(row => row.sessionIds.includes(currentId)) : undefined)
      ?? workspaces.find(row => row.path === (currentId ? state.byId[currentId]?.cwd : undefined))
      ?? workspaces[0];
  };
  const startConversation = async (entry: import('workdsh-contracts/library').LibraryTreeEntry): Promise<void> => {
    if (!entry.asset || !entry.revision) throw new Error('文件夹不能添加到对话。');
    const workspace = resolveWorkspace();
    if (!workspace) throw new Error('请先选择工作空间。');
    const sessionId = await sessions.create({ workspaceId: workspace.workspaceId, cwd: workspace.path });
    ctx.uiWorkspace.openSession(sessionId);
    ctx.layout.selectPanel(null);
    const value = { assetId: entry.asset.id, revisionId: entry.revision.id, nodeId: entry.id, name: entry.name, kind: entry.asset.kind };
    await waitForInput(150);
    for (let attempt = 0; attempt < 40; attempt++) {
      if (insertReference(String(sessionId), value)) return;
      await waitForInput(25);
    }
    throw new Error('新对话输入框尚未就绪，请稍后重试。');
  };
  const source: InputTriggerSource = {
    trigger: '@', name: 'workdsh-library', order: 30, showGroupTitle: false,
    candidates: async (_session, request) => {
      if (!request.query.trim()) {
        const collect = async (parentId?: string): Promise<LibraryRef[]> => (await Promise.all((await management.list(parentId)).map(row => row.kind === 'folder' ? collect(row.id) : Promise.resolve(row.asset && row.revision ? [{ assetId: row.asset.id, revisionId: row.revision.id, nodeId: row.id, name: row.name, kind: row.asset.kind }] : [])))).flat();
        const values = await collect();
        return values.map(value => ({ name: value.name, label: value.name, description: value.kind.toUpperCase(), icon: 'file' as const, value: encodeRef(value) }));
      }
      const hits = await management.search(request.query).catch(() => []);
      return hits.map(hit => ({ name: hit.name, label: hit.name, description: [hit.folderPath, hit.excerpt].filter(Boolean).join(' · '), icon: 'file' as const, value: encodeRef(hit) }));
    },
    onPick: pick => {
      if (!pick.candidate.value) return undefined;
      const value = decodeRef(pick.candidate.value);
      const sessionId = String(pick.session.sessionId);
      void management.taskSelection(sessionId).then(current => management.setTaskSelection(sessionId, [...new Set([...current.map(row => row.nodeId), value.nodeId])])).catch(() => []);
      return { insert: referenceOf({ ...value, sessionId }) };
    },
    openReference: (session, reference) => {
      const value = decodeRef(reference.ref);
      void ctx.sidebarRight.openTabIn(session.sessionId as never, 'workdsh-library-preview', { params: { assetId: value.assetId, revisionId: value.revisionId, name: value.name, kind: value.kind } });
      return true;
    },
    codec: {
      clipboardText: ref => `@资料库/${decodeRef(ref).name}`,
      serialize: async ref => {
        const value = decodeRef(ref);
        if (value.sessionId) {
          const current = await management.taskSelection(value.sessionId);
          if (!current.some(row => row.nodeId === value.nodeId)) await management.setTaskSelection(value.sessionId, [...current.map(row => row.nodeId), value.nodeId]);
        }
        return `@资料库/${value.name}`;
      },
    },
  };
  ctx.effect(() => ctx.inputTriggers.registerSource(source));
  ctx.effect(() => {
    const openTranscriptReference = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const trigger = event.target.closest('a,button');
      if (!trigger) return;
      const href = trigger.getAttribute('href') ?? '';
      const marker = [href, trigger.getAttribute('title'), trigger.getAttribute('aria-label')].filter(Boolean).join(' ');
      const label = (trigger.textContent ?? '').trim();
      const path = decodeURIComponent(marker.replace(/^file:\/\//, ''));
      if (!path.includes('资料库/') && !marker.includes('%E8%B5%84%E6%96%99%E5%BA%93')) return;
      const name = label || path.split('/').filter(Boolean).at(-1) || '';
      if (!name) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      void management.search(name).then(hits => {
        const hit = hits.find(row => row.name === name) ?? hits[0];
        const sessionId = currentSessionId();
        if (!hit || !sessionId) return;
        return ctx.sidebarRight.openTabIn(sessionId as never, 'workdsh-library-preview', { params: { assetId: hit.assetId, revisionId: hit.revisionId, name: hit.name, kind: hit.kind } });
      }).catch(() => undefined);
    };
    document.addEventListener('click', openTranscriptReference, true);
    return () => document.removeEventListener('click', openTranscriptReference, true);
  }, 'workdsh.library.transcriptReferences');
  ctx.effect(() => ctx.sidebarRightTabs.register({ id: 'workdsh-library-preview', kind: 'workdsh-library-preview', title: () => '资料预览' }));
  ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({ name: 'sidebar.right.pane.tab', key: 'workdsh-library-preview', inject: () => ({ management, previewRegistry }) }, LibraryReferencePage));
  ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: 'workdsh-library', inject: () => ({ management, previewRegistry, toggleNavigation: () => ctx.layout.toggleSidebar(), startConversation }) }, LibraryPanel));
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist', id: 'workdsh-library', label: '资料库', order: 50 }, LibraryNavigationIcon));
  ctx.slots.inject('conversation.input.left', () => ctx.slots.register({
    name: 'conversation.input.left', id: 'workdsh-library-picker', order: 35,
    inject: () => ({ management, openLibrary: () => ctx.layout.selectPanel('workdsh-library' as Parameters<typeof ctx.layout.selectPanel>[0]), openPicker: (sessionId: string, draft: string, draftRev: number) => { const binding = sessions.binding(sessionId as never); if (!binding) return; const offset = draft.length; ctx.inputTriggers.sessionOf(binding.ctx).toggleSource('workdsh-library', { trigger: '@', query: '', quoted: false, position: offset === 0 ? 'leading' : 'inline', span: { start: offset, end: offset, draftRev } }); } }),
  }, LibraryPicker));
}

/**
 * 资料库自持的侧栏入口。
 *
 * 页面所属插件同时注册 `main` 与同名的 `sidebar.panellist` 行，这样插件缺席时
 * 不会留下「有入口、无页面」的行——官方 Sidebar 的行按钮直接调用
 * `ctx.layout.selectPanel(id)`，对未注册的 main 会抛
 * `layout.selectPanel: main panel "workdsh-library" is not registered`。
 * order 50 使资料库排在「定时任务」与「更多」之间，与 UI-DESIGN 第 5 节的导航顺序一致。
 */
export function LibraryNavigationIcon() {
  return <Icon name="library" />;
}
