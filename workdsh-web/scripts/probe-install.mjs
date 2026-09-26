import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = resolve(root, '.artifacts');
mkdirSync(artifacts, { recursive: true });
mkdirSync(resolve(root, '.test-runtime'), { recursive: true });
const home = mkdtempSync(resolve(root, '.test-runtime/install-'));
const env = { ...process.env, DSH_HOME: home, DSH_AGENTS_HOME: resolve(home, 'agents'), PATH: `${resolve(root, 'node_modules/.bin')}:${dirname(process.execPath)}:${process.env.PATH}` };
const dsh = resolve(root, 'node_modules/@deepseek-ai/dsh/lib/bin.js');
const pnpm = resolve(root, 'node_modules/pnpm/bin/pnpm.cjs');
const version = JSON.parse(readFileSync(resolve(root, 'packages/bundle/package.json'), 'utf8')).version;
const tarball = resolve(artifacts, `workdsh-bundle-${version}.tgz`);
const skillsVersion = JSON.parse(readFileSync(resolve(root, 'packages/plugins/skills/package.json'), 'utf8')).version;
const skillsTarball = resolve(artifacts, `workdsh-plugin-skills-${skillsVersion}.tgz`);
function command(bin, args) {
  return new Promise((res, rej) => {
    const child = spawn(process.execPath, [bin, ...args], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', b => { output += b; }); child.stderr.on('data', b => { output += b; });
    const timeout = setTimeout(() => child.kill('SIGTERM'), 45000);
    child.on('error', rej);
    child.on('close', code => { clearTimeout(timeout); code === 0 ? res(output) : rej(new Error(`Command ${args[0]} failed (${code}): ${output.replace(/token=[^\s]+/g, 'token=[redacted]')}`)); });
  });
}
let server;
let serverOutput = '';
async function until(predicate, label) {
  const deadline = Date.now() + 20000;
  while (!predicate()) {
    if (server?.exitCode !== null && server?.exitCode !== undefined) {
      throw new Error(`Server exited before ${label}: ${serverOutput.replace(/token=[^\s]+/g, 'token=[redacted]').slice(-4000)}`);
    }
    if (Date.now() > deadline) throw new Error(`Timed out: ${label}`);
    await new Promise(r => setTimeout(r, 100));
  }
}
function startServer() {
  serverOutput = '';
  server = spawn(process.execPath, [dsh, '--profile', 'probe', '--no-open', '--host', '127.0.0.1', '--port', '0'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  server.on('error', error => { serverOutput += error.message; });
  server.stdout.on('data', b => { serverOutput += b; }); server.stderr.on('data', b => { serverOutput += b; });
}
async function stopServer() {
  if (!server || server.exitCode !== null || server.signalCode !== null) return;
  const closed = new Promise(r => server.once('close', r));
  server.kill('SIGTERM');
  const timer = setTimeout(() => server.kill('SIGKILL'), 3000);
  await closed;
  clearTimeout(timer);
}
async function authenticate(address) {
  const loginUrl = serverOutput.match(/http:\/\/127\.0\.0\.1:\d+\/\?token=[A-Za-z0-9_-]+/)?.[0];
  assert.ok(loginUrl, 'local session bootstrap URL available');
  const login = await fetch(loginUrl, { redirect: 'manual', signal: AbortSignal.timeout(5000) });
  assert.ok(login.status >= 300 && login.status < 400, 'bootstrap redirects to authenticated Web');
  const cookie = login.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  assert.ok(cookie, 'bootstrap sets session cookie');
  const authenticated = await fetch(address, { headers: { cookie }, signal: AbortSignal.timeout(5000) });
  assert.equal(authenticated.status, 200);
  return cookie;
}
try {
  await command(pnpm, ['--filter', 'workdsh-plugin-skills', 'pack', '--pack-destination', artifacts]);
  await command(pnpm, ['--filter', 'workdsh-bundle', 'pack', '--pack-destination', artifacts]);
  await command(dsh, ['--profile', 'probe', '--from-default-profile', 'web', '--dump-config']);
  // Official Profile composition explicitly installs feature layers. The product
  // bundle does not secretly initialize or own the Skill plugin.
  await command(dsh, ['plugin', '--profile', 'probe', 'add', skillsTarball, tarball]);
  const config = await command(dsh, ['--profile', 'probe', '--dump-config']);
  assert.ok(config.includes('workdsh-installation-probe'));
  assert.ok(config.includes("name: '@deepseek-ai/dsh-computer-use'"));
  assert.ok(config.includes("name: '@deepseek-ai/dsh-experimental-computer-use-cua-driver-native'"));
  assert.ok(config.includes("name: '@deepseek-ai/dsh-browser-use'"));
  assert.ok(config.includes("name: '@deepseek-ai/dsh-experimental-browser-use-playwright-mcp'"));
  assert.ok(config.includes("name: '@deepseek-ai/dsh-experimental-auto-review'"));
  assert.equal(config.split('id: workdsh-skills').length - 1, 1);
  const installed = JSON.parse(readFileSync(resolve(home, 'profiles/probe/node_modules/workdsh-bundle/package.json'), 'utf8'));
  assert.equal(installed.version, version);
  if (process.argv.includes('--browser')) {
    // Browser coverage needs one selectable official Workspace. Seed only the
    // published storage contract; all UI and Session behavior remains native.
    const workspaceId = randomUUID();
    const now = new Date().toISOString();
    mkdirSync(resolve(home, 'storages'), { recursive: true });
    writeFileSync(resolve(home, 'storages/workspace.json'), `${JSON.stringify({
      unit: { name: 'workspace', version: 2 },
      global: { initialized: true, workspaceIds: [workspaceId], archivedSessionIds: [] },
      tables: { workspaces: { [workspaceId]: { path: root, title: 'WorkDSH Probe', sessionIds: [], createdAt: now, updatedAt: now } } },
    }, null, 2)}\n`);
    const skillDir = resolve(home, 'agents/skills/workdsh-browser-fixture');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(resolve(skillDir, 'SKILL.md'), '---\nname: workdsh-browser-fixture\ndescription: 浏览器验收技能，只用于隔离测试目录。\n---\nRead the supplied document and summarize its key points.\n');
  }
  startServer();
  await until(() => serverOutput.includes('[workdsh:probe] activated') && /http:\/\/127\.0\.0\.1:\d+/.test(serverOutput), 'activation');
  const address = serverOutput.match(/http:\/\/127\.0\.0\.1:\d+/)[0];
  const response = await fetch(address, { signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, 401, 'anonymous Web access must be rejected');
  const sessionCookie = await authenticate(address);
  console.log('PASS: packed bundle installed; Host activated; anonymous 401 and authenticated Web 200');
  if (process.argv.includes('--browser')) {
    const { probeBrowser } = await import('./probe-browser.mjs');
    await probeBrowser(address, sessionCookie, resolve(artifacts, 'client-probe.png'));

    // Keep the installed bundle and its isolated data intact across two cold
    // Host restarts. This verifies durable Skill state through the packaged UI,
    // rather than only exercising same-process reads.
    await stopServer();
    startServer();
    await until(() => serverOutput.includes('[workdsh:probe] activated') && /http:\/\/127\.0\.0\.1:\d+/.test(serverOutput), 'first Skill persistence restart');
    const persistedAddress = serverOutput.match(/http:\/\/127\.0\.0\.1:\d+/)[0];
    const persistedCookie = await authenticate(persistedAddress);
    const { probeSkillStateAfterRestart, probeDisabledSkillAfterRestart } = await import('./probe-browser.mjs');
    await probeSkillStateAfterRestart(persistedAddress, persistedCookie, resolve(artifacts, 'client-skill-restart.png'));

    await stopServer();
    startServer();
    await until(() => serverOutput.includes('[workdsh:probe] activated') && /http:\/\/127\.0\.0\.1:\d+/.test(serverOutput), 'second Skill persistence restart');
    const disabledAddress = serverOutput.match(/http:\/\/127\.0\.0\.1:\d+/)[0];
    const disabledCookie = await authenticate(disabledAddress);
    await probeDisabledSkillAfterRestart(disabledAddress, disabledCookie, resolve(artifacts, 'client-skill-disabled-restart.png'));

    // Check the opposite removal direction as well: Skill owns no product shell.
    const fixturePath = resolve(home, 'agents/skills/workdsh-browser-fixture/SKILL.md');
    const fixtureBefore = readFileSync(fixturePath, 'utf8');
    await stopServer();
    await command(dsh, ['plugin', '--profile', 'probe', 'remove', 'workdsh-plugin-skills']);
    startServer();
    await until(() => serverOutput.includes('[workdsh:probe] activated') && /http:\/\/127\.0\.0\.1:\d+/.test(serverOutput), 'product without Skill');
    const shellAddress = serverOutput.match(/http:\/\/127\.0\.0\.1:\d+/)[0];
    const shellCookie = await authenticate(shellAddress);
    const { probeProductWithoutSkills } = await import('./probe-browser.mjs');
    await probeProductWithoutSkills(shellAddress, shellCookie);
    assert.equal(readFileSync(fixturePath, 'utf8'), fixtureBefore);
    await stopServer();
    await command(dsh, ['plugin', '--profile', 'probe', 'add', skillsTarball]);
  }
  // Bundle composition is validated across a stopped Host. Live removal is a separate capability.
  await stopServer();
  await command(dsh, ['plugin', '--profile', 'probe', 'remove', 'workdsh-bundle']);
  const removed = await command(dsh, ['--profile', 'probe', '--dump-config']);
  assert.ok(!removed.includes('workdsh-installation-probe'));
  assert.ok(!removed.includes("name: '@deepseek-ai/dsh-computer-use'"));
  assert.ok(!removed.includes("name: '@deepseek-ai/dsh-experimental-computer-use-cua-driver-native'"));
  assert.ok(!removed.includes("name: '@deepseek-ai/dsh-browser-use'"));
  assert.ok(!removed.includes("name: '@deepseek-ai/dsh-experimental-browser-use-playwright-mcp'"));
  assert.ok(!removed.includes("name: '@deepseek-ai/dsh-experimental-auto-review'"));
  startServer();
  await until(() => /http:\/\/127\.0\.0\.1:\d+/.test(serverOutput), 'restart after removal');
  const removedAddress = serverOutput.match(/http:\/\/127\.0\.0\.1:\d+/)[0];
  assert.equal((await fetch(removedAddress, { signal: AbortSignal.timeout(5000) })).status, 401);
  assert.ok(!serverOutput.includes('[workdsh:probe] activated'));
  console.log('PASS: removed bundle absent from configuration and restarted Host');
  if (process.argv.includes('--browser')) {
    const { probeBrowser } = await import('./probe-browser.mjs');
    const removedCookie = await authenticate(removedAddress);
    await probeBrowser(removedAddress, removedCookie, resolve(artifacts, 'client-removed.png'), { installed: false });
  }
  await stopServer();
  await command(dsh, ['plugin', '--profile', 'probe', 'add', tarball]);
  startServer();
  await until(() => serverOutput.includes('[workdsh:probe] activated'), 'reinstallation');
  console.log('PASS: reinstallation activates plugin after restart; live CLI removal remains unverified');
} finally {
  await stopServer();
}
