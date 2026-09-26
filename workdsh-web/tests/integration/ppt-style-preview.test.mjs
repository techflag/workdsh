import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const compiled=await build({entryPoints:['packages/plugins/office/src/presentation/style-preview.ts'],bundle:true,platform:'node',format:'cjs',write:false});
const mod={exports:{}};new Function('module','exports',compiled.outputFiles[0].text)(mod,mod.exports);
const {renderStylePreview}=mod.exports;
test('Style previews escape supplied material and render readable distinct covers at desktop and narrow widths',async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1060,height:1000},colorScheme:'dark'});
  for(const family of ['general','red']) {
   const {html,styles}=renderStylePreview({title:'先进无机非金属材料数据资源节点',subtitle:'建设方案汇报',footer:'2026年9月 · 项目组',family,operationId:'preview-'+family});
   await page.setContent(html);
   assert.equal(await page.locator('.card').count(),4);
   assert.equal(new Set(styles.map(s=>s.layout)).size,4);
   assert.equal(await page.locator('.recommended').count(),1);
   assert.equal(await page.getByRole('button').count(),0);
   assert.equal(await page.locator('.cover h3').first().textContent(),'先进无机非金属材料数据资源节点');
   for(const width of [1060,360]) {
    await page.setViewportSize({width,height:1000});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    const overflow=await page.locator('.cover h3').evaluateAll(nodes=>nodes.some(n=>n.scrollHeight>n.clientHeight+1||n.scrollWidth>n.clientWidth+1));
    assert.equal(overflow,false);
   }
   await page.setViewportSize({width:1060,height:1000});
   await mkdir('.test-runtime/ppt-style-preview',{recursive:true});
   await page.screenshot({path:'.test-runtime/ppt-style-preview/'+family+'.png',fullPage:true});
  }
  const hostile=renderStylePreview({title:'<img src=x onerror="window.leak=1">',subtitle:'</style><script>window.leak=2</script>',operationId:'hostile'});
  await page.setContent(hostile.html);
  assert.equal(await page.locator('img,script').count(),0);
  assert.equal(await page.evaluate(()=>window.leak),undefined);
  assert.throws(()=>renderStylePreview({title:' ',operationId:'invalid'}));
 } finally {await browser.close();}
});
