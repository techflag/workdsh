import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { registerBrowserView } from '../dist/browser-view.js';

const profile = process.env.WORKDSH_PREVIEW_HOME;
const executable = process.env.DSH_BROWSER_EXECUTABLE;

test('real Playwright MCP navigation appears in its Session sidebar frame', { skip: !profile || !executable }, async () => {
  const requireProfile = createRequire(join(profile, 'profiles/preview/package.json'));
  const load = async name => import(requireProfile.resolve(name));
  const { Context } = await load('@deepseek-ai/cordis');
  const { default: Loader } = await load('@deepseek-ai/cordis-plugin-loader');
  const { default: Include } = await load('@deepseek-ai/cordis-plugin-include');
  const { default: BrowserUse } = await load('@deepseek-ai/dsh-browser-use');
  const { default: Browser } = await load('@deepseek-ai/dsh-experimental-browser-use-playwright-mcp').then(module => ({ default: module }));
  const { default: SystemPrompt } = await load('@deepseek-ai/dsh-system-prompt');
  const { default: Tools } = await load('@deepseek-ai/dsh-tools');
  const { default: Llm, ToolCallId } = await load('@deepseek-ai/dsh-llm');
  const { default: Sessions, SessionId } = await load('@deepseek-ai/dsh-session');
  const { default: Agents } = await load('@deepseek-ai/dsh-agent');
  const { default: AgentLoop } = await load('@deepseek-ai/dsh-agent-loop');
  const { default: Projections } = await load('@deepseek-ai/dsh-session-projection');
  const { default: Attachments } = await load('@deepseek-ai/dsh-attachment-local');

  const root = await mkdtemp(join(tmpdir(), 'workdsh-browser-view-'));
  const requests = new Set();
  const server = createServer((request, response) => {
    requests.add(request.url);
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end('<!doctype html><title>Browser view fixture</title><h1>Browser view fixture</h1><button style="position:fixed;left:20px;top:60px;width:160px;height:40px" onclick="this.textContent=\'Clicked\';fetch(\'/clicked\')">Click here</button>');
  });
  const ctx = new Context();
  let handler;
  try {
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const modules = new Map([
      ['browserUse', BrowserUse], ['prompt', SystemPrompt], ['tools', Tools], ['llm', Llm],
      ['sessions', Sessions], ['agents', Agents], ['loop', AgentLoop], ['projections', Projections],
      ['attachments', Attachments], ['browser', Browser],
    ]);
    const configPath = join(root, 'cordis.yml');
    await writeFile(configPath, JSON.stringify([...modules.keys()].map(name => ({
      id: name, name,
      config: name === 'loop' ? { agents: [] } : name === 'browser' ? { mode: 'launch', headless: true, executablePath: executable } : name === 'attachments' ? { dshHome: root } : {},
    }))));
    ctx.baseUrl = `${pathToFileURL(root).href}/`;
    await ctx.plugin(Loader);
    ctx.loader.builtins.include = Include;
    ctx.loader.internal = { version: 'v2', async import(specifier) { return modules.get(specifier); } };
    await ctx.loader.create({ name: 'cordis:include', config: { path: pathToFileURL(configPath).href } });
    await ctx.loader.await();
    const screenshots = [];
    registerBrowserView({
      effect: ctx.effect.bind(ctx), on: ctx.on.bind(ctx), tools: { async execute(call) {
        try {
          const response = await ctx.tools.execute(call);
          screenshots.push({ keys: Object.keys(response), error: response.isError, content: response.content.map(block => block.type === 'text' ? block.text.slice(0, 300) : block.type) });
          return response;
        } catch (cause) {
          screenshots.push({ thrown: String(cause) });
          throw cause;
        }
      } }, attachments: ctx.attachments,
      connection: { fetch: { register({ fetch }) { handler = fetch; return () => {}; } } },
    });
    const owner = await ctx.agents.create({ sessionId: SessionId('browser-view-real'), meta: { cwd: root } });
    await owner.agent.whenIdle();
    await ctx.systemPrompt.assemble({ agent: owner.agent, scope: owner.agent, signal: new AbortController().signal });
    const url = `http://127.0.0.1:${server.address().port}/fixture`;
    const result = await ctx.tools.execute({ agent: owner.agent, name: 'mcp__playwright-mcp__browser_navigate', arguments: { url }, callId: ToolCallId('navigate'), signal: AbortSignal.timeout(30_000) });
    assert.equal(result.isError, false, JSON.stringify(result.content));
    let frame;
    for (let i = 0; i < 100; i++) {
      const response = await handler(new Request('http://localhost/api/workdsh-agent-browser', { method: 'POST', body: JSON.stringify({ sessionId: 'browser-view-real' }) }));
      frame = (await response.json()).frame;
      if (frame?.image) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.equal(frame?.url, url);
    assert.match(frame?.image ?? '', /^data:image\/png;base64,/, JSON.stringify({ frame, screenshots }));
    const click = await handler(new Request('http://localhost/api/workdsh-agent-browser', { method: 'POST', body: JSON.stringify({ sessionId: 'browser-view-real', action: { kind: 'click', x: 50, y: 80 } }) }));
    assert.equal(click.status, 200, await click.text());
    assert.equal(requests.has('/clicked'), true);
    const otherSession = await handler(new Request('http://localhost/api/workdsh-agent-browser', { method: 'POST', body: JSON.stringify({ sessionId: 'not-this-session', action: { kind: 'click', x: 50, y: 80 } }) }));
    assert.equal(otherSession.status, 400);
    await owner.dispose();
  } finally {
    await ctx.fiber.dispose();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});
