import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
const providerManifest = require.resolve('@deepseek-ai/dsh-experimental-browser-use-playwright-mcp/package.json', {
  paths: [resolve(root, 'packages/bundle')],
});
const cli = resolve(dirname(providerManifest), '../../@playwright/mcp/cli.js');
const executablePath = process.env.DSH_BROWSER_EXECUTABLE
  ?? (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined);
if (!executablePath) throw new Error('Set DSH_BROWSER_EXECUTABLE to an installed Chromium executable.');
const runtimeOutput = resolve(root, '.test-runtime/browser-use-playwright');
await mkdir(runtimeOutput, { recursive: true });

const pageServer = createServer((_request, response) => {
  response.setHeader('content-type', 'text/html; charset=utf-8');
  response.end('<title>WorkDSH Browser Probe</title><main><h1>Browser Use Ready</h1><button>Verify</button></main>');
});
pageServer.listen(0, '127.0.0.1');
await once(pageServer, 'listening');
const address = pageServer.address();
if (!address || typeof address === 'string') throw new Error('Probe HTTP server did not publish a TCP address.');

const child = spawn(process.execPath, [
  cli,
  '--browser', 'chromium',
  '--isolated',
  '--headless',
  '--executable-path', executablePath,
  '--output-dir', runtimeOutput,
], { stdio: ['pipe', 'pipe', 'pipe'] });
let buffer = '';
let stderr = '';
let sequence = 0;
const pending = new Map();
child.stderr.on('data', chunk => { stderr += chunk; });
child.stdout.on('data', chunk => {
  buffer += chunk;
  for (;;) {
    const newline = buffer.indexOf('\n');
    if (newline < 0) break;
    const line = buffer.slice(0, newline);
    buffer = buffer.slice(newline + 1);
    if (!line) continue;
    const message = JSON.parse(line);
    const request = pending.get(message.id);
    if (!request) continue;
    clearTimeout(request.timer);
    pending.delete(message.id);
    request.resolve(message);
  }
});

function request(method, params) {
  return new Promise((resolveRequest, rejectRequest) => {
    const id = ++sequence;
    const timer = setTimeout(() => {
      pending.delete(id);
      rejectRequest(new Error(`Timed out waiting for ${method}: ${stderr.slice(-1000)}`));
    }, 30_000);
    pending.set(id, { resolve: resolveRequest, timer });
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
  });
}

try {
  const initialized = await request('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'workdsh-browser-use-probe', version: '1.0.0' },
  });
  if (initialized.error) throw new Error(JSON.stringify(initialized.error));
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);

  const listed = await request('tools/list', {});
  if (listed.error) throw new Error(JSON.stringify(listed.error));
  const names = listed.result.tools.map(tool => tool.name);
  for (const name of ['browser_navigate', 'browser_snapshot', 'browser_take_screenshot']) {
    if (!names.includes(name)) throw new Error(`Playwright MCP did not publish ${name}.`);
  }

  const navigated = await request('tools/call', {
    name: 'browser_navigate',
    arguments: { url: `http://127.0.0.1:${address.port}/` },
  });
  if (navigated.error || navigated.result?.isError) throw new Error(JSON.stringify(navigated.error ?? navigated.result));
  const snapshot = await request('tools/call', { name: 'browser_snapshot', arguments: {} });
  const snapshotText = snapshot.result?.content?.map(item => item.text ?? '').join('\n') ?? '';
  if (!snapshotText.includes('Browser Use Ready')) throw new Error('Playwright MCP snapshot did not contain the probe page.');

  const screenshot = await request('tools/call', {
    name: 'browser_take_screenshot',
    arguments: { type: 'png' },
  });
  const image = screenshot.result?.content?.find(item => item.type === 'image' && item.data);
  if (!image) throw new Error('Playwright MCP did not return a screenshot image.');
  const output = resolve(root, '.artifacts/browser-use-playwright.png');
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, Buffer.from(image.data, 'base64'));

  console.log(JSON.stringify({
    provider: 'playwright-mcp',
    toolCount: names.length,
    navigate: true,
    snapshot: true,
    screenshot: output,
  }, null, 2));
} finally {
  child.kill('SIGTERM');
  pageServer.close();
  for (const request of pending.values()) clearTimeout(request.timer);
}
