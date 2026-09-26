// Isolated 1.0 compatibility probe. Never replaces the application's working 0.25 SDK.
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const originFrame = process.argv.includes('--origin-frame');
const root = fileURLToPath(new URL('../.artifacts/univer-full-sdk/', import.meta.url));
const source = `
import { createUniver, LocaleType, mergeLocales, Univer } from '@univerjs/presets';
import { UniverDocsCorePreset } from '@univerjs/preset-docs-core';
import DocsLocale from '@univerjs/preset-docs-core/locales/zh-CN';
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';
import SheetsLocale from '@univerjs/preset-sheets-core/locales/zh-CN';
import '@univerjs/preset-docs-core/lib/index.css';
import '@univerjs/preset-sheets-core/lib/index.css';
import { UniverFormulaEnginePlugin } from '@univerjs/engine-formula';
import { UniverRenderEnginePlugin } from '@univerjs/engine-render';
import { UniverUIPlugin } from '@univerjs/ui';
import { UniverDrawingPlugin } from '@univerjs/drawing';
import { UniverDrawingUIPlugin } from '@univerjs/drawing-ui';
import '@univerjs/drawing-ui/lib/index.css';
import { UniverLicensePlugin } from '@univerjs-pro/license';
import { UniverSlidesPlugin } from '@univerjs-pro/slides';
import { UniverSlidesUIPlugin } from '@univerjs-pro/slides-ui';
import '@univerjs-pro/slides/facade';
import '@univerjs-pro/slides-ui/lib/index.css';
import { UniverBoardsPlugin } from '@univerjs-pro/boards';
import { UniverBoardsUIPlugin } from '@univerjs-pro/boards-ui';
import { UniverBoardsTablePlugin } from '@univerjs-pro/boards-table';
import { UniverBoardsTableUIPlugin } from '@univerjs-pro/boards-table-ui';
import { UniverBoardsMindPlugin } from '@univerjs-pro/boards-mind';
import { UniverBoardsMindUIPlugin } from '@univerjs-pro/boards-mind-ui';
import '@univerjs-pro/boards/facade';
import '@univerjs-pro/boards-ui/lib/index.css';
import { UniverInkUIPlugin } from '@univerjs-pro/ink-ui';
import { UniverShapeEditorUIPlugin } from '@univerjs-pro/shape-editor-ui';
import '@univerjs-pro/ink-ui/lib/index.css';
import { UniverBasesPlugin } from '@univerjs-pro/bases';
import { UniverBasesUIPlugin } from '@univerjs-pro/bases-ui';
import { UniverProFormulaEnginePlugin } from '@univerjs-pro/engine-formula';
import '@univerjs-pro/bases/facade';
import '@univerjs-pro/bases-ui/facade';
import '@univerjs-pro/bases-ui/lib/index.css';
import { UniverPdfsPlugin } from '@univerjs-pro/pdfs';
import { UniverPdfsUIPlugin } from '@univerjs-pro/pdfs-ui';
import '@univerjs-pro/pdfs/facade';
import '@univerjs-pro/pdfs-ui/lib/index.css';
import { UniverEmbedPlugin } from '@univerjs-pro/embed';
import { UniverEmbedUIPlugin } from '@univerjs-pro/embed-ui';
import '@univerjs-pro/embed-ui/lib/index.css';
import { FUniver } from '@univerjs/core/facade';
import { DocumentFlavor } from '@univerjs/core';
window.start = kind => {
 const locales = { [LocaleType.ZH_CN]: mergeLocales(DocsLocale, SheetsLocale) };
 let univer, univerAPI;
 if (['bases','pdfs'].includes(kind)) {
  univer = new Univer({locale:LocaleType.ZH_CN,locales});
  univer.registerPlugin(UniverRenderEnginePlugin);
  univer.registerPlugin(UniverUIPlugin,{container:'editor'});
  univer.registerPlugin(UniverLicensePlugin);
  if(kind==='bases') univer.registerPlugin(UniverProFormulaEnginePlugin);
  univerAPI = FUniver.newAPI(univer);
 } else {
  const preset = kind==='sheets'?UniverSheetsCorePreset({container:'editor',formula:{initialFormulaComputing:0}}):UniverDocsCorePreset({container:'editor'});
  const plugins = preset.plugins.map(p => { const ctor=Array.isArray(p)?p[0]:p; if(ctor!==UniverFormulaEnginePlugin)return p;return Array.isArray(p)?[UniverProFormulaEnginePlugin,p[1]]:UniverProFormulaEnginePlugin;});
  ({univer,univerAPI}=createUniver({locale:LocaleType.ZH_CN,locales,presets:[{plugins:[UniverLicensePlugin,...plugins]}]}));
 }
 // No license is copied from the showcase. Capture the real unlicensed result.
 if(['slides','boards','embed'].includes(kind)) { univer.registerPlugin(UniverDrawingPlugin);if(kind==='boards')univer.registerPlugin(UniverDrawingUIPlugin); }
 let unit;
 if(kind==='sheets') unit=univerAPI.createWorkbook({name:'Native sheets fixture'});
 if(['docs','modern-docs'].includes(kind)) unit=univerAPI.createDocument({title:'Native document fixture',documentStyle:{documentFlavor:kind==='modern-docs'?DocumentFlavor.MODERN:DocumentFlavor.TRADITIONAL}});
 if(kind==='slides') {univer.registerPlugin(UniverSlidesPlugin);univer.registerPlugin(UniverSlidesUIPlugin);unit=univerAPI.createPresentation({title:'Native slides fixture'});}
 if(kind==='boards') {for(const p of [UniverInkUIPlugin,UniverShapeEditorUIPlugin,UniverBoardsPlugin,UniverBoardsUIPlugin,UniverBoardsTablePlugin,UniverBoardsTableUIPlugin,UniverBoardsMindPlugin,UniverBoardsMindUIPlugin])univer.registerPlugin(p);unit=univerAPI.createBoard({name:'Native board fixture'});}
 if(kind==='bases') {univer.registerPlugin(UniverBasesPlugin);univer.registerPlugin(UniverBasesUIPlugin);unit=univerAPI.createBase({name:'Native base fixture'});}
 if(kind==='pdfs') {univer.registerPlugin(UniverPdfsPlugin);univer.registerPlugin(UniverPdfsUIPlugin);unit=univerAPI.createPdf({name:'Native PDF fixture'});}
 if(kind==='embed'){univer.registerPlugin(UniverEmbedPlugin);univer.registerPlugin(UniverEmbedUIPlugin);unit=univerAPI.createDocument({title:'Embed registration fixture'});}
 window.selectText=()=>unit.setSelection(0,0);
 window.edit=()=>{
  if(kind==='sheets')return unit.getActiveSheet().getRange('A1').setValue('Native edit confirmed');
  if(['docs','modern-docs','embed'].includes(kind))return unit.insertText(0,'Native edit confirmed');
  if(kind==='slides')return unit.appendSlide({title:'Native edit confirmed'});
  if(kind==='boards')return unit.insertText({text:'Native edit confirmed',left:80,top:80});
  if(kind==='bases')return unit.insertTable('Native edit confirmed');
  if(kind==='pdfs')return unit.insertPage();
 };
 window.snapshot=()=>unit.save(); window.dispose=()=>univer.dispose();
};`;
await writeFile(root+'composition.ts',source);
const bundle=await build({stdin:{contents:source,resolveDir:root,loader:'ts'},bundle:true,write:false,outdir:root,format:'iife',platform:'browser',target:'es2022',loader:{'.woff':'dataurl','.woff2':'dataurl','.ttf':'dataurl'},define:{'process.env.NODE_ENV':'"production"'}});
const js=bundle.outputFiles.find(f=>f.path.endsWith('.js')).text.replace(/<\/script/gi,'<\\/script');
const css=bundle.outputFiles.find(f=>f.path.endsWith('.css'))?.text??'';
const html=`<!doctype html><meta charset="utf-8"><style>html,body,#editor{width:100%;height:100%;margin:0;overflow:hidden}${css}</style><div id="editor"></div><script>${js}</script>`;
await writeFile(root+'probe.html',html);
const browser=await chromium.launch({headless:true});const results=[];
try {for(const kind of ['sheets','docs','modern-docs','slides','boards','bases','pdfs','embed']) {
 const page=await browser.newPage({viewport:{width:1200,height:900}});const errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{if(route.request().url()==='http://full-sdk.invalid/')return route.fulfill({contentType:'text/html',body:originFrame?'<iframe src="http://full-sdk-frame.invalid/" sandbox="allow-scripts allow-same-origin" style="width:100%;height:100vh;border:0"></iframe>':'<iframe sandbox="allow-scripts" style="width:100%;height:100vh;border:0"></iframe>'});if(originFrame&&route.request().url()==='http://full-sdk-frame.invalid/')return route.fulfill({contentType:'text/html',body:html});requests.push(route.request().url());return route.abort();});
 await page.goto('http://full-sdk.invalid/');if(!originFrame)await page.locator('iframe').evaluate((f,h)=>{f.srcdoc=h;},html);
 const frame=page.frames().find(f=>f!==page.mainFrame());await frame.waitForFunction(()=>typeof window.start==='function');
 let startupError,snapshot;
 try{await frame.evaluate(k=>window.start(k),kind);snapshot=await frame.evaluate(()=>window.snapshot());}catch(e){startupError=e.message;}
 let canvasRendered=false;
 try{await frame.waitForSelector('canvas',{timeout:5000});canvasRendered=true;}catch{}
 let editing='NOT TESTED',editError;
 if(originFrame&&snapshot&&canvasRendered&&!errors.length){
  try{
   await frame.evaluate(()=>window.edit());
   if(['docs','modern-docs'].includes(kind)){await frame.evaluate(()=>window.selectText());await page.keyboard.type('Keyboard verified ');await frame.waitForFunction(()=>window.snapshot().body.dataStream.includes('Keyboard verified '));}
   const after=await frame.evaluate(()=>window.snapshot());
   editing=JSON.stringify(after)!==JSON.stringify(snapshot)?(['docs','modern-docs'].includes(kind)?'Native keyboard and Facade snapshot change':'Native Facade snapshot change'):'FAILED: unchanged snapshot';snapshot=after;
  }catch(e){editError=e.message;editing='FAILED';}
 }
 // Give the native UI its asynchronous render turn before visual evidence.
 await frame.evaluate(()=>new Promise(resolve=>setTimeout(resolve,1000)));
 await page.screenshot({path:root+(originFrame?'origin-':'')+kind+'.png'});
 const result={kind,version:'1.0.0-rc.0',initialized:!!snapshot,canvasRendered,startupError,errors,externalRequests:requests.length,licenseConfigured:false,editing,editError,officeConversion:'NOT TESTED',harnessTab:'NOT TESTED'};
 console.log(JSON.stringify(result));results.push(result);if(snapshot)await writeFile(root+kind+'-snapshot.json',JSON.stringify(snapshot,null,2));await page.close();
}await writeFile(root+(originFrame?'origin-frame-result.json':'result.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));if(results.some(r=>!r.initialized||r.errors.length||r.externalRequests||r.editError||r.editing.startsWith('FAILED')))process.exitCode=1;}finally{await browser.close();}
