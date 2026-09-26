import readline from 'node:readline';

const catalog = [
  { id: 'DSH-101', name: 'MCP 接入指南', owner: 'WorkDSH', status: '可用' },
  { id: 'DSH-102', name: '连接器验收清单', owner: 'WorkDSH', status: '可用' },
  { id: 'DSH-103', name: '资源模板示例', owner: 'WorkDSH', status: '维护中' },
];

const write = message => process.stdout.write(`${JSON.stringify(message)}\n`);
const result = (id, value) => write({ jsonrpc: '2.0', id, result: value });
const failure = (id, code, message) => write({ jsonrpc: '2.0', id, error: { code, message } });
const text = value => ({ content: [{ type: 'text', text: JSON.stringify(value, null, 2) }], structuredContent: value });

const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
input.on('line', line => {
  if (!line.trim()) return;
  let request;
  try { request = JSON.parse(line); } catch { return; }
  if (request.id === undefined) return;
  switch (request.method) {
    case 'initialize':
      result(request.id, {
        protocolVersion: request.params?.protocolVersion ?? '2025-06-18',
        capabilities: { tools: {}, resources: {} },
        serverInfo: { name: 'workdsh-example-business-service', version: '1.0.0' },
        instructions: 'Use this server when the user asks to verify the WorkDSH MCP connector example or query its sample business catalog.',
      });
      break;
    case 'ping': result(request.id, {}); break;
    case 'tools/list':
      result(request.id, { tools: [
        {
          name: 'connector_status',
          title: '连接器状态',
          description: 'Return the live status and capabilities of the WorkDSH MCP example server.',
          inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        },
        {
          name: 'search_catalog',
          title: '查询示例业务目录',
          description: 'Search the deterministic WorkDSH sample business catalog by id, name, owner, or status.',
          inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Optional search text.' } }, additionalProperties: false },
        },
      ] });
      break;
    case 'tools/call': {
      const name = request.params?.name;
      if (name === 'connector_status') {
        result(request.id, text({ ok: true, server: 'workdsh-example', transport: 'stdio', tools: 2, resources: 1, resourceTemplates: 1 }));
      } else if (name === 'search_catalog') {
        const query = String(request.params?.arguments?.query ?? '').trim().toLowerCase();
        const rows = query ? catalog.filter(row => Object.values(row).some(value => String(value).toLowerCase().includes(query))) : catalog;
        result(request.id, text({ count: rows.length, rows }));
      } else failure(request.id, -32602, `Unknown tool: ${String(name)}`);
      break;
    }
    case 'resources/list':
      result(request.id, { resources: [{ uri: 'workdsh://connector/guide', name: 'WorkDSH 连接器指南', description: '真实 MCP 示例的说明资源。', mimeType: 'text/markdown' }] });
      break;
    case 'resources/templates/list':
      result(request.id, { resourceTemplates: [{ uriTemplate: 'workdsh://catalog/{id}', name: '示例业务目录条目', description: '按 id 读取一个示例业务对象。', mimeType: 'application/json' }] });
      break;
    case 'resources/read': {
      const uri = request.params?.uri;
      if (uri === 'workdsh://connector/guide') {
        result(request.id, { contents: [{ uri, mimeType: 'text/markdown', text: '# WorkDSH MCP 连接器\n\n该资源由随包 stdio MCP Server 实时返回。' }] });
      } else if (typeof uri === 'string' && uri.startsWith('workdsh://catalog/')) {
        const id = decodeURIComponent(uri.slice('workdsh://catalog/'.length));
        const row = catalog.find(item => item.id === id);
        if (row) result(request.id, { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(row) }] });
        else failure(request.id, -32002, `Resource not found: ${uri}`);
      } else failure(request.id, -32002, `Resource not found: ${String(uri)}`);
      break;
    }
    default: failure(request.id, -32601, `Method not found: ${request.method}`);
  }
});
