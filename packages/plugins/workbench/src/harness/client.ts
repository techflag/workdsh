import { TaskExecutionNotice } from '../client/components/TaskExecutionNotice.js';
import {
  NewTaskNavigationIcon,
  NewTaskPanel,
  PendingNewTaskDraft,
  newTaskDraftEvent,
  newTaskDraftKey,
  newTaskPanelId,
  type ConnectorOption,
  type ExpertOption,
  type NewTaskOptions,
  type NewTaskStartInput,
  type ProjectOption,
  type WorkspaceOption,
} from '../client/components/NewTaskPanel.js';
import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-api-session-controller/client';
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client';
import type {} from '@deepseek-ai/dsh-api-workspace-controller/client';
import type {} from '@deepseek-ai/dsh-client-ui-layout/client';
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client';
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client';
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client';
import {
  BusinessPanel,
  BusinessPanelIcon,
  businessPanels,
  sidebarLabel,
} from '../client/components/BusinessPanel.js';

/**
 * Keep the official Sidebar and Conversation occupants in place. WorkDSH only
 * contributes business navigation and paired main panels through public Slots.
 *
 * "新建任务" is the task entry: the official Sidebar's row button only calls
 * `ctx.layout.selectPanel(id)`, so the row is paired with a `main` entry that renders the
 * task creator (UI-DESIGN §5「首页」). The creator stages a Session through the official
 * controllers and the sibling plugins' public `/api/workdsh-*` contracts, then hands the
 * main view back to the native empty Conversation — it never copies the composer, the
 * message pipeline, or any execution state.
 *
 * The remaining rows are the still-unimplemented entries: each one registers both its
 * `sidebar.panellist` row and its explanatory `main` panel, so a row never outlives its
 * page. Entries that own a real page (the library, the capability centre) register their
 * row and `main` key in their own plugin instead.
 */
export const name = 'workdsh-workbench-client';
export const inject = ['slots', 'layout', 'sessions', 'workspaces', 'uiWorkspace'];

const PROJECTS_API = '/api/workdsh-projects';
const EXPERTS_API = '/api/workdsh-experts';
const CONNECTORS_API = '/api/workdsh-connectors';

type SessionId = Awaited<ReturnType<ISessions['create']>>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function rowsOf(value: unknown): readonly Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

/**
 * WorkDSH domain HTTP contract: the same `{ endpoint, payload }` → `{ ok, value | error }`
 * envelope the domain plugins already publish. The creator never imports a sibling
 * plugin's modules or reads its storage, so a removed or failing domain degrades to an
 * explicit reason instead of an empty list that would read as "nothing to choose".
 */
async function domainCall<T>(path: string, endpoint: string, payload: unknown, signal: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ endpoint, payload }),
    signal,
  });
  const result = await response.json().catch(() => undefined) as { ok?: boolean; value?: T; error?: { message?: string } } | undefined;
  if (!response.ok || !result?.ok) throw new Error(result?.error?.message ?? `业务服务请求失败（${response.status}）`);
  return result.value as T;
}

