// Installed only in a disposable probe Profile. Verifies the official
// continuable-subagent activation ceiling (ACTIVATION_LIMIT_REACHED, default
// maxActiveSubagents = 8) and slot recycling via drainContinuableChildren.
import { LlmAdapter } from '@deepseek-ai/dsh-llm';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

export const inject = ['connection', 'llm', 'subagents', 'sessionController', 'agents', 'sessionPersistence'];

const blocks = text => [{ type: 'text', text }];
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const delay = (milliseconds, signal) => new Promise((resolve, reject) => {
  const timer = setTimeout(done, milliseconds);
  const abort = () => done(signal?.reason instanceof Error ? signal.reason : new Error('ACTIVATION_LIMIT_FIXTURE_INTERRUPTED'));
  function done(error) {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
    error ? reject(error) : resolve();
  }
  if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true });
});

export function apply(ctx) {
  const requests = [];
  // Deterministic adapter: HOLD prompts suspend the turn so each child keeps a
  // live Activation; any other prompt answers immediately.
  class Model extends LlmAdapter {
    async listModels(provider) { return [{ provider, id: 'fixture', name: 'Activation ceiling fixture' }]; }
    async *stream(options) {
      const agent = ctx.agents.currentInitiator();
      const serialized = JSON.stringify(options.messages);
      const hold = serialized.includes('ACTIVATION_HOLD');
      requests.push({ agentId: agent?.id ?? null, hold, count: options.messages.length, tail: serialized.slice(-240) });
      if (hold) await delay(120000, options.signal);
      yield { type: 'block-start', index: 0, blockType: 'text' };
      yield { type: 'block-end', index: 0, block: { type: 'text', text: 'activation-limit ok' } };
      yield { type: 'finish', reason: { kind: 'stop' } };
    }
  }
  ctx.llm.registerAdapter(['activation-limit-fixture'], new Model());
  const history = async id => { const handle = await ctx.sessionPersistence.open(id, 'read'); try { return await handle.read(); } finally { await handle.close(); } };

  ctx.effect(() => ctx.connection.fetch.register({
    path: '/api/activation-limit-probe', methods: ['POST'], requestBody: 'buffered',
    async fetch(request) {
      let stage = 'request';
      let observed = null;
      try {
        const input = await request.json();
        stage = 'create-root';
        const created = await ctx.sessionController.create({ workspaceId: input.workspaceId });
        await ctx.sessionController.selectModel({ sessionId: created.sessionId, provider: 'activation-limit-fixture', model: 'fixture' });
        stage = 'prompt-root';
        await ctx.sessionController.prompt({ requestId: randomUUID(), sessionId: created.sessionId, mode: 'queue', content: blocks('ROOT_TURN：开始激活上限验证。') }, request.signal);
        stage = 'resolve-root';
        const resolved = await ctx.sessionController.resolveAgent(created.sessionId);
        const parent = resolved.agent;
        assert.ok(parent, 'root agent must resolve for the running root turn');

        stage = 'fill-until-refusal';
        const heldChildren = [];
        const attemptLog = [];
        observed = { attemptLog, heldChildren, refusal: null, stillLiveAtRefusal: null, drained: null, retry: null, exits: [] };
        // 显式 agentOptions 避免依赖 parent requestHeader 的就绪时序。
        const childAgentOptions = { provider: 'activation-limit-fixture', model: 'fixture' };
        const isHeld = id => requests.some(item => item.agentId === id && item.hold);
        const waitHeld = async (id, milliseconds) => { const until = Date.now() + milliseconds; while (Date.now() < until) { if (isHeld(id)) return true; await sleep(100); } return false; };
        const countLive = async ids => {
          let live = 0;
          for (const id of ids) {
            const events = (await history(id)).events;
            if (!events.some(e => e.type === 'turn/end')) live += 1;
          }
          return live;
        };
        let attempts = 0;
        while (observed.refusal === null && attempts < 30) {
          attempts += 1;
          try {
            const started = await ctx.subagents.startContinuable({
              provider: 'spawn', label: `hold-${attempts}`,
              request: { prompt: blocks(`ACTIVATION_HOLD：保持运行（尝试 ${attempts}）。`), parent, agentOptions: childAgentOptions },
              signal: request.signal,
            });
            const entered = await waitHeld(started.childId, 4000);
            attemptLog.push({ attempt: attempts, childId: started.childId, entered });
            if (entered) heldChildren.push(started.childId);
          } catch (cause) {
            const code = cause?.code ?? null;
            attemptLog.push({ attempt: attempts, refused: code, message: String(cause?.message ?? cause).slice(0, 220) });
            if (code === 'ACTIVATION_LIMIT_REACHED') {
              // 被拒说明 reserve 时八个槽已满；复核这八个槽对应多少个仍活跃的 child。
              const live = await countLive(heldChildren);
              if (live === 8) {
                observed.refusal = { code, message: String(cause.message) };
                observed.stillLiveAtRefusal = live;
                break;
              }
              await sleep(600);
            } else {
              await sleep(300);
            }
          }
        }

        stage = 'verify-live-at-refusal';
        const stillLive = [];
        for (const childId of heldChildren) {
          const events = (await history(childId)).events;
          if (!events.some(e => e.type === 'turn/end')) stillLive.push(childId);
        }
        if (observed.stillLiveAtRefusal === null) observed.stillLiveAtRefusal = stillLive.length;
        for (const attempt of attemptLog) {
          if (attempt.childId !== void 0 && !stillLive.includes(attempt.childId)) {
            const events = (await history(attempt.childId)).events;
            observed.exits.push({
              childId: attempt.childId, entered: attempt.entered,
              turnEnds: events.filter(e => e.type === 'turn/end').map(e => JSON.stringify(e.data.reason).slice(0, 260)),
              modelRequests: requests.filter(r => r.agentId === attempt.childId).length,
            });
          }
        }

        stage = 'drain-one-held-slot';
        const drainedChildId = stillLive[0];
        await ctx.subagents.drainContinuableChildren(parent, [drainedChildId]);
        observed.drained = { childId: drainedChildId };

        stage = 'retry-after-drain';
        const retried = await ctx.subagents.startContinuable({
          provider: 'spawn', label: 'hold-after-drain',
          request: { prompt: blocks('ACTIVATION_HOLD：槽位回收重试。'), parent, agentOptions: childAgentOptions },
          signal: request.signal,
        });
        observed.retry = { childId: retried.childId, entered: await waitHeld(retried.childId, 4000) };

        const value = {
          sessionId: created.sessionId,
          heldCount: heldChildren.length,
          attempts,
          observed,
        };
        // 后台清理，不阻塞验证响应；剩余 hold 中的 child 在 teardown 时被取消。
        void ctx.subagents.drainContinuableDescendants([parent]).catch(() => {});
        return Response.json({ ok: true, value });
      } catch (error) {
        return Response.json({ ok: false, stage, observed, error: error?.stack ?? String(error) });
      }
    },
  }));
}
