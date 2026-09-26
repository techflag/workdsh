import type { Context } from '@deepseek-ai/cordis';
import type {
  AvailabilityReceipt,
  ConfirmationProof,
  ConfirmationRequest,
  DraftHandoff,
  ExpertAvailability,
  ExpertDefinition,
  ExpertDetail,
  ExpertSkillOption,
  ExpertDraft,
  ExpertListQuery,
  ExpertListResult,
  ExpertPreference,
  ExpertValidation,
  ExecutionBinding,
  ExecutionCreation,
  ExecutionPlan,
  HandoffPlan,
  ImportPreview,
  ModelSelectionRequest,
  Operation,
  PublishReceipt,
} from '../shared.js';

const path = '/api/workdsh-experts';
const importPath = '/api/workdsh-experts/import';
const exportPath = '/api/workdsh-experts/export';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Map the Host wire error `{code,message,details}` to an Error carrying the stable code. */
function failure(value: unknown): Error {
  if (isRecord(value) && typeof value.message === 'string') {
    return Object.assign(new Error(value.message), {
      code: typeof value.code === 'string' ? value.code : 'experts/internal',
      details: isRecord(value.details) ? value.details : {},
    });
  }
  return new Error('专家操作失败，请重试。');
}

function transportFailure(cause: unknown): Error {
  if (cause instanceof DOMException && cause.name === 'TimeoutError') {
    return Object.assign(new Error('请求超时，结果待确认，请稍后按操作记录核对。'), { code: 'experts/outcome-unknown' });
  }
  if (cause instanceof DOMException && cause.name === 'AbortError') {
    return Object.assign(new Error('操作已取消。'), { code: 'experts/request-cancelled' });
  }
  return cause instanceof Error ? cause : new Error('无法连接专家管理服务，请重试。');
}

async function request<T>(url: string, init: RequestInit, timeoutMs: number, signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(timeoutMs);
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
  try {
    const response = await fetch(url, { ...init, signal: requestSignal });
    const result = await response.json() as { ok?: boolean; value?: unknown; error?: unknown };
    if (!result.ok) throw failure(result.error);
    return result.value as T;
  } catch (cause) {
    throw transportFailure(cause);
  }
}

async function call<T>(endpoint: string, payload: unknown, signal?: AbortSignal, timeoutMs = 30_000): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ endpoint, payload }),
  }, timeoutMs, signal);
}

/** Parsed `content-disposition` filename (RFC 5987 `filename*` preferred). */
function fileNameOf(disposition: string | null, fallback: string): string {
  if (!disposition) return fallback;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (utf8?.[1]) { try { return decodeURIComponent(utf8[1]); } catch { /* fall through */ } }
  const ascii = /filename="?([^";]+)"?/i.exec(disposition);
  return ascii?.[1] ? ascii[1] : fallback;
}

export interface ExpertExportDownload {
  readonly fileName: string;
  readonly digest: string;
  readonly bytes: number;
}

export interface PrepareExecutionOptions {
  readonly revisionId?: string;
  readonly workspaceRef?: string;
  readonly workspaceId?: string;
  readonly modelSelection?: ModelSelectionRequest;
  readonly draftText?: string;
}

