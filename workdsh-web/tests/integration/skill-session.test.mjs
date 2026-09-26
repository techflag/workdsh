import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createMessage, Context, Agents, AgentLoop, Sessions, Projections, SystemPrompt, Tools, Llm, Skills, filesystem, skillTool, SkillRequestAdapter } from '../helpers/skill-runtime.mjs';

class RepeatingSkillRequestAdapter extends SkillRequestAdapter {
  requests = [];
  schemas = [];
  async *stream(options) {
    this.requests.push(structuredClone(options.messages));
    this.schemas.push(structuredClone(options.tools ?? []));
    const requestNumber = this.requests.length;
    const toolTurn = requestNumber % 2 === 1;
    const block = toolTurn
      ? { type: 'tool-call', id: `skill-isolation-${Math.ceil(requestNumber / 2)}`, name: 'skill', arguments: '{"name":"sample"}' }
      : { type: 'text', text: 'Scoped fixture finished' };
    yield { type: 'block-start', index: 0, blockType: block.type };
    yield { type: 'block-end', index: 0, block };
    yield { type: 'finish', reason: { kind: toolTurn ? 'tool-calls' : 'stop' } };
  }
}

for (const allowed of [true, false]) {
test(`official Session skill consumption: model invocation ${allowed ? 'allowed' : 'denied'}`, { timeout: 15000 }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'workdsh-session-skill-'));
  const ctx = new Context();
  let handle;
  try {
    await mkdir(join(root, 'sample'));
    await writeFile(join(root, 'sample/SKILL.md'), `---\nname: sample\ndescription: Session skill fixture\ndisable-model-invocation: ${!allowed}\n---\nSESSION_BODY_SENTINEL\n`);
    for (const plugin of [Sessions, Projections, SystemPrompt, Tools, Llm, Agents, Skills, AgentLoop]) await ctx.plugin(plugin);
    const adapter = new SkillRequestAdapter();
    ctx.llm.registerAdapter(['workdsh-test'], adapter);
    handle = await ctx.agents.create({
      sessionId: randomUUID(),
      agentOptions: { provider: 'workdsh-test', model: 'fixed', cwd: root },
      setup: async agentCtx => {
        await agentCtx.plugin(filesystem, { includeDefaultRoots: false, customSkillDirs: [root], watch: false });
        await agentCtx.plugin(skillTool);
      },
    });
    handle.agent.followup(createMessage({ role: 'user', content: [{ type: 'text', text: 'Load the sample skill.' }], source: { kind: 'user' } }));
    await handle.agent.whenIdle();
    const events = handle.agent.session.snapshotEvents();
    assert.equal(adapter.requests.length, 2, JSON.stringify(events));
    const first = JSON.stringify(adapter.requests[0]);
    const second = JSON.stringify(adapter.requests[1]);
    assert.ok(adapter.schemas[0].some(tool => tool.name === 'skill'));
    assert.equal(first.includes('SESSION_BODY_SENTINEL'), false);
    const results = adapter.requests[1].filter(message => message.role === 'tool');
    assert.equal(results.length, 1);
    assert.equal(results[0].toolCallId, 'skill-probe-call');
    if (allowed) {
      assert.match(first, /available_skills/);
      assert.match(first, /Session skill fixture/);
      assert.notEqual(results[0].isError, true);
      assert.match(JSON.stringify(results[0]), /SESSION_BODY_SENTINEL/);
      assert.match(second, /skill_content/);
      assert.match(JSON.stringify(events), /skill-catalog/);
      assert.match(JSON.stringify(events), /SESSION_BODY_SENTINEL/);
    } else {
      assert.equal(first.includes('Session skill fixture'), false);
      assert.equal(second.includes('SESSION_BODY_SENTINEL'), false);
      assert.equal(JSON.stringify(events).includes('SESSION_BODY_SENTINEL'), false);
      assert.equal(results[0].isError, true);
      assert.match(JSON.stringify(results[0]), /not available for model invocation/);
    }
    assert.match(JSON.stringify(events), /skill-probe-call/);
  } finally {
    await handle?.dispose();
    await ctx.fiber.dispose();
    await rm(root, { recursive: true, force: true });
  }
});
}

test('live Agent Sessions isolate same-named skill calls through peer disposal', { timeout: 15000 }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'workdsh-session-skill-isolation-'));
  const ctx = new Context();
  const handles = [];
  try {
    for (const [name, body] of [['a', 'SESSION_SCOPE_A'], ['b', 'SESSION_SCOPE_B']]) {
      const directory = join(root, name, 'sample');
      await mkdir(directory, { recursive: true });
      await writeFile(join(directory, 'SKILL.md'), `---\nname: sample\ndescription: Scoped Session fixture ${name.toUpperCase()}\n---\n${body}\n`);
    }
    for (const plugin of [Sessions, Projections, SystemPrompt, Tools, Llm, Agents, Skills, AgentLoop]) await ctx.plugin(plugin);
    const adapters = { a: new RepeatingSkillRequestAdapter(), b: new RepeatingSkillRequestAdapter() };
    ctx.llm.registerAdapter(['workdsh-scope-a'], adapters.a);
    ctx.llm.registerAdapter(['workdsh-scope-b'], adapters.b);

    for (const name of ['a', 'b']) {
      handles.push(await ctx.agents.create({
        sessionId: randomUUID(),
        agentOptions: { provider: `workdsh-scope-${name}`, model: 'fixed', cwd: join(root, name) },
        setup: async agentCtx => {
          await agentCtx.plugin(filesystem, { includeDefaultRoots: false, customSkillDirs: [join(root, name)], watch: false });
          await agentCtx.plugin(skillTool);
        },
      }));
    }

    await Promise.all(handles.map(async handle => {
      handle.agent.followup(createMessage({ role: 'user', content: [{ type: 'text', text: 'Load the sample skill.' }], source: { kind: 'user' } }));
      await handle.agent.whenIdle();
    }));
    const [eventsA, eventsB] = handles.map(handle => JSON.stringify(handle.agent.session.snapshotEvents()));
    assert.match(eventsA, /SESSION_SCOPE_A/);
    assert.equal(eventsA.includes('SESSION_SCOPE_B'), false);
    assert.match(eventsB, /SESSION_SCOPE_B/);
    assert.equal(eventsB.includes('SESSION_SCOPE_A'), false);

    await handles[1].dispose();
    handles[1] = undefined;
    handles[0].agent.followup(createMessage({ role: 'user', content: [{ type: 'text', text: 'Load the sample skill again.' }], source: { kind: 'user' } }));
    await handles[0].agent.whenIdle();
    const continuedA = JSON.stringify(handles[0].agent.session.snapshotEvents());
    assert.equal((continuedA.match(/SESSION_SCOPE_A/g) ?? []).length >= 2, true);
    assert.equal(continuedA.includes('SESSION_SCOPE_B'), false);
    assert.equal(adapters.a.requests.length, 4);
    assert.equal(adapters.b.requests.length, 2);
  } finally {
    for (const handle of handles.reverse()) await handle?.dispose();
    await ctx.fiber.dispose();
    await rm(root, { recursive: true, force: true });
  }
});
