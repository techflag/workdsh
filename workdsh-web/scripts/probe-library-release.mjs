import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const home = await mkdtemp(join(tmpdir(), 'workdsh-library-package-probe-'));
const artifacts = join(home, 'artifacts'); await mkdir(artifacts, { recursive: true });
const env = { ...process.env, DSH_HOME: home, PATH: `${join(root, 'node_modules/.bin')}:${dirname(process.execPath)}:${process.env.PATH}` };
const dsh = join(root, 'node_modules/@deepseek-ai/dsh/lib/bin.js'); const pnpm = join(root, 'node_modules/pnpm/bin/pnpm.cjs');
const run = (bin, args, options = {}) => new Promise((resolveRun, reject) => {
  const child = spawn(process.execPath, [bin, ...args], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'], ...options }); let output = '';
  child.stdout.on('data', chunk => { output += chunk; }); child.stderr.on('data', chunk => { output += chunk; });
  child.on('error', reject); child.on('close', code => code === 0 ? resolveRun(output) : reject(new Error(`${args.join(' ')} failed (${code}): ${output.slice(-4000)}`)));
});
const packages = ['workdsh-provider-identity-local', 'workdsh-plugin-audit', 'workdsh-plugin-access', 'workdsh-plugin-library']; const archives = [];
for (const name of packages) {
  await run(pnpm, ['--filter', name, 'build']); await run(pnpm, ['--filter', name, 'pack', '--pack-destination', artifacts]);
  const manifestPath = name === 'workdsh-provider-identity-local' ? 'packages/providers/identity-local/package.json' : `packages/plugins/${name.replace('workdsh-plugin-', '')}/package.json`;
  const manifest = JSON.parse(await readFile(join(root, manifestPath), 'utf8')); archives.push(join(artifacts, `${name}-${manifest.version}.tgz`));
}
await run(dsh, ['--profile', 'library-probe', '--from-default-profile', 'web', '--dump-config']);
await run(dsh, ['plugin', '--profile', 'library-probe', 'add', ...archives]);
let server; let output = '';
const start = async () => {
  output = ''; server = spawn(process.execPath, [dsh, '--profile', 'library-probe', '--no-open', '--host', '127.0.0.1', '--port', '0'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', chunk => { output += chunk; }); server.stderr.on('data', chunk => { output += chunk; });
  const deadline = Date.now() + 30_000; while (!/http:\/\/127\.0\.0\.1:\d+/.test(output)) { if (server.exitCode !== null) throw new Error(output); if (Date.now() > deadline) throw new Error(`Host start timeout: ${output}`); await new Promise(resolveWait => setTimeout(resolveWait, 100)); }
  const bootstrap = output.match(/http:\/\/127\.0\.0\.1:\d+\/\?token=[A-Za-z0-9_-]+/)?.[0]; assert.ok(bootstrap);
  const login = await fetch(bootstrap, { redirect: 'manual' }); const cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; '); assert.ok(cookie);
  return { origin: bootstrap.replace(/\/\?token=.*/, ''), cookie };
};
const stop = async () => { if (!server || server.exitCode !== null) return; const closed = new Promise(resolveClose => server.once('close', resolveClose)); server.kill('SIGTERM'); const timer = setTimeout(() => server.kill('SIGKILL'), 3_000); await closed; clearTimeout(timer); };
const call = async ({ origin, cookie }, endpoint, payload) => { const response = await fetch(`${origin}/api/workdsh-library`, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ endpoint, payload }) }); const body = await response.json(); assert.equal(body.ok, true, JSON.stringify(body)); return body.value; };
try {
  let session = await start(); const folder = await call(session, 'create-folder', { name: '卸载保留验收' });
  const imported = await call(session, 'import', { parentId: folder.id, name: '证据.md', mediaType: 'text/markdown', base64: Buffer.from('# 持久化证据\n\nLibraryRetentionToken').toString('base64'), operationId: 'package-probe-import' });
  assert.equal((await call(session, 'search', { query: 'LibraryRetentionToken' }))[0].assetId, imported.asset.id); await stop();
  session = await start(); assert.equal((await call(session, 'search', { query: 'LibraryRetentionToken' })).length, 1, 'cold restart retains searchable revision'); await stop();
  await run(dsh, ['plugin', '--profile', 'library-probe', 'remove', 'workdsh-plugin-library']); await access(join(home, 'library', 'objects', imported.asset.id));
  await run(dsh, ['plugin', '--profile', 'library-probe', 'add', archives.at(-1)]);
  session = await start(); assert.equal((await call(session, 'search', { query: 'LibraryRetentionToken' })).length, 1, 'reinstall reads retained data'); await stop();
  console.log(`PASS: packed Library installed, survived two cold starts, uninstall retained data, and reinstall recovered asset ${imported.asset.id}.`);
} finally { await stop(); }
