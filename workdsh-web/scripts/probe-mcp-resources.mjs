import { Context } from '@deepseek-ai/cordis';
import Tools from '@deepseek-ai/dsh-tools';
import McpResources from '@deepseek-ai/dsh-mcp-resources';
import * as McpClient from '@deepseek-ai/dsh-mcp-client';
import { fileURLToPath } from 'node:url';

const server = fileURLToPath(new URL('./fixtures/mcp-resource-server.mjs', import.meta.url));
const ctx = new Context();
const signal = new AbortController().signal;
let sequence = 0;

async function execute(name, arguments_) {
  const response = await ctx.tools.execute({
    name,
    arguments: arguments_,
    callId: `mcp-resource-probe-${++sequence}`,
    agent: { id: 'mcp-resource-probe' },
    signal,
  });
  if (response.isError) throw response.error;
  return response.value;
}

try {
  ctx.provide('systemPrompt', { tools() {}, section() {}, getSectionOrder() { return 0; } });
  await ctx.plugin(Tools);
  await ctx.plugin(McpResources);
  await ctx.plugin(McpClient, {
    serverName: 'workdsh-probe',
    transport: 'stdio',
    command: process.execPath,
    args: [server],
    failOnStartupError: true,
    toolCallTimeoutMs: 10_000,
    maxInstructionBytes: 4_096,
    reconnect: { enabled: false, initialDelayMs: 100, maxDelayMs: 1_000, maxAttempts: 1 },
  });

  const agent = { id: 'mcp-resource-probe' };
  const availableTools = ctx.tools.schemas(agent).map((tool) => tool.name);
  for (const name of ['list_mcp_resources', 'list_mcp_resource_templates', 'read_mcp_resource']) {
    if (!availableTools.includes(name)) throw new Error(`Official MCP resource tool is missing: ${name}`);
  }

  const listed = await execute('list_mcp_resources', { server: 'workdsh-probe' });
  const templates = await execute('list_mcp_resource_templates', { server: 'workdsh-probe' });
  const fixed = await execute('read_mcp_resource', { server: 'workdsh-probe', uri: 'workdsh://guide/start' });
  const expanded = await execute('read_mcp_resource', { server: 'workdsh-probe', uri: 'workdsh://guide/presentation' });

  if (listed.resources?.[0]?.uri !== 'workdsh://guide/start') throw new Error('Static MCP resource was not discovered.');
  if (listed.resources?.[1]?.uri !== 'workdsh://guide/second-page' || listed.nextCursor !== undefined) throw new Error('MCP SDK pagination aggregation failed.');
  if (templates.resourceTemplates?.[0]?.uriTemplate !== 'workdsh://guide/{topic}') throw new Error('MCP URI template was not discovered.');
  if (fixed.contents?.[0]?.text !== 'WorkDSH MCP resources are ready.') throw new Error('Static MCP resource content mismatch.');
  if (expanded.contents?.[0]?.text !== 'WorkDSH guide topic: presentation') throw new Error('Expanded MCP resource content mismatch.');

  console.log(JSON.stringify({
    server: 'workdsh-probe',
    officialTools: availableTools.filter((name) => name.includes('mcp_resource')),
    resourceUri: listed.resources[0].uri,
    nextResourceUri: listed.resources[1].uri,
    pagination: 'aggregated by the official MCP SDK',
    uriTemplate: templates.resourceTemplates[0].uriTemplate,
    fixedText: fixed.contents[0].text,
    expandedText: expanded.contents[0].text,
  }, null, 2));
} finally {
  await ctx.fiber.dispose();
}
