import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const b=await chromium.launch();const p=await b.newPage({viewport:{width:600,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto('http://127.0.0.1:19093/experience.html');await p.waitForFunction(()=>window.api?.()?.getSlideCount()===6);await p.evaluate(()=>window.api().goTo(2));await p.locator('[data-pptx-element][aria-label="Chart: 计划功能完成情况"]').click();
 const inspector=p.locator('[data-pptx-inspector]');
 await inspector.getByText('图表类型与标题',{exact:true}).click();
 const select=inspector.locator('details').filter({has:p.locator('summary').filter({hasText:'图表类型与标题'})}).locator('select').first();
 const options=await select.locator('option').allTextContents();for(const term of ['Bar (3-D)','Line (3-D)','Pie (3-D)','Area (3-D)','Surface','Histogram','Pareto','Funnel','Treemap','Sunburst'])assert.ok(!options.includes(term),term);
 await select.selectOption('line');await p.waitForFunction(()=>window.api().getSlide(2).elements.find(e=>e.type==='chart').chartData.chartType==='line');
 await inspector.getByText('图表类型与标题',{exact:true}).click();
 await inspector.getByPlaceholder('描述此元素，便于辅助功能识别').fill('完成情况图表');await inspector.getByPlaceholder('辅助功能标题（可选）').fill('完成情况');
 await p.screenshot({path:'.artifacts/pptx-react-trial/inspector-properties-zh.png'});
 let text=await inspector.innerText();for(const term of ['Alt text','Accessibility title','ACTION','On Click','On Hover','TRANSFORM','Rotation (','Opacity','Forward','Backward'])assert.ok(!text.includes(term),term);
 await inspector.getByTitle('元素',{exact:true}).click();assert.ok((await inspector.innerText()).includes('图层顺序'));assert.ok(!(await inspector.innerText()).includes('chart'));await p.screenshot({path:'.artifacts/pptx-react-trial/inspector-elements-zh.png'});
 await inspector.getByTitle('批注',{exact:true}).click();const comment=inspector.getByPlaceholder('为图表输入批注…');await comment.fill('请核对完成数量');await inspector.getByRole('button',{name:'添加批注',exact:true}).click();await inspector.getByText('请核对完成数量',{exact:true}).first().waitFor();
 text=await inspector.innerText();for(const term of ['SLIDE COMMENTS','No comments','Commenting on','Add Comment','You','Chart',' AM',' PM'])assert.ok(!text.includes(term),term);await p.screenshot({path:'.artifacts/pptx-react-trial/inspector-comments-zh.png'});
 assert.deepEqual(errors,[]);console.log({chartLabels:true,chartTypeChange:true,accessibility:true,layers:true,commentAdded:true,errors});
}finally{await b.close()}
