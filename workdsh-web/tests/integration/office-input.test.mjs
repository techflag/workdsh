import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const compiled = await build({entryPoints:['packages/plugins/office/src/input.tsx'],bundle:true,platform:'node',format:'cjs',write:false});
const mod={exports:{}};new Function('module','exports',compiled.outputFiles[0].text)(mod,mod.exports);
const {officeInputSources}=mod.exports;
const signal=new AbortController().signal;
const request=query=>({query,position:'leading',signal});
test('Office type choices use removable native chips, preserve default create without references and declare unavailable adapters',async()=>{
 const [source]=officeInputSources({list:async()=>[]},()=> 's1');
 const choices=await source.candidates({sessionId:'s1'},request('office'));
 assert.equal(choices.length,6);
 assert.equal((await source.candidates({},request('off'))).length,6);
 assert.equal((await source.candidates({},request('office.word'))).length,1);
 assert.equal((await source.candidates({},request('skill'))).length,0);
 assert.equal((await source.candidates({}, {...request('office'),position:'inline'})).length,0);
 for(const candidate of choices){const {insert}=source.onPick({candidate});assert.match(insert.label,/新建/);assert.equal(insert.source,source.name);const text=await source.codec.serialize(insert.ref,signal);assert.match(text,/"defaultAction":"create"/);assert.match(text,/"targetRequired":false/);assert.match(text,new RegExp(`"outputType":"${candidate.value}"`));}
 assert.equal(choices.some(c=>['canvas','base'].includes(c.value)),false);
 assert.match(await source.codec.serialize('pdf',signal),/"liveEditingAvailable":true/);
 assert.match(await source.codec.serialize('html',signal),/"liveEditingAvailable":true/);
 assert.match(await source.codec.serialize('ppt',signal),/"liveEditingAvailable":false/);
 await assert.rejects(source.codec.serialize('unknown',signal));
});
test('Office references encode source identity and explicit role; serialization rechecks access and rejects stale Session references',async()=>{
 let current='s1', allowed=true;
 const [,source]=officeInputSources({list:async(sid)=>sid==='s1' && allowed?[{documentId:'doc-1',title:'经营报告'}]:[]},()=>current);
 const choices=await source.candidates({sessionId:'s1'},request('经营'));
 assert.equal(choices.length,2);
 const pick=candidate=>source.onPick({candidate,session:{sessionId:'s1'}}).insert;
 const reference=pick(choices[0]), target=pick(choices[1]);
 assert.match(await source.codec.serialize(reference.ref,signal),/"role":"reference"/);
 assert.match(await source.codec.serialize(reference.ref,signal),/禁止修改参考原件/);
 assert.match(await source.codec.serialize(target.ref,signal),/"role":"target"/);
 assert.match(await source.codec.serialize(target.ref,signal),/doc-1/);
 allowed=false;await assert.rejects(source.codec.serialize(reference.ref,signal),/无权/);
 allowed=true;current='s2';await assert.rejects(source.codec.serialize(target.ref,signal),/任务已切换/);
 assert.throws(()=>source.onPick({candidate:choices[0],session:{sessionId:'s2'}}),/当前任务/);
});
