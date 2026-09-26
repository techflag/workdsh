import test from "node:test";
import assert from "node:assert/strict";
import {build} from "esbuild";
import {chromium} from "@playwright/test";
import {createRequire} from "node:module";
const JSZip=createRequire(new URL("../../packages/plugins/office/package.json",import.meta.url))("jszip");
import {mkdir,writeFile} from "node:fs/promises";
await mkdir('.artifacts/office-rich',{recursive:true});
const png="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf1kAAAAASUVORK5CYII=";
const bundle=await build({stdin:{contents:`export {Editor} from '@tiptap/core';export {documentExtensions} from './extensions.ts';export {editorContent,documentDiff,editorBlocks} from './adapter.ts';export {applyOperations,blockInput,parse} from '../content/model.ts';export {documentDocx} from './docx.ts';export {importDocx} from './import-docx.ts';export {officeCss} from './style.ts';`,resolveDir:new URL('../../packages/plugins/office/src/live/',import.meta.url).pathname},bundle:true,platform:'browser',format:'iife',globalName:'RichOffice',write:false});
async function expectList(page){assert.equal(await page.locator('table ul').count(),1);}
async function withPage(run){const browser=await chromium.launch({headless:true});try{const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.route('https://rich-office.test/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><div class="wd-office-live"><div class="wd-office-paper-scroll"><div class="wd-office-paper"><div id="editor"></div></div></div></div>'}));await page.goto('https://rich-office.test/');await page.addScriptTag({content:bundle.outputFiles[0].text});await page.evaluate(()=>{const style=document.createElement('style');style.textContent=RichOffice.officeCss;document.head.append(style);window.e=new RichOffice.Editor({element:document.querySelector('#editor'),extensions:RichOffice.documentExtensions(),content:'<p>门店经营报告</p>',editorProps:{attributes:{class:'wd-office-writing'}}});});await run(page);}finally{await browser.close();}}
test('Native Tiptap table commands, merge/split, actual column dragging and image resizing persist through the shared reducer',async()=>withPage(async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(()=>{e.commands.focus('end');e.commands.insertTable({rows:3,cols:3,withHeaderRow:true});e.commands.addRowAfter();e.commands.addColumnAfter();});
  assert.equal(await page.locator('tr').count(),4);assert.equal(await page.locator('tr').first().locator('th,td').count(),4);
  await page.evaluate(()=>{e.commands.deleteRow();e.commands.deleteColumn();const cells=[];e.state.doc.descendants((n,p)=>{if(n.type.name==='tableHeader'||n.type.name==='tableCell')cells.push(p)});e.commands.setCellSelection({anchorCell:cells[0],headCell:cells[1]});e.commands.mergeCells();});
  assert.equal(await page.locator(':is(th,td)[colspan="2"]').count(),1);
  await page.evaluate(()=>e.commands.splitCell());assert.equal(await page.locator('tr').first().locator('th,td').count(),3);
  const cell=await page.locator('th,td').first().boundingBox();await page.mouse.move(cell.x+cell.width-2,cell.y+15);await page.mouse.down();await page.mouse.move(cell.x+cell.width+38,cell.y+15,{steps:8});await page.mouse.up();
  assert.ok(await page.evaluate(()=>{let resized=false;e.state.doc.descendants(n=>{if(n.attrs.colwidth?.some(v=>v>0))resized=true});return resized;}),'native column drag updates colwidth');
  await page.evaluate(()=>{let cell; e.state.doc.descendants((node,pos)=>{if(cell===undefined && (node.type.name==='tableCell' || node.type.name==='tableHeader'))cell=pos;});e.commands.setTextSelection(cell+2);e.commands.toggleBulletList();e.commands.insertContent('单元格中的原生列表');});
  await expectList(page);
  await page.evaluate(src=>{e.commands.insertContentAt(e.state.doc.content.size,{type:'paragraph'});e.commands.focus('end');e.commands.setImage({src,width:240,height:180,alt:'经营图'});e.commands.updateAttributes('image',{alignment:'right'});},png);
  await page.locator('img').waitFor();await page.waitForFunction(()=>document.querySelector('img')?.complete);
  const handle=page.locator('[data-resize-handle="bottom-right"]');await handle.hover();const image=await handle.boundingBox();await page.mouse.move(image.x+4,image.y+4);await page.mouse.down();await page.mouse.move(image.x+64,image.y+49,{steps:8});await page.mouse.up();
  const result=await page.evaluate(()=>{const empty={modelVersion:1,blockIds:[],blocks:{}};const operations=RichOffice.documentDiff(empty,e.getJSON());let n=0;const state=RichOffice.applyOperations(empty,operations,()=>`saved-${++n}`).state;for(const id of state.blockIds)RichOffice.parse(RichOffice.blockInput,(({blockId,runs,...b})=>({...b,runs:runs.map(({runId,...r})=>r)}))(state.blocks[id]));const restored=structuredClone(state);
for(const id of restored.blockIds){const {blockId,runs,...body}=restored.blocks[id];const parsed=RichOffice.parse(RichOffice.blockInput,{...body,runs:runs.map(({runId,...r})=>r)});restored.blocks[id]={...parsed,blockId,runs:parsed.runs.map((r,i)=>({...r,runId:`restored-${i}`}))};}
e.commands.setContent(RichOffice.editorContent(restored));return {types:state.blockIds.map(id=>state.blocks[id].type),image:state.blockIds.map(id=>state.blocks[id]).find(b=>b.type==='image').image,diff:RichOffice.documentDiff(restored,e.getJSON())};});
  assert.ok(result.types.includes('table'));assert.ok(result.image.width>240,'native resize commits image dimensions: '+JSON.stringify(result.image));assert.equal(result.image.alignment,'right');assert.deepEqual(result.diff,[]);assert.deepEqual(errors,[]);
  await mkdir('.artifacts/office-rich',{recursive:true});await page.screenshot({path:'.artifacts/office-rich/native-editor.png',fullPage:true});
}));
test('DOCX preserves merged table, resized embedded image and text styles on export/import; external image relationships are not fetched',async()=>withPage(async page=>{
  const result=await page.evaluate(async src=>{
    const p=text=>({type:'paragraph',runs:[{text,marks:['bold'],style:{fontSize:18,color:'#224466'}}]});
    const table={type:'table',runs:[],table:{rows:[{cells:[{colspan:2,rowspan:1,colwidth:[120,180],header:true,paragraphs:[p('经营汇总')]}]},{cells:[{colspan:1,rowspan:2,colwidth:[120],paragraphs:[p('门店A')]},{colspan:1,rowspan:1,colwidth:[180],paragraphs:[p('第一期')]}]},{cells:[{colspan:1,rowspan:1,colwidth:[180],paragraphs:[p('第二期')]}]}]}};
    const image={type:'image',runs:[],image:{src,width:300,height:225,alignment:'center',alt:'经营图'}};
    const input=[p('报告'),table,image],empty={modelVersion:1,blockIds:[],blocks:{}};let n=0;
    const state=RichOffice.applyOperations(empty,[{op:'document.insertBlocks',afterBlockId:null,blocks:input.map((b,i)=>({...b,clientRef:`c-${i}`}))}],()=>`id-${++n}`).state;
    const snapshot={kind:'document',documentId:'doc',title:'报告',revision:1,generation:'g',state};
    const blob=await RichOffice.documentDocx(snapshot),bytes=new Uint8Array(await blob.arrayBuffer());
    const imported=await RichOffice.importDocx(bytes,'report.docx');
    e.commands.setContent(RichOffice.editorContent(state));
    return {imported,bytes:Array.from(bytes),body:e.getText()};
  },png);
  const table=result.imported.blocks.find(b=>b.type==='table');assert.equal(table.table.rows[0].cells[0].colspan,2);assert.equal(table.table.rows[1].cells[0].rowspan,2);assert.equal(table.table.rows[2].cells.length,1);assert.deepEqual(table.table.rows[0].cells[0].colwidth,[120,180]);assert.equal(table.table.rows[1].cells[0].paragraphs[0].runs[0].style.color,'#224466');assert.ok(table.table.rows[1].cells[0].paragraphs[0].runs[0].marks.includes('bold'));
  const image=result.imported.blocks.find(b=>b.type==='image');assert.equal(image.image.src,png);assert.equal(image.image.width,300);assert.equal(image.image.height,225);assert.equal(image.image.alignment,'center');assert.ok(!result.imported.warnings.includes('表格布局'));assert.ok(!result.imported.warnings.includes('图片/图表'));
  const zip=await JSZip.loadAsync(new Uint8Array(result.bytes));
  const rels=await zip.file('word/_rels/document.xml.rels').async('string');
  zip.file('word/_rels/document.xml.rels',rels.replace('Target="media/image1.png"','Target="https://external-office.test/image.png" TargetMode="External"'));
  const external=await zip.generateAsync({type:'base64'});const requests=[];page.on('request',request=>{if(request.url().includes('external-office.test'))requests.push(request.url());});
  const rejected=await page.evaluate(async bytes=>RichOffice.importDocx(Uint8Array.from(atob(bytes),c=>c.charCodeAt(0)),'external.docx'),external);
  assert.ok(rejected.warnings.includes('图片/图表'));assert.ok(!rejected.blocks.some(b=>b.type==='image'));assert.deepEqual(requests,[]);
  await writeFile('.artifacts/office-rich/roundtrip.docx',new Uint8Array(result.bytes));
}));
test('Structured chart is rendered by the Word plugin as SVG and roundtrips without becoming an image',async()=>withPage(async page=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const result=await page.evaluate(()=>{
    const chart={chartType:'bar',title:'12个月期末现金余额',categories:['1月','2月','3月'],series:[{name:'现金余额',values:[120,330,480],color:'#2563eb'},{name:'最低保有量',values:[500,500,500],color:'#f97316'}],width:640,height:360,alignment:'center',legend:'bottom',yAxisTitle:'万元'};
    const state={modelVersion:1,blockIds:['chart-1'],blocks:{'chart-1':{blockId:'chart-1',type:'chart',runs:[],chart}}};
    e.commands.setContent(RichOffice.editorContent(state));
    return {diff:RichOffice.documentDiff(state,e.getJSON()),json:e.getJSON()};
  });
  await page.locator('.wd-office-chart svg').waitFor();
  assert.equal(await page.locator('.wd-office-chart rect').count(),6);
  assert.equal(await page.locator('.wd-office-chart img').count(),0);
  assert.equal(await page.locator('.wd-office-chart-legend span').count(),2);
  assert.equal(await page.locator('.wd-office-chart figcaption').textContent(),'12个月期末现金余额');
  assert.equal(result.json.content[0].type,'officeChart');
  assert.deepEqual(result.diff,[]);
  assert.deepEqual(errors,[]);
  await page.screenshot({path:'.artifacts/office-rich/native-word-chart.png',fullPage:true});
}));
