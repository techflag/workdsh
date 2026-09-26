import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const login=(await readFile('.test-runtime/upgrade-017/preview-server.log','utf8')).match(/http:\/\/127\.0\.0\.1:18989\/\?token=[\w-]+/)?.[0];assert.ok(login);
const browser=await chromium.launch();
try{
const p=await browser.newPage({viewport:{width:1440,height:1000},colorScheme:'light'});const errors=[];p.on('console',m=>{if(m.type()==='error'||m.type()==='warn')console.log('console',m.text().slice(0,1200))});p.on('pageerror',e=>errors.push(e.message));
if(process.env.PROBE_LOCAL_BUNDLE)await p.route('**/plugins/**',async route=>{if(route.request().url().includes('workdsh-plugin-projects')){const response=await route.fetch();const old=await readFile('.test-runtime/preview/profiles/preview/node_modules/workdsh-plugin-projects/dist/client.browser.js','utf8');const body=(await response.text()).replace(old.trim(),(await readFile('packages/plugins/projects/dist/client.browser.js','utf8')).trim());await route.fulfill({response,body})}else await route.continue()});await p.goto(login);await p.waitForTimeout(1500);
const projects=await p.evaluate(async()=> (await(await fetch('/api/workdsh-projects',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({endpoint:'list',payload:{}})})).json()).value);
const project=projects.find(x=>x.name==='Host持久化验证');assert.ok(project);
await p.goto('http://127.0.0.1:18989/?workdsh-view=projects&project='+project.id);await p.locator('.wd-p-task-row').first().click();await p.locator('[contenteditable="true"]').waitFor();await p.waitForTimeout(1500);
await mkdir('.artifacts/project-conversation',{recursive:true});
const plus=p.getByRole('button',{name:'Add files or run commands',exact:true});
await plus.click();await p.locator('.wd-project-menu-main').waitFor();
await p.locator('.wd-project-menu-main').getByRole('menuitem',{name:'专家'}).hover();await p.locator('.wd-project-menu-sub').waitFor();
await p.screenshot({path:'.artifacts/project-conversation/experts.png'});
await p.keyboard.press('Escape');await p.locator('.wd-project-menu').waitFor({state:'detached'});
await plus.click();await p.locator('.wd-project-menu-main').getByRole('menuitem',{name:'添加文件'}).click();
const chooser=p.waitForEvent('filechooser');await p.locator('.wd-project-menu-sub').getByRole('menuitem',{name:'从本地添加'}).click();await chooser;
await p.locator('.wd-project-menu').waitFor({state:'detached'});
await p.getByRole('button',{name:'Settings',exact:true}).click();await p.getByRole('button',{name:'System',exact:true}).click();await p.getByRole('button',{name:'Close',exact:true}).click();
const colors=[];
for(const theme of ['light','dark']){await p.emulateMedia({colorScheme:theme});await plus.click();await p.locator('.wd-project-menu-main').getByRole('menuitem',{name:'连接器'}).hover();await p.locator('.wd-project-menu-sub').waitFor();colors.push(await p.locator('.wd-project-menu-sub').evaluate(e=>getComputedStyle(e).backgroundColor));await p.screenshot({path:'.artifacts/project-conversation/connectors-'+theme+'.png'});await p.keyboard.press('Escape');}
assert.notEqual(colors[0],colors[1]);
// Change one task selection and always restore it; project defaults must stay untouched.
await plus.click();await p.locator('.wd-project-menu-main').getByRole('menuitem',{name:'连接器'}).click();
const choice=p.locator('.wd-project-menu-sub [role="menuitemcheckbox"]').first();
if(await choice.count()){
 const initial=await choice.getAttribute('aria-checked');
 const before=await p.evaluate(async projectId=>(await(await fetch('/api/workdsh-projects',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({endpoint:'get',payload:{projectId}})})).json()).value.config,project.id);
 await p.route('**/api/workdsh-connectors',async route=>{if(route.request().postDataJSON()?.endpoint==='set-selection')await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:{message:'测试保存失败'}})});else await route.continue()});
 await choice.click();await p.getByRole('alert').filter({hasText:'测试保存失败'}).waitFor();assert.equal(await choice.getAttribute('aria-checked'),initial);await p.unroute('**/api/workdsh-connectors');
 await choice.click();await p.waitForTimeout(250);assert.notEqual(await choice.getAttribute('aria-checked'),initial);
 try{const after=await p.evaluate(async projectId=>(await(await fetch('/api/workdsh-projects',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({endpoint:'get',payload:{projectId}})})).json()).value.config,project.id);assert.deepEqual(after,before)}finally{await choice.click();await p.waitForTimeout(250);assert.equal(await choice.getAttribute('aria-checked'),initial)}
}
await p.keyboard.press('Escape');
await plus.click();await p.locator('.wd-project-menu-main').getByRole('menuitem',{name:'技能'}).click();const skill=p.locator('.wd-project-menu-sub [role="menuitem"]').first();if(await skill.count()){await skill.click();await p.waitForTimeout(200);assert.match(await p.locator('[contenteditable="true"]').first().innerText(),/\//);await p.locator('[contenteditable="true"]').first().fill('')}else await p.keyboard.press('Escape');
await p.setViewportSize({width:390,height:844});await plus.click();await p.locator('.wd-project-menu-main').getByRole('menuitem',{name:'技能'}).click();await p.locator('.wd-project-menu-back').waitFor({state:'visible'});await p.screenshot({path:'.artifacts/project-conversation/mobile.png'});await p.locator('.wd-project-menu-back').click();await p.keyboard.press('Escape');
await p.setViewportSize({width:1440,height:1000});
const editor=p.locator('[contenteditable="true"]').first();await editor.fill('/');await p.waitForTimeout(400);assert.equal(await p.locator('.wd-project-menu').count(),0);await editor.fill('');
// Homepage shares the same menu, and toggles stay in its draft.
await p.goto('http://127.0.0.1:18989/?workdsh-view=projects&project='+project.id);await p.getByRole('button',{name:'添加文件或能力',exact:true}).click();await p.locator('.wd-project-menu-main').getByRole('menuitem',{name:'专家'}).click();await p.screenshot({path:'.artifacts/project-conversation/home.png'});await p.keyboard.press('Escape');
await p.getByText('New Session',{exact:true}).click();await p.waitForTimeout(300);assert.equal(await p.locator('.wd-project-menu').count(),0);
assert.deepEqual(errors,[]);await writeFile('.artifacts/project-conversation/result.json',JSON.stringify({checks:['cascade','escape','native-file-chooser','light-dark','mobile-back','native-slash','selection-failure-and-retry','task-selection-isolation','skill-insert','homepage','new-session'],colors,errors},null,2));console.log('PASS project conversation menu');
}finally{await browser.close()}
