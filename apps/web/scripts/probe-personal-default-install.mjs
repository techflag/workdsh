import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { chromium, expect } from '@playwright/test';

const root=new URL('../',import.meta.url).pathname;
const home=await realpath(await mkdtemp(join(tmpdir(),'workdsh-personal-default-')));
const assets=join(home,'artifacts');await mkdir(assets);
const evidence=join(root,'.artifacts/plugin-delivery');await mkdir(evidence,{recursive:true});
const directories=['providers/identity-local','providers/browser-session','plugins/audit','plugins/access','plugins/skills','plugins/experts','plugins/connectors','plugins/library','bundle'];
const env={PATH:`${root}/node_modules/.bin:${dirname(process.execPath)}:/usr/bin:/bin`,HOME:process.env.HOME,DSH_HOME:home,DSH_AGENTS_HOME:join(home,'agents')};
const cli=join(root,'node_modules/@deepseek-ai/dsh/lib/bin.js');
const command=promisify(execFile);
const run=async(file,args,cwd=home)=>{const result=await command(file,args,{cwd,env,timeout:240000,maxBuffer:16*1024*1024});return result.stdout;};
const checks=[];const pass=message=>{checks.push(message);console.log('PASS: '+message);};
let server,browser,log='';
async function stop(){if(!server||server.exitCode!==null||server.signalCode!==null)return;const closed=new Promise(r=>server.once('close',r));server.kill('SIGTERM');const timer=setTimeout(()=>server.kill('SIGKILL'),3000);await closed;clearTimeout(timer);}
try{
 const packages=[];
 for(const directory of directories){
  const path=join(root,'../../packages',directory),manifest=JSON.parse(await readFile(join(path,'package.json'),'utf8'));
  await run(process.execPath,[join(root,'node_modules/pnpm/bin/pnpm.cjs'),'pack','--pack-destination',assets],path);
  const filename=`${manifest.name}-${manifest.version}.tgz`,bytes=await readFile(join(assets,filename));
  packages.push({name:manifest.name,filename,sha256:createHash('sha256').update(bytes).digest('hex')});
 }
 const project=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
 await writeFile(join(assets,'release-manifest.json'),JSON.stringify({version:'unreleased-default-probe',harness:project.devDependencies['@deepseek-ai/dsh'],packageManager:project.packageManager,runtimeOverrides:Object.fromEntries(Object.entries(project.pnpm.overrides).filter(([name])=>name.startsWith('@deepseek-ai/'))),packages,installation:{defaultPackages:packages.map(p=>p.name)}}));
 const wrapper=join(home,'dsh');await writeFile(wrapper,`#!/bin/sh\nexec '${process.execPath}' '${cli}' "$@"\n`,{mode:0o700});
 await run(process.execPath,[join(root,'scripts/install-project-release.mjs'),'--directory',assets,'--profile','personal','--dsh',wrapper]);
 const profile=JSON.parse(await readFile(join(home,'profiles/personal/package.json'),'utf8'));
 for(const name of packages.map(p=>p.name))assert.ok(profile.dependencies[name],name);
 for(const name of ['workdsh-plugin-office','workdsh-plugin-projects','workdsh-plugin-activity','workdsh-provider-identity-enterprise','workdsh-plugin-enterprise-collaboration'])assert.ok(!profile.dependencies[name],name);
 pass('Actual source installer creates a fresh personal Profile with only the default owned package set');
 server=spawn(process.execPath,[join(home,'profiles/personal/node_modules/@deepseek-ai/dsh/lib/bin.js'),'--profile','personal','--host','127.0.0.1','--port','0','--no-open'],{cwd:home,env,stdio:['ignore','pipe','pipe']});
 server.stdout.on('data',b=>{log+=b;});server.stderr.on('data',b=>{log+=b;});
 let host;
 for(let until=Date.now()+45000;Date.now()<until;){
  const match=log.match(/http:\/\/127\.0\.0\.1:\d+\/\?token=[\w-]+/);
  if(match){try{const response=await fetch(match[0],{redirect:'manual',signal:AbortSignal.timeout(1500)});const cookie=response.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');if(cookie){host={address:new URL(match[0]).origin,cookie};break;}}catch{}}
  if(server.exitCode!==null)break;await new Promise(r=>setTimeout(r,100));
 }
 assert.ok(host,'Fresh personal Host must boot');
 browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.addCookies(host.cookie.split('; ').map(pair=>{const i=pair.indexOf('=');return{name:pair.slice(0,i),value:pair.slice(i+1),url:host.address};}));
 const page=await context.newPage();await page.goto(host.address);
 for(const name of ['Continue','Configure later','Keep current display','Not now','Got it','继续','稍后配置','保留当前显示','暂不开启','知道了'])await page.getByRole('button',{name,exact:true}).last().click({timeout:700}).catch(()=>{});
 const entries=await page.evaluate(()=>window.__DSH_BOOT__.entries.map(r=>r.id));
 for(const name of ['skills','experts','connectors','library'])assert.ok(entries.includes('workdsh-plugin-'+name),name);
 assert.ok(!entries.some(name=>/enterprise|workdsh-plugin-(office|projects|activity)$/.test(name)));
 await expect(page.getByRole('button',{name:'专家 · 技能 · 连接器',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'资料库',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'项目',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'协作',exact:true})).toHaveCount(0);
 pass('Real browser loads four default feature Clients without enterprise or dangling project navigation');
 // Official first-run dialogs can arrive after initial rendering; dismiss via
 // their normal buttons and retry the first navigation without forced clicks.
 for(let attempt=0;attempt<3;attempt++){
  for(const name of ['Continue','Configure later','Keep current display','Not now','Got it','继续','稍后配置','保留当前显示','暂不开启','知道了'])await page.getByRole('button',{name,exact:true}).last().click({timeout:700}).catch(()=>{});
  try{await page.getByRole('button',{name:'专家 · 技能 · 连接器',exact:true}).click({timeout:2000});break;}catch(error){if(error.name!=='TimeoutError'||attempt===2)throw error;}
 }
 for(const name of ['专家','技能','连接器'])await expect(page.getByRole('button',{name,exact:true})).toBeVisible();
 pass('Shared feature center exposes experts, Skills and connectors');
 await page.screenshot({path:join(evidence,'personal-default.png')});
 await writeFile(join(evidence,'personal-default-runtime.json'),JSON.stringify({home,checks,packages,entries,modelCalls:0,originalProfilesModified:false},null,2));
}catch(error){await writeFile(join(evidence,'personal-default-failure.json'),JSON.stringify({home,error:String(error),hostLog:log.replace(/token=[^\s]+/g,'token=[redacted]').slice(-4000)},null,2));console.error('Probe failed; details saved without bootstrap token');process.exitCode=1;}
finally{await browser?.close();await stop();}
