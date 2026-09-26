import {readFile,mkdir} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
let login;for(let i=0;i<100;i++){login=(await readFile('.test-runtime/upgrade-017/preview-server.log','utf8')).match(/http:\/\/127\.0\.0\.1:18989\/\?token=[\w-]+/)?.[0];if(login)break;await new Promise(r=>setTimeout(r,1000))}if(!login)throw Error('Preview not ready');
const browser=await chromium.launch();try{
const p=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(login);await p.getByRole('button',{name:'项目',exact:true}).click();await expect(p.getByRole('heading',{name:'我的项目',exact:true})).toBeVisible();await mkdir('.artifacts/project-home',{recursive:true});
await p.getByRole('button',{name:'Settings',exact:true}).click();await p.getByRole('button',{name:'System',exact:true}).click();await p.getByRole('button',{name:'Close',exact:true}).click();
for(const theme of ['light','dark']){await p.emulateMedia({colorScheme:theme});await p.waitForTimeout(300);expect(await p.locator('[class$="_sidebarCol"]').evaluate(e=>getComputedStyle(e).borderRightColor)).toBe('rgba(0, 0, 0, 0)');await p.screenshot({path:'.artifacts/project-home/divider-'+theme+'.png'});}
const handle=p.locator('[data-side="sidebar"]');const before=await handle.boundingBox();await p.mouse.move(before.x+4,before.y+200);await p.mouse.down();await p.mouse.move(before.x+44,before.y+200,{steps:5});await p.mouse.up();const after=await handle.boundingBox();expect(after.x).toBeGreaterThan(before.x+20);await p.mouse.move(after.x+4,after.y+200);await p.mouse.down();await p.mouse.move(before.x+4,before.y+200,{steps:5});await p.mouse.up();
expect(errors).toEqual([]);console.log('PASS sidebar divider light/dark and resize');
}finally{await browser.close()}
