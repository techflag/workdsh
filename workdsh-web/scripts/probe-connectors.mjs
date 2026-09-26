import { Context } from '@deepseek-ai/cordis';
import Agents from '@deepseek-ai/dsh-agent';
import { createScope } from '@deepseek-ai/dsh-scope';
import Tools from '@deepseek-ai/dsh-tools';
import McpResources from '@deepseek-ai/dsh-mcp-resources';
import Storage from '@deepseek-ai/dsh-storage';
import * as StorageJson from '@deepseek-ai/dsh-storage-json';
import * as StorageDomain from '@deepseek-ai/dsh-storage-domain';
import CredentialProvider from '@deepseek-ai/dsh-credentials';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as Connectors from '../packages/plugins/connectors/dist/index.js';

const ctx = new Context();
const signal = new AbortController().signal;
let sequence = 0;
const execute = async (name, arguments_) => {
  const output = await ctx.tools.execute({ name, arguments: arguments_, callId: `connector-probe-${++sequence}`, agent: { id: 'connector-probe' }, signal });
  if (output.isError) throw output.error;
  return output.value;
};
const waitFor = async (predicate, timeoutMs = 5000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await predicate();
    if (value) return value;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Timed out waiting for connector readiness.');
};

ctx.provide('systemPrompt', { tools() {}, section() {}, getSectionOrder() { return 0; } });
ctx.provide('connection', { fetch: { register() { return async () => {}; } } });

const tools = await ctx.plugin(Tools).then(() => ctx.tools);
try {
  await ctx.plugin(Storage);
  const testRoot = await mkdtemp(join(tmpdir(), 'workdsh-connectors-'));
  await ctx.plugin({ ...StorageJson }, { root: testRoot });
  await ctx.plugin({ ...StorageDomain }, { backend: 'json' });
  class MemoryCredentials extends CredentialProvider {
    values = new Map();
    async resolve(ref) { const value = this.values.get(String(ref)); return value ? { value, source: 'probe' } : undefined; }
    async describe(ref) { return { configured: this.values.has(String(ref)), source: this.values.has(String(ref)) ? 'probe' : undefined, writable: true }; }
    async set(ref, value) { this.values.set(String(ref), value); }
    async unset(ref) { this.values.delete(String(ref)); }
    async readRecord() { return undefined; }
    async describeRecord() { return { configured: false, writable: true }; }
    async listRecords() { return []; }
    async modifyRecord() { return undefined; }
    async deleteRecord() {}
  }
  await ctx.plugin(MemoryCredentials);
  await ctx.plugin(McpResources);
  await ctx.plugin(Agents);
  await ctx.plugin(Connectors);
  const manager = ctx.workdshConnectors;
  const ready = await waitFor(async () => {
    const row = (await manager.list())[0];
    return row?.state === 'ready' ? row : undefined;
  });
  if (ready.state !== 'ready' || ready.toolNames.length !== 2 || ready.resourceCount !== 1 || ready.resourceTemplateCount !== 1) {
    throw new Error(`Unexpected ready projection: ${JSON.stringify(ready)}`);
  }
  const agent = { id: 'probe-session', session: { id: 'probe-session' } };
  let agentScope;
  const scopeFactory = ctx.plugin({ name: 'connector-probe-agent-scope', inject: ['tools'], apply(scopeCtx) { agentScope = createScope(scopeCtx, agent); } });
  await scopeFactory;
  agent.ctx = agentScope.ctx;
  const unregisterAgent = ctx.agents.register(agent);
  await unregisterAgent;
  if ((await manager.selection('probe-session')).length !== 0) throw new Error('A new conversation must not select a connector by default.');
  if (tools.schemas(agent).some(tool => tool.name.startsWith('mcp__workdsh-example__'))) throw new Error('Unselected MCP tools leaked into a new conversation.');
  const selected = await manager.setSelection('probe-session', [ready.id]);
  if (selected.length !== 1 || selected[0] !== ready.id) throw new Error('Conversation connector selection did not persist.');
  if (!tools.schemas(agent).some(tool => tool.name === 'mcp__workdsh-example__search_catalog')) throw new Error('Selected MCP tools were not exposed to the conversation.');
  if ((await manager.setSelection('probe-session', [])).length !== 0) throw new Error('Conversation connector selection did not clear.');
  if (tools.schemas(agent).some(tool => tool.name.startsWith('mcp__workdsh-example__'))) throw new Error('Cleared MCP tools remained exposed to the conversation.');
  await unregisterAgent();
  await agentScope.dispose();
  await scopeFactory.dispose();
  const searched = await execute('mcp__workdsh-example__search_catalog', { query: '验收' });
  const searchResult = searched.structuredContent;
  if (searchResult?.count !== 1 || searchResult.rows?.[0]?.id !== 'DSH-102') throw new Error(`MCP business tool result mismatch: ${JSON.stringify(searched)}`);
  const guide = await execute('read_mcp_resource', { server: 'workdsh-example', uri: 'workdsh://connector/guide' });
  if (!guide.contents?.[0]?.text?.includes('随包 stdio MCP Server')) throw new Error('MCP resource content mismatch.');

  const disabled = await manager.setEnabled('workdsh-example', false);
  if (disabled.state !== 'disabled' || tools.get('mcp__workdsh-example__search_catalog')) throw new Error('Disabling did not unregister MCP tools.');
  const unknown = await tools.execute({ name: 'mcp__workdsh-example__search_catalog', arguments: {}, callId: 'connector-disabled', agent: { id: 'connector-probe' }, signal });
  if (!unknown.isError) throw new Error('Disabled MCP tool remained callable.');

  const restored = await manager.setEnabled('workdsh-example', true);
  if (restored.state !== 'ready' || !tools.get('mcp__workdsh-example__search_catalog')) throw new Error('Re-enabling did not restore MCP tools.');
  const duplicate = await manager.create({ title: '第二个 MCP', description: '验证多实例配置', serverName: 'workdsh-second', transport: 'stdio', command: process.execPath, args: [new URL('../packages/plugins/connectors/dist/example-server.mjs', import.meta.url).pathname] });
  if (duplicate.state !== 'ready' || (await manager.list()).length !== 2) throw new Error('Multiple MCP instances were not registered.');
  await manager.remove(duplicate.id);
  if ((await manager.list()).length !== 1) throw new Error('Removing a connector instance failed.');
  console.log(JSON.stringify({
    connector: restored.id,
    state: restored.state,
    tools: restored.toolNames,
    resources: restored.resourceCount,
    resourceTemplates: restored.resourceTemplateCount,
    searchResult: searchResult.rows[0],
    disableRemovedTools: true,
    reenableRestoredTools: true,
    multiInstanceCreateRemove: true,
    defaultConversationSelection: [],
    conversationSelectionRoundTrip: true,
    conversationToolIsolation: true,
  }, null, 2));
} finally {
  await ctx.fiber.dispose();
}
if (tools.get('mcp__workdsh-example__search_catalog')) throw new Error('Plugin disposal left an MCP tool registered.');