export function apply(ctx: Context): void {
  const lifetime = new AbortController();
  ctx.effect(() => () => lifetime.abort(), 'workdsh.workbench.client');
  const uiWorkspace = ctx.uiWorkspace;
  // Host and Client faces ship from one package; keep browser calls bound to the client face.
  const sessions = ctx.sessions as unknown as ISessions;
  let sequence = 0;
  const newOperationId = (action: string): string =>
    `workdsh-workbench-${action}-${Date.now().toString(36)}-${(sequence++).toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const wait = (milliseconds: number) => new Promise<void>((resolve, reject) => {
    lifetime.signal.throwIfAborted();
    const abort = () => { window.clearTimeout(timer); reject(lifetime.signal.reason); };
    const timer = window.setTimeout(() => { lifetime.signal.removeEventListener('abort', abort); resolve(); }, milliseconds);
    lifetime.signal.addEventListener('abort', abort, { once: true });
  });

  // alpha.2: the list snapshot has no `current`; the shown Session derives from the view
  // owner's mainView retention (same rule as the official ui-session publishMain).
  const currentWorkspaceId = (): WorkspaceOption['workspaceId'] | undefined => {
    const state = sessions.list.getSnapshot();
    const currentId = Object.values(state.byId).find(row => (row.retainedBy.mainView ?? 0) > 0)?.id;
    const rows = ctx.workspaces.list.getSnapshot().items;
    return ((currentId ? rows.find(row => row.sessionIds.includes(currentId)) : undefined)
      ?? rows.find(row => row.path === (currentId ? state.byId[currentId]?.cwd : undefined))
      ?? rows[0])?.workspaceId;
  };

  const loadOptions = async (signal: AbortSignal): Promise<NewTaskOptions> => {
    const workspaces: readonly WorkspaceOption[] = ctx.workspaces.list.getSnapshot().items.map(row => ({ workspaceId: row.workspaceId, path: row.path, title: row.title }));
    const attempt = async <T>(label: string, path: string, endpoint: string, payload: unknown, pick: (value: unknown) => readonly T[]) => {
      try { return { rows: pick(await domainCall<unknown>(path, endpoint, payload, signal)) }; }
      catch (cause) { return { rows: [] as readonly T[], error: `${label}暂不可用：${cause instanceof Error ? cause.message : '请求失败'}` }; }
    };
    const [projects, experts, connectors] = await Promise.all([
      attempt<ProjectOption>('项目', PROJECTS_API, 'list', { query: '', status: 'active' }, value => rowsOf(value).map(row => ({ id: String(row.id), name: String(row.name ?? row.id) }))),
      attempt<ExpertOption>('专家', EXPERTS_API, 'list', {}, value => rowsOf(isRecord(value) ? value.items : undefined).map(row => ({ id: String(row.id), name: String(row.name ?? row.id), canUse: row.canUse === true, readiness: String(row.readiness ?? 'unknown') }))),
      attempt<ConnectorOption>('连接器', CONNECTORS_API, 'list', {}, value => rowsOf(value).map(row => ({ id: String(row.id), title: String(row.title ?? row.id), enabled: row.enabled === true, state: String(row.state ?? 'offline') }))),
    ]);
    return {
      workspaces,
      projects: projects.rows,
      ...(projects.error ? { projectsError: projects.error } : {}),
      experts: experts.rows,
      ...(experts.error ? { expertsError: experts.error } : {}),
      connectors: connectors.rows,
      ...(connectors.error ? { connectorsError: connectors.error } : {}),
    };
  };

  /** The project's configured connectors are the project-task default; the creator mirrors it. */
  const loadProjectConnectors = async (projectId: string, signal: AbortSignal): Promise<readonly string[]> => {
    const snapshot = await domainCall<unknown>(PROJECTS_API, 'get', { projectId }, signal);
    const capabilities = isRecord(snapshot) && isRecord(snapshot.config) ? rowsOf(snapshot.config.capabilities) : [];
    return capabilities.filter(row => row.kind === 'connector').map(row => String(row.id));
  };

  /** Pull the Host-created Session into the client list before selecting it. */
  const selectSession = async (sessionId: string): Promise<void> => {
    for (let attempt = 0; attempt < 30; attempt++) {
      lifetime.signal.throwIfAborted();
      await sessions.refresh();
      if (sessions.list.getSnapshot().byId[sessionId as SessionId]) { uiWorkspace.openSession(sessionId as SessionId); return; }
      await wait(120);
    }
    throw new Error('任务已创建，但未能打开；请在左侧会话列表中找到它。');
  };

  const startTask = async (input: NewTaskStartInput): Promise<void> => {
    lifetime.signal.throwIfAborted();
    if (!input.workspaceId) throw new Error('请选择运行位置。');
    let sessionId: string;
    let handoff: string | undefined;
    if (input.expertId) {
      // The expert plan is prepared before anything is created: an unready expert must be a
      // visible refusal, not a half-built task.
      const plan = await domainCall<{ readonly executionPlanId?: string; readonly missing?: readonly { readonly message?: string }[] }>(
        EXPERTS_API,
        'prepare-execution',
        {
          expertId: input.expertId,
          workspaceRef: input.cwd,
          workspaceId: String(input.workspaceId),
          ...(input.prompt ? { draftText: input.prompt } : {}),
        },
        lifetime.signal,
      );
      const missing = (plan.missing ?? []).map(row => row.message).filter((row): row is string => typeof row === 'string');
      if (missing.length > 0) throw new Error(missing.join('；') || '该专家当前不可召唤。');
      if (!plan.executionPlanId) throw new Error('专家执行计划生成失败，请重试。');
      // The Session is created on the Host so the expert's compiled preset is attached at
      // creation; the creator only opens what the expert plugin owns.
      const creation = await domainCall<{ readonly sessionId?: string; readonly handoffId?: string }>(
        EXPERTS_API,
        'create-execution',
        { executionPlanId: plan.executionPlanId, operationId: newOperationId('create-execution') },
        lifetime.signal,
      );
      if (!creation.sessionId) throw new Error('专家任务未返回会话，请重试。');
      sessionId = String(creation.sessionId);
      if (creation.handoffId) {
        const consumed = await domainCall<{ readonly text?: string }>(
          EXPERTS_API,
          'consume-handoff',
          { handoffId: creation.handoffId, expectedDraftVersion: creation.handoffId },
          lifetime.signal,
        );
        if (consumed.text) handoff = consumed.text;
      }
    } else {
      sessionId = String(await sessions.create({ workspaceId: input.workspaceId, cwd: input.cwd }));
    }
    // Bindings land before the draft is handed off: a failed write must not leave a task
    // that looks equipped but has no recorded project or connector ownership.
    if (input.projectId) {
      await domainCall(PROJECTS_API, 'link-task', {
        projectId: input.projectId,
        sessionId,
        title: (input.prompt.trim() || '新任务').slice(0, 80),
        references: [],
      }, lifetime.signal);
    }
    if (input.connectorIds.length > 0) {
      await domainCall(CONNECTORS_API, 'set-selection', { sessionId, connectorIds: input.connectorIds }, lifetime.signal);
    }
    const draft = handoff ?? input.prompt.trim();
    if (draft) {
      // Staged before selecting so the addressed native input mounts with its one-shot seed.
      window.sessionStorage.setItem(newTaskDraftKey, JSON.stringify({ sessionId, text: draft, expiresAt: Date.now() + 300_000 }));
    }
    await selectSession(sessionId);
    // The native input may already be mounted by the selection above; the event lets the
    // overlay consume the staged draft in either order. Nothing is auto-sent.
    ctx.layout.selectPanel(null);
    if (draft) window.dispatchEvent(new Event(newTaskDraftEvent));
  };

  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({ name: 'conversation.input.dock', id: 'workdsh-task-execution-notice' }, TaskExecutionNotice));
  // The official shell renders its own New Session button before the
  // `sidebar.panellist` rows, so the smallest order lands directly under it.
  ctx.slots.inject('main', () => {
    const defaultWorkspaceId = currentWorkspaceId();
    return ctx.slots.register({
      name: 'main',
      key: newTaskPanelId,
      inject: () => ({
        ...(defaultWorkspaceId ? { defaultWorkspaceId } : {}),
        loadOptions,
        loadProjectConnectors,
        startTask,
        cancel: () => ctx.layout.selectPanel(null),
      }),
    }, NewTaskPanel);
  });
  ctx.slots.inject('conversation.input.overlay', () => ctx.slots.register({ name: 'conversation.input.overlay', id: 'workdsh-new-task-draft' }, PendingNewTaskDraft));
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist',
    id: newTaskPanelId,
    label: '新建任务',
    order: 0,
  }, NewTaskNavigationIcon));
  for (const panel of businessPanels) {
    ctx.slots.inject('main', () => ctx.slots.register({
      name: 'main',
      key: panel.id,
      inject: () => ({ label: panel.label, description: panel.pending.description, boundary: panel.pending.boundary }),
    }, BusinessPanel));
    ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
      name: 'sidebar.panellist',
      id: panel.id,
      label: sidebarLabel(panel),
      order: panel.order,
      inject: () => ({ icon: panel.icon }),
    }, BusinessPanelIcon));
  }
}
