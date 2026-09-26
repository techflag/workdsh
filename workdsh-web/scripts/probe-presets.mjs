import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';
import {
  SHIPPED_PRESET_ROOT,
  copyComposition,
  discoverPresets,
} from '@deepseek-ai/dsh-agent-presets';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(resolve(root, '.test-runtime'), { recursive: true });
mkdirSync(resolve(root, '.artifacts'), { recursive: true });
const dshHome = mkdtempSync(resolve(root, '.test-runtime/presets-'));
const userRoot = resolve(dshHome, '.agent-presets');
const presetRoots = [
  { path: SHIPPED_PRESET_ROOT, trust: 'system' },
  { path: userRoot, trust: 'user' },
];
const env = {
  ...process.env,
  DSH_HOME: dshHome,
  PATH: `${resolve(root, 'node_modules/.bin')}:${dirname(process.execPath)}:${process.env.PATH}`,
};
delete env.DEEPSEEK_API_KEY;
delete env.OPENAI_API_KEY;
delete env.ANTHROPIC_API_KEY;
// Test-only bootstrap for an unrelated prerequisite. Runtime workspace/session
// behavior after boot is still provided by the published Harness services.
const workspaceId = randomUUID();
const now = new Date().toISOString();
mkdirSync(resolve(dshHome, 'storages'), { recursive: true });
writeFileSync(resolve(dshHome, 'storages/workspace.json'), `${JSON.stringify({
  unit: { name: 'workspace', version: 2 },
  global: { initialized: true, workspaceIds: [workspaceId], archivedSessionIds: [] },
  tables: {
    workspaces: {
      [workspaceId]: { path: root, title: 'WorkDSH Probe', sessionIds: [], createdAt: now, updatedAt: now },
    },
  },
}, null, 2)}\n`);
const dsh = resolve(root, 'node_modules/@deepseek-ai/dsh/lib/bin.js');
let server;
let output = '';
let activeAgentId;

