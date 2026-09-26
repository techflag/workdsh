import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {mkdtemp, mkdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const req = createRequire(resolve('packages/plugins/office/package.json')), temp = await mkdtemp(join(tmpdir(), 'office-csv-'));
after(() => rm(temp, {recursive: true, force: true}));
await build({stdin: {resolveDir: resolve('.'), contents: "export * from './packages/plugins/office/src/csv/csv.ts';"}, bundle: true, platform: 'node', format: 'esm', outfile: join(temp, 'csv.mjs')});
const {decodeCsvBytes, parseCsv, csvLimits} = await import(pathToFileURL(join(temp, 'csv.mjs')));
const bytes = array => Uint8Array.from(array);
test('CSV decoding sniffs real-world encodings and parsing follows RFC 4180 within hard limits', () => {
 assert.deepEqual(csvLimits, {rows: 1500, columns: 120, cells: 24000});
 assert.deepEqual(decodeCsvBytes(bytes([0xef, 0xbb, 0xbf, 0x61, 0x2c, 0x62])), {text: 'a,b', encoding: 'utf-8', binary: false});
 assert.deepEqual(decodeCsvBytes(bytes([0xff, 0xfe, 0x22, 0x8d, 0xa1, 0x52])), {text: '财务', encoding: 'utf-16le', binary: false});
 assert.deepEqual(decodeCsvBytes(bytes([0xb2, 0xc6, 0xce, 0xf1, 0x2c, 0x41])), {text: '财务,A', encoding: 'gb18030', binary: false});
 assert.equal(decodeCsvBytes(bytes([0x41, 0x00, 0x42])).binary, true);
 const simple = parseCsv('a,b\n1,2\n');
 assert.deepEqual([simple.header, simple.rows, simple.columns, simple.delimiter, simple.truncatedRows], [['a', 'b'], [['1', '2']], 2, ',', false]);
 const quoted = parseCsv('x,y\n"a,b","c""d"\n"line1\nline2",z\n');
 assert.deepEqual(quoted.rows, [['a,b', 'c"d'], ['line1\nline2', 'z']]);
 assert.equal(parseCsv('a;b\n1;2\n').delimiter, ';');
 assert.equal(parseCsv('a\tb\n1\t2').delimiter, '\t');
 assert.equal(parseCsv('only one column').columns, 1);
 // Blank lines are skipped without leaking their whitespace into the next field; CR-only files still break rows.
 assert.deepEqual(parseCsv('a,b\n  \n1,2\n').rows, [['1', '2']]);
 assert.deepEqual(parseCsv('a,b\r1,2\r').rows, [['1', '2']]);
 const limit = {rows: 2, columns: 2, cells: 100};
 assert.deepEqual(parseCsv('a,b\n1,2\n', limit).truncatedRows, false, 'a file ending exactly at the limit is complete');
 assert.deepEqual(parseCsv('a,b\n1,2\n3,4\n', limit).truncatedRows, true);
 const wide = parseCsv('a,b,c\n1,2,3\n', limit);
 assert.equal(wide.columns, 2);
 assert.equal(wide.truncatedColumns, true);
 assert.deepEqual(wide.rows, [['1', '2']]);
 assert.equal(parseCsv('a,b\n1,2\n3,4\n', {rows: 10, columns: 10, cells: 4}).truncatedRows, true);
});
const fixture = [
 '单号,供应商,物料编码,物料名称,数量,单价,金额,交货日期,备注',
 'DN20260917001,深圳市华强电子科技集团股份有限公司宝安分公司采购中心,MAT-001,贴片电容 0402 100nF,500,0.12,60.00,2026-09-20,常规采购',
 'DN20260917001,深圳市华强电子科技集团股份有限公司宝安分公司采购中心,MAT-002,"贴片电阻 0603, 10kΩ",1000,0.05,50.00,2026-09-20,"含""加急""备注"',
 'DN20260917002,东莞市立讯精密,MAT-010,连接器 Type-C 16P,200,1.85,370.00,2026-09-25,',
 'DN20260917003,测试供应商,MAT-020,<img src=x onerror="window.leak=1">,1,1,1,2026-09-26,',
].join('\n');
test('CSV preview renders a sticky-header table, wraps on demand and reports truncation honestly', async () => {
 const bundle = await build({stdin: {resolveDir: resolve('.'), contents: `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {CsvDocument} from './packages/plugins/office/src/csv/CsvDocument.tsx';
const root = createRoot(document.getElementById('root'));
window.renderCsv = (bytes, wrap) => root.render(React.createElement(CsvDocument, {
  resourceAddress: '/workspace/2021040501_可导入数据.csv',
  content: {kind: 'bytes', data: Uint8Array.from(bytes)},
  wrap,
  scrollportRef: element => { window.scrollport = element; },
}));
`}, bundle: true, platform: 'browser', format: 'iife', write: false, loader: {'.css': 'text'}, define: {'process.env.NODE_ENV': '"production"'}, plugins: [{name: 'deps', setup(builder) { builder.onResolve({filter: /^(react(?:-dom)?)(?:\/.*)?$/}, args => ({path: req.resolve(args.path)})); }}]});
 const browser = await chromium.launch({headless: true});
 try {
  const errors = [];
  const page = await browser.newPage({viewport: {width: 420, height: 720}});
  page.on('pageerror', error => errors.push(error.message));
  await page.route('http://127.0.0.1:19099/', route => route.fulfill({contentType: 'text/html', body: '<!doctype html><style>html,body{margin:0;height:100%;background:#151517}#root{display:flex;flex-direction:column;height:100vh}</style><div id="root"></div>'}));
  await page.goto('http://127.0.0.1:19099/');
  await page.addScriptTag({content: bundle.outputFiles[0].text});
  const render = (text, wrap) => page.evaluate(([text, wrap]) => { window.bytes = [...new TextEncoder().encode(text)]; window.renderCsv(window.bytes, wrap); }, [text, wrap]);
  await render(fixture, false);
  const region = page.getByRole('region', {name: 'CSV 表格预览'});
  await region.waitFor();
  assert.equal(await page.evaluate(() => window.scrollport?.className), 'wd-csv-scroll', 'the renderer reports its own scrollport to the official owner');
  assert.equal(await page.evaluate(() => document.querySelector('.wd-csv-scroll').tabIndex), 0);
  assert.equal(await page.getByRole('columnheader', {name: '单号', exact: true}).count(), 1);
  assert.equal(await page.getByRole('rowheader').count(), 4);
  assert.equal(await page.getByRole('cell', {name: '贴片电阻 0603, 10kΩ', exact: true}).count(), 1, 'quoted commas stay inside one field');
  assert.equal(await page.getByRole('cell', {name: '含"加急"备注', exact: true}).count(), 1, 'doubled quotes unescape');
  assert.equal(await page.locator('.wd-csv-table img').count(), 0);
  assert.equal(await page.evaluate(() => window.leak), undefined, 'cell text is escaped, never markup');
  assert.equal(await page.getByRole('columnheader', {name: '单号', exact: true}).evaluate(el => getComputedStyle(el).position), 'sticky');
  assert.equal(await page.getByRole('rowheader', {name: '1', exact: true}).evaluate(el => [getComputedStyle(el).position, getComputedStyle(el).left].join(',')), 'sticky,0px');
  const amount = page.getByRole('cell', {name: '500', exact: true});
  assert.equal(await amount.evaluate(el => [el.classList.contains('wd-csv-num'), getComputedStyle(el).textAlign].join(',')), 'true,right');
  assert.equal(await amount.evaluate(el => getComputedStyle(el).color), await page.locator('section.wd-csv').evaluate(el => getComputedStyle(el).color), 'table text inherits the panel color even under legacy quirks rules');
  assert.ok((await page.locator('.wd-csv-status').textContent()).includes('9 列 × 4 行'));
  assert.ok((await page.locator('.wd-csv-status').textContent()).includes('逗号分隔'));
  const supplier = page.getByRole('cell', {name: /华强电子科技集团/}).first();
  assert.equal(await supplier.evaluate(el => el.scrollWidth > el.clientWidth), true, 'nowrap cells clip with an ellipsis instead of stretching the row');
  assert.ok(await supplier.evaluate(el => el.title.length > 20));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'the table scrolls inside the panel, not the page');
  assert.equal(await page.evaluate(() => document.querySelector('.wd-csv-scroll').scrollWidth > document.querySelector('.wd-csv-scroll').clientWidth), true);
  await mkdir('.test-runtime/office-csv-preview', {recursive: true});
  await page.screenshot({path: '.test-runtime/office-csv-preview/table-nowrap.png'});
  await render(fixture, true);
  assert.match(await page.locator('section.wd-csv').getAttribute('class'), /wrap/);
  assert.equal(await supplier.evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, 'wrapped cells stop clipping');
  assert.equal(await supplier.evaluate(el => el.offsetHeight > 20), true);
  await page.screenshot({path: '.test-runtime/office-csv-preview/table-wrap.png'});
  await render('a,b\n' + Array.from({length: 1504}, (_, index) => `${index},x`).join('\n'), false);
  assert.ok((await page.locator('.wd-csv-status').textContent()).includes('仅显示前 1499 行'), 'oversized files report the visible prefix');
  assert.equal(await page.getByRole('rowheader', {name: '1499', exact: true}).count(), 1);
  assert.equal(await page.getByRole('rowheader', {name: '1500', exact: true}).count(), 0);
  await render('', false);
  await page.getByText('CSV 文件中没有可显示的数据。').waitFor();
  assert.equal(await page.locator('.wd-csv-table').count(), 0);
  await render(String.fromCharCode(0x50, 0x4b, 3, 4, 0, 1), false);
  await page.getByText(/文件包含 NUL 字节/).waitFor();
  assert.deepEqual(errors, []);
 } finally {await browser.close();}
});
