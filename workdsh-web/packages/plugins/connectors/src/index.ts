import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-client-connection';
import type {} from '@deepseek-ai/dsh-agent';
import type {} from '@deepseek-ai/dsh-credentials';
import type {} from '@deepseek-ai/dsh-mcp-resources';
import type {} from '@deepseek-ai/dsh-tools';
import type {} from '@deepseek-ai/dsh-storage-domain';
import { registerConnectorManagementConnection } from './connection-api.js';
import { ConnectorManager } from './manager.js';

export * from './shared.js';
export const name = 'workdsh-plugin-connectors';
export const inject = ['connection', 'tools', 'mcpResources', 'storageDomain', 'agents', 'credentials'];

export async function apply(ctx: Context): Promise<void> {
  await ctx.plugin(ConnectorManager);
  await ctx.plugin({
    name: 'workdsh-connectors-integration',
    inject: [...inject, 'workdshConnectors'],
    apply: registerConnectorManagementConnection,
  });
}
