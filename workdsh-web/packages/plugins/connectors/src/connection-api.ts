import type { Context } from '@deepseek-ai/cordis';
import type { ConnectionRpcResult, HostConnectionHandle } from '@deepseek-ai/dsh-client-connection';

export const connectorManagementPath = '/api/workdsh-connectors';
const ok = <T>(value: T): ConnectionRpcResult<T> => ({ ok: true, value });
const fail = (code: string, message: string): ConnectionRpcResult<never> => ({ ok: false, error: { code, message, details: {} } });
const record = (value: unknown): Record<string, unknown> | undefined => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;

export function registerConnectorManagementConnection(ctx: Context): void {
  const connection = (ctx as Context & { connection: HostConnectionHandle }).connection;
  const manager = ctx.workdshConnectors;
  const unregister = connection.fetch.register({
    path: connectorManagementPath,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: async request => {
      try {
        const body = record(await request.json());
        const endpoint = body?.endpoint;
        const payload = record(body?.payload) ?? {};
        if (endpoint === 'list') return Response.json(ok(await manager.list(request.signal)), { headers: { 'cache-control': 'no-store' } });
        if (endpoint === 'config' && typeof payload.id === 'string') return Response.json(ok(await manager.config(payload.id)), { headers: { 'cache-control': 'no-store' } });
        if (endpoint === 'create') return Response.json(ok(await manager.create(payload as never)), { headers: { 'cache-control': 'no-store' } });
        if (endpoint === 'update' && typeof payload.id === 'string' && record(payload.input)) return Response.json(ok(await manager.update(payload.id, payload.input as never)), { headers: { 'cache-control': 'no-store' } });
        if (endpoint === 'remove' && typeof payload.id === 'string') { await manager.remove(payload.id); return Response.json(ok({ removed: true }), { headers: { 'cache-control': 'no-store' } }); }
        if (endpoint === 'set-enabled' && typeof payload.id === 'string' && typeof payload.enabled === 'boolean') {
          return Response.json(ok(await manager.setEnabled(payload.id, payload.enabled)), { headers: { 'cache-control': 'no-store' } });
        }
        if (endpoint === 'selection' && typeof payload.sessionId === 'string') {
          return Response.json(ok(await manager.selection(payload.sessionId)), { headers: { 'cache-control': 'no-store' } });
        }
        if (endpoint === 'set-selection' && typeof payload.sessionId === 'string' && Array.isArray(payload.connectorIds) && payload.connectorIds.every(id => typeof id === 'string')) {
          return Response.json(ok(await manager.setSelection(payload.sessionId, payload.connectorIds)), { headers: { 'cache-control': 'no-store' } });
        }
        return Response.json(fail('connector/invalid-request', '连接器管理请求无效。'), { status: 400 });
      } catch (cause) {
        const known = new Set(['connector/not-found', 'connector/command-required', 'connector/url-required', 'connector/server-name-conflict']);
        const code = cause instanceof Error && known.has(cause.message) ? cause.message : 'connector/internal';
        const messages: Record<string, string> = { 'connector/not-found': '未找到该连接器。', 'connector/command-required': 'stdio 连接需要填写启动命令。', 'connector/url-required': 'HTTP 连接需要填写 MCP URL。', 'connector/server-name-conflict': '服务标识已被其他 MCP 使用。' };
        const message = messages[code] ?? '连接器操作失败，请重试。';
        return Response.json(fail(code, message));
      }
    },
  });
  ctx.effect(() => unregister, 'workdsh.connectors.fetch');
}
