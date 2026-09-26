import React,{useEffect,useRef,useState} from 'react';
import type {DocumentPreviewProps} from '@deepseek-ai/dsh-client-ui-sidebar-documentpreview/client';
import {mountPptx} from './native-react/editor.js';
import nativeCss from './native-react/native.css';
import ribbonCss from './native-react/ribbon.css';
/** Harness owns file authorization and bytes. This editor exports a working copy. */
export function ImportedPptx(props:DocumentPreviewProps){
 const host=useRef<HTMLDivElement>(null),[error,setError]=useState('');
 const info=props.useTabInfo();
 useEffect(()=>{
  if(props.content.kind!=='bytes')return;
  let disposed=false,editor:Awaited<ReturnType<typeof mountPptx>>|undefined;
  const name=decodeURIComponent(props.resourceAddress).split('/').pop()?.split(/[?#]/)[0]||'演示文稿.pptx';
  setError('');
  void mountPptx(host.current!,props.content.data,name,e=>{if(!disposed)setError(e.message)},()=>{}).then(value=>{if(disposed)value.dispose();else editor=value}).catch(e=>{if(!disposed)setError(e.message)});
  const dispose=()=>{disposed=true;editor?.dispose()};
  info.tab.signal.addEventListener('abort',dispose,{once:true});
  return()=>{info.tab.signal.removeEventListener('abort',dispose);dispose()};
 },[props.resourceAddress,props.content,info.tab.signal]);
 return <section style={{height:'100%',minHeight:560,display:'flex',flexDirection:'column',minWidth:0}} aria-label="PPTX 编辑">
  <style>{nativeCss+ribbonCss}</style>
  {error&&<div role="alert">{error}</div>}
  <div ref={host} className="workdsh-ppt-editor" style={{flex:1,minHeight:0,overflow:'hidden'}}/>
 </section>;
}
