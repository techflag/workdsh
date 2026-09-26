import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-client-connection/client';
import type {} from '@deepseek-ai/dsh-api-remotes/client';
import type { ConnectorConfigView, ConnectorInput, ConnectorSummary } from '../shared.js';

const path = '/api/workdsh-connectors';
const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);

async function invoke<T>(ctx: Context, endpoint: string, payload: unknown, signal?: AbortSignal): Promise<T> {
  void ctx;
  const timeout = AbortSignal.timeout(15_000);
  const response = await fetch(path, {
    method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ endpoint, payload }), signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  const result = await response.json() as { ok?: boolean; value?: unknown; error?: unknown };
  if (!result.ok) {
    const error = isRecord(result.error) ? result.error : {};
    throw new Error(typeof error.message === 'string' ? error.message : '连接器操作失败，请重试。');
  }
  return result.value as T;
}

export function createConnectorManagementClient(ctx: Context, lifetime?: AbortSignal) {
  return {
    list: () => invoke<readonly ConnectorSummary[]>(ctx, 'list', {}, lifetime),
    config: (id: string) => invoke<ConnectorConfigView>(ctx, 'config', { id }, lifetime),
    create: (input: ConnectorInput) => invoke<ConnectorSummary>(ctx, 'create', input, lifetime),
    update: (id: string, input: ConnectorInput) => invoke<ConnectorSummary>(ctx, 'update', { id, input }, lifetime),
    remove: (id: string) => invoke<{ removed: true }>(ctx, 'remove', { id }, lifetime),
    setEnabled: (id: string, enabled: boolean) => invoke<ConnectorSummary>(ctx, 'set-enabled', { id, enabled }, lifetime),
    selection: (sessionId: string) => invoke<readonly string[]>(ctx, 'selection', { sessionId }, lifetime),
    setSelection: (sessionId: string, connectorIds: readonly string[]) => invoke<readonly string[]>(ctx, 'set-selection', { sessionId, connectorIds }, lifetime),
  };
}
export type ConnectorManagementClient = ReturnType<typeof createConnectorManagementClient>;
