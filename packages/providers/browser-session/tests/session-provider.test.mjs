import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { Context } from '@deepseek-ai/cordis';
import Sessions from '@deepseek-ai/dsh-session';
import Projections from '@deepseek-ai/dsh-session-projection';
import SystemPrompt from '@deepseek-ai/dsh-system-prompt';
import Tools from '@deepseek-ai/dsh-tools';
import Llm from '@deepseek-ai/dsh-llm';
import Agents from '@deepseek-ai/dsh-agent';
import AgentLoop from '@deepseek-ai/dsh-agent-loop';
import BrowserUse from '@deepseek-ai/dsh-browser-use';
import * as BrowserSession from '../dist/index.js';

const TOOL = 'mcp__workdsh-playwright__browser_navigate';

test('official Agent Sessions receive isolated managed Playwright tools', {
  skip: !process.env.DSH_BROWSER_EXECUTABLE && !process.env.DSH_ELECTRON_TEST_EXECUTABLE,
  timeout: 60_000,
}, async () => {
  const ctx = new Context();
  const handles = [];
  let route;
  const profile = {
    principalId: 'local-owner',
    organization: { id: 'local-org', kind: 'personal' },
    membership: { principalId: 'local-owner', organizationId: 'local-org', state: 'active' },
  };
  try {
    ctx.provide('connection', { fetch: { register(value) { route = value; return async () => { route = undefined; }; } } });
    ctx.provide('workdshIdentity', { profile: () => profile });
    for (const plugin of [Sessions, Projections, SystemPrompt, Tools, Llm, Agents, AgentLoop, BrowserUse]) {
      await ctx.plugin(plugin);
    }
    await ctx.plugin(BrowserSession, process.env.DSH_ELECTRON_TEST_EXECUTABLE
      ? { electronExecutable: process.env.DSH_ELECTRON_TEST_EXECUTABLE }
      : { executablePath: process.env.DSH_BROWSER_EXECUTABLE });
    assert.equal(route?.path, '/api/workdsh-browser-session');
    const first = await ctx.agents.create({ sessionId: randomUUID() });
    handles.push(first);
    const second = await ctx.agents.create({ sessionId: randomUUID() });
    handles.push(second);
    await Promise.all(handles.map(handle => handle.agent.whenIdle()));

    assert.equal(ctx.browserUse.providerName, 'workdsh-playwright');
    for (const { agent } of handles) {
      assert.ok(ctx.tools.schemas(agent).some(schema => schema.name === TOOL));
    }
    assert.equal(ctx.workdshBrowserSession.active(first.agent), false);

    const execute = (agent, label) => ctx.tools.execute({
      agent,
      name: TOOL,
      arguments: { url: `data:text/html,<title>${label}</title><button onclick="this.textContent='CLICKED_${label}'">${label}</button>` },
      callId: `navigate-${label}`,
      signal: new AbortController().signal,
    });
    const one = await execute(first.agent, 'FIRST_SESSION');
    const two = await execute(second.agent, 'SECOND_SESSION');
    assert.equal(one.isError, false, JSON.stringify(one));
    assert.equal(two.isError, false, JSON.stringify(two));
    assert.match(JSON.stringify(one), /FIRST_SESSION/);
    assert.match(JSON.stringify(two), /SECOND_SESSION/);
    assert.doesNotMatch(JSON.stringify(two), /FIRST_SESSION/);

    const capture = await ctx.workdshBrowserSession.capture(first.agent, new AbortController().signal);
    assert.match(capture.url, /FIRST_SESSION/);
    assert.ok(Buffer.from(capture.jpegBase64, 'base64').subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])));
    const callRoute = async (sessionId, operation, extra = {}) => {
      const result = await route.fetch(new Request('http://localhost/api/workdsh-browser-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, operation, ...extra }),
      }));
      return { status: result.status, body: await result.json() };
    };
    assert.deepEqual(await callRoute(first.agent.id, 'status'), { status: 200, body: { active: true } });
    assert.equal((await callRoute('unknown-session', 'capture')).status, 404);
    assert.equal((await callRoute(second.agent.id, 'capture')).body.url.includes('FIRST_SESSION'), false);
    profile.organization.kind = 'shared';
    assert.equal((await callRoute(first.agent.id, 'capture')).status, 403);
    profile.organization.kind = 'personal';
    const remoteFrame = await callRoute(first.agent.id, 'capture');
    assert.equal(remoteFrame.status, 200);
    assert.match(remoteFrame.body.url, /FIRST_SESSION/);
    const clicked = await callRoute(first.agent.id, 'click', { x: 62, y: 17 });
    assert.equal(clicked.status, 200);
    assert.match(clicked.body.url, /FIRST_SESSION/);
    const observed = await ctx.tools.execute({
      agent: first.agent,
      name: 'mcp__workdsh-playwright__browser_snapshot',
      arguments: {},
      callId: 'after-sidebar-click',
      signal: new AbortController().signal,
    });
    assert.equal(observed.isError, false, JSON.stringify(observed));
    assert.match(JSON.stringify(observed), /CLICKED_FIRST_SESSION/);
    await assert.rejects(ctx.workdshBrowserSession.capture({ ...first.agent }, new AbortController().signal));

    await first.dispose();
    handles.splice(handles.indexOf(first), 1);
    assert.equal(ctx.tools.schemas(first.agent).some(schema => schema.name === TOOL), false);
    await assert.rejects(ctx.workdshBrowserSession.capture(first.agent, new AbortController().signal));
    assert.equal((await callRoute(first.agent.id, 'capture')).status, 404);
    const stillLive = await execute(second.agent, 'SECOND_STILL_LIVE');
    assert.equal(stillLive.isError, false, JSON.stringify(stillLive));
    assert.match(JSON.stringify(stillLive), /SECOND_STILL_LIVE/);
  } finally {
    for (const handle of handles.reverse()) await handle.dispose();
    await ctx.fiber.dispose();
  }
});
