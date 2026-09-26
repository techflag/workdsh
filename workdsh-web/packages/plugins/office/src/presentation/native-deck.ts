import {z} from 'zod';
import JSZip from 'jszip';
import {PptxHandler,type PptxSlide} from 'pptx-viewer-core';
import {OfficeError} from '../content/model.js';
const id=z.string().min(1).max(200).refine(v=>!['__proto__','prototype','constructor'].includes(v));
const slide=z.object({id,nativeId:z.string().optional(),slideNumber:z.number().int().positive(),elements:z.array(z.record(z.string(),z.unknown())).max(200)}).passthrough();
const canvas=z.object({width:z.number().positive().max(10000),height:z.number().positive().max(10000),unit:z.literal('css-px')}).strict();
const schema=z.object({provider:z.literal('pptx-react'),id,title:z.string().min(1).max(2000),canvas:canvas.default({width:1280,height:720,unit:'css-px'}),bytes:z.string().regex(/^[A-Za-z0-9+/]*={0,2}$/).max(12*1024*1024),slides:z.array(slide).min(1).max(50)}).strict();
export type NativeDeck=z.infer<typeof schema>;
export function parsePresentation(input:unknown):NativeDeck{
 const deck=schema.parse(structuredClone(input));
 if(new Set(deck.slides.map(s=>s.id)).size!==deck.slides.length)throw new OfficeError('INVALID_INPUT','幻灯片 ID 重复。');
 return deck;
}
const encode=(b:Uint8Array)=>Buffer.from(b).toString('base64');
/** Bounded ZIP central-directory preflight; no private JSZip internals. */
function validateZipLimits(bytes:Buffer){
 const invalid=()=>new OfficeError('INVALID_INPUT','PPTX ZIP 目录无效或使用不支持的 ZIP64 格式。');
 let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){
  if(bytes.readUInt32LE(i)===0x06054b50 && i+22+bytes.readUInt16LE(i+20)===bytes.length){end=i;break;}
 }
 if(end<0 || bytes.readUInt16LE(end+4)!==0 || bytes.readUInt16LE(end+6)!==0)throw invalid();
 const count=bytes.readUInt16LE(end+10),size=bytes.readUInt32LE(end+12),offset=bytes.readUInt32LE(end+16);
 if(count!==bytes.readUInt16LE(end+8) || count===65535 || offset+size>end)throw invalid();
 if(count>4096)throw new OfficeError('LIMIT_REACHED','PPTX 文件条目过多。');
 let cursor=offset,total=0;
 for(let i=0;i<count;i++){
  if(cursor+46>offset+size || bytes.readUInt32LE(cursor)!==0x02014b50)throw invalid();
  const expanded=bytes.readUInt32LE(cursor+24);
  if(expanded===0xffffffff)throw invalid();
  total+=expanded;
  if(total>64*1024*1024)throw new OfficeError('LIMIT_REACHED','PPTX 解压内容超过 64 MiB。');
  cursor+=46+bytes.readUInt16LE(cursor+28)+bytes.readUInt16LE(cursor+30)+bytes.readUInt16LE(cursor+32);
 }
 if(cursor!==offset+size)throw invalid();
}
/** Retain original package bytes: the native serializer uses them to preserve masters/assets. */
export async function importPresentation(title:string, bytes:string):Promise<NativeDeck>{
 const binary=Buffer.from(bytes,'base64');
 if(binary.length===0 || binary.length>8*1024*1024 || binary.toString('base64')!==bytes)throw new OfficeError('LIMIT_REACHED','PPTX 文件为空、编码无效或超过 8 MiB。');
 // Inspect ZIP declarations before any parser inflates XML/media.
 validateZipLimits(binary);
 const zip=await JSZip.loadAsync(binary);
 if(!zip.file('ppt/presentation.xml'))throw new OfficeError('INVALID_INPUT','文件不是 PPTX 演示文稿。');
 const handler=new PptxHandler();
 const data=await handler.load(Uint8Array.from(binary).buffer);
 return parsePresentation({provider:'pptx-react',id:crypto.randomUUID(),title,canvas:{width:data.width,height:data.height,unit:'css-px'},bytes,slides:data.slides.map(s=>({...s,nativeId:s.id}))});
}
export async function createPresentation(title:string):Promise<NativeDeck>{
 const {handler,data,createSlide}=await PptxHandler.create({title});
 data.slides.push(createSlide().addText(title,{x:80,y:240,width:1120,height:130,fontSize:40,fontFamily:'Microsoft YaHei',color:'#172554',bold:true}).build());
 const stable=data.slides.map(s=>s.id);const binary=await handler.save(data.slides);
 const saved=await new PptxHandler().load(Uint8Array.from(binary).buffer);
 return parsePresentation({provider:'pptx-react',id:crypto.randomUUID(),title,canvas:{width:saved.width,height:saved.height,unit:'css-px'},bytes:encode(binary),slides:saved.slides.map((s,i)=>({...s,id:stable[i],nativeId:s.id}))});
}
const ops=z.discriminatedUnion('op',[
 z.object({op:z.literal('presentation.updateText'),slideId:id,elementId:id,expectedText:z.string().max(20000),text:z.string().max(20000)}).strict(),
 z.object({op:z.literal('presentation.replaceDeck'),deck:z.unknown()}).strict(),
 z.object({op:z.literal('presentation.insertSlides'),afterSlideId:id.nullable(),slides:z.array(slide).min(1).max(50)}).strict(),
 z.object({op:z.literal('presentation.updateSlide'),slideId:id,patch:z.object({elements:z.array(z.record(z.string(),z.unknown())).max(200).optional(),name:z.string().max(2000).optional(),backgroundColor:z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),notes:z.string().max(20000).optional()}).strict().refine(p=>Object.keys(p).length>0)}).strict(),
 z.object({op:z.literal('presentation.removeSlide'),slideId:id}).strict(),
 z.object({op:z.literal('presentation.moveSlide'),slideId:id,afterSlideId:id.nullable()}).strict(),
]);
function validateAuthoredElements(elements:readonly Record<string,unknown>[],dimensions:NativeDeck['canvas']){
 for(const element of elements){
  const values=['x','y','width','height'].map(key=>element[key]);
  if(values.every(value=>value===undefined))continue;
  if(!values.every(value=>typeof value==='number'&&Number.isFinite(value)))throw new OfficeError('INVALID_INPUT','PPT 元素坐标必须同时提供有限的 x、y、width、height。');
  const [x,y,width,height]=values as number[];
  if(x!<0||y!<0||width!<=0||height!<=0||x!+width!>dimensions.width+0.01||y!+height!>dimensions.height+0.01)
   throw new OfficeError('INVALID_INPUT',`PPT 元素超出 ${dimensions.width}×${dimensions.height} ${dimensions.unit} 画布。`);
 }
}
/** Canonical JSON comparison tolerates property order and omitted undefineds
 * after Storage/RPC, without treating adapter IDs as native content changes. */
