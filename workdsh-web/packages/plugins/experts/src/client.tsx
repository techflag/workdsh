import type { ActivityPresentation } from 'workdsh-contracts/activity';
declare module '@deepseek-ai/cordis' { interface Context { activityPresentation: ActivityPresentation; } }
import { installExpertPresetMenu } from './client/PresetMenu.js';
import { parseDocument } from 'yaml';
import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-client-connection/client';
import type {} from '@deepseek-ai/dsh-api-session-controller/client';
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client';
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client';
import type {} from '@deepseek-ai/dsh-api-workspace-controller/client';
import type {} from '@deepseek-ai/dsh-client-ui-layout/client';
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client';
import type {} from '@deepseek-ai/dsh-client-ui-session/client';
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client';
import type {} from '@deepseek-ai/dsh-client-ui-slots';
import { ExpertsPanel } from './client/ExpertsPanel.js';
import { PendingExpertDraft, pendingExpertDraftKey, pendingExpertDraftEvent, expertManagerGuide, expertTeamManagerGuide } from './client/drafts.js';
import { createExpertManagementClient } from './client/management.js';

export const name = 'workdsh-experts-client';
export const inject = ['slots', 'layout', 'sessions', 'workspaces', 'remote', 'remote.session', 'connection', 'uiWorkspace'];

type SessionId = Awaited<ReturnType<ISessions['create']>>;

/**
 * Expert Client assembly (D04 / P1-02).
 *
 * Contributes exactly one `main` panel (`workdsh-experts`) and one native-input draft
 * overlay. It deliberately does NOT register a `sidebar.panellist` entry: the shared
 * capability center ("专家 · 技能 · 连接器") stays a single navigation item owned by the
 * Skill plugin, and the two panels switch through the in-panel capability tabs via
 * `layout.selectPanel`. This keeps AT-20 (no duplicate navigation) and lets the Skill
 * panel keep working when experts is removed.
 *
 * Summon creates the bound native Session on the Host (so the expert's compiled preset
 * is attached at creation), then opens it here and seeds a one-shot draft hand-off; the
 * draft is never auto-sent. "制作专家" opens an ordinary Session seeded with the
 * `/workdsh-expert-manager` guide.
 */
