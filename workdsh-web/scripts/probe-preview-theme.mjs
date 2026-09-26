// Read-only browser regression for the running development preview. Requires
// an existing expert and skill catalog; does not publish or run an agent task.
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
let login;for(let i=0;i<150;i++){login=(await readFile('.test-runtime/upgrade-017/preview-server.log','utf8')).match(/http:\/\/127\.0\.0\.1:18989\/\?token=[\w-]+/)?.[0];if(login)break;await new Promise(r=>setTimeout(r,1000));}assert.ok(login,'ready URL');
const b=await chromium.launch();const evidence={};
try{
 const p=await b.newPage({viewport:{width:1440,height:1000},colorScheme:'light'});await p.goto(login);
 for(const view of ['skills','experts','connectors','projects','library']) {
  await p.goto('http://127.0.0.1:18989/?workdsh-view='+(view==='connectors'?'skills':view));
  if(view==='connectors')await p.getByRole('button',{name:'连接器',exact:true}).click();
  await p.locator('.wd-'+view).waitFor({timeout:30000});
  if(view==='experts')await p.getByRole('button',{name:/^查看专家 /}).first().click();
  if(view==='connectors')await p.getByRole('button',{name:'＋ 添加 MCP',exact:true}).click();
  if(view==='projects')await p.getByRole('button',{name:/新建项目/}).first().click();
  const selectors={skills:['.wd-skills','.wd-skills .card','.wd-skills .add-skill'],experts:['.wd-experts','.expert-dialog','.wd-dialog-close'],connectors:['.wd-connectors','.connector-config-dialog','.connector-config-dialog input'],projects:['.wd-projects','.wd-p-modal','.wd-p-modal input'],library:['.wd-library','.wd-library-content','.wd-library']}[view];
  evidence[view]=[];
  for(const scheme of ['light','dark','light']){
   await p.emulateMedia({colorScheme:scheme});await p.waitForTimeout(350);
   const colors=await p.evaluate(sels=>sels.map(sel=>{const el=document.querySelector(sel);if(!el)return {sel,missing:true};const cs=getComputedStyle(el);const ref=document.createElement('span');ref.style.color='var(--dsw-alias-label-primary)';document.body.append(ref);const native=getComputedStyle(ref).color;ref.remove();return{sel,bg:cs.backgroundColor,fg:cs.color,native};}),selectors);
   evidence[view].push(colors);
   await p.screenshot({path:'.artifacts/upgrade017-acceptance/capability-'+view+'-'+scheme+'.png'});
  }
  const [light,dark,back]=evidence[view];assert.notEqual(light[0].bg,dark[0].bg);assert.deepEqual(light,back);assert.equal(light[0].fg,light[0].native);assert.equal(dark[0].fg,dark[0].native);
  assert.notEqual(light[1].bg,dark[1].bg);assert.equal(light[1].missing,undefined);assert.equal(light[2].missing,undefined);assert.notEqual(light[2].fg,dark[2].fg);
 }
 await writeFile('.artifacts/upgrade017-acceptance/capability-theme.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));console.log('PASS light/dark/light native tokens: five pages and expert/connector/project dialogs');
}finally{await b.close();}