function nativeContent(slide:Record<string,unknown>){
 const {nativeId,isDirty,slideNumber,...content}=slide;
 return JSON.stringify(content,(_key,value)=>value && typeof value==='object' && !Array.isArray(value)
  ? Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b))) : value);
}
/** A direct authored colour must override a ref inherited from the master.
 * Core 3.14.3 exposes both in parsed styles; its writer otherwise prefers ref. */
function preserveAuthoredTextColor(element:Record<string,unknown>){
 const normalize=(input:unknown)=>{
  if(!input || typeof input!=='object')return;
  const style=input as Record<string,unknown>;
  const authored=style.authoredRunStyle as Record<string,unknown>|undefined;
  const inherited=style.inheritedRunStyle as Record<string,unknown>|undefined;
  const xml=authored?.colorXml as Record<string,unknown>|undefined;
  if(xml && Object.keys(xml).some(key=>key.split(':').at(-1)==='srgbClr') &&
    !authored?.colorRef && style.colorRef && inherited?.colorRef &&
    JSON.stringify(style.colorRef)===JSON.stringify(inherited.colorRef))delete style.colorRef;
 };
 normalize(element.textStyle);
 for(const segment of (element.textSegments??[]) as Record<string,unknown>[])normalize(segment.style);
 for(const child of (element.elements??element.children??[]) as Record<string,unknown>[])preserveAuthoredTextColor(child);
}
/** Blob URLs are runtime handles, not changes to an image. Resolve handles from
 * the stored package baseline before dirty comparison and native serialization.
 * This also revives handles persisted by a previous Host process. */
