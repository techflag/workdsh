import * as React from 'react';
import { useEffect, useState } from 'react';
import type {} from '@deepseek-ai/dsh-api-session-controller/client';
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client';
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { InputState } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { SessionSnapshot } from '@deepseek-ai/dsh-api-session-controller/client';
import { Icon } from 'workdsh-ui';
import { newTaskCss } from '../styles.js';

/**
 * 「新建任务」= 任务创建器（UI-DESIGN 第 5 节「首页」，2026-09-22 用户决定）。
 *
 * 侧栏 `sidebar.panellist` 的行按钮由官方 Sidebar owner 固定调用
 * `ctx.layout.selectPanel(<行 id>)`，公开注册面没有自定义 onClick，也没有非面板行的
 * 导航席位。因此本行与同名 `main` 面板配对：点击即展示创建器，而不是直接起一个
 * 与会话等价的空会话。
 *
 * 创建器只收集「运行位置 / 项目 / 专家 / 连接器 / 任务描述」，并把结果交给公开接口：
 * 会话与执行、消息发送、权限与模型、`/` 指令、`@` 引用、附件和取消管线全部保持原生。
 * 任务描述只作为一次性草稿预填原生输入器，绝不自动发送；本插件不注册自建输入器，
 * 也不持有会话或执行状态。
 */
export const newTaskPanelId = 'workdsh-new-task';

/** Draft hand-off slot; consumed exactly once by the addressed native input overlay. */
export const newTaskDraftKey = 'workdsh.pending-new-task-draft';
export const newTaskDraftEvent = 'workdsh:new-task-draft-staged';

type SessionCreateOptions = NonNullable<Parameters<ISessions['create']>[0]>;

export type WorkspaceOption = {
  readonly workspaceId: NonNullable<SessionCreateOptions['workspaceId']>;
  readonly path: string;
  readonly title: string;
};
export type ProjectOption = { readonly id: string; readonly name: string };
export type ExpertOption = { readonly id: string; readonly name: string; readonly canUse: boolean; readonly readiness: string };
export type ConnectorOption = { readonly id: string; readonly title: string; readonly enabled: boolean; readonly state: string };

/**
 * Per-source availability. A missing or failing domain service degrades to an explicit
 * reason instead of an empty list that would read as “there is nothing to choose”.
 */
export interface NewTaskOptions {
  readonly workspaces: readonly WorkspaceOption[];
  readonly projects: readonly ProjectOption[];
  readonly projectsError?: string;
  readonly experts: readonly ExpertOption[];
  readonly expertsError?: string;
  readonly connectors: readonly ConnectorOption[];
  readonly connectorsError?: string;
}

export interface NewTaskStartInput {
  readonly workspaceId: NonNullable<SessionCreateOptions['workspaceId']>;
  readonly cwd: string;
  readonly projectId?: string;
  readonly expertId?: string;
  readonly connectorIds: readonly string[];
  readonly prompt: string;
}

/** 本版未接入的能力。列出原因与当前可用替代路径，而不是放置无效控件。 */
const pendingFields = [
  { label: '技能', reason: '技能按原生 `/` 指令在会话内选取，创建期的技能快照尚未实现。' },
  { label: '权限策略', reason: '权限与审批由 Harness 原生权限服务在会话内持有，创建期选择尚未实现。' },
  { label: '模型与推理强度', reason: '模型选择归原生会话控制，创建期选择尚未实现。' },
  { label: '初始附件', reason: '附件由原生输入器接收，创建器不代收文件。' },
  { label: '资料引用', reason: '项目资料的显式勾选在项目页的任务入口完成；此处不代为选择。' },
] as const;

const readinessText: Record<string, string> = {
  ready: '可用',
  'missing-dependency': '依赖未就绪',
  'unsupported-capability': '能力不受支持',
  broken: '已损坏',
  unknown: '状态未知',
};

const connectorStateText: Record<string, string> = {
  ready: '已连接',
  discovering: '连接中',
  offline: '离线',
  disabled: '已停用',
};

