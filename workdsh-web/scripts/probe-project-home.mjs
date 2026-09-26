import {readFile,mkdir} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
let login;for(let i=0;i<100;i++){login=(await readFile('.test-runtime/upgrade-017/preview-server.log','utf8')).match(/http:\/\/127\.0\.0\.1:18989\/\?token=[\w-]+/)?.[0];if(login)break;await new Promise(r=>setTimeout(r,1000))}if(!login)throw Error('Preview not ready');
const browser=await chromium.launch();try{
const p=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(login);await p.getByRole('button',{name:'项目',exact:true}).click();await expect(p.getByRole('heading',{name:'我的项目',exact:true})).toBeVisible();await mkdir('.artifacts/project-home',{recursive:true});
await p.getByRole('button',{name:'Settings',exact:true}).click();await p.getByRole('button',{name:'System',exact:true}).click();await p.getByRole('button',{name:'Close',exact:true}).click();
for(const theme of ['light','dark']){await p.emulateMedia({colorScheme:theme});await p.waitForTimeout(300);await p.screenshot({path:'.artifacts/project-home/'+theme+'.png'});}
await p.getByLabel('搜索项目',{exact:true}).fill('不存在的项目xyz');await expect(p.locator('.wd-p-project-card')).toHaveCount(0);await p.getByLabel('搜索项目',{exact:true}).fill('');await expect(p.locator('.wd-p-project-card').first()).toBeVisible();
await p.locator('.wd-p-grid').last().getByRole('button').first().click();await expect(p.locator('.wd-p-create-modal')).toBeVisible();await p.locator('.wd-p-create-modal').getByRole('button',{name:'取消',exact:true}).click();
await p.setViewportSize({width:600,height:850});await p.screenshot({path:'.artifacts/project-home/narrow.png'});expect(await p.locator('.wd-p-center').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);expect(errors).toEqual([]);console.log('PASS project homepage themes, search, template, narrow overflow');
}finally{await browser.close()}
