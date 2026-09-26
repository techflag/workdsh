import {readFile,mkdir} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
const login=(await readFile('.test-runtime/upgrade-017/preview-server.log','utf8')).match(/http:\/\/127\.0\.0\.1:18989\/\?token=[\w-]+/)?.[0];
if(!login)throw Error('Preview not ready');
const browser=await chromium.launch();
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(login);await page.getByRole('button',{name:'项目',exact:true}).click();
 await expect(page.getByRole('heading',{name:'我的项目',exact:true})).toBeVisible();
 const card=page.locator('.wd-p-card-open').filter({hasText:'Host持久化验证'});
 await card.click();await expect(page.locator('.wd-p-tabs')).toBeVisible();
 await page.getByRole('button',{name:'项目',exact:true}).click();await expect(page.getByRole('heading',{name:'我的项目',exact:true})).toBeVisible();
 await card.click();await page.locator('.wd-p-task-row').first().click();await page.locator('[contenteditable="true"]').waitFor();
 await page.getByRole('button',{name:'项目',exact:true}).click();await expect(page.getByRole('heading',{name:'我的项目',exact:true})).toBeVisible();
 await card.click();await page.locator('.wd-p-task-row').first().click();await page.getByRole('button',{name:'打开项目 Host持久化验证',exact:true}).click();await expect(page.locator('.wd-p-tabs')).toBeVisible();await page.reload();await expect(page.locator('.wd-p-tabs')).toBeVisible();
 await page.getByRole('button',{name:'项目',exact:true}).click();await expect(page.getByRole('heading',{name:'我的项目',exact:true})).toBeVisible();
 await mkdir('.artifacts/project-navigation',{recursive:true});await page.screenshot({path:'.artifacts/project-navigation/home.png'});
 expect(errors).toEqual([]);console.log('PASS project navigation: detail/home, conversation/home, detail refresh');
} finally {await browser.close()}