export function NewTaskPanel({
  defaultWorkspaceId,
  loadOptions,
  loadProjectConnectors,
  startTask,
  cancel,
}: NewTaskPanelProps) {
  const [options, setOptions] = useState<NewTaskOptions | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<WorkspaceOption['workspaceId'] | ''>('');
  const [projectId, setProjectId] = useState('');
  const [expertId, setExpertId] = useState('');
  const [connectorIds, setConnectorIds] = useState<readonly string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // One mount-time load: the creator is a short-lived panel, and re-reading on every
  // render would race the user's own selections.
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    loadOptions(controller.signal).then(next => {
      if (!active) return;
      setOptions(next);
      setWorkspaceId(current => current || defaultWorkspaceId || next.workspaces[0]?.workspaceId || '');
    }).catch(cause => {
      if (active) setLoadError(cause instanceof Error ? cause.message : '无法读取任务创建所需的数据。');
    });
    return () => { active = false; controller.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedWorkspace = options?.workspaces.find(row => row.workspaceId === workspaceId);
  const selectedExpert = options?.experts.find(row => row.id === expertId);

  const chooseProject = (next: string): void => {
    setProjectId(next);
    setError(null);
    if (!next) return;
    const controller = new AbortController();
    // The project's configured connectors are the project task default; pre-check them so
    // the same project does not produce two differently equipped tasks.
    loadProjectConnectors(next, controller.signal)
      .then(rows => setConnectorIds(current => [...new Set([...current, ...rows])]))
      .catch(() => undefined);
  };

  const submit = async (): Promise<void> => {
    if (!selectedWorkspace) { setError('请选择运行位置。'); return; }
    setBusy(true);
    setError(null);
    try {
      await startTask({
        workspaceId: selectedWorkspace.workspaceId,
        cwd: selectedWorkspace.path,
        ...(projectId ? { projectId } : {}),
        ...(expertId ? { expertId } : {}),
        connectorIds,
        prompt,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '任务创建失败，请重试。');
      setBusy(false);
    }
  };

  return (
    <section className="wd-new-task">
      <style>{newTaskCss}</style>
      <p className="wd-new-task-eyebrow">WORKDSH</p>
      <h1>新建任务</h1>
      <p className="wd-new-task-lede">
        先确定运行位置与参与的能力，确认后进入 Harness 原生任务编辑。任务描述只作为草稿预填，需要你确认后自行发送；
        `/` 指令、`@` 引用、附件、权限、模型与取消管线全部由原生会话提供。
      </p>
      {loadError ? <p className="wd-new-task-error" role="alert">{loadError}</p> : null}
      {error ? <p className="wd-new-task-error" role="alert">{error}</p> : null}

      <div className="wd-new-task-grid">
        <fieldset className="wd-new-task-field">
          <legend>运行位置</legend>
          <label className="wd-new-task-label" htmlFor="wd-new-task-workspace">工作空间</label>
          <select
            id="wd-new-task-workspace"
            value={workspaceId}
            disabled={busy || !options}
            onChange={event => { setWorkspaceId(event.target.value as WorkspaceOption['workspaceId']); setError(null); }}
          >
            <option value="">{options ? '请选择工作空间' : '正在读取工作空间…'}</option>
            {(options?.workspaces ?? []).map(row => (
              <option key={row.workspaceId} value={row.workspaceId}>{row.title || row.path}</option>
            ))}
          </select>
          <p className="wd-new-task-hint">
            {selectedWorkspace ? selectedWorkspace.path : '任务的工作目录由所选工作空间决定，进入后仍可由原生工作区切换器更改。'}
          </p>
        </fieldset>

        <fieldset className="wd-new-task-field">
          <legend>项目（可选）</legend>
          <label className="wd-new-task-label" htmlFor="wd-new-task-project">关联项目</label>
          <select id="wd-new-task-project" value={projectId} disabled={busy || !options} onChange={event => chooseProject(event.target.value)}>
            <option value="">不关联项目</option>
            {(options?.projects ?? []).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
          <p className="wd-new-task-hint">
            {options?.projectsError
              ?? (projectId ? '本次任务会计入该项目，并预选该项目配置的连接器。' : '关联后可在项目任务列表中找到本次任务。')}
          </p>
        </fieldset>

        <fieldset className="wd-new-task-field">
          <legend>专家（可选）</legend>
          <label className="wd-new-task-label" htmlFor="wd-new-task-expert">指定专家</label>
          <select id="wd-new-task-expert" value={expertId} disabled={busy || !options} onChange={event => { setExpertId(event.target.value); setError(null); }}>
            <option value="">不指定专家（普通任务）</option>
            {(options?.experts ?? []).map(row => (
              <option key={row.id} value={row.id} disabled={!row.canUse}>{row.name}（{readinessText[row.readiness] ?? row.readiness}）</option>
            ))}
          </select>
          <p className="wd-new-task-hint">
            {options?.expertsError
              ?? (selectedExpert
                ? (selectedExpert.canUse ? '所选专家的已发布修订会在创建时绑定到任务。' : '该专家当前不可召唤，确认时会被拒绝。')
                : '不指定专家时创建普通原生任务。')}
          </p>
        </fieldset>

        <fieldset className="wd-new-task-field">
          <legend>连接器（可选）</legend>
          {options?.connectorsError ? <p className="wd-new-task-hint">{options.connectorsError}</p> : null}
          {options && !options.connectorsError && options.connectors.length === 0 ? (
            <p className="wd-new-task-hint">尚未配置连接器；可稍后在「专家 · 技能 · 连接器」中添加。</p>
          ) : null}
          <div className="wd-new-task-checks">
            {(options?.connectors ?? []).map(row => (
              <label key={row.id} className="wd-new-task-check">
                <input
                  type="checkbox"
                  checked={connectorIds.includes(row.id)}
                  disabled={busy || !row.enabled}
                  onChange={event => setConnectorIds(current => event.target.checked
                    ? [...new Set([...current, row.id])]
                    : current.filter(id => id !== row.id))}
                />
                <span>{row.title}</span>
                <span className="wd-new-task-meta">{connectorStateText[row.state] ?? row.state}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="wd-new-task-field wd-new-task-wide">
          <legend>任务描述（可选）</legend>
          <label className="wd-new-task-label" htmlFor="wd-new-task-prompt">想先交代的内容</label>
          <textarea
            id="wd-new-task-prompt"
            rows={4}
            value={prompt}
            disabled={busy}
            placeholder="例如：把本季度的客户反馈整理成一页摘要。"
            onChange={event => setPrompt(event.target.value)}
          />
          <p className="wd-new-task-hint">这段文字会作为原生输入器的草稿预填，不会自动发送。</p>
        </fieldset>

        <fieldset className="wd-new-task-field wd-new-task-wide wd-new-task-pending">
          <legend>本版待开放</legend>
          <ul>
            {pendingFields.map(row => (
              <li key={row.label}><strong>{row.label}</strong>：{row.reason}</li>
            ))}
          </ul>
        </fieldset>
      </div>

      <div className="wd-new-task-actions">
        <button type="button" className="wd-new-task-primary" onClick={() => void submit()} disabled={busy || !selectedWorkspace}>
          {busy ? '正在创建…' : '开始任务'}
        </button>
        <button type="button" onClick={cancel} disabled={busy}>取消</button>
      </div>
    </section>
  );
}

export type NewTaskPanelProps = PropsRuntime<'main'> & InjectFace<{
  readonly defaultWorkspaceId?: WorkspaceOption['workspaceId'];
  readonly loadOptions: (signal: AbortSignal) => Promise<NewTaskOptions>;
  readonly loadProjectConnectors: (projectId: string, signal: AbortSignal) => Promise<readonly string[]>;
  readonly startTask: (input: NewTaskStartInput) => Promise<void>;
  readonly cancel: () => void;
}>;

/**
 * One-shot native-input draft hand-off for the task creator.
 *
 * The creator stages `{ sessionId, text, expiresAt }` in `sessionStorage`, then the
 * official `conversation.input.overlay` applies it exactly once when that Session's native
 * Lexical editor mounts. Nothing is auto-sent, and a repeated mount finds the key cleared.
 */
export function PendingNewTaskDraft({ inputActions, useSession, useInput }: PropsRuntime<'conversation.input.overlay'>) {
  const sessionId = useSession((session: SessionSnapshot) => session.sessionId);
  const input = useInput((state: InputState) => state);
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    const staged = () => setGeneration(value => value + 1);
    window.addEventListener(newTaskDraftEvent, staged);
    return () => window.removeEventListener(newTaskDraftEvent, staged);
  }, []);
  useEffect(() => {
    const serialized = window.sessionStorage.getItem(newTaskDraftKey);
    if (!serialized) return;
    let pending: { sessionId: string; text: string; expiresAt: number };
    try { pending = JSON.parse(serialized); }
    catch { window.sessionStorage.removeItem(newTaskDraftKey); return; }
    if (!pending || typeof pending.text !== 'string' || typeof pending.expiresAt !== 'number' || pending.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(newTaskDraftKey); return;
    }
    if (pending.sessionId !== sessionId) return;
    // Consume before mutating. Existing text/attachments belong to the user.
    window.sessionStorage.removeItem(newTaskDraftKey);
    if (input.draft.length === 0 && input.attachmentIds.length === 0 && input.phase === 'plain') inputActions.setDraft(pending.text);
  }, [sessionId, input, inputActions, generation]);
  return null;
}

export function NewTaskNavigationIcon() {
  return <Icon name="task" />;
}
