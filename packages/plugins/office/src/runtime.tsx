/**
 * Office lazy runtime artifact.
 *
 * Every editor implementation too heavy for the startup bundle lives here: the
 * native PPTX viewer, Univer sheets, PDF.js, DOCX preview and the Tiptap live
 * editing stack. The Host serves the built artifact from `dist`, and the client
 * shell injects it as the page-local module `workdsh-office-runtime` when a
 * document is first opened. Keep this module free of Host-only imports: it is
 * bundled for the browser and materialized through the official module table.
 */
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { downloadPdf } from "./pdf/download.js";
import { downloadHtml } from "./html/preview.js";
import { documentDocx, downloadDocument } from "./live/docx.js";
import { downloadSpreadsheet } from "./spreadsheet/xlsx.js";
import { mountSpreadsheetEditor } from "./spreadsheet/DriveEditor.js";
import { createDocumentModel, createEditingCommands, readControls } from "./live/model.js";
import { Toolbar } from "./live/Toolbar.js";
import { createPresentationModel } from "./presentation/client-model.js";
import { OfficeDocument } from "./OfficeDocument.js";
import { CsvDocument } from "./csv/CsvDocument.js";
import { DocumentPage } from "./live/DocumentPage.js";
import { renderAsync } from "docx-preview";
import { Editor } from "@tiptap/core";
import { mountPptx } from "./presentation/native-react/editor.js";
import nativeCss from "./presentation/native-react/native.css";
import ribbonCss from "./presentation/native-react/ribbon.css";
import { documentDiff, editorBlocks, editorContent } from "./live/adapter.js";
import { documentExtensions } from "./live/extensions.js";
import { importDocx } from "./live/import-docx.js";
import { officeCss } from "./live/style.js";
import type { OfficeClient } from "./live/model.js";
import type { ToolbarModel } from "./live/Toolbar.js";
import type {
  OfficeBlock,
  OfficeBlockInput,
  OfficeContentSnapshot,
  OfficeDocumentState,
  OfficeSnapshot,
} from "workdsh-contracts/office";
import type { LibraryOriginalPreviewInput } from "workdsh-contracts/library";
import type { DriveEditorHandle, DriveEditorInput } from "workdsh-contracts/drive";

export { OfficeDocument, CsvDocument, DocumentPage, createDocumentModel, createPresentationModel };

/** Export a committed working copy through the format-specific exporter. */
export async function downloadOriginal(
  office: OfficeClient,
  sessionId: string,
  snapshot: OfficeContentSnapshot,
): Promise<void> {
  if (snapshot.kind === "pdf") await downloadPdf(office, sessionId, snapshot);
  else if (snapshot.kind === "html") downloadHtml(snapshot);
  else if (snapshot.kind === "spreadsheet") await downloadSpreadsheet(snapshot);
  else if (snapshot.kind === "document") await downloadDocument(snapshot);
  else throw new Error("请在 PPT 编辑器中下载此演示文稿。");
}

/**
 * Mount the original-file viewer Library asked Office to provide. Both branches
 * carry their dependents (docx-preview, the native PPTX viewer), which is why
 * this lives in the lazy artifact rather than the plugin bundle.
 */
export async function mountOriginalPreview(
  target: HTMLElement,
  input: LibraryOriginalPreviewInput,
): Promise<() => void> {
  target.replaceChildren();
  if (input.kind === "docx") {
    const style = document.createElement("style");
    style.textContent =
      ".docx-wrapper{background:#e9ecf1!important;padding:24px!important;min-height:100%;box-sizing:border-box}.docx-wrapper>section.docx{width:min(816px,calc(100% - 20px))!important;min-height:1056px!important;margin:0 auto 20px!important;padding:72px 80px!important;box-sizing:border-box!important;box-shadow:0 2px 14px #0003}.docx-wrapper table{width:100%!important;table-layout:auto!important}.docx-wrapper td,.docx-wrapper th{min-width:72px!important;word-break:normal!important;overflow-wrap:break-word!important;white-space:normal!important}.docx-wrapper p{word-break:normal!important;overflow-wrap:break-word!important}";
    target.append(style);
    const host = document.createElement("div");
    host.style.cssText = "height:100%;overflow:auto;background:#e9ecf1";
    target.append(host);
    await renderAsync(input.bytes.slice().buffer, host, undefined, { renderAltChunks: false });
    return () => target.replaceChildren();
  }
  const style = document.createElement("style");
  style.textContent = nativeCss + ribbonCss;
  target.append(style);
  const host = document.createElement("div");
  host.className = "workdsh-ppt-editor";
  host.style.cssText = "height:100%;overflow:hidden";
  target.append(host);
  const editor = await mountPptx(host, input.bytes, input.name, () => undefined, () => undefined);
  return () => {
    editor.dispose();
    target.replaceChildren();
  };
}

