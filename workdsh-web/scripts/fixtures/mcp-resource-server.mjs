import readline from 'node:readline';

const resources = [
  {
    uri: 'workdsh://guide/start',
    name: 'WorkDSH resource probe',
    description: 'A deterministic text resource used to verify the official DSH MCP resource bridge.',
    mimeType: 'text/plain',
  },
  {
    uri: 'workdsh://guide/second-page',
    name: 'WorkDSH paginated resource',
    description: 'The second page used to verify MCP resource cursors.',
    mimeType: 'text/plain',
  },
];

function write(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function result(id, value) {
  write({ jsonrpc: '2.0', id, result: value });
}

function failure(id, code, message) {
  write({ jsonrpc: '2.0', id, error: { code, message } });
}

const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
input.on('line', (line) => {
  if (!line.trim()) return;
  let request;
  try {
    request = JSON.parse(line);
  } catch {
    return;
  }
  if (request.id === undefined) return;

  switch (request.method) {
    case 'initialize':
      result(request.id, {
        protocolVersion: request.params?.protocolVersion ?? '2025-06-18',
        capabilities: { resources: {} },
        serverInfo: { name: 'workdsh-resource-probe', version: '1.0.0' },
        instructions: 'This local server exists only for WorkDSH integration verification.',
      });
      break;
    case 'ping':
      result(request.id, {});
      break;
    case 'resources/list':
      result(request.id, request.params?.cursor === 'page-2'
        ? { resources: [resources[1]] }
        : { resources: [resources[0]], nextCursor: 'page-2' });
      break;
    case 'resources/templates/list':
      result(request.id, {
        resourceTemplates: [{
          uriTemplate: 'workdsh://guide/{topic}',
          name: 'WorkDSH topic guide',
          description: 'Reads a deterministic guide for the selected topic.',
          mimeType: 'text/plain',
        }],
      });
      break;
    case 'resources/read': {
      const uri = request.params?.uri;
      if (uri === 'workdsh://guide/start') {
        result(request.id, { contents: [{ uri, mimeType: 'text/plain', text: 'WorkDSH MCP resources are ready.' }] });
      } else if (typeof uri === 'string' && uri.startsWith('workdsh://guide/')) {
        const topic = decodeURIComponent(uri.slice('workdsh://guide/'.length));
        result(request.id, { contents: [{ uri, mimeType: 'text/plain', text: `WorkDSH guide topic: ${topic}` }] });
      } else {
        failure(request.id, -32002, `Resource not found: ${String(uri)}`);
      }
      break;
    }
    default:
      failure(request.id, -32601, `Method not found: ${request.method}`);
  }
});
