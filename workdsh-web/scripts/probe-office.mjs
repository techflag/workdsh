import { chromium } from '@playwright/test';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const office = createRequire(new URL('../packages/plugins/office/package.json', import.meta.url));
const ExcelJS = office('exceljs'); const JSZip = office('jszip');
const bundled = createRequire(new URL('../package.json', import.meta.url));
const { Document, Packer, Paragraph, TextRun } = bundled('docx');
const out = fileURLToPath(new URL('../.artifacts/office-integration/', import.meta.url)); await mkdir(out, { recursive: true });
const docx = await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph({ children: [new TextRun({ text: 'Office Word test', bold: true })] })] }] }));
const workbook = new ExcelJS.Workbook(); workbook.addWorksheet('Sheet1').getCell('A1').value = 'Office Excel test'; const xlsx = await workbook.xlsx.writeBuffer();
const html = await readFile(new URL('../packages/plugins/office/dist/editor.html', import.meta.url), 'utf8');
const browser = await chromium.launch({ headless: true });
const result = [];
try {
 for (const [kind, bytes] of Object.entries({ docx, xlsx })) {
  await writeFile(out + 'input.' + kind, bytes);
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = []; const external = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => { if (route.request().url() === 'http://office-probe.invalid/') return route.fulfill({ contentType: 'text/html', body: '<html><body style="margin:0"><iframe title="Office" sandbox="allow-scripts allow-downloads" style="width:100%;height:100vh;border:0"></iframe></body></html>' }); external.push(route.request().url()); return route.abort(); });
  await page.goto('http://office-probe.invalid/');
  await page.evaluate(({ html, bytes, kind }) => {
    const frame = document.querySelector('iframe');
    window.addEventListener('message', event => {
      if (event.source === frame.contentWindow && event.data?.type === 'workdsh-office-ready') frame.contentWindow.postMessage({ type: 'workdsh-office-open', bytes: new Uint8Array(bytes), extension: kind }, '*');
    }); frame.srcdoc = html;
  }, { html, bytes: Array.from(bytes), kind });
  const frame = page.frameLocator('iframe');
  await frame.getByRole('button', { name: '导出副本' }).waitFor();
  await frame.getByRole('button', { name: '导出副本' }).isEnabled();
  await frame.locator('#status').filter({ hasText: kind === 'xlsx' ? 'Excel 支持' : kind === 'docx' ? 'Word 支持' : 'PPT 支持' }).waitFor({ timeout: 30000 });
  if (kind !== 'xlsx') {
   await frame.getByRole('button', { name: '编辑文字' }).click();
   const text = frame.locator('textarea').first(); await text.fill('Edited ' + kind);
   await frame.getByRole('button', { name: '更新预览' }).click();
   await frame.locator('#status').filter({ hasText: '预览已更新' }).waitFor();
   assert.ok(await frame.locator('#preview').getByText('Edited ' + kind, { exact: false }).count());
  } else {
   await frame.locator('#preview canvas').first().waitFor();
  }
  const downloadPromise = page.waitForEvent('download');
  await frame.getByRole('button', { name: '导出副本' }).click();
  const download = await downloadPromise; await download.saveAs(out + 'edited.' + kind);
  const exported = await readFile(out + 'edited.' + kind);
  const original = await JSZip.loadAsync(bytes); const saved = await JSZip.loadAsync(exported);
  if (kind !== 'xlsx') {
   const target = kind === 'docx' ? 'word/document.xml' : 'ppt/slides/slide1.xml';
   assert.match(await saved.file(target).async('string'), new RegExp('Edited ' + kind));
   for (const name of Object.keys(original.files)) {
    if (original.files[name].dir || name === target) continue;
    assert.deepEqual(await saved.file(name).async('uint8array'), await original.file(name).async('uint8array'), name);
   }
  } else { const reopened = new ExcelJS.Workbook(); await reopened.xlsx.load(exported); assert.equal(reopened.worksheets[0].getCell('A1').value, 'Office Excel test'); }
  assert.deepEqual(external, []); assert.deepEqual(errors, []);
  await page.screenshot({ path: out + kind + '.png' });
  result.push({ kind, preview: 'passed', editing: kind === 'xlsx' ? 'covered separately by Univer browser edit probe' : 'text fragment edit and rerender passed', export: 'passed', unrelatedParts: kind === 'xlsx' ? 'not checked' : 'byte-identical', requests: external.length });
  await page.close();
 }
 await writeFile(out + 'result.json', JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2));
} finally { await browser.close(); }
