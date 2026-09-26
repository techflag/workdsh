import test from 'node:test';
import assert from 'node:assert/strict';
import { Context } from '@deepseek-ai/cordis';
import { remoteMethods } from '@deepseek-ai/dsh-typert-protocol';
import { WorkdshProbe } from '../../examples/remote-probe/packages/probe/lib/types/index.js';

test('published decorators expose the expected runtime binding and method markers', async () => {
  const ctx = new Context();
  try {
    await ctx.plugin(WorkdshProbe);
    const service = ctx.workdshProbe;
    assert.equal(service.typertRemote.serviceKey, 'workdshProbe');
    assert.equal(service.typertRemote.namespace, 'workdshProbe');
    assert.deepEqual(remoteMethods(service).map(({ method, exportName, invocation }) => ({ method, exportName: exportName ?? method, invocation })), [
      { method: 'state', exportName: 'state', invocation: { kind: 'direct' } },
      { method: 'wait', exportName: 'wait', invocation: { kind: 'direct' } },
    ]);
  } finally { await ctx.fiber.dispose(); }
});

test('Host service completes bounded work and rejects invalid durations', async () => {
  const ctx = new Context();
  try {
    await ctx.plugin(WorkdshProbe);
    const service = ctx.workdshProbe;
    assert.deepEqual(await service.wait(0, new AbortController().signal), { active: 0, completed: 1, cancelled: 0 });
    for (const value of [-1, 10001, 0.5, NaN]) {
      await assert.rejects(service.wait(value, new AbortController().signal), { code: 'gateway/bad-request' });
    }
    assert.deepEqual(service.state(), { active: 0, completed: 1, cancelled: 0 });
  } finally { await ctx.fiber.dispose(); }
});

test('carrier abort clears active work without affecting a concurrent request', async () => {
  const ctx = new Context();
  try {
    await ctx.plugin(WorkdshProbe);
    const service = ctx.workdshProbe;
    const controller = new AbortController();
    const pending = service.wait(10000, controller.signal);
    const rejected = assert.rejects(pending, { name: 'AbortError' });
    const independent = service.wait(0, new AbortController().signal);
    assert.equal(service.state().active, 2);
    controller.abort();
    await rejected;
    await independent;
    assert.deepEqual(service.state(), { active: 0, completed: 1, cancelled: 1 });
    await assert.rejects(service.wait(1, controller.signal));
    assert.equal(service.state().active, 0);
  } finally { await ctx.fiber.dispose(); }
});

test('plugin disposal cancels pending work and reinstall starts a clean service', async () => {
  const ctx = new Context();
  try {
    const plugin = await ctx.plugin(WorkdshProbe);
    const first = ctx.workdshProbe;
    const rejected = assert.rejects(first.wait(10000, new AbortController().signal), { name: 'AbortError' });
    await plugin.dispose();
    await rejected;
    assert.deepEqual(first.state(), { active: 0, completed: 0, cancelled: 1 });
    assert.equal(ctx.workdshProbe, undefined);
    await ctx.plugin(WorkdshProbe);
    assert.notEqual(ctx.workdshProbe, first);
    assert.deepEqual(ctx.workdshProbe.state(), { active: 0, completed: 0, cancelled: 0 });
  } finally { await ctx.fiber.dispose(); }
});
