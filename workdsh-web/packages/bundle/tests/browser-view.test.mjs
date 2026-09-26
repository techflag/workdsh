import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerBrowserView } from '../dist/browser-view.js';

test('captures the action browser for its owning session only', async () => {
  const handlers = new Map();
  let fetchHandler;
  let disposed = false;
  const image = { type: 'image', attachment: { mediaType: 'image/png', bytes: 4 } };
  const calls = [];
  const ctx = {
    effect: () => undefined,
    on(name, handler) { handlers.set(name, handler); },
    tools: { async execute(call) { calls.push(call); return { isError: false, content: [image] }; } },
    attachments: { async readImage() { return { data: Uint8Array.of(1, 2, 3, 4) }; } },
    connection: { fetch: { register({ fetch }) { fetchHandler = fetch; return () => { disposed = true; }; } } },
  };
  registerBrowserView(ctx);
  const agent = { session: { id: 'session-a' }, ctx: { effect: () => undefined } };
  handlers.get('agent/created')({ agent });
  const decision = { kind: 'accept' };
  const result = await handlers.get('tools/post-execute')({
    name: 'mcp__playwright-mcp__browser_navigate', arguments: { url: 'https://example.test/' },
    agent, callId: 'call-1', rootCallId: 'call-1', token: Symbol('call'),
  }, { isError: false, content: [] }, async () => decision);
  assert.equal(result, decision);
  await new Promise(resolve => setImmediate(resolve));
  const frameFor = async sessionId => {
    const response = await fetchHandler(new Request('http://localhost/api/workdsh-agent-browser', { method: 'POST', body: JSON.stringify({ sessionId }) }));
    return (await response.json()).frame;
  };
  assert.deepEqual(calls.map(call => call.name), ['mcp__playwright-mcp__browser_take_screenshot']);
  assert.equal(calls[0].agent, agent);
  assert.equal(calls[0].parent.description, 'call');
  assert.deepEqual(await frameFor('session-a'), {
    sessionId: 'session-a', revision: 1, url: 'https://example.test/',
    image: 'data:image/png;base64,AQIDBA==',
  });
  assert.equal(await frameFor('session-b'), null);
  assert.equal(disposed, false);
});

test('uses raw MCP screenshots when model-facing image projection is unavailable', async () => {
  const handlers = new Map();
  let fetchHandler;
  const ctx = {
    effect: () => undefined,
    on(name, handler) { handlers.set(name, handler); },
    tools: { async execute() { return {
      isError: false,
      content: [{ type: 'text', text: '[image unavailable]' }],
      value: { content: [{ type: 'image', mimeType: 'image/png', data: 'AQIDBA==' }] },
    }; } },
    attachments: { async readImage() { throw new Error('Raw image needs no store'); } },
    connection: { fetch: { register({ fetch }) { fetchHandler = fetch; return () => {}; } } },
  };
  registerBrowserView(ctx);
  const agent = { session: { id: 'session-raw' }, ctx: { effect: () => undefined } };
  await handlers.get('tools/post-execute')({
    name: 'mcp__playwright-mcp__browser_navigate', arguments: { url: 'https://example.test/' },
    agent, callId: 'call-raw', rootCallId: 'call-raw', token: Symbol('raw'),
  }, { isError: false, content: [] }, async () => undefined);
  await new Promise(resolve => setImmediate(resolve));
  const response = await fetchHandler(new Request('http://localhost/api/workdsh-agent-browser', { method: 'POST', body: JSON.stringify({ sessionId: 'session-raw' }) }));
  assert.equal((await response.json()).frame.image, 'data:image/png;base64,AQIDBA==');
});
