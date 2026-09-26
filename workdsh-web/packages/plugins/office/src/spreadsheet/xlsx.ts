import ExcelJS from "exceljs";
import type {OfficeSpreadsheetSnapshot} from "workdsh-contracts/office";
import {spreadsheetStateSchema} from "./model.js";
import {parse} from "../content/model.js";
export async function spreadsheetXlsx(snapshot:OfficeSpreadsheetSnapshot){
 const state=parse(spreadsheetStateSchema,snapshot.state),workbook=new ExcelJS.Workbook();
 workbook.creator="WorkDSH";workbook.created=new Date("2000-01-01T00:00:00Z");workbook.modified=new Date("2000-01-01T00:00:00Z");
 workbook.calcProperties.fullCalcOnLoad=true;
 for(const id of state.sheetOrder){const sheet=state.sheets[id]!,target=workbook.addWorksheet(sheet.name);for(const [address,cell] of Object.entries(sheet.cells))target.getCell(address).value=cell.formula?{formula:cell.formula.slice(1)}:cell.value??null;}
 return new Uint8Array(await workbook.xlsx.writeBuffer());
}
export async function downloadSpreadsheet(snapshot:OfficeSpreadsheetSnapshot){const bytes=await spreadsheetXlsx(snapshot);const url=URL.createObjectURL(new Blob([bytes as BlobPart],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));const a=document.createElement("a");a.href=url;a.download=(snapshot.title.replace(/[\\/:*?"<>|]/g,"_")||"工作簿")+".xlsx";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
