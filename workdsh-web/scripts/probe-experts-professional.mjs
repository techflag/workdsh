import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile, realpath, copyFile, unlink, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { randomUUID, createHash } from 'node:crypto';
import { chromium, expect } from '@playwright/test';
import { checkProfessionalSession } from './check-expert-professional-session.mjs';
import { expertDraftUrl } from '../packages/plugins/experts/dist/domain/navigation.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const scenario = process.argv[2] || 'normal';
assert.ok(['normal', 'incomplete', 'dirty'].includes(scenario), 'Scenario must be normal, incomplete or dirty');
const runLabel = process.argv[3] || '';
const confirmed=process.argv[4]==='--confirmed';
assert.ok(!process.argv[4]||confirmed,'Only --confirmed is supported');
assert.ok(!confirmed||scenario==='dirty','Confirmed scope applies only to dirty fixture');
assert.ok(!runLabel || /^[a-z0-9-]{1,40}$/.test(runLabel), 'Run label must contain lowercase letters, digits or hyphens');
const artifacts = join(root, `.artifacts/experts-professional-${scenario}${runLabel ? `-${runLabel}` : ''}`);
const home = await realpath(await mkdtemp(join(tmpdir(), 'workdsh-experts-professional-')));
await mkdir(artifacts, { recursive: true });
await unlink(join(artifacts, 'report.json')).catch(() => {});
const workspace = join(home, 'workspace');
await mkdir(workspace);
const fixtures = join(root, 'tests/fixtures/experts/retail-analysis');
const skillRoot = join(home, 'agents/skills/retail-analysis-acceptance');
await mkdir(skillRoot, { recursive: true });
await copyFile(join(fixtures, 'SKILL.md'), join(skillRoot, 'SKILL.md'));
await copyFile(join(fixtures, `${scenario}.csv`), join(workspace, 'input.csv'));
const inputHash = createHash('sha256').update(await readFile(join(workspace, 'input.csv'))).digest('hex');
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
// Explicit real-model acceptance only. Credential never enters arguments, artifacts or the model workspace.
const require = createRequire(join(root, 'packages/plugins/experts/package.json'));
const { parseDocument, stringify } = require('yaml');
let credential;
try {
  await exec('zstd', ['--version'], { timeout: 5000 });
  const source = parseDocument(await readFile(join(root, '.test-runtime/preview/.credentials.yaml'), 'utf8')).toJSON();
  credential = source.refs?.DEEPSEEK_API_KEY;
  assert.ok(typeof credential === 'string' && credential.trim(), 'Configure the preview DeepSeek model first');
  await writeFile(join(home, '.credentials.yaml'), stringify({ version: 1, records: {}, refs: { DEEPSEEK_API_KEY: credential } }), { mode: 0o600 });
  const tarballs = [];
  for (const directory of ['packages/providers/identity-local', 'packages/plugins/audit', 'packages/plugins/access', 'packages/plugins/skills', 'packages/plugins/experts', 'packages/bundle']) {
    const manifest = JSON.parse(await readFile(join(root, directory, 'package.json'), 'utf8'));
    await command(pnpm, ['--filter', manifest.name, 'pack', '--pack-destination', artifacts], root);
    tarballs.push(join(artifacts, `${manifest.name}-${manifest.version}.tgz`));
  }
  await cli('--profile', 'experts', '--from-default-profile', 'web', '--dump-config');
  await cli('plugin', '--profile', 'experts', 'add', ...tarballs, '--offline');
  const host = await start();
  pass('Six independent installed packages use a temporary Home and synthetic workspace');
  const drafted = await api(host, 'create-draft', { operationId: 'professional-create', definition: {
    name: '门店经营分析验收专家', description: '核对合成门店数据，拆解指标变化，交付可审计报告。',
    role: '你是业务数据分析专家。用实际计算核对金额、转化与门店贡献；不虚构行业履历或数据。',
    methodology: '先检查数据完整性与计价单位，再计算对比和门店贡献，交叉核对；区分算术驱动、事实和待验证假设。',
    boundaries: '仅操作当前合成工作区。原始 input.csv 不可修改。不得联网、安装依赖、读取凭据或其他用户文件。',
    deliverables: '生成 analysis-results.json 和 analysis-report.md，给出可核验指标、局限及后续行动。',
    tags: ['经营分析', '合成数据'], examples: [{ id: 'retail', title: '月度经营诊断', prompt: (await readFile(join(fixtures, 'prompt.md'), 'utf8')).trim() }],
    skillRequirements: [{ name: 'retail-analysis-acceptance', skillId: 'retail-analysis-acceptance' }], futureRequirements: [],
  } });
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', error => browserErrors.push(error.message));
  await page.context().addCookies(host.cookie.split('; ').map(pair => { const at = pair.indexOf('='); return { name: pair.slice(0, at), value: pair.slice(at + 1), url: host.address }; }));
  await page.goto(`${host.address}/${expertDraftUrl(drafted.expertId)}`);
  for (const name of ['Continue', 'Configure later']) await page.getByRole('button', { name, exact: true }).click({ timeout: 4000 }).catch(() => {});
  await expect(page.getByRole('dialog', { name: '编辑专家草稿', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '发布', exact: true }).click();
  await page.getByRole('button', { name: '确认发布此版本', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '发布成功', exact: true })).toBeVisible();
  const published = await api(host, 'get', { expertId: drafted.expertId });
  assert.equal(published.revision.dependencyLock.length, 1);
  await page.route('**/api/workdsh-experts', async route => {
    const body = route.request().postDataJSON();
    if (body.endpoint === 'prepare-execution') {
      body.payload = { ...body.payload, workspaceRef: workspace, workspaceId };
      return route.continue({ postData: JSON.stringify(body) });
    }
    return route.continue();
  });
  const createdResponse = page.waitForResponse(response => response.url().endsWith('/api/workdsh-experts') && response.request().postDataJSON()?.endpoint === 'create-execution');
  await page.getByRole('button', { name: '去试试', exact: true }).click();
  const creation = (await (await createdResponse).json()).value;
  assert.ok(creation.sessionId);
  await api(host, 'verify-binding', { sessionId: creation.sessionId });
  await expect(page.locator('[contenteditable="true"]').first()).toBeVisible();
  await writeFile(join(artifacts, 'running.json'), JSON.stringify({ home, workspace, expertId: drafted.expertId, sessionId: creation.sessionId, inputHash, revisionId: published.revision.revisionId }, null, 2));
  await page.screenshot({ path: join(artifacts, 'before-send.png'), fullPage: true });
  const editor = page.locator('[contenteditable="true"]').first();
  const prompt = (await readFile(join(fixtures, 'prompt.md'), 'utf8')).trim() + (scenario === 'normal' ? '' : '\n如果字段不足或存在数据问题，仍请生成有限的 JSON 和 Markdown 报告，未知指标写 null，列明缺口与必要追问；不补造事实，不静默填补缺失值。');
  const confirmation = confirmed ? '\n本次合成验收的材料提供方明确确认：完全一致的重复行是导出重复，按精确重复去重；C门店目标期的fen标注正确，按分换算；B目标期客流确实缺失，保持未知，其他完整期间数据保留。标签错误、原始金额实际为CNY只作为反事实敏感性假设，不是主场景事实。以上口径已确认，直接完成JSON和Markdown交付，不需再追问这些已知事项。' : '';
  await editor.fill(prompt + confirmation);
  await editor.press('Enter');
  pass('Real model task sent in the official native conversation');
  const deadline = Date.now() + 360_000;
  while (Date.now() < deadline) {
    const files = await readdir(workspace);
    if (files.includes('analysis-results.json') && files.includes('analysis-report.md')) break;
    await page.screenshot({ path: join(artifacts, 'progress.png'), fullPage: true });
    await writeFile(join(artifacts, 'progress.txt'), await page.locator('body').innerText());
    console.log('Waiting for native model task artifacts');
    await new Promise(resolve => setTimeout(resolve, 15_000));
  }
  assert.ok((await readdir(workspace)).includes('analysis-report.md'), 'Native task timed out before delivering artifacts');
  // Artifacts can appear before the assistant turn ends. Await the native running indicator.
  await expect(page.getByText('Running', { exact: true })).toHaveCount(0, { timeout: 180_000 });
  pass('Native UI reports that the turn finished; durable tool receipts are checked below');
  await page.screenshot({ path: join(artifacts, 'completed.png'), fullPage: true });
  await writeFile(join(artifacts, 'conversation.txt'), await page.locator('body').innerText());
  assert.equal(createHash('sha256').update(await readFile(join(workspace, 'input.csv'))).digest('hex'), inputHash, 'Original input must remain unchanged');
  assert.deepEqual(browserErrors, []);
  await stop();
  const durableEvidence = await checkProfessionalSession(artifacts, scenario);
  pass('Durable native log verifies completed turn and published retained Skill receipt');
  const restarted = await start();
  await api(restarted, 'verify-binding', { sessionId: creation.sessionId });
  pass('Cold restart preserves the fixed expert task binding');
  await writeFile(join(artifacts, 'report.json'), JSON.stringify({ ...durableEvidence, checks: [...durableEvidence.checks, ...checks], coldRestart: 'binding verified' }, null, 2));
} catch (error) {
  const page = browser?.contexts()[0]?.pages()[0];
  if (page) {
    await page.screenshot({ path: join(artifacts, 'failure.png'), fullPage: true });
    await writeFile(join(artifacts, 'failure-text.txt'), await page.locator('body').innerText());
  }
  // Suppress provider exception details which can carry credentials or auth URLs.
  console.error(`Professional acceptance failed: ${String(error.message).replaceAll(credential || '\0', '[redacted]').replace(/token=[^\s]+/g, 'token=[redacted]').slice(0, 1800)}`);
  process.exitCode = 1;
} finally {
  await browser?.close();
  await stop();
  await unlink(join(home, '.credentials.yaml')).catch(() => {});
  await writeFile(join(artifacts, 'host.log'), log.replaceAll(credential || '\0', '[redacted]').replace(/token=[^\s]+/g, 'token=[redacted]'));
}
