import type { Context } from '@deepseek-ai/cordis';
import type { ConnectionRpcResult, HostConnectionHandle } from '@deepseek-ai/dsh-client-connection';
import type { SkillInstallScope, SkillManagementEndpoint, SkillManagementService } from '../shared.js';
import { skillCatalogIconPath } from './catalog.js';

export const skillManagementPath = '/api/workdsh-skills';
export const skillImportPath = '/api/workdsh-skills/import';
const maximumBodyBytes = 1024 * 1024 + 64 * 1024;
const maximumUploadBytes = 50 * 1024 * 1024;

const ok = <T>(value: T): ConnectionRpcResult<T> => ({ ok: true, value });
const fail = (code: string, message: string): ConnectionRpcResult<never> => ({ ok: false, error: { code, message, details: {} } });
const record = (value: unknown): Record<string, unknown> | undefined => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
const nameFrom = (payload: unknown): string | undefined => typeof record(payload)?.name === 'string' ? record(payload)?.name as string : undefined;

function publicFailure(error: unknown): ConnectionRpcResult<never> {
  if (error instanceof DOMException && error.name === 'AbortError') return fail('skill/request-cancelled', '操作已取消。');
  const code = error instanceof Error && error.message.startsWith('skill/') ? error.message : 'skill/internal';
  const messages: Record<string, string> = {
    'skill/invalid-name': '技能名称无效。',
    'skill/not-manageable': '该技能由只读来源提供，不能修改。',
    'skill/revision-conflict': '技能已被其他进程修改，请重新加载后再保存。',
    'skill/name-mismatch': 'SKILL.md 中的名称与当前技能不一致。',
    'skill/description-required': 'SKILL.md 必须包含 description。',
    'skill/invalid-frontmatter': 'SKILL.md 必须包含有效的 YAML frontmatter。',
    'skill/not-disabled': '技能当前不是停用状态。',
    'skill/target-exists': '目标位置已存在同名技能。',
    'skill/reload-failed': '保存后重新发现技能失败。',
    'skill/path-symlink': '技能路径包含不安全的符号链接。',
    'skill/path-outside-managed-roots': '技能路径不在受控目录中。',
    'skill/invalid-resource-path': '资源文件路径无效。',
    'skill/resource-too-large': '资源文件超过 1 MiB 上限。',
    'skill/resource-not-text': '该资源不是 UTF-8 文本，不能在此编辑。',
    'skill/document-too-large': 'SKILL.md 超过 1 MiB 上限。',
    'skill/busy': '该技能正在被其他操作修改，请稍后重试。',
    'skill/invalid-trash-id': '回收记录无效。',
    'skill/trash-not-found': '未找到可恢复的技能。',
    'skill/import-file-type': '仅支持 .zip 压缩包或 .md 技能文档。',
    'skill/import-empty': '上传的文件为空。',
    'skill/import-too-large': '技能包超过限制：最多 50 MiB、400 个文件、6 层资源目录。',
    'skill/import-too-deep': '技能包目录层级超过 6 层。',
    'skill/import-symlink': '技能包包含不安全的符号链接。',
    'skill/import-unsafe-path': '技能包包含越界或无效路径。',
    'skill/import-duplicate-path': '技能包包含重复文件路径。',
    'skill/import-multiple-skills': '一个压缩包只能包含一个 SKILL.md。',
    'skill/import-missing-skill-md': '技能包必须包含 SKILL.md。',
    'skill/import-invalid-id': '导入凭据无效。',
    'skill/import-expired': '导入预检已过期，请重新选择文件。',
    'skill/import-verification-failed': '安装前复核失败，请重新导入。',
    'skill/import-invalid-zip': '压缩包无效或使用了不支持的压缩格式。',
    'skill/invalid-batch': '批量操作必须包含 1 至 100 个有效技能。',
    'skill/dependency-impact-changed': '技能依赖关系已变化，请重新确认后再卸载。',
    'skill/dependency-blocked': '仍有对象依赖该技能，解除依赖后才能卸载。',
    'skill/catalog-entry-unknown': '本地技能目录中没有该技能。',
    'skill/catalog-entry-over-limit': '该技能的体积或文件数超过导入上限，不能从目录安装。',
    'skill/catalog-payload-missing': '本地技能目录缺少该技能的安装负载，请重新生成目录。',
  };
  return fail(code, messages[code] ?? '技能操作失败，请重试。');
}

