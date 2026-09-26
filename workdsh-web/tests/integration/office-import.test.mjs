import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {createRequire} from 'node:module';
const require = createRequire(new URL('../../packages/plugins/office/package.json',import.meta.url));
const JSZip = require('jszip');
test('Browser DOCX importer handles rich text and complex-file warnings and rejects malformed or oversized XML', async () => {
  const bundle = await build({entryPoints:['packages/plugins/office/src/live/import-docx.ts'],bundle:true,platform:'browser',format:'iife',globalName:'OfficeImport',write:false});
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage();
    await page.route('https://workdsh-import.test/**',r => r.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));
    await page.goto('https://workdsh-import.test/');
    await page.addScriptTag({content:bundle.outputFiles[0].text});
    const parse = async (xml, extras={}) => {
      // Stable archive bytes are necessary when asserting import idempotency.
      const date = new Date('2026-01-01T00:00:00Z');
      const zip = new JSZip();zip.file('word/document.xml',xml,{date});
      for (const [name,text] of Object.entries(extras)) zip.file(name,text,{date});
      const bytes = await zip.generateAsync({type:'base64',compression:'DEFLATE'});
      return page.evaluate(async bytes => {try {return {value:await OfficeImport.importDocx(Uint8Array.from(atob(bytes),c=>c.charCodeAt(0)),'dsh-resource://file/report.docx')}} catch(e) {return {error:e.message}}},bytes);
    };
    const open = '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>', close = '</w:body></w:document>';
    const xml = open+'<w:p><w:pPr><w:pStyle w:val="Heading1"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="36"/><w:color w:val="224466"/></w:rPr><w:t>中文😀 &amp; 标题</w:t><w:br/><w:t>第二行</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>表格文字</w:t></w:r></w:p></w:tc></w:tr></w:tbl><w:p><w:r><w:drawing/></w:r></w:p>'+close;
    const result = await parse(xml,{'word/header1.xml':'<header/>'});
    assert.equal(result.error,undefined);
    assert.equal(result.value.blocks[0].level,1);
    assert.equal(result.value.blocks[0].style.alignment,'center');
    assert.equal(result.value.blocks[0].runs[0].text,'中文😀 & 标题\n第二行');
    assert.deepEqual(result.value.blocks[0].runs[0].marks,['bold']);
    assert.equal(result.value.blocks[0].runs[0].style.fontSize,18);
    assert.equal(result.value.blocks[0].runs[0].style.color,'#224466');
    assert.ok(!result.value.warnings.includes('表格布局') && result.value.warnings.includes('图片/图表') && result.value.warnings.includes('页眉页脚/注释'));
    assert.equal(result.value.blocks[1].table.rows[0].cells[0].paragraphs[0].runs[0].text,'表格文字');
    assert.equal((await parse(xml,{'word/header1.xml':'<header/>'})).value.operationId,result.value.operationId);
    assert.match((await parse('<w:document>')).error,/损坏/);
    assert.match((await parse('<!DOCTYPE test>'+open+close)).error,/DTD/);
    assert.match((await parse(open+'<w:p><w:r><w:t>'+'x'.repeat(1100000)+'</w:t></w:r></w:p>'+close)).error,/1 MiB/);
  } finally {await browser.close();}
});
