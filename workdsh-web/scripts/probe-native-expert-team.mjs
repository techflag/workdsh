// Production role adapter + real official Team/Loader/AgentLoop/persistence.
// Only model I/O and the trusted local identity/Session ingress are fixtures.
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { Context } from '@deepseek-ai/cordis';
import { LlmAdapter, createMessage } from '@deepseek-ai/dsh-llm';
import { COMPOSITION_FILE } from '@deepseek-ai/dsh-agent-presets';
import { ExpertsManager } from '../packages/plugins/experts/dist/index.js';
import { registerExpertExecutionGuard } from '../packages/plugins/experts/dist/runtime/execution-guard.js';
import { registerExpertManagementTools } from '../packages/plugins/experts/dist/tools/management-tools.js';
import { AccessManager } from '../packages/plugins/access/dist/index.js';
import { AuditJournal } from '../packages/plugins/audit/dist/index.js';
import { SkillManager } from '../packages/plugins/skills/dist/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = join(root, '.artifacts/dsh-0.1.6-upgrade/native-expert-team');
await mkdir(artifacts, { recursive: true });
await mkdir(join(root, '.test-runtime'), { recursive: true });
const cold = process.argv.includes('--resume');
const home = cold ? process.argv.at(-1) : await mkdtemp(join(root, '.test-runtime/native-expert-team-'));
process.env.DSH_HOME = join(home, 'dsh');
process.env.DSH_AGENTS_HOME = join(home, 'agents');
const requireRoot = createRequire(import.meta.url);
const requireDsh = createRequire(requireRoot.resolve('@deepseek-ai/dsh/package.json'));
const requireExperts = createRequire(join(root, 'packages/plugins/experts/package.json'));
const baseUrl = pathToFileURL(dirname(requireRoot.resolve('@deepseek-ai/dsh/package.json')) + '/').href;
const ctx = new Context();
const actor = { principalId: 'probe-owner', organizationId: 'probe-org', resolvedBy: 'probe-identity', requestId: 'probe' };
const report = { home, version: '0.1.6-alpha.2', mode: cold ? 'cold-resume' : 'production-adapter', checks: [], requests: [], notRun: ['real paid model', 'professional content acceptance', 'user preview deployment'] };
const pass = (name, detail) => { report.checks.push({ name, detail }); console.log(`PASS ${name}`); };
const blocks = text => [{ type: 'text', text }];
const handles = [];
const observed = new Map();
const concurrent = new Set();
let leadId;
const roleNames = ['alpha', 'beta', 'reviewer', 'waiter', 'writer'];
ctx.on('agent/created', ({ agent }) => { observed.set(agent.id, agent); });
const signal = AbortSignal.timeout(120_000);
async function waitFor(fn) {
  const timeout = AbortSignal.timeout(15000);
  while (!await fn()) { timeout.throwIfAborted(); await new Promise(r => setTimeout(r, 20)); }
}
async function history(id) { const h = await ctx.sessionPersistence.open(id, 'read'); try { return await h.read(); } finally { await h.close(); } }
async function settled(id, before = 0) {
  await waitFor(async () => (await history(id)).events.filter(e => e.type === 'turn/end').length > before);
  const end = (await history(id)).events.filter(e => e.type === 'turn/end').at(-1);
  assert.equal(end.data.reason.kind, 'completed', JSON.stringify(end));
}
class Model extends LlmAdapter {
  async *stream(options) {
    const agent = ctx.agents.currentInitiator();
    const member = ctx.agentTeams.tryMembership(agent);
    const system = JSON.stringify(options.messages.filter(m => m.role === 'system'));
    const all = JSON.stringify(options.messages);
    report.requests.push({ id: agent.id, name: member?.name, system, schemas: options.tools?.map(t => t.name) });
    assert.ok(report.requests.length < 70);
    if (member?.role === 'teammate') {
      assert.ok(system.includes(`ROLE_${member.name.toUpperCase()}`), `Wrong role for ${member.name}: ${system}`);
      assert.ok(!system.includes('ROLE_LEAD'), 'child inherited Lead persona');
      if (!cold && ['alpha', 'beta'].includes(member.name) && !concurrent.has(agent.id)) {
        concurrent.add(agent.id);
        if (concurrent.size === 2) report.concurrentRunning = [...concurrent].filter(id => ctx.agents.get(id)?.status === 'running').length;
        await waitFor(() => concurrent.size === 2);
      }
      if (all.includes('INTERRUPT_FIXTURE')) {
        await new Promise(r => { if (options.signal.aborted) r(); else options.signal.addEventListener('abort', r, { once: true }); }); return;
      }
    }
    let block;
    if (member?.role === 'lead' && all.includes('MODEL_SPAWN_WRITER') && !all.includes('"name":"spawn_teammate"')) {
      block = { type: 'tool-call', id: `spawn-${report.requests.length}`, name: 'spawn_teammate', arguments: JSON.stringify({ name: 'writer', description: 'Fixture writer', prompt: 'Load your own method.', context: 'fresh' }) };
    } else if (member?.role === 'teammate' && !all.includes(`METHOD_${member.name.toUpperCase()}`)) {
      block = { type: 'tool-call', id: `skill-${report.requests.length}`, name: 'skill', arguments: JSON.stringify({ name: `method-${member.name}` }) };
    } else block = { type: 'text', text: 'Fixture done.' };
    yield { type: 'block-start', index: 0, blockType: block.type };
    yield { type: 'block-end', index: 0, block };
    yield { type: 'finish', reason: { kind: block.type === 'tool-call' ? 'tool-calls' : 'stop' } };
  }
}
async function load(name, config) {
  let entry;
  for (const req of [requireExperts, requireDsh, requireRoot]) { try { entry = pathToFileURL(req.resolve(name)).href; break; } catch {} }
  assert.ok(entry, name);
  return ctx.loader.create({ name: entry, ...(config ? { config } : {}) });
}
async function rootAgent(id, preset = 'standard') {
  const handle = await ctx.agents.create({ sessionId: id, agentOptions: { provider: 'fixture', model: 'fixture', cwd: home },
    meta: { cwd: home, agentPreset: preset }, setup: scope => ctx.agentPresets.mount(scope, preset).then(() => undefined) });
  handles.push(handle); return handle.agent;
}
const definition = name => ({ name, description: `${name} fixture expert.`, role: `ROLE_${name.toUpperCase()}`, methodology: 'Load your method and inspect real inputs.', boundaries: 'Fixture workspace only.', deliverables: 'A verified fixture answer.', tags: [], examples: [{ id: 'one', prompt: 'Run fixture.' }], skillRequirements: name === 'lead' ? [] : [{ name: `method-${name}` }], futureRequirements: [] });
try {
  const { default: Loader } = await import(pathToFileURL(requireDsh.resolve('@deepseek-ai/cordis-plugin-loader')).href);
  await ctx.plugin(Loader, { baseUrl });
  for (const name of ['dsh-session', 'dsh-session-projection', 'dsh-system-prompt', 'dsh-tools', 'dsh-llm', 'dsh-agent', 'dsh-agent-loop', 'dsh-subagent', 'dsh-invariants']) await load(`@deepseek-ai/${name}`);
  await load('@deepseek-ai/dsh-session-persistence-jsonl', { root: join(home, 'sessions'), compression: 'none' });
  await load('@deepseek-ai/dsh-session-query-sqlite', { path: join(home, 'session-query.sqlite'), openAt: 'never' });
  await load('@deepseek-ai/dsh-subagent-spawn-in-process', { providerName: 'spawn' });
  await load('@deepseek-ai/dsh-subagent-fork-in-process', { providerName: 'fork' });
  await load('@deepseek-ai/dsh-experimental-agent-team', { maxMembers: 16, disposalTimeoutMs: 4000 });
  await load('@deepseek-ai/dsh-experimental-tool-agent-team');
  ctx.llm.registerAdapter(['fixture'], new Model());
  const presetRoot = join(home, 'presets');
  if (!cold) {
    await mkdir(join(presetRoot, 'standard'), { recursive: true });
    await writeFile(join(presetRoot, 'standard', COMPOSITION_FILE), '- name: "@deepseek-ai/dsh-persona"\n  config:\n    prefix: BASE\n- name: "@deepseek-ai/dsh-skill-filesystem"\n  config:\n    includeDefaultRoots: false\n    watch: false\n- name: "@deepseek-ai/dsh-tool-skill"\n');
    for (const name of roleNames) {
      const dir = join(process.env.DSH_AGENTS_HOME, 'skills', `method-${name}`);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, 'SKILL.md'), `---\nname: method-${name}\ndescription: Fixture ${name} method\n---\nMETHOD_${name.toUpperCase()}\n`);
    }
  }
  for (const [name, config] of [['dsh-storage'], ['dsh-storage-json', { root: join(home, 'storage') }], ['dsh-storage-domain', { backend: 'json' }], ['dsh-skill'], ['dsh-skill-filesystem', { watch: false }], ['dsh-agent-presets', { default: 'standard', roots: [{ path: presetRoot, trust: 'user' }], includeShippedRoot: false, includeUserRoot: false }]]) await load(`@deepseek-ai/${name}`, config);
  ctx.provide('workdshIdentity', { id: actor.resolvedBy, async resolve() { return actor; }, membership(org, principal) { return org === actor.organizationId && principal === actor.principalId ? { organizationId: org, principalId: principal, principalKind: 'human', role: 'owner', state: 'active', revision: 'fixture-v1' } : undefined; } });
  for (const plugin of [AuditJournal, AccessManager]) await ctx.plugin(plugin);
  await ctx.plugin({ name: 'fixture-skills-host', inject: ['skills'], apply(scope) { new SkillManager(scope); } });
  ctx.provide('sessionController', { async inspect(id) { return { sessionId: id }; } });
  ctx.provide('workdshSessionAccess', { async create(request) { await rootAgent(request.sessionId, request.agentPreset); return { sessionId: request.sessionId }; } });
  await ctx.plugin(ExpertsManager);
  const composition = ctx.plugin({ name: 'production-expert-adapter', inject: ['workdshExperts', 'workdshIdentity', 'tools', 'agentTeams', 'agentPresets', 'agents', 'skills', 'systemPrompt', 'workdshSkills'], apply(scope) { registerExpertExecutionGuard(scope); registerExpertManagementTools(scope); } });
  await composition;
  let lead, preset, expertId;
  if (cold) {
    const saved = JSON.parse(await readFile(join(home, 'resume.json'), 'utf8'));
    ({ leadId, preset, expertId } = saved);
    const resumed = await ctx.agents.resume({ resumeSessionId: leadId, agentOptions: { provider: 'fixture', model: 'fixture', cwd: home }, setup: scope => ctx.agentPresets.mount(scope, preset).then(() => undefined) });
    handles.push(resumed); lead = resumed.agent;
    for (const name of ['alpha', 'reviewer']) {
      const member = ctx.agentTeams.listMembers(lead).find(m => m.name === name);
      assert.equal(member.id, saved.ids[name]);
      const before = (await history(member.id)).events.filter(e => e.type === 'turn/end').length;
      await ctx.agentTeams.sendMessage(lead, { target: name, content: blocks('Continue with your pinned method.'), signal });
      await settled(member.id, before);
    }
    pass('cold-resume-keeps-native-member-ids-and-fresh-fork-roles', saved.ids);
  } else {
    const draft = await ctx.workdshExperts.createDraft(actor, { ...definition('lead'), team: { members: roleNames.map(key => ({ key, definition: definition(key) })), workflows: [{ id: 'review', title: 'Review fixture', trigger: 'Review', deliverable: 'Checked report', stages: [{ id: 'draft', worker: 'alpha', reviewer: 'reviewer', dependsOn: [] }] }] } }, { operationId: 'team-create' });
    expertId = draft.expertId;
    const validation = await ctx.workdshExperts.validate(actor, expertId, draft.revision);
    assert.equal(validation.publishable, true, JSON.stringify(validation.issues));
    const confirmation = await ctx.workdshExperts.requestPublishConfirmation(actor, expertId, draft.revision);
    const proof = await ctx.workdshExperts.confirmPublish(actor, confirmation.confirmationToken);
    const published = await ctx.workdshExperts.publish(actor, expertId, draft.revision, validation.dependencyLockDigest, proof, { operationId: 'team-publish' });
    preset = published.presetRevisionRef;
    const plan = await ctx.workdshExperts.prepareExecution(actor, expertId, undefined, home);
    const created = await ctx.workdshExperts.createExecution(actor, plan.executionPlanId, { operationId: 'team-start' });
    leadId = created.sessionId; lead = ctx.agents.get(leadId);
    lead.followup(createMessage({ role: 'user', source: { kind: 'user' }, content: blocks('Prepare this team fixture.') }));
    await settled(leadId);
    const schemas = report.requests.find(r => r.id === leadId).schemas;
    for (const name of ['spawn_teammate', 'send_message', 'list_agents', 'wait_agent', 'interrupt_agent', 'team_task_create', 'team_task_list', 'team_task_get', 'team_task_update']) assert.ok(schemas.includes(name), name);
    assert.ok(!schemas.some(name => name.startsWith('workdsh_expert_team') || ['subagent', 'subagent_fork'].includes(name)));
    assert.equal(ctx.subagents.getProvider('workdsh-expert'), undefined);
    assert.ok(schemas.includes('workdsh_expert_list'), 'production management plugin activated');
    pass('published-team-native-tools-only-and-no-legacy-provider', { preset, schemas });
    const pair = await Promise.all(['alpha', 'beta'].map(name => ctx.agentTeams.spawnTeammate(lead, { name, description: name, prompt: blocks('Load your own method.'), context: 'fresh', provider: 'spawn', signal })));
    for (const result of pair) await settled(result.member.id);
    assert.equal(report.concurrentRunning, 2);
    assert.ok(report.requests.filter(r => ['alpha', 'beta'].includes(r.name)).every(r => !r.system.includes('ROLE_LEAD')));
    pass('two-real-concurrent-members-with-their-own-published-roles-and-skills', pair.map(r => r.member.id));
    const fork = await ctx.agentTeams.spawnTeammate(lead, { name: 'reviewer', description: 'Review', prompt: blocks('Load your own method.'), context: 'fork', provider: 'fork', signal });
    await settled(fork.member.id);
    pass('fork-member-overrides-lead-persona', fork.member.id);
    await assert.rejects(ctx.agentTeams.spawnTeammate(lead, { name: 'unknown', description: 'negative', prompt: blocks('Must not run'), context: 'fresh', provider: 'spawn', signal }));
    assert.ok(!report.requests.some(request => request.name === 'unknown'), 'unknown member must never reach the model');
    await assert.rejects(ctx.workdshExperts.resolveNativeRole({ ...actor, principalId: 'other' }, leadId, 'alpha'), e => e.code === 'experts/forbidden');
    await assert.rejects(ctx.workdshExperts.resolveNativeRole({ ...actor, organizationId: 'other-org' }, leadId, 'alpha'), e => e.code === 'experts/forbidden');
    pass('unknown-member-and-cross-owner-cross-org-denied-before-model');
    const first = await ctx.agentTeams.createTask(lead, { subject: 'Draft', description: 'Prepare draft' });
    const next = await ctx.agentTeams.createTask(lead, { subject: 'Review', description: 'Review draft', blockedBy: [first.id] });
    await assert.rejects(ctx.agentTeams.updateTask(lead, { taskId: next.id, expectedRevision: next.revision, action: 'claim' }));
    const claim = await ctx.agentTeams.updateTask(lead, { taskId: first.id, expectedRevision: first.revision, action: 'claim' });
    await ctx.agentTeams.updateTask(lead, { taskId: first.id, expectedRevision: claim.revision, action: 'complete' });
    await assert.rejects(ctx.agentTeams.updateTask(lead, { taskId: first.id, expectedRevision: first.revision, action: 'reopen' }));
    assert.equal(ctx.agentTeams.getTask(lead, next.id).ready, true);
    pass('official-task-dependencies-and-revision-conflict');
    lead.followup(createMessage({ role: 'user', source: { kind: 'user' }, content: blocks('MODEL_SPAWN_WRITER: create the writer teammate now.') }));
    await waitFor(() => ctx.agentTeams.listMembers(lead).some(m => m.name === 'writer'));
    const writer = ctx.agentTeams.listMembers(lead).find(m => m.name === 'writer');
    assert.ok(writer);
    await waitFor(() => report.requests.some(request => request.id === writer.id));
    await settled(writer.id);
    assert.ok((await history(leadId)).events.some(e => e.type === 'tool/call' && e.data.name === 'spawn_teammate'));
    pass('real-model-loop-dispatches-official-spawn-teammate', writer.id);
    const waiting = await ctx.agentTeams.spawnTeammate(lead, { name: 'waiter', description: 'Cancel fixture', prompt: blocks('INTERRUPT_FIXTURE'), context: 'fresh', provider: 'spawn', signal });
    await waitFor(() => report.requests.some(r => r.id === waiting.member.id));
    ctx.agentTeams.interrupt(lead, 'waiter');
    await waitFor(async () => (await history(waiting.member.id)).events.some(e => e.type === 'turn/end'));
    assert.equal((await history(waiting.member.id)).events.filter(e => e.type === 'turn/end').at(-1).data.reason.kind, 'aborted');
    pass('official-interrupt-preserves-member');
    const ids = Object.fromEntries(ctx.agentTeams.listMembers(lead).map(m => [m.name, m.id]));
    await writeFile(join(home, 'resume.json'), JSON.stringify({ leadId, preset, expertId, ids }));
  }
  await ctx.fiber.dispose();
  pass('runtime-disposed');
  if (!cold) {
    const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--resume', home], { cwd: root, env: process.env, encoding: 'utf8', timeout: 60000 });
    await writeFile(join(artifacts, 'cold.log'), child.stdout + child.stderr);
    assert.equal(child.status, 0, child.stdout + child.stderr);
    pass('new-process-cold-resume-passed');
  }
  report.status = 'passed';
} catch (error) { report.status = 'failed'; report.error = error.stack; console.error(error); process.exitCode = 1; }
finally {
  await ctx.fiber.dispose();
  await writeFile(join(artifacts, cold ? 'cold-result.json' : 'result.json'), JSON.stringify(report, null, 2));
}
