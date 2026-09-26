import { chromium } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const path = process.argv[2];
if (!path) throw new Error('Provide a read-only XLSX fixture path.');
const bytes = await readFile(path);
if(!path.endsWith('.docx'))throw new Error('PPT layout is covered by probe-office-pptx-native.mjs');
const kind='docx';
const hash = data => createHash('sha256').update(data).digest('hex');
const html = await readFile(new URL('../packages/plugins/office/dist/editor.html', import.meta.url), 'utf8');
const out = new URL('../.artifacts/office-layout-regression/', import.meta.url);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
 const page = await browser.newPage({ viewport: { width: Number(process.argv[3] ?? 700), height: 900 } });
 const errors = []; const requests = [];
 page.on('pageerror', e => errors.push(e.stack));
 await page.route('**/*', route => {
  if (route.request().url() === 'http://office-probe.invalid/') return route.fulfill({ contentType: 'text/html', body: '<iframe sandbox="allow-scripts allow-downloads" style="width:100%;height:95vh;border:0"></iframe>' });
  requests.push(route.request().url()); return route.abort();
 });
 await page.goto('http://office-probe.invalid/');
 await page.evaluate(({ html, bytes, kind }) => {
  const frame = document.querySelector('iframe');
  window.addEventListener('message', e => {
   if (e.source === frame.contentWindow && e.data?.type === 'workdsh-office-ready') frame.contentWindow.postMessage({ type: 'workdsh-office-open', bytes: new Uint8Array(bytes), extension: kind }, '*');
  }); frame.srcdoc = html;
 }, { html, bytes: Array.from(bytes), kind });
 const frame = page.frameLocator('iframe');
 await frame.locator('#status').filter({ hasText: kind === 'docx' ? 'Word 支持' : 'PPT 支持' }).waitFor({ timeout: 60000 });
 assert.equal(await frame.locator('#fields').isVisible(), false);
 const pages = await frame.locator('#preview').evaluate(el => ({ width: el.clientWidth, scrollWidth: el.scrollWidth, pageCount: el.querySelectorAll('section.docx').length, slides: el.querySelectorAll('.pptx-preview-slide-wrapper').length }));
 assert.ok(pages.scrollWidth <= pages.width + 2, JSON.stringify(pages));
 if (kind === 'docx') assert.ok(pages.pageCount > 1);
 await frame.getByRole('button', { name: '编辑文字' }).click();
 assert.equal(await frame.locator('#fields').isVisible(), true);
 await frame.getByRole('button', { name: '收起编辑' }).click();
 assert.equal(await frame.getByRole('button', { name: '导出副本' }).isEnabled(), true);
 assert.deepEqual(errors, []); assert.deepEqual(requests, []);
 assert.equal(hash(await readFile(path)), hash(bytes));
 await page.screenshot({ path: new URL(kind + '.png', out).pathname });
 const result = { preview: 'passed', kind, pages, editingCollapsedByDefault: true, originalUnchanged: true, browserErrors: errors, externalRequests: requests };
 await writeFile(new URL(kind + '-result.json', out), JSON.stringify(result, null, 2));
 console.log(JSON.stringify(result));
} finally { await browser.close(); }