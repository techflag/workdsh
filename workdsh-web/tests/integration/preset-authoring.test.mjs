import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { Context } from '@deepseek-ai/cordis';
import { AgentPresetRegistry } from '@deepseek-ai/dsh-agent-preset-registry';
import { compileExpertPreset, registerExpertPreset } from '../../packages/plugins/experts/dist/runtime/preset-compiler.js';
const require = createRequire(import.meta.url);
const harnessRequire = createRequire(require.resolve('@deepseek-ai/dsh/package.json'));
const { default: Loader } = await import(pathToFileURL(harnessRequire.resolve('@deepseek-ai/cordis-plugin-loader')).href);

test('published registry registers frozen expert declaration and restores it after disposal', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workdsh-presets-'));
  const oldHome = process.env.DSH_AGENTS_HOME;
  process.env.DSH_AGENTS_HOME = root;
  const contexts = [];
  async function boot() {
    const ctx = new Context(); ctx.baseUrl = pathToFileURL(dirname(require.resolve('@deepseek-ai/dsh/package.json')) + '/').href; contexts.push(ctx);
    await ctx.plugin(Loader, { baseUrl: pathToFileURL(dirname(require.resolve('@deepseek-ai/dsh/package.json')) + '/').href });
    for (const name of ['dsh-session', 'dsh-session-projection', 'dsh-system-prompt', 'dsh-tools', 'dsh-llm', 'dsh-agent', 'dsh-skill']) await ctx.loader.create({name: '@deepseek-ai/' + name});
    await ctx.plugin(AgentPresetRegistry, { default: 'standard' });
    await ctx.loader.create({ name: '@deepseek-ai/dsh-agent-preset', config: { id: 'standard', plugins: [] } });
    return ctx;
  }
  try {
    const ctx = await boot();
    const input = { expertId: 'declarative', basePresetId: 'standard', snapshotDirs: [], definition: {name:'Frozen expert', description:'Fixture', role:'ROLE_ONE', methodology:'Verify', boundaries:'No invention', deliverables:'Result', tags:[], examples:[], skillRequirements:[], futureRequirements:[]} };
    assert.ok(ctx.systemPrompt, 'systemPrompt available');
    const results = await Promise.all([compileExpertPreset(ctx, input), compileExpertPreset(ctx, input)]);
    assert.equal(results.filter(result => result.created).length, 1);
    const compiled = results[0];
    const resolved = await ctx.agentPresets.resolve(compiled.presetId);
    assert.equal(resolved.id, compiled.presetId);
    assert.equal(resolved.broken, undefined, JSON.stringify(resolved));
    assert.equal((await ctx.agentPresets.list()).find(row => row.id === compiled.presetId).name, 'Frozen expert');
    const before = await readFile(join(compiled.presetDir, 'preset.json'), 'utf8');
    const repeated = await compileExpertPreset(ctx, input);
    assert.equal(repeated.created, false);
    await ctx.fiber.dispose();
    const restored = await boot();
    await registerExpertPreset(restored, compiled.presetId, compiled.compositionDigest);
    assert.equal((await restored.agentPresets.resolve(compiled.presetId)).broken, undefined);
    assert.equal(await readFile(join(compiled.presetDir, 'preset.json'), 'utf8'), before);
    await assert.rejects(registerExpertPreset(restored, compiled.presetId, 'wrong'), error => error.code === 'experts/preset-drift');
  } finally {
    for (const ctx of contexts) await ctx.fiber.dispose();
    if (oldHome === undefined) delete process.env.DSH_AGENTS_HOME; else process.env.DSH_AGENTS_HOME = oldHome;
    await rm(root, {recursive:true, force:true});
  }
});