export function apply(ctx: Context): void {
  const lifetime = new AbortController();
  ctx.effect(() => () => lifetime.abort(), 'workdsh.experts.client');
  const waitForInput = (milliseconds: number) => new Promise<void>((resolve, reject) => {
    lifetime.signal.throwIfAborted();
    const abort = () => { window.clearTimeout(timer); reject(lifetime.signal.reason); };
    const timer = window.setTimeout(() => { lifetime.signal.removeEventListener('abort', abort); resolve(); }, milliseconds);
    lifetime.signal.addEventListener('abort', abort, { once: true });
  });
  // Host and Client faces ship from one package; keep browser calls bound to the client face.
  const sessions = ctx.sessions as unknown as ISessions;
  const management = createExpertManagementClient(ctx, lifetime.signal);
  installExpertPresetMenu(ctx, management);
  ctx.inject(['activityPresentation'], (scope) => scope.effect(() => scope.activityPresentation.registerIdentity(async (sessionId, signal) => {
    // Official Team member conversations are continuable child Sessions. Their
    // immutable expert binding belongs to the Lead Session, exactly like the
    // official Team Client resolves its panel through parentSessionId. alpha.2:
    // read the discovered address off the controller instead of borrowing a binding.
    const rootSessionId = (sessions.subagentAddress(sessionId as SessionId)?.parentSessionId ?? sessionId) as SessionId;
    const binding = await management.verifyBinding(rootSessionId, signal);
    const detail = await management.get(binding.expertRevisionRef.expertId, binding.expertRevisionRef.revisionId, signal);
    const definition = detail.revision?.definition;
    if (!definition) return undefined;
    const local = (value: unknown): string | undefined => typeof value === 'string' ? value : value && typeof value === 'object' ? (value as { zh?: string; en?: string }).zh ?? (value as { en?: string }).en : undefined;
    const identityOf = (value: typeof definition) => {
      let metadata: { displayName?: unknown; profession?: unknown; avatar?: string } = {};
      try { const front = value.agentDocument?.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1]; if (front) { const parsed = parseDocument(front); if (!parsed.errors.length) metadata = parsed.toJS(); } } catch { /* optional authored metadata */ }
      const path = (metadata.avatar ?? value.avatarRef ?? '').replace(/^\.\//, '');
      const asset = value.packageAssets?.[path] ?? definition.packageAssets?.[path];
      const avatar = asset && /\.(png|jpe?g|webp)$/i.test(path) ? `data:image/${/\.webp$/i.test(path) ? 'webp' : /\.jpe?g$/i.test(path) ? 'jpeg' : 'png'};base64,${asset.base64}` : value.avatarRef;
      return { name: local(metadata.displayName) || value.name, profession: local(metadata.profession), avatar };
    };
    const leadIdentity = identityOf(definition);
    return { ...leadIdentity, kind: definition.team ? 'team' : 'expert', ...(definition.team ? { teamName: definition.name, members: [{ key: 'lead', ...leadIdentity, kind: 'expert' as const }, ...definition.team.members.map(member => ({ key: member.key, ...identityOf(member.definition), kind: 'expert' as const }))] } : {}) };
  })));


  // alpha.2: the list snapshot has no `current`; the shown Session derives from the
  // view owner's mainView retention (same rule as the official ui-session publishMain).
  const resolveWorkspace = () => {
    const sessionState = sessions.list.getSnapshot();
    const currentId = Object.values(sessionState.byId).find(row => (row.retainedBy.mainView ?? 0) > 0)?.id;
    const workspaces = ctx.workspaces.list.getSnapshot().items;
    return (currentId ? workspaces.find(row => row.sessionIds.includes(currentId)) : undefined)
      ?? workspaces.find(row => row.path === (currentId ? sessionState.byId[currentId]?.cwd : undefined))
      ?? workspaces[0];
  };

  /** Seed an empty native input once through the addressed overlay hand-off. */
  const seedDraft = async (sessionId: SessionId, text: string): Promise<void> => {
    window.sessionStorage.setItem(pendingExpertDraftKey, JSON.stringify({ sessionId, text, expiresAt: Date.now() + 60_000 }));
    // Select after staging so the Session overlay mounts with its addressed seed.
    ctx.uiWorkspace.openSession(sessionId);
    window.dispatchEvent(new Event(pendingExpertDraftEvent));
  };

  /** Pull the Host-created native Session into the client list, then select it. */
  const openSession = async (sessionId: SessionId): Promise<void> => {
    for (let attempt = 0; attempt < 30; attempt++) {
      lifetime.signal.throwIfAborted();
      await sessions.refresh();
      if (sessions.list.getSnapshot().byId[sessionId]) { ctx.uiWorkspace.openSession(sessionId); return; }
      await waitForInput(120);
    }
    throw new Error('未能打开专家任务，请稍后在会话列表中查看。');
  };

  const summon = async (expertId: string, revisionId: string | undefined, draftText: string | undefined): Promise<void> => {
    lifetime.signal.throwIfAborted();
    const workspace = resolveWorkspace();
    const plan = await management.prepareExecution(expertId, {
      ...(revisionId === undefined ? {} : { revisionId }),
      ...(workspace ? { workspaceRef: workspace.path, workspaceId: String(workspace.workspaceId) } : {}),
      ...(draftText ? { draftText } : {}),
    });
    if (plan.missing.length > 0) {
      throw new Error(plan.missing.map(issue => issue.message).join('；') || '该专家暂不可召唤。');
    }
    const creation = await management.createExecution(plan.executionPlanId, management.newOperationId('create-execution'));
    const sessionId = creation.sessionId as SessionId;
    await openSession(sessionId);
    ctx.layout.selectPanel(null);
    if (creation.handoffId) {
      const handoff = await management.consumeHandoff(creation.handoffId, creation.handoffId);
      if (handoff.text) await seedDraft(sessionId, handoff.text);
    }
  };

  const createExpertTask = async (kind: 'agent' | 'team' = 'agent'): Promise<void> => {
    lifetime.signal.throwIfAborted();
    const workspace = resolveWorkspace();
    if (!workspace) throw new Error('需要先选择一个工作区再制作专家。');
    const sessionId = await sessions.create({ workspaceId: workspace.workspaceId, cwd: workspace.path });
    lifetime.signal.throwIfAborted();
    ctx.uiWorkspace.openSession(sessionId);
    ctx.layout.selectPanel(null);
    await seedDraft(sessionId, kind === 'team' ? expertTeamManagerGuide : expertManagerGuide);
  };

  const editExpertTask = async (expertId: string): Promise<void> => {
    lifetime.signal.throwIfAborted();
    const detail = await management.get(expertId);
    if (!detail.canEdit) throw new Error('没有编辑该作品的权限。');
    const definition = detail.draft.definition;
    const workspace = resolveWorkspace();
    if (!workspace) throw new Error('需要先选择一个工作区再修改专家。');
    const sessionId = await sessions.create({ workspaceId: workspace.workspaceId, cwd: workspace.path });
    lifetime.signal.throwIfAborted();
    ctx.layout.selectPanel(null);
    // Use authored names only. Never translate a Chinese name or expose storage IDs.
    let englishName = '';
    const authoredName = (value: unknown): string => typeof value === 'string' && value.trim() && /^[\x20-\x7e]+$/.test(value.trim()) && /[a-z]/i.test(value) ? value.trim() : '';
    const manifestText = definition.packageDocuments?.['.workdsh-expert/plugin.json'] ?? definition.packageDocuments?.['.codebuddy-plugin/plugin.json'];
    try {
      if (manifestText) {
        const manifest = JSON.parse(manifestText);
        englishName = authoredName(manifest.displayName?.en) || authoredName(manifest.name);
      } else if (!definition.team) {
        const frontmatter = definition.agentDocument?.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
        const document = frontmatter ? parseDocument(frontmatter) : undefined;
        const metadata = document && !document.errors.length ? document.toJS() : undefined;
        englishName = authoredName(metadata?.displayName?.en) || authoredName(metadata?.name);
      }
    } catch { /* Missing or invalid name metadata is omitted from the input. */ }
    const name = `${definition.name}${englishName && englishName !== definition.name ? `（${englishName}）` : ''}`;
    await seedDraft(sessionId, `/workdsh-expert-manager 帮我修改专家：[${name}]，增加/优化[请补充你希望新增/优化的技能或知识领域等]方面的能力`);
  };

  const openCapability = (key: string): void => { ctx.layout.selectPanel(key as Parameters<typeof ctx.layout.selectPanel>[0]); };
  const hasCapability = (key: string): boolean => ctx.slots.entriesOfSlot('main').some(entry => entry.options.key === key);

  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main', key: 'workdsh-experts',
    inject: () => ({ toggleNavigation: () => ctx.layout.toggleSidebar(), management, openCapability, hasCapability, summon, createExpertTask, editExpertTask }),
  }, ExpertsPanel));
  ctx.slots.inject('conversation.input.overlay', () => ctx.slots.register({ name: 'conversation.input.overlay', id: 'workdsh-expert-draft' }, PendingExpertDraft));
}
