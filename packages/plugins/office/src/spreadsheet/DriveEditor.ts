/**
 * 网盘 XLSX 在线编辑器（无 Session）。
 *
 * 与 `Page.tsx` 的实时工作副本不同，这里不持有租约、不调用 Host：网盘把当前修订的
 * 字节交进来，用户编辑后由 `save()` 交回新字节，写回、冲突检测与授权都由网盘负责。
 * 导入与导出都只覆盖单元格值与公式，界面必须如实告知格式、合并、图表等不会保留。
 */
import { createUniver, LocaleType, mergeLocales } from "@univerjs/presets";
import { UniverSheetsCorePreset } from "@univerjs/preset-sheets-core";
import ZhCN from "@univerjs/preset-sheets-core/locales/zh-CN";
import sheetsCss from "@univerjs/preset-sheets-core/lib/index.css";
import type { OfficeSpreadsheetSnapshot } from "workdsh-contracts/office";
import type { DriveEditorHandle, DriveEditorInput } from "workdsh-contracts/drive";
import { stateFromUniver, univerSnapshot } from "./adapter.js";
import { importSpreadsheet } from "./import-xlsx.js";
import { spreadsheetXlsx } from "./xlsx.js";
import { officeCss } from "../live/style.js";

export async function mountSpreadsheetEditor(
  target: HTMLElement,
  input: DriveEditorInput,
): Promise<DriveEditorHandle> {
  const imported = await importSpreadsheet(input.bytes, input.name);
  const style = document.createElement("style");
  style.textContent = officeCss + sheetsCss;
  const shell = document.createElement("div");
  shell.className = "wd-office-live";
  const note = document.createElement("div");
  note.className = "wd-office-import-note";
  note.textContent =
    "在线编辑只保留单元格值与公式。保存会按单元格重建工作簿，原文件的格式、合并单元格、图表、图片与批注不会保留。";
  const mount = document.createElement("div");
  mount.className = "workdsh-sheet-editor";
  mount.dataset.testid = "office-spreadsheet";
  mount.style.cssText = "flex:1;min-height:0;min-width:0;overflow:hidden";
  shell.append(note, mount);
  target.replaceChildren(style, shell);
  let engine: ReturnType<typeof createUniver>;
  try {
    engine = createUniver({
      locale: LocaleType.ZH_CN,
      locales: { [LocaleType.ZH_CN]: mergeLocales(ZhCN) },
      presets: [
        UniverSheetsCorePreset({
          container: mount,
          ribbonType: "classic",
          formula: { initialFormulaComputing: 0 },
        }),
      ],
    });
  } catch (cause) {
    target.replaceChildren();
    throw new Error(`无法打开「${input.name}」：${cause instanceof Error ? cause.message : String(cause)}`);
  }
  const workbook = engine.univerAPI.createWorkbook({
    ...univerSnapshot(imported, input.fileId, input.name),
    locale: LocaleType.ZH_CN,
  });
  workbook.setEditable(true);
  const nativeBaseline = workbook.save();
  // 已保存基线只随网盘的 acknowledge 推进：网盘不回报提交是否成功，
  // 若在 save() 里直接推进，提交失败后的重试会被误判成「没有修改」而丢数据。
  let saved = imported;
  let pending: typeof imported | undefined;
  let disposed = false;
  return {
    async save() {
      if (disposed) return undefined;
      const state = stateFromUniver(workbook.save(), nativeBaseline);
      if (JSON.stringify(state) === JSON.stringify(saved)) return undefined;
      pending = state;
      const snapshot: OfficeSpreadsheetSnapshot = {
        documentId: input.fileId,
        kind: "spreadsheet",
        title: input.name,
        revision: 0,
        generation: input.revisionId,
        state,
      };
      return spreadsheetXlsx(snapshot);
    },
    acknowledge() {
      if (!pending) return;
      saved = pending;
      pending = undefined;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      engine.univer.dispose();
      target.replaceChildren();
    },
  };
}
