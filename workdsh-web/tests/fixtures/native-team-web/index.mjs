// Installed only in a disposable probe Profile. Production owns every service
// below; this fixture substitutes model I/O and exposes local test orchestration.
import { LlmAdapter, createMessage } from '@deepseek-ai/dsh-llm';
import assert from 'node:assert/strict';
export const inject = ['connection', 'llm', 'agents', 'agentTeams', 'sessionController', 'sessionPersistence', 'workdshSessionAccess', 'workdshExperts', 'workdshIdentity'];
const blocks = text => [{ type: 'text', text }];
const delay = (milliseconds, signal) => new Promise((resolve, reject) => {
  const timer = setTimeout(done, milliseconds);
  const abort = () => done(signal?.reason instanceof Error ? signal.reason : new Error('WEB_FIXTURE_INTERRUPTED'));
  function done(error) {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
    error ? reject(error) : resolve();
  }
  if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true });
});
export function apply(ctx) {
  const requests = [];
  class Model extends LlmAdapter {
    async listModels(provider) { return [{ provider, id: 'fixture', name: 'Isolated Team fixture' }]; }
    async *stream(options) {
      const agent = ctx.agents.currentInitiator();
      const member = ctx.agentTeams.tryMembership(agent);
      const system = JSON.stringify(options.messages.filter(m => m.role === 'system'));
      const all = JSON.stringify(options.messages);
      const latest = JSON.stringify(options.messages.at(-1));
      if (latest.includes('WEB_HOLD_MEMBER')) await delay(20000, options.signal);
      if (latest.includes('WEB_HOLD_INTERRUPT')) await delay(20000, options.signal);
      if (latest.includes('WEB_HANDOFF')) await delay(8000, options.signal);
      if (member?.role === 'teammate') assert.ok(system.includes(`ROLE_${member.name.toUpperCase()}`), 'member role must come from its published asset');
      requests.push({ id: agent.id, name: member?.name });
      assert.ok(requests.length < 30, 'bounded fixture requests');
      if (latest.includes('WEB_FAIL_ONCE')) throw new Error('WEB_FIXTURE_MEMBER_FAILURE');
      let block;
      if (member?.role === 'lead' && all.includes('WEB_SPAWN_ANALYST') && !all.includes('"name":"spawn_teammate"')) {
        block = { type: 'tool-call', id: `spawn-${requests.length}`, name: 'spawn_teammate', arguments: JSON.stringify({ name: 'analyst', description: 'Fixture analyst', prompt: 'Read your method and verify the fixture.', context: 'fresh' }) };
      } else if (member?.role === 'teammate' && !all.includes(`METHOD_${member.name.toUpperCase()}`)) {
        block = { type: 'tool-call', id: `skill-${requests.length}`, name: 'skill', arguments: JSON.stringify({ name: `method-${member.name}` }) };
      } else block = { type: 'text', text: `${member?.name ?? 'lead'}：官方 Team 隔离验证完成。` };
      yield { type: 'block-start', index: 0, blockType: block.type };
      yield { type: 'block-end', index: 0, block };
      yield { type: 'finish', reason: { kind: block.type === 'tool-call' ? 'tool-calls' : 'stop' } };
    }
  }
  ctx.llm.registerAdapter(['native-team-fixture'], new Model());
  const definition = name => ({ name, description: '官方 Team 隔离验证配置', role: `ROLE_${name.toUpperCase()}`, methodology: 'Inspect the supplied fixture.', boundaries: 'Synthetic data only.', deliverables: 'A fixture result.', tags: [], examples: [{ id: 'one', prompt: 'Verify native Team.' }], skillRequirements: name === 'lead' ? [] : [{ name: `method-${name}` }], futureRequirements: [] });
  const waitFor = async (test, timeout = 15000) => {
    const stop = AbortSignal.timeout(timeout);
    while (!await test()) { stop.throwIfAborted(); await new Promise(r => setTimeout(r, 30)); }
  };
  const history = async id => { const handle = await ctx.sessionPersistence.open(id, 'read'); try { return await handle.read(); } finally { await handle.close(); } };
  const teamView = agent => ({ members: ctx.agentTeams.listMembers(agent), tasks: ctx.agentTeams.listTasks(agent) });
  const settle = async id => {
    await waitFor(() => requests.some(r => r.id === id));
    await waitFor(async () => (await history(id)).events.some(e => e.type === 'turn/end'));
    assert.equal((await history(id)).events.filter(e => e.type === 'turn/end').at(-1).data.reason.kind, 'completed');
  };
  ctx.effect(() => ctx.connection.fetch.register({ path: '/api/native-team-probe', methods: ['POST'], requestBody: 'buffered', async fetch(request) {
    let stage = 'request';
    try {
      const input = await request.json();
      let value;
      if (input.action === 'create') {
        stage = 'identity';
        const actor = await ctx.workdshIdentity.resolve({}, request.signal);
        stage = 'draft';
        const draft = await ctx.workdshExperts.createDraft(actor, { ...definition('lead'), team: { members: ['analyst', 'reviewer'].map(key => ({ key, definition: definition(key) })), workflows: [{ id: 'report', title: '测试报告', trigger: '核对测试数据', deliverable: '测试结论', stages: [{ id: 'draft', worker: 'analyst', reviewer: 'reviewer', dependsOn: [] }] }] } }, { operationId: 'web-team-create' });
        stage = 'validate';
        const validation = await ctx.workdshExperts.validate(actor, draft.expertId, draft.revision);
        assert.ok(validation.publishable, JSON.stringify(validation.issues));
        const confirmation = await ctx.workdshExperts.requestPublishConfirmation(actor, draft.expertId, draft.revision);
        const proof = await ctx.workdshExperts.confirmPublish(actor, confirmation.confirmationToken);
        await ctx.workdshExperts.publish(actor, draft.expertId, draft.revision, validation.dependencyLockDigest, proof, { operationId: 'web-team-publish' });
        stage = 'prepare-execution';
        const plan = await ctx.workdshExperts.prepareExecution(actor, draft.expertId, undefined, input.cwd, undefined, undefined, request.signal, input.workspaceId);
        stage = 'create-execution';
        const execution = await ctx.workdshExperts.createExecution(actor, plan.executionPlanId, { operationId: 'web-team-execution' });
        await ctx.sessionController.selectModel({ sessionId: execution.sessionId, provider: 'native-team-fixture', model: 'fixture' });
        const { agent } = await ctx.workdshSessionAccess.resolveAgent(execution.sessionId, request.signal);
        assert.ok(agent);
        agent.followup(createMessage({ role: 'user', source: { kind: 'user' }, content: blocks('WEB_SPAWN_ANALYST：用官方 Team 处理本次隔离验证。') }));
        stage = 'settle-lead';
        await settle(agent.id);
        const analyst = ctx.agentTeams.listMembers(agent).find(m => m.name === 'analyst');
        assert.ok(analyst, 'real model tool call created analyst'); stage = 'settle-analyst'; await settle(analyst.id);
        assert.ok((await history(agent.id)).events.some(e => e.type === 'tool/call' && e.data.name === 'spawn_teammate'));
        for (const name of ['reviewer']) {
          stage = `spawn-${name}`;
          const result = await ctx.agentTeams.spawnTeammate(agent, { name, description: name, prompt: blocks('Verify the supplied fixture.'), provider: 'spawn', context: 'fresh', signal: request.signal });
          stage = `settle-${name}`;
          await settle(result.member.id);
        }
        const draftTask = await ctx.agentTeams.createTask(agent, { subject: '核对测试数据', description: '实际官方任务', writeScopes: ['fixture/report.md'] });
        await ctx.agentTeams.createTask(agent, { subject: '复核测试结论', description: '依赖前一个任务', blockedBy: [draftTask.id] });
        value = { sessionId: agent.id, expertId: draft.expertId, view: teamView(agent), requests };
      } else if (input.action === 'view') {
        const { agent } = await ctx.workdshSessionAccess.resolveAgent(input.sessionId, request.signal);
        assert.ok(agent); value = teamView(agent);
      } else if (input.action === 'begin-long-task') {
        stage = 'resolve-resumed-team';
        const before = (await history(input.memberId)).events.filter(e => e.type === 'turn/end').length;
        const { agent } = await ctx.workdshSessionAccess.resolveAgent(input.sessionId, request.signal);
        assert.ok(agent);
        stage = 'assign-long-task';
        const created = await ctx.agentTeams.createTask(agent, { subject: '长任务与重连验收', description: '运行中刷新浏览器后，成员与任务归属必须保持可见。', writeScopes: ['fixture/long-report.md'] });
        const task = await ctx.agentTeams.updateTask(agent, { taskId: created.id, expectedRevision: created.revision, action: 'reassign', owner: input.memberName });
        stage = 'continue-resumed-member';
        const delivered = await ctx.agentTeams.sendMessage(agent, { target: input.memberName, content: blocks('WEB_HOLD_MEMBER：冷恢复后继续官方 Team 成员任务。'), signal: request.signal });
        assert.ok(['accepted', 'queued'].includes(delivered.status));
        value = { memberId: input.memberId, before, task };
      } else if (input.action === 'wait-member') {
        stage = 'wait-resumed-member';
        await waitFor(async () => (await history(input.memberId)).events.filter(e => e.type === 'turn/end').length > input.before);
        const latest = (await history(input.memberId)).events.filter(e => e.type === 'turn/end').at(-1);
        assert.equal(latest.data.reason.kind, 'completed');
        value = { memberId: input.memberId, completed: true };
      } else if (input.action === 'begin-interrupt') {
        stage = 'resolve-interrupt-team';
        const before = (await history(input.memberId)).events.filter(e => e.type === 'turn/end').length;
        const { agent } = await ctx.workdshSessionAccess.resolveAgent(input.sessionId, request.signal);
        assert.ok(agent);
        const member = ctx.agentTeams.listMembers(agent).find(row => row.id === input.memberId && row.name === input.memberName);
        assert.ok(member);
        stage = 'assign-interrupt-task';
        const created = await ctx.agentTeams.createTask(agent, { subject: '人工停止与恢复验收', description: '停止当前成员后保留任务，再由同一成员继续。', writeScopes: ['fixture/interrupted-report.md'] });
        const task = await ctx.agentTeams.updateTask(agent, { taskId: created.id, expectedRevision: created.revision, action: 'reassign', owner: input.memberName });
        stage = 'start-interruptible-member';
        const delivered = await ctx.agentTeams.sendMessage(agent, { target: input.memberName, content: blocks('WEB_HOLD_INTERRUPT：保持运行，等待人工停止。'), signal: request.signal });
        assert.ok(['accepted', 'queued'].includes(delivered.status));
        value = { memberId: input.memberId, before, task };
      } else if (input.action === 'interrupt-member') {
        stage = 'interrupt-live-member';
        const { agent } = await ctx.workdshSessionAccess.resolveAgent(input.sessionId, request.signal);
        assert.ok(agent);
        ctx.agentTeams.interrupt(agent, input.memberName);
        stage = 'wait-member-interruption';
        await waitFor(async () => (await history(input.memberId)).events.filter(e => e.type === 'turn/end').length > input.before);
        const latestEnd = (await history(input.memberId)).events.filter(e => e.type === 'turn/end').at(-1);
        assert.ok(['aborted', 'interrupted', 'cancelled'].includes(latestEnd.data.reason.kind));
        const task = ctx.agentTeams.getTask(agent, input.taskId);
        assert.equal(task.ownerName, input.memberName);
        assert.equal(task.status, 'in_progress');
        value = { memberId: input.memberId, reason: latestEnd.data.reason.kind, task };
      } else if (input.action === 'resume-interrupted') {
        stage = 'resume-interrupted-member';
        const before = (await history(input.memberId)).events.filter(e => e.type === 'turn/end').length;
        const { agent } = await ctx.workdshSessionAccess.resolveAgent(input.sessionId, request.signal);
        assert.ok(agent);
        const member = ctx.agentTeams.listMembers(agent).find(row => row.id === input.memberId && row.name === input.memberName);
        assert.ok(member);
        const delivered = await ctx.agentTeams.sendMessage(agent, { target: input.memberName, content: blocks('WEB_RESUME_AFTER_INTERRUPT：沿用原任务归属继续完成。'), signal: request.signal });
        assert.ok(['accepted', 'queued'].includes(delivered.status));
        value = { memberId: input.memberId, before };
      } else if (input.action === 'complete-task') {
        stage = 'complete-member-task';
        const { agent } = await ctx.workdshSessionAccess.resolveAgent(input.sessionId, request.signal);
        assert.ok(agent);
        const task = ctx.agentTeams.getTask(agent, input.taskId);
        assert.equal(task.ownerName, input.memberName, 'Lead may sign off only the expected member-owned task');
        value = await ctx.agentTeams.updateTask(agent, { taskId: task.id, expectedRevision: task.revision, action: 'complete' });
      } else if (input.action === 'begin-handoff') {
        stage = 'resolve-handoff-team';
        const { agent } = await ctx.workdshSessionAccess.resolveAgent(input.sessionId, request.signal);
        assert.ok(agent);
        const members = ctx.agentTeams.listMembers(agent);
        assert.ok(members.some(member => member.id === input.fromMemberId && member.name === input.fromMemberName));
        assert.ok(members.some(member => member.id === input.toMemberId && member.name === input.toMemberName));
        const before = (await history(input.toMemberId)).events.filter(e => e.type === 'turn/end').length;
        stage = 'assign-handoff-source';
        const created = await ctx.agentTeams.createTask(agent, { subject: '交接复核验收', description: '分析成员交给复核成员继续处理。', writeScopes: ['fixture/handoff-report.md'] });
        const sourceTask = await ctx.agentTeams.updateTask(agent, { taskId: created.id, expectedRevision: created.revision, action: 'reassign', owner: input.fromMemberName });
        stage = 'reassign-handoff-target';
        const task = await ctx.agentTeams.updateTask(agent, { taskId: sourceTask.id, expectedRevision: sourceTask.revision, action: 'reassign', owner: input.toMemberName });
        stage = 'deliver-handoff-summary';
        const delivered = await ctx.agentTeams.sendMessage(agent, { target: input.toMemberName, content: blocks(`WEB_HANDOFF：任务 ${task.id} 已由 ${input.fromMemberName} 交给 ${input.toMemberName}，请复核并继续。`), signal: request.signal });
        value = { before, delivery: delivered.status, task };
      } else if (input.action === 'begin-failure') {
        stage = 'resolve-failure-team';
        const { agent } = await ctx.workdshSessionAccess.resolveAgent(input.sessionId, request.signal);
        assert.ok(agent);
        const member = ctx.agentTeams.listMembers(agent).find(row => row.id === input.memberId && row.name === input.memberName);
        assert.ok(member);
        const before = (await history(input.memberId)).events.filter(e => e.type === 'turn/end').length;
        stage = 'assign-failure-task';
        const created = await ctx.agentTeams.createTask(agent, { subject: '失败恢复验收', description: '成员首次处理失败，重启后由同一成员恢复。', writeScopes: ['fixture/recovery-report.md'] });
        const task = await ctx.agentTeams.updateTask(agent, { taskId: created.id, expectedRevision: created.revision, action: 'reassign', owner: input.memberName });
        stage = 'inject-member-failure';
        const delivered = await ctx.agentTeams.sendMessage(agent, { target: input.memberName, content: blocks('WEB_FAIL_ONCE：本轮确定性失败，任务不得标记完成。'), signal: request.signal });
        assert.ok(['accepted', 'queued'].includes(delivered.status));
        value = { before, task };
      } else if (input.action === 'wait-failure') {
        stage = 'wait-member-failure';
        await waitFor(async () => (await history(input.memberId)).events.filter(e => e.type === 'turn/end').length > input.before);
        const latestEnd = (await history(input.memberId)).events.filter(e => e.type === 'turn/end').at(-1);
        assert.notEqual(latestEnd.data.reason.kind, 'completed');
        const { agent } = await ctx.workdshSessionAccess.resolveAgent(input.sessionId, request.signal);
        assert.ok(agent);
        value = { memberId: input.memberId, reason: latestEnd.data.reason.kind, view: teamView(agent) };
      } else if (input.action === 'recover-failure') {
        stage = 'resolve-failed-team-after-restart';
        const before = (await history(input.memberId)).events.filter(e => e.type === 'turn/end').length;
        const { agent } = await ctx.workdshSessionAccess.resolveAgent(input.sessionId, request.signal);
        assert.ok(agent);
        const member = ctx.agentTeams.listMembers(agent).find(row => row.id === input.memberId && row.name === input.memberName);
        assert.ok(member);
        stage = 'resume-failed-member';
        const delivered = await ctx.agentTeams.sendMessage(agent, { target: input.memberName, content: blocks('WEB_RECOVER_AFTER_FAILURE：沿用原任务归属继续完成。'), signal: request.signal });
        assert.ok(['accepted', 'queued'].includes(delivered.status));
        value = { memberId: input.memberId, before };
      } else if (input.action === 'begin-real-model') {
        stage = 'prepare-real-model-execution';
        const actor = await ctx.workdshIdentity.resolve({}, request.signal);
        const plan = await ctx.workdshExperts.prepareExecution(actor, input.expertId, undefined, input.cwd, undefined, undefined, request.signal, input.workspaceId);
        const execution = await ctx.workdshExperts.createExecution(actor, plan.executionPlanId, { operationId: 'web-team-real-execution' });
        await ctx.sessionController.selectModel({ sessionId: execution.sessionId, provider: 'deepseek-official', model: 'deepseek-flash' });
        stage = 'resolve-real-model-team';
        const { agent } = await ctx.workdshSessionAccess.resolveAgent(execution.sessionId, request.signal);
        assert.ok(agent);
        stage = 'spawn-real-model-members';
        for (const name of ['analyst', 'reviewer']) {
          const spawned = await ctx.agentTeams.spawnTeammate(agent, {
            name,
            description: name === 'analyst' ? '分析第一阶段材料' : '复核分析结论',
            prompt: blocks(`真实模型专家团验收准备。你是 ${name}，请只回复“${name} ready”，等待 lead 后续分工。`),
            provider: 'spawn', context: 'fresh', signal: request.signal,
          });
          await waitFor(async () => (await history(spawned.member.id)).events.some(event => event.type === 'turn/end'), 180000);
        }
        const members = ctx.agentTeams.listMembers(agent).filter(member => member.role === 'teammate');
        assert.deepEqual(members.map(member => member.name).sort(), ['analyst', 'reviewer']);
        const leadHistory = await history(agent.id);
        const memberTurnEnds = Object.fromEntries(await Promise.all(members.map(async member => [member.id, (await history(member.id)).events.filter(event => event.type === 'turn/end').length])));
        const prompt = `真实模型专家团验收。只使用现有 analyst 和 reviewer，不要创建新成员，不要读写文件。必须严格完成：
1. 用 team_task_create 创建标题为 REAL-ANALYZE 的任务；再创建标题为 REAL-REVIEW 的任务，后者依赖前者。
2. 用 team_task_update 把 REAL-ANALYZE 分配给 analyst，用 send_message 要求 analyst 回复一条简短分析结论，再用 wait_agent 或 list_agents 等待并观察完成。
3. analyst 回合结束后，由 lead 把 REAL-ANALYZE 标为完成。
4. 用 team_task_update 把 REAL-REVIEW 分配给 reviewer，用 send_message 把 analyst 的结论交给 reviewer，再用 wait_agent 或 list_agents 等待并观察完成。
5. reviewer 回合结束后，由 lead 把 REAL-REVIEW 标为完成。
6. 最后只总结任务和交接结果。不得省略任务、消息或官方状态观察工具。`;
        agent.followup(createMessage({ role: 'user', source: { kind: 'user' }, content: blocks(prompt) }));
        value = {
          sessionId: agent.id,
          beforeLeadTurnEnds: leadHistory.events.filter(event => event.type === 'turn/end').length,
          beforeLeadToolCalls: leadHistory.events.filter(event => event.type === 'tool/call').length,
          memberTurnEnds,
          memberIds: Object.fromEntries(members.map(member => [member.name, member.id])),
        };
      } else if (input.action === 'real-model-status') {
        stage = 'read-real-model-team';
        const { agent } = await ctx.workdshSessionAccess.resolveAgent(input.sessionId, request.signal);
        assert.ok(agent);
        const view = teamView(agent);
        const leadHistory = await history(agent.id);
        const members = ctx.agentTeams.listMembers(agent).filter(member => member.role === 'teammate');
        value = {
          view,
          leadTurnEnds: leadHistory.events.filter(event => event.type === 'turn/end').length,
          leadToolCalls: leadHistory.events.filter(event => event.type === 'tool/call').map(event => event.data.name),
          memberTurnEnds: Object.fromEntries(await Promise.all(members.map(async member => [member.id, (await history(member.id)).events.filter(event => event.type === 'turn/end').length]))),
        };
      } else throw Error('Unknown probe action');
      return Response.json({ ok: true, value });
    } catch (error) { return Response.json({ ok: false, stage, error: error.stack }); }
  } }));
}
