import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { chromium, expect } from '@playwright/test';
import { expertDraftUrl } from '../packages/plugins/experts/dist/domain/navigation.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const artifacts = join(root, '.artifacts/experts-package');
const home = await realpath(await mkdtemp(join(tmpdir(), 'workdsh-experts-package-')));
await mkdir(artifacts, { recursive: true });
const workspace = join(home, 'workspace');
await mkdir(workspace);
const skillRoot = join(home, 'agents/skills/expert-authoring-test');
await mkdir(skillRoot, { recursive: true });
await writeFile(join(skillRoot, 'SKILL.md'), '---\nname: expert-authoring-test\ndescription: Safe expert authoring acceptance fixture\n---\nReturn a deterministic acceptance fixture.\n');
await mkdir(join(home, 'storages'));
const workspaceId = randomUUID();
const now = new Date().toISOString();
await writeFile(join(home, 'storages/workspace.json'), JSON.stringify({
  unit: { name: 'workspace', version: 2 },
  global: { initialized: true, workspaceIds: [workspaceId], archivedSessionIds: [] },
  tables: { workspaces: { [workspaceId]: { path: workspace, title: 'Expert test', sessionIds: [], createdAt: now, updatedAt: now } } },
}));
const env = { ...process.env, DSH_HOME: home, DSH_AGENTS_HOME: join(home, 'agents'), PATH: `${join(root, 'node_modules/.bin')}:${dirname(process.execPath)}:${process.env.PATH}` };
const dsh = join(root, 'node_modules/@deepseek-ai/dsh/lib/bin.js');
const pnpm = join(root, 'node_modules/pnpm/bin/pnpm.cjs');
const exec = promisify(execFile);
const command = async (bin, args, cwd = home) => (await exec(process.execPath, [bin, ...args], { cwd, env, timeout: 60_000, maxBuffer: 8 * 1024 * 1024 })).stdout;
const cli = (...args) => command(dsh, args);
let server, browser, log = '';
const browserErrors = [];
const checks = [];
const pass = text => { checks.push(text); console.log(`PASS: ${text}`); };
async function start() {
  log = '';
  server = spawn(process.execPath, [dsh, '--profile', 'experts', '--host', '127.0.0.1', '--port', '0', '--no-open'], { cwd: home, env, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', value => { log += value; });
  server.stderr.on('data', value => { log += value; });
  const deadline = Date.now() + 25_000;
  while (!/http:\/\/127\.0\.0\.1:\d+\/\?token=[\w-]+/.test(log)) {
    if (server.exitCode !== null || Date.now() > deadline) throw new Error(`Host startup failed: ${log.replace(/token=[^\s]+/g, 'token=[redacted]').slice(-2500)}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const loginUrl = log.match(/http:\/\/127\.0\.0\.1:\d+\/\?token=[\w-]+/)[0];
  let response;
  while (!response) {
    try { response = await fetch(loginUrl, { redirect: 'manual', signal: AbortSignal.timeout(2000) }); }
    catch {
      if (server.exitCode !== null || Date.now() > deadline) throw new Error(`Host unavailable: ${log.replace(/token=[^\s]+/g, 'token=[redacted]').slice(-4500)}`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  const cookie = response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  assert.ok(cookie);
  return { address: new URL(loginUrl).origin, cookie };
}
async function stop() {
  if (!server || server.exitCode !== null || server.signalCode !== null) return;
  const stopped = new Promise(resolve => server.once('close', resolve));
  server.kill('SIGTERM');
  const timer = setTimeout(() => server.kill('SIGKILL'), 3000);
  await stopped; clearTimeout(timer);
}
async function api(host, endpoint, payload = {}) {
  const response = await fetch(`${host.address}/api/workdsh-experts`, { method: 'POST', headers: { cookie: host.cookie, 'content-type': 'application/json' }, body: JSON.stringify({ endpoint, payload }), signal: AbortSignal.timeout(15_000) });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.ok, true, JSON.stringify(result));
  return result.value;
}
try {
  const tarballs = [];
  for (const directory of ['packages/providers/identity-local', 'packages/plugins/audit', 'packages/plugins/access', 'packages/plugins/skills', 'packages/plugins/experts', 'packages/bundle']) {
    const manifest = JSON.parse(await readFile(join(root, directory, 'package.json'), 'utf8'));
    await command(pnpm, ['--filter', manifest.name, 'pack', '--pack-destination', artifacts], root);
    tarballs.push(join(artifacts, `${manifest.name}-${manifest.version}.tgz`));
  }
  await cli('--profile', 'experts', '--from-default-profile', 'web', '--dump-config');
  await cli('plugin', '--profile', 'experts', 'add', ...tarballs, '--offline');
  pass('Six independent Profile layers installed outside checkout');
  let host = await start();
  const listed = await api(host, 'list');
  assert.ok(listed.items.length >= 3);
  pass('Packaged expert Host and real local identity/access/audit serve defaults');
  const expertId = listed.items[0].id;
  const plan = await api(host, 'prepare-execution', { expertId });
  assert.equal(plan.missing.length, 0, JSON.stringify(plan.missing));
  const creation = await api(host, 'create-execution', { executionPlanId: plan.executionPlanId, operationId: 'packaged-create' });
  assert.ok(creation.sessionId);
  await api(host, 'verify-binding', { sessionId: creation.sessionId });
  pass('Real native Session created and fixed binding verified');
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', error => browserErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });
  await page.context().addCookies(host.cookie.split('; ').map(pair => { const at = pair.indexOf('='); return { name: pair.slice(0, at), value: pair.slice(at + 1), url: host.address }; }));
  await page.goto(host.address);
  for (const name of ['Continue', 'Configure later']) await page.getByRole('button', { name, exact: true }).click({ timeout: 4000 }).catch(() => {});
  await page.getByRole('button', { name: '专家 · 技能 · 连接器', exact: true }).click();
  await page.getByRole('button', { name: '专家', exact: true }).click();
  await expect(page.getByTestId('workdsh-experts')).toBeVisible();
  await expect(page.getByText(listed.items[0].name, { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: join(artifacts, 'experts-1440.png'), fullPage: true });
  await page.getByRole('button', { name: `查看专家 ${listed.items[0].name}`, exact: true }).click();
  await expect(page.getByRole('button', { name: '召唤专家', exact: true })).toBeEnabled();
  const manageBounds = await page.getByRole('button', { name: '管理专家', exact: true }).boundingBox();
  const closeBounds = await page.locator('.wd-dialog-close').boundingBox();
  assert.ok(manageBounds && closeBounds && manageBounds.x + manageBounds.width <= closeBounds.x, 'Dialog close button must not cover expert management actions');
  await page.screenshot({ path: join(artifacts, 'expert-detail.png'), fullPage: true });
  const detail = await api(host, 'get', { expertId });
  const prompt = detail.revision.definition.examples[0].prompt;
  const summonedResponse = page.waitForResponse(response => response.url().endsWith('/api/workdsh-experts') && response.request().postDataJSON()?.endpoint === 'create-execution');
  await page.getByTitle('用此示例召唤专家（仅填入草稿，不会自动发送）', { exact: true }).first().click();
  const summoned = (await (await summonedResponse).json()).value;
  const editor = page.locator('[contenteditable="true"]').first();
  await expect(editor).toContainText(prompt);
  await page.screenshot({ path: join(artifacts, 'expert-task-draft.png'), fullPage: true });
  assert.equal(await page.evaluate(() => sessionStorage.getItem('workdsh.pending-expert-task-draft')), null);
  pass('Example summon creates a real task, fills its native draft once and clears handoff');
  await editor.fill('用户已输入的内容');
  const stage = target => page.evaluate(({ target }) => {
    sessionStorage.setItem('workdsh.pending-expert-task-draft', JSON.stringify({ sessionId: target, text: '不得覆盖', expiresAt: Date.now() + 60_000 }));
    window.dispatchEvent(new Event('workdsh:expert-draft-staged'));
  }, { target });
  await stage(summoned.sessionId);
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('workdsh.pending-expert-task-draft'))).toBe(null);
  await expect(editor).toContainText('用户已输入的内容');
  await stage('another-session');
  await expect(editor).toContainText('用户已输入的内容');
  assert.notEqual(await page.evaluate(() => sessionStorage.getItem('workdsh.pending-expert-task-draft')), null);
  await page.evaluate(() => sessionStorage.removeItem('workdsh.pending-expert-task-draft'));
  pass('Addressed draft handoff preserves existing user text and ignores other Sessions');
  await page.getByRole('button', { name: '专家 · 技能 · 连接器', exact: true }).click();
  await page.getByRole('button', { name: '专家', exact: true }).click();
  await page.locator('summary.create-expert').click();
  await page.getByRole('menuitem', { name: '创建专家', exact: true }).click();
  await expect(page.locator('[contenteditable="true"]').first()).toContainText('帮我创建一个 XXX 专家');
  pass('Create-expert entry opens a native task with expert-manager guidance');
  // Isolated data only: never publish the user's uploaded financial expert.
  const drafted = await api(host, 'create-draft', { operationId: 'authoring-create', definition: {
    name: '待发布验收专家', description: '用于独立打包验收的安全专家',
    role: 'Read fixture data carefully. ' + 'Distinguish supplied experience from suggested methods. '.repeat(5) + 'Never invent credentials.', methodology: 'Verify every result.',
    boundaries: 'Do not modify user files.', deliverables: 'A fixture summary.',
    tags: Array.from({ length: 8 }, (_, i) => `验收标签 ${i + 1}`),
    examples: Array.from({ length: 6 }, (_, i) => ({ id: `example-${i}`, title: `示例任务 ${i + 1}`, prompt: '读取验收资料，核对数据并生成摘要。不要修改用户文件。' })),
    skillRequirements: [{ name: 'expert-authoring-test' }], futureRequirements: [{ kind: 'connector', key: 'fixture-erp-readonly', description: '隔离验收的可选连接器声明', required: false }],
  } });
  await page.goto(`${host.address}/${expertDraftUrl(drafted.expertId)}`);
  await page.getByRole('button', { name: 'Configure later', exact: true }).click({ timeout: 4000 }).catch(() => {});
  await expect(page.getByRole('dialog', { name: '编辑专家草稿', exact: true })).toBeVisible();
  await expect(page.locator('#ex-name')).toHaveValue('待发布验收专家');
  const draftDialog = page.getByRole('dialog', { name: '编辑专家草稿', exact: true });
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(draftDialog.getByRole('button', { name: '关闭', exact: true })).toHaveCount(1);
    const dialogBounds = await draftDialog.boundingBox();
    assert.ok(dialogBounds.width <= width && dialogBounds.height <= 1000);
    if (width > 800) assert.ok(dialogBounds.width <= 800 && dialogBounds.height <= 840, `Desktop editor stays compact: ${JSON.stringify(dialogBounds)}`);
    const exampleField = page.getByRole('textbox', { name: '示例 1 内容', exact: true });
    await exampleField.scrollIntoViewIfNeeded();
    const fieldBounds = await exampleField.boundingBox();
    const rowBounds = await page.locator('.example-editor-row').first().boundingBox();
    assert.ok(fieldBounds.width >= rowBounds.width - 40, 'Example prompt uses the available row width');
    assert.ok(fieldBounds.height >= 90, 'Example prompt stays readable');
    assert.equal(await draftDialog.evaluate(element => element.scrollWidth > element.clientWidth), false);
    await page.screenshot({ path: join(artifacts, `expert-editor-${width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  pass('Compact editor has one close button and readable full-width examples at desktop, tablet and mobile sizes');
  await page.getByRole('button', { name: '+ 添加技能', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: '配备 expert-authoring-test', exact: true })).toBeChecked();
  await page.getByRole('checkbox', { name: '配备 expert-authoring-test', exact: true }).uncheck();
  await page.getByRole('button', { name: '取消选择', exact: true }).click();
  await expect(page.locator('.equipped-row')).toHaveCount(1);
  await page.getByRole('button', { name: '删除依赖 1', exact: true }).click();
  await page.getByRole('button', { name: '+ 添加技能', exact: true }).click();
  await page.getByRole('textbox', { name: '搜索配备技能', exact: true }).fill('no-such-skill');
  await expect(page.getByText('没有匹配的技能。', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: '搜索配备技能', exact: true }).fill('expert-authoring');
  await page.getByRole('checkbox', { name: '配备 expert-authoring-test', exact: true }).check();
  await page.getByRole('button', { name: '确认选择', exact: true }).click();
  await page.getByRole('button', { name: '保存草稿', exact: true }).click();
  await expect(page.getByText('全部已保存', { exact: true })).toBeVisible();
  const saved = await api(host, 'get', { expertId: drafted.expertId });
  assert.deepEqual(saved.draft.definition.skillRequirements, [{ name: 'expert-authoring-test', skillId: 'expert-authoring-test' }]);
  await page.reload();
  await page.getByRole('button', { name: 'Configure later', exact: true }).click({ timeout: 4000 }).catch(() => {});
  await expect(page.locator('.equipped-row')).toContainText('expert-authoring-test');
  await page.screenshot({ path: join(artifacts, 'expert-skill-selection.png'), fullPage: true });
  pass('Real Skill selection supports search, cancellation, reference removal, stable save and reload without uninstalling the shared Skill');

  assert.equal((await api(host, 'get', { expertId: drafted.expertId })).expert.publishedRevisionRef, undefined);
  await page.getByRole('button', { name: '发布', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '确认发布专家', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog', { name: '确认发布专家', exact: true })).toContainText('expert-authoring-test');
  assert.equal((await api(host, 'get', { expertId: drafted.expertId })).expert.publishedRevisionRef, undefined);
  const usagePreview = page.getByRole('region', { name: '专家使用预览', exact: true });
  for (const title of ['会交付什么', '怎么处理你的任务', '使用前需要了解']) {
    await expect(usagePreview.getByRole('heading', { name: title, exact: true })).toBeVisible();
  }
  await expect(usagePreview).toContainText('Never invent credentials.');
  await expect(usagePreview).toContainText('示例任务 6');
  await expect(usagePreview).toContainText('暂不支持接入');
  for (const width of [1440, 1920, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await expect(page.getByRole('button', { name: '确认发布此版本', exact: true })).toBeInViewport();
    await page.screenshot({ path: join(artifacts, `expert-use-preview-${width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await usagePreview.getByText('专业角色与经验', { exact: true }).click();
  await page.screenshot({ path: join(artifacts, 'expert-professional-preview.png'), fullPage: true });
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '编辑专家草稿', exact: true })).toBeVisible();
  assert.equal((await api(host, 'get', { expertId: drafted.expertId })).expert.publishedRevisionRef, undefined);
  await page.getByRole('button', { name: '发布', exact: true }).click();
  let confirmRequests = 0;
  const countConfirm = request => { if (request.url().endsWith('/api/workdsh-experts') && request.postDataJSON()?.endpoint === 'confirm-publish') confirmRequests++; };
  page.on('request', countConfirm);
  const stalePreview = async route => {
    if (route.request().postDataJSON()?.endpoint !== 'request-publish-confirmation') return route.continue();
    const response = await route.fetch();
    const body = await response.json();
    body.value.definitionDigest = 'changed-after-preview';
    await route.fulfill({ response, json: body });
  };
  await page.route('**/api/workdsh-experts', stalePreview);
  await page.getByRole('button', { name: '确认发布此版本', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('待发布内容或技能版本已变化');
  assert.equal(confirmRequests, 0, 'A changed digest must not exchange a proof');
  assert.equal((await api(host, 'get', { expertId: drafted.expertId })).expert.publishedRevisionRef, undefined);
  await page.unroute('**/api/workdsh-experts', stalePreview);
  page.off('request', countConfirm);
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await page.getByRole('button', { name: '发布', exact: true }).click();
  pass('Full saved usage preview supports long professional content, six examples, cancellation and responsive pinned confirmation; changed digests cannot exchange proof or publish');
  await page.getByRole('button', { name: '确认发布此版本', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '发布成功', exact: true })).toBeVisible();
  await page.screenshot({ path: join(artifacts, 'expert-published.png'), fullPage: true });
  const published = await api(host, 'get', { expertId: drafted.expertId });
  assert.equal(published.revision.dependencyLock.length, 1);
  const publishedResponse = page.waitForResponse(response => response.url().endsWith('/api/workdsh-experts') && response.request().postDataJSON()?.endpoint === 'create-execution');
  await page.getByRole('button', { name: '去试试', exact: true }).click();
  const publishedCreation = (await (await publishedResponse).json()).value;
  await expect(page.locator('[contenteditable="true"]').first()).toBeVisible();
  assert.equal(new URL(page.url()).searchParams.has('expert-draft'), false);
  await api(host, 'verify-binding', { sessionId: publishedCreation.sessionId });
  pass('Draft deep link is read-only until explicit UI confirmation, then publishes a fixed Skill revision and summons a native task');
  await api(host, 'update-draft', { expertId: drafted.expertId, patch: { skillRequirements: [] }, operationId: 'unpublished-skill-removal', expectedRevision: published.expert.revision });
  await page.goto(`${host.address}/?workdsh-view=experts`);
  await page.getByRole('button', { name: 'Configure later', exact: true }).click({ timeout: 4000 }).catch(() => {});
  await page.getByRole('button', { name: '查看专家 待发布验收专家', exact: true }).click();
  const publishedDetail = page.getByRole('dialog', { name: '专家详情', exact: true });
  await expect(publishedDetail.getByText('草稿有修改，尚未发布', { exact: true })).toBeVisible();
  await publishedDetail.locator('summary').filter({ hasText: '配备技能与能力 · 1' }).click();
  const publishedSkills = publishedDetail.getByText('配备技能 · 1', { exact: true });
  await publishedSkills.scrollIntoViewIfNeeded();
  await expect(publishedSkills).toBeVisible();
  await expect(publishedDetail.getByText('expert-authoring-test', { exact: true }).last()).toBeVisible();
  await expect(publishedDetail.getByRole('region', { name: '扩展能力', exact: true })).toContainText('可选 · 暂不支持接入');
  for (const width of [1440, 1920, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: join(artifacts, `expert-unpublished-${width}.png`), fullPage: true });
  }
  await page.getByRole('button', { name: '审阅草稿', exact: true }).click();
  await expect(page.getByText('配备技能 · 0', { exact: true })).toBeVisible();
  await expect(page.getByText('草稿有修改，尚未发布', { exact: true })).toBeVisible();
  assert.equal((await api(host, 'get', { expertId: drafted.expertId })).revision.revisionId, published.revision.revisionId);
  pass('Saved draft Skill changes stay separate from published detail; optional capability declarations are grouped separately and unpublished editor is clearly labeled');
  const expectedCount = (await api(host, 'list')).items.length;
  assert.deepEqual(browserErrors, []);
  pass('Packaged browser expert panel renders without page errors');
  await page.close();
  await stop();
  for (let restart = 0; restart < 2; restart++) {
    host = await start();
    assert.equal((await api(host, 'list')).items.length, expectedCount);
    await api(host, 'verify-binding', { sessionId: creation.sessionId });
    await api(host, 'verify-binding', { sessionId: publishedCreation.sessionId });
    assert.equal((await api(host, 'get', { expertId: drafted.expertId })).revision.revisionId, published.revision.revisionId);
    await stop();
  }
  pass('Two cold restarts preserve experts and the native Session binding');
  await writeFile(join(artifacts, 'report.json'), JSON.stringify({ checks, home, modelExecution: 'not executed' }, null, 2));
} catch (error) {
  const page = browser?.contexts()[0]?.pages()[0];
  if (page) {
    await page.screenshot({ path: join(artifacts, 'failure.png'), fullPage: true });
    await writeFile(join(artifacts, 'failure-text.txt'), await page.locator('body').innerText());
    await writeFile(join(artifacts, 'failure-errors.json'), JSON.stringify(browserErrors, null, 2));
    await writeFile(join(artifacts, 'failure-inputs.json'), JSON.stringify(await page.locator('textarea, [role="textbox"], [contenteditable]').evaluateAll(elements => elements.map(element => element.outerHTML)), null, 2));
  }
  throw error;
} finally {
  await writeFile(join(artifacts, 'host.log'), log.replace(/token=[^\s]+/g, 'token=[redacted]'));
  await browser?.close();
  await stop();
}
