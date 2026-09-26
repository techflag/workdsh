import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ensureProjectWorkspace} from '../dist/runtime/project-workspace.js';
test('project workspace is stable, actor scoped, named, and rejects inaccessible projects before registration',async()=>{
 const root=await mkdtemp(join(tmpdir(),'workdsh-workspace-'));const old=process.env.DSH_HOME;process.env.DSH_HOME=root;
 const rows=new Map();let creates=0;
 const ctx={workdshProjects:{get:async(a,id)=>{if(id==='denied')throw Error('projects/not-found');return {project:{id,name:'项目空间'}}}},workspaceController:{create:async({path})=>{creates++;if(!rows.has(path))rows.set(path,{workspaceId:path,path,title:'initial'});return {workspace:rows.get(path)}},rename:async({workspaceId,title})=>{if([...rows.values()].some(r=>r.workspaceId!==workspaceId&&r.title===title))throw Object.assign(Error('conflict'),{code:'workspace/name-conflict'});const row=rows.get(workspaceId);row.title=title;return {workspace:row}}}};
 try{const actor={organizationId:'org',principalId:'a'};const one=await ensureProjectWorkspace(ctx,actor,'p1');assert.equal(one.title,'项目空间');assert.equal((await ensureProjectWorkspace(ctx,actor,'p1')).workspaceId,one.workspaceId);const two=await ensureProjectWorkspace(ctx,actor,'p2');assert.notEqual(two.path,one.path);assert.match(two.title,/项目空间 · /);assert.notEqual((await ensureProjectWorkspace(ctx,{...actor,principalId:'b'},'p1')).path,one.path);const count=creates;await assert.rejects(ensureProjectWorkspace(ctx,actor,'denied'));assert.equal(creates,count)}finally{if(old===undefined)delete process.env.DSH_HOME;else process.env.DSH_HOME=old;await rm(root,{recursive:true,force:true})}
});
