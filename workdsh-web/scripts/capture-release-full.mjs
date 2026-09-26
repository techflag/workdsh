import {readFile,mkdir} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
let login;for(let i=0;i<100;i++){login=(await readFile('.test-runtime/upgrade-017/preview-server.log','utf8')).match(/http:\/\/127\.0\.0\.1:18989\/\?token=[\w-]+/)?.[0];if(login)break;await new Promise(r=>setTimeout(r,1000))}if(!login)throw Error('Preview not ready');
const browser=await chromium.launch();try{
const p=await browser.newPage({viewport:{width:1600,height:1000},locale:"zh-CN"});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(login);await p.getByRole('button',{name:'项目',exact:true}).click();await expect(p.getByRole('heading',{name:'我的项目',exact:true})).toBeVisible();await mkdir('.artifacts/release-alpha8/screenshots',{recursive:true});
await p.getByRole('button',{name:/^(Settings|设置)$/}).click();await p.getByRole('button',{name:/^(System|跟随系统|系统)$/}).click();await p.getByRole('button',{name:/^(Close|关闭)$/}).click();
for(const theme of ['light','dark']){await p.emulateMedia({colorScheme:theme});await p.waitForTimeout(400);await p.screenshot({path:'.artifacts/release-alpha8/screenshots/full-projects-'+theme+'.png'});}
await p.goto('http://127.0.0.1:18989/?workdsh-view=skills');await p.locator('.wd-skills').waitFor();await p.waitForTimeout(700);await p.screenshot({path:'.artifacts/release-alpha8/screenshots/full-skills-dark.png'});console.log('Captured full application screenshots with sidebar');
}finally{await browser.close()}