async function dispatch(manager: SkillManagementService, rawEndpoint: unknown, payload: unknown, signal: AbortSignal): Promise<ConnectionRpcResult<unknown>> {
  if (typeof rawEndpoint !== 'string') return fail('skill/invalid-request', '技能管理操作无效。');
  const endpoint = rawEndpoint as SkillManagementEndpoint;
  try {
    if (endpoint === 'list') return ok(await manager.list(signal));
    if (endpoint === 'catalog') return ok(await manager.catalog(signal));
    if (endpoint === 'trash-list') return ok(await manager.listTrash());
    if (endpoint === 'restore') {
      const id = record(payload)?.id;
      if (typeof id !== 'string') return fail('skill/invalid-request', '回收记录无效。');
      return ok(await manager.restore(id));
    }
    if (endpoint === 'commit-import') {
      const input = record(payload); const id = input?.id; const scope = input?.scope;
      if (typeof id !== 'string' || (scope !== undefined && scope !== 'shared-agents' && scope !== 'profile')) return fail('skill/invalid-request', '导入范围或凭据无效。');
      return ok(await manager.imports.commit(id, scope as SkillInstallScope | undefined, signal));
    }
    if (endpoint === 'discard-import') {
      const id = record(payload)?.id;
      if (typeof id !== 'string') return fail('skill/invalid-request', '导入凭据无效。');
      await manager.imports.discard(id); return ok(null);
    }
    if (endpoint === 'batch') {
      const input = record(payload); const names = input?.names; const action = input?.action;
      if (!Array.isArray(names) || !names.every(name => typeof name === 'string') || (action !== 'enable' && action !== 'disable' && action !== 'uninstall')) return fail('skill/invalid-request', '批量技能操作无效。');
      return ok(await manager.batch({ names, action }));
    }
    const name = nameFrom(payload);
    if (!name) return fail('skill/invalid-request', '请求缺少有效的技能名称。');
    if (endpoint === 'detail') {
      const detail = await manager.detail(name, signal);
      return detail ? ok(detail) : fail('skill/not-found', '未找到该技能。');
    }
    if (endpoint === 'update') {
      const input = record(payload);
      if (typeof input?.document !== 'string' || input.document.length > 1024 * 1024 || typeof input.expectedRevision !== 'string') {
        return fail('skill/invalid-request', '技能文档或版本信息无效。');
      }
      return ok(await manager.update({ name, document: input.document, expectedRevision: input.expectedRevision }));
    }
    if (endpoint === 'resource') {
      const resourcePath = record(payload)?.path;
      if (typeof resourcePath !== 'string') return fail('skill/invalid-request', '资源文件路径无效。');
      return ok(await manager.readResource(name, resourcePath));
    }
    if (endpoint === 'write-resource') {
      const input = record(payload);
      if (typeof input?.path !== 'string' || typeof input.document !== 'string' || input.document.length > 1024 * 1024 || (input.expectedRevision !== undefined && typeof input.expectedRevision !== 'string')) {
        return fail('skill/invalid-request', '资源文件内容或版本信息无效。');
      }
      return ok(await manager.writeResource({ name, path: input.path, document: input.document, expectedRevision: input.expectedRevision as string | undefined }));
    }
    if (endpoint === 'set-enabled') {
      const enabled = record(payload)?.enabled;
      if (typeof enabled !== 'boolean') return fail('skill/invalid-request', '启用状态无效。');
      return ok(await manager.setEnabled(name, enabled));
    }
    if (endpoint === 'install-catalog') {
      const scope = record(payload)?.scope;
      if (scope !== undefined && scope !== 'shared-agents' && scope !== 'profile') return fail('skill/invalid-request', '安装范围无效。');
      return ok(await manager.installFromCatalog(name, scope as SkillInstallScope | undefined, signal));
    }
    if (endpoint === 'dependency-impact') return ok(await manager.dependencyImpact(name));
    if (endpoint === 'uninstall') {
      const expectedImpactRevision = record(payload)?.expectedImpactRevision;
      if (typeof expectedImpactRevision !== 'string') return fail('skill/invalid-request', '卸载前必须确认最新依赖影响。');
      return ok(await manager.uninstall(name, expectedImpactRevision));
    }
    return fail('skill/unknown-endpoint', '未知的技能管理操作。');
  } catch (error) {
    return publicFailure(error);
  }
}

