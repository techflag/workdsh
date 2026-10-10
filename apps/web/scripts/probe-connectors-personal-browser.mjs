import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, mkdir, realpath } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';

// Explicit previous synthetic personal acceptance Home, never the user's Home.
const root = new URL('../', import.meta.url).pathname;
const home = await realpath(process.argv[2]);
assert.match(home, /^\/private\/tmp\/workdsh-experts-package-[\w-]+$/);
const profile = join(home, 'profiles/experts');
const manifest = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'));
assert.ok(!JSON.stringify(manifest).includes('enterprise'));
const artifacts = join(root, '.artifacts/connectors-personal-browser');
await mkdir(artifacts, { recursive: true });
const env = { PATH: `${join(root, "node_modules/.bin")}:${dirname(process.execPath)}:/usr/bin:/bin`, HOME: process.env.HOME,
  DSH_HOME: home, DSH_AGENTS_HOME: join(home, 'agents') };
const cli = join(root, 'node_modules/@deepseek-ai/dsh/lib/bin.js');
const exec = promisify(execFile);
const connector = JSON.parse(await readFile(join(root, '../../packages/plugins/connectors/package.json'), 'utf8'));
const candidate = resolve(process.argv[3] ?? join(root, '.artifacts', `${connector.name}-${connector.version}.tgz`));
await exec(process.execPath, [cli, 'plugin', '--profile', 'experts', 'add', candidate, '--offline'], { cwd: home, env, timeout: 120000, maxBuffer: 8*1024*1024 });
let server, browser, host;
const checks = [];
const pass = text => { checks.push(text); console.log('PASS: ' + text); };
async function stop() {
  if (!server || server.exitCode !== null || server.signalCode !== null) return;
  const ended = new Promise(resolve => server.once('close', resolve));
  server.kill('SIGTERM'); const timer = setTimeout(() => server.kill('SIGKILL'), 3000);
  await ended; clearTimeout(timer);
}
async function start() {
  let log = '';
  server = spawn(process.execPath, [cli, '--profile', 'experts', '--host', '127.0.0.1', '--port', '0', '--no-open'], { cwd: home, env, stdio: ['ignore','pipe','pipe'] });
  server.stdout.on('data', bytes => { log += bytes; }); server.stderr.on('data', bytes => { log += bytes; });
  const deadline = Date.now()+30000;
  while (Date.now()<deadline) {
    const match = log.match(/http:\/\/127\.0\.0\.1:\d+\/\?token=[\w-]+/);
    if (match) {
      try {
        const response = await fetch(match[0], { redirect:'manual', signal:AbortSignal.timeout(2000) });
        const cookie = response.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');
        assert.ok(cookie); return { address:new URL(match[0]).origin, cookie };
      } catch {}
    }
    if (server.exitCode!==null) break;
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw new Error('Owned personal Host did not start');
}
async function api(domain, endpoint, payload={}) {
  const response = await fetch(host.address+'/api/workdsh-'+domain, { method:'POST', headers:{cookie:host.cookie,'content-type':'application/json'}, body:JSON.stringify({endpoint,payload}), signal:AbortSignal.timeout(15000) });
  assert.equal(response.status,200); const result=await response.json(); assert.equal(result.ok,true,JSON.stringify(result.error)); return result.value;
}
async function dismiss(page) {
  for (const name of ['Continue','Configure later','Keep current display','Not now','Got it','继续','稍后配置','保留当前显示','暂不开启','知道了']) {
    await page.getByRole('button',{name,exact:true}).last().click({timeout:800}).catch(()=>{});
  }
}
async function open() {
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addCookies(host.cookie.split('; ').map(pair=>{const i=pair.indexOf('=');return {name:pair.slice(0,i),value:pair.slice(i+1),url:host.address};}));
  const page=await context.newPage(); await page.goto(host.address); await dismiss(page); return page;
}
try {
  host=await start(); browser=await chromium.launch({headless:true}); let page=await open();
  const entries=await page.evaluate(()=>window.__DSH_BOOT__.entries.map(row=>row.id));
  assert.ok(entries.includes('workdsh-plugin-connectors'));
  assert.ok(!entries.some(name=>/enterprise/.test(name)));
  pass('Personal Profile loads packaged connectors without enterprise plugins');
  const experts=await api('experts','list'); const expert=experts.items[0];
  await page.getByRole('button',{name:'专家 · 技能 · 连接器',exact:true}).click();
  await page.getByRole('button',{name:'专家',exact:true}).click();
  await page.getByRole('button',{name:`查看专家 ${expert.name}`,exact:true}).click();
  const creationReply=page.waitForResponse(r=>r.url().endsWith('/api/workdsh-experts')&&r.request().postDataJSON()?.endpoint==='create-execution');
  await page.getByRole('button',{name:'召唤专家',exact:true}).click();
  const creation=await (await creationReply).json(); assert.equal(creation.ok,true);
  const sessionId=creation.value.sessionId;
  assert.deepEqual(await api('connectors','selection',{sessionId}),[]);
  const rows=await api('connectors','list'); const example=rows.find(row=>row.id==='workdsh-example'); assert.equal(example.state,'ready');
  await page.getByRole('button',{name:'连接器',exact:true}).click();
  await page.getByRole('button',{name:`用于本次对话 ${example.title}`,exact:true}).click();
  await expect(page.getByRole('button',{name:`从本次对话移除 ${example.title}`,exact:true})).toBeVisible();
  assert.deepEqual(await api('connectors','selection',{sessionId}),[example.id]);
  pass('Native blank Session starts with no MCP and saves an explicit choice');
  await page.reload(); await dismiss(page);
  await expect(page.getByRole('button',{name:`连接器：${example.title}`,exact:true})).toBeVisible();
  assert.deepEqual(await api('connectors','selection',{sessionId}),[example.id]);
  pass('Browser reload preserves explicit selection before the first user message');
  await page.screenshot({path:join(artifacts,'reload.png')});
  await page.context().close(); await stop(); host=await start(); page=await open();
  // Reopen the existing task using the native sidebar, never mutate its events.
  await page.getByText('New Session',{exact:true}).last().click(); await dismiss(page);
  await expect(page.getByRole('button',{name:`连接器：${example.title}`,exact:true})).toBeVisible();
  assert.deepEqual(await api('connectors','selection',{sessionId}),[example.id]);
  await page.screenshot({path:join(artifacts,'cold-restart.png')});
  pass('Cold Host restart and fresh browser preserve the same blank Session selection');
  await writeFile(join(artifacts,'result.json'),JSON.stringify({home,checks,sessionId,modelCalls:0,originalPersonalHomeModified:false},null,2));
} catch(error) {
  const page=browser?.contexts()[0]?.pages()[0];
  if(page)await writeFile(join(artifacts,'failure-dom.txt'),await page.locator('body').innerText());
  throw error;
} finally { await browser?.close(); await stop(); }