/**
 * 导入结果只带语义块，没有编辑标识：本地补齐 blockId/runId，
 * 才能同时喂给 Tiptap 内容构建和 DOCX 导出器。
 */
function importedState(blocks: readonly OfficeBlockInput[]): OfficeDocumentState {
  const blockIds: string[] = [];
  const byId: Record<string, OfficeBlock> = {};
  blocks.forEach((block, index) => {
    const blockId = `b${index}`;
    blockIds.push(blockId);
    byId[blockId] = {
      ...block,
      blockId,
      runs: block.runs.map((run, runIndex) => ({ ...run, runId: `${blockId}-r${runIndex}` })),
    };
  });
  return { modelVersion: 1, blockIds, blocks: byId };
}

/**
 * Sessionless editors for external file owners such as the drive plugin.
 * The owner keeps the bytes and the revision graph: these editors import a copy,
 * let the user edit, and return new bytes on save. They never talk to the Host,
 * hold a lease, or write the owner's file — so a stale copy can only be
 * rejected by the owner's own revision check, never silently overwrite it.
 */
export async function mountDriveEditor(
  target: HTMLElement,
  input: DriveEditorInput,
): Promise<DriveEditorHandle> {
  const name = input.name.toLowerCase();
  if (name.endsWith(".xlsx")) return mountSpreadsheetEditor(target, input);
  if (name.endsWith(".pptx")) return mountDrivePresentation(target, input);
  return mountDriveDocument(target, input);
}

/** The slice of `PowerPointViewerHandle` this bridge relies on (matching 3.16.5). */
type PptxApi = {
  isDirty?: () => boolean;
  getContent?: () => Promise<Uint8Array>;
  getSlideCount?: () => number;
  getSlide?: (index: number) => unknown;
};

/** Same dirty signal the live editor uses: every slide's serialized state. */
function pptxSignature(api: PptxApi): string | undefined {
  if (!api.getSlide || !api.getSlideCount) return undefined;
  const count = api.getSlideCount();
  if (!count) return undefined;
  return JSON.stringify(Array.from({ length: count }, (_, index) => api.getSlide!(index)));
}

const pptxReadyTimeout = 15_000;

/**
 * The viewer parses asynchronously after `mountPptx` returns, so saving must
 * wait for a parsed deck instead of handing the owner an empty buffer.
 */
