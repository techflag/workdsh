import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { chromium, expect } from '@playwright/test';

const root = fileURLToPath(new URL('..', import.meta.url));
const artifacts = join(root, '.artifacts/upgrade017-acceptance');
const home = await realpath(await mkdtemp(join(tmpdir(), 'workdsh-office-native-')));
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
const diagnostics = [];
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
// Exercise installed packages in a fresh isolated Profile.
try {
  const tarballs = [];
  for (const directory of ['packages/providers/identity-local', 'packages/plugins/audit', 'packages/plugins/access', 'packages/plugins/skills', 'packages/plugins/experts', 'packages/plugins/office', 'packages/plugins/library', 'packages/plugins/projects', 'packages/bundle']) {
    const manifest = JSON.parse(await readFile(join(root, directory, 'package.json'), 'utf8'));
    await command(pnpm, ['--filter', manifest.name, 'pack', '--pack-destination', artifacts], root);
    tarballs.push(join(artifacts, `${manifest.name}-${manifest.version}.tgz`));
  }
  const fixture = join(home, 'probe-client'); await mkdir(fixture);
  await writeFile(join(fixture, 'package.json'), JSON.stringify({ name: 'workdsh-office-native-probe', version: '0.0.0', type: 'module', exports: { '.': './index.js', './client': './client.js' }, dsh: { bundle: { patch: './patch.yml' }, client: { platform: 'web', inject: ['@deepseek-ai/dsh-client-ui-sidebar-right', '@deepseek-ai/dsh-client-ui-sidebar-documentpreview'] } } }));
  await writeFile(join(fixture, 'patch.yml'), '- insert:\n    - id: office-native-probe\n      name: workdsh-office-native-probe\n');
  await writeFile(join(fixture, 'index.js'), `import {appendFile} from 'node:fs/promises';
export const inject=['llm'];
export function apply(ctx){ctx.on('llm/stream',async function*(options){
const messages=JSON.stringify(options.messages);const result={library:messages.includes('LIBRARY_ACCEPT_017'),project:messages.includes('PROJECT_ACCEPT_017')};
await appendFile(${JSON.stringify(join(home,'model-checks.jsonl'))},JSON.stringify(result)+'\\n');
yield {type:'block-start',index:0,blockType:'text'};yield {type:'block-end',index:0,block:{type:'text',text:result.library&&result.project?'PROJECT_CHAIN_ACCEPTED':'升级验收任务'}};yield {type:'finish',reason:{kind:'stop'}};
});}`);
  await writeFile(join(fixture, 'client.js'), `window.__ModuleLoader__.load({id:'workdsh-office-native-probe',factory:function(){return {inject:['sidebarRight','documentPreviews'],apply:function(ctx){ctx.effect(function(){window.officeNativeProbe={files:function(sid){ctx.sidebarRight.openTabIn(sid,'files')},registered:function(){return ctx.documentPreviews.getSnapshot().map(d=>d.id)},candidates:function(path){return ctx.documentPreviews.candidates(path).map(d=>({id:d.id,title:d.title()}))}};return function(){delete window.officeNativeProbe}})}}}});`);
  await command(pnpm, ['pack', '--pack-destination', artifacts], fixture); tarballs.push(join(artifacts, 'workdsh-office-native-probe-0.0.0.tgz'));
  for (const kind of ['docx','pptx','xlsx']) await writeFile(join(workspace, 'input.'+kind), await readFile(join(root, 'tests/fixtures/upgrade017/input.'+kind)));
  await writeFile(join(workspace, 'input.csv'), [
    '单号,供应商,物料编码,物料名称,数量,单价,金额,交货日期,备注',
    'CG2026091701,深圳市华强电子科技集团股份有限公司宝安分公司采购中心,MAT-001,"贴片电容 0402, 100nF",500,0.12,60.00,2026-09-20,常规采购',
    'CG2026091701,深圳市华强电子科技集团股份有限公司宝安分公司采购中心,MAT-002,贴片电阻 0603 10kΩ,1000,0.05,50.00,2026-09-20,"含""加急""备注"',
    'CG2026091702,东莞市立讯精密工业股份有限公司,MAT-010,连接器 Type-C 16P,200,1.85,370.00,2026-09-25,',
  ].join('\n'));
  await writeFile(join(workspace,'input.xls'),await readFile(join(root,'tests/fixtures/upgrade017/input.xls')));
  await writeFile(join(workspace,'input.tsv'),'名称\t数量\nTSV_ACCEPTANCE\t42\n');
  await cli('--profile', 'experts', '--from-default-profile', 'web', '--dump-config');
  // Exercise the same fresh-profile path used by users. Prefer the local pnpm
  // store, but allow missing transitive metadata to be fetched: a clean machine
  // cannot satisfy a first install with --offline. protobufjs is the sole
  // transitive package in this stack that declares an install script, so keep
  // pnpm's build policy explicit and narrowly scoped.
  await cli('plugin', '--profile', 'experts', 'add', ...tarballs, '--prefer-offline', '--allow-build=protobufjs');
  pass('Nine product Profile layers plus isolated diagnostic installed outside checkout');
  let host = await start();
  const listed = await api(host, 'list');
  assert.ok(listed.items.length >= 3);
  pass('Packaged expert Host and real local identity/access/audit serve defaults');
  const expertId = listed.items[0].id;
  // Seed an actual expert Session through the public API for workspace previews.
  const summonPlan = await api(host, 'prepare-execution', { expertId, workspaceRef: workspace, workspaceId: String(workspaceId), draftText: '探针：首个工作区会话。' });
  const summonCreated = await api(host, 'create-execution', { executionPlanId: summonPlan.executionPlanId, operationId: 'probe-first-session' });
  const boundSessionId = summonCreated.sessionId ?? summonCreated.binding?.sessionId;
  assert.ok(boundSessionId, 'first create-execution returned no sessionId: ' + JSON.stringify(summonCreated).slice(0, 400));
  await api(host, 'verify-binding', { sessionId: boundSessionId });
  pass('First create-execution before any page load produced a real bound Session');
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', error => browserErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });
  page.on('response', async response => {
    if (!response.url().endsWith('/api/workdsh-experts')) return;
    try { const body = await response.json(); if (!body?.ok) browserErrors.push('expert API failure: ' + JSON.stringify(body?.error ?? body).slice(0, 400)); } catch {}
  });
  await page.context().addCookies(host.cookie.split('; ').map(pair => { const at = pair.indexOf('='); return { name: pair.slice(0, at), value: pair.slice(at + 1), url: host.address }; }));
  await page.goto(host.address);
  for (const name of ['Continue', 'Configure later']) await page.getByRole('button', { name, exact: true }).click({ timeout: 4000 }).catch(() => {});
  // Let the restored Session settle before touching the right sidebar.
  await page.locator('[contenteditable="true"]').first().waitFor({ timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.waitForFunction(() => window.officeNativeProbe);
  assert.ok((await page.evaluate(() => window.officeNativeProbe.registered())).includes('workdsh-office'));
  // Record any pointer fallback separately from ordinary UI interactions.
  const clickWithFallback = async (locator, timeout) => {
    const failure = await locator.click({ timeout }).then(() => null).catch(error => String(error.message).split('\n')[0]);
    if (!failure) return;
    diagnostics.push('Pointer fallback: '+failure);
    console.log('DIAGNOSTIC: pointer click hung (' + failure + '); dispatching DOM click');
    await locator.evaluate(el => el.click()).catch(() => {});
  };
  // The right sidebar keeps a collapsed default in a fresh home, and
  // sidebarRight.openTabIn is a silent no-op unless the Session's tab store was
  // adopted by mounting the panel. Open the
  // sidebar, click the guide's 'Workspace files' card, and the Files tab lists
  // the session workspace; openTabIn stays as the belt-and-braces fallback.
  const openSidebar = page.getByRole('button', { name: 'Open right sidebar', exact: true });
  if (await openSidebar.isVisible().catch(() => false)) {
    await clickWithFallback(openSidebar, 8000);
    await page.waitForTimeout(1200);
  }
  const filesCard = page.getByText('Workspace files', { exact: true }).first();
  if (await filesCard.isVisible().catch(() => false)) {
    await clickWithFallback(filesCard, 8000);
    await page.waitForTimeout(1500);
  }
  const docxEntry = page.getByText('input.docx', { exact: true }).first();
  if (!(await docxEntry.isVisible().catch(() => false))) {
    await page.evaluate(sid => window.officeNativeProbe.files(sid), boundSessionId).catch(() => {});
    await page.waitForTimeout(2000);
  }
  assert.ok(await docxEntry.isVisible().catch(() => false), 'Files tab never listed input.docx after the sidebar prologue');
  await page.screenshot({path:join(artifacts,'files.png')});
  for (const kind of ['docx','pptx','xlsx','xls','csv','tsv']) {
    const entry = page.getByText('input.'+kind, {exact:true}).first();
    if (!(await entry.isVisible().catch(() => false))) {
      // The previous kind leaves its editor tab active; bring the Files tab
      // forward, then fall back to openTabIn once before clicking the entry.
      const filesTab = page.getByRole('tab', { name: 'Files', exact: true }).first();
      if (await filesTab.isVisible().catch(() => false)) await clickWithFallback(filesTab, 5000);
      await page.waitForTimeout(800);
      if (!(await entry.isVisible().catch(() => false))) {
        await page.evaluate(sid => window.officeNativeProbe.files(sid), boundSessionId).catch(() => {});
        await page.waitForTimeout(1500);
      }
    }
    await clickWithFallback(entry, 30000);
    const candidates = await page.evaluate(kind => window.officeNativeProbe.candidates('input.'+kind), kind);
    assert.ok(candidates.length && candidates[0].id !== 'workdsh-office', JSON.stringify(candidates));
    await page.waitForTimeout(2500);
    const body = await page.locator('body').innerText();
    assert.doesNotMatch(body, /File not found|文件不存在|Unable to preview|Failed to load/i);
    if (kind === 'docx') await page.getByText('Office Word test', {exact:true}).waitFor();
    if (['xlsx','xls','csv','tsv'].includes(kind)) await expect(page.locator('body')).toContainText('Count: 1');
    if (kind === 'tsv') assert.match(body,/名称/);
    await writeFile(join(artifacts,kind+'-dom.txt'),body);
    await writeFile(join(artifacts,kind+'-candidates.json'),JSON.stringify(candidates,null,2));
    await page.screenshot({path:join(artifacts,'native-'+kind+'.png')});
    pass('Official resource read and native Office Tab: '+kind);
    if (['docx','pptx','xlsx'].includes(kind)) {
      await page.getByRole('button',{name:'Open with',exact:true}).click();
      await page.getByText('Office 浏览器编辑',{exact:true}).click();
      if (kind==='docx') await page.getByRole('region',{name:'DOCX文档编辑'}).waitFor();
      if (kind==='pptx') await page.getByRole('region',{name:'PPTX 编辑'}).waitFor();
      if (kind==='xlsx') await expect(page.frameLocator('iframe[title="Office 文档编辑"]').locator('#status')).toContainText('Excel 支持',{timeout:30000});
      await page.waitForTimeout(4000);
      await page.screenshot({path:join(artifacts,'editor-'+kind+'.png')});
      pass('Native Open with selects WorkDSH Office editor: '+kind);
    }
  }

  await writeFile(join(artifacts,'buttons.json'),JSON.stringify(await page.getByRole('button').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent,title:n.title,aria:n.getAttribute('aria-label')}))),null,2));
  const call = async (domain, endpoint, payload={}) => {
    const response=await fetch(host.address+'/api/workdsh-'+domain,{method:'POST',headers:{cookie:host.cookie,'content-type':'application/json'},body:JSON.stringify({endpoint,payload})});
    const result=await response.json();assert.equal(result.ok,true,JSON.stringify(result));return result.value;
  };
  const project = await call('projects','create',{name:'升级验收项目'});
  const projectId = project.project?.id ?? project.id;
  let snapshot = await call('projects','get',{projectId});
  await call('projects','update-config',{projectId,expectedRevisionId:snapshot.config.id,config:{instruction:'PROJECT_ACCEPT_017: 检查所引用的验收资料。',capabilities:[]}});
  const asset = await call('library','import',{name:'验收资料.md',mediaType:'text/markdown',base64:Buffer.from('# 验收资料\nLIBRARY_ACCEPT_017').toString('base64'),operationId:'accept017-import'});
  await call('projects','add-asset',{projectId,asset:{nodeId:asset.id,assetId:asset.asset.id,revisionId:asset.revision.id,name:asset.name,kind:asset.asset.kind}});
  await page.goto(host.address+'/?workdsh-view=projects&project='+projectId);
  for (const name of ['Continue','Configure later']) await page.getByRole('button',{name,exact:true}).click({timeout:4000}).catch(()=>{});
  const composer=page.locator('.wd-p-composer textarea');await composer.waitFor();
  await composer.press('@');
  await page.locator('.wd-p-reference-menu').getByLabel('验收资料.md',{exact:false}).check();
  await page.locator('.wd-p-reference-menu header button').click();
  await expect(page.locator('.wd-p-composer-chips')).toContainText('验收资料.md');
  await composer.fill('分析引用的资料，检查项目指令。');
  await page.locator('.wd-p-composer footer .wd-p-primary').click();
  await page.getByText('PROJECT_CHAIN_ACCEPTED',{exact:true}).waitFor({timeout:30000});
  assert.equal(new URL(page.url()).searchParams.get('workdsh-view'),'conversation');
  await expect(page.locator('body')).toContainText('验收资料.md');
  await expect(page.locator('body')).toContainText('升级验收项目');
  snapshot=await call('projects','get',{projectId});assert.equal(snapshot.tasks.length,1);assert.equal(snapshot.tasks[0].references.length,1);
  await page.screenshot({path:join(artifacts,'project-task.png')});
  pass('Project @ selection reaches native conversation; real Agent Loop receives library and project context (fixture model only)');
  await page.getByText('验收资料.md',{exact:true}).first().click();
  await expect(page.locator('body')).toContainText('LIBRARY_ACCEPT_017');
  await page.screenshot({path:join(artifacts,'project-reference-preview.png')});
  pass('Clicking the message reference opens its actual library content on the right');
  const themeColors=[];
  for (const colorScheme of ['light','dark','light']) {
    await page.emulateMedia({colorScheme});
    const pane=page.getByRole('region',{name:'资料引用预览',exact:true});
    await expect(pane).toContainText('LIBRARY_ACCEPT_017');
    await expect.poll(()=>page.locator('body').evaluate(el=>el.hasAttribute('data-ds-dark-theme'))).toBe(colorScheme==='dark');
    const colors=await pane.evaluate(el=>{
      const reference=document.createElement('span');
      reference.style.cssText='background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary)';el.append(reference);
      const actual=getComputedStyle(el),expected=getComputedStyle(reference);
      const result={background:actual.backgroundColor,color:actual.color,expectedBackground:expected.backgroundColor,expectedColor:expected.color};reference.remove();return result;
    });
    assert.equal(colors.background,colors.expectedBackground);assert.equal(colors.color,colors.expectedColor);
    assert.notEqual(colors.background,colors.color);themeColors.push(colors);
    await page.screenshot({path:join(artifacts,'reference-theme-'+colorScheme+'.png')});
  }
  assert.notEqual(themeColors[0].background,themeColors[1].background);
  assert.deepEqual(themeColors[0],themeColors[2]);
  await writeFile(join(artifacts,'reference-theme-colors.json'),JSON.stringify(themeColors,null,2));
  pass('Reference preview follows light/dark/light system theme without reload and keeps content readable');
  await browser.close();browser=undefined;await stop();host=await start();
  const restored=await call('projects','get',{projectId});assert.equal(restored.tasks[0].sessionId,snapshot.tasks[0].sessionId);assert.equal(restored.assets[0].revisionId,asset.revision.id);
  pass('Cold Host restart preserves project task and exact asset revision');
  browser=await chromium.launch({headless:true});
  const reopened=await browser.newPage({viewport:{width:1440,height:1000}});
  reopened.on('pageerror',error=>browserErrors.push(error.message));
  await reopened.context().addCookies(host.cookie.split('; ').map(pair=>{const at=pair.indexOf('=');return {name:pair.slice(0,at),value:pair.slice(at+1),url:host.address};}));
  await reopened.goto(host.address+'/?workdsh-view=projects&project='+projectId);
  for(const name of ['Continue','Configure later']) await reopened.getByRole('button',{name,exact:true}).click({timeout:4000}).catch(()=>{});
  await reopened.getByRole('button',{name:'任务',exact:true}).click();
  await reopened.locator('.wd-p-task-row').first().click();
  await reopened.getByText('PROJECT_CHAIN_ACCEPTED',{exact:true}).waitFor({timeout:30000});
  await reopened.getByText('验收资料.md',{exact:true}).first().click();
  await expect(reopened.locator('body')).toContainText('LIBRARY_ACCEPT_017');
  await reopened.screenshot({path:join(artifacts,'project-cold-reopened.png')});
  pass('After cold restart the project task reopens with its result and readable reference');
  assert.deepEqual(browserErrors, []);
  await writeFile(join(artifacts,'result.json'),JSON.stringify({checks,browserErrors,diagnostics},null,2));
} catch(error) {
  await writeFile(join(artifacts,'failure.txt'),String(error));
  await writeFile(join(artifacts,'failure-server.log'),log.replace(/token=[^\s]+/g,'token=[redacted]').slice(-20000));
  const page=browser?.contexts()[0]?.pages()[0];
  if(page) {await page.screenshot({path:join(artifacts,'failure.png')}); await writeFile(join(artifacts,'failure-dom.txt'),await page.locator('body').innerText());}
  await writeFile(join(artifacts,'failure-errors.json'),JSON.stringify(browserErrors,null,2));
  throw error;
} finally {await browser?.close();await stop();}