export function createExpertManagementClient(ctx: Context, lifetime?: AbortSignal) {
  void ctx;
  const scoped = (signal?: AbortSignal) =>
    lifetime && signal ? AbortSignal.any([lifetime, signal]) : lifetime ?? signal;
  const invoke = <T>(endpoint: string, payload: unknown, signal?: AbortSignal, timeoutMs?: number) =>
    call<T>(endpoint, payload, scoped(signal), timeoutMs);
  let sequence = 0;
  /**
   * A fresh idempotency key per user-initiated mutation. Callers hold the id and reuse
   * it on retry so the Host replays the committed result instead of creating a duplicate.
   */
  const newOperationId = (action: string): string =>
    `expert-web-${action}-${Date.now().toString(36)}-${(sequence++).toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  return {
    listSkills: (expertId: string, scope: 'available' | 'equipped', signal?: AbortSignal) => invoke<readonly ExpertSkillOption[]>('skills', { expertId, scope }, signal),
    newOperationId,
    list: (query: ExpertListQuery = {}, signal?: AbortSignal) => invoke<ExpertListResult>('list', query, signal),
    get: (expertId: string, revisionId?: string, signal?: AbortSignal) =>
      invoke<ExpertDetail>('get', { expertId, ...(revisionId === undefined ? {} : { revisionId }) }, signal),
    createDraft: (definition: Partial<ExpertDefinition> | undefined, operationId: string, signal?: AbortSignal) =>
      invoke<ExpertDraft>('create-draft', { ...(definition === undefined ? {} : { definition }), operationId }, signal),
    updateDraft: (expertId: string, patch: Partial<ExpertDefinition>, operationId: string, expectedRevision?: string, signal?: AbortSignal) =>
      invoke<ExpertDraft>('update-draft', { expertId, patch, operationId, ...(expectedRevision === undefined ? {} : { expectedRevision }) }, signal),
    copy: (expertId: string, revisionId: string | undefined, operationId: string, signal?: AbortSignal) =>
      invoke<ExpertDraft>('copy', { expertId, ...(revisionId === undefined ? {} : { revisionId }), operationId }, signal),
    validate: (expertId: string, draftRevision: string, signal?: AbortSignal) =>
      invoke<ExpertValidation>('validate', { expertId, draftRevision }, signal),
    requestPublishConfirmation: (expertId: string, draftRevision: string, signal?: AbortSignal) =>
      invoke<ConfirmationRequest>('request-publish-confirmation', { expertId, draftRevision }, signal),
    confirmPublish: (confirmationToken: string, signal?: AbortSignal) =>
      invoke<ConfirmationProof>('confirm-publish', { confirmationToken }, signal),
    publish: (expertId: string, draftRevision: string, dependencyLockDigest: string, token: string, operationId: string, signal?: AbortSignal) =>
      invoke<PublishReceipt>('publish', { expertId, draftRevision, dependencyLockDigest, proof: { token }, operationId }, signal, 60_000),
    setAvailability: (expertId: string, availability: ExpertAvailability, operationId: string, proof?: ConfirmationProof, signal?: AbortSignal) =>
      invoke<AvailabilityReceipt>('set-availability', { expertId, availability, operationId, ...(proof === undefined ? {} : { proof }) }, signal),
    setPreference: (expertId: string, pinned: boolean, expectedRevision?: string, signal?: AbortSignal) =>
      invoke<ExpertPreference>('set-preference', { expertId, pinned, ...(expectedRevision === undefined ? {} : { expectedRevision }) }, signal),
    prepareExecution: (expertId: string, options: PrepareExecutionOptions = {}, signal?: AbortSignal) =>
      invoke<ExecutionPlan>('prepare-execution', { expertId, ...options }, signal),
    createExecution: (executionPlanId: string, operationId: string, signal?: AbortSignal) =>
      invoke<ExecutionCreation>('create-execution', { executionPlanId, operationId }, signal, 60_000),
    consumeHandoff: (handoffId: string, expectedDraftVersion: string, signal?: AbortSignal) =>
      invoke<DraftHandoff>('consume-handoff', { handoffId, expectedDraftVersion }, signal),
    prepareHandoff: (sourceSessionId: string, targetExpertId: string, sourceEventRef: string | undefined, selectedAssetRefs: readonly string[], signal?: AbortSignal) =>
      invoke<HandoffPlan>('prepare-handoff', { sourceSessionId, targetExpertId, ...(sourceEventRef === undefined ? {} : { sourceEventRef }), selectedAssetRefs }, signal),
    createHandoff: (handoffPlanId: string, reviewedSummary: string, operationId: string, signal?: AbortSignal) =>
      invoke<ExecutionCreation>('create-handoff', { handoffPlanId, reviewedSummary, operationId }, signal, 60_000),
    previewImport: (uploadedArtifactRef: string, signal?: AbortSignal) =>
      invoke<ImportPreview>('preview-import', { uploadedArtifactRef }, signal, 60_000),
    commitImport: (importPlanId: string, previewDigest: string, operationId: string, signal?: AbortSignal) =>
      invoke<ExpertDraft>('commit-import', { importPlanId, previewDigest, operationId }, signal, 60_000),
    operation: (operationId: string, signal?: AbortSignal) => invoke<Operation>('operation', { operationId }, signal),
    verifyBinding: (sessionId: string, signal?: AbortSignal) => invoke<ExecutionBinding>('verify-binding', { sessionId }, signal),
    /** Streaming upload of an export package; returns the staged artifact reference for preview/commit. */
    stageImport: (file: File, signal?: AbortSignal) =>
      request<{ uploadedArtifactRef: string }>(importPath, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'content-type': file.type || 'application/octet-stream', 'x-workdsh-file-name': encodeURIComponent(file.name) },
        body: file,
      }, 120_000, scoped(signal)),
    /** Binary download of the byte-identical export archive; triggers a browser save. */
    downloadExport: async (expertId: string, revisionId: string | undefined, signal?: AbortSignal): Promise<ExpertExportDownload> => {
      const timeout = AbortSignal.timeout(60_000);
      const requestSignal = scoped(signal) ? AbortSignal.any([scoped(signal)!, timeout]) : timeout;
      let response: Response;
      try {
        response = await fetch(exportPath, {
          method: 'POST', credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ expertId, ...(revisionId === undefined ? {} : { revisionId }) }),
          signal: requestSignal,
        });
      } catch (cause) {
        throw transportFailure(cause);
      }
      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        const result = await response.json().catch(() => undefined) as { ok?: boolean; error?: unknown } | undefined;
        throw failure(result?.ok ? undefined : result?.error);
      }
      if (!response.ok) throw transportFailure(new Error('导出失败，请重试。'));
      const blob = await response.blob();
      const fileName = fileNameOf(response.headers.get('content-disposition'), `${expertId}.expert.zip`);
      const digest = response.headers.get('x-workdsh-digest') ?? '';
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      return { fileName, digest, bytes: blob.size };
    },
  };
}

export type ExpertManagementClient = ReturnType<typeof createExpertManagementClient>;
