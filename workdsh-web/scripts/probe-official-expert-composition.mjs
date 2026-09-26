// U16-V1: official Team + per-Agent composition, without WorkDSH ExpertsManager.
// Deterministic model I/O; real Loader, AgentLoop, tools, skills and persistence.
// First run: node scripts/probe-official-expert-composition.mjs --prepare
// Cached: node scripts/probe-official-expert-composition.mjs
// Exit 0: scoped checks passed. Exit 2: recorded official API issue, not full pass.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile, symlink } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Context } from '@deepseek-ai/cordis';
import { LlmAdapter, createMessage } from '@deepseek-ai/dsh-llm';
import { COMPOSITION_FILE } from '@deepseek-ai/dsh-agent-presets';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = join(root, '.artifacts/dsh-0.1.6-upgrade/official-expert-composition');
await mkdir(artifacts, { recursive: true });
await mkdir(join(root, '.test-runtime'), { recursive: true });
const resumeHome = process.argv.includes('--resume') ? process.argv[process.argv.indexOf('--resume') + 1] : undefined;
const home = resumeHome ?? await mkdtemp(join(root, '.test-runtime/official-expert-'));
const version = '0.1.6-alpha.2';
process.env.DSH_HOME = join(home, 'dsh');
process.env.DSH_AGENTS_HOME = join(home, 'agents');
const requireRoot = createRequire(import.meta.url);
const requireDsh = createRequire(requireRoot.resolve('@deepseek-ai/dsh/package.json'));
const baseUrl = pathToFileURL(dirname(requireRoot.resolve('@deepseek-ai/dsh/package.json')) + '/').href;
const report = { version, home, mode: resumeHome ? 'cold-resume' : 'fresh', checks: [], packages: [], requests: [], initialization: [], observedIssues: [], notRun: ['production expert migration', 'immutable version publication', 'real model', 'file-system authorization', 'Web UI', 'SOP acceptance', 'composition plugin hot unload', 'full Web Profile fork query'] };
const pass = (name, evidence) => { report.checks.push({ name, status: 'passed', evidence }); console.log(`PASS ${name}`); };
const ctx = new Context();
const handles = [];
const signal = AbortSignal.timeout(90_000);
const concurrentPair = new Set();
const blocks = text => [{ type: 'text', text }];
const roles = {
  alpha: { marker: 'ROLE_ALPHA_V1', skill: 'alpha-method', resource: 'RESOURCE_ALPHA_V1' },
  beta: { marker: 'ROLE_BETA_V1', skill: 'beta-method', resource: 'RESOURCE_BETA_V1' },
  'beta-fork': { marker: 'ROLE_BETA_V1', skill: 'beta-method', resource: 'RESOURCE_BETA_V1' },
  'alpha-wait': { marker: 'ROLE_ALPHA_V1', skill: 'alpha-method', resource: 'RESOURCE_ALPHA_V1' },
};

async function archiveModule(name) {
  const archive = join(root, '.artifacts/expert-team-probe/packages', `${name.slice(1).replaceAll('/', '-')}-${version}.tgz`);
  if (process.argv.includes('--prepare') && !resumeHome) {
    await mkdir(dirname(archive), { recursive: true });
    const packed = spawnSync('npm', ['pack', `${name}@${version}`, '--ignore-scripts', '--json', '--pack-destination', dirname(archive)], { cwd: home, encoding: 'utf8', timeout: 60_000 });
    assert.equal(packed.status, 0, packed.stderr);
  }
  const bytes = await readFile(archive);
  const target = join(home, 'node_modules', name);
  if (!resumeHome) {
    await mkdir(target, { recursive: true });
    const unpack = spawnSync('tar', ['-xzf', archive, '--strip-components=1', '-C', target], { encoding: 'utf8' });
    assert.equal(unpack.status, 0, unpack.stderr);
  }
  const manifest = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'));
  assert.equal(manifest.version, version);
  if (!resumeHome) for (const dependency of Object.keys({ ...manifest.dependencies, ...manifest.peerDependencies })) {
    if (dependency === '@deepseek-ai/dsh-experimental-agent-team') continue;
    let dependencyRoot;
    for (const req of [requireDsh, requireRoot]) {
      try { dependencyRoot = dirname(req.resolve(`${dependency}/package.json`)); break; } catch { /* next public resolver */ }
    }
    assert.ok(dependencyRoot, `Unresolved published dependency ${dependency}`);
    const dep = JSON.parse(await readFile(join(dependencyRoot, 'package.json'), 'utf8'));
    if (dependency.startsWith('@deepseek-ai/dsh-')) assert.equal(dep.version, version);
    const link = join(target, 'node_modules', dependency);
    await mkdir(dirname(link), { recursive: true });
    await symlink(dependencyRoot, link, 'dir');
  }
  report.packages.push({ name, version, sha512: createHash('sha512').update(bytes).digest('hex') });
  return pathToFileURL(join(target, manifest.exports['.'].default)).href;
}

