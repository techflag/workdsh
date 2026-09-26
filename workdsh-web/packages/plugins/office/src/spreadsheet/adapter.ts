import type {OfficeSpreadsheetState} from "workdsh-contracts/office";
import {coordinates,cellAddress,spreadsheetStateSchema} from "./model.js";
import {parse} from "../content/model.js";
export function univerSnapshot(state:OfficeSpreadsheetState,id:string,title:string){return {id,name:title,appVersion:"0.25.1",locale:"zhCN",sheetOrder:state.sheetOrder,sheets:Object.fromEntries(state.sheetOrder.map(key=>{const sheet=state.sheets[key]!,cellData:Record<number,Record<number,{v?:string|number|boolean|null;f?:string;t?:1|2|3}>>={};for(const [address,cell] of Object.entries(sheet.cells)){const {row,column}=coordinates(address);(cellData[row]??={})[column]=cell.formula?{f:cell.formula}:{v:cell.value??null,t:typeof cell.value==="number"?2:typeof cell.value==="boolean"?3:1};}return [key,{id:key,name:sheet.name,rowCount:1000,columnCount:100,cellData}];}))};}
// Reject unsupported manual metadata changes instead of quietly dropping them on save/export.
export function stateFromUniver(snapshot:any,baseline:any):OfficeSpreadsheetState{
 const metadata=(cell:any)=>Object.fromEntries(Object.entries(cell??{}).filter(([key])=>!["v","f","t","si"].includes(key)));
 if(JSON.stringify(snapshot.styles??{})!==JSON.stringify(baseline.styles??{}))throw Error("暂不支持保存单元格样式修改；请撤销格式修改后保存。");
 const sheets:OfficeSpreadsheetState["sheets"]={};
 for(const key of snapshot.sheetOrder){const sheet=snapshot.sheets[key],before=baseline.sheets[key] ?? {rowCount:1000,columnCount:100};
  for(const property of ["rowCount","columnCount","mergeData","rowData","columnData","freeze","filter","conditionalFormatting","defaultColumnWidth","defaultRowHeight"]){if(JSON.stringify(sheet[property]??null)!==JSON.stringify(before?.[property]??null))throw Error("暂不支持保存合并、格式、冻结或行列结构修改；请撤销这些修改后保存。");}
  const cells:OfficeSpreadsheetState["sheets"][string]["cells"]={};
  for(const [row,cols] of Object.entries(sheet.cellData??{}))for(const [column,raw] of Object.entries(cols as object)){const cell=raw as any;if(JSON.stringify(metadata(cell))!==JSON.stringify(metadata(before?.cellData?.[row]?.[column])))throw Error("暂不支持保存单元格格式或富文本修改；请撤销格式修改后保存。");if(cell?.f)cells[cellAddress(Number(row),Number(column))]={formula:cell.f};else if(cell?.v!==undefined && cell.v!==null && cell.v!=="")cells[cellAddress(Number(row),Number(column))]={value:cell.v};}
  sheets[key]={sheetId:key,name:sheet.name,cells};
 }
 return parse(spreadsheetStateSchema,{modelVersion:1,sheetOrder:snapshot.sheetOrder,sheets});
}
