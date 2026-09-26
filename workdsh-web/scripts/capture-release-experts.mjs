import {readFile,mkdir} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
let login;for(let i=0;i<100;i++){login=(await readFile('.test-runtime/upgrade-017/preview-server.log','utf8')).match(/http:\/\/127\.0\.0\.1:18989\/\?token=[\w-]+/)?.[0];if(login)break;await new Promise(r=>setTimeout(r,1000))}if(!login)throw Error('Preview not ready');
const browser=await chromium.launch();try{
const p=await browser.newPage({viewport:{width:1600,height:1050}});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(login);await p.getByRole('button',{name:'项目',exact:true}).click();await expect(p.getByRole('heading',{name:'我的项目',exact:true})).toBeVisible();await mkdir('.artifacts/release-alpha8/screenshots',{recursive:true});
await p.getByRole('button',{name:'Settings',exact:true}).click();await p.getByRole('button',{name:'System',exact:true}).click();await p.getByRole('button',{name:'Close',exact:true}).click();
await p.goto('http://127.0.0.1:18989/?workdsh-view=experts');await p.locator('.wd-experts').waitFor();await p.waitForTimeout(1000);await p.locator('.wd-experts').screenshot({path:'.artifacts/release-alpha8/screenshots/experts.png'});
console.log('Captured experts');
}finally{await browser.close()}
