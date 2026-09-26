import * as React from 'react';
import { createPortal } from 'react-dom';
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { InputTriggerController } from '@deepseek-ai/dsh-client-ui-input-trigger/client';
import type { ProjectCapabilityRef, ProjectTaskContext, ProjectSnapshot } from 'workdsh-contracts/projects';
import type { ProjectClient } from '../../management.js';
import { ProjectMenu, type ProjectMenuKind, type ProjectMenuItem } from './ProjectMenu.js';

export async function projectApi<T>(path:string,endpoint:string,payload:unknown):Promise<T>{
  const response=await fetch(path,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({endpoint,payload})});
  const result=await response.json();if(!response.ok||!result.ok)throw new Error(result.error?.message??'操作失败，请重试');return result.value as T;
}
type Props=PropsRuntime<'conversation.input.overlay'>&{
  management:ProjectClient;
  controller:InputTriggerController;
  mountMenu:(anchor:(element:HTMLDivElement|null)=>void)=>()=>void;
  mountChrome:(anchor:(element:HTMLDivElement|null)=>void)=>()=>void;
  startExpert:(context:ProjectTaskContext,expert:ProjectCapabilityRef,draft:string)=>Promise<void>;
  insertAsset:(snapshot:ProjectSnapshot,id:string)=>boolean;
};
/** Registers a presentation only while the native + launcher is active. Disposal restores the native menu. */
export function ProjectConversationMenu({sessionId,management,controller,mountMenu,mountChrome,inputActions,useInput,startExpert,insertAsset}:Props){
  const launcher=React.useSyncExternalStore(controller.launcher.subscribe,controller.launcher.getSnapshot);
  const menu=React.useSyncExternalStore(controller.menu.subscribe,controller.menu.getSnapshot);
  // The native caret refresh clears launcher while retaining its synthetic, zero-width command menu.
  const launched=launcher==='command'||(menu.open&&menu.groups.length===1&&menu.groups[0]?.source==='command'&&menu.hit?.span.start===menu.hit?.span.end);
  const [context,setContext]=React.useState<ProjectTaskContext|null>(),[snapshot,setSnapshot]=React.useState<ProjectSnapshot>(),[connectors,setConnectors]=React.useState<readonly string[]>([]),[error,setError]=React.useState('');
  const [selectionReady,setSelectionReady]=React.useState(false),[removing,setRemoving]=React.useState(false),[connectorLabels,setConnectorLabels]=React.useState<Record<string,string>>({});
  const draft=useInput(s=>s.draft);
  React.useEffect(()=>{let live=true;management.taskContext(String(sessionId)).then(async c=>{if(!live)return;setContext(c);if(c){const p=await management.get(c.project.id);if(live)setSnapshot(p)}}).catch(()=>{});return()=>{live=false}},[sessionId,management]);
  React.useEffect(()=>{if(!context)return;let live=true;setSelectionReady(false);projectApi<string[]>('/api/workdsh-connectors','selection',{sessionId:String(sessionId)}).then(ids=>{if(live){setConnectors(ids);setSelectionReady(true)}}).catch(e=>{if(live)setError(e.message)});return()=>{live=false}},[context,launched,sessionId]);
  React.useEffect(()=>{if(!context)return;let live=true;projectApi<{id:string;title:string}[]>('/api/workdsh-connectors','list',{}).then(rows=>{if(live)setConnectorLabels(Object.fromEntries(rows.map(x=>[x.id,x.title])))}).catch(()=>{});return()=>{live=false}},[context]);
  const [chipAnchor,setChipAnchor]=React.useState<HTMLDivElement|null>(null);
  React.useLayoutEffect(()=>{if(!context)return;return mountChrome(setChipAnchor)},[context,mountChrome]);
  const [anchor,setAnchor]=React.useState<HTMLDivElement|null>(null);
  const close=React.useCallback(()=>controller.dismiss(),[controller]);
  React.useLayoutEffect(()=>{if(!context||!launched||!menu.open)return;return mountMenu(setAnchor)},[context,launched,menu.open,mountMenu]);
  const live={menu,context,snapshot,connectors,draft},c=context;
  const selected=connectors.map(id=>({id,label:connectorLabels[id]??(c?.availableCapabilities??c?.config.capabilities??[]).find(x=>x.kind==='connector'&&x.id===id)?.label??'已选连接器'}));
  return <>
    {chipAnchor&&(selected.length>0||error)&&createPortal(<div className="wd-project-selection-chips">{selected.map(x=><button type="button" key={x.id} disabled={!selectionReady||removing} aria-label={`移除连接器 ${x.label}`} onClick={()=>{setRemoving(true);setError('');projectApi<string[]>('/api/workdsh-connectors','set-selection',{sessionId:String(sessionId),connectorIds:connectors.filter(id=>id!==x.id)}).then(setConnectors).catch(e=>setError(e.message)).finally(()=>setRemoving(false))}}>{x.label}<span aria-hidden="true">×</span></button>)}{error&&<span role="alert">{error}</span>}<style>{`.wd-project-selection-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 6px 6px}.wd-project-selection-chips button{display:flex;gap:8px;align-items:center;border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:8px;padding:5px 9px;font:12px/18px var(--dsw-font-family);cursor:pointer}.wd-project-selection-chips button:hover{background:var(--dsw-alias-interactive-bg-hover)}`}</style></div>,chipAnchor)}
    {anchor&&c&&launched&&menu.open&&createPortal(<>
    <ConversationChoices context={c} snapshot={live.snapshot} connectors={live.connectors} close={close} nativeItems={live.menu.groups.find(g=>g.source==='command')?.items??[]} pickNative={id=>{const index=controller.menu.getSnapshot().groups.find(g=>g.source==='command')?.items.findIndex(x=>x.name===id)??-1;if(index<0)throw new Error('此操作尚未就绪，请重新打开菜单');controller.pick('command',index)}} pick={async(kind,item)=>{
      if(kind==='connector'){
        if(!selectionReady)throw new Error('连接器状态正在加载，请稍后重试');
        const ids=live.connectors.includes(item.id)?live.connectors.filter(id=>id!==item.id):[...live.connectors,item.id];
        const saved=await projectApi<string[]>('/api/workdsh-connectors','set-selection',{sessionId:String(sessionId),connectorIds:ids});setConnectors(saved);
      } else if(kind==='skill'){
        const span=inputActions.captureInsertion();if(!inputActions.insertText(`/${item.id} `,span))throw new Error('输入内容已变化，请重新选择');close();
      } else if(kind==='expert'){
        const expert=(c.availableCapabilities??c.config.capabilities).find(x=>x.kind==='expert'&&x.id===item.id);if(!expert)return;
        if(window.confirm(`使用“${expert.label}”创建新的项目任务？当前对话将保留，输入草稿会复制到新任务，不会自动发送。`)){await startExpert(c,expert,live.draft);close()}
      } else if(kind==='file'&&live.snapshot){if(!insertAsset(live.snapshot,item.id))throw new Error('输入内容已变化，请重试');close()}
    }}/></>,anchor)}</>;
}

