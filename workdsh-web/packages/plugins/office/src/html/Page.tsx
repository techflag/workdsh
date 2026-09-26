import React,{useEffect,useRef,useState} from "react";
import type {OfficeHtmlSnapshot} from "workdsh-contracts/office";
import type {OfficeClient,DocumentOptions} from "../live/model.js";
import {previewHtml,downloadHtml} from "./preview.js";
export function LiveHtml({documentId,sessionId,office,visible,signal,requestId}:DocumentOptions&{office:OfficeClient}){
 const [snapshot,setSnapshot]=useState<OfficeHtmlSnapshot|null>(null),[problem,setProblem]=useState(""),[source,setSource]=useState(false);
 const visibility=useRef(visible),request=useRef(requestId);visibility.current=visible;request.current=requestId;
 useEffect(()=>{
  const lifetime=new AbortController(),combined=AbortSignal.any([signal,lifetime.signal]),clientId=crypto.randomUUID();let disposed=false,base:OfficeHtmlSnapshot|null=null,acked:string|undefined,timer:ReturnType<typeof setTimeout>;
  async function poll(){try{if(visibility.current){const s=await office.request<OfficeHtmlSnapshot>(sessionId,{endpoint:"read",documentId},combined);if(disposed)return;if(s.kind!=="html")throw Error("网页类型不匹配。");if(!base||s.revision!==base.revision||s.generation!==base.generation){base=s;setSnapshot(s);}setProblem("");const pending=request.current;if(pending && pending!==acked){await office.request(sessionId,{endpoint:"ack",documentId,requestId:pending,clientId,appliedRevision:s.revision},combined);acked=pending;}}}catch(e){if(!disposed&&!combined.aborted)setProblem(e instanceof Error?e.message:String(e));}finally{if(!disposed)timer=setTimeout(poll,700);}}
  void poll();return ()=>{disposed=true;clearTimeout(timer);lifetime.abort();};
 },[documentId,sessionId,office,signal]);
 async function download(){try{const saved=await office.request<OfficeHtmlSnapshot>(sessionId,{endpoint:"read",documentId},signal);if(saved.kind!=="html")throw Error("网页类型不匹配。");downloadHtml(saved);}catch(e){setProblem(e instanceof Error?e.message:String(e));}}
 return <><div className="wd-office-toolbar"><span className="wd-office-title">{snapshot?.title??"网页"}</span><span role="status">{snapshot?`已保存 · 修订 ${snapshot.revision}`:"正在打开…"}</span><button disabled={!snapshot} onClick={()=>setSource(!source)}>{source?"查看预览":"查看源码"}</button><button disabled={!snapshot} onClick={()=>void download()}>下载 HTML</button></div>{problem&&<div role="alert" className="wd-office-problem">{problem}</div>}{snapshot&&(source?<textarea aria-label="HTML 源码" readOnly value={snapshot.state.html} style={{flex:1,minHeight:320,fontFamily:"monospace",padding:16}}/>:<iframe title="网页实时预览" sandbox="allow-scripts" srcDoc={previewHtml(snapshot.state.html)} style={{flex:1,minHeight:320,width:"100%",border:0,background:"white"}}/>)}</>;
}
