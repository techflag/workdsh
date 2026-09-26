import React,{useEffect,useRef,useState} from "react";
import {createUniver,LocaleType,mergeLocales} from "@univerjs/presets";
import {UniverSheetsCorePreset} from "@univerjs/preset-sheets-core";
import ZhCN from "@univerjs/preset-sheets-core/locales/zh-CN";
import sheetsCss from "@univerjs/preset-sheets-core/lib/index.css";
import type {OfficeSpreadsheetSnapshot,OfficeSpreadsheetEditInput} from "workdsh-contracts/office";
import type {OfficeClient} from "../live/model.js";
import {univerSnapshot,stateFromUniver} from "./adapter.js";
import {downloadSpreadsheet} from "./xlsx.js";
type Lease={token:string;clientId:string;expiresAt:number};
export function LiveSpreadsheet({documentId,sessionId,office,visible,signal,requestId,onEditing}:{documentId:string;sessionId:string;office:OfficeClient;visible:boolean;signal:AbortSignal;requestId?:string;onEditing:(value:boolean)=>void}){
 const mount=useRef<HTMLDivElement>(null),controller=useRef<{begin:()=>Promise<void>;finish:()=>Promise<void>;download:()=>Promise<void>}|undefined>(undefined);
 const [view,setView]=useState({title:"工作簿",status:"正在打开…",editing:false,ready:false,busy:false,problem:""});
 const visibility=useRef(visible),request=useRef(requestId);visibility.current=visible;request.current=requestId;
 useEffect(()=>{
  const lifetime=new AbortController(),combined=AbortSignal.any([signal,lifetime.signal]),clientId=crypto.randomUUID();let disposed=false,base:OfficeSpreadsheetSnapshot|null=null,lease:Lease|null=null,nativeBaseline:any,uncertain:OfficeSpreadsheetEditInput|null=null,editing=false,busy=false;
  let engine:ReturnType<typeof createUniver>|null=null;let active:ReturnType<ReturnType<typeof createUniver>["univerAPI"]["createWorkbook"]>|null=null;
  const call=<T,>(r:unknown)=>office.request<T>(sessionId,r,combined);
  const patch=(v:Partial<typeof view>)=>{if(!disposed)setView(old=>({...old,...v}));};
  const fail=(e:unknown)=>patch({problem:e instanceof Error?e.message:String(e),status:editing?"尚未保存，修改保留在页面":"暂时不可用"});
  function display(s:OfficeSpreadsheetSnapshot){if(s.kind!=="spreadsheet")throw Error("文档类型不匹配。");base=s;if(active)engine!.univerAPI.disposeUnit(active.getId());active=engine!.univerAPI.createWorkbook({...univerSnapshot(s.state,s.documentId,s.title),locale:LocaleType.ZH_CN});active.setEditable(false);nativeBaseline=structuredClone(active.save());patch({title:s.title,status:`已保存 · 修订 ${s.revision}`,ready:true,problem:""});}
  async function ack(){if(request.current && base)try{await call({endpoint:"ack",documentId,requestId:request.current,clientId,appliedRevision:base.revision});}catch{/* A newer request will be acknowledged after its committed state is read. */}}
  async function begin(){if(busy||editing||!base)return;busy=true;patch({busy:true});try{const result=await call<{snapshot:OfficeSpreadsheetSnapshot;lease:Lease}>({endpoint:"lease",documentId,clientId,action:"acquire"});lease=result.lease;display(result.snapshot);editing=true;active!.setEditable(true);patch({editing:true,status:"编辑中 · 完成后保存",problem:""});onEditing(true);}catch(e){fail(e);}finally{busy=false;patch({busy:false});}}
  async function finish(){if(busy||!editing||!base||!lease)return;busy=true;patch({busy:true});active!.setEditable(false);try{
   if(!uncertain){const state=stateFromUniver(active!.save(),nativeBaseline);if(JSON.stringify(state)!==JSON.stringify(base.state))uncertain={documentId,baseRevision:base.revision,operationId:crypto.randomUUID(),operations:[{op:"spreadsheet.replaceState",state}]};}
   if(uncertain){await call({endpoint:"edit",input:uncertain,lease:{token:lease.token,clientId}});base=await call<OfficeSpreadsheetSnapshot>({endpoint:"read",documentId});uncertain=null;}
   await call({endpoint:"lease",documentId,clientId,action:"release",token:lease.token});lease=null;editing=false;onEditing(false);patch({editing:false});display(await call({endpoint:"read",documentId}));await ack();
  }catch(e){fail(e);active!.setEditable(!uncertain);}finally{busy=false;patch({busy:false});}}
  async function download(){if(editing)await finish();if(editing)throw Error("请先完成保存；当前修改仍保留在页面。");const saved=await call<OfficeSpreadsheetSnapshot>({endpoint:"read",documentId});await downloadSpreadsheet(saved);}
  controller.current={begin,finish,download};
  let timer:ReturnType<typeof setTimeout>;async function poll(){try{if((visibility.current || editing) && !busy){if(editing && lease){const r=await call<{lease:Lease}>({endpoint:"lease",documentId,clientId,action:"renew",token:lease.token});lease=r.lease;}else{const s=await call<OfficeSpreadsheetSnapshot>({endpoint:"read",documentId});if(!base||s.revision!==base.revision||s.generation!==base.generation)display(s);await ack();}}}catch(e){if(!disposed){if(editing)active?.setEditable(false);fail(e);}}finally{if(!disposed)timer=setTimeout(poll,editing?8000:700);}}
  try{engine=createUniver({locale:LocaleType.ZH_CN,locales:{[LocaleType.ZH_CN]:mergeLocales(ZhCN)},presets:[UniverSheetsCorePreset({container:mount.current!,ribbonType:"classic",formula:{initialFormulaComputing:0}})]});void poll();}catch(e){fail(e);}
  return ()=>{disposed=true;clearTimeout(timer);lifetime.abort();engine?.univer.dispose();controller.current=undefined;onEditing(false);};
 },[documentId,sessionId,office,signal,onEditing]);
 async function invoke(action:"begin"|"finish"|"download"){try{await controller.current?.[action]();}catch(e){setView(v=>({...v,problem:e instanceof Error?e.message:String(e)}));}}
 return <><style>{sheetsCss}</style><div className="wd-office-toolbar"><span className="wd-office-title">{view.title}</span><span role="status">{view.status}</span><button disabled={!view.ready||view.busy} onClick={()=>void invoke("download")}>下载 Excel</button><button disabled={!view.ready||view.busy} onClick={()=>void invoke(view.editing?"finish":"begin")}>{view.editing?"完成编辑并保存":"编辑"}</button></div>{view.problem&&<div role="alert" className="wd-office-problem">{view.problem}</div>}<div className="wd-office-status" style={{padding:"6px 12px"}}>支持单元格值、公式和工作表；格式与图表保存待接入。公式由浏览器计算，下载文件在 Excel 中重新计算。</div><div ref={mount} className="workdsh-sheet-editor" data-testid="office-spreadsheet" style={{flex:1,minHeight:320,minWidth:0,overflow:"hidden"}}/></>;
}
