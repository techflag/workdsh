import type { ActivityPresentation } from 'workdsh-contracts/activity';
declare module '@deepseek-ai/cordis' { interface Context { activityPresentation: ActivityPresentation; } }
import { installSkillCommandMenu } from './client/CommandMenu.js';
import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-client-connection/client';
import type {} from '@deepseek-ai/dsh-api-session-controller/client';
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client';
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client';
import type {} from '@deepseek-ai/dsh-api-workspace-controller/client';
import type {} from '@deepseek-ai/dsh-client-ui-layout/client';
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client';
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client';
import type {} from '@deepseek-ai/dsh-client-ui-session/client';
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client';
import type {} from '@deepseek-ai/dsh-client-ui-slots';
import { PendingSkillDraft, pendingDraftKey, skillManagementDraft, skillTaskDrafts, type SkillTaskKind } from './client/drafts.js';
import { SkillsPanel } from './client/SkillsPanel.js';
import { createSkillManagementClient } from './client/management.js';
import { SkillNavigationIcon } from './client/SkillNavigationIcon.js';

export const name = 'workdsh-skills-client';
export const inject = ['slots', 'layout', 'sessions', 'workspaces', 'remote', 'remote.session', 'connection', 'uiWorkspace'];

export function apply(ctx: Context): void {
  const lifetime = new AbortController();
  ctx.effect(() => () => lifetime.abort(), 'workdsh.skills.client');
  const waitForInput = (milliseconds: number) => new Promise<void>((resolve, reject) => {
    lifetime.signal.throwIfAborted();
    const abort = () => { window.clearTimeout(timer); reject(lifetime.signal.reason); };
    const timer = window.setTimeout(() => { lifetime.signal.removeEventListener('abort', abort); resolve(); }, milliseconds);
    lifetime.signal.addEventListener('abort', abort, { once: true });
  });
  // Host and Client faces are emitted from one package. Importing the official
  // Host tool runtime also declaration-merges its SessionStore onto Context, so
  // keep browser calls explicitly bound to the Session Controller client face.
  const sessions = ctx.sessions as unknown as ISessions;
  const management = createSkillManagementClient(ctx, lifetime.signal);
  installSkillCommandMenu(ctx, management);
  ctx.inject(['activityPresentation'], scope => scope.effect(() => scope.activityPresentation.registerSkillLabels(async () => {
    const rows = await management.list();
    return new Map(rows.map(row => [row.name, row.title || row.name]));
  })));

  // alpha.2: the list snapshot has no `current`; the shown Session derives from the
  // view owner's mainView retention (same rule as the official ui-session publishMain).
  const resolveWorkspace = () => {
    const state = sessions.list.getSnapshot();
    const currentId = Object.values(state.byId).find(row => (row.retainedBy.mainView ?? 0) > 0)?.id;
    const workspaces = ctx.workspaces.list.getSnapshot().items;
    return (currentId ? workspaces.find(row => row.sessionIds.includes(currentId)) : undefined)
      ?? workspaces.find(row => row.path === (currentId ? state.byId[currentId]?.cwd : undefined))
      ?? workspaces[0];
  };

  const startSkillTask = async (kind: SkillTaskKind, name?: string): Promise<void> => {
    lifetime.signal.throwIfAborted();
    const workspace = resolveWorkspace();
    if (!workspace) throw new Error('workspace required');
    const draft = kind === 'create' ? skillTaskDrafts[kind] : skillManagementDraft(kind, name!);
    const sessionId = await sessions.create({ workspaceId: workspace.workspaceId, cwd: workspace.path });
    lifetime.signal.throwIfAborted();
    window.sessionStorage.setItem(pendingDraftKey, draft);
    ctx.uiWorkspace.openSession(sessionId);
    ctx.layout.selectPanel(null);
    // Selection/addressability resolves before the native Lexical editor has
    // restored its persisted draft. Seed only after that first paint so the
    // editor's restore effect cannot overwrite this hand-off.
    await waitForInput(150);
    for (let attempt = 0; attempt < 40; attempt++) {
      const scope = sessions.scope(sessionId), conversation = scope?.get('conversation');
      if (scope && conversation) {
        try { conversation.input.for(scope).setDraft(draft); return; }
        catch { /* Conversation input mounts after the selected Session paints. */ }
      }
      await waitForInput(25);
    }
    // The official overlay consumes the sessionStorage hand-off when the
    // Conversation input mounts. A direct action may be unavailable during
    // first-paint setup, so leave the one-time draft pending instead of
    // reporting a false failure after the native editor already accepted it.
  };
  const startSkillTrial = async (skillName: string): Promise<void> => {
    lifetime.signal.throwIfAborted();
    const draft = `/${skillName} `;
    const workspace = resolveWorkspace();
    if (!workspace) throw new Error('workspace required');
    const sessionId = await sessions.create({ workspaceId: workspace.workspaceId, cwd: workspace.path });
    lifetime.signal.throwIfAborted();
    window.sessionStorage.setItem(pendingDraftKey, draft);
    ctx.uiWorkspace.openSession(sessionId);
    ctx.layout.selectPanel(null);
  };
  const openCapability = (key: string): void => { ctx.layout.selectPanel(key as Parameters<typeof ctx.layout.selectPanel>[0]); };
  const hasCapability = (key: string): boolean => ctx.slots.entriesOfSlot('main').some(entry => entry.options.key === key);
  ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: 'workdsh-skills', inject: () => ({ toggleNavigation: () => ctx.layout.toggleSidebar(), management, startSkillTask, startSkillTrial, openCapability, hasCapability }) }, SkillsPanel));
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist', id: 'workdsh-skills', label: '专家 · 技能 · 连接器', order: 30,
  }, SkillNavigationIcon));
  ctx.slots.inject('conversation.input.overlay', () => ctx.slots.register({ name: 'conversation.input.overlay', id: 'workdsh-skill-draft' }, PendingSkillDraft));
}
