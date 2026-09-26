// Finish verification of already completed synthetic tasks without another model request.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, writeFile, unlink, realpath } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { checkProfessionalSession } from './check-expert-professional-session.mjs';
const root = fileURLToPath(new URL('..', import.meta.url));
assert.ok(process.argv[2], 'Usage: node scripts/recheck-expert-professional.mjs <artifact-directory> [normal|incomplete|dirty]');
const artifacts = await realpath(process.argv[2]);
const evidence = await checkProfessionalSession(artifacts, process.argv[3] || 'normal');
assert.equal(dirname(await realpath(evidence.home)), await realpath(tmpdir()), 'Only the system temporary root may be used');
assert.ok(basename(evidence.home).startsWith('workdsh-experts-professional-'), 'Only temporary synthetic acceptance homes may be restarted');
const server = spawn(process.execPath, [join(root, 'node_modules/@deepseek-ai/dsh/lib/bin.js'), '--profile', 'experts', '--host', '127.0.0.1', '--port', '0', '--no-open'], {
  cwd: evidence.home, env: { ...process.env, DSH_HOME: evidence.home, DSH_AGENTS_HOME: join(evidence.home, 'agents'), PATH: `${dirname(process.execPath)}:${process.env.PATH}` }, stdio: ['ignore', 'pipe', 'pipe'],
});
let log = '';
server.stdout.on('data', value => { log += value; }); server.stderr.on('data', value => { log += value; });
try {
  const deadline = Date.now() + 30_000;
  let response, address;
  while (!response) {
    assert.ok(server.exitCode === null && Date.now() < deadline, 'Temporary Host restart failed');
    const login = log.match(/http:\/\/127\.0\.0\.1:\d+\/\?token=[\w-]+/)?.[0];
    if (login) { address = new URL(login).origin; response = await fetch(login, { redirect: 'manual', signal: AbortSignal.timeout(2000) }).catch(() => undefined); }
    if (!response) await new Promise(resolve => setTimeout(resolve, 100));
  }
  const cookie = response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  const result = await fetch(`${address}/api/workdsh-experts`, { method: 'POST', headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ endpoint: 'verify-binding', payload: { sessionId: evidence.sessionId } }), signal: AbortSignal.timeout(15_000) });
  assert.equal(result.status, 200); assert.equal((await result.json()).ok, true);
  evidence.coldRestart = 'binding verified';
  await writeFile(join(artifacts, 'report.json'), JSON.stringify(evidence, null, 2));
  console.log(`PASS: ${evidence.scenario}: durable real-model results and cold-restart binding verified; professional review remains separate`);
} finally {
  if (server.exitCode === null && server.signalCode === null) {
    const stopped = new Promise(resolve => server.once('close', resolve)); server.kill('SIGTERM');
    const timer = setTimeout(() => server.kill('SIGKILL'), 3000); await stopped; clearTimeout(timer);
  }
  await unlink(join(evidence.home, '.credentials.yaml')).catch(() => {});
  await writeFile(join(artifacts, 'recheck-host.log'), log.replace(/token=[^\s]+/g, 'token=[redacted]'));
}
