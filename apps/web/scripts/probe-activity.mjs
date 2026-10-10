import {zstdCompressSync} from 'node:zlib';
import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const root=resolve(import.meta.dirname,'..'), home=join(root,'.test-runtime/activity-probe'), cwd=join(home,'workspace'), id='session-activity-fixture', workspaceId='activity-fixture';
const credentialLock=join(home,'.credentials.yaml.lock');
try {const pid=Number(await readFile(credentialLock,'utf8'));if(Number.isSafeInteger(pid)&&pid>0){try{process.kill(pid,0);throw Error('Isolated activity probe is already in use');}catch(error){if(error.code!=='ESRCH')throw error;}}await rm(credentialLock,{force:true});}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(cwd,{recursive:true});await mkdir(join(home,'storages'),{recursive:true});
await writeFile(join(home,'storages/workspace.json'),JSON.stringify({unit:{name:'workspace',version:2},global:{initialized:true,workspaceIds:[workspaceId],archivedSessionIds:[]},tables:{workspaces:{[workspaceId]:{path:cwd,title:'Activity fixture',sessionIds:[id],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}}}}));
const dir=join(home,'sessions','--'+cwd.replaceAll('/','-').replace(/^-+/, '')+'--',id);await mkdir(dir,{recursive:true});
const disabled=process.argv.includes('--disabled');
await writeFile(join(home,'profiles/preview/cordis.patch.yml'),disabled ? '- id: workdsh-activity\n  disabled: true\n' : '[]\n');
const now=Date.now();const rows=[{type:'session',version:3,id,createdAt:now,cwd,isSeeded:false,delegationDepth:0,agentPreset:'dsh-base'},
{type:'turn/start',seq:0,time:now,data:{turn:1}},
{type:'user/message',seq:1,time:now,data:{role:'user',id:'fixture-user',source:{kind:'user'},content:[{type:'text',text:'Activity plugin verification'}]},surfaceOp:'append'},
{type:'assistant/message',seq:2,time:now+1,data:{turn:1,step:1,stream:[],message:{role:'assistant',id:'fixture-assistant',source:{kind:'model',provider:'fixture',model:'fixture'},content:[{type:'text',text:'Native conversation body is retained.'}]}},surfaceOp:'append'},
{type:'turn/end',seq:3,time:now+2,data:{turn:1,reason:{kind:'completed'}}}];
await rm(join(home,'sessions'),{recursive:true,force:true});await mkdir(dir,{recursive:true});
await writeFile(join(dir,'session.v3.jsonl.zstd'),Buffer.concat(rows.map(row=>zstdCompressSync(Buffer.from(JSON.stringify(row)+'\n')))));
let log='';const server=spawn(process.execPath,[join(root,'node_modules/@deepseek-ai/dsh/lib/bin.js'),'--profile','preview','--host','127.0.0.1','--port','18990','--no-open'],{cwd:root,env:{...process.env,DSH_HOME:home,DSH_AGENTS_HOME:join(home,'agents')},stdio:['ignore','pipe','pipe']});server.stdout.on('data',v=>{log+=v;void writeFile('/tmp/workdsh-activity-probe-host.log',log);});server.stderr.on('data',v=>{log+=v;void writeFile('/tmp/workdsh-activity-probe-host.log',log);});
let browser;try {
const deadline=Date.now()+60000;while(!/http:\/\/127\.0\.0\.1:\d+\/\?token=[\w-]+/.test(log)){if(server.exitCode!==null||Date.now()>deadline)throw Error('Host failed '+log.replace(/token=\S+/g,'token=[redacted]'));await new Promise(r=>setTimeout(r,100));}
const url=log.match(/http:\/\/127\.0\.0\.1:\d+\/\?token=[\w-]+/)[0];
browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
console.log('Host ready; opening browser');await page.goto(url);await page.waitForTimeout(1500);
await page.getByRole('button',{name:'Continue',exact:true}).click({timeout:15000}).catch(()=>{});
await page.getByRole('button',{name:'Configure later',exact:true}).click({timeout:5000}).catch(()=>{});

console.log('Selecting native fixture');await page.getByText('workspace',{exact:true}).first().click();await page.waitForTimeout(1000);
await writeFile('/tmp/workdsh-activity-dom.txt',await page.locator('body').innerText());
if(disabled){await page.getByText('Native conversation body is retained.',{exact:true}).waitFor();assert.equal(await page.locator('.wd-activity').count(),0);assert.equal(await page.locator('style[data-workdsh-activity]').count(),0);assert.deepEqual(errors,[]);console.log('PASS: disabled standard Profile restores native conversation/header without plugin styles.');}else{
await page.getByRole('button',{name:'展开协作详情'}).waitFor({timeout:15000});
assert.equal(await page.locator('.wd-activity').count(),1);
assert.equal(await page.locator('.wd-activity-bar').evaluate(e=>e.getBoundingClientRect().height),46);const geometry=await page.locator('.wd-activity').evaluate(e=>{const b=e.getBoundingClientRect(),h=e.closest('header').getBoundingClientRect();return {width:b.width,expected:Math.min(560,(h.width-40)/2),center:b.x+b.width/2,parentCenter:h.x+h.width/2};});assert.ok(Math.abs(geometry.width-geometry.expected)<1);assert.ok(Math.abs(geometry.center-geometry.parentCenter)<1);assert.equal(await page.locator('.wd-activity-face').first().evaluate(e=>getComputedStyle(e).cornerShape),'round');
// Exercise the team layout on this isolated fixture without starting a model task.
await page.locator('.wd-activity').evaluate(e=>e.dataset.team='true');assert.equal(await page.locator('.wd-activity-bar').evaluate(e=>e.getBoundingClientRect().height),56);await page.locator('.wd-activity').evaluate(e=>e.dataset.team='false');
await page.getByRole('button',{name:'展开协作详情'}).click();const toggle=page.getByRole('checkbox',{name:'启用轻量动画'});await toggle.uncheck();assert.equal(await page.locator('.wd-activity').getAttribute('data-motion'),'false');assert.equal(await page.locator('.wd-activity-face').first().evaluate(e=>getComputedStyle(e).animationName),'none');
await page.reload();await page.getByRole('button',{name:'Continue',exact:true}).click({timeout:5000}).catch(()=>{});await page.getByRole('button',{name:'Configure later',exact:true}).click({timeout:3000}).catch(()=>{});await page.getByText('workspace',{exact:true}).first().click();await page.getByRole('button',{name:'展开协作详情'}).waitFor();assert.equal(await page.locator('.wd-activity').getAttribute('data-motion'),'false');
await page.getByRole('button',{name:'展开协作详情'}).click();await page.getByRole('checkbox',{name:'启用轻量动画'}).check();assert.equal(await page.locator('.wd-activity-face').first().evaluate(e=>getComputedStyle(e).animationName),'wd-activity-nod');await page.locator('.wd-activity-bar').hover();await page.getByRole('button',{name:'关闭动态效果',exact:true}).click();assert.equal(await page.locator('.wd-activity').getAttribute('data-motion'),'false');await page.getByRole('button',{name:'开启动效',exact:true}).click();assert.equal(await page.locator('.wd-activity').getAttribute('data-motion'),'true');/* CSS-only animation exercise on the isolated historical fixture; no model or live task is started. */await page.locator('.wd-activity').evaluate(e=>e.dataset.phase='working');assert.equal(await page.locator('.wd-activity-eyes').first().evaluate(e=>getComputedStyle(e).animationName),'wd-activity-blink');assert.equal(await page.locator('.wd-activity-bar').evaluate(e=>getComputedStyle(e,'::before').animationName),'wd-activity-orbit');const angle=await page.locator('.wd-activity-bar').evaluate(e=>getComputedStyle(e,'::before').getPropertyValue('--wd-activity-angle'));await page.waitForTimeout(200);assert.notEqual(await page.locator('.wd-activity-bar').evaluate(e=>getComputedStyle(e,'::before').getPropertyValue('--wd-activity-angle')),angle);await page.getByRole('button',{name:'关闭动态效果',exact:true}).click();assert.equal(await page.locator('.wd-activity-bar').evaluate(e=>getComputedStyle(e,'::before').animationName),'none');await page.getByRole('button',{name:'开启动效',exact:true}).click();await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.wd-activity-face').first().evaluate(e=>getComputedStyle(e).animationName),'none');
assert.equal(await page.locator('.wd-activity-bar').evaluate(e=>getComputedStyle(e,'::before').animationName),'none');await page.locator('.wd-activity').evaluate(e=>e.dataset.phase='completed');await page.keyboard.press('Escape');assert.equal(await page.locator('.wd-activity-details').count(),0);
assert.ok((await page.locator('body').innerText()).includes('Native conversation body is retained.'));assert.deepEqual(errors,[]);
await mkdir(join(root,'.artifacts/activity'),{recursive:true});await page.screenshot({path:join(root,'.artifacts/activity/browser.png')});
console.log('PASS: official Profile/Client load; one 46px bar; native body retained; animation off persists; system reduced-motion; Escape; no browser errors.');
}
}finally{await browser?.close();if(server.exitCode===null){const closed=new Promise(r=>server.once('close',r));server.kill('SIGTERM');const timer=setTimeout(()=>server.kill('SIGKILL'),5000);await closed;clearTimeout(timer);}await writeFile(join(home,'profiles/preview/cordis.patch.yml'),'[]\n');}
