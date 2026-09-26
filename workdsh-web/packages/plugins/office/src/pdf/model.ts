import {z} from 'zod';
const id=z.string().min(1).max(160).regex(/^[a-zA-Z0-9_-]+$/).refine(v=>!['__proto__','constructor','prototype'].includes(v));
const color=z.string().regex(/^#[0-9a-fA-F]{6}$/),n=z.number().finite();
const geometry={id,x:n.min(0).max(2000),y:n.min(0).max(2000),width:n.positive().max(2000),height:n.positive().max(2000)};
export const pdfElement=z.discriminatedUnion('type',[
 z.object({...geometry,type:z.literal('text'),text:z.string().max(16000).refine(v=>!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v)),fontSize:n.min(6).max(96),lineHeight:n.min(1).max(2),color}).strict(),
 z.object({...geometry,type:z.literal('rectangle'),fill:color}).strict(),
]);
export const pdfPage=z.object({id,width:n.min(100).max(2000),height:n.min(100).max(2000),background:color,elements:z.array(pdfElement).max(100)}).strict().superRefine((page,ctx)=>{const ids=new Set<string>();for(const e of page.elements){if(ids.has(e.id)||e.x+e.width>page.width||e.y+e.height>page.height)ctx.addIssue({code:'custom',message:'元素 ID 重复或超出页面。'});ids.add(e.id);}});
export const pdfStateSchema=z.object({modelVersion:z.literal(1),pages:z.array(pdfPage).min(1).max(50)}).strict().refine(s=>new Set(s.pages.map(p=>p.id)).size===s.pages.length,'页面 ID 重复。').refine(s=>new TextEncoder().encode(JSON.stringify(s)).length<=1024*1024,'PDF 状态超过 1 MiB。');
export const pdfOpenInput=z.object({source:z.literal('new'),kind:z.literal('pdf'),title:z.string().trim().min(1).max(160),operationId:id}).strict();
export const pdfOperations=z.array(z.discriminatedUnion('op',[
 z.object({op:z.literal('pdf.insertPage'),afterPageId:id.nullable(),page:pdfPage}).strict(),
 z.object({op:z.literal('pdf.updatePage'),pageId:id,page:pdfPage}).strict(),
 z.object({op:z.literal('pdf.removePage'),pageId:id}).strict(),
])).min(1).max(50);
export const pdfEditInput=z.object({documentId:id,baseRevision:n.int().nonnegative(),operationId:id,operations:pdfOperations}).strict();
export function applyPdf(state:z.infer<typeof pdfStateSchema>,operations:unknown[]){const pages=structuredClone(state.pages);for(const op of pdfOperations.parse(operations)){if(op.op==='pdf.insertPage'){const i=op.afterPageId===null?-1:pages.findIndex(p=>p.id===op.afterPageId);if(op.afterPageId!==null&&i<0)throw Error('插入锚点不存在。');pages.splice(i+1,0,op.page);}else{const i=pages.findIndex(p=>p.id===op.pageId);if(i<0)throw Error('页面不存在。');if(op.op==='pdf.removePage')pages.splice(i,1);else{if(op.page.id!==op.pageId)throw Error('不能更改页面 ID。');pages[i]=op.page;}}}return {state:pdfStateSchema.parse({modelVersion:1,pages}),ids:{}};}
export function initialPdf(title:string):z.infer<typeof pdfStateSchema>{return {modelVersion:1,pages:[{id:'page-1',width:595.28,height:841.89,background:'#FFFFFF',elements:[{id:'title',type:'text',x:40,y:40,width:515,height:140,text:title,fontSize:title.length>50?14:24,lineHeight:1.3,color:'#172554'},{id:'body',type:'text',x:40,y:200,width:515,height:580,text:'',fontSize:12,lineHeight:1.5,color:'#334155'}]}]};}
