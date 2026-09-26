import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile, realpath, copyFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { chromium, expect } from '@playwright/test';

const root = fileURLToPath(new URL('..', import.meta.url));
const rootManifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const dshVersion = rootManifest.pnpm.overrides['@deepseek-ai/dsh-base'];
const realModel = process.argv.includes('--real-model');
const artifacts = join(root, '.artifacts/dsh-0.1.6-upgrade/native-team-web');
const home = await realpath(await mkdtemp(join(tmpdir(), 'workdsh-native-team-web-')));
const cwd = join(home, 'workspace'), workspaceId = randomUUID();
await mkdir(artifacts, { recursive: true }); await mkdir(cwd); await mkdir(join(home, 'storages'));
for (const name of ['analyst', 'reviewer']) {
  const directory = join(home, 'agents/skills', `method-${name}`); await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'SKILL.md'), `---\nname: method-${name}\ndescription: Isolated ${name} method\n---\nMETHOD_${name.toUpperCase()}\n`);
}
const now = new Date().toISOString();
await writeFile(join(home, 'storages/workspace.json'), JSON.stringify({ unit: { name: 'workspace', version: 2 }, global: { initialized: true, workspaceIds: [workspaceId], archivedSessionIds: [] }, tables: { workspaces: { [workspaceId]: { path: cwd, title: 'Native Team verification', sessionIds: [], createdAt: now, updatedAt: now } } } }));
const env = { ...process.env, DSH_HOME: home, DSH_AGENTS_HOME: join(home, 'agents'), PATH: `${join(root, 'node_modules/.bin')}:${dirname(process.execPath)}:${process.env.PATH}` };
const dsh = join(root, 'node_modules/@deepseek-ai/dsh/lib/bin.js'), pnpm = join(root, 'node_modules/pnpm/bin/pnpm.cjs');
const exec = promisify(execFile);
const command = async (bin, args, workdir = home) => (await exec(process.execPath, [bin, ...args], { cwd: workdir, env, timeout: 90000, maxBuffer: 8 * 1024 * 1024 })).stdout;
let server, browser, log = '', page;
let credential = '';
const report = {
  scope: 'expert-team-resilience',
  environment: {
    host: 'production packaged WorkDSH profile',
    team: 'official DeepSeek Harness Agent Teams service, tools and Web client',
    browser: 'Playwright Chromium',
    modelIo: realModel ? 'deterministic fault adapter plus explicit DeepSeek real-model handoff' : 'deterministic local adapter',
  },
  scenarios: {},
  checks: [],
  browserErrors: [],
  notRun: [...(realModel ? [] : ['paid model']), 'user preview deployment', 'fork member browser history'],
};
const pass = name => { report.checks.push(name); console.log(`PASS ${name}`); };
const waitFor = async fn => { const signal = AbortSignal.timeout(30000); while (!await fn()) { signal.throwIfAborted(); await new Promise(r => setTimeout(r, 100)); } };
const stop = async () => { if (!server || server.exitCode !== null || server.signalCode !== null) return; const ended = new Promise(r => server.once('close', r)); server.kill('SIGTERM'); const timer = setTimeout(() => server.kill('SIGKILL'), 4000); await ended; clearTimeout(timer); };
const start = async () => {
  log = '';
  server = spawn(process.execPath, [dsh, '--profile', 'native-team', '--host', '127.0.0.1', '--port', '0', '--no-open'], { cwd: home, env, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', d => { log += d; }); server.stderr.on('data', d => { log += d; });
  await waitFor(() => { if (server.exitCode !== null) throw Error(log); return /http:\/\/127\.0\.0\.1:\d+\/\?token=[\w-]+/.test(log); });
  const url = log.match(/http:\/\/127\.0\.0\.1:\d+\/\?token=[\w-]+/)[0];
  let response;
  await waitFor(async () => { try { response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(2000) }); return true; } catch { return false; } });
  const cookie = response.headers.getSetCookie().map(c => c.split(';')[0]).join('; '); assert.ok(cookie);
  return { address: new URL(url).origin, cookie };
};
const api = async (host, input) => { const response = await fetch(`${host.address}/api/native-team-probe`, { method: 'POST', headers: { cookie: host.cookie, 'content-type': 'application/json' }, body: JSON.stringify(input), signal: AbortSignal.timeout(input.action === 'begin-real-model' ? 300000 : 45000) }); const result = await response.json(); assert.ok(result.ok, JSON.stringify(result)); return result.value; };
async function open(host, id) {
  await page.context().clearCookies();
  await page.context().addCookies(host.cookie.split('; ').map(pair => { const at = pair.indexOf('='); return { name: pair.slice(0, at), value: pair.slice(at + 1), url: host.address }; }));
  await page.goto(host.address);
  for (const name of ['Continue', 'Configure later']) await page.getByRole('button', { name, exact: true }).click({ timeout: 2000 }).catch(() => {});
  await page.waitForFunction(() => !!window.nativeTeamProbe);
  await page.evaluate(id => window.nativeTeamProbe.open(id), id);
  await page.getByRole('button', { name: /Agent Team/ }).click();
  await expect(page.getByRole('dialog')).toContainText('analyst');
}
try {
  if (realModel) {
    const require = createRequire(join(root, 'packages/plugins/experts/package.json'));
    const { parseDocument, stringify } = require('yaml');
    const source = parseDocument(await readFile(join(root, '.test-runtime/preview/.credentials.yaml'), 'utf8')).toJSON();
    credential = source.refs?.DEEPSEEK_API_KEY;
    assert.ok(typeof credential === 'string' && credential.trim(), 'Configure the preview DeepSeek model first');
    await writeFile(join(home, '.credentials.yaml'), stringify({ version: 1, records: {}, refs: { DEEPSEEK_API_KEY: credential } }), { mode: 0o600 });
  }
  const tarballs = [];
  // Verify the native Team panel. WorkDSH's legacy activity strip is disabled
  // in DSH 0.1.7, whose native conversation owns work-process presentation.
  for (const directory of ['packages/providers/identity-local', 'packages/plugins/audit', 'packages/plugins/access', 'packages/plugins/skills', 'packages/plugins/experts', 'packages/bundle', 'packages/plugins/activity']) {
    const manifest = JSON.parse(await readFile(join(root, directory, 'package.json'), 'utf8'));
    await command(pnpm, ['--filter', manifest.name, 'pack', '--pack-destination', artifacts], root);
    tarballs.push(join(artifacts, `${manifest.name}-${manifest.version}.tgz`));
  }
  const fixture = join(home, 'fixture'); await mkdir(fixture);
  await writeFile(join(fixture, 'package.json'), JSON.stringify({ name: 'workdsh-native-team-probe', version: '0.0.0', type: 'module', exports: { '.': './index.mjs', './client': './client.js' }, peerDependencies: { '@deepseek-ai/dsh-llm': dshVersion }, dsh: { bundle: { patch: './patch.yml' }, client: { platform: 'web', inject: ['@deepseek-ai/dsh-api-session-controller', '@deepseek-ai/dsh-client-ui-workspace'] } } }));
  await copyFile(join(root, 'tests/fixtures/native-team-web/index.mjs'), join(fixture, 'index.mjs'));
  await writeFile(join(fixture, 'patch.yml'), '- insert:\n    - id: native-team-probe\n      name: workdsh-native-team-probe\n');
  await writeFile(join(fixture, 'client.js'), `window.__ModuleLoader__.load({id:'workdsh-native-team-probe',factory:function(){return {inject:['sessions','uiWorkspace'],apply:function(ctx){ctx.effect(function(){window.nativeTeamProbe={open:async function(id){await ctx.sessions.refresh();ctx.uiWorkspace.openSession(id)}};return function(){delete window.nativeTeamProbe}})}}}});`);
  await command(pnpm, ['pack', '--pack-destination', artifacts], fixture); tarballs.push(join(artifacts, 'workdsh-native-team-probe-0.0.0.tgz'));
  await command(dsh, ['--profile', 'native-team', '--from-default-profile', 'web', '--dump-config']);
  await command(dsh, ['plugin', '--profile', 'native-team', 'add', `@deepseek-ai/dsh-base@${dshVersion}`, `@deepseek-ai/dsh-web-app@${dshVersion}`, ...tarballs, '--prefer-offline']);
  const profilePatch = join(home, 'profiles/native-team/cordis.patch.yml');
  const browserOverride = '- id: browser-use-playwright-mcp\n  disabled: true\n';
  await writeFile(profilePatch, browserOverride);
  pass('seven-independent-packages-installed-via-official-cli');
  let host = await start();
  const created = await api(host, { action: 'create', cwd, workspaceId });
  assert.equal(created.view.members.filter(m => m.role === 'teammate').length, 2);
  pass('packaged-production-host-runs-native-spawn-and-member-skill-tools-through-access-bridge');
  browser = await chromium.launch({ headless: true }); page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', error => report.browserErrors.push(error.message));
  await open(host, created.sessionId);
  const panel = page.getByRole('dialog');
  await expect(panel).toContainText('reviewer'); await expect(panel).toContainText('核对测试数据'); await expect(panel).toContainText('复核测试结论');
  await page.screenshot({ path: join(artifacts, 'official-team.png'), fullPage: true });
  pass('official-roster-and-task-board-render-in-native-team-panel');
  assert.ok((await api(host, { action: 'view', sessionId: created.sessionId })).tasks.some(t => t.subject === '核对测试数据'));
  pass('official-web-task-board-reflects-native-team-service');
  await panel.getByRole('button').filter({ hasText: 'analyst' }).click();
  await expect(page.getByText('analyst：官方 Team 隔离验证完成。', { exact: true })).toBeVisible();
  await page.screenshot({ path: join(artifacts, 'official-member.png'), fullPage: true });
  pass('official-member-navigation-opens-real-session-history');
  await stop(); host = await start();
  const resumed = await api(host, { action: 'view', sessionId: created.sessionId });
  assert.deepEqual(resumed.members.map(m => m.id), created.view.members.map(m => m.id));
  assert.ok(resumed.tasks.some(t => t.subject === '核对测试数据'));
  const resumedAnalyst = resumed.members.find(member => member.name === 'analyst');
  assert.ok(resumedAnalyst);
  const longTaskStartedAt = Date.now();
  const started = await api(host, { action: 'begin-long-task', sessionId: created.sessionId, memberId: resumedAnalyst.id, memberName: resumedAnalyst.name });
  assert.equal(started.memberId, resumedAnalyst.id);
  const activeView = await api(host, { action: 'view', sessionId: created.sessionId });
  assert.equal(activeView.members.find(member => member.id === resumedAnalyst.id)?.status, 'running');
  assert.ok(activeView.tasks.some(task => task.id === started.task.id && task.status === 'in_progress' && task.ownerName === 'analyst'));
  await open(host, created.sessionId);
  await expect(page.getByRole('dialog')).toContainText('长任务与重连验收', { timeout: 7000 });
  await page.screenshot({ path: join(artifacts, 'official-team-active-member.png'), fullPage: true });
  pass('long-running-task-is-owned-by-the-named-official-member');
  await open(host, created.sessionId);
  await expect(page.getByRole('dialog')).toContainText('长任务与重连验收', { timeout: 7000 });
  assert.ok((await api(host, { action: 'view', sessionId: created.sessionId })).tasks.some(task => task.id === started.task.id && task.status === 'in_progress'));
  pass('browser-reconnect-keeps-the-running-member-and-task-visible');
  assert.deepEqual(await api(host, { action: 'wait-member', memberId: resumedAnalyst.id, before: started.before }), { memberId: resumedAnalyst.id, completed: true });
  const longTaskDurationMs = Date.now() - longTaskStartedAt;
  assert.ok(longTaskDurationMs >= 15000, `long task ended too early: ${longTaskDurationMs}ms`);
  await api(host, { action: 'complete-task', sessionId: created.sessionId, memberId: resumedAnalyst.id, memberName: resumedAnalyst.name, taskId: started.task.id });
  report.scenarios.longTaskReconnect = {
    taskId: started.task.id,
    owner: resumedAnalyst.name,
    memberIdStable: true,
    fullBrowserConnectionsWhileRunning: 2,
    durationMs: longTaskDurationMs,
    finalStatus: 'completed',
  };
  pass('cold-resumed-official-member-completes-the-long-task');
  const interrupted = await api(host, { action: 'begin-interrupt', sessionId: created.sessionId, memberId: resumedAnalyst.id, memberName: resumedAnalyst.name });
  assert.equal(interrupted.task.ownerName, resumedAnalyst.name);
  assert.equal(interrupted.task.status, 'in_progress');
  await open(host, created.sessionId);
  await expect(page.getByRole('dialog')).toContainText('人工停止与恢复验收', { timeout: 7000 });
  const stopped = await api(host, { action: 'interrupt-member', sessionId: created.sessionId, memberId: resumedAnalyst.id, memberName: resumedAnalyst.name, before: interrupted.before, taskId: interrupted.task.id });
  assert.equal(stopped.memberId, resumedAnalyst.id);
  assert.ok(['aborted', 'interrupted', 'cancelled'].includes(stopped.reason));
  assert.equal(stopped.task.status, 'in_progress');
  const resumedInterrupted = await api(host, { action: 'resume-interrupted', sessionId: created.sessionId, memberId: resumedAnalyst.id, memberName: resumedAnalyst.name });
  assert.deepEqual(await api(host, { action: 'wait-member', memberId: resumedAnalyst.id, before: resumedInterrupted.before }), { memberId: resumedAnalyst.id, completed: true });
  const completedInterrupted = await api(host, { action: 'complete-task', sessionId: created.sessionId, memberId: resumedAnalyst.id, memberName: resumedAnalyst.name, taskId: interrupted.task.id });
  const afterInterrupt = await api(host, { action: 'view', sessionId: created.sessionId });
  assert.equal(afterInterrupt.members.filter(member => member.name === resumedAnalyst.name).length, 1);
  report.scenarios.interruptRecovery = {
    taskId: interrupted.task.id,
    owner: resumedAnalyst.name,
    interruptionReason: stopped.reason,
    taskRetainedAfterInterrupt: stopped.task.status === 'in_progress',
    memberIdStable: afterInterrupt.members.find(member => member.name === resumedAnalyst.name)?.id === resumedAnalyst.id,
    duplicateMembers: 0,
    finalStatus: completedInterrupted.status,
  };
  pass('manual-interrupt-retains-the-owned-task-and-resumes-the-same-member-once');
  const resumedReviewer = (await api(host, { action: 'view', sessionId: created.sessionId })).members.find(member => member.name === 'reviewer');
  assert.ok(resumedReviewer);
  const handoff = await api(host, { action: 'begin-handoff', sessionId: created.sessionId, fromMemberId: resumedAnalyst.id, fromMemberName: resumedAnalyst.name, toMemberId: resumedReviewer.id, toMemberName: resumedReviewer.name });
  assert.equal(handoff.task.ownerName, 'reviewer');
  assert.equal(handoff.task.status, 'in_progress');
  assert.ok(['accepted', 'queued'].includes(handoff.delivery));
  await open(host, created.sessionId);
  await expect(page.getByRole('dialog')).toContainText('交接复核验收', { timeout: 7000 });
  assert.deepEqual(await api(host, { action: 'wait-member', memberId: resumedReviewer.id, before: handoff.before }), { memberId: resumedReviewer.id, completed: true });
  const completedHandoff = await api(host, { action: 'complete-task', sessionId: created.sessionId, memberId: resumedReviewer.id, memberName: resumedReviewer.name, taskId: handoff.task.id });
  assert.equal(completedHandoff.status, 'completed');
  assert.equal(completedHandoff.ownerName, 'reviewer');
  report.scenarios.handoff = {
    taskId: handoff.task.id,
    from: resumedAnalyst.name,
    to: resumedReviewer.name,
    delivery: handoff.delivery,
    ownerAfterCompletion: completedHandoff.ownerName,
    finalStatus: completedHandoff.status,
  };
  pass('durable-message-and-task-ownership-complete-the-member-handoff');
  const failed = await api(host, { action: 'begin-failure', sessionId: created.sessionId, memberId: resumedReviewer.id, memberName: resumedReviewer.name });
  const failedResult = await api(host, { action: 'wait-failure', sessionId: created.sessionId, memberId: resumedReviewer.id, before: failed.before });
  assert.equal(failedResult.memberId, resumedReviewer.id);
  assert.notEqual(failedResult.reason, 'completed');
  await open(host, created.sessionId);
  await expect(page.getByRole('dialog')).toContainText('失败恢复验收', { timeout: 7000 });
  assert.ok((await api(host, { action: 'view', sessionId: created.sessionId })).tasks.some(task => task.id === failed.task.id && task.status === 'in_progress' && task.ownerName === 'reviewer'));
  pass('failed-member-and-unfinished-task-remain-visible-in-the-native-team-panel');
  pass('member-failure-is-recorded-without-completing-its-owned-task');
  await stop(); host = await start();
  const afterFailureRestart = await api(host, { action: 'view', sessionId: created.sessionId });
  assert.equal(afterFailureRestart.members.find(member => member.name === 'reviewer')?.id, resumedReviewer.id);
  assert.ok(afterFailureRestart.tasks.some(task => task.id === failed.task.id && task.status === 'in_progress' && task.ownerName === 'reviewer'));
  const recovery = await api(host, { action: 'recover-failure', sessionId: created.sessionId, memberId: resumedReviewer.id, memberName: resumedReviewer.name });
  assert.deepEqual(await api(host, { action: 'wait-member', memberId: resumedReviewer.id, before: recovery.before }), { memberId: resumedReviewer.id, completed: true });
  const recoveredTask = await api(host, { action: 'complete-task', sessionId: created.sessionId, memberId: resumedReviewer.id, memberName: resumedReviewer.name, taskId: failed.task.id });
  assert.equal(recoveredTask.status, 'completed');
  const recoveredView = await api(host, { action: 'view', sessionId: created.sessionId });
  assert.equal(recoveredView.members.filter(member => member.name === 'reviewer').length, 1);
  report.scenarios.failureRecovery = {
    taskId: failed.task.id,
    injectedFailureReason: failedResult.reason,
    taskRetainedAcrossColdHostRestart: true,
    memberIdStable: recoveredView.members.find(member => member.name === 'reviewer')?.id === resumedReviewer.id,
    duplicateMembers: 0,
    finalStatus: recoveredTask.status,
  };
  pass('same-member-cold-restarts-after-failure-and-finishes-the-retained-task');
  if (realModel) {
    const real = await api(host, { action: 'begin-real-model', expertId: created.expertId, cwd, workspaceId });
    const deadline = Date.now() + 480000;
    let status;
    while (Date.now() < deadline) {
      status = await api(host, { action: 'real-model-status', sessionId: real.sessionId });
      const memberAdvanced = Object.entries(real.memberTurnEnds).every(([id, before]) => (status.memberTurnEnds[id] ?? 0) > before);
      const tasks = status.view.tasks.filter(task => ['REAL-ANALYZE', 'REAL-REVIEW'].includes(task.subject));
      if (status.leadTurnEnds > real.beforeLeadTurnEnds && memberAdvanced && tasks.length === 2 && tasks.every(task => task.status === 'completed')) break;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    assert.ok(status, 'real model status unavailable');
    const realCalls = status.leadToolCalls.slice(real.beforeLeadToolCalls);
    assert.ok(realCalls.filter(name => name === 'team_task_create').length >= 2, JSON.stringify(realCalls));
    assert.ok(realCalls.includes('send_message'), JSON.stringify(realCalls));
    assert.ok(realCalls.includes('wait_agent') || realCalls.filter(name => name === 'list_agents').length >= 2, JSON.stringify(realCalls));
    const realTasks = status.view.tasks.filter(task => ['REAL-ANALYZE', 'REAL-REVIEW'].includes(task.subject));
    assert.equal(realTasks.length, 2, JSON.stringify(status.view.tasks));
    assert.ok(realTasks.every(task => task.status === 'completed'));
    assert.ok(Object.entries(real.memberTurnEnds).every(([id, before]) => (status.memberTurnEnds[id] ?? 0) > before));
    report.scenarios.realModelHandoff = {
      provider: 'deepseek-official', model: 'deepseek-flash',
      memberIdsStable: status.view.members.filter(member => member.role === 'teammate').every(member => real.memberIds[member.name] === member.id),
      tasks: realTasks.map(task => ({ subject: task.subject, owner: task.ownerName, status: task.status })),
      leadToolCalls: realCalls,
      coordinationObservation: realCalls.includes('wait_agent') ? 'wait_agent' : 'list_agents',
    };
    pass('real-model-lead-and-members-complete-two-stage-official-task-handoff');
  }
  await open(host, created.sessionId); await expect(page.getByRole('dialog')).toContainText('核对测试数据');
  await page.screenshot({ path: join(artifacts, 'official-team-cold.png'), fullPage: true });
  pass('cold-web-restart-keeps-member-identities-and-native-team-task');
  assert.deepEqual(report.browserErrors, []); pass('no-browser-page-errors'); report.status = 'passed';
} catch (error) { report.status = 'failed'; report.error = error.stack; console.error(error); process.exitCode = 1; if (page) await page.screenshot({ path: join(artifacts, 'failure.png'), fullPage: true }).catch(() => {}); }
finally { await browser?.close(); await stop(); await unlink(join(home, '.credentials.yaml')).catch(() => {}); await writeFile(join(artifacts, 'host.log'), log.replaceAll(credential || '\0', '[redacted]').replace(/token=[^\s]+/g, 'token=[redacted]')); await writeFile(join(artifacts, 'result.json'), JSON.stringify(report, null, 2)); }
