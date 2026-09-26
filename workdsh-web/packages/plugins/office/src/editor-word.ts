import { renderAsync } from "docx-preview";
import "./editor.css";

// Original-layout viewing only; text editing is owned by the native Tiptap working copy.
const preview = document.getElementById("preview")!;
const status = document.getElementById("status")!;
const save = document.getElementById("save") as HTMLButtonElement;
save.hidden = true;
function fit() {
  for (const page of preview.querySelectorAll<HTMLElement>("section.docx")) {
    page.style.zoom = "1";
    page.style.zoom = String(Math.min(1, Math.max(0.1, (preview.clientWidth - 32) / page.offsetWidth)));
  }
}
new ResizeObserver(fit).observe(preview);
window.addEventListener("message", async event => {
  if (event.source !== parent || event.data?.type !== "workdsh-office-open") return;
  try {
    if (event.data.extension !== "docx") throw new Error("此安装包仅支持 Word。其他文件适配器待后续发布。");
    const bytes = event.data.bytes;
    if (!(bytes instanceof Uint8Array) || bytes.length > 10 * 1024 * 1024) throw new Error("Word 文件无效或超过 10 MB。");
    preview.replaceChildren();
    preview.dataset.kind = "docx";
    await renderAsync(bytes.slice().buffer, preview, undefined, {renderAltChunks: false});
    status.textContent = "原始 Word 排版预览；编辑文字请切回文本工作副本。";
    fit();
  } catch (error) {status.textContent = String(error);}
});
parent.postMessage({type: "workdsh-office-ready"}, "*");
