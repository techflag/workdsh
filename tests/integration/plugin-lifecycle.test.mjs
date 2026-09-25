import test from 'node:test';
import assert from 'node:assert/strict';
import { Context } from '@deepseek-ai/cordis';
import SkillRegistry from '@deepseek-ai/dsh-skill';
import Tools from '@deepseek-ai/dsh-tools';
import * as probe from '../../packages/bundle/dist/probe.js';

test('real bundle plugin releases its effect and supports a fresh installation', async () => {
  const ctx = new Context();
  try {
    ctx.provide('connection', { fetch: { register: () => async () => {} } });
    ctx.provide('agents', {});
    ctx.provide('attachments', {});
    ctx.provide('systemPrompt', { tools() {}, section() {}, getSectionOrder() { return 0; } });
    await ctx.plugin(Tools);
    await ctx.plugin(SkillRegistry);
    const first = await ctx.plugin(probe);
    const effectCount = first.getEffects().length;
    assert.ok(effectCount > 0);
    assert.equal(ctx.workdshSkills, undefined, 'product diagnostics do not initialize Skill');
    assert.equal(await ctx.skills.get('workdsh-skill-creator'), undefined);
    await first.dispose();
    assert.equal(first.getEffects().length, 0);
    await first.dispose();
    const second = await ctx.plugin(probe);
    assert.notEqual(first, second);
    assert.equal(second.getEffects().length, effectCount);
    await second.dispose();
    assert.equal(second.getEffects().length, 0);
  } finally { await ctx.fiber.dispose(); }
});
