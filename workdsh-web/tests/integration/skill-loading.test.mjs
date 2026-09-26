import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Context } from '@deepseek-ai/cordis';
import SkillRegistry from '@deepseek-ai/dsh-skill';
import * as filesystem from '@deepseek-ai/dsh-skill-filesystem';
import { createScope } from '@deepseek-ai/dsh-scope';

test('published filesystem provider loads bodies on demand without changing prior results', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workdsh-skill-body-'));
  const ctx = new Context();
  const directory = join(root, 'skills', 'sample');
  const file = join(directory, 'SKILL.md');
  const content = body => `---\nname: sample\ndescription: Fixed catalog description\n---\n${body}\n`;
  try {
    await mkdir(directory, { recursive: true });
    await writeFile(file, content('BODY_REVISION_ONE'));
    await ctx.plugin(SkillRegistry);
    const provider = await ctx.plugin(filesystem, {
      includeDefaultRoots: false, customSkillDirs: [join(root, 'skills')], watch: false,
    });
    const before = await ctx.skills.list({ cwd: root });
    assert.deepEqual(before.map(item => item.name), ['sample']);
    assert.equal(JSON.stringify(before).includes('BODY_REVISION_ONE'), false);
    const first = await ctx.skills.get('sample', { cwd: root });
    assert.equal(first.content.trim(), 'BODY_REVISION_ONE');
    await writeFile(file, content('BODY_REVISION_TWO'));
    assert.deepEqual(await ctx.skills.list({ cwd: root }), before);
    const second = await ctx.skills.get('sample', { cwd: root });
    assert.equal(second.content.trim(), 'BODY_REVISION_TWO');
    assert.equal(first.content.trim(), 'BODY_REVISION_ONE');
    await assert.rejects(ctx.skills.get('sample', { cwd: root, signal: AbortSignal.abort() }));
    await provider.dispose();
    assert.deepEqual(await ctx.skills.list({ cwd: root }), []);
    assert.equal(await ctx.skills.get('sample', { cwd: root }), undefined);
  } finally {
    await ctx.fiber.dispose();
    await rm(root, { recursive: true, force: true });
  }
});

test('official scopes keep same-named file skill bodies separate through disposal', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workdsh-skill-scopes-'));
  const ctx = new Context();
  const keyA = {}, keyB = {};
  let a, b;
  try {
    for (const name of ['a', 'b']) {
      const dir = join(root, name, 'sample');
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, 'SKILL.md'), `---\nname: sample\ndescription: Shared name\n---\nBODY_${name.toUpperCase()}\n`);
    }
    await ctx.plugin(SkillRegistry);
    a = createScope(ctx, keyA);
    b = createScope(ctx, keyB);
    for (const [scope, name] of [[a, 'a'], [b, 'b']]) {
      await scope.ctx.plugin(filesystem, { includeDefaultRoots: false, customSkillDirs: [join(root, name)], watch: false });
    }
    const [catalogA, catalogB, bodyA, bodyB] = await Promise.all([
      ctx.skills.list({ scope: keyA, cwd: root }),
      ctx.skills.list({ scope: keyB, cwd: root }),
      ctx.skills.get('sample', { scope: keyA, cwd: root }),
      ctx.skills.get('sample', { scope: keyB, cwd: root }),
    ]);
    assert.deepEqual(catalogA.map(s => s.name), ['sample']);
    assert.deepEqual(catalogB.map(s => s.name), ['sample']);
    assert.equal(bodyA.content.trim(), 'BODY_A');
    assert.equal(bodyB.content.trim(), 'BODY_B');
    assert.equal(JSON.stringify(catalogA).includes('BODY_A'), false);
    assert.equal(JSON.stringify(catalogB).includes('BODY_B'), false);
    assert.deepEqual(await ctx.skills.list({ cwd: root }), []);
    assert.equal(await ctx.skills.get('sample', { cwd: root }), undefined);
    await b.dispose();
    assert.equal(await ctx.skills.get('sample', { scope: keyB, cwd: root }), undefined);
    assert.deepEqual(await ctx.skills.list({ scope: keyB, cwd: root }), []);
    assert.equal((await ctx.skills.get('sample', { scope: keyA, cwd: root })).content.trim(), 'BODY_A');
  } finally {
    await b?.dispose();
    await a?.dispose();
    await ctx.fiber.dispose();
    await rm(root, { recursive: true, force: true });
  }
});
