import type { Context } from '@deepseek-ai/cordis';
import type { ConnectionRpcResult, HostConnectionHandle } from '@deepseek-ai/dsh-client-connection';
import type {
  ActorContext,
  ExpertDefinition,
  ExpertExample,
  ExpertListQuery,
  ExpertsService,
  FutureRequirement,
  ModelSelectionRequest,
  MutationContext,
  SkillRequirement,
} from 'workdsh-contracts';
import { ExpertsError } from '../domain/values.js';
import type { ExpertsManager } from './experts-manager.js';
import { EXPERT_IMPORT_LIMITS, buildExport } from './portability.js';

/**
 * Exact Fetch transport for the expert Host service (D04 / P1-02).
 *
 * The management page and the Agent tools call the SAME `ctx.workdshExperts`
 * authority; this module only carries requests over Connection's authenticated
 * `/api` channel. The actor is resolved on the Host from the trusted identity
 * provider for every request, so a client never supplies an actor, an owner or a
 * `confirmed:true` boolean as authority. `confirm-publish` is exposed here as a
 * trusted UI user action and is deliberately NOT offered as an Agent tool.
 */

export const expertsManagementPath = '/api/workdsh-experts';
export const expertsImportPath = '/api/workdsh-experts/import';
export const expertsExportPath = '/api/workdsh-experts/export';

const maximumBodyBytes = 32 * 1024 * 1024;

type Endpoint =
  | 'skills' | 'list' | 'get' | 'create-draft' | 'update-draft' | 'copy' | 'validate'
  | 'request-publish-confirmation' | 'confirm-publish' | 'publish'
  | 'set-availability' | 'set-preference' | 'prepare-execution' | 'create-execution'
  | 'consume-handoff' | 'prepare-handoff' | 'create-handoff' | 'preview-import'
  | 'commit-import' | 'export' | 'operation' | 'verify-binding';

const ok = <T>(value: T): ConnectionRpcResult<T> => ({ ok: true, value });
const fail = (code: string, message: string, details: object = {}): ConnectionRpcResult<never> => ({ ok: false, error: { code, message, details } });
const record = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
const str = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const bool = (value: unknown): boolean | undefined => (typeof value === 'boolean' ? value : undefined);
const strArray = (value: unknown): string[] | undefined =>
  Array.isArray(value) && value.every((item) => typeof item === 'string') ? (value as string[]) : undefined;
const oneOf = <T extends string>(value: unknown, allowed: readonly T[]): T | undefined =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;

function publicFailure(error: unknown): ConnectionRpcResult<never> {
  if (error instanceof DOMException && error.name === 'AbortError') return fail('experts/request-cancelled', '操作已取消。');
  if (error instanceof ExpertsError) return { ok: false, error: { code: error.code, message: error.message, details: error.details ?? {} } };
  const code = error instanceof Error && error.message.startsWith('experts/') ? error.message : 'experts/internal';
  return fail(code, '专家操作失败，请重试。');
}