async function readyPptx(api: () => PptxApi | undefined): Promise<PptxApi> {
  const deadline = Date.now() + pptxReadyTimeout;
  for (;;) {
    const current = api();
    if (current?.getSlideCount?.()) return current;
    if (Date.now() > deadline)
      throw new Error("演示文稿编辑器尚未就绪或该版本不支持导出，无法保存。");
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

/**
 * Sessionless PPTX editor: `pptx-react-viewer` keeps its own OOXML document and
 * exposes `getContent()`; editing happens in place, so saving only needs to
 * wait for the deck and take the serialized package.
 */
async function mountDrivePresentation(
  target: HTMLElement,
  input: DriveEditorInput,
): Promise<DriveEditorHandle> {
  const style = document.createElement("style");
  style.textContent = nativeCss + ribbonCss;
  const host = document.createElement("div");
  host.className = "workdsh-ppt-editor";
  host.style.cssText = "height:100%;min-height:0;overflow:hidden";
  target.replaceChildren(style, host);
  const editor = await mountPptx(host, input.bytes, input.name, () => undefined, () => undefined);
  const api = () => editor.api() as PptxApi | undefined;
  // `isDirty()` 在导出内容后不会复位，只能靠内容签名判断是否真的有新修改；
  // 解析完成后记录原始签名，作为「已保存」基线。
  let savedSignature: string | undefined;
  let pendingSignature: string | undefined;
  void readyPptx(api)
    .then(current => {
      if (savedSignature === undefined && pendingSignature === undefined) savedSignature = pptxSignature(current);
    })
    .catch(() => undefined);
  let disposed = false;
  return {
    async save() {
      if (disposed) return undefined;
      const current = await readyPptx(api);
      if (!current.getContent)
        throw new Error("演示文稿编辑器尚未就绪或该版本不支持导出，无法保存。");
      const signature = pptxSignature(current);
      if (signature !== undefined && signature === savedSignature) return undefined;
      if (signature === undefined && current.isDirty?.() === false) return undefined;
      pendingSignature = signature;
      return new Uint8Array(await current.getContent());
    },
    acknowledge() {
      if (pendingSignature === undefined) return;
      savedSignature = pendingSignature;
      pendingSignature = undefined;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      editor.dispose();
      target.replaceChildren();
    },
  };
}

/** 网盘文档工具栏：与实时编辑器共用同一套命令，缩放只作用于纸张。 */
function DriveDocumentToolbar({
  model,
  paper,
}: {
  model: ToolbarModel;
  paper: HTMLElement;
}) {
  const [zoom, setZoom] = useState(100);
  return (
    <Toolbar
      model={model}
      disabled={false}
      zoom={zoom}
      setZoom={value => {
        setZoom(value);
        paper.style.zoom = String(value / 100);
      }}
    />
  );
}

/** Sessionless DOCX editor. */
async function mountDriveDocument(
  target: HTMLElement,
  input: DriveEditorInput,
): Promise<DriveEditorHandle> {
  const imported = await importDocx(input.bytes, input.name);
  // 已保存基线只随网盘的 acknowledge 推进，提交失败后的重试仍会导出字节。
  let baseline = importedState(imported.blocks);
  let pending: OfficeDocumentState | undefined;
  let disposed = false;
  const style = document.createElement("style");
  style.textContent = officeCss;
  const shell = document.createElement("div");
  shell.className = "wd-office-live";
  const tools = document.createElement("div");
  tools.style.cssText = "flex:0 0 auto;min-width:0";
  const scroll = document.createElement("div");
  scroll.className = "wd-office-paper-scroll";
  const paper = document.createElement("div");
  paper.className = "wd-office-paper";
  const mount = document.createElement("div");
  paper.append(mount);
  scroll.append(paper);
  shell.append(tools, scroll);
  target.replaceChildren(style, shell);
  const editor = new Editor({
    element: mount,
    editable: true,
    content: editorContent(baseline),
    extensions: documentExtensions(),
    editorProps: { attributes: { "aria-label": "文档正文", class: "wd-office-writing" } },
  });
  /** 工具栏状态：光标或内容变化后重新读取，并通知工具栏重渲染。 */
  let toolbarState = { controls: readControls(editor) };
  const listeners = new Set<() => void>();
  const refreshControls = () => {
    if (disposed) return;
    toolbarState = { controls: readControls(editor) };
    listeners.forEach(listener => listener());
  };
  editor.on("transaction", refreshControls);
  editor.on("selectionUpdate", refreshControls);
  const model: ToolbarModel = {
    ...createEditingCommands(
      { current: editor },
      {
        canEdit: () => !disposed,
        composing: () => false,
        problem: () => undefined,
      },
    ),
    getSnapshot: () => toolbarState,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  const bar = createRoot(tools);
  bar.render(<DriveDocumentToolbar model={model} paper={paper} />);
  /** 当前编辑内容转换成比较与导出共用的文档状态。 */
  const toState = (json: ReturnType<typeof editor.getJSON>): OfficeDocumentState => {
    const blocks = editorBlocks(json).map(({ blockId, runs, ...block }) => ({
      ...block,
      blockId,
      runs: runs.map((run, index) => ({ ...run, runId: `${blockId}-r${index}` })),
    }));
    return {
      modelVersion: 1,
      blockIds: blocks.map(block => block.blockId),
      blocks: Object.fromEntries(blocks.map(block => [block.blockId, block])),
    };
  };
  return {
    async save() {
      if (disposed) return undefined;
      const json = editor.getJSON();
      if (!documentDiff(baseline, json).length) return undefined;
      const state = toState(json);
      pending = state;
      const snapshot: OfficeSnapshot = {
        documentId: input.fileId,
        kind: "document",
        title: input.name,
        revision: 0,
        generation: input.revisionId,
        state,
      };
      return new Uint8Array(await (await documentDocx(snapshot)).arrayBuffer());
    },
    acknowledge() {
      if (!pending) return;
      baseline = pending;
      pending = undefined;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      bar.unmount();
      listeners.clear();
      editor.destroy();
      target.replaceChildren();
    },
  };
}
