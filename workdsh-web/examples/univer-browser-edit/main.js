import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets';
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';
import ZhCN from '@univerjs/preset-sheets-core/locales/zh-CN';
import '@univerjs/preset-sheets-core/lib/index.css';
import { importWorkbook, exportWorkbook } from './adapter.js';
const message = document.getElementById('message');
const save = document.getElementById('save');
let imported;
let active;
const { univerAPI } = createUniver({ locale: LocaleType.ZH_CN, locales: { [LocaleType.ZH_CN]: mergeLocales(ZhCN) }, presets: [UniverSheetsCorePreset({ container: 'editor' })] });
async function open(bytes) {
  const next = await importWorkbook(bytes);
  if (active) univerAPI.disposeUnit(active.getId());
  active = univerAPI.createWorkbook(next.snapshot);
  next.baseline = structuredClone(active.save());
  imported = next;
  save.disabled = !!next.unsupported.length;
  message.textContent = next.unsupported.length ? '已打开，可编辑；文件含未支持对象，不能导出。图表尚未显示。' : '已打开，可编辑单元格和普通公式。示例导出仅覆盖单元格值及公式。';
  return { sheets: next.snapshot.sheetOrder.length, unsupported: next.unsupported };
}
async function exportBytes() {
  if (!active || !imported) throw new Error('请先打开 Excel 文件。');
  return Array.from(new Uint8Array(await exportWorkbook(imported, active.save())));
}
document.getElementById('file').addEventListener('change', async event => {
  try {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) throw new Error('示例限制为 10 MB。');
    await open(await file.arrayBuffer());
  } catch (error) { message.textContent = error.message; save.disabled = true; }
});
save.addEventListener('click', async () => {
  try {
    const bytes = await exportBytes();
    const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const link = document.createElement('a'); link.href = url; link.download = 'edited.xlsx'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    message.textContent = '已导出 edited.xlsx，原文件保持不变。';
  } catch (error) { message.textContent = error.message; }
});
// Explicit probe-only API; it is not a Harness service or production contract.
window.probe = { open: data => open(new Uint8Array(data)), exportBytes, setCell: (address, value) => active.getActiveSheet().getRange(address).setValue(value), snapshot: () => active.save() };