class FixtureModel extends LlmAdapter {
  async *stream(options) {
    const agent = ctx.agents.currentInitiator();
    const system = JSON.stringify(options.messages.filter(message => message.role === 'system'));
    const all = JSON.stringify(options.messages);
    const role = Object.values(roles).find(item => system.includes(item.marker));
    const explicitSkill = /REQUEST_SKILL=(alpha-method|beta-method)/.exec(all)?.[1];
    const skill = role?.skill ?? explicitSkill;
    const expected = role?.resource ?? (skill === 'alpha-method' ? 'RESOURCE_ALPHA_V1' : skill === 'beta-method' ? 'RESOURCE_BETA_V1' : undefined);
    report.requests.push({ agentId: agent?.id, system, role: role?.marker, expectedSkill: skill, availableSkills: agent ? await skillNames(agent) : [], loadedResource: expected ? all.includes(expected) : false });
    assert.ok(report.requests.length <= 60, 'bounded fixture model');
    const member = agent && ctx.agentTeams.tryMembership(agent);
    if (!resumeHome && member?.root.id === 'scoped-lead' && ['alpha', 'beta'].includes(member.name) && !concurrentPair.has(agent.id)) {
      // Hold fixture model responses until both real native child loops entered.
      concurrentPair.add(agent.id);
      if (concurrentPair.size === 2) {
        report.parallelRunning = [...concurrentPair].filter(id => ctx.agents.get(id)?.status === 'running').length;
        report.teamViewAtFirstRequests = ctx.agentTeams.listMembers(member.root).map(row => ({ name: row.name, status: row.status }));
      }
      await waitFor(() => concurrentPair.size === 2, 'two concurrent native model requests');
    }
    if (all.includes('WAIT_FOR_INTERRUPT')) {
      await new Promise(resolveWait => {
        if (options.signal.aborted) resolveWait();
        else options.signal.addEventListener('abort', resolveWait, { once: true });
      });
      return;
    }
    const block = skill && expected && !all.includes(expected)
      ? { type: 'tool-call', id: `skill-${report.requests.length}`, name: 'skill', arguments: JSON.stringify({ name: skill }) }
      : { type: 'text', text: `${role?.marker ?? 'DEFAULT_ROLE'} completed.` };
    yield { type: 'block-start', index: 0, blockType: block.type };
    yield { type: 'block-end', index: 0, block };
    yield { type: 'finish', reason: { kind: block.type === 'tool-call' ? 'tool-calls' : 'stop' } };
  }
}

