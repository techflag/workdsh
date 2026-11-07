import { randomUUID } from 'node:crypto';
import type { Context } from '@deepseek-ai/cordis';
import type { ConnectionRpcResult, HostConnectionHandle } from '@deepseek-ai/dsh-client-connection';
import type { ActorContext } from 'workdsh-contracts';

export const driveManagementPath = '/api/workdsh-drive';
export const driveDownloadPath = '/api/workdsh-drive/download';
const ok = <T>(value: T): ConnectionRpcResult<T> => ({ ok: true, value });
const fail = (code: string, message: string): ConnectionRpcResult<never> => ({ ok: false, error: { code, message, details: {} } });
const record = (value: unknown): Record<string, unknown> | undefined => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
/** 仅在确认无脚本执行风险时内联展示；SVG/HTML 一律走附件下载，避免同源执行。 */
const inlineSafe = (mediaType: string): boolean => /^text\/plain\b/i.test(mediaType) || /^application\/pdf\b/i.test(mediaType) || (/^(image|video|audio)\//i.test(mediaType) && !/^image\/svg/i.test(mediaType));
/** 文件名进响应头前去掉换行/引号/反斜杠，防止响应头拆分。 */
const headerName = (name: string): string => name.replace(/[\u0000-\u001f\u007f"\\]/g, '_').slice(0, 200) || 'download';
const actor = (ctx: Context): ActorContext => {
  const profile = ctx.workdshIdentity.profile();
  return { principalId: profile.principalId, organizationId: profile.organization.id, requestId: `drive-ui-${randomUUID()}`, resolvedBy: profile.resolvedBy };
};

const MESSAGES: Record<string, string> = {
  'drive/not-found': '网盘文件不存在或无权访问。',
  'drive/name-conflict': '同一目录已有同名项目。',
  'drive/invalid-name': '网盘名称无效。',
  'drive/not-folder': '目标不是文件夹。',
  'drive/cycle': '文件夹不能移动到自己的子目录。',
  'drive/file-size': '文件为空或超过限制。',
  'drive/quota-exceeded': '网盘容量不足。',
  'drive/operation-conflict': '相同操作标识的内容不一致。',
  'drive/invalid-operation': '操作标识无效。',
  'drive/revision-conflict': '文件已被其他编辑更新，请刷新后重试。',
  'drive/invalid-attachment': '附件引用无效。',
  'drive/invalid-actor': '无法确认当前身份。',
  'drive/not-archived': '该项目不在回收站中。',
  'drive/unsupported-read': '该文件不是文本，无法按文本读取。',
  'drive/unavailable': '网盘服务暂不可用。',
};

export function registerDriveConnection(ctx: Context): void {
  const connection = (ctx as Context & { connection: HostConnectionHandle }).connection;
  const lifetime = new AbortController();
  const pending = new Set<Promise<Response>>();
  const handle = (fetcher: (request: Request) => Promise<Response>) => (request: Request) => {
    if (lifetime.signal.aborted) return Promise.resolve(new Response('网盘服务已停止。', { status: 503 }));
    const operation = fetcher(new Request(request, { signal: AbortSignal.any([request.signal, lifetime.signal]) }));
    pending.add(operation);
    void operation.then(() => pending.delete(operation), () => pending.delete(operation));
    return operation;
  };
  const unregister: Array<() => Promise<void>> = [];
  // 注销、中止与排空放在同一个 disposer：功能卸载后不能再有下载/写入继续执行。
  ctx.effect(() => async () => {
    lifetime.abort();
    await Promise.all(unregister.map((dispose) => dispose()));
    await Promise.allSettled([...pending]);
  }, 'workdsh.drive.fetch');
  unregister.push(connection.fetch.register({
    path: driveManagementPath, methods: ['POST'], requestBody: 'buffered',
    fetch: handle(async request => {
      try {
        const body = record(await request.json()); const endpoint = body?.endpoint; const payload = record(body?.payload) ?? {};
        const current = actor(ctx); const manager = ctx.workdshDrive;
        if (endpoint === 'space') return Response.json(ok(await manager.space(current, request.signal)));
        if (endpoint === 'list' && (payload.parentId === undefined || typeof payload.parentId === 'string')) return Response.json(ok(await manager.list(current, payload.parentId as string | undefined, request.signal)));
        if (endpoint === 'create-folder' && typeof payload.name === 'string' && (payload.parentId === undefined || typeof payload.parentId === 'string')) return Response.json(ok(await manager.createFolder(current, payload.name, payload.parentId as string | undefined, request.signal)));
        if (endpoint === 'save' && typeof payload.name === 'string' && typeof payload.base64 === 'string' && typeof payload.operationId === 'string') {
          const source = payload.source === 'ai-generated' || payload.source === 'user-upload' || payload.source === 'tool-output' ? payload.source : undefined;
          return Response.json(ok(await manager.save(current, { name: payload.name, bytes: Buffer.from(payload.base64, 'base64'), operationId: payload.operationId, source: source ?? 'user-upload', ...(typeof payload.mediaType === 'string' ? { mediaType: payload.mediaType } : {}), ...(typeof payload.parentId === 'string' ? { parentId: payload.parentId } : {}), ...(typeof payload.sessionId === 'string' ? { sessionId: payload.sessionId } : {}) }, request.signal)));
        }
        if (endpoint === 'append-revision' && typeof payload.fileId === 'string' && typeof payload.base64 === 'string' && typeof payload.baseRevisionId === 'string' && typeof payload.operationId === 'string') {
          return Response.json(ok(await manager.appendRevision(current, { fileId: payload.fileId, bytes: Buffer.from(payload.base64, 'base64'), baseRevisionId: payload.baseRevisionId, operationId: payload.operationId, ...(typeof payload.mediaType === 'string' ? { mediaType: payload.mediaType } : {}) }, request.signal)));
        }
        if (endpoint === 'stat' && typeof payload.fileId === 'string') return Response.json(ok(await manager.stat(current, payload.fileId, request.signal)));
        if (endpoint === 'search' && typeof payload.query === 'string') {
          const kinds = Array.isArray(payload.kinds) && payload.kinds.every(value => typeof value === 'string') ? payload.kinds as never[] : undefined;
          const sources = Array.isArray(payload.sources) && payload.sources.every(value => typeof value === 'string') ? payload.sources as never[] : undefined;
          return Response.json(ok(await manager.search(current, payload.query, { ...(kinds ? { kinds } : {}), ...(sources ? { sources } : {}), ...(typeof payload.sessionId === 'string' ? { sessionId: payload.sessionId } : {}), ...(typeof payload.updatedAfter === 'string' ? { updatedAfter: payload.updatedAfter } : {}), ...(typeof payload.updatedBefore === 'string' ? { updatedBefore: payload.updatedBefore } : {}) }, request.signal)));
        }
        if (endpoint === 'sessions') return Response.json(ok(await manager.listSessions(current, request.signal)));
        if (endpoint === 'rename' && typeof payload.nodeId === 'string' && typeof payload.name === 'string') return Response.json(ok(await manager.rename(current, payload.nodeId, payload.name, request.signal)));
        if (endpoint === 'move' && typeof payload.nodeId === 'string' && (payload.parentId === undefined || typeof payload.parentId === 'string')) return Response.json(ok(await manager.move(current, payload.nodeId, payload.parentId as string | undefined, request.signal)));
        if (endpoint === 'archive' && typeof payload.nodeId === 'string') { await manager.archive(current, payload.nodeId, request.signal); return Response.json(ok({ archived: true })); }
        if (endpoint === 'list-archived') return Response.json(ok(await manager.listArchived(current, request.signal)));
        if (endpoint === 'restore' && typeof payload.nodeId === 'string') { await manager.restore(current, payload.nodeId, request.signal); return Response.json(ok({ restored: true })); }
        if (endpoint === 'purge' && typeof payload.nodeId === 'string') { await manager.purge(current, payload.nodeId, request.signal); return Response.json(ok({ purged: true })); }
        return Response.json(fail('drive/invalid-request', '网盘请求无效。'), { status: 400 });
      } catch (cause) {
        const code = cause instanceof Error && cause.message.startsWith('drive/') ? cause.message : 'drive/internal';
        const status = code === 'drive/internal' ? 500 : code === 'drive/revision-conflict' ? 409 : 400;
        return Response.json(fail(code, MESSAGES[code] ?? '网盘操作失败。'), { status });
      }
    }),
  }));
  // 原生下载路由：浏览器直接取二进制，避免 base64 全量驻留内存与 60s 超时。
  unregister.push(connection.fetch.register({
    path: driveDownloadPath, methods: ['GET'], requestBody: 'buffered',
    fetch: handle(async request => {
      const query = new URL(request.url).searchParams;
      const fileId = query.get('fileId');
      if (!fileId) return new Response('缺少文件标识。', { status: 400 });
      const revisionId = query.get('revisionId') ?? undefined;
      try {
        const current = actor(ctx); const manager = ctx.workdshDrive;
        const entry = await manager.stat(current, fileId, request.signal);
        if (!entry.file) return new Response('该节点不是文件。', { status: 400 });
        const mediaType = entry.file.mediaType || 'application/octet-stream';
        const mode = query.get('mode') === 'attachment' || !inlineSafe(mediaType) ? 'attachment' : 'inline';
        const bytes = new Uint8Array(await manager.readBytes(current, fileId, revisionId, request.signal));
        const name = headerName(entry.name);
        return new Response(bytes, {
          status: 200,
          headers: {
            'content-type': mediaType,
            'content-length': String(bytes.byteLength),
            'content-disposition': `${mode}; filename="${name.replace(/[^\x20-\x7e]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(name)}`,
            'cache-control': 'private, no-store',
            'x-content-type-options': 'nosniff',
          },
        });
      } catch (cause) {
        const code = cause instanceof Error && cause.message.startsWith('drive/') ? cause.message : 'drive/internal';
        return new Response(MESSAGES[code] ?? '网盘下载失败。', { status: code === 'drive/not-found' ? 404 : code === 'drive/internal' ? 500 : 400, headers: { 'cache-control': 'no-store' } });
      }
    }),
  }));
}
