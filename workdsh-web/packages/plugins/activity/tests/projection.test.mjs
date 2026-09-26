import test from 'node:test';
import assert from 'node:assert/strict';
import {projectActivity,activityMessage} from '../dist/projection.js';
import {createPresentationRegistry} from '../dist/registry.js';
import {summarizeTeamActivity} from '../dist/team-status.js';
const e=(type,data={},time=1)=>({event:{type,data,time}});
test('Host lifecycle prevents stale completed from masquerading as current completion',()=>{
 assert.equal(projectActivity([e('turn/start'),e('turn/end',{reason:{kind:'completed'}})],true).phase,'working');
});
test('interrupted persisted attempt is not completed; file delivery is independent',()=>{
 const state=projectActivity([e('turn/start'),e('deliverables/presented'),e('turn/end',{reason:{kind:'interrupted'}})],false);
 assert.equal(state.phase,'interrupted');assert.equal(state.delivered,true);assert.match(activityMessage(state),/中断/);
});
test('new turn drops previous skill, deliverable and elapsed start',()=>{
 const state=projectActivity([e('turn/start'),e('deliverables/presented'),e('turn/start',{},20)],true);
 assert.equal(state.delivered,false);assert.equal(state.startedAt,20);
});
test('no terminal and no resident driver means interruption, not indefinite work animation',()=>{
 assert.equal(projectActivity([e('turn/start')],false).phase,'interrupted');
});
test('structured child catalog does not invent a name from random label',()=>{
 const state=projectActivity([e('subagent/catalog',{childId:'a',label:'delegation-a'})],false);
 assert.deepEqual(state.children,[{id:'a'}]);
});
test('completed turn is not a claim that the team passed SOP',()=>{
 const state=projectActivity([e('turn/end',{reason:{kind:'completed'}})],false);
 assert.equal(activityMessage(state),'本轮已结束');
});
test('optional adapter errors isolate other adapters, cancellation and disposal work',async()=>{
 const registry=createPresentationRegistry();let n=0;const off=registry.subscribe(()=>n++);
 const remove=registry.registerIdentity(async()=>{throw Error('unavailable')});
 const good=registry.registerIdentity(async()=>({name:'真实作者名',kind:'expert'}));
 assert.equal((await registry.resolveIdentity('a',new AbortController().signal)).name,'真实作者名');
 good();assert.equal(await registry.resolveIdentity('a',new AbortController().signal),undefined);
 const cancelled=new AbortController();cancelled.abort();await assert.rejects(registry.resolveIdentity('a',cancelled.signal));
 remove();off();assert.equal(n,4);
});

