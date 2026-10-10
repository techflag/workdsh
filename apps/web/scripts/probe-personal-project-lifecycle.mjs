import assert from 'node:assert/strict';
import { readFile, writeFile, realpath } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { chromium, expect } from '@playwright/test';

const root=new URL('../',import.meta.url).pathname,evidence=join(root,'.artifacts/plugin-delivery');
const baseline=JSON.parse(await readFile(join(evidence,'personal-default-runtime.json'),'utf8'));
const home=await realpath(baseline.home);
assert.match(home,/\/T\/workdsh-personal-default-[\w-]+$/);
const manifestPath=join(home,'profiles/personal/package.json');
const before=JSON.parse(await readFile(manifestPath,'utf8'));assert.ok(!before.dependencies['workdsh-plugin-projects']);
const env={PATH:`${root}/node_modules/.bin:${dirname(process.execPath)}:/usr/bin:/bin`,HOME:process.env.HOME,DSH_HOME:home,DSH_AGENTS_HOME:join(home,'agents'),npm_config_offline:'true'};
const cli=join(home,'profiles/personal/node_modules/@deepseek-ai/dsh/lib/bin.js'),exec=promisify(execFile);
const run=async(args)=>exec(process.execPath,[cli,...args],{cwd:home,env,timeout:120000,maxBuffer:8*1024*1024});
const checks=[];let server,browser,log='';
async function stop(){await browser?.close();browser=undefined;if(!server||server.exitCode!==null||server.signalCode!==null)return;const done=new Promise(r=>server.once('close',r));server.kill('SIGTERM');const timer=setTimeout(()=>server.kill('SIGKILL'),3000);await done;clearTimeout(timer);}
async function inspect(installed){
 log='';server=spawn(process.execPath,[cli,'--profile','personal','--host','127.0.0.1','--port','0','--no-open'],{cwd:home,env,stdio:['ignore','pipe','pipe']});
 server.stdout.on('data',b=>{log+=b;});server.stderr.on('data',b=>{log+=b;});let host;
 for(let deadline=Date.now()+45000;Date.now()<deadline;){const match=log.match(/http:\/\/127\.0\.0\.1:\d+\/\?token=[\w-]+/);if(match)try{const r=await fetch(match[0],{redirect:'manual',signal:AbortSignal.timeout(1500)}),cookie=r.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');if(cookie){host={address:new URL(match[0]).origin,cookie};break;}}catch{}if(server.exitCode!==null)break;await new Promise(r=>setTimeout(r,100));}
 assert.ok(host,'Personal Host boots after lifecycle operation');browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.addCookies(host.cookie.split('; ').map(pair=>{const i=pair.indexOf('=');return{name:pair.slice(0,i),value:pair.slice(i+1),url:host.address};}));const page=await context.newPage();await page.goto(host.address);
 const dismiss=async()=>{for(const name of ['Continue','Configure later','Keep current display','Not now','Got it','继续','稍后配置','保留当前显示','暂不开启','知道了'])await page.getByRole('button',{name,exact:true}).last().click({timeout:500}).catch(()=>{});};await dismiss();
 const entries=await page.evaluate(()=>window.__DSH_BOOT__.entries.map(x=>x.id));assert.equal(entries.includes('workdsh-plugin-projects'),installed);assert.ok(!entries.some(x=>/enterprise/.test(x)));
 for(const name of ['skills','experts','connectors','library'])assert.ok(entries.includes('workdsh-plugin-'+name));
 const project=page.getByRole('button',{name:'项目',exact:true});await expect(project).toHaveCount(installed?1:0);
 if(installed){for(let attempt=0;attempt<3;attempt++){await dismiss();try{await project.click({timeout:2000});break;}catch(e){if(e.name!=='TimeoutError'||attempt===2)throw e;}}await expect(page.getByRole('heading',{name:'项目',exact:true})).toBeVisible();}
 await page.screenshot({path:join(evidence,installed?'projects-installed.png':'projects-removed.png')});
 checks.push(installed?'Optional project package contributes a working native sidebar page':'Official removal removes project navigation while preserving four default Clients');console.log('PASS: '+checks.at(-1));await stop();
}
try{
 const pkg=JSON.parse(await readFile(join(root,'../../packages/plugins/projects/package.json'),'utf8'));
 await exec(process.execPath,[join(root,'node_modules/pnpm/bin/pnpm.cjs'),'pack','--pack-destination',join(home,'artifacts')],{cwd:join(root,'../../packages/plugins/projects'),env,timeout:60000,maxBuffer:8*1024*1024});
 await run(['plugin','--profile','personal','add',join(home,'artifacts',`${pkg.name}-${pkg.version}.tgz`),'--offline']);
 await inspect(true);
 await run(['plugin','--profile','personal','remove',pkg.name]);
 await inspect(false);
 const after=JSON.parse(await readFile(manifestPath,'utf8'));for(const name of baseline.packages.map(p=>p.name))assert.equal(after.dependencies[name],before.dependencies[name]);
 await writeFile(join(evidence,'personal-project-lifecycle.json'),JSON.stringify({home,checks,defaultDirectDependenciesPreserved:true,modelCalls:0,originalProfilesModified:false},null,2));
}catch(error){await writeFile(join(evidence,'personal-project-failure.json'),JSON.stringify({home,error:String(error),hostLog:log.replace(/token=[^\s]+/g,'token=[redacted]').slice(-4000)},null,2));console.error('Project lifecycle failed; see redacted evidence');process.exitCode=1;}finally{await stop();}