function ConversationChoices({context,snapshot,connectors,nativeItems,pickNative,pick,close}:{context:ProjectTaskContext;snapshot?:ProjectSnapshot;connectors:readonly string[];nativeItems:readonly {name:string;label?:string;description?:string}[];pickNative:(id:string)=>void;pick:(kind:ProjectMenuKind,item:ProjectMenuItem)=>Promise<void>;close:()=>void}){
  const caps=context.availableCapabilities??context.config.capabilities;
  const nativeFile=nativeItems.find(x=>x.name==='file');
  return <ProjectMenu close={close} items={{file:[...(nativeFile?[{id:'native-file',label:'从本地添加',description:'使用原生附件上传'}]:[]),...(snapshot?.assets??[]).map(x=>({id:x.id,label:x.name,description:'项目资产'}))],mode:nativeItems.filter(x=>x.name!=='file').map(x=>({id:x.name,label:x.label??x.name,description:x.description})),expert:caps.filter(x=>x.kind==='expert').map(x=>({...x})),skill:caps.filter(x=>x.kind==='skill').map(x=>({...x})),connector:caps.filter(x=>x.kind==='connector').map(x=>({...x,selected:connectors.includes(x.id)}))}} pick={(kind,item)=>{if(item.id==='native-file')return pickNative('file');if(kind==='mode')return pickNative(item.id);return pick(kind,item)}}/>;
}