test('skill identity requires a successful native tool result',()=>{
 const call=e('tool/call',{name:'skill',callId:'s',arguments:'{"name":"writing"}'});
 const result=isError=>e('tool/result',{message:{source:{kind:'tool',callId:'s'},content:[{type:'tool-result',isError}]}});
 assert.equal(projectActivity([e('turn/start'),call],true).skill,undefined);
 assert.equal(projectActivity([e('turn/start'),call,result(true)],true).skill,undefined);
 assert.equal(projectActivity([e('turn/start'),call,result(false)],true).skill,'writing');
});
test('confirmation pauses activity until the matching result arrives',()=>{
 const events=[e('turn/start'),e('tool/call',{name:'ask_user_question',callId:'q'})];
 assert.equal(projectActivity(events,true).phase,'waiting');
 assert.equal(projectActivity([...events,e('tool/result',{message:{source:{callId:'q'}}})],true).phase,'working');
});
test('official Team view identifies the running expert and assigned task',()=>{
 const view={members:[
  {id:'lead',name:'lead',role:'lead',status:'idle',diagnostics:[]},
  {id:'cashier',name:'finance-cashier',role:'teammate',status:'running',description:'资金侧独立复核',diagnostics:[]},
  {id:'accountant',name:'finance-accountant',role:'teammate',status:'running',description:'账务侧独立复核',diagnostics:[]},
 ],tasks:[{id:'task-1',revision:2,subject:'核对月度现金流',description:'逐月复核',status:'in_progress',blockedBy:[],writeScopes:[],ownerName:'finance-cashier',ready:true,writeScopeWarnings:[]}]};
 const summary=summarizeTeamActivity(view,'cashier','正在处理');
 assert.equal(summary.member.name,'finance-cashier');
 assert.equal(summary.task.subject,'核对月度现金流');
 assert.equal(summary.focus,'核对月度现金流');
 assert.equal(summary.message,'finance-cashier · 核对月度现金流 · 另 1 位专家处理中');
});
test('completed teammate task no longer masks a running named lead',()=>{
 const view={members:[
  {id:'lead-session',name:'lead',role:'lead',status:'running',description:'',diagnostics:[]},
  {id:'cashier-session',name:'finance-cashier',role:'teammate',status:'running',description:'资金侧独立复核',diagnostics:[]},
  {id:'accountant-session',name:'finance-accountant',role:'teammate',status:'idle',description:'账务侧独立复核',diagnostics:[]},
 ],tasks:[
  {id:'task-1',revision:4,subject:'资金侧独立复核',description:'逐月复核',status:'completed',blockedBy:[],writeScopes:[],ownerName:'finance-cashier',ready:true,writeScopeWarnings:[]},
  {id:'task-2',revision:3,subject:'账务侧独立复核',description:'账务复核',status:'completed',blockedBy:[],writeScopes:[],ownerName:'finance-accountant',ready:true,writeScopeWarnings:[]},
 ]};
 const summary=summarizeTeamActivity(view,'lead-session','正在处理');
 assert.equal(summary.member.name,'lead');
 assert.equal(summary.focus,'正在处理');
 assert.equal(summary.runningCount,1);
 assert.equal(summary.message,'lead · 正在处理');
});
test('failed teammate keeps its unfinished owned task visible instead of falling back to the lead',()=>{
 const view={members:[
  {id:'lead-session',name:'lead',role:'lead',status:'running',description:'',diagnostics:[]},
  {id:'reviewer-session',name:'reviewer',role:'teammate',status:'inactive',description:'复核材料',diagnostics:[]},
 ],tasks:[{id:'task-failure',revision:6,subject:'失败恢复验收',description:'失败后继续',status:'in_progress',blockedBy:[],writeScopes:[],ownerName:'reviewer',ready:true,writeScopeWarnings:[]}]};
 const summary=summarizeTeamActivity(view,'lead-session','本轮已结束',new Map([['reviewer-session','failed']]));
 assert.equal(summary.member.name,'reviewer');
 assert.equal(summary.task.subject,'失败恢复验收');
 assert.equal(summary.focus,'失败恢复验收 · 本轮未完成');
 assert.equal(summary.phase,'failed');
 assert.equal(summary.message,'reviewer · 失败恢复验收 · 本轮未完成');
});
test('inactive teammate with an unfinished owned task remains visible as requiring recovery',()=>{
 const view={members:[
  {id:'lead-session',name:'lead',role:'lead',status:'running',description:'',diagnostics:[]},
  {id:'reviewer-session',name:'reviewer',role:'teammate',status:'inactive',description:'复核材料',diagnostics:[]},
 ],tasks:[{id:'task-failure',revision:7,subject:'失败恢复验收',description:'失败后继续',status:'in_progress',blockedBy:[],writeScopes:[],ownerName:'reviewer',ready:true,writeScopeWarnings:[]}]};
 const summary=summarizeTeamActivity(view,'lead-session','本轮已结束');
 assert.equal(summary.member.name,'reviewer');
 assert.equal(summary.focus,'失败恢复验收 · 本轮未完成');
 assert.equal(summary.phase,'failed');
});
test('interrupted teammate exposes the retained task as resumable',()=>{
 const view={members:[
  {id:'lead-session',name:'lead',role:'lead',status:'running',description:'',diagnostics:[]},
  {id:'analyst-session',name:'analyst',role:'teammate',status:'inactive',description:'分析材料',diagnostics:[]},
 ],tasks:[{id:'task-stop',revision:4,subject:'人工停止与恢复验收',description:'停止后继续',status:'in_progress',blockedBy:[],writeScopes:[],ownerName:'analyst',ready:true,writeScopeWarnings:[]}]};
 const summary=summarizeTeamActivity(view,'lead-session','本轮已结束',new Map([['analyst-session','interrupted']]));
 assert.equal(summary.member.name,'analyst');
 assert.equal(summary.focus,'人工停止与恢复验收 · 已停止，可继续');
 assert.equal(summary.phase,'interrupted');
});

test('Session V4 tool messages retain success/error semantics without V3 result blocks', () => {
 const call=e('tool/call',{name:'skill',callId:'v4',arguments:'{"name":"writing"}'});
 const result=isError=>e('tool/result',{message:{role:'tool',toolCallId:'v4',isError,content:[{type:'text',text:'result'}]}});
 assert.equal(projectActivity([call,result(false)],false).skill,'writing');
 assert.equal(projectActivity([call,result(true)],false).skill,undefined);
});
