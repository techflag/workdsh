import ExcelJS from 'exceljs';
import JSZip from 'jszip';

export async function importWorkbook(bytes) {
  const zip = await JSZip.loadAsync(bytes);
  const unsupported = Object.keys(zip.files).filter(path => /^xl\/(charts|drawings|pivotTables|pivotCache|externalLinks|slicerCaches|embeddings)\//.test(path) && !zip.files[path].dir);
  const workbook = new ExcelJS.Workbook();
  // ExcelJS cannot reconcile some chart-only drawing parts (e.g. openpyxl).
  // Parse a transient copy without unsupported drawing references. The original
  // package is untouched and its unsupported list still prohibits lossy export.
  let parsingBytes = bytes;
  if (unsupported.some(path => /^xl\/(charts|drawings)\//.test(path))) {
    for (const name of Object.keys(zip.files)) {
      if (/^xl\/(charts|drawings)\//.test(name)) { zip.remove(name); continue; }
      if (!(name.endsWith('.rels') || /^xl\/worksheets\/[^/]+\.xml$/.test(name) || name === '[Content_Types].xml')) continue;
      const xml = await zip.file(name).async('string');
      const doc = new DOMParser().parseFromString(xml, 'application/xml');
      if (doc.getElementsByTagName('parsererror').length) throw new Error('Excel 文件包含损坏的 XML。');
      let changed = false;
      for (const node of Array.from(doc.getElementsByTagName('*'))) {
        const remove = node.localName === 'drawing' ||
          (node.localName === 'Relationship' && /\/(drawing|chart)$/.test(node.getAttribute('Type') ?? '')) ||
          (node.localName === 'Override' && /^\/xl\/(charts|drawings)\//.test(node.getAttribute('PartName') ?? ''));
        if (remove) { node.parentNode.removeChild(node); changed = true; }
      }
      if (changed) zip.file(name, new XMLSerializer().serializeToString(doc));
    }
    parsingBytes = await zip.generateAsync({ type: 'uint8array' });
  }
  await workbook.xlsx.load(parsingBytes);
  const sheets = {};
  const sheetOrder = [];
  workbook.eachSheet(sheet => {
    const id = String(sheet.id);
    sheetOrder.push(id);
    const cellData = {};
    sheet.eachRow((row, r) => row.eachCell({ includeEmpty: false }, (cell, c) => {
      let value = cell.value;
      if (value?.richText) value = value.richText.map(run => run.text).join('');
      if (value instanceof Date) value = (value.getTime() - Date.UTC(1899, 11, 30)) / 86400000;
      if (value?.hyperlink) value = value.text;
      const formula = cell.formula;
      if (formula) value = cell.result ?? null;
      if (typeof value === 'object' && value !== null) value = value.error ?? String(value);
      const data = { v: value ?? null };
      if (formula) data.f = '=' + formula;
      if (typeof value === 'string') data.t = 1;
      if (typeof value === 'number') data.t = 2;
      if (typeof value === 'boolean') data.t = 3;
      (cellData[r - 1] ??= {})[c - 1] = data;
    }));
    sheets[id] = { id, name: sheet.name, rowCount: Math.max(100, sheet.rowCount + 20), columnCount: Math.max(26, sheet.columnCount + 5), cellData };
  });
  const snapshot = { id: 'browser-workbook', name: 'Workbook', appVersion: '0.25.1', locale: 'zhCN', sheetOrder, sheets };
  return { workbook, snapshot, unsupported, baseline: structuredClone(snapshot) };
}

// This candidate intentionally keeps the original ExcelJS model, rather than rebuilding
// every worksheet from visible cells. Unsupported package parts prohibit export.
export async function exportWorkbook(imported, snapshot) {
  if (imported.unsupported.length) throw new Error('包含图表、绘图或其他未支持对象，已阻止可能丢失内容的导出。');
  if (JSON.stringify(snapshot.sheetOrder) !== JSON.stringify(imported.baseline.sheetOrder)) throw new Error('示例暂不支持工作表新增、删除或重新排序后的导出。');
  for (const id of snapshot.sheetOrder) {
    const target = imported.workbook.getWorksheet(Number(id));
    const sheet = snapshot.sheets[id];
    if (!target || sheet.name !== imported.baseline.sheets[id].name) throw new Error('示例暂不支持工作表重命名后的导出。');
    const { cellData: currentCells, ...currentStructure } = sheet;
    const { cellData: baselineCells, ...baselineStructure } = imported.baseline.sheets[id];
    if (JSON.stringify(currentStructure) !== JSON.stringify(baselineStructure)) throw new Error('示例暂不支持工作表结构更改后的导出。');
    const rows = new Set([...Object.keys(imported.baseline.sheets[id].cellData), ...Object.keys(sheet.cellData ?? {})]);
    for (const r of rows) {
      const cols = new Set([...Object.keys(imported.baseline.sheets[id].cellData[r] ?? {}), ...Object.keys(sheet.cellData?.[r] ?? {})]);
      for (const c of cols) {
        const current = sheet.cellData?.[r]?.[c];
        const previous = imported.baseline.sheets[id].cellData[r]?.[c];
        if (JSON.stringify(current) === JSON.stringify(previous)) continue;
        const allowed = new Set(['v', 'f', 't']);
        const metadata = item => Object.fromEntries(Object.entries(item ?? {}).filter(([key]) => !allowed.has(key)));
        if (JSON.stringify(metadata(current)) !== JSON.stringify(metadata(previous))) throw new Error('示例暂不支持格式或富文本更改后的导出。');
        const cell = target.getCell(Number(r) + 1, Number(c) + 1);
        cell.value = current?.f ? { formula: current.f.replace(/^=/, ''), result: current.v ?? undefined } : current?.v ?? null;
      }
    }
  }
  imported.workbook.eachSheet(sheet => sheet.eachRow(row => row.eachCell(cell => {
    if (cell.formula) cell.value = { formula: cell.formula };
  })));
  imported.workbook.calcProperties.fullCalcOnLoad = true;
  return imported.workbook.xlsx.writeBuffer();
}