/** Boundary sanitizer: keep only well-typed definition fields so the domain layer validates instead of crashing. */
function pickDefinition(value: unknown): Partial<ExpertDefinition> {
  const input = record(value);
  if (!input) return {};
  const patch: Record<string, unknown> = {};
  for (const field of ['name', 'description', 'role', 'methodology', 'boundaries', 'deliverables', 'avatarRef', 'categoryId', 'agentDocument'] as const) {
    const text = str(input[field]);
    if (text !== undefined) patch[field] = text;
  }
  const tags = strArray(input.tags);
  if (tags) patch.tags = tags;
  if (Array.isArray(input.examples)) {
    const examples: ExpertExample[] = [];
    for (const item of input.examples) {
      const row = record(item);
      const id = str(row?.id);
      const prompt = str(row?.prompt);
      if (id === undefined || prompt === undefined) continue;
      const title = str(row?.title);
      examples.push({ id, prompt, ...(title === undefined ? {} : { title }) });
    }
    patch.examples = examples;
  }
  if (Array.isArray(input.skillRequirements)) {
    const requirements: SkillRequirement[] = [];
    for (const item of input.skillRequirements) {
      const row = record(item);
      const name = str(row?.name);
      if (name === undefined) continue;
      const skillId = str(row?.skillId);
      requirements.push({ name, ...(skillId === undefined ? {} : { skillId }) });
    }
    patch.skillRequirements = requirements;
  }
  if (Array.isArray(input.futureRequirements)) {
    const requirements: FutureRequirement[] = [];
    for (const item of input.futureRequirements) {
      const row = record(item);
      const kind = str(row?.kind);
      const key = str(row?.key);
      const description = str(row?.description);
      const required = bool(row?.required);
      if (kind === undefined || key === undefined || description === undefined || required === undefined) continue;
      requirements.push({ kind, key, required, description });
    }
    patch.futureRequirements = requirements;
  }
  if (input.packageAssets !== undefined) patch.packageAssets = input.packageAssets;
  if (input.packageDocuments !== undefined) {
    const files = record(input.packageDocuments);
    if (!files || Object.values(files).some(value => typeof value !== 'string')) throw new ExpertsError('experts/invalid-definition', '制作文件必须是文本映射。');
    patch.packageDocuments = files;
  }
  if (input.team !== undefined) patch.team = input.team;
  return patch as Partial<ExpertDefinition>;
}

function mutationContext(payload: unknown): MutationContext | undefined {
  const input = record(payload);
  const operationId = str(input?.operationId);
  if (!operationId) return undefined;
  const expectedRevision = str(input?.expectedRevision);
  return { operationId, ...(expectedRevision === undefined ? {} : { expectedRevision }) };
}

function modelSelection(payload: unknown): ModelSelectionRequest | undefined {
  const input = record(record(payload)?.modelSelection);
  if (!input) return undefined;
  const provider = str(input.provider);
  const model = str(input.model);
  if (!provider || !model) return undefined;
  const reasoningEffort = str(input.reasoningEffort);
  return { provider, model, ...(reasoningEffort === undefined ? {} : { reasoningEffort }) };
}

function listQuery(payload: unknown): ExpertListQuery {
  const input = record(payload) ?? {};
  const expertType = oneOf(input.expertType, ['agent', 'team'] as const);
  const search = str(input.search);
  const origin = oneOf(input.origin, ['default', 'personal', 'organization'] as const);
  const availability = oneOf(input.availability, ['enabled', 'disabled', 'archived'] as const);
  const categoryId = str(input.categoryId);
  const cursor = str(input.cursor);
  const limit = typeof input.limit === 'number' && Number.isFinite(input.limit) ? input.limit : undefined;
  return {
    ...(expertType === undefined ? {} : { expertType }),
    ...(search === undefined ? {} : { search }),
    ...(origin === undefined ? {} : { origin }),
    ...(availability === undefined ? {} : { availability }),
    ...(categoryId === undefined ? {} : { categoryId }),
    ...(cursor === undefined ? {} : { cursor }),
    ...(limit === undefined ? {} : { limit }),
  };
}

