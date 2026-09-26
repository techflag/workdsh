import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
const req=createRequire(resolve('packages/plugins/office/package.json'));
test('Live HTML follows committed revisions, isolates scripts and downloads original source',async()=>{
 const bundle=await build({stdin:{resolveDir:resolve('.'),contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {LiveHtml} from './packages/plugins/office/src/html/Page.tsx';window.saved={documentId:'html1',kind:'html',title:'预算看板',revision:0,generation:'one',state:{modelVersion:1,html:'<h1>首屏</h1>'}};const office={request:async(s,r)=>r.endpoint==='read'?structuredClone(window.saved):{}};createRoot(document.getElementById('root')).render(React.createElement(LiveHtml,{documentId:'html1',sessionId:'session-a',office,visible:true,signal:new AbortController().signal,requestId:'request1'}));`},bundle:true,platform:'browser',format:'iife',write:false,define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'react',setup(b){b.onResolve({filter:/^react(?:-dom)?(?:\/.*)?$/},a=>({path:req.resolve(a.path)}));}}]});
 const browser=await chromium.launch({headless:true});try{const page=await browser.newPage({acceptDownloads:true});page.setDefaultTimeout(8000);page.on('pageerror',e=>console.error(e.message));await page.route('http://127.0.0.1:19099/',route=>route.fulfill({contentType:'text/html',body:'<div id="root" style="height:700px;display:flex;flex-direction:column"></div>'}));await page.goto('http://127.0.0.1:19099/');await page.addScriptTag({content:bundle.outputFiles[0].text});await page.frameLocator('iframe').getByRole('heading',{name:'首屏'}).waitFor();
 const html=`<!doctype html><html><body><h1>预算更新</h1><button onclick="this.textContent='已点击'">查看预算</button><script>try{parent.document.body.dataset.leak='yes'}catch{document.body.dataset.isolated='yes'};fetch('https://example.com/data').catch(()=>document.body.dataset.blocked='yes');</script></body></html>`;
 await page.evaluate(html=>{window.saved={...window.saved,revision:1,state:{modelVersion:1,html}}},html);
 const frame=page.frameLocator('iframe');await frame.getByRole('heading',{name:'预算更新'}).waitFor();await frame.getByRole('button',{name:'查看预算'}).click();await frame.getByRole('button',{name:'已点击'}).waitFor();assert.equal(await page.locator('body').getAttribute('data-leak'),null);await frame.locator('body[data-isolated="yes"][data-blocked="yes"]').waitFor();
 await page.getByRole('button',{name:'查看源码'}).click();assert.equal(await page.getByRole('textbox',{name:'HTML 源码'}).inputValue(),html);
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'下载 HTML'}).click();const download=await pending;const {readFile}=await import('node:fs/promises');assert.equal(await readFile(await download.path(),'utf8'),html);
 }finally{await browser.close();}
});
