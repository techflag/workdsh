import {chromium} from '@playwright/test';import {writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const b=await chromium.launch();const p=await b.newPage({viewport:{width:600,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto('http://127.0.0.1:19093/experience.html');await p.waitForFunction(()=>window.api?.()?.getSlideCount()===6);await p.evaluate(()=>window.api().goTo(2));
 await p.locator('[data-pptx-element][aria-label="Chart: 计划功能完成情况"]').click();
 await p.getByRole('spinbutton',{name:'功能数量 value 1',exact:true}).fill('8');await p.keyboard.press('Tab');
 await p.waitForFunction(()=>window.api().getSlide(2).elements.find(e=>e.type==='chart').chartData.series[0].values[0]===8);
 assert.equal(await p.getByRole('button',{name:'图表配置',exact:true}).count(),0);
 const dataBox=await p.getByRole('spinbutton',{name:'功能数量 value 1',exact:true}).boundingBox();assert.ok(dataBox.y>=0&&dataBox.y+dataBox.height<900);
 await p.locator('[data-pptx-inspector] table tbody input[type=text]').first().fill('已交付');await p.keyboard.press('Tab');
 await p.waitForFunction(()=>window.api().getSlide(2).elements.find(e=>e.type==='chart').chartData.categories[0]==='已交付');
 const output=await p.evaluate(async()=>Array.from(await window.api().getContent()));await writeFile('.artifacts/pptx-react-trial/chart-config-saved.pptx',Buffer.from(output));
 const doc=await p.evaluate(b=>window.inspect(b),output);assert.equal(doc[2].charts[0].series[0].values[0],8);assert.equal(doc[2].charts[0].categories[0],'已交付');
 await p.screenshot({path:'.artifacts/pptx-react-trial/chart-config-zh.png'});
 await p.evaluate(b=>window.reopen(new Uint8Array(b)),output);await p.waitForFunction(()=>window.api().getSlide(2)?.elements.find(e=>e.type==='chart')?.chartData.series[0].values[0]===8);
 assert.deepEqual(errors,[]);console.log({manualPanel:true,saved:true,reopened:true,coverage:await p.evaluate(()=>window.translationCoverage),errors});
}finally{await b.close();}
