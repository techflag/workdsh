import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {expect} from '@playwright/test';
import {build} from 'esbuild';

// Explicit --real-model acceptance uses the official Agent loop and configured
// provider. No synthetic turn events or direct service edits are used here.
export async function verifyRealPdf({api,host,page,workspace,artifacts,root,pass}) {
 const {sessionId}=await api(host,{action:'create'});
 await page.evaluate(sid=>window.officeLiveProbe.open(sid),sessionId);
 const baseline=await api(host,{action:'real-state',sessionId});
 const previous=new Set(baseline.documents.map(d=>d.documentId));
 const prompt='请制作并交付一份两页中文 PDF《预算执行简报》。第1页是预算执行概览：本期收入1000万元、支出800万元、结余200万元，结余率20%（结余÷收入）。第2页是行动与待确认：核对支出凭证、确认下一期预算；上一期数据、具体责任人和截止日期均未提供，请明确标为待确认，不要编造。版式清晰，保留这些业务事实。完成后输出可下载的PDF文件。';
 const started=Date.now();
 await api(host,{action:'real-write',sessionId,messageId:randomUUID(),prompt});
 let state,document;const samples=[];const deadline=Date.now()+300000;
 while(Date.now()<deadline){
  state=await api(host,{action:'real-state',sessionId});
  document=state.documents.find(d=>!previous.has(d.documentId));
  if(document&&samples.at(-1)?.revision!==document.revision){samples.push({revision:document.revision,elapsedMs:Date.now()-started});console.log(`Real PDF revision ${document.revision} after ${Date.now()-started}ms`);}
  if(state.status==='idle'&&Date.now()-started>15000)break;
  await new Promise(resolve=>setTimeout(resolve,1000));
 }
 await writeFile(join(artifacts,'real-result.json'),JSON.stringify({prompt,sessionId,samples,status:state?.status,trace:state?.trace,deliveries:state?.deliveries,document},null,2));
 assert.equal(state?.status,'idle','Real model must finish within the acceptance deadline');
 assert.equal(document?.kind,'pdf','Natural-language PDF request must use the live PDF adapter');
 assert.equal(document.state.pages.length,2,'Requested two-page report must have exactly two pages');
 assert.ok(document.revision>=2,'Real model must commit more than one content batch');
 const calls=state.trace.filter(e=>e.type==='tool/call');
 assert.equal(calls[0]?.name,'content_open','First model tool must open the live report');
 assert.ok(calls.filter(e=>e.name==='content_edit').length>=2);
 assert.ok(calls.some(e=>e.name==='content_export'),'Model must export the final file');
 const texts=document.state.pages.map(p=>p.elements.filter(e=>e.type==='text').map(e=>e.text).join('\n').replace(/(?<=\d),(?=\d{3})/g,''));
 assert.match(texts[0],/1000/);assert.match(texts[0],/800/);assert.match(texts[0],/200/);assert.match(texts[0],/20\s*[%％]/);
 assert.match(texts[1],/凭证/);assert.match(texts[1],/待确认/);
 assert.ok(state.deliveries.length,'A real native file delivery event is required');
 const delivery=state.deliveries.at(-1).data.files.find(f=>f.path.endsWith('.pdf'));
 assert.ok(delivery,'Native delivery must contain a PDF');
 const bytes=await readFile(join(workspace,delivery.path));assert.equal(bytes.subarray(0,5).toString(),'%PDF-');
 await expect(page.getByRole('status').filter({hasText:`修订 ${document.revision} · 预览已更新`})).toBeVisible({timeout:30000});
 const waiting=page.waitForEvent('download');await page.getByRole('button',{name:'下载 PDF',exact:true}).click();const download=await waiting;
 const finalPath=join(artifacts,'real-budget-report.pdf');await download.saveAs(finalPath);
 assert.ok(bytes.equals(await readFile(finalPath)),'Delivered PDF and sidebar download must be the exact final revision');
 const bundle=await build({stdin:{resolveDir:root,contents:"import {createPdfTask} from './packages/plugins/office/src/pdf/viewer.ts';window.readAcceptancePdf=async(bytes)=>{const job=createPdfTask(Uint8Array.from(atob(bytes),c=>c.charCodeAt(0)));try{const doc=await job.task.promise;const pages=[];for(let i=1;i<=doc.numPages;i++){const p=await doc.getPage(i),text=await p.getTextContent();pages.push(text.items.map(x=>x.str).join(''));}return pages;}finally{await job.destroy();}};"},bundle:true,platform:'browser',format:'iife',write:false,plugins:[{name:'pdf-worker-text',setup(b){b.onLoad({filter:/pdf\.worker\.min\.mjs$/},async args=>({contents:await readFile(args.path,'utf8'),loader:'text'}));}}]});
 await page.addScriptTag({content:bundle.outputFiles[0].text});
 const extracted=await page.evaluate(b=>window.readAcceptancePdf(b),bytes.toString('base64'));
 assert.equal(extracted.length,2);assert.match(extracted[0].replace(/(?<=\d),(?=\d{3})/g,''),/1000/);assert.match(extracted[0],/20\s*[%％]/);assert.match(extracted[1],/待确认/);
 await page.screenshot({path:join(artifacts,'real-page-1.png')});
 await page.getByRole('button',{name:'下一页',exact:true}).click();await expect(page.getByRole('status').filter({hasText:`修订 ${document.revision} · 预览已更新`})).toBeVisible({timeout:30000});
 await page.screenshot({path:join(artifacts,'real-page-2.png')});
 await writeFile(join(artifacts,'real-pdf-text.json'),JSON.stringify(extracted,null,2));
 pass('Real model uses official loop to open, update and deliver a two-page Chinese PDF; final bytes and business facts match');
}
