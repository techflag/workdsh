import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
let login;for(let i=0;i<150;i++){const log=await readFile('.test-runtime/upgrade-017/preview-server.log','utf8');login=log.match(/http:\/\/127\.0\.0\.1:18989\/\?token=[\w-]+/)?.[0];if(login)break;await new Promise(r=>setTimeout(r,1000));}assert.ok(login,'preview ready');
const browser=await chromium.launch();const results=[],errors=[];
await mkdir('.artifacts/controls',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},colorScheme:'light'});
 page.on('pageerror',e=>errors.push(e.message));await page.goto(login);
 await page.getByText('Settings',{exact:true}).click();
 await page.getByRole('button',{name:'System',exact:true}).click();
 await page.getByRole('button',{name:'Close',exact:true}).click();
 for(const view of ['skills','experts','connectors','projects','library']){
  await page.goto('http://127.0.0.1:18989/?workdsh-view='+(view==='connectors'?'skills':view));
  if(view==='connectors')await page.getByRole('button',{name:'连接器',exact:true}).click();
  await page.locator('.wd-'+view).waitFor();
  if(view==='library')await page.locator('.wd-library-sidebar').getByRole('button',{name:/搜索/}).click();
  if(view==='projects')await page.getByRole('button',{name:/新建项目/}).first().click();
  if(view==='connectors')await page.getByRole('button',{name:'＋ 添加 MCP',exact:true}).click();
  for(const theme of ['light','dark']){
   await page.emulateMedia({colorScheme:theme});await page.waitForTimeout(300);
   const data=await page.locator('button,input,select,textarea').evaluateAll(els=>els.filter(e=>e.getBoundingClientRect().width&&e.closest('.wd-skills,.wd-experts,.wd-projects,.wd-connectors,.wd-library,.wd-dialog')).map(e=>{const c=getComputedStyle(e);return {tag:e.tagName,cl:e.className,label:e.getAttribute('aria-label')||e.textContent?.trim().slice(0,24),h:e.getBoundingClientRect().height,control:e.dataset.wdControl,size:e.dataset.size,bg:c.backgroundColor,color:c.color};}));
   for(const item of data.filter(i=>i.control==='button'))assert.equal(item.h,item.size==='sm'?28:36,`${view}: ${item.label}`);
   const fields=await page.locator('.wd-form-input:visible,.wd-form-select:visible').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));for(const height of fields)assert.equal(height,36);
   const bg=await page.locator('.wd-'+view).evaluate(e=>getComputedStyle(e).backgroundColor);results.push({view,theme,bg,data});await page.screenshot({path:`.artifacts/controls/${view}-${theme}.png`});
  }
  if(view==='library'){
   await page.locator('.wd-library form input').fill('__controls_no_match__');
   await page.locator('.wd-library form').evaluate(e=>e.addEventListener('submit',()=>window.__controlsSubmitted=true,{once:true}));
   await page.locator('.wd-library form button[type="submit"]').click();
   await page.waitForFunction(()=>window.__controlsSubmitted===true);
  }
  if(view==='skills'){
   await page.getByRole('button',{name:'＋ 添加技能',exact:true}).click();
   await page.getByRole('menuitem',{name:'查找技能',exact:true}).click();
   assert.equal(await page.locator('input[aria-label="搜索技能"]').evaluate(e=>e===document.activeElement),true,'native Input ref focus');
  }
  if(view==='projects'){
   const width=await page.locator('.wd-p-create-label .wd-form-input').evaluate(e=>e.getBoundingClientRect().width/e.parentElement.getBoundingClientRect().width);assert.ok(width>.9,'project name spans the form');
   const input=page.locator('.wd-p-modal input').first();await input.fill('控件验收');assert.equal(await input.inputValue(),'控件验收');
   const select=page.locator('.wd-p-modal select');if(await select.count()){await select.first().selectOption({index:1});}
   await page.keyboard.press('Escape');
  }
 }
 for(const view of ['skills','experts','connectors','projects','library']){const rows=results.filter(r=>r.view===view);assert.notEqual(rows[0].bg,rows[1].bg,`${view} follows native theme`);}
 await page.getByText('Settings',{exact:true}).click();
 await page.getByRole('button',{name:'Dark',exact:true}).click();
 await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.goto('http://127.0.0.1:18989/?workdsh-view=projects');
 await page.getByRole('button',{name:/新建项目/}).first().click();
 for(const width of [1920,390]){
  await page.setViewportSize({width,height:1000});await page.waitForTimeout(200);
  const box=await page.locator('.wd-p-create-modal').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);
  for(const button of await page.locator('.wd-p-create-modal>footer button').all()){
   assert.equal(await button.evaluate(e=>getComputedStyle(e).whiteSpace),'nowrap');
   assert.ok(await button.evaluate(e=>e.scrollWidth<=e.clientWidth),'footer button text fits');
   const r=await button.boundingBox();assert.ok(r.y+r.height<=box.y+box.height,'footer button stays inside modal');
  }
  await page.screenshot({path:`.artifacts/controls/projects-${width}.png`});
 }
 await writeFile('.artifacts/controls/results.json',JSON.stringify({results,errors},null,2));assert.deepEqual(errors,[]);console.log('PASS five control surfaces, 36/28px sizes, light/dark themes, focus, select, search submit and 1920/390 project dialog.');
}finally{await browser.close();}
