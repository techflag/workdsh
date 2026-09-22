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
import { downloadPdf } from "./pdf/download.js";
import { downloadHtml } from "./html/preview.js";
import { downloadDocument } from "./live/docx.js";
import { downloadSpreadsheet } from "./spreadsheet/xlsx.js";
import { createDocumentModel } from "./live/model.js";
import { createPresentationModel } from "./presentation/client-model.js";
import { OfficeDocument } from "./OfficeDocument.js";
import { CsvDocument } from "./csv/CsvDocument.js";
import { DocumentPage } from "./live/DocumentPage.js";
import { renderAsync } from "docx-preview";
import { mountPptx } from "./presentation/native-react/editor.js";
import nativeCss from "./presentation/native-react/native.css";
import ribbonCss from "./presentation/native-react/ribbon.css";
import type { OfficeClient } from "./live/model.js";
import type { OfficeContentSnapshot } from "workdsh-contracts/office";
import type { LibraryOriginalPreviewInput } from "workdsh-contracts/library";

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