const mediaHandleKeys=new Set(["src","url","backgroundImage","imageData","mediaData","posterSrc","posterImage","previewImage","texture"]);
function collectMediaHandles(previous:unknown,current:unknown,handles:Map<string,string>,key=""){
 if(mediaHandleKeys.has(key) && typeof previous==='string' && previous.startsWith('blob:') && typeof current==='string' && current.startsWith('blob:')){handles.set(previous,current);handles.set(current,current);return;}
 if(!previous || !current || typeof previous!=='object' || typeof current!=='object')return;
 if(Array.isArray(previous) && Array.isArray(current)){
  for(let i=0;i<previous.length;i++){
   const value=previous[i];
   const match=value && typeof value==='object' && 'id' in value ? current.find(v=>v && typeof v==='object' && v.id===value.id) : current[i];
   collectMediaHandles(value,match,handles,key);
  }
 }else if(!Array.isArray(previous) && !Array.isArray(current)){
  for(const [key,value] of Object.entries(previous))collectMediaHandles(value,(current as Record<string,unknown>)[key],handles,key);
 }
}
function rebindMediaHandles(value:unknown,handles:Map<string,string>,key=""):unknown{
 if(mediaHandleKeys.has(key) && typeof value==='string' && value.startsWith('blob:')){
  const handle=handles.get(value);
  if(!handle)throw new OfficeError('INVALID_INPUT','图片临时引用不属于当前 PPTX，请重新读取文档或提供嵌入图片。');
  return handle;
 }
 if(Array.isArray(value))return value.map(v=>rebindMediaHandles(v,handles,key));
 if(value && typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,rebindMediaHandles(v,handles,key)]));
 return value;
}
export async function applyPresentation(input:unknown,batch:unknown):Promise<NativeDeck>{
 let deck=parsePresentation(input);
 let packageState=structuredClone(deck);
 const index=(key:string)=>{const i=deck.slides.findIndex(s=>s.id===key);if(i<0)throw new OfficeError('INVALID_INPUT','幻灯片不存在。');return i};
 const after=(key:string|null)=>key===null?0:index(key)+1;
 for(const op of z.array(ops).min(1).max(100).parse(batch)){
  if(op.op==='presentation.replaceDeck'){const next=parsePresentation(op.deck);if(next.id!==deck.id)throw new OfficeError('INVALID_INPUT','文档 ID 不能改变。');deck=next;packageState=structuredClone(next);}
  if(op.op==='presentation.insertSlides'){for(const slide of op.slides)validateAuthoredElements(slide.elements,deck.canvas);deck.slides.splice(after(op.afterSlideId),0,...op.slides);}
  if(op.op==='presentation.updateText'){
   const element=deck.slides[index(op.slideId)]!.elements.find(e=>e.id===op.elementId);
   if(!element || !['text','shape'].includes(String(element.type)) || typeof element.text!=='string')throw new OfficeError('INVALID_INPUT','请选择本页的文字元素。');
   if(element.text!==op.expectedText)throw new OfficeError('REVISION_CONFLICT','文字已变化，请重新读取。');
   // Keep geometry, placeholder/layout metadata and the first run's existing style.
   const segments=element.textSegments as {text:string;style?:unknown}[]|undefined;
   element.text=op.text;
   element.textSegments=[{...(segments?.[0]??{}),text:op.text}];
  }
  if(op.op==='presentation.updateSlide'){if(op.patch.elements)validateAuthoredElements(op.patch.elements,deck.canvas);Object.assign(deck.slides[index(op.slideId)]!,op.patch);}
  if(op.op==='presentation.removeSlide')deck.slides.splice(index(op.slideId),1);
  if(op.op==='presentation.moveSlide'){if(op.slideId===op.afterSlideId)throw new OfficeError('INVALID_INPUT','幻灯片不能移到自己之后。');const s=deck.slides.splice(index(op.slideId),1)[0]!;deck.slides.splice(after(op.afterSlideId),0,s);}
 }
 deck=parsePresentation(deck);
 const handler=new PptxHandler();const baseline=await handler.load(Uint8Array.from(Buffer.from(deck.bytes,'base64')).buffer);
 const originals=new Map(baseline.slides.map(s=>[s.id,s]));
 const handles=new Map<string,string>();
 for(const slide of packageState.slides)collectMediaHandles(slide,originals.get(slide.nativeId??slide.id),handles);
 deck.slides.forEach((s,i)=>{s.slideNumber=i+1});
 const coreSlides=deck.slides.map(({id,nativeId,...native})=>rebindMediaHandles({id:nativeId??id,...native},handles)) as unknown as PptxSlide[];
 for(const native of coreSlides){
  const original=originals.get(native.id);
  native.isDirty=!original || nativeContent(native as unknown as Record<string,unknown>)!==nativeContent(original as unknown as Record<string,unknown>);
  if(native.isDirty)for(const element of native.elements)preserveAuthoredTextColor(element as unknown as Record<string,unknown>);
 }
 const binary=await handler.save(coreSlides);
 // Reparse committed bytes so metadata and native part IDs agree with the
 // next save baseline and the browser working copy.
 const saved=await new PptxHandler().load(Uint8Array.from(binary).buffer);
 deck.bytes=encode(binary);
 deck.canvas={width:saved.width,height:saved.height,unit:'css-px'};
 deck.slides=parsePresentation({...deck,slides:saved.slides.map((s,i)=>({...s,id:deck.slides[i]!.id,nativeId:s.id}))}).slides;
 return parsePresentation(deck);
}
