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
const scenario = process.argv[2];
assert.ok(['writing','research','code'].includes(scenario));
const variant=process.argv[3]||'original';
assert.ok(['original','holdout'].includes(variant));
const artifacts = join(root, `.artifacts/experts-crossdomain-${scenario}${variant==='holdout'?'-holdout':''}-20260913`);
const home = await realpath(await mkdtemp(join(tmpdir(), 'workdsh-experts-crossdomain-')));
await mkdir(artifacts,{recursive:true});
await unlink(join(artifacts,'failure.json')).catch(()=>{});
const workspace=join(home,'workspace');await mkdir(workspace);
const cases={
 writing:{name:'产品公告写作验收专家',need:'为产品团队把事实材料改写为面向用户的简短英文发布公告。明确事实和未发布功能，不虚构客户、效果或发布时间。交付可核验 Markdown 文件；无须新增技能或脚本。',input:'Product: Atlas Notes. Version: 0.4 preview. Available: local Markdown import and keyword search. Not available: cloud sync and team sharing. Price and release date: not confirmed. Audience: individual researchers.',prompt:'读取 input.txt，写一篇80至140个英文单词的用户发布公告到 announcement.md。说明现有功能、preview状态与未支持功能，不虚构价格、日期、客户或性能数据。'},
 research:{name:'资料证据研究验收专家',need:'只根据用户提供的资料比较方案，标注来源、冲突和未知，不联网或把假设当结论。交付带引用的 Markdown 备忘录；无须新增技能或脚本。',input:`[S1] Trial memo, 2026-08-01: Option A setup took 2 hours for 3 users. Option B was not tested.
[S2] Vendor sheet, 2026-08-03: B advertises 30-minute setup; this is not an independent trial.
[S3] Budget note: A cost is 20 USD per user/month. B price is unknown. Cloud data residency is not verified for either option.`,prompt:'读取 input.txt，生成 comparison.md：事实对比表、带[S1]/[S2]/[S3]来源的结论、冲突/证据强弱和后续问题。不把供应商声称当实测，不断言B更快或更便宜；不得联网。'},
 code:{name:'本地工具代码验收专家',need:'为用户实现小型 Node.js 工具，澄清输入边界，实际运行测试后交付源文件和结果，不安装依赖。不为当前样本固定答案，不要求Python。',input:'Build totals.mjs exporting summarize(rows). Each row has {category: nonempty string, amount: finite number}. Sum amounts per category. Accept negative numbers and zero. Empty input returns {}. Reject missing category, non-number and non-finite amounts with TypeError. Use no dependencies.',prompt:'读取 input.txt，实现 totals.mjs 和使用 node:test 的 totals.test.mjs，实际运行测试。交付 verification.md，注明实际测试与限制。不联网或安装依赖。'}
};
if(variant==='holdout'){
 cases.writing.input='Product: Signal Board. Version: 0.7 beta. Available: offline CSV import and saved local filters. Not supported: scheduled reports and server backups. Price and public launch date: unknown. Audience: small operations teams.';
 cases.research.input=`[S1] Evaluation note, 2026-08-15: Option C exported 38 rows in 12 minutes for 6 users. Option D was not evaluated.
[S2] Sales sheet, 2026-08-17: D advertises 8-minute export. This is a vendor statement, not an independent test; conditions are unspecified.
[S3] Pricing note, date unknown: C is 12 EUR per user/month. D is listed at 18 EUR, but its billing unit and period are unknown. Security review status is unknown for both options.`;
 cases.research.prompt='读取 input.txt，生成 comparison.md：C/D事实对比表、带[S1]/[S2]/[S3]来源的结论、冲突/证据强弱和后续问题。不把供应商声称当实测，不断言D更快或更便宜；不得联网。';
}
const test=cases[scenario];await writeFile(join(workspace,'input.txt'),test.input);
const inputHash=createHash('sha256').update(test.input).digest('hex');
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

  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',e=>browserErrors.push(e.message));
  await page.context().addCookies(host.cookie.split('; ').map(pair=>{const at=pair.indexOf('=');return{name:pair.slice(0,at),value:pair.slice(at+1),url:host.address}}));
  async function publishAndSummon(expertId){
    const detail=await api(host,'get',{expertId}); const validation=await api(host,'validate',{expertId,draftRevision:detail.draft.revision}); assert.ok(validation.publishable,JSON.stringify(validation.issues));
    await page.goto(`${host.address}/${expertDraftUrl(expertId)}`);
    for(const n of ['Continue','Configure later'])await page.getByRole('button',{name:n,exact:true}).click({timeout:3000}).catch(()=>{});
    await expect(page.getByRole('dialog',{name:'编辑专家草稿',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'发布',exact:true}).click();
    await page.getByRole('button',{name:'确认发布此版本',exact:true}).click();
    await expect(page.getByRole('dialog',{name:'发布成功',exact:true})).toBeVisible();
    const response=page.waitForResponse(r=>r.url().endsWith('/api/workdsh-experts')&&r.request().postDataJSON()?.endpoint==='create-execution');
    await page.getByRole('button',{name:'去试试',exact:true}).click();
    const creation=(await(await response).json()).value;await api(host,'verify-binding',{sessionId:creation.sessionId});
    await expect(page.locator('[contenteditable="true"]').first()).toBeVisible();return creation.sessionId;
  }
  await page.route('**/api/workdsh-experts',async route=>{const b=route.request().postDataJSON();if(b.endpoint==='prepare-execution'){b.payload={...b.payload,workspaceRef:workspace,workspaceId};return route.continue({postData:JSON.stringify(b)})}return route.continue()});
  async function eventsFor(sid){const rel=(await readdir(join(home,'sessions'),{recursive:true})).find(x=>x.endsWith(`${sid}/session.v3.jsonl.zstd`));if(!rel)return[];const {stdout}=await exec('zstd',['-dc',join(home,'sessions',rel)],{maxBuffer:32*1024*1024});return stdout.trim().split('\n').map(JSON.parse)}
  async function runTurn(sid,prompt,label){
    const editor=page.locator('[contenteditable="true"]').first();await editor.fill(prompt);await editor.press('Enter');
    const deadline=Date.now()+300000;let rows=[];
    while(Date.now()<deadline){await new Promise(r=>setTimeout(r,5000));rows=await eventsFor(sid);if(rows.some(x=>x.type==='turn/end'))break;}
    assert.equal(rows.filter(x=>x.type==='turn/end').at(-1)?.data.reason.kind,'completed',`${label}: native turn did not complete`);
    await writeFile(join(artifacts,label+'-conversation.txt'),await page.locator('body').innerText());
    const calls=rows.filter(x=>x.type==='tool/call').map(x=>x.data);
    await writeFile(join(artifacts,label+'-trace.json'),JSON.stringify({sessionId:sid,preset:rows[0].agentPreset,tools:calls.map(c=>({name:c.name,arguments:c.arguments})),completed:true},null,2));return calls;
  }
  const seed=await api(host,'create-draft',{operationId:'creator-seed',definition:{name:'公共专家制作验收引导',description:'调用已安装的公共制作指南处理合成需求。',role:'使用 workdsh-expert-manager 引导制作，必须实际加载技能与相关参考。',methodology:'先读取真实指南，按用户需求调用公开专家管理工具创建草稿并校验。',boundaries:'只操作当前隔离合成资料，不联网、不读取凭据、不修改原始材料。不代替用户发布。',deliverables:'可审阅的专家草稿、实际能力与成果标准。',tags:[],examples:[],skillRequirements:[],futureRequirements:[]}});
  const creatorSid=await publishAndSummon(seed.expertId);
  await writeFile(join(artifacts,'running.json'),JSON.stringify({home,workspace,scenario,inputHash,creatorSid},null,2));
  const creatorCalls=await runTurn(creatorSid,`请实际加载 workdsh-expert-manager 并读取相关参考。根据以下需求创建名称为「${test.name}」的一个专家草稿，保留可复用方法、边界和成果标准，调用校验并给出摘要即可，禁止发布或创建重复专家：${test.need} 已知信息足够，不需要追问。`, 'creation');
  assert.ok(creatorCalls.some(c=>c.name==='skill'&&c.arguments.includes('workdsh-expert-manager')),'Real manager Skill load required');
  assert.ok(creatorCalls.some(c=>c.name==='read'&&c.arguments.includes('material-and-methods')),'Material reference read required');
  const listed=await api(host,'list');const items=listed.items.filter(x=>x.name===test.name);assert.equal(items.length,1,'One model-created expert required');
  const created=await api(host,'get',{expertId:items[0].id});await writeFile(join(artifacts,'model-created-expert.json'),JSON.stringify(created,null,2));
  const trialSid=await publishAndSummon(items[0].id);
  const trialCalls=await runTurn(trialSid,test.prompt+' 仅操作当前工作区，不读凭据、不修改 input.txt。','trial');
  assert.ok(trialCalls.some(c=>c.name==='read'&&c.arguments.includes('input.txt')));
  assert.equal(createHash('sha256').update(await readFile(join(workspace,'input.txt'))).digest('hex'),inputHash);
  const files=scenario==='writing'?['announcement.md']:scenario==='research'?['comparison.md']:['totals.mjs','totals.test.mjs','verification.md'];
  for(const f of files)await copyFile(join(workspace,f),join(artifacts,f));
  assert.deepEqual(browserErrors,[]);
  await writeFile(join(artifacts,'report.json'),JSON.stringify({scenario,variant,modelCreation:'completed',actualPublishedExpert:items[0].id,creatorSid,trialSid,nativeTrial:'completed',originalUnchanged:true,files,professionalReview:'pending'},null,2));
  pass('Real model created draft using public guidance, UI published, actual expert completed trial and delivered files');
} catch(error){
  const failedPage=browser?.contexts()[0]?.pages()[0]; if(failedPage){await writeFile(join(artifacts,'failure-text.txt'),await failedPage.locator('body').innerText());await failedPage.screenshot({path:join(artifacts,'failure.png'),fullPage:true});}
  console.error('Cross-domain acceptance failed: '+String(error.message).replaceAll(credential||'\0','[redacted]').replace(/token=[^\s]+/g,'token=[redacted]').slice(0,1200));process.exitCode=1;
  await writeFile(join(artifacts,'failure.json'),JSON.stringify({scenario,error:String(error.message).replaceAll(credential||'\0','[redacted]').replace(/token=[^\s]+/g,'token=[redacted]')},null,2));
} finally{await browser?.close();await stop();await unlink(join(home,'.credentials.yaml')).catch(()=>{});await writeFile(join(artifacts,'host.log'),log.replaceAll(credential||'\0','[redacted]').replace(/token=[^\s]+/g,'token=[redacted]'));}
