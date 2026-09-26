import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Context } from '@deepseek-ai/cordis';
import SkillRegistry from '@deepseek-ai/dsh-skill';
import * as filesystem from '@deepseek-ai/dsh-skill-filesystem';
import Tools from '@deepseek-ai/dsh-tools';
import * as skills from '../../packages/plugins/skills/dist/index.js';

const settle = async predicate => {
  for (let i = 0; i < 100; i++) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.ok(predicate(), 'plugin lifecycle settled');
};

test('Skill service waits, activates independently, disposes consumers and restores without losing files', async () => {
  const home = await mkdtemp(join(tmpdir(), 'workdsh-skill-lifetime-'));
  const original = { DSH_HOME: process.env.DSH_HOME, DSH_AGENTS_HOME: process.env.DSH_AGENTS_HOME };
  const ctx = new Context();
  const routes = new Map();
  try {
    process.env.DSH_HOME = join(home, 'dsh'); process.env.DSH_AGENTS_HOME = join(home, 'agents');
    const file = join(home, 'agents/skills/shared-sample/SKILL.md');
    await mkdir(join(home, 'agents/skills/shared-sample'), { recursive: true });
    await writeFile(file, '---\nname: shared-sample\ndescription: Shared dependency fixture\n---\nPRESERVE_ME\n');
    ctx.provide('systemPrompt', { tools() {}, section() {}, getSectionOrder() { return 0; } });
    ctx.provide('unrelatedFeature', { healthy: true });
    // The transport registry is an inert test carrier; Skills/Tools/Cordis are real.
    ctx.provide('connection', { fetch: { register(route) {
      assert.ok(!routes.has(route.path), 'exact route registered once');
      routes.set(route.path, route);
      return async () => { routes.delete(route.path); };
    } } });
    await ctx.plugin(Tools);
    const skillFiber = ctx.plugin(skills);
    assert.equal(skillFiber.state, 0, 'PENDING without official skills service');
    assert.equal(ctx.workdshSkills, undefined);
    const registry = await ctx.plugin(SkillRegistry);
    await settle(() => skillFiber.state === 2);
    await ctx.plugin(filesystem, { dshHome: process.env.DSH_HOME, agentsHome: process.env.DSH_AGENTS_HOME, watch: false });
    assert.equal(ctx.workdshSkills.contractVersion, 1);
    const originalService = ctx.workdshSkills;
    const observed = [], disposed = [];
    const consumer = id => ({ inject: ['workdshSkills'], apply(context) {
      observed.push([id, context.workdshSkills]);
      context.effect(() => context.workdshSkills.registerDependencyInspector(() => [{ kind: 'test-consumer', id, label: id, blocking: true }]));
      context.effect(() => () => { disposed.push(id); });
    } });
    await ctx.plugin(consumer('one')); await ctx.plugin(consumer('two'));
    // Cordis lends a context-specific service view to each consumer. Shared
    // registrations, not JavaScript proxy identity, establish the single owner.
    assert.equal(observed[0][1].contractVersion, 1);
    assert.equal(observed[1][1].contractVersion, 1);
    assert.equal((await ctx.workdshSkills.dependencyImpact('shared-sample')).dependents.length, 2);
    // Three official routes: buffered management, catalog icon delivery and streaming import.
    assert.equal(routes.size, 3);
    await registry.dispose();
    await settle(() => skillFiber.state === 0 && routes.size === 0 && disposed.length === 2);
    assert.equal(ctx.workdshSkills, undefined);
    assert.ok(ctx.unrelatedFeature.healthy);
    assert.equal(ctx.tools.get('workdsh_save_skill_draft'), undefined);
    await ctx.plugin(SkillRegistry);
    await settle(() => skillFiber.state === 2 && observed.length === 4);
    assert.notEqual(ctx.workdshSkills, originalService);
    assert.equal(routes.size, 3);
    let cancelled = false, readRequested = false;
    const body = new ReadableStream({
      start(controller) { controller.enqueue(new TextEncoder().encode('---\nname: pending-upload\n')); },
      pull() { readRequested = true; },
      cancel() { cancelled = true; },
    }, { highWaterMark: 0 }); // pull proves the Host reader started, not eager prefetch.
    const uploading = routes.get('/api/workdsh-skills/import').fetch(new Request('http://localhost/api/workdsh-skills/import', {
      method: 'POST', headers: { 'x-workdsh-file-name': 'SKILL.md' }, body, duplex: 'half',
    }));
    await settle(() => readRequested);
    await skillFiber.dispose();
    assert.equal((await (await uploading).json()).error.code, 'skill/request-cancelled');
    assert.ok(cancelled, 'disposal cancels and drains the active upload');
    await settle(() => routes.size === 0 && ctx.workdshSkills === undefined && disposed.length === 4);
    assert.equal(await ctx.skills.get('workdsh-skill-creator'), undefined);
    for (const name of ['workdsh-ppt-design', 'workdsh-word-design', 'workdsh-excel-design', 'workdsh-web-design']) {
      assert.equal(await ctx.skills.get(name), undefined, 'bundled authoring guidance is revoked with its owner');
    }
    assert.ok(ctx.unrelatedFeature.healthy);
    assert.match(await readFile(file, 'utf8'), /PRESERVE_ME/);
    assert.ok(await ctx.skills.get('shared-sample'), 'native file provider remains after management removal');
  } finally {
    await ctx.fiber.dispose();
    for (const [key, value] of Object.entries(original)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    await rm(home, { recursive: true, force: true });
  }
});
