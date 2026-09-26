import type { InputTriggerSource } from "@deepseek-ai/dsh-client-ui-input-trigger/client";
import type { OfficeClient } from "./live/model.js";

export const officeTypes = [
  ["word", "Word", true], ["ppt", "PPT", false], ["excel", "Excel", false],
  ["pdf", "PDF", true], ["canvas", "画布", false], ["base", "多维表格", false],
  ["html", "HTML", true], ["markdown", "Markdown", false],
] as const;
export const outputSourceName = "Office 输出";
export const documentSourceName = "Office 文档";
const encode = (value: unknown) => encodeURIComponent(JSON.stringify(value));
function outputType(ref: string) {
  const type = officeTypes.find(([id]) => id === ref);
  if (!type) throw new Error("未知 Office 类型，请重新选择。" );
  return type;
}
function documentRef(ref: string): {sessionId: string; documentId: string; role: "reference" | "target"} {
  const value = JSON.parse(decodeURIComponent(ref));
  if (!value || typeof value.sessionId !== "string" || typeof value.documentId !== "string" || !["reference", "target"].includes(value.role))
    throw new Error("文档引用无效，请重新选择。");
  return value;
}

/** Native reference chips own removal, undo, persistence and submit serialization. */
export function officeInputSources(office: OfficeClient, currentSession: () => string | undefined, presentationAvailable=false,spreadsheetAvailable=false): InputTriggerSource[] {
  return [{
    trigger: "/", name: outputSourceName, order: -20,
    candidates: async (_session, req) => {
      if (req.position !== "leading") return [];
      const query = req.query.toLowerCase();
      if (query && !"office".startsWith(query) && !query.startsWith("office")) return [];
      const filter = "office".startsWith(query) ? "" : query.replace(/^office[.\s]*/, "");
      return officeTypes.filter(([id])=>id!=="canvas"&&id!=="base").filter(([id, label]) => !filter || id.includes(filter) || label.toLowerCase().includes(filter)).map(([id, label, live]) => ({
        name: `office.${id}`, value: id, section: "/office · 选择输出类型",
        description: `${label} · 新建${(live || id === "ppt" && presentationAvailable || id === "excel" && spreadsheetAvailable) ? " · 支持实时写作" : " · 实时编辑待接入"}`,
        icon: "file" as const,
      }));
    },
    onPick: ({candidate}) => {
      const [id, label] = outputType(candidate.value ?? "");
      return {insert: {source: outputSourceName, ref: id, label: `${label} · 新建`, appearance: "file", clipboardText: `/office.${id}`}};
    },
    lexicon: () => officeTypes.filter(([id])=>id!=="canvas"&&id!=="base").map(([id]) => `office.${id}`),
    codec: {
      clipboardText: ref => `/office.${outputType(ref)[0]}`,
      serialize: async (ref, signal) => {
        signal.throwIfAborted();
        const [id, label, live] = outputType(ref);
        return `\n[用户选择的 Office 输出意图]\n${JSON.stringify({version: 1, outputType: id, label, defaultAction: "create", targetRequired: false, liveEditingAvailable: live || id === "ppt" && presentationAvailable || id === "excel" && spreadsheetAvailable})}\n没有明确标注为 target 的文档引用时，创建新文档；reference 引用仅作资料，保留原件。明确 target 时修改该对象，多个 target 或冲突输出类型需先澄清。Word 使用 content_open/content_read/content_edit/content_present，创建后立即打开右侧，分批写入。PPT 使用 content_open 的 kind:"presentation"、source:"new"，立即创建右侧原生编辑器；用 presentation.insertSlides/updateSlide 分批制作，不用 Word 替代，PPTX 在右侧下载。Excel 使用 content_open 的 kind:"spreadsheet"、source:"new"；使用 spreadsheet.setCells/clearCells/addSheet/renameSheet/removeSheet 修改单元格与工作表，完成后 content_export 交付 XLSX。PDF 使用 content_open 的 kind:"pdf"、source:"new" 打开右侧真实 PDF 预览，使用 pdf.insertPage/updatePage/removePage 按页更新，最后 content_export 交付 PDF。HTML 使用 kind:"html"、source:"new" 打开实时预览，以 html.replaceDocument 分批提交完整 HTML 并保留样式，最后 content_export 交付 HTML。其余类型实时适配尚未完成，不得当作 Word 创建或宣称右侧实时编辑已支持；按所选类型生成可用文件，能力不足明确说明。\n`;
      },
    },
  }, {
    trigger: "@", name: documentSourceName, order: -20,
    candidates: async (session, req) => {
      const docs = await office.list(String(session.sessionId), req.signal);
      return docs.filter(doc => doc.title.toLowerCase().includes(req.query.toLowerCase())).flatMap(doc => [
        {name: `${doc.title} · 参考资料`, description: "生成新文档时参考，保留原文档", section: "Office 工作副本 · 参考", icon: "file" as const, value: encode({sessionId: session.sessionId, documentId: doc.documentId, role: "reference"})},
        {name: `${doc.title} · 修改此文档`, description: "明确选为修改对象", section: "Office 工作副本 · 修改", icon: "file" as const, value: encode({sessionId: session.sessionId, documentId: doc.documentId, role: "target"})},
      ]);
    },
    onPick: ({candidate, session}) => {
      const ref = candidate.value ?? "", value = documentRef(ref);
      if (value.sessionId !== String(session.sessionId)) throw new Error("引用不属于当前任务。" );
      return {insert: {source: documentSourceName, ref, label: candidate.name, appearance: "file", clipboardText: `@office(${ref})`}};
    },
    codec: {
      clipboardText: ref => {documentRef(ref); return `@office(${ref})`;},
      serialize: async (ref, signal) => {
        const value = documentRef(ref);
        if (value.sessionId !== currentSession()) throw new Error("任务已切换，请在当前任务重新选择文档引用。");
        const docs = await office.list(value.sessionId, signal);
        const doc = docs.find(item => item.documentId === value.documentId);
        if (!doc) throw new Error("文档已删除或无权访问，请重新选择引用。");
        return `\n[用户选择的 Office 文档引用]\n${JSON.stringify({...value, title: doc.title,kind:doc.kind??"document"})}\n${value.role === "target" ? "这是明确的修改对象。读取最新修订后修改，并打开右侧；不要另建同名文档。" : "仅作参考资料。用 content_read 读取此 documentId，生成新文档，禁止修改参考原件。"}\n`;
      },
    },
  }];
}
