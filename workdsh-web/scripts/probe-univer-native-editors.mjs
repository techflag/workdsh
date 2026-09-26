// Native SDK snapshot probe only: no DOCX/PPTX import claim or production hook.
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('../packages/plugins/office/', import.meta.url));
const out = fileURLToPath(new URL('../.artifacts/univer-native-editors/', import.meta.url));
await mkdir(out, { recursive: true });
const source = `
import { createUniver, LocaleType, UniverInstanceType } from '@univerjs/presets';
import { UniverDocsCorePreset } from '@univerjs/preset-docs-core';
import zhCN from '@univerjs/preset-docs-core/locales/zh-CN';
import '@univerjs/preset-docs-core/lib/index.css';
import '@univerjs/docs-ui/lib/facade';
import { UniverSlidesPlugin, PageType, PageElementType } from '@univerjs/slides';
import { UniverSlidesUIPlugin, SlideAddTextOperation } from '@univerjs/slides-ui';
import '@univerjs/slides-ui/lib/index.css';
window.start = (kind) => {
 const { univer, univerAPI } = createUniver({ locale: LocaleType.ZH_CN, locales: { [LocaleType.ZH_CN]: zhCN }, presets: [UniverDocsCorePreset({ container: 'editor', ribbonType: 'classic' })], plugins: kind === 'slides' ? [UniverSlidesPlugin, UniverSlidesUIPlugin] : [] });
 if (kind === 'docs') {
  const doc = univerAPI.createUniverDoc({ id: 'native-doc', title: 'Native SDK fixture', body: { dataStream: 'Native document fixture\\r\\n', paragraphs: [{ startIndex: 23 }] }, documentStyle: { pageSize: { width: 595, height: 842 }, marginTop: 40, marginBottom: 40, marginLeft: 40, marginRight: 40 } });
  window.readSnapshot = () => doc.getSnapshot();
  window.editSnapshot = () => doc.appendText(' Native edit confirmed');
  window.selectText = () => doc.setSelection(0, 0);
 } else {
  const slide = univer.createUnit(UniverInstanceType.UNIVER_SLIDE, { id: 'native-slide', title: 'Native SDK fixture', pageSize: { width: 960, height: 540 }, body: { pageOrder: ['page1'], pages: { page1: { id: 'page1', pageType: PageType.SLIDE, zIndex: 0, title: 'Page 1', description: '', pageBackgroundFill: { rgb: '#EAF0F8' }, pageElements: {} } } } });
  window.readSnapshot = () => slide.getSnapshot();
  window.editSnapshot = () => univerAPI.executeCommand(SlideAddTextOperation.id, { unitId: 'native-slide', text: 'Native slide edit confirmed' });
 }
 window.disposeEditor = () => univer.dispose();
};`;
const bundle = await build({ stdin: { contents: source, resolveDir: root, loader: 'ts' }, bundle: true, write: false, outdir: out, format: 'iife', platform: 'browser', target: 'es2022', loader: { '.woff': 'dataurl', '.woff2': 'dataurl', '.ttf': 'dataurl' }, define: { 'process.env.NODE_ENV': '"production"' } });
const js = bundle.outputFiles.find(f => f.path.endsWith('.js')).text.replace(/<\/script/gi, '<\\/script');
const css = bundle.outputFiles.find(f => f.path.endsWith('.css'))?.text ?? '';
const html = `<!doctype html><meta charset="utf-8"><style>html,body,#editor{margin:0;width:100%;height:100%;overflow:hidden}${css}</style><div id="editor"></div><script>${js}</script>`;
await writeFile(out + 'probe.html', html);
const browser = await chromium.launch({ headless: true });
const results = [];
try {
 for (const kind of ['docs', 'slides']) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errors = [], requests = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', route => { if (route.request().url() === 'http://native-editor.invalid/') return route.fulfill({ contentType: 'text/html', body: '<iframe sandbox="allow-scripts" style="width:100%;height:100vh;border:0"></iframe>' }); requests.push(route.request().url()); return route.abort(); });
  await page.goto('http://native-editor.invalid/');
  await page.locator('iframe').evaluate((frame, html) => { frame.srcdoc = html; }, html);
  const frame = page.frames().find(f => f !== page.mainFrame());
  await frame.waitForFunction(() => typeof window.start === 'function');
  await frame.evaluate(kind => window.start(kind), kind);
  await frame.waitForSelector('canvas', { timeout: 20000 });
  const before = await frame.evaluate(() => window.readSnapshot());
  let editError;
  try { await frame.evaluate(() => window.editSnapshot()); } catch (e) { editError = e.message; }
  let keyboardEditing = 'NOT TESTED';
  if (kind === 'docs' && !editError) {
   await frame.evaluate(() => window.selectText());
   await page.keyboard.type('Keyboard verified ');
   await frame.waitForFunction(() => window.readSnapshot().body.dataStream.includes('Keyboard verified '));
   keyboardEditing = 'PASSED: native document selection and keyboard input';
  }
  const after = await frame.evaluate(() => window.readSnapshot());
  await page.screenshot({ path: out + kind + '.png' });
  const changed = JSON.stringify(after) !== JSON.stringify(before);
  const result = { kind, version: '0.25.1', canvas: await frame.locator('canvas').count(), snapshotChanged: changed, editError, errors, externalRequests: requests.length, officeImportExport: 'NOT TESTED', keyboardEditing };
  results.push(result);
  await writeFile(out + kind + '-snapshot.json', JSON.stringify(after, null, 2));
  await page.close();
 }
 await writeFile(out + 'result.json', JSON.stringify(results, null, 2));
 console.log(JSON.stringify(results, null, 2));
 assert.ok(results.every(r => r.snapshotChanged && !r.editError && !r.errors.length && !r.externalRequests));
} finally { await browser.close(); }