function json(result: ConnectionRpcResult<unknown>, status = 200): Response {
  return Response.json(result, { status, headers: { 'cache-control': 'no-store' } });
}

/** Register the management API inside Connection's authenticated `/api` carrier. */
export function registerSkillManagementConnection(ctx: Context): void {
  const connection = (ctx as Context & { connection: HostConnectionHandle }).connection;
  const manager = ctx.workdshSkills;
  const lifetime = new AbortController();
  const pending = new Set<Promise<Response>>();
  const handle = (fetcher: (request: Request) => Promise<Response>) => (request: Request) => {
    if (lifetime.signal.aborted) return Promise.resolve(json(fail('skill/unavailable', '技能管理已停止。'), 503));
    const current = new Request(request, { signal: AbortSignal.any([request.signal, lifetime.signal]) });
    const operation = fetcher(current);
    pending.add(operation);
    void operation.then(() => pending.delete(operation), () => pending.delete(operation));
    return operation;
  };
  // Unregister, abort and drain in one disposer: a removed feature must not
  // leave an upload or management write executing after dispose has completed.
  const unregister: Array<() => Promise<void>> = [];
  ctx.effect(() => async () => {
    lifetime.abort();
    await Promise.all(unregister.map(dispose => dispose()));
    await Promise.allSettled([...pending]);
  }, 'workdsh.skills.fetch');
  unregister.push(connection.fetch.register({
    path: skillManagementPath,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: handle(async request => {
      const declaredLength = Number(request.headers.get('content-length') ?? '0');
      if (Number.isFinite(declaredLength) && declaredLength > maximumBodyBytes) return json(fail('skill/request-too-large', '技能管理请求过大。'), 413);
      try {
        const text = await request.text();
        if (text.length > maximumBodyBytes) return json(fail('skill/request-too-large', '技能管理请求过大。'), 413);
        const body = record(JSON.parse(text));
        if (!body) return json(fail('skill/invalid-request', '技能管理请求格式无效。'), 400);
        return json(await dispatch(manager, body.endpoint, body.payload, request.signal));
      } catch (error) {
        if (error instanceof SyntaxError) return json(fail('skill/invalid-request', '技能管理请求格式无效。'), 400);
        return json(publicFailure(error));
      }
    }),
  }));
  unregister.push(connection.fetch.register({
    // Browser-native icon delivery: query parameters stay available on the request
    // URL, and the immutable revision in the URL keeps catalog caching honest.
    path: skillCatalogIconPath,
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: handle(async request => {
      const name = new URL(request.url).searchParams.get('name');
      if (!name) return new Response('缺少技能名称。', { status: 400 });
      try {
        const icon = await manager.readCatalogIcon(name);
        if (!icon) return new Response('未找到图标。', { status: 404 });
        // A fresh ArrayBuffer-backed view satisfies `BodyInit`.
        const bytes = new Uint8Array(icon.bytes);
        return new Response(bytes, {
          status: 200,
          headers: { 'content-type': icon.contentType, 'content-length': String(bytes.byteLength), 'cache-control': 'private, max-age=31536000, immutable' },
        });
      } catch { return new Response('未找到图标。', { status: 404 }); }
    }),
  }));
  unregister.push(connection.fetch.register({
    path: skillImportPath,
    methods: ['POST'],
    requestBody: 'streaming',
    fetch: handle(async request => {
      const declaredLength = Number(request.headers.get('content-length') ?? '0');
      if (Number.isFinite(declaredLength) && declaredLength > maximumUploadBytes) return json(fail('skill/import-too-large', '技能包不得超过 50 MiB。'), 413);
      const encodedName = request.headers.get('x-workdsh-file-name');
      if (!encodedName) return json(fail('skill/invalid-request', '请求缺少文件名。'), 400);
      try {
        const fileName = decodeURIComponent(encodedName);
        return json(ok(await manager.imports.stage(fileName, request.body, request.signal)));
      } catch (error) {
        return json(publicFailure(error));
      }
    }),
  }));
}
