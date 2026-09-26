import {mountPptx} from './native-react/editor.js';
import {PptxHandler} from 'pptx-viewer-core';
import type {NativeDeck} from './native-deck.js';
import nativeCss from './native-react/native.css';import ribbonCss from './native-react/ribbon.css';
const decode=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const encode=(b:Uint8Array)=>{let s='';for(const v of b)s+=String.fromCharCode(v);return btoa(s)};
/** One native editor state. Durable edits use the existing authorized Office transaction. */
export function mountNativePpt(container:HTMLElement,input:unknown,options:{editable:boolean;onSave:(deck:unknown)=>Promise<unknown>;onReady?:()=>void;onEditing?:()=>void;focusIndex?:number;focusLast?:boolean}){
 const deck=input as NativeDeck,host=document.createElement('div'),style=document.createElement('style');
 host.className='workdsh-ppt-editor';host.style.cssText='height:100%;min-height:560px;overflow:hidden';style.textContent=nativeCss+ribbonCss;container.replaceChildren(style,host);
 let signature="",pollTimer:ReturnType<typeof setTimeout>|undefined,version=0,disposed=false,dirty=false,timer:ReturnType<typeof setTimeout>|undefined,editor:Awaited<ReturnType<typeof mountPptx>>|undefined,pending=Promise.resolve();
 const detect=()=>{if(disposed||!editor?.api()?.getSlideCount())return dirty;const next=JSON.stringify(Array.from({length:editor.api().getSlideCount()},(_,i)=>editor!.api().getSlide(i)));if(signature&&next!==signature){version++;dirty=true;options.onEditing?.();}signature=next;return dirty;};
 const save=()=>{pending=pending.then(async()=>{if(disposed||!dirty||!editor?.api())return;const savingVersion=version;const bytes=await editor.api().getContent();const data=await new PptxHandler().load(bytes.slice().buffer);const next={...deck,canvas:{width:data.width,height:data.height,unit:'css-px' as const},bytes:encode(bytes),slides:data.slides.map(s=>({...s,nativeId:s.id,id:deck.slides.find(old=>old.nativeId===s.id)?.id??crypto.randomUUID()}))};await options.onSave(next);Object.assign(deck,next);dirty=version!==savingVersion;});void pending.catch(()=>{});return pending;};
 const ready=mountPptx(host,decode(deck.bytes),deck.title+'.pptx',()=>{},()=>{if(disposed)return;version++;dirty=true;options.onEditing?.();clearTimeout(timer);timer=setTimeout(()=>void save(),500);}).then(value=>{
  if(disposed){value.dispose();return;}editor=value;
  const wait=()=>{if(disposed)return;if(!editor?.api()?.getSlideCount()){timer=setTimeout(wait,50);return;}if(options.focusIndex!==undefined)editor.api().goTo(options.focusIndex);signature=JSON.stringify(Array.from({length:editor.api().getSlideCount()},(_,i)=>editor!.api().getSlide(i)));
  const poll=()=>{if(disposed)return;if(detect())void save();pollTimer=setTimeout(poll,500);};pollTimer=setTimeout(poll,500);options.onReady?.();};wait();
 });
 return {api:()=>editor?.api(),hasChanges:detect,dispose(){disposed=true;clearTimeout(timer);clearTimeout(pollTimer);editor?.dispose();host.remove();style.remove();},async flush(){await ready;detect();await save();},async download(){await ready;const bytes=await editor!.api().getContent();const url=URL.createObjectURL(new Blob([bytes.slice()],{type:'application/vnd.openxmlformats-officedocument.presentationml.presentation'}));const a=document.createElement('a');a.href=url;a.download=deck.title+'.pptx';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}};
}
