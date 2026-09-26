import {build} from 'esbuild';import {nativePptPlugin} from './build-pptx-native.mjs';import {writeFile,mkdir} from 'node:fs/promises';import {pathToFileURL} from 'node:url';import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const dir='.artifacts/office-pptx-native';await mkdir(dir,{recursive:true});
await build({entryPoints:['packages/plugins/office/src/presentation/native-deck.ts'],bundle:true,platform:'node',format:'esm',outfile:dir+'/deck.mjs'});
const {createPresentation,applyPresentation}=await import(pathToFileURL(process.cwd()+'/'+dir+'/deck.mjs'));
let deck=await createPresentation('接入验证');
const element={id:'chart-test',type:'chart',x:80,y:120,width:500,height:300,chartData:{chartType:'pie',categories:['已完成','待完成'],series:[{name:'功能数',values:[7,3]}],title:'完成情况',hasLegend:true}};
deck=await applyPresentation(deck,[{op:'presentation.updateSlide',slideId:deck.slides[0].id,patch:{elements:[element]}}]);
await writeFile(dir+'/entry.ts',`import {mountNativePpt} from '../../packages/plugins/office/src/presentation/frame.js'; window.saved=[];window.ready=false;window.frame=mountNativePpt(document.getElementById('host'),${JSON.stringify(deck)},{editable:true,onReady:()=>window.ready=true,onSave:async d=>window.saved.push(d)});`);
await build({entryPoints:[dir+'/entry.ts'],bundle:true,platform:'browser',format:'iife',outfile:dir+'/app.js',loader:{'.css':'text'},plugins:[nativePptPlugin()],define:{'process.env.NODE_ENV':'"production"'}});
const styleSource=await (await import('node:fs/promises')).readFile('packages/plugins/office/src/live/style.ts','utf8');
const hostCss=styleSource.slice(styleSource.indexOf('`')+1,styleSource.lastIndexOf('`'));
const b=await chromium.launch(),p=await b.newPage({viewport:{width:900,height:800}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await p.route('http://pptx-integration.test/',r=>r.fulfill({body:'<html><head><style>'+hostCss+'</style></head><body class="wd-office-live" style="margin:0"><button id="outside">宿主按钮</button><div id="host" style="height:750px"></div></body></html>',contentType:'text/html'}));await p.goto('http://pptx-integration.test/');const before=await p.locator('#outside').evaluate(e=>getComputedStyle(e).fontSize);await p.addScriptTag({path:dir+'/app.js'});await p.waitForFunction(()=>window.ready);
 assert.equal(await p.locator('iframe').count(),0);assert.equal(await p.locator('.ribbon-action').first().evaluate(e=>getComputedStyle(e).borderTopWidth),'0px');assert.equal(await p.getByText('AutoSave',{exact:true}).count(),0);assert.equal(await p.locator('#outside').evaluate(e=>getComputedStyle(e).fontSize),before);
 await p.locator('[data-pptx-element][aria-label^="Chart:"]').click();await p.screenshot({path:dir+'/before-edit.png'});const input=p.locator('input[aria-label="功能数 value 1"]').first();await input.fill('8');await input.blur();await p.evaluate(()=>window.frame.flush());await p.waitForFunction(()=>window.saved.length>0);
 const saved=await p.evaluate(()=>window.saved.at(-1));assert.equal(saved.provider,'pptx-react');assert.equal(saved.slides[0].id,deck.slides[0].id);assert.equal(saved.slides[0].elements.find(e=>e.type==='chart').chartData.series[0].values[0],8);
 await p.screenshot({path:dir+'/integrated.png'});await p.evaluate(()=>window.frame.dispose());assert.equal(await p.locator('.workdsh-ppt-editor').count(),0);assert.deepEqual(errors,[]);console.log({nativeChartEdit:true,durableCallback:true,stableId:true,noIframe:true,cssScoped:true,dispose:true,errors});
}finally{await b.close()}