async function dispatch(manager: ExpertsService, actor: ActorContext, rawEndpoint: unknown, payload: unknown, signal: AbortSignal): Promise<ConnectionRpcResult<unknown>> {
  if (typeof rawEndpoint !== 'string') return fail('experts/invalid-request', '专家管理操作无效。');
  const endpoint = rawEndpoint as Endpoint;
  const input = record(payload);
  try {
    switch (endpoint) {
      case 'skills': {
        const expertId = str(input?.expertId);
        if (!expertId || (input?.scope !== 'available' && input?.scope !== 'equipped')) return fail('experts/invalid-request', '技能目录请求无效。');
        return ok(await manager.listSkills(actor, expertId, input.scope, signal));
      }
      case 'list':
        return ok(await manager.list(actor, listQuery(payload), signal));
      case 'get': {
        const expertId = str(input?.expertId);
        if (!expertId) return fail('experts/invalid-request', '请求缺少专家标识。');
        return ok(await manager.get(actor, expertId, str(input?.revisionId), signal));
      }
      case 'create-draft': {
        const context = mutationContext(payload);
        if (!context) return fail('experts/invalid-request', '请求缺少幂等操作标识。');
        return ok(await manager.createDraft(actor, pickDefinition(input?.definition), context, signal));
      }
      case 'update-draft': {
        const expertId = str(input?.expertId);
        const context = mutationContext(payload);
        if (!expertId || !context) return fail('experts/invalid-request', '请求缺少专家标识或幂等操作标识。');
        return ok(await manager.updateDraft(actor, expertId, pickDefinition(input?.patch), context, signal));
      }
      case 'copy': {
        const expertId = str(input?.expertId);
        const context = mutationContext(payload);
        if (!expertId || !context) return fail('experts/invalid-request', '请求缺少专家标识或幂等操作标识。');
        return ok(await manager.copy(actor, expertId, str(input?.revisionId), context, signal));
      }
      case 'validate': {
        const expertId = str(input?.expertId);
        const draftRevision = str(input?.draftRevision);
        if (!expertId || !draftRevision) return fail('experts/invalid-request', '请求缺少专家标识或草稿修订。');
        return ok(await manager.validate(actor, expertId, draftRevision, signal));
      }
      case 'request-publish-confirmation': {
        const expertId = str(input?.expertId);
        const draftRevision = str(input?.draftRevision);
        if (!expertId || !draftRevision) return fail('experts/invalid-request', '请求缺少专家标识或草稿修订。');
        return ok(await manager.requestPublishConfirmation(actor, expertId, draftRevision, signal));
      }
      case 'confirm-publish': {
        const confirmationToken = str(input?.confirmationToken);
        if (!confirmationToken) return fail('experts/invalid-request', '请求缺少确认令牌。');
        return ok(await manager.confirmPublish(actor, confirmationToken, signal));
      }
      case 'publish': {
        const expertId = str(input?.expertId);
        const draftRevision = str(input?.draftRevision);
        const dependencyLockDigest = str(input?.dependencyLockDigest);
        const token = str(record(input?.proof)?.token);
        const context = mutationContext(payload);
        if (!expertId || !draftRevision || !dependencyLockDigest || !token || !context) {
          return fail('experts/invalid-request', '发布请求缺少必要字段或用户确认证明。');
        }
        return ok(await manager.publish(actor, expertId, draftRevision, dependencyLockDigest, { token }, context, signal));
      }
      case 'set-availability': {
        const expertId = str(input?.expertId);
        const availability = oneOf(input?.availability, ['enabled', 'disabled', 'archived'] as const);
        const context = mutationContext(payload);
        if (!expertId || !availability || !context) return fail('experts/invalid-request', '可用性变更请求无效。');
        const token = str(record(input?.proof)?.token);
        return ok(await manager.setAvailability(actor, expertId, availability, context, token ? { token } : undefined, signal));
      }
      case 'set-preference': {
        const expertId = str(input?.expertId);
        const pinned = bool(input?.pinned);
        if (!expertId || pinned === undefined) return fail('experts/invalid-request', '偏好设置请求无效。');
        return ok(await manager.setPreference(actor, expertId, pinned, str(input?.expectedRevision), signal));
      }
      case 'prepare-execution': {
        const expertId = str(input?.expertId);
        if (!expertId) return fail('experts/invalid-request', '请求缺少专家标识。');
        return ok(await manager.prepareExecution(actor, expertId, str(input?.revisionId), str(input?.workspaceRef), modelSelection(payload), str(input?.draftText), signal, str(input?.workspaceId)));
      }
      case 'create-execution': {
        const executionPlanId = str(input?.executionPlanId);
        const context = mutationContext(payload);
        if (!executionPlanId || !context) return fail('experts/invalid-request', '请求缺少执行计划或幂等操作标识。');
        return ok(await manager.createExecution(actor, executionPlanId, context, signal));
      }
      case 'consume-handoff': {
        const handoffId = str(input?.handoffId);
        const expectedDraftVersion = str(input?.expectedDraftVersion);
        if (!handoffId || !expectedDraftVersion) return fail('experts/invalid-request', '请求缺少交接标识或草稿版本。');
        return ok(await manager.consumeHandoff(actor, handoffId, expectedDraftVersion, signal));
      }
      case 'prepare-handoff': {
        const sourceSessionId = str(input?.sourceSessionId);
        const targetExpertId = str(input?.targetExpertId);
        if (!sourceSessionId || !targetExpertId) return fail('experts/invalid-request', '请求缺少源会话或目标专家。');
        return ok(await manager.prepareHandoff(actor, sourceSessionId, targetExpertId, str(input?.sourceEventRef), strArray(input?.selectedAssetRefs) ?? [], signal));
      }
      case 'create-handoff': {
        const handoffPlanId = str(input?.handoffPlanId);
        const reviewedSummary = str(input?.reviewedSummary);
        const context = mutationContext(payload);
        if (!handoffPlanId || reviewedSummary === undefined || !context) return fail('experts/invalid-request', '请求缺少交接计划、复核摘要或幂等操作标识。');
        return ok(await manager.createHandoff(actor, handoffPlanId, reviewedSummary, context, signal));
      }
      case 'preview-import': {
        const uploadedArtifactRef = str(input?.uploadedArtifactRef);
        if (!uploadedArtifactRef) return fail('experts/invalid-request', '请求缺少导入引用。');
        return ok(await manager.previewImport(actor, uploadedArtifactRef, signal));
      }
      case 'commit-import': {
        const importPlanId = str(input?.importPlanId);
        const previewDigest = str(input?.previewDigest);
        const context = mutationContext(payload);
        if (!importPlanId || !previewDigest || !context) return fail('experts/invalid-request', '请求缺少导入计划、预览摘要或幂等操作标识。');
        return ok(await manager.commitImport(actor, importPlanId, previewDigest, context, signal));
      }
      case 'export': {
        const expertId = str(input?.expertId);
        if (!expertId) return fail('experts/invalid-request', '请求缺少专家标识。');
        return ok(await manager.export(actor, expertId, str(input?.revisionId), signal));
      }
      case 'operation': {
        const operationId = str(input?.operationId);
        if (!operationId) return fail('experts/invalid-request', '请求缺少操作标识。');
        return ok(await manager.operation(actor, operationId, signal));
      }
      case 'verify-binding': {
        const sessionId = str(input?.sessionId);
        if (!sessionId) return fail('experts/invalid-request', '请求缺少会话标识。');
        return ok(await manager.verifyBinding(actor, sessionId, signal));
      }
      default:
        return fail('experts/unknown-endpoint', '未知的专家管理操作。');
    }
  } catch (error) {
    return publicFailure(error);
  }
}

