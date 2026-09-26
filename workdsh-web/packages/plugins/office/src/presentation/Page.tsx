import React,{useMemo,useRef,useEffect,useSyncExternalStore,useState} from 'react';
import type {OfficeClient,DocumentOptions} from '../live/model.js';
export function LivePresentation({office,onEditing,...options}:DocumentOptions&{office:OfficeClient;onEditing:(value:boolean)=>void}){
 const mount=useRef<HTMLDivElement>(null),[error,setError]=useState('');
 const model=useMemo(()=>office.createPresentation(options),[office,options.documentId,options.sessionId,options.signal]);
 const view=useSyncExternalStore(model.subscribe,model.getSnapshot);
 useEffect(()=>model.attach(mount.current!),[model]);
 useEffect(()=>{model.setVisible(options.visible);model.setRequest(options.requestId);},[model,options.visible,options.requestId]);
 useEffect(()=>onEditing(view.editing),[view.editing,onEditing]);
 return <>
  <div className="wd-office-toolbar"><span className="wd-office-title">{view.title}</span><span role="status">{view.status}</span>
   <button disabled={!view.ready} onClick={()=>void model.download().catch(error=>setError(error.message))}>下载 PPT</button>
  </div>
  {(view.problem||error)&&<div role="alert" className="wd-office-problem">{view.problem||error}</div>}
  <div ref={mount} style={{flex:1,minHeight:560,overflow:'hidden'}} data-testid="office-presentation"/>
 </>;
}
