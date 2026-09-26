import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const browser=await chromium.launch();const p=await browser.newPage({viewport:{width:600,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto('http://127.0.0.1:19093/experience.html');await p.waitForFunction(()=>window.api?.()?.getSlideCount()===6);await p.getByRole('navigation').waitFor();
 await p.getByRole('tab',{name:'插入',exact:true}).click();await p.locator('.ribbon-menu summary').filter({hasText:'图表'}).click();await p.getByRole('button',{name:'折线图',exact:true}).click();
 await p.waitForFunction(()=>window.api().getSlide(0).elements.some(e=>e.type==='chart'&&e.chartData.chartType==='line'));
 await p.getByRole('button',{name:'表格',exact:true}).click();await p.waitForFunction(()=>window.api().getSlide(0).elements.some(e=>e.type==='table'));
 await p.getByRole('button',{name:'空白页面',exact:true}).click();await p.waitForFunction(()=>window.api().getSlideCount()===7);
 await p.getByRole('tab',{name:'视图',exact:true}).click();await p.getByRole('checkbox',{name:'网格线',exact:true}).check();assert.equal(await p.getByRole('checkbox',{name:'网格线',exact:true}).isChecked(),true);
 await p.getByRole('button',{name:'适应窗口',exact:true}).first().click();await p.getByRole('tab',{name:'开始',exact:true}).click();
 assert.equal(await p.getByRole('navigation').isVisible(),true);
 assert.deepEqual(errors,[]);await p.screenshot({path:'.artifacts/pptx-react-trial/ribbon-600.png'});console.log({chart:true,table:true,addedPage:true,grid:true,tabs:true,errors});
}finally{await browser.close();}