function json(result: ConnectionRpcResult<unknown>, status = 200): Response {
  return Response.json(result, { status, headers: { 'cache-control': 'no-store' } });
}

/** Register the expert management API inside Connection's authenticated `/api` carrier. */
export function registerExpertsConnection(ctx: Context): void {
  const connection = (ctx as Context & { connection: HostConnectionHandle }).connection;
  const manager: ExpertsManager = ctx.workdshExperts;
  const lifetime = new AbortController();
  const pending = new Set<Promise<Response>>();
  const handle = (fetcher: (request: Request) => Promise<Response>) => (request: Request) => {
    if (lifetime.signal.aborted) return Promise.resolve(json(fail('experts/unavailable', '专家管理已停止。'), 503));
    const current = new Request(request, { signal: AbortSignal.any([request.signal, lifetime.signal]) });
    const operation = fetcher(current);
    pending.add(operation);
    void operation.then(() => pending.delete(operation), () => pending.delete(operation));
    return operation;
  };
  // Unregister, abort and drain in one disposer: a removed feature must not leave
  // an upload, export or management write executing after dispose has completed.
  const unregister: Array<() => Promise<void>> = [];
  ctx.effect(() => async () => {
    lifetime.abort();
    await Promise.all(unregister.map((dispose) => dispose()));
    await Promise.allSettled([...pending]);
  }, 'workdsh.experts.fetch');

  unregister.push(connection.fetch.register({
    path: expertsManagementPath,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: handle(async (request) => {
      const declaredLength = Number(request.headers.get('content-length') ?? '0');
      if (Number.isFinite(declaredLength) && declaredLength > maximumBodyBytes) return json(fail('experts/invalid-request', '专家管理请求过大。'), 413);
      try {
        const text = await request.text();
        if (text.length > maximumBodyBytes) return json(fail('experts/invalid-request', '专家管理请求过大。'), 413);
        const body = record(JSON.parse(text));
        if (!body) return json(fail('experts/invalid-request', '专家管理请求格式无效。'), 400);
        const actor = await ctx.workdshIdentity.resolve(undefined, request.signal);
        return json(await dispatch(manager, actor, body.endpoint, body.payload, request.signal));
      } catch (error) {
        if (error instanceof SyntaxError) return json(fail('experts/invalid-request', '专家管理请求格式无效。'), 400);
        return json(publicFailure(error));
      }
    }),
  }));

  // Streaming upload: stage an import package, then preview/commit over the RPC route.
  unregister.push(connection.fetch.register({
    path: expertsImportPath,
    methods: ['POST'],
    requestBody: 'streaming',
    fetch: handle(async (request) => {
      const declaredLength = Number(request.headers.get('content-length') ?? '0');
      if (Number.isFinite(declaredLength) && declaredLength > EXPERT_IMPORT_LIMITS.maxZipBytes) {
        return json(fail('experts/invalid-request', `专家包不得超过 ${EXPERT_IMPORT_LIMITS.maxZipBytes / (1024 * 1024)} MiB。`), 413);
      }
      const encodedName = request.headers.get('x-workdsh-file-name');
      if (!encodedName) return json(fail('experts/invalid-request', '请求缺少文件名。'), 400);
      try {
        const fileName = decodeURIComponent(encodedName);
        const stagedId = await manager.stageImport(fileName, request.body, request.signal);
        return json(ok({ uploadedArtifactRef: stagedId }));
      } catch (error) {
        return json(publicFailure(error));
      }
    }),
  }));

  // Binary download: rebuild the byte-identical archive from the exported definition.
  unregister.push(connection.fetch.register({
    path: expertsExportPath,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: handle(async (request) => {
      try {
        const body = record(await request.json().catch(() => undefined));
        const expertId = str(body?.expertId);
        if (!expertId) return json(fail('experts/invalid-request', '请求缺少专家标识。'), 400);
        const actor = await ctx.workdshIdentity.resolve(undefined, request.signal);
        const descriptor = await manager.export(actor, expertId, str(body?.revisionId), request.signal);
        const { archive } = buildExport(descriptor.definition, descriptor.sourceAttribution);
        const ascii = descriptor.fileName.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '');
        // A fresh ArrayBuffer-backed view satisfies `BodyInit` (fflate returns `Uint8Array<ArrayBufferLike>`).
        const zipBytes = new Uint8Array(archive);
        return new Response(zipBytes, {
          status: 200,
          headers: {
            'content-type': 'application/zip',
            'content-length': String(zipBytes.byteLength),
            'content-disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(descriptor.fileName)}`,
            'cache-control': 'no-store',
            'x-workdsh-digest': descriptor.digest,
          },
        });
      } catch (error) {
        return json(publicFailure(error));
      }
    }),
  }));
}