async function load(name, config) { return ctx.loader.create({ name, ...(config ? { config } : {}) }); }
async function waitFor(check, label) {
  const timeout = AbortSignal.timeout(10_000);
  while (!await check()) {
    timeout.throwIfAborted();
    await new Promise(resolveWait => setTimeout(resolveWait, 20));
  }
  assert.ok(await check(), label);
}
async function readHistory(id) {
  try { return await ctx.sessionQuery.readSession(id); }
  catch (error) {
    if (error.message !== 'seeded session constructor seed must equal its inherited prefix') throw error;
    if (!report.observedIssues.some(issue => issue.sessionId === id)) {
      report.observedIssues.push({ sessionId: id, operation: 'sessionQuery.readSession', error: error.message, fallback: 'public sessionPersistence.open/read', resolved: false });
      console.log(`ISSUE fork history query: ${error.message}`);
    }
    const handle = await ctx.sessionPersistence.open(id, 'read');
    try { return await handle.read(); } finally { await handle.close(); }
  }
}
async function settled(id, reason = 'completed') {
  await waitFor(() => report.requests.some(request => request.agentId === id), `model started for ${id}`);
  const live = ctx.agents.get(id);
  if (live) await live.whenIdle();
  // The official continuation owner may deactivate an idle child immediately.
  // Settlement comes from its durable log, not a retained live Agent handle.
  await waitFor(async () => {
    const snapshot = await readHistory(id);
    return snapshot.events.some(event => event.type === 'turn/end');
  }, `turn ended for ${id}`);
  const snapshot = await readHistory(id);
  assert.equal(snapshot.events.filter(event => event.type === 'turn/end').at(-1)?.data.reason.kind, reason);
}
async function createLead(id) {
  const handle = await ctx.agents.create({ sessionId: id, agentOptions: { provider: 'fixture', model: 'fixture', cwd: home },
    meta: { cwd: home, agentPreset: 'standard' }, setup: agentCtx => ctx.agentPresets.mount(agentCtx, 'standard').then(() => undefined) });
  handles.push(handle);
  return handle.agent;
}
async function skillNames(agent) { return (await ctx.skills.list({ cwd: home, scope: agent })).map(skill => skill.name); }

