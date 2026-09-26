import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets';
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';
import ZhCN from '@univerjs/preset-sheets-core/locales/zh-CN';
import '@univerjs/preset-sheets-core/lib/index.css';
import JSZip from 'jszip';
import { renderAsync } from 'docx-preview';
import { openTextParts, saveTextParts } from './ooxml.js';
import { importWorkbook, exportWorkbook } from './excel-adapter.js';
import './editor.css';
let imported: any;
let active: any;
let kind: string;
let textParts: Awaited<ReturnType<typeof openTextParts>>;
let excel: ReturnType<typeof createUniver> | undefined;
const edits = new Map<string, string>();
function fitPages() {
  if (kind === 'docx') {
    for (const page of preview.querySelectorAll<HTMLElement>('section.docx')) {
      page.style.zoom = '1';
      page.style.zoom = String(Math.min(1, Math.max(0.1, (preview.clientWidth - 32) / page.offsetWidth)));
    }
  }
}

const status = document.getElementById('status')!;
const preview = document.getElementById('preview')!;
const fields = document.getElementById('fields')!;
const save = document.getElementById('save') as HTMLButtonElement;
const update = document.getElementById('update') as HTMLButtonElement;
const edit = document.getElementById('edit') as HTMLButtonElement;
edit.onclick = () => {
  fields.hidden = !fields.hidden; update.hidden = fields.hidden;
  edit.setAttribute('aria-expanded', String(!fields.hidden));
  edit.textContent = fields.hidden ? '编辑文字' : '收起编辑';
};
new ResizeObserver(fitPages).observe(preview);
const info = document.getElementById('info') as HTMLButtonElement;
info.onclick = () => {
  const expanded = info.getAttribute('aria-expanded') !== 'true';
  info.setAttribute('aria-expanded', String(expanded));
  info.closest('header')!.classList.toggle('expanded', expanded);
};
new MutationObserver(() => { status.title = status.textContent ?? ''; }).observe(status, { childList: true });

async function bytesForExport() {
  if (kind === 'xlsx') return new Uint8Array(await exportWorkbook(imported, active.save()));
  return saveTextParts(textParts, edits);
}
async function renderText(bytes: Uint8Array) {
  preview.replaceChildren();
  if (kind === 'docx') await renderAsync(bytes.slice().buffer, preview, undefined, { renderAltChunks: false });

  fitPages();
}
async function open(bytes: Uint8Array, extension: string) {
  if (!['xlsx', 'docx'].includes(extension)) throw new Error('此兼容预览仅支持 .xlsx、.docx。');
  if (bytes.length > 10 * 1024 * 1024) throw new Error('当前文件上限 10 MB。');
  kind = extension; preview.dataset.kind = kind; edits.clear(); save.disabled = true;
  edit.hidden = kind === 'xlsx'; edit.textContent = '编辑文字'; edit.setAttribute('aria-expanded', 'false');
  if (excel) { excel.univer.dispose(); excel = undefined; }
  preview.replaceChildren(); fields.replaceChildren();
  if (kind === 'xlsx') {
    fields.hidden = true; update.hidden = true;
    imported = await importWorkbook(bytes);
    excel = createUniver({ locale: LocaleType.ZH_CN, locales: { [LocaleType.ZH_CN]: mergeLocales(ZhCN) }, presets: [UniverSheetsCorePreset({ container: preview, ribbonType: 'classic', formula: { initialFormulaComputing: 0 } })] });
    active = excel.univerAPI.createWorkbook(imported.snapshot);
    imported.baseline = structuredClone(active.save());
    save.disabled = !!imported.unsupported.length;
    status.textContent = imported.unsupported.length ? 'Excel 可编辑单元格；原生图表尚未显示，含未支持对象的文件禁止导出。' : 'Excel 支持单元格值和普通公式导出；暂不支持结构或格式更改后的导出。';
  } else {
    fields.hidden = true; update.hidden = true;
    textParts = await openTextParts(bytes, kind);
    for (const part of textParts.parts) {
      const section = document.createElement('section');
      const heading = document.createElement('h3'); heading.textContent = '正文文字片段'; section.append(heading);
      part.nodes.forEach((node, index) => {
        if (!node.textContent?.trim()) return;
        const label = document.createElement('label'); label.textContent = '文字 ' + (index + 1);
        const input = document.createElement('textarea'); input.value = node.textContent; input.dataset.key = part.name + ':' + index;
        input.addEventListener('input', () => { edits.set(input.dataset.key!, input.value); status.textContent = '文字已修改；点击更新预览查看效果，或导出副本。'; });
        label.append(input); section.append(label);
      });
      fields.append(section);
    }
    await renderText(bytes); save.disabled = false;
    status.textContent = kind === 'docx' ? 'Word 支持浏览器预览和正文文字片段编辑；不支持完整排版编辑。' : 'PPT 支持浏览器预览和幻灯片文字片段编辑；不支持完整布局编辑。';
  }
}
update.onclick = async () => { try { await renderText(await bytesForExport()); status.textContent = '预览已更新。'; } catch (error) { status.textContent = String(error); } };
save.onclick = async () => {
  try {
    const bytes = await bytesForExport(); const url = URL.createObjectURL(new Blob([bytes]));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'edited.' + kind; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000); status.textContent = '已导出副本，原件未覆盖。';
  } catch (error) { status.textContent = String(error); }
};
window.addEventListener('message', event => {
  if (event.source !== parent || event.data?.type !== 'workdsh-office-open') return;
  open(event.data.bytes, event.data.extension).catch(error => { status.textContent = String(error); save.disabled = true; });
});
parent.postMessage({ type: 'workdsh-office-ready' }, '*');
