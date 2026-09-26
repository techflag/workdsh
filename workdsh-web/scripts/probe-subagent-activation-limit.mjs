// Isolated probe for the official continuable-subagent activation ceiling:
// sessionController create/prompt/resolveAgent -> 8 startContinuable children
// (each held live) -> ninth refused with ACTIVATION_LIMIT_REACHED (limit 8)
// -> drainContinuableChildren releases one slot -> retry admitted.
// Runs in a disposable DSH home; installs the tests/fixtures/subagent-activation-limit
// package through the official CLI only.
import { spawn, execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile, realpath, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('..', import.meta.url));
const artifacts = join(root, '.artifacts/dsh-0.1.6-alpha.2-upgrade/p5-activation-limit');
const home = await realpath(await mkdtemp(join(tmpdir(), 'workdsh-activation-limit-')));
const cwd = join(home, 'workspace'), workspaceId = randomUUID();
await mkdir(artifacts, { recursive: true }); await mkdir(cwd); await mkdir(join(home, 'storages'));
const now = new Date().toISOString();
await writeFile(join(home, 'storages/workspace.json'), JSON.stringify({ unit: { name: 'workspace', version: 2 }, global: { initialized: true, workspaceIds: [workspaceId], archivedSessionIds: [] }, tables: { workspaces: { [workspaceId]: { path: cwd, title: 'Activation limit verification', sessionIds: [], createdAt: now, updatedAt: now } } } }));
const env = { ...process.env, DSH_HOME: home, DSH_AGENTS_HOME: join(home, 'agents'), PATH: `${join(root, 'node_modules/.bin')}:${dirname(process.execPath)}:${process.env.PATH}` };
const dsh = join(root, 'node_modules/@deepseek-ai/dsh/lib/bin.js'), pnpm = join(root, 'node_modules/pnpm/bin/pnpm.cjs');
const exec = promisify(execFile);
const command = async (bin, args, workdir = home) => (await exec(process.execPath, [bin, ...args], { cwd: workdir, env, timeout: 90000, maxBuffer: 8 * 1024 * 1024 })).stdout;
let server, log = '';
const report = {
  scope: 'subagent-activation-ceiling',
  environment: {
    host: 'disposable DSH home + isolated profile via official dsh CLI',
    mechanism: 'official ctx.subagents.startContinuable against lifecycle-managed root Agent',
    modelIo: 'deterministic local adapter (no paid model)',
  },
  checks: [],
  notRun: ['paid model', 'browser UI for subagent overload notices', 'user preview deployment'],
};
const pass = name => { report.checks.push(name); console.log(`PASS ${name}`); };
const waitFor = async (fn, what) => { const signal = AbortSignal.timeout(30000); while (!await fn()) { if (signal.aborted) throw Error(`timeout waiting for ${what}\n${log}`); await new Promise(r => setTimeout(r, 100)); } };
const stop = async () => { if (!server || server.exitCode !== null || server.signalCode !== null) return; const ended = new Promise(r => server.once('close', r)); server.kill('SIGTERM'); const timer = setTimeout(() => server.kill('SIGKILL'), 4000); await ended; clearTimeout(timer); };
const start = async () => {
  log = '';
  server = spawn(process.execPath, [dsh, '--profile', 'activation-limit', '--host', '127.0.0.1', '--port', '0', '--no-open'], { cwd: home, env, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', d => { log += d; }); server.stderr.on('data', d => { log += d; });
  await waitFor(() => { if (server.exitCode !== null) throw Error(log); return /http:\/\/127\.0\.0\.1:\d+\/\?token=[\w-]+/.test(log); }, 'server token');
  const url = log.match(/http:\/\/127\.0\.0\.1:\d+\/\?token=[\w-]+/)[0];
  let response;
  await waitFor(async () => { try { response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(2000) }); return true; } catch { return false; } }, 'login redirect');
  const cookie = response.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  assert.ok(cookie);
  return { address: new URL(url).origin, cookie };
};

try {
  const fixture = join(home, 'fixture'); await mkdir(fixture);
  await writeFile(join(fixture, 'package.json'), JSON.stringify({ name: 'workdsh-activation-limit-probe', version: '0.0.0', type: 'module', exports: { '.': './index.mjs' }, peerDependencies: { '@deepseek-ai/dsh-llm': '0.1.6-alpha.2' }, dsh: { bundle: { patch: './patch.yml' } } }));
  await copyFile(join(root, 'tests/fixtures/subagent-activation-limit/index.mjs'), join(fixture, 'index.mjs'));
  await writeFile(join(fixture, 'patch.yml'), '- insert:\n    - id: activation-limit-probe\n      name: workdsh-activation-limit-probe\n');
  await command(pnpm, ['pack', '--pack-destination', artifacts], fixture);
  await command(dsh, ['--profile', 'activation-limit', '--from-default-profile', 'web', '--dump-config']);
  await command(dsh, ['plugin', '--profile', 'activation-limit', 'add', join(artifacts, 'workdsh-activation-limit-probe-0.0.0.tgz'), '--offline']);
  pass('fixture-installed-via-official-cli-offline');

  const host = await start();
  const response = await fetch(`${host.address}/api/activation-limit-probe`, {
    method: 'POST', headers: { cookie: host.cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ cwd, workspaceId }), signal: AbortSignal.timeout(300000),
  });
  const result = await response.json();
  if (!result.ok) report.failureDetail = { stage: result.stage, observed: result.observed, error: String(result.error).slice(0, 3000) };
  assert.ok(result.ok, `stage=${result.stage}\n${String(result.error).slice(0, 900)}`);
  const value = result.value;
  report.result = value;
  assert.equal(value.observed.stillLiveAtRefusal, 8, 'all eight holding children must still have a live turn at refusal');
  pass('eight-live-hold-children-at-refusal');
  assert.ok(value.observed.refusal, 'ninth admission must be refused while eight children hold live turns');
  assert.equal(value.observed.refusal.code, 'ACTIVATION_LIMIT_REACHED');
  assert.ok(value.observed.refusal.message.includes('active child limit: 8'), value.observed.refusal.message);
  pass('ninth-child-refused-with-activation-limit-reached-default-8');
  assert.ok(value.observed.drained.childId);
  assert.ok(value.observed.retry.entered, 'retry after drain must be admitted and enter hold');
  assert.notEqual(value.observed.retry.childId, value.observed.drained.childId);
  pass('drainContinuableChildren-releases-one-slot-and-retry-admitted');

  await stop();
  pass('isolated-server-stopped');
} catch (error) {
  report.failure = String(error);
  process.exitCode = 1;
} finally {
  await stop().catch(() => {});
  await writeFile(join(artifacts, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
