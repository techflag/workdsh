import assert from 'node:assert/strict';
import { readFile, writeFile, realpath } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { spawn } from 'node:child_process';
const root=new URL('../',import.meta.url).pathname,evidence=join(root,'.artifacts/plugin-delivery');
const baseline=JSON.parse(await readFile(join(evidence,'personal-default-runtime.json'),'utf8'));
const home=await realpath(baseline.home);assert.match(home,/\/T\/workdsh-personal-default-[\w-]+$/);
const profile=JSON.parse(await readFile(join(home,'profiles/personal/package.json'),'utf8'));assert.ok(!JSON.stringify(profile).includes('enterprise'));
const env={PATH:`${root}/node_modules/.bin:${dirname(process.execPath)}:/usr/bin:/bin`,HOME:process.env.HOME,DSH_HOME:home,DSH_AGENTS_HOME:join(home,'agents')};
let server,host;const checks=[];
async function stop(){if(!server||server.exitCode!==null||server.signalCode!==null)return;const closed=new Promise(r=>server.once('close',r));server.kill('SIGTERM');const timer=setTimeout(()=>server.kill('SIGKILL'),3000);await closed;clearTimeout(timer);}
async function start(){let log='';server=spawn(process.execPath,[join(home,'profiles/personal/node_modules/@deepseek-ai/dsh/lib/bin.js'),'--profile','personal','--host','127.0.0.1','--port','0','--no-open'],{cwd:home,env,stdio:['ignore','pipe','pipe']});server.stdout.on('data',b=>{log+=b;});server.stderr.on('data',b=>{log+=b;});
 for(let until=Date.now()+45000;Date.now()<until;){const match=log.match(/http:\/\/127\.0\.0\.1:\d+\/\?token=[\w-]+/);if(match)try{const response=await fetch(match[0],{redirect:'manual',signal:AbortSignal.timeout(1500)}),cookie=response.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');if(cookie){host={address:new URL(match[0]).origin,cookie};return;}}catch{}if(server.exitCode!==null)break;await new Promise(r=>setTimeout(r,100));}throw new Error('Owned personal Host startup failed');}
async function api(domain,endpoint,payload={}){const response=await fetch(host.address+'/api/workdsh-'+domain,{method:'POST',headers:{cookie:host.cookie,'content-type':'application/json'},body:JSON.stringify({endpoint,payload}),signal:AbortSignal.timeout(15000)});assert.equal(response.status,200);const result=await response.json();assert.equal(result.ok,true,JSON.stringify(result.error));return result.value;}
const pass=text=>{checks.push(text);console.log('PASS: '+text);};
try{
 await start();const experts=await api('experts','list');assert.ok(experts.items.length);
 const plan=await api('experts','prepare-execution',{expertId:experts.items[0].id});assert.equal(plan.missing.length,0);
 const created=await api('experts','create-execution',{executionPlanId:plan.executionPlanId,operationId:crypto.randomUUID()});const sessionId=created.sessionId;assert.ok(sessionId);
 await api('experts','verify-binding',{sessionId});pass('Default personal expert creates a real native Session with a fixed binding');
 const skillName='personal-default-'+Date.now(),document=`---\nname: ${skillName}\ndescription: Personal default composition acceptance fixture\n---\nORIGINAL\n`;
 const imported=await fetch(host.address+'/api/workdsh-skills/import',{method:'POST',headers:{cookie:host.cookie,'content-type':'application/octet-stream','x-workdsh-file-name':encodeURIComponent(skillName+'.md')},body:document});assert.equal(imported.status,200);const stage=await imported.json();assert.equal(stage.ok,true);
 await api('skills','commit-import',{id:stage.value.id,scope:'profile'});const detail=await api('skills','detail',{name:skillName});
 const edited=document.replace('ORIGINAL','PERSONAL_EDIT');await api('skills','update',{name:skillName,document:edited,expectedRevision:detail.revision});
 await api('skills','set-enabled',{name:skillName,enabled:false});await api('skills','set-enabled',{name:skillName,enabled:true});
 assert.equal((await api('skills','detail',{name:skillName})).document,edited);pass('Profile Skill import, edit and enable/disable work without enterprise identity');
 const marker='PersonalDefaultLibrary'+Date.now(),folder=await api('library','create-folder',{name:marker});
 const asset=await api('library','import',{parentId:folder.id,name:'analysis.md',mediaType:'text/markdown',base64:Buffer.from('# '+marker).toString('base64'),operationId:crypto.randomUUID()});
 assert.equal((await api('library','search',{query:marker})).length,1);const references=await api('library','set-task-selection',{sessionId,nodeIds:[asset.asset.nodeId]});assert.equal(references.length,1);
 assert.ok((await api('library','read-text',{assetId:references[0].assetId,revisionId:references[0].revisionId})).includes(marker));pass('Library import/search/read and fixed Session revision work in default composition');
 assert.deepEqual(await api('connectors','selection',{sessionId}),[]);const connectors=await api('connectors','list');const example=connectors.find(x=>x.id==='workdsh-example');assert.equal(example.state,'ready');
 await api('connectors','set-selection',{sessionId,connectorIds:[example.id]});pass('MCP subprocess becomes ready and Session selection is explicit');
 await stop();await start();await api('experts','verify-binding',{sessionId});assert.equal((await api('skills','detail',{name:skillName})).document,edited);
 assert.deepEqual(await api('library','task-selection',{sessionId}),references);assert.ok((await api('library','read-text',{assetId:references[0].assetId,revisionId:references[0].revisionId})).includes(marker));assert.deepEqual(await api('connectors','selection',{sessionId}),[example.id]);assert.equal((await api('connectors','list')).find(x=>x.id===example.id).state,'ready');
 pass('Cold Host restart restores expert binding, edited Skill, library revision and MCP selection');
 await writeFile(join(evidence,'personal-default-objects.json'),JSON.stringify({home,sessionId,checks,modelCalls:0,originalProfilesModified:false},null,2));
}finally{await stop();}
