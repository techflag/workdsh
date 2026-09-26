import {z} from "zod";
import type {OfficeSpreadsheetState} from "workdsh-contracts/office";
import {id,ensure,parse} from "../content/model.js";
export const address=z.string().regex(/^[A-Z]{1,2}[1-9][0-9]{0,3}$/).refine(a=>coordinates(a).row<1000 && coordinates(a).column<100,"Cell range is A1:CV1000");
export function coordinates(a:string){const m=/^([A-Z]+)([0-9]+)$/.exec(a)!;let column=0;for(const c of m[1]!)column=column*26+c.charCodeAt(0)-64;return {row:Number(m[2])-1,column:column-1};}
export function cellAddress(row:number,column:number){let name="";for(let c=column+1;c>0;c=Math.floor((c-1)/26))name=String.fromCharCode(65+(c-1)%26)+name;return name+(row+1);}
export const cellSchema=z.object({value:z.union([z.string().max(20000),z.number().finite(),z.boolean(),z.null()]).optional(),formula:z.string().min(2).max(2000).startsWith("=").optional()}).strict().refine(c=>!(c.formula && c.value!==undefined),"Formula cells must not carry stale cached values");
const sheetName=z.string().trim().min(1).max(31).regex(/^[^\\/?*\[\]:]+$/).refine(n=>!n.startsWith("'")&&!n.endsWith("'"));
export const spreadsheetStateSchema=z.object({modelVersion:z.literal(1),sheetOrder:z.array(id).min(1).max(20),sheets:z.record(id,z.object({sheetId:id,name:sheetName,cells:z.record(address,cellSchema)}).strict())}).strict().superRefine((state,ctx)=>{
 if(new Set(state.sheetOrder).size!==state.sheetOrder.length || Object.keys(state.sheets).length!==state.sheetOrder.length || state.sheetOrder.some(key=>state.sheets[key]?.sheetId!==key))ctx.addIssue({code:"custom",message:"Invalid sheet order"});
 const names=Object.values(state.sheets).map(s=>s.name.toLowerCase());if(new Set(names).size!==names.length)ctx.addIssue({code:"custom",message:"Sheet names must be unique"});
 if(Object.values(state.sheets).reduce((n,s)=>n+Object.keys(s.cells).length,0)>10000 || new TextEncoder().encode(JSON.stringify(state)).length>2097152)ctx.addIssue({code:"custom",message:"Workbook exceeds 10000 cells / 2 MiB"});
});
export const spreadsheetOpenInput=z.object({source:z.literal("new"),kind:z.literal("spreadsheet"),title:z.string().trim().min(1).max(160),operationId:id}).strict();
export const spreadsheetOperation=z.discriminatedUnion("op",[
 z.object({op:z.literal("spreadsheet.setCells"),sheetId:id,cells:z.array(z.object({address,cell:cellSchema}).strict()).min(1).max(1000)}).strict(),
 z.object({op:z.literal("spreadsheet.clearCells"),sheetId:id,addresses:z.array(address).min(1).max(1000)}).strict(),
 z.object({op:z.literal("spreadsheet.addSheet"),sheetId:id,name:sheetName}).strict(),
 z.object({op:z.literal("spreadsheet.renameSheet"),sheetId:id,name:sheetName}).strict(),
 z.object({op:z.literal("spreadsheet.removeSheet"),sheetId:id}).strict(),
 z.object({op:z.literal("spreadsheet.replaceState"),state:spreadsheetStateSchema}).strict(),
]);
export const spreadsheetEditInput=z.object({documentId:id,baseRevision:z.number().int().nonnegative(),operationId:id,operations:z.array(spreadsheetOperation).min(1).max(100)}).strict();
export function createSpreadsheet():OfficeSpreadsheetState{return {modelVersion:1,sheetOrder:["sheet-1"],sheets:{"sheet-1":{sheetId:"sheet-1",name:"工作表1",cells:{}}}};}
export function applySpreadsheet(state:OfficeSpreadsheetState,input:unknown):{state:OfficeSpreadsheetState;ids:Record<string,string>}{let next=structuredClone(state);for(const op of parse(z.array(spreadsheetOperation),input)){
 if(op.op==="spreadsheet.replaceState"){next=op.state;continue;}
 if(op.op==="spreadsheet.addSheet"){ensure(!next.sheets[op.sheetId],"INVALID_INPUT","工作表 ID 已存在。");next.sheetOrder.push(op.sheetId);next.sheets[op.sheetId]={sheetId:op.sheetId,name:op.name,cells:{}};continue;}
 const sheet=next.sheets[op.sheetId];ensure(sheet,"TARGET_NOT_FOUND","工作表不存在。");
 if(op.op==="spreadsheet.setCells")for(const entry of op.cells)sheet.cells[entry.address]=entry.cell;
 if(op.op==="spreadsheet.clearCells")for(const a of op.addresses)delete sheet.cells[a];
 if(op.op==="spreadsheet.renameSheet")sheet.name=op.name;
 if(op.op==="spreadsheet.removeSheet"){delete next.sheets[op.sheetId];next.sheetOrder=next.sheetOrder.filter(key=>key!==op.sheetId);}
 }return {state:parse(spreadsheetStateSchema,next),ids:{}};}
export const spreadsheetCapabilities={operations:["spreadsheet.setCells","spreadsheet.clearCells","spreadsheet.addSheet","spreadsheet.renameSheet","spreadsheet.removeSheet"],addressFormat:"A1",limits:{sheets:20,rows:1000,columns:100,cells:10000,cellsPerOperation:1000,contentBytes:2097152},cell:{value:"string | finite number | boolean | null",formula:"= prefixed formula; omit value; computed by Univer in browser, not by Host"},export:{format:"xlsx",tool:"content_export",fullCalcOnLoad:true},unsupported:["charts","formatting","merged cells","import into live working copy","Host formula evaluation"]};
