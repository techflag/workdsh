import { chromium } from '@playwright/test';
import ExcelJS from '../examples/univer-browser-edit/node_modules/exceljs/excel.js';
import JSZip from '../examples/univer-browser-edit/node_modules/jszip/lib/index.js';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = path.resolve('examples/univer-browser-edit/dist');
const output = path.resolve('.artifacts/univer-browser-edit');
await mkdir(output, { recursive: true });
const source = new ExcelJS.Workbook();
const sheet = source.addWorksheet('销量');
sheet.addRow(['月份', '销量', '收入']); sheet.addRow(['六月', 10, { formula: 'B2*20', result: 200 }]);
sheet.getCell('B2').numFmt = '0.00';
source.addWorksheet('说明').getCell('A1').value = '原件保留';
const bytes = await source.xlsx.writeBuffer();
const browser = await chromium.launch({ headless: true });
try {
 const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
 const errors = []; page.on('pageerror', error => errors.push(error.message));
 // Static assets are served by Playwright interception; no HTTP server or Office converter.
 const unexpected = [];
 await page.route('**/*', async route => {
   const url = new URL(route.request().url());
   if (url.origin !== 'http://univer-probe.invalid') { unexpected.push(url.origin); return route.abort(); }
   const name = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
   const file = path.resolve(root, name);
   if (!file.startsWith(root + path.sep)) return route.abort();
   try { await route.fulfill({ body: await readFile(file), contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html' }); }
   catch { await route.fulfill({ status: 404, body: '' }); }
 });
 await page.goto('http://univer-probe.invalid/');
 await page.waitForFunction(() => window.probe);
 const opened = await page.evaluate(data => window.probe.open(data), Array.from(bytes));
 assert.equal(opened.sheets, 2);
 assert.equal(opened.unsupported.length, 0);
 await page.evaluate(() => window.probe.setCell('B2', 25));
 await page.waitForTimeout(300);
 const snapshot = await page.evaluate(() => window.probe.snapshot());
 assert.equal(snapshot.sheets[snapshot.sheetOrder[0]].cellData[1][1].v, 25);
 await page.mouse.dblclick(180, 325);
 await page.keyboard.press('ControlOrMeta+A');
 await page.keyboard.type('35');
 await page.keyboard.press('Enter');
 await page.waitForTimeout(300);
 const keyboardValue = await page.evaluate(() => { const s = window.probe.snapshot(); return s.sheets[s.sheetOrder[0]].cellData[1][1].v; });
 assert.equal(keyboardValue, 35);
 const exported = Buffer.from(await page.evaluate(() => window.probe.exportBytes()));
 const zip = await JSZip.loadAsync(exported);
 const xml = await zip.file('xl/worksheets/sheet1.xml').async('string');
 assert.match(xml, /<c\b[^>]*r="B2"[^>]*>[\s\S]*?<v>35<\/v>/);
 assert.match(xml, /<f>B2\*20<\/f>/);
 const reopened = new ExcelJS.Workbook(); await reopened.xlsx.load(exported);
 assert.equal(reopened.worksheets.length, 2);
 assert.equal(reopened.worksheets[0].getCell('B2').numFmt, '0.00');
 await writeFile(path.join(output, 'input.xlsx'), bytes);
 await writeFile(path.join(output, 'edited.xlsx'), exported);
 await page.screenshot({ path: path.join(output, 'editor.png') });
 // Detect chart parts before allowing lossy ExcelJS serialization; chart rendering remains absent.
 const chartZip = await JSZip.loadAsync(bytes);
 chartZip.file('xl/charts/chart1.xml', '<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"/>');
 const chartBytes = await chartZip.generateAsync({ type: 'uint8array' });
 const chartOpened = await page.evaluate(data => window.probe.open(data), Array.from(chartBytes));
 assert.ok(chartOpened.unsupported.includes('xl/charts/chart1.xml'));
 await assert.rejects(() => page.evaluate(() => window.probe.exportBytes()), /阻止/);
 assert.equal(await page.locator('#save').isDisabled(), true);
 assert.deepEqual(unexpected, []);
 assert.deepEqual(errors, []);
 const result = { browserEditing: 'passed via Univer Facade commands', browserImportExport: 'passed for fixture cell values and ordinary formula', worksheetCount: 2, originalNumberFormatRetained: true, chartExportGuard: 'passed using synthetic chart-part detection fixture; not chart fidelity', externalNetworkRequests: 0, officeConversionServer: false, uiKeyboardEditing: 'passed: double-click B2, type 35, Enter', chartRendering: 'not implemented', wordPpt: 'not implemented', harnessIntegration: 'not implemented' };
 await writeFile(path.join(output, 'result.json'), JSON.stringify(result, null, 2) + '\n');
 console.log(JSON.stringify(result, null, 2));
} finally { await browser.close(); }