async function until(predicate, label) {
  const deadline = Date.now() + 20_000;
  while (!predicate()) {
    if (server?.exitCode !== null && server?.exitCode !== undefined) throw new Error(`Host exited before ${label}: ${output}`);
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${label}: ${output}`);
    await new Promise(resolveWait => setTimeout(resolveWait, 100));
  }
}

async function stopServer() {
  if (!server || server.exitCode !== null || server.signalCode !== null) return;
  const closed = new Promise(resolveClose => server.once('close', resolveClose));
  server.kill('SIGTERM');
  const timer = setTimeout(() => server.kill('SIGKILL'), 3_000);
  await closed;
  clearTimeout(timer);
}

async function authenticate(address) {
  const loginUrl = output.match(/http:\/\/127\.0\.0\.1:\d+\/\?token=[A-Za-z0-9_-]+/)?.[0];
  assert.ok(loginUrl, 'Host prints a local bootstrap URL');
  const login = await fetch(loginUrl, { redirect: 'manual', signal: AbortSignal.timeout(5_000) });
  const cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  assert.ok(cookie, 'bootstrap sets an authenticated session cookie');
  return cookie;
}

async function startHost(initialize = false) {
  output = '';
  const args = ['--profile', 'preset-probe'];
  if (initialize) args.push('--from-default-profile', 'web');
  args.push('--no-open', '--host', '127.0.0.1', '--port', '0');
  server = spawn(process.execPath, [dsh, ...args], {
    cwd: root,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', chunk => { output += chunk; });
  server.stderr.on('data', chunk => { output += chunk; });
  await until(() => /http:\/\/127\.0\.0\.1:\d+/.test(output), 'Web address');
  const address = output.match(/http:\/\/127\.0\.0\.1:\d+/)[0];
  return { address, cookie: await authenticate(address) };
}

async function listSkills(address, cookie, sessionId) {
  const response = await fetch(`${address}/api/skills/list`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({
      type: 'client-request',
      rpcId: randomUUID(),
      method: 'skills/list',
      payload: { args: { request: { sessionId } } },
    }),
    signal: AbortSignal.timeout(10_000),
  });
  assert.ok(response.ok, 'Host accepted the official skills/list request');
  const body = await response.json();
  assert.equal(body.result?.ok, true, 'catalog errors must not become an empty successful directory');
  assert.ok(Array.isArray(body.result.value?.skills), 'catalog contains an explicit skills array');
  return body;
}

const rows = await discoverPresets(presetRoots, import.meta.url);
const cordis = rows.find(row => row.id === 'cordis');
const minimal = rows.find(row => row.id === 'minimal');
assert.ok(cordis && minimal, 'published package supplies cordis and minimal presets');
await copyComposition(presetRoots, cordis, 'workdsh-skills', 'WorkDSH Skills');
await copyComposition(presetRoots, minimal, 'workdsh-minimal', 'WorkDSH Minimal');

try {
  const { address, cookie } = await startHost(true);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  try {
    page.on('request', request => {
      const pathname = new URL(request.url()).pathname;
      if (/agentPreset|agent-preset|skills/i.test(pathname)) {
        const detail = ['/api/agentPresets/select', '/api/skills/list'].includes(pathname) ? ` ${request.postData()}` : '';
        console.log(`TRACE: ${request.method()} ${pathname}${detail}`);
        if (pathname === '/api/agentPresets/select') {
          activeAgentId = JSON.parse(request.postData()).payload.args.agentId;
        }
      }
    });
    page.on('response', async response => {
      if (new URL(response.url()).pathname === '/api/skills/list') {
        const body = await response.json();
        const names = body?.result?.value?.skills?.map(skill => skill.name) ?? [];
        console.log(`TRACE: skills/list ${response.status()} ${names.includes('cordis-plugin-development') ? 'with-cordis' : 'without-cordis'} (${names.length})`);
      }
    });
    await page.context().addCookies(cookie.split('; ').map(pair => {
      const at = pair.indexOf('=');
      return { name: pair.slice(0, at), value: pair.slice(at + 1), url: address, httpOnly: true, sameSite: 'Strict' };
    }));
    await page.goto(address, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Continue', exact: true }).waitFor({ state: 'visible', timeout: 10_000 })
      .then(() => page.getByRole('button', { name: 'Continue', exact: true }).click()).catch(() => {});
    await page.getByRole('button', { name: 'Configure later', exact: true }).waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => page.getByRole('button', { name: 'Configure later', exact: true }).click()).catch(() => {});

    await expect(page.getByRole('button', { name: /Standard mode|标准模式/i })).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: /Standard mode|标准模式/i }).click();
    await expect(page.getByText('WorkDSH Skills', { exact: true })).toBeVisible();
    await expect(page.getByText('WorkDSH Minimal', { exact: true })).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: /Choose workspace|选择工作区/i }).click();
    await page.getByText('WorkDSH Probe', { exact: true }).last().click();

    const composer = page.locator('textarea, [contenteditable="true"]').last();
    await expect(composer).toBeVisible();
    await page.getByRole('button', { name: /Standard mode|标准模式/i }).click();
    const initialSkillsSelect = page.waitForResponse(response => new URL(response.url()).pathname === '/api/agentPresets/select');
    await page.getByText('WorkDSH Skills', { exact: true }).click();
    assert.ok((await initialSkillsSelect).ok(), 'initial blank-session preset switch succeeded');
    await expect(page.getByRole('button', { name: /WorkDSH Skills/ })).toBeVisible();
    await page.waitForTimeout(250);
    await composer.fill('/');
    await expect(page.getByText('cordis-plugin-development', { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('editing-cordis-compositions', { exact: true })).toBeVisible();
    await composer.fill('');
    await page.keyboard.press('Escape');
    await expect(page.getByText('cordis-plugin-development', { exact: true })).not.toBeVisible();
    await page.getByRole('button', { name: /WorkDSH Skills/ }).click();
    const selectMinimal = page.waitForResponse(response => new URL(response.url()).pathname === '/api/agentPresets/select');
    await page.getByText('WorkDSH Minimal', { exact: true }).click();
    assert.ok((await selectMinimal).ok(), 'blank-session preset switch succeeded');
    await expect(page.getByRole('button', { name: /WorkDSH Minimal/ })).toBeVisible();
    await page.waitForTimeout(250);
    const minimalList = page.waitForResponse(response => new URL(response.url()).pathname === '/api/skills/list');
    await composer.fill('/');
    const minimalBody = await (await minimalList).json();
    const minimalNames = minimalBody?.result?.value?.skills?.map(skill => skill.name) ?? [];
    assert.ok(!minimalNames.includes('cordis-plugin-development'));
    assert.ok(!minimalNames.includes('editing-cordis-compositions'));
    await expect(page.getByText('cordis-plugin-development', { exact: true })).not.toBeVisible();
    await expect(page.getByText('editing-cordis-compositions', { exact: true })).not.toBeVisible();
    await composer.fill('');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /WorkDSH Minimal/ }).click();
    const selectSkills = page.waitForResponse(response => new URL(response.url()).pathname === '/api/agentPresets/select');
    await page.getByText('WorkDSH Skills', { exact: true }).click();
    assert.ok((await selectSkills).ok(), 'second blank-session preset switch succeeded');
    await page.waitForTimeout(250);
    await composer.fill('/');
    await expect(page.getByText('cordis-plugin-development', { exact: true })).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: resolve(root, '.artifacts/preset-skills.png'), fullPage: true });
    console.log('PASS: native picker switched one blank session between presets and refreshed the official skill directory');

    await composer.fill('P0-03 nonblank lock probe');
    const promptResponse = page.waitForResponse(response => /prompt/i.test(new URL(response.url()).pathname));
    await composer.press('Enter');
    await promptResponse;
    await expect(page.getByText('P0-03 nonblank lock probe', { exact: true }).last()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/MISSING_CREDENTIAL/).last()).toBeVisible({ timeout: 10_000 });
    assert.ok(activeAgentId, 'session agent id was observed through the public select request');
    const locked = await page.evaluate(async ({ agentId }) => {
      const response = await fetch('/api/agentPresets/select', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'client-request',
          rpcId: crypto.randomUUID(),
          method: 'agentPresets/select',
          payload: { args: { agentId, agentPreset: 'workdsh-minimal' } },
        }),
      });
      return response.json();
    }, { agentId: activeAgentId });
    assert.equal(locked.result?.ok, false);
    assert.equal(locked.result?.error?.code, 'agent-preset/locked');
    console.log('PASS: the official Host rejected a preset change after the Session became nonblank');

    // A remains live while a second browser page creates B through the native UI.
    const firstAgentId = activeAgentId;
    const secondPage = await page.context().newPage();
    try {
      await secondPage.goto(address, { waitUntil: 'domcontentloaded' });
      await secondPage.getByRole('button', { name: 'Continue', exact: true }).waitFor({ state: 'visible', timeout: 10_000 })
        .then(() => secondPage.getByRole('button', { name: 'Continue', exact: true }).click()).catch(() => {});
      await secondPage.getByRole('button', { name: 'Configure later', exact: true }).waitFor({ state: 'visible', timeout: 5_000 })
        .then(() => secondPage.getByRole('button', { name: 'Configure later', exact: true }).click()).catch(() => {});
      await secondPage.getByRole('button', { name: /New session|新会话/i }).first().click();
      await secondPage.getByRole('button', { name: 'Configure later', exact: true }).waitFor({ state: 'visible', timeout: 5_000 })
        .then(() => secondPage.getByRole('button', { name: 'Configure later', exact: true }).click()).catch(() => {});
      await secondPage.getByRole('button', { name: /Choose workspace|选择工作区/i }).click();
      await secondPage.getByText('WorkDSH Probe', { exact: true }).last().click();
      await secondPage.getByRole('button', { name: /Standard mode|标准模式|WorkDSH Skills/i }).click();
      const secondSelect = secondPage.waitForResponse(response => new URL(response.url()).pathname === '/api/agentPresets/select');
      await secondPage.getByText('WorkDSH Minimal', { exact: true }).click();
      const selection = await secondSelect;
      assert.ok(selection.ok());
      const secondAgentId = JSON.parse(selection.request().postData()).payload.args.agentId;
      assert.notEqual(secondAgentId, firstAgentId);
      const [firstCatalog, secondCatalog] = await Promise.all([
        listSkills(address, cookie, firstAgentId), listSkills(address, cookie, secondAgentId),
      ]);
      assert.ok(firstCatalog.result.value.skills.some(skill => skill.name === 'cordis-plugin-development'));
      assert.deepEqual(secondCatalog.result.value.skills, []);
      await secondPage.getByRole('button', { name: /WorkDSH Minimal/ }).click();
      const switchSecond = secondPage.waitForResponse(response => new URL(response.url()).pathname === '/api/agentPresets/select');
      await secondPage.getByText('WorkDSH Skills', { exact: true }).click();
      assert.ok((await switchSecond).ok());
      const [firstAfter, secondAfter] = await Promise.all([
        listSkills(address, cookie, firstAgentId), listSkills(address, cookie, secondAgentId),
      ]);
      assert.deepEqual(firstAfter.result.value.skills, firstCatalog.result.value.skills);
      assert.ok(secondAfter.result.value.skills.some(skill => skill.name === 'cordis-plugin-development'));
      console.log('PASS: two live Sessions have independent catalogs; switching B leaves nonblank A unchanged');
    } catch (error) {
      await secondPage.screenshot({ path: resolve(root, '.artifacts/preset-second-session-failure.png'), fullPage: true }).catch(() => {});
      console.error((await secondPage.locator('body').innerText()).slice(0, 3_000));
      throw error;
    } finally {
      await secondPage.close();
    }
  } catch (error) {
    await page.screenshot({ path: resolve(root, '.artifacts/preset-skills-failure.png'), fullPage: true }).catch(() => {});
    console.error((await page.locator('body').innerText()).slice(0, 5_000));
    throw error;
  } finally {
    await browser.close();
  }

  await stopServer();
  server = undefined;
  const { address: restartAddress, cookie: restartCookie } = await startHost();
  const restartBody = await listSkills(restartAddress, restartCookie, activeAgentId);
  const restartNames = restartBody?.result?.value?.skills?.map(skill => skill.name) ?? [];
  assert.ok(restartNames.includes('cordis-plugin-development'));
  assert.ok(restartNames.includes('editing-cordis-compositions'));
  console.log(`PASS: restarted Host reconstructed the Session preset and returned ${restartNames.length} official skills`);

  await stopServer();
  server = undefined;
  copyFileSync(
    resolve(userRoot, 'workdsh-minimal/agent.cordis.yml'),
    resolve(userRoot, 'workdsh-skills/agent.cordis.yml'),
  );
  const { address: mutatedAddress, cookie: mutatedCookie } = await startHost();
  const mutatedBody = await listSkills(mutatedAddress, mutatedCookie, activeAgentId);
  const mutatedNames = mutatedBody?.result?.value?.skills?.map(skill => skill.name) ?? [];
  assert.equal(mutatedNames.length, 0);
  console.log('PASS: after a preset file mutation and Host restart, the historical Session resolved the new composition for the same preset id');

  await stopServer();
  server = undefined;
  copyFileSync(
    resolve(SHIPPED_PRESET_ROOT, 'cordis/agent.cordis.yml'),
    resolve(userRoot, 'workdsh-skills/agent.cordis.yml'),
  );
  const { address: restoredAddress, cookie: restoredCookie } = await startHost();
  const restoredBody = await listSkills(restoredAddress, restoredCookie, activeAgentId);
  const restoredNames = restoredBody?.result?.value?.skills?.map(skill => skill.name) ?? [];
  assert.ok(restoredNames.includes('cordis-plugin-development'));
  assert.ok(restoredNames.includes('editing-cordis-compositions'));

  await stopServer();
  server = undefined;
  rmSync(resolve(userRoot, 'workdsh-skills'), { recursive: true, force: true });
  const { address: deletedAddress, cookie: deletedCookie } = await startHost();
  const deletedBody = await listSkills(deletedAddress, deletedCookie, activeAgentId);
  assert.equal(deletedBody?.result?.ok, true);
  assert.deepEqual(deletedBody?.result?.value?.skills, []);
  console.log('OBSERVED: after preset deletion and Host restart, skills/list silently returned an empty directory for the historical Session');
} finally {
  await stopServer();
}
