/**
 * 浏览器侧 XLSX 导入器：把网盘里的字节转成在线编辑状态。
 *
 * 与 `xlsx.ts`（导出，同时被 Host 的 `content/export.ts` 引用）分开，因为这里依赖
 * JSZip 与 DOMParser，只能在浏览器运行。导入只保留单元格值与公式；格式、合并单元格、
 * 图表和图片不进入在线模型，保存时会按单元格重建工作簿，界面必须如实告知这一点。
 */
import ExcelJS from "exceljs";
import type { Cell as ExcelCell } from "exceljs";
import JSZip from "jszip";
import type { OfficeSpreadsheetState } from "workdsh-contracts/office";
import { cellAddress, spreadsheetStateSchema } from "./model.js";
import { parse } from "../content/model.js";

const unsupportedParts = /^xl\/(charts|drawings|pivotTables|pivotCache|externalLinks|slicerCaches|embeddings)\//;
const drawingParts = /^xl\/(charts|drawings)\//;
const maxSheets = 20;
const maxRows = 1000;
const maxColumns = 100;
const maxCells = 10000;

/**
 * ExcelJS 无法解析带图表绘图的包（例如 openpyxl 产物）。这里生成一份去掉绘图部件的
 * 临时副本用于解析，调用方传入的原始字节不受影响。
 */
async function loadableBytes(bytes: Uint8Array): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(bytes);
  const parts = Object.keys(zip.files).filter(
    path => unsupportedParts.test(path) && !zip.files[path]?.dir,
  );
  if (!parts.some(path => drawingParts.test(path))) return bytes;
  for (const path of Object.keys(zip.files)) {
    if (drawingParts.test(path)) {
      zip.remove(path);
      continue;
    }
    if (!(path.endsWith(".rels") || /^xl\/worksheets\/[^/]+\.xml$/.test(path) || path === "[Content_Types].xml"))
      continue;
    const file = zip.file(path);
    if (!file) continue;
    const doc = new DOMParser().parseFromString(await file.async("string"), "application/xml");
    if (doc.getElementsByTagName("parsererror").length)
      throw new Error("文件内部的 XML 已损坏，无法读取。");
    let changed = false;
    for (const node of Array.from(doc.getElementsByTagName("*"))) {
      const remove =
        node.localName === "drawing" ||
        (node.localName === "Relationship" && /\/(drawing|chart)$/.test(node.getAttribute("Type") ?? "")) ||
        (node.localName === "Override" && drawingParts.test(node.getAttribute("PartName") ?? ""));
      if (remove) {
        node.parentNode?.removeChild(node);
        changed = true;
      }
    }
    if (changed) zip.file(path, new XMLSerializer().serializeToString(doc));
  }
  return zip.generateAsync({ type: "uint8array" });
}

/** 把 ExcelJS 的任意单元格值收敛成契约允许的标量；富文本拼接、日期转 Excel 序列号。 */
function plainValue(value: unknown): unknown {
  if (value == null) return value;
  if (value instanceof Date) return (value.getTime() - Date.UTC(1899, 11, 30)) / 86400000;
  if (typeof value !== "object") return value;
  const candidate = value as {
    richText?: { text: string }[];
    hyperlink?: string;
    text?: unknown;
    error?: string;
  };
  if (candidate.richText) return candidate.richText.map(run => run.text).join("");
  if (candidate.hyperlink !== undefined) return plainValue(candidate.text ?? candidate.hyperlink);
  if (candidate.error !== undefined) return candidate.error;
  return String(value);
}

type ImportedCell = { value?: string | number | boolean | null; formula?: string } | undefined;

function importedCell(cell: ExcelCell, address: string): ImportedCell {
  const formula = cell.formula;
  if (formula) {
    const text = "=" + formula;
    if (text.length > 2000) throw new Error(`单元格 ${address} 的公式超过 2000 字符，无法在线编辑。`);
    return { formula: text };
  }
  const raw = plainValue(cell.value);
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw === "string") {
    if (!raw) return undefined;
    if (raw.length > 20000) throw new Error(`单元格 ${address} 的文本超过 20000 字符，无法在线编辑。`);
    return { value: raw };
  }
  if (typeof raw === "number") return Number.isFinite(raw) ? { value: raw } : undefined;
  if (typeof raw === "boolean") return { value: raw };
  return { value: String(raw) };
}

export async function importSpreadsheet(bytes: Uint8Array, name: string): Promise<OfficeSpreadsheetState> {
  const workbook = new ExcelJS.Workbook();
  try {
    // exceljs 的 d.ts 用模块内 Buffer 声明，运行时接受任何 ArrayBufferView。
    const data = (await loadableBytes(bytes)) as unknown as Parameters<
      typeof workbook.xlsx.load
    >[0];
    await workbook.xlsx.load(data);
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    throw new Error(`无法解析「${name}」：${detail || "文件可能已损坏或包含不支持的对象。"}`);
  }
  const sheetOrder: string[] = [];
  const sheets: OfficeSpreadsheetState["sheets"] = {};
  let total = 0;
  workbook.eachSheet(sheet => {
    if (sheetOrder.length >= maxSheets)
      throw new Error(`「${name}」包含超过 ${maxSheets} 个工作表，超出在线编辑上限。`);
    const key = `sheet-${sheet.id}`;
    const cells: OfficeSpreadsheetState["sheets"][string]["cells"] = {};
    sheet.eachRow((row, rowNumber) => {
      row.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
        // 合并区域的从属单元格会回读主单元格的值，跳过避免把同一内容复制到整片区域。
        if (cell.isMerged && cell.master !== cell) return;
        const address = cellAddress(rowNumber - 1, columnNumber - 1);
        const converted = importedCell(cell, address);
        if (!converted) return;
        if (rowNumber - 1 >= maxRows || columnNumber - 1 >= maxColumns)
          throw new Error(`单元格 ${address} 超出在线编辑范围 A1:CV1000。`);
        if (++total > maxCells) throw new Error(`工作簿可见单元格超过 ${maxCells} 个，超出在线编辑上限。`);
        cells[address] = converted;
      });
    });
    sheetOrder.push(key);
    sheets[key] = { sheetId: key, name: sheet.name, cells };
  });
  try {
    return parse(spreadsheetStateSchema, { modelVersion: 1, sheetOrder, sheets });
  } catch (cause) {
    throw new Error(`无法在线编辑「${name}」：${cause instanceof Error ? cause.message : String(cause)}`);
  }
}
