import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
let login;for(let i=0;i<150;i++){const log=await readFile('.test-runtime/upgrade-017/preview-server.log','utf8');login=log.match(/http:\/\/127\.0\.0\.1:18989\/\?token=[\w-]+/)?.[0];if(login)break;await new Promise(r=>setTimeout(r,1000))}assert.ok(login,'preview ready');
const browser=await chromium.launch();const errors=[];let fixture;
const page=await browser.newPage({viewport:{width:1440,height:1000},colorScheme:'light'});
const call=(endpoint,payload={})=>page.evaluate(async({endpoint,payload})=>{const r=await fetch('/api/workdsh-projects',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({endpoint,payload})});const j=await r.json();if(!j.ok)throw Error(j.error?.message);return j.value},{endpoint,payload});
try{
 await mkdir('.artifacts/project-detail-ux',{recursive:true});await page.goto(login);page.on('pageerror',e=>errors.push(e.message));
 await page.getByText('Settings',{exact:true}).click();await page.getByRole('button',{name:'System',exact:true}).click();await page.getByRole('button',{name:'Close',exact:true}).click();
 const projects=await call('list');const project=projects.find(p=>p.name==='Host持久化验证')??projects[0];assert.ok(project);
 const url='http://127.0.0.1:18989/?workdsh-view=projects&project='+project.id;
 await page.goto(url);await page.locator('.wd-p-shell').waitFor();
 assert.equal(await page.locator('.wd-p-tabs .active').innerText(),'任务');
 const backgrounds=[];
 for(const theme of ['light','dark']){
  await page.emulateMedia({colorScheme:theme});await page.waitForTimeout(250);
  backgrounds.push(await page.locator('.wd-p-main').evaluate(e=>getComputedStyle(e).backgroundColor));
  for(const tab of ['任务','计划','资产','活动记录']){
   await page.locator('.wd-p-tabs').getByRole('button',{name:tab,exact:true}).click();
   await page.screenshot({path:`.artifacts/project-detail-ux/${theme}-${tab}.png`});
   assert.equal(await page.locator('.wd-p-shell').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);
  }
 }
 assert.notEqual(backgrounds[0],backgrounds[1]);
 await page.locator('.wd-p-tabs').getByRole('button',{name:'任务',exact:true}).click();
 if(await page.locator('.wd-p-task-row').count()){
  const r=page.locator('.wd-p-task-row').first();assert.equal(await r.locator('time').count(),1);assert.ok(!(await r.innerText()).includes('配置 '));await r.click();await page.waitForFunction(()=>!document.querySelector('.wd-p-task-row')||!document.querySelector('.wd-p-task-row').getBoundingClientRect().width);await page.goto(url);
 }
 await page.setViewportSize({width:1920,height:1080});await page.locator('.wd-p-shell').waitFor();await page.screenshot({path:'.artifacts/project-detail-ux/desktop-1920.png'});
 await page.setViewportSize({width:390,height:844});await page.reload();await page.locator('.wd-p-shell').waitFor();assert.ok(await page.locator('.wd-p-aside').isHidden());await page.screenshot({path:'.artifacts/project-detail-ux/mobile-390.png'});
 fixture=await call('create',{name:'界面验收临时项目'});await call('add-work-item',{projectId:fixture.project.id,title:'核对报价与材料成本'});
 await page.setViewportSize({width:1440,height:1000});await page.goto('http://127.0.0.1:18989/?workdsh-view=projects&project='+fixture.project.id);await page.locator('.wd-p-tabs').getByRole('button',{name:'计划',exact:true}).click();
 assert.equal(await page.locator('.wd-p-plan-table input,.wd-p-plan-table select').count(),0);
 await page.getByRole('button',{name:'核对报价与材料成本',exact:true}).click();let dialog=page.getByRole('dialog',{name:'编辑待办'});await dialog.getByLabel('标题',{exact:true}).fill('取消不应写入');await dialog.getByRole('button',{name:'取消',exact:true}).click();assert.equal((await call('get',{projectId:fixture.project.id})).workItems[0].title,'核对报价与材料成本');
 await page.getByRole('button',{name:'核对报价与材料成本',exact:true}).click();dialog=page.getByRole('dialog',{name:'编辑待办'});await dialog.getByLabel('标题',{exact:true}).fill('报价复核完成');await dialog.getByLabel('状态',{exact:true}).selectOption('done');await page.screenshot({path:'.artifacts/project-detail-ux/edit-dialog.png'});
 const fail=async route=>{if(route.request().postDataJSON()?.endpoint==='update-work-item')await route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({ok:false,error:{message:'验收模拟：保存失败，请重试'}})});else await route.continue()};
 await page.route('**/api/workdsh-projects',fail);await dialog.getByRole('button',{name:'保存',exact:true}).click();await dialog.getByRole('alert').waitFor();assert.equal(await dialog.getByLabel('标题',{exact:true}).inputValue(),'报价复核完成');await page.unroute('**/api/workdsh-projects',fail);await dialog.getByRole('button',{name:'保存',exact:true}).click();await dialog.waitFor({state:'hidden'});assert.equal((await call('get',{projectId:fixture.project.id})).workItems[0].status,'done');
 await page.reload();await page.locator('.wd-p-tabs').getByRole('button',{name:'计划',exact:true}).click();await page.getByRole('button',{name:'报价复核完成',exact:true}).waitFor();await page.screenshot({path:'.artifacts/project-detail-ux/plan-saved.png'});
 assert.deepEqual(errors,[]);await writeFile('.artifacts/project-detail-ux/result.json',JSON.stringify({passed:true,errors,checks:['real-project-four-tabs-light-dark','native-task-navigation','1920-and-390-layout','read-mode-no-inputs','cancel-no-write','failed-save-keeps-draft','retry-and-refresh-persist']},null,2));console.log('PASS project detail visual, navigation, editing, failure/retry and persistence checks');
}finally{if(fixture)await call('archive',{projectId:fixture.project.id}).catch(()=>{});await browser.close()}
