import type {OfficeContentSnapshot,OfficePresentationSnapshot,OfficeReceipt} from 'workdsh-contracts/office';
import type {DocumentOptions,Rpc} from '../live/model.js';
import {mountNativePpt} from './frame.js';
/** Read mirror and local edit transaction; all durable writes use the Office service. */
export function createPresentationModel(options:DocumentOptions,rpc:Rpc){
 const {sessionId,documentId,signal}=options,clientId=crypto.randomUUID();
 let visible=options.visible,requestId=options.requestId,acked:string|undefined,closed=false;
 let base:OfficePresentationSnapshot|undefined,container:HTMLElement|undefined;
 let frame:ReturnType<typeof mountNativePpt>|undefined,timer:ReturnType<typeof setTimeout>|undefined;
 let saving:Promise<unknown>=Promise.resolve(),busy=false,failed=false,dirty=false;
 let view={title:'PPT',status:'正在打开…',editing:false,ready:false,problem:''};
 const listeners=new Set<()=>void>();
 const update=(patch:Partial<typeof view>)=>{if(!closed){view={...view,...patch};for(const listener of listeners)listener();}};
 const call=<T>(request:unknown,requestSignal:AbortSignal|undefined=signal)=>rpc<T>(sessionId,request,requestSignal);
 const requirePpt=(snapshot:OfficeContentSnapshot):OfficePresentationSnapshot=>{
  if(snapshot.kind!=='presentation')throw new Error('文档类型不是 PPT。');return snapshot;
 };
 async function acknowledge(){
  if(requestId&&requestId!==acked&&base&&view.ready){const requested=requestId;
   await call({endpoint:'ack',documentId,requestId:requested,clientId,appliedRevision:base.revision});acked=requested;
  }
 }
 function render(snapshot:OfficePresentationSnapshot,editable:boolean){
  const previous=base?.state.deck as {slides:{id:string}[]}|undefined;
  const next=snapshot.state.deck as {slides:{id:string}[]};
  const changed=previous?next.slides.findIndex(slide=>JSON.stringify(slide)!==JSON.stringify(previous.slides.find(old=>old.id===slide.id))):-1;
  const explicitFocus=next.slides.findIndex(slide=>slide.id===snapshot.state.focusSlideId);
  const focusIndex=explicitFocus>=0?explicitFocus:changed>=0?changed:previous&&next.slides.length!==previous.slides.length?Math.min(next.slides.length-1,previous.slides.findIndex((slide,index)=>slide.id!==next.slides[index]?.id)):undefined;
  frame?.dispose();base=snapshot;update({title:snapshot.title,ready:false,status:editable?'编辑中 · 自动保存':`已保存 · 修订 ${snapshot.revision}`});
  frame=mountNativePpt(container!,snapshot.state.deck,{editable,focusIndex:focusIndex!==undefined&&focusIndex>=0?focusIndex:undefined,focusLast:false,onEditing:()=>{dirty=true;},onReady:()=>{update({ready:true});void acknowledge().catch(error=>update({problem:error.message}));},
   onSave(deck){
    if(!dirty)return Promise.resolve({updatedAt:(deck as {updatedAt?:string}).updatedAt});
    dirty=true;
    const pending=saving.then(async()=>{
     if(!base||closed||failed)throw new Error('保存状态不可用，请保留当前内容。');
     const input={documentId,baseRevision:base.revision,operationId:crypto.randomUUID(),operations:[{op:'presentation.replaceDeck',deck}]};
     update({status:'正在保存…'});
     let receipt:OfficeReceipt;
     try{receipt=await call<OfficeReceipt>({endpoint:'edit',input});}
     catch(error){
      // Retry the identical operation once to reconcile an uncertain successful write.
      if(signal.aborted)throw error;
      receipt=await call<OfficeReceipt>({endpoint:'edit',input});
     }
     base={...base,revision:receipt.revision,state:{modelVersion:1,deck}};
     dirty=false;update({status:`已保存 · 修订 ${receipt.revision}`});
     return {updatedAt:(deck as {updatedAt?:string}).updatedAt};
    });
    saving=pending.catch(error=>{failed=true;update({problem:error.message,status:'尚未保存，请保留页面内容'});throw error;});
    // Keep the rejected transaction for finish(), but never leak an unhandled rejection.
    void saving.catch(()=>{});return saving;
   },
  });
 }
 async function poll(){
  if(closed)return;
  try{
   if(frame?.hasChanges())dirty=true;
   if(!busy&&visible&&!dirty&&!failed){
    const snapshot=requirePpt(await call<OfficeContentSnapshot>({endpoint:'read',documentId}));
    if(closed||busy||dirty||failed)return;
    if(!base||snapshot.revision>base.revision||snapshot.generation!==base.generation)render(snapshot,true);
    await acknowledge();
   }
  }catch(error){if(!closed){update({problem:error instanceof Error?error.message:String(error)});}}
  finally{if(!closed)timer=setTimeout(poll,visible?800:5000);}
 }
 const model={
  subscribe(listener:()=>void){listeners.add(listener);return()=>listeners.delete(listener);},getSnapshot:()=>view,
  setVisible(value:boolean){visible=value;},setRequest(value:string|undefined){requestId=value;},
  attach(element:HTMLElement){container=element;void poll();return()=>{
   closed=true;clearTimeout(timer);frame?.dispose();listeners.clear();
  };},
  async download(){if(!frame||!view.ready)throw new Error('PPT 尚未就绪。');await frame.flush();await saving;await frame.download();},
 };
 return model;
}