try {
  const teamModule = await archiveModule('@deepseek-ai/dsh-experimental-agent-team');
  const toolModule = await archiveModule('@deepseek-ai/dsh-experimental-tool-agent-team');
  const Persona = await import(pathToFileURL(requireDsh.resolve('@deepseek-ai/dsh-persona')).href);
  const SkillFiles = await import(pathToFileURL(requireDsh.resolve('@deepseek-ai/dsh-skill-filesystem')).href);
  const { default: Loader } = await import(pathToFileURL(requireDsh.resolve('@deepseek-ai/cordis-plugin-loader')).href);
  await ctx.plugin(Loader, { baseUrl });
  for (const name of ['dsh-session', 'dsh-session-projection', 'dsh-system-prompt', 'dsh-tools', 'dsh-llm', 'dsh-agent', 'dsh-agent-loop', 'dsh-subagent', 'dsh-invariants']) await load(`@deepseek-ai/${name}`);
  await load('@deepseek-ai/dsh-session-persistence-jsonl', { root: join(home, 'sessions'), compression: 'none' });
  await load('@deepseek-ai/dsh-session-query-sqlite', { path: join(home, 'session-search.sqlite'), openAt: 'never' });
  await load('@deepseek-ai/dsh-subagent-spawn-in-process', { providerName: 'spawn' });
  await load('@deepseek-ai/dsh-subagent-fork-in-process', { providerName: 'fork' });
  await load('@deepseek-ai/dsh-skill');
  ctx.llm.registerAdapter(['fixture'], new FixtureModel());
  await load(teamModule, { maxMembers: 16, disposalTimeoutMs: 4000 });
  await load(toolModule);
  const presetRoot = join(home, 'presets');
  if (!resumeHome) {
    await mkdir(join(presetRoot, 'standard'), { recursive: true });
    await writeFile(join(presetRoot, 'standard', COMPOSITION_FILE), '- name: "@deepseek-ai/dsh-persona"\n  config:\n    prefix: "ROLE_LEAD_V1"\n- name: "@deepseek-ai/dsh-tool-skill"\n');
    for (const [name, role] of Object.entries(roles)) {
      const dir = join(home, 'pinned-roles', name, role.skill);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, 'SKILL.md'), `---\nname: ${role.skill}\ndescription: ${name} fixture method\n---\n${role.resource}\n`);
    }
  }
  await load('@deepseek-ai/dsh-agent-presets', { default: 'standard', roots: [{ path: presetRoot, trust: 'user' }], includeShippedRoot: false, includeUserRoot: false });

  // Composition-only extension: no child creation, message pumping or ownership.
  const composition = ctx.plugin({ name: 'fixture-member-composition', inject: ['agentTeams', 'agents', 'loader', 'skills', 'systemPrompt'], apply(scope) {
    scope.on('agent/created', async ({ agent, source, signal: initializationSignal }) => {
      const member = scope.agentTeams.tryMembership(agent);
      report.initialization.push({ id: agent.id, source, member: member && { root: member.root.id, name: member.name, role: member.role } });
      if (member?.role !== 'teammate' || member.root.id !== 'scoped-lead') return;
      const role = roles[member.name];
      assert.ok(role, 'unconfigured fixture member rejected before first request');
      initializationSignal?.throwIfAborted();
      await agent.ctx.plugin(Persona, { prefix: role.marker });
      await agent.ctx.plugin(SkillFiles, { includeDefaultRoots: false, watch: false, customSkillDirs: [join(home, 'pinned-roles', member.name)] });
      initializationSignal?.throwIfAborted();
    });
  } });
  await composition;

  if (resumeHome) {
    const ids = JSON.parse(await readFile(join(home, 'members.json'), 'utf8'));
    const resumed = await ctx.agents.resume({ resumeSessionId: 'scoped-lead', agentOptions: { provider: 'fixture', model: 'fixture', cwd: home },
      setup: agentCtx => ctx.agentPresets.mount(agentCtx, 'standard').then(() => undefined) });
    handles.push(resumed);
    const before = ctx.agentTeams.listMembers(resumed.agent);
    assert.ok(before.some(member => member.name === 'alpha' && member.status === 'inactive'));
    for (const name of ['alpha', 'beta-fork']) {
      await ctx.agentTeams.sendMessage(resumed.agent, { target: name, content: blocks('Continue using your method.'), signal });
      await settled(ids[name]);
      const requests = report.requests.filter(request => request.agentId === ids[name]);
      assert.ok(requests.length > 0 && requests.every(request => request.role === roles[name].marker));
      assert.ok(requests.every(request => JSON.stringify(request.availableSkills) === JSON.stringify([roles[name].skill])));
      pass(`separate-process-native-message-resumes-${name}-role-and-skills`, { childId: ids[name], requests: requests.length });
    }
  } else {
    const plain = await createLead('plain-lead');
    const defaults = await Promise.all(['writer', 'reviewer'].map(name => ctx.agentTeams.spawnTeammate(plain, { name, description: name, prompt: blocks(`Act as ${name}. Finish this fixture.`), context: 'fresh', provider: 'spawn', signal })));
    for (const result of defaults) await settled(result.member.id);
    assert.equal(new Set(defaults.map(result => result.member.id)).size, 2);
    pass('default-official-team-runs-without-workdsh-binding', { children: defaults.map(result => result.member.id) });
    await plain.whenIdle();
    const plainFork = await ctx.agentTeams.spawnTeammate(plain, { name: 'plain-fork', description: 'No custom role composition', prompt: blocks('Finish this fixture.'), context: 'fork', provider: 'fork', signal });
    await settled(plainFork.member.id);
    pass('default-fork-runs-without-custom-composition', { childId: plainFork.member.id, queryIssueReproduced: report.observedIssues.some(issue => issue.sessionId === plainFork.member.id) });

    const lead = await createLead('scoped-lead');
    lead.followup(createMessage({ role: 'user', source: { kind: 'user' }, content: blocks('Establish a completed lead turn for the fork test.') }));
    await settled(lead.id);
    const members = await Promise.all(['alpha', 'beta'].map(name => ctx.agentTeams.spawnTeammate(lead, { name, description: name, prompt: blocks('Load your own method and finish.'), context: 'fresh', provider: 'spawn', signal })));
    const ids = Object.fromEntries(members.map(result => [result.member.name, result.member.id]));
    for (const name of ['alpha', 'beta']) {
      await settled(ids[name]);
      const requests = report.requests.filter(request => request.agentId === ids[name]);
      assert.ok(requests.length >= 2 && requests.every(request => request.role === roles[name].marker), `${name} role on first request`);
      assert.ok(requests.some(request => request.loadedResource), `${name} real skill loaded`);
      assert.ok(requests.every(request => JSON.stringify(request.availableSkills) === JSON.stringify([roles[name].skill])));
    }
    assert.deepEqual(await skillNames(lead), []);
    assert.equal(report.parallelRunning, 2);
    pass('parallel-native-teammates-have-distinct-scoped-personas-and-skills', { ...ids, parallelRunning: report.parallelRunning });

    const fork = await ctx.agentTeams.spawnTeammate(lead, { name: 'beta-fork', description: 'fork role', prompt: blocks('Load your own method and finish.'), context: 'fork', provider: 'fork', signal });
    ids['beta-fork'] = fork.member.id;
    await settled(fork.member.id);
    assert.ok(JSON.stringify((await readHistory(fork.member.id)).events).includes('Establish a completed lead turn for the fork test.'));
    assert.ok(report.requests.filter(request => request.agentId === fork.member.id).every(request => request.role === roles.beta.marker));
    assert.ok(report.requests.filter(request => request.agentId === fork.member.id).every(request => JSON.stringify(request.availableSkills) === '["beta-method"]'));
    pass('fork-inherits-history-and-overrides-current-persona', { childId: fork.member.id });

    const requestsBefore = report.requests.length;
    await assert.rejects(ctx.agentTeams.spawnTeammate(lead, { name: 'unconfigured', description: 'negative', prompt: blocks('Must not reach the model.'), context: 'fresh', provider: 'spawn', signal }));
    assert.equal(report.requests.length, requestsBefore);
    assert.equal(ctx.agentTeams.listMembers(lead).find(member => member.name === 'unconfigured')?.status, 'failed');
    pass('initialization-failure-rejects-before-model-request', { requestsBefore, requestsAfter: report.requests.length });

    const waiting = await ctx.agentTeams.spawnTeammate(lead, { name: 'alpha-wait', description: 'Cancellation fixture', prompt: blocks('WAIT_FOR_INTERRUPT'), context: 'fresh', provider: 'spawn', signal });
    await waitFor(() => report.requests.some(request => request.agentId === waiting.member.id), 'waiting teammate is running');
    ctx.agentTeams.interrupt(lead, 'alpha-wait');
    await settled(waiting.member.id, 'aborted');
    pass('official-team-interrupt-stops-scoped-member', { childId: waiting.member.id });

    await writeFile(join(home, 'members.json'), JSON.stringify(ids));
    await writeFile(join(home, 'requests.json'), JSON.stringify(report.requests, null, 2));
    pass('native-team-view-and-persistence-available', { members: ctx.agentTeams.remoteView(lead).members.length });
  }
} catch (error) {
  report.error = { message: error.message, stack: error.stack };
  process.exitCode = 1;
  console.error(error);
} finally {
  try {
    try {
      for (const handle of handles.reverse()) await handle.dispose();
      report.beforeRuntimeDispose = ctx.agents.list().map(agent => ({ id: agent.id, status: agent.status }));
      assert.deepEqual((await ctx.skills.list({ cwd: home })).map(skill => skill.name), []);
    } finally { await ctx.fiber.dispose(); }
    pass('runtime-disposes', { pendingUntilOfficialOwnerDisposes: report.beforeRuntimeDispose });
  } catch (error) { report.cleanupError = error.message; process.exitCode = 1; }
  if (!resumeHome && !process.exitCode) {
    const resumed = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--resume', home], { cwd: root, encoding: 'utf8', timeout: 30_000 });
    await writeFile(join(artifacts, 'cold-resume.log'), resumed.stdout + resumed.stderr);
    if (resumed.status !== 0 && resumed.status !== 2) { report.coldResumeError = { status: resumed.status, error: resumed.error?.message }; process.exitCode = 1; }
    else {
      const cold = JSON.parse(await readFile(join(artifacts, 'cold-result.json'), 'utf8'));
      report.observedIssues.push(...cold.observedIssues.map(issue => ({ ...issue, process: 'cold-resume' })));
      pass('separate-process-cold-resume-probe', { exitCode: resumed.status, checks: cold.checks.map(check => check.name) });
    }
  }
  report.outcome = process.exitCode ? 'failed' : report.observedIssues.length ? 'partial' : 'passed';
  if (report.outcome === 'partial') process.exitCode = 2;
  await writeFile(join(artifacts, resumeHome ? 'cold-result.json' : 'result.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`RESULT ${report.outcome}; ${artifacts}`);
}
