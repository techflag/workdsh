import { chromium } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const path = process.argv[2];
if (!path) throw new Error('Provide a read-only XLSX fixture path.');
const bytes = await readFile(path);
const hash = data => createHash('sha256').update(data).digest('hex');
const html = await readFile(new URL('../packages/plugins/office/dist/editor.html', import.meta.url), 'utf8');
const out = new URL('../.artifacts/office-chart-regression/', import.meta.url);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
 const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
 const errors = []; const requests = [];
 page.on('pageerror', e => errors.push(e.message));
 await page.route('**/*', route => {
  if (route.request().url() === 'http://office-probe.invalid/') return route.fulfill({ contentType: 'text/html', body: '<iframe sandbox="allow-scripts allow-downloads" style="width:100%;height:95vh;border:0"></iframe>' });
  requests.push(route.request().url()); return route.abort();
 });
 await page.goto('http://office-probe.invalid/');
 await page.evaluate(({ html, bytes }) => {
  const frame = document.querySelector('iframe');
  window.addEventListener('message', e => {
   if (e.source === frame.contentWindow && e.data?.type === 'workdsh-office-ready') frame.contentWindow.postMessage({ type: 'workdsh-office-open', bytes: new Uint8Array(bytes), extension: 'xlsx' }, '*');
  }); frame.srcdoc = html;
 }, { html, bytes: Array.from(bytes) });
 const frame = page.frameLocator('iframe');
 await frame.locator('#status').filter({ hasText: '原生图表尚未显示' }).waitFor({ timeout: 60000 });
 await frame.locator('#preview canvas').first().waitFor();
 assert.equal(await frame.getByRole('button', { name: '导出副本' }).isDisabled(), true);
 assert.deepEqual(errors, []); assert.deepEqual(requests, []);
 assert.equal(hash(await readFile(path)), hash(bytes));
 await page.screenshot({ path: new URL('preview.png', out).pathname });
 const result = { preview: 'passed', lossyExportBlocked: true, originalUnchanged: true, browserErrors: errors, externalRequests: requests };
 await writeFile(new URL('result.json', out), JSON.stringify(result, null, 2));
 console.log(JSON.stringify(result));
} finally { await browser.close(); }
