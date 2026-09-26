import { chromium, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const browser = await chromium.launch({ headless: true });
try {
 const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(resolve('docs/ui/index.html')).href);
 await expect(page.getByRole('heading',{name:'WorkDSH，我帮你'})).toBeVisible();
 await page.screenshot({path:'docs/ui/home.png',fullPage:true,animations:'disabled'});
 await page.locator('[data-action="fill"]').first().click();
 await expect(page.getByLabel('任务描述')).toHaveValue(/文档处理/);
 await page.getByRole('button',{name:'开始任务 ↗'}).click();
 await page.getByRole('button',{name:'查看任务布局 →'}).click();
 await expect(page.getByRole('heading',{name:'客户与报价跟进'})).toBeVisible();
 await page.screenshot({path:'docs/ui/task.png',fullPage:true,animations:'disabled'});
 await page.locator('[data-action="preview"]').click();
 await expect(page.locator('dialog')).toBeVisible();await page.keyboard.press('Escape');
 await page.locator('#nav [data-page="project"]').click();
 await page.screenshot({path:'docs/ui/project.png',fullPage:true,animations:'disabled'});
 for(const width of [1440,1920,1050,390]) {
  await page.setViewportSize({width,height:1000});
  expect(await page.locator('.project .panel').evaluate(panel=>{
   const bounds=panel.getBoundingClientRect();
   return panel.scrollWidth<=panel.clientWidth && bounds.right<=innerWidth+1 && [...panel.querySelectorAll('.card')].every(card=>card.getBoundingClientRect().right<=bounds.right);
  })).toBe(true);
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('.schedule-all').click();
 await expect(page.locator('dialog')).toBeVisible();await page.keyboard.press('Escape');

 for(const tab of ['计划','任务','资产','动态']) await page.locator(`[data-project-tab="${tab}"]`).click();
 for(const [title,count] of [['项目专家',4],['项目技能',10],['连接器',1]]) {
  const trigger=page.locator(`.project .panel button[data-title="${title}"]`);
  await trigger.click();
  await expect(page.locator('.config-dialog .config-item')).toHaveCount(count);
  if(title==='连接器') {
   await page.getByRole('tab',{name:'公共授权'}).click();
   await expect(page.getByText('暂无公共授权连接器')).toBeVisible();
   await page.getByRole('tab',{name:'个人授权'}).click();
  }
  await page.screenshot({path:`docs/ui/dialog-${title}.png`,animations:'disabled'});
  await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
 }
 await page.locator('.project .panel button[data-title="项目专家"]').click();
 await page.setViewportSize({width:390,height:844});
 expect(await page.locator('.config-dialog').evaluate(d=>d.scrollWidth<=d.clientWidth && d.getBoundingClientRect().right<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'取消',exact:true}).click();
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('#nav [data-page="capability"]').click();
 await page.screenshot({path:'docs/ui/capability.png',fullPage:true,animations:'disabled'});
 await page.getByLabel('搜索能力').fill('不存在');await expect(page.locator('#noResults')).toBeVisible();
 await page.getByLabel('搜索能力').fill('报价管理师');await expect(page.locator('#results .card:visible')).toHaveCount(1);
 await page.locator('#emptyToggle').click();await expect(page.getByRole('heading',{name:'还没有专家'})).toBeVisible();
 await page.setViewportSize({width:390,height:844});
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('#emptyToggle').click();
 await page.locator('#nav [data-page="library"]').click();
 await expect(page.locator('.library-table tbody tr')).toHaveCount(7);
 await page.screenshot({path:'docs/ui/library.png',fullPage:true,animations:'disabled'});
 await page.getByLabel('资料类型').selectOption('表格');
 await expect(page.locator('.library-table tbody tr:visible')).toHaveCount(3);
 await page.locator('[data-library-filter="我分享的"]').click();
 await expect(page.getByRole('heading',{name:'暂无资料'})).toBeVisible();
 await page.locator('[data-library-filter="最近访问"]').click();
 await page.locator('[data-library-section="搜索"]').click();
 await page.getByLabel('搜索资料').fill('库存');
 await expect(page.locator('.library-table tbody tr:visible')).toHaveCount(1);
 await page.setViewportSize({width:390,height:844});
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(errors).toEqual([]);
 console.log('PASS: five proposal pages, library search/type/shared states, navigation, input, search, project tabs, empty state, dialog, mobile width; no product API called');
} finally {await browser.close()}
