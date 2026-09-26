import type { WorkspaceView } from '@deepseek-ai/dsh-api-workspace-controller/types';
import type {
  Project,
  ProjectAssetRef,
  ProjectConfig,
  ProjectConfigRevision,
  ProjectInputRef,
  ProjectSnapshot,
  ProjectStatus,
  ProjectTaskContext,
  ProjectTaskLink,
  ProjectTemplate,
  ProjectWorkItem,
} from 'workdsh-contracts/projects';

const path = '/api/workdsh-projects';

/**
 * Projects are Host-owned domain objects. A browser fallback would turn an
 * unavailable service into a false success and create projects that disappear
 * on another device, so every operation goes through the authoritative route.
 */
async function invoke<T>(endpoint: string, payload: unknown, signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(5_000);
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ endpoint, payload }),
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  const result = await response.json().catch(() => ({})) as {
    ok?: boolean;
    value?: T;
    error?: { message?: string };
  };
  if (!response.ok || !result.ok) {
    throw new Error(result.error?.message ?? `项目服务请求失败（${response.status}）`);
  }
  return result.value as T;
}

export function createProjectClient(lifetime?: AbortSignal) {
  return {
    ensureWorkspace: (projectId: string) => invoke<WorkspaceView>('ensure-workspace', { projectId }, lifetime),
    templates: () => invoke<readonly ProjectTemplate[]>('templates', {}, lifetime),
    list: (query = '', status: ProjectStatus = 'active') => invoke<readonly Project[]>('list', { query, status }, lifetime),
    create: (name: string, description = '', templateId?: string) => invoke<ProjectSnapshot>('create', { name, description, templateId }, lifetime),
    get: (projectId: string) => invoke<ProjectSnapshot>('get', { projectId }, lifetime),
    taskContext: (sessionId: string) => invoke<ProjectTaskContext | null>('task-context', { sessionId }, lifetime),
    archive: (projectId: string) => invoke<Project>('archive', { projectId }, lifetime),
    restore: (projectId: string) => invoke<Project>('restore', { projectId }, lifetime),
    updateConfig: (projectId: string, config: ProjectConfig, expectedRevisionId: string) => invoke<ProjectConfigRevision>('update-config', { projectId, config, expectedRevisionId }, lifetime),
    addWorkItem: (projectId: string, title: string) => invoke<ProjectWorkItem>('add-work-item', { projectId, title }, lifetime),
    updateWorkItem: (projectId: string, item: Pick<ProjectWorkItem, 'id'|'title'|'status'|'assignee'|'priority'|'tags'>, expectedRevision: string) => invoke<ProjectWorkItem>('update-work-item', { projectId, item, expectedRevision }, lifetime),
    addAsset: (projectId: string, asset: Omit<ProjectAssetRef, 'id'|'projectId'|'createdAt'>) => invoke<ProjectAssetRef>('add-asset', { projectId, asset }, lifetime),
    removeAsset: (projectId: string, refId: string) => invoke<void>('remove-asset', { projectId, refId }, lifetime),
    validateInputRefs: (projectId: string, references: readonly ProjectInputRef[]) => invoke<readonly ProjectInputRef[]>('validate-input-refs', { projectId, references }, lifetime),
    linkTask: (projectId: string, sessionId: string, title: string, workItemId?: string, references: readonly ProjectInputRef[] = [], capabilities?: readonly import('workdsh-contracts/projects').ProjectCapabilityRef[]) => invoke<ProjectTaskLink>('link-task', { projectId, sessionId, title, workItemId, references, capabilities }, lifetime),
  };
}

export type ProjectClient = ReturnType<typeof createProjectClient>;
