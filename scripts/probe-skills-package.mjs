import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { chromium, expect } from '@playwright/test';

const root = fileURLToPath(new URL('..', import.meta.url));
const artifacts = join(root, '.artifacts/skills-standalone');
await mkdir(artifacts, { recursive: true });
// Outside the checkout: an undeclared dependency cannot leak from ancestor node_modules.
const home = await mkdtemp(join(tmpdir(), 'workdsh-skills-package-'));
const workspace = join(home, 'workspace');
await mkdir(workspace);
const env = { ...process.env, DSH_HOME: home, DSH_AGENTS_HOME: join(home, 'agents'), PATH: `${join(root, 'node_modules/.bin')}:${dirname(process.execPath)}:${process.env.PATH}` };
const dsh = join(root, 'node_modules/@deepseek-ai/dsh/lib/bin.js');
const pnpm = join(root, 'node_modules/pnpm/bin/pnpm.cjs');
const manifest = JSON.parse(await readFile(join(root, 'packages/plugins/skills/package.json'), 'utf8'));
const tarball = join(artifacts, `${manifest.name}-${manifest.version}.tgz`);
const exec = promisify(execFile);
const command = async (bin, args, cwd = home) => (await exec(process.execPath, [bin, ...args], { cwd, env, timeout: 60_000, maxBuffer: 8 * 1024 * 1024 })).stdout;
const cli = (...args) => command(dsh, args);
const fixture = 'standalone-skill';
const skillFile = join(home, 'agents/skills', fixture, 'SKILL.md');
await mkdir(dirname(skillFile), { recursive: true });
await writeFile(skillFile, `---\nname: ${fixture}\ndescription: Standalone package fixture\n---\nORIGINAL\n`);
// WorkDSH-owned local catalog: metadata plus inert payload, installed through
// the same managed import path the browser upload uses.
const catalogSkill = 'catalog-fixture';
const catalogRoot = join(home, 'agents/.workdsh-catalog');
await mkdir(join(catalogRoot, 'icons'), { recursive: true });
await mkdir(join(catalogRoot, 'payloads', catalogSkill), { recursive: true });
await writeFile(join(catalogRoot, 'icons/tiny.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#3ba55d"/></svg>');
await writeFile(join(catalogRoot, 'payloads', catalogSkill, 'SKILL.md'), `---\nname: ${catalogSkill}\ndescription: Catalog install fixture\n---\nCATALOG\n`);
await writeFile(join(catalogRoot, 'catalog.json'), `${JSON.stringify({
  schema: 1,
  kind: 'workdsh-skill-catalog',
  generatedAt: new Date().toISOString(),
  categories: ['开发工具'],
  entries: [
    { name: catalogSkill, title: '目录样例技能', description: '由独立探针生成的目录条目，可通过 ＋ 安装。', categories: ['开发工具'], icon: 'icons/tiny.svg', payload: `payloads/${catalogSkill}`, installable: true },
    { name: 'catalog-over-limit', title: '超限样例技能', description: '超出安装上限的目录条目。', categories: ['开发工具'], installable: false, installLimits: ['文件 481 个超过 400 上限'] },
  ],
}, null, 2)}\n`);
const workspaceId = randomUUID();
const now = new Date().toISOString();
await mkdir(join(home, 'storages'), { recursive: true });
await writeFile(join(home, 'storages/workspace.json'), JSON.stringify({
  unit: { name: 'workspace', version: 2 },
  global: { initialized: true, workspaceIds: [workspaceId], archivedSessionIds: [] },
  tables: { workspaces: { [workspaceId]: { path: workspace, title: 'Standalone test', sessionIds: [], createdAt: now, updatedAt: now } } },
}));
let server, log = '', browser;
const results = [];
const pass = label => { results.push(label); console.log(`PASS: ${label}`); };
async function start() {
  log = '';
  server = spawn(process.execPath, [dsh, '--profile', 'skills', '--host', '127.0.0.1', '--port', '0', '--no-open'], { cwd: home, env, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', value => { log += value; }); server.stderr.on('data', value => { log += value; });
  const deadline = Date.now() + 25_000;
  while (!/http:\/\/127\.0\.0\.1:\d+\/\?token=[\w-]+/.test(log)) {
    if (server.exitCode !== null || Date.now() > deadline) throw new Error(`Host startup failed: ${log.replace(/token=[^\s]+/g, 'token=[redacted]').slice(-3000)}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const loginUrl = log.match(/http:\/\/127\.0\.0\.1:\d+\/\?token=[\w-]+/)[0];
  const address = new URL(loginUrl).origin;
  const response = await fetch(loginUrl, { redirect: 'manual', signal: AbortSignal.timeout(5000) });
  const cookie = response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  assert.ok(cookie);
  return { address, cookie };
}
async function stop() {
  if (!server || server.exitCode !== null || server.signalCode !== null) return;
  const stopped = new Promise(resolve => server.once('close', resolve));
  server.kill('SIGTERM');
  const timer = setTimeout(() => server.kill('SIGKILL'), 3000);
  await stopped; clearTimeout(timer);
}
async function pageFor({ address, cookie }) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.context().addCookies(cookie.split('; ').map(pair => { const at = pair.indexOf('='); return { name: pair.slice(0, at), value: pair.slice(at + 1), url: address }; }));
  await page.goto(address);
  for (const name of ['Continue', 'Configure later']) await page.getByRole('button', { name, exact: true }).waitFor({ state: 'visible', timeout: 4000 }).then(() => page.getByRole('button', { name, exact: true }).click()).catch(() => {});
  return page;
}
async function api(host, endpoint, payload = {}) {
  const response = await fetch(`${host.address}/api/workdsh-skills`, { method: 'POST', headers: { cookie: host.cookie, 'content-type': 'application/json' }, body: JSON.stringify({ endpoint, payload }), signal: AbortSignal.timeout(10_000) });
  return response.json();
}
try {
  await command(pnpm, ['--filter', 'workdsh-plugin-skills', 'pack', '--pack-destination', artifacts], root);
  await cli('--profile', 'skills', '--from-default-profile', 'web', '--dump-config');
  await cli('plugin', '--profile', 'skills', 'add', tarball, '--offline');
  const config = await cli('--profile', 'skills', '--dump-config');
  assert.equal(config.split('id: workdsh-skills').length - 1, 1);
  assert.ok(!config.includes('workdsh-bundle'));
  const installedRoot = join(home, 'profiles/skills/node_modules/workdsh-plugin-skills');
  const installed = JSON.parse(await readFile(join(installedRoot, 'package.json'), 'utf8'));
  assert.equal(installed.version, manifest.version);
  assert.ok(installed.dsh.bundle && installed.dsh.client);
  assert.ok(!(await readFile(join(installedRoot, 'dist/shared.d.ts'), 'utf8')).includes('workdsh-contracts/'));
  pass('Skill tarball installed outside checkout; one independent Profile layer; no product bundle');
  browser = await chromium.launch({ headless: true });
  let host = await start();
  let page = await pageFor(host);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const graph = await page.evaluate(() => window.__DSH_BOOT__.entries.map(row => row.id));
  assert.equal(graph.filter(id => id === manifest.name).length, 1);
  assert.ok(!graph.includes('workdsh-bundle'));
  // Catalog reads: status, metadata merge, icon bytes and eligibility keep
  // Host as the only reader of catalog files.
  const catalogSummary = await api(host, 'catalog');
  assert.equal(catalogSummary.ok, true);
  assert.equal(catalogSummary.value.status, 'ready');
  assert.deepEqual(catalogSummary.value.categories, ['开发工具']);
  const catalogEntry = catalogSummary.value.entries.find(row => row.name === catalogSkill);
  assert.equal(catalogEntry.title, '目录样例技能');
  assert.deepEqual(catalogEntry.categories, ['开发工具']);
  assert.equal(catalogEntry.installed, false);
  assert.equal(catalogEntry.installable, true);
  assert.match(catalogEntry.iconUrl, /^\/api\/workdsh-skills\/icon\?name=catalog-fixture&rev=[0-9a-f]{12}$/);
  const limitedEntry = catalogSummary.value.entries.find(row => row.name === 'catalog-over-limit');
  assert.equal(limitedEntry.installable, false);
  assert.deepEqual(limitedEntry.installLimits, ['文件 481 个超过 400 上限']);
  const iconResponse = await fetch(`${host.address}${catalogEntry.iconUrl}`, { headers: { cookie: host.cookie } });
  assert.equal(iconResponse.status, 200);
  assert.equal(iconResponse.headers.get('content-type'), 'image/svg+xml');
  assert.match(await iconResponse.text(), /<svg/);
  assert.equal((await api(host, 'install-catalog', { name: 'catalog-unknown' })).error.code, 'skill/catalog-entry-unknown');
  assert.equal((await api(host, 'install-catalog', { name: 'catalog-over-limit' })).error.code, 'skill/catalog-entry-over-limit');
  pass('Catalog status, metadata, icon route and install eligibility read real Host facts');
  const nav = page.getByRole('button', { name: '专家 · 技能 · 连接器', exact: true });
  await expect(nav).toHaveCount(1);
  await nav.click();
  await expect(page.getByRole('button', { name: `查看技能 ${fixture}`, exact: true })).toBeVisible();
  // Marketplace surface: real category tab, branded catalog cards and a direct
  // "+" install that lands in the installed grid through the managed import path.
  await expect(page.getByRole('button', { name: '开发工具', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /可安装/ })).toBeVisible();
  await expect(page.getByText('目录样例技能', { exact: true })).toBeVisible();
  const catalogInstall = page.getByRole('button', { name: '安装技能 目录样例技能', exact: true });
  await expect(catalogInstall).toBeVisible();
  await expect(page.getByRole('button', { name: '安装技能 超限样例技能', exact: true })).toBeDisabled();
  // The catalog preview rides the shared Modal shell (workdsh-ui) while plugin
  // classes keep it compact: narrow width, 48px mark and calm 20px title.
  await page.getByRole('button', { name: `查看技能 ${catalogSkill}`, exact: true }).click();
  const previewDialog = page.locator('.wd-dialog.catalog-dialog');
  await expect(previewDialog).toBeVisible();
  const previewWidth = (await previewDialog.boundingBox())?.width ?? 0;
  assert.ok(previewWidth <= 760, `catalog dialog stays narrow, got ${previewWidth}px`);
  const previewMarkWidth = (await previewDialog.locator('.skill-icon.large, .skill-mark.large').first().boundingBox())?.width ?? 0;
  assert.equal(previewMarkWidth, 48);
  assert.equal(await previewDialog.locator('.detail-title h1').evaluate(node => getComputedStyle(node).fontSize), '20px');
  await expect(previewDialog.getByRole('heading', { name: /基本信息/ })).toBeVisible();
  await previewDialog.getByRole('button', { name: '关闭', exact: true }).click();
  await expect(previewDialog).toHaveCount(0);
  await catalogInstall.click();
  await expect(page.getByRole('button', { name: `查看技能 ${catalogSkill}`, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '安装技能 目录样例技能', exact: true })).toHaveCount(0);
  const catalogList = (await api(host, 'list')).value;
  const catalogRow = catalogList.find(row => row.name === catalogSkill);
  assert.equal(catalogRow.state, 'enabled');
  assert.equal(catalogRow.title, '目录样例技能');
  assert.equal(catalogRow.localizedDescription, '由独立探针生成的目录条目，可通过 ＋ 安装。');
  assert.match(catalogRow.iconUrl, /icon\?name=catalog-fixture&rev=/);
  // The catalog offers no shortcut around the global name lock.
  assert.equal((await api(host, 'install-catalog', { name: catalogSkill })).error.code, 'skill/target-exists');
  await page.screenshot({ path: join(artifacts, 'catalog-marketplace.png'), fullPage: true });
  pass('Browser marketplace shows real categories and installs a catalog entry through the managed import path');
  // "我安装的" opens a dedicated installed page (WorkBuddy pattern): back link
  // first, count heading, in-page search and the shared card/batch management.
  const installedEntry = page.getByRole('button', { name: /查看我安装的 \d+ 个技能/ });
  await expect(installedEntry).toBeVisible();
  await page.getByTestId('workdsh-skills').evaluate(element => { element.scrollTop = element.scrollHeight; });
  await installedEntry.click();
  await expect(page.getByTestId('skills-installed')).toBeVisible();
  await expect(page.getByTestId('skills-installed').getByRole('heading', { name: /^我安装的 \d+$/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: '技能市场', exact: true })).toHaveCount(0);
  const backToMarket = page.getByRole('button', { name: '返回全部技能', exact: true });
  await expect(backToMarket).toBeFocused();
  await expect.poll(() => page.getByTestId('workdsh-skills').evaluate(element => element.scrollTop)).toBe(0);
  const installedSearch = page.getByRole('textbox', { name: '搜索已安装的技能', exact: true });
  await installedSearch.fill(catalogSkill);
  await expect(page.getByRole('button', { name: `查看技能 ${catalogSkill}`, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: `查看技能 ${fixture}`, exact: true })).toHaveCount(0);
  await installedSearch.fill('no-such-skill-000');
  await expect(page.getByText('没有匹配的技能', { exact: true })).toBeVisible();
  await installedSearch.fill('');
  await page.getByRole('button', { name: '批量管理', exact: true }).click();
  await page.getByRole('checkbox', { name: `选择技能 ${fixture}`, exact: true }).click();
  await expect(page.getByText('已选择 1 项', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '退出批量', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: `选择技能 ${fixture}`, exact: true })).toHaveCount(0);
  await page.screenshot({ path: join(artifacts, 'installed-page.png'), fullPage: true });
  await backToMarket.click();
  await expect(page.getByRole('heading', { name: '技能市场', exact: true })).toBeVisible();
  await expect(installedEntry).toBeFocused();
  pass('Installed skills open a dedicated page with back link, count heading, in-page search and shared batch management');
  // Bundled skills keep the WorkDSH prefix so the unprefixed `skill-creator`
  // name stays available to the user's own skills; each registers exactly once.
  const bundledSkills = (await api(host, 'list')).value;
  for (const name of ['workdsh-skill-creator', 'workdsh-ppt-design', 'workdsh-word-design', 'workdsh-excel-design', 'workdsh-web-design']) {
    assert.equal(bundledSkills.filter(row => row.name === name).length, 1, `${name} is registered exactly once`);
  }
  // A packaged skill is contributed by this plugin, so its switch is a
  // registry-level suppression (ADR-0029): the installed files stay untouched
  // and the official catalog only loses both invocation surfaces.
  const packagedSkill = 'workdsh-web-design';
  const packagedFile = join(installedRoot, `resources/skills/${packagedSkill}/SKILL.md`);
  const packagedDocument = await readFile(packagedFile, 'utf8');
  assert.equal(bundledSkills.find(row => row.name === packagedSkill).origin, 'plugin');
  await page.getByRole('switch', { name: `停用技能 ${packagedSkill}`, exact: true }).click();
  await expect(page.getByRole('switch', { name: `启用技能 ${packagedSkill}`, exact: true })).toBeVisible();
  const stoppedPackaged = (await api(host, 'list')).value.find(row => row.name === packagedSkill);
  assert.deepEqual([stoppedPackaged.state, stoppedPackaged.manageable, stoppedPackaged.origin, stoppedPackaged.modelInvocable], ['disabled', true, 'plugin', false]);
  assert.equal(await readFile(packagedFile, 'utf8'), packagedDocument);
  const stoppedDetail = (await api(host, 'detail', { name: packagedSkill })).value;
  assert.equal(stoppedDetail.state, 'disabled');
  assert.equal(stoppedDetail.directoryPath, undefined, 'a plugin-owned skill never exposes a write target');
  assert.equal((await api(host, 'update', { name: packagedSkill, document: packagedDocument, expectedRevision: stoppedDetail.revision })).error.code, 'skill/plugin-owned');
  pass('Packaged skill switch suppresses the registry entry without touching the installed plugin files');
  await page.getByRole('button', { name: `查看技能 ${fixture}`, exact: true }).click();
  await page.getByRole('button', { name: '编辑', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'SKILL.md', exact: true });
  const modified = `---\nname: ${fixture}\ndescription: Standalone package fixture\n---\nINDEPENDENT_EDIT\n`;
  await editor.fill(modified);
  await page.getByRole('button', { name: '保存并重新发现', exact: true }).click();
  await expect(editor).toHaveCount(0);
  assert.equal(await readFile(skillFile, 'utf8'), modified);
  const conflict = await api(host, 'update', { name: fixture, document: modified, expectedRevision: 'stale' });
  assert.equal(conflict.error.code, 'skill/revision-conflict');
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await page.getByRole('switch', { name: `停用技能 ${fixture}`, exact: true }).click();
  await expect(page.getByRole('switch', { name: `启用技能 ${fixture}`, exact: true })).toBeVisible();
  await page.getByRole('switch', { name: `启用技能 ${fixture}`, exact: true }).click();
  await expect(page.getByRole('switch', { name: `停用技能 ${fixture}`, exact: true })).toBeVisible();
  await page.getByRole('button', { name: `管理技能 ${fixture}`, exact: true }).click();
  await page.getByRole('menuitem', { name: '卸载', exact: true }).click();
  await page.getByRole('button', { name: '确认卸载', exact: true }).click();
  await expect(page.getByRole('button', { name: `查看技能 ${fixture}`, exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '最近卸载', exact: true }).click();
  await page.getByRole('button', { name: '恢复', exact: true }).click();
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await expect(page.getByRole('button', { name: `查看技能 ${fixture}`, exact: true })).toBeVisible();
  await page.screenshot({ path: join(artifacts, 'standalone.png'), fullPage: true });
  assert.deepEqual(errors, []);
  pass('Independent Client navigation, edit/save/conflict, enable/disable, uninstall/restore write real files');
  await page.close(); await stop();
  await cli('plugin', '--profile', 'skills', 'remove', manifest.name);
  assert.ok(!(await cli('--profile', 'skills', '--dump-config')).includes('id: workdsh-skills'));
  host = await start(); page = await pageFor(host);
  await expect(page.getByRole('button', { name: '专家 · 技能 · 连接器', exact: true })).toHaveCount(0);
  await expect(page.getByText(/新会话|New Session/, { exact: true }).first()).toBeVisible();
  assert.ok(!(await page.evaluate(() => window.__DSH_BOOT__.entries.map(row => row.id))).includes(manifest.name));
  assert.equal((await fetch(`${host.address}/api/workdsh-skills`, { method: 'POST', headers: { cookie: host.cookie }, body: '{}' })).status, 404);
  assert.equal(await readFile(skillFile, 'utf8'), modified);
  pass('Cold removal withdraws Host route and Client/navigation while preserving native Web and user skill files');
  await page.close(); await stop();
  await cli('plugin', '--profile', 'skills', 'add', tarball, '--offline');
  // Repeating the same installation must not add another layer or registration.
  await cli('plugin', '--profile', 'skills', 'add', tarball, '--offline');
  assert.equal((await cli('--profile', 'skills', '--dump-config')).split('id: workdsh-skills').length - 1, 1);
  host = await start(); page = await pageFor(host);
  await page.getByRole('button', { name: '专家 · 技能 · 连接器', exact: true }).click();
  await expect(page.getByRole('button', { name: `查看技能 ${fixture}`, exact: true })).toHaveCount(1);
  assert.equal((await api(host, 'detail', { name: fixture })).value.document, modified);
  // Suppression is Host-side durable state: it survives the profile rewrite and
  // a Host restart, and the reinstalled plugin files are still untouched.
  const stillStopped = (await api(host, 'list')).value.find(row => row.name === packagedSkill);
  assert.deepEqual([stillStopped.state, stillStopped.origin, stillStopped.modelInvocable], ['disabled', 'plugin', false]);
  assert.equal(await readFile(packagedFile, 'utf8'), packagedDocument);
  await page.getByRole('switch', { name: `启用技能 ${packagedSkill}`, exact: true }).click();
  await expect(page.getByRole('switch', { name: `停用技能 ${packagedSkill}`, exact: true })).toBeVisible();
  assert.equal((await api(host, 'list')).value.find(row => row.name === packagedSkill).state, 'enabled');
  pass('Packaged skill suppression survives reinstall and restart, then restores on enable');
  await page.close(); await stop();
  // Absent and corrupted catalogs report honest diagnostics and never break
  // installed-skill management or fabricate an empty marketplace.
  env.WORKDSH_SKILL_CATALOG = join(home, 'agents/.workdsh-catalog-absent');
  host = await start();
  const missing = await api(host, 'catalog');
  assert.equal(missing.value.status, 'missing');
  assert.equal(missing.value.diagnostics[0].code, 'skill/catalog-missing');
  assert.ok((await api(host, 'list')).value.some(row => row.name === catalogSkill));
  await stop();
  delete env.WORKDSH_SKILL_CATALOG;
  await writeFile(join(catalogRoot, 'catalog.json'), '{ not json');
  host = await start();
  const invalid = await api(host, 'catalog');
  assert.equal(invalid.value.status, 'invalid');
  assert.equal(invalid.value.diagnostics[0].code, 'skill/catalog-invalid');
  assert.equal((await api(host, 'install-catalog', { name: catalogSkill })).error.code, 'skill/catalog-entry-unknown');
  await stop();
  pass('Absent and corrupted catalogs degrade to honest diagnostics without breaking management');
  await writeFile(join(artifacts, 'result.json'), JSON.stringify({ version: manifest.version, home, results, modelCalls: 0, liveCliRemoval: 'not claimed' }, null, 2));
} catch (error) {
  console.error(`${String(error)}\n${error.stdout ?? ''}`.replace(/token=[^\s]+/g, 'token=[redacted]'));
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await stop();
}
