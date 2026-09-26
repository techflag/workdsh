import {createRequire as dependencyRequire} from "node:module";
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const temp = await mkdtemp(join(tmpdir(), "office-download-tests-"));
const output = join(temp, "modules.mjs");
await build({
  stdin: {
    contents:
      'export {editorContent,editorBlocks,documentDiff} from "./packages/plugins/office/src/live/adapter.ts"; export {applyOperations,parse,editInput} from "./packages/plugins/office/src/content/model.ts"; export {documentDocx} from "./packages/plugins/office/src/live/docx.ts"; export {exportAndPresent} from "./packages/plugins/office/src/content/export.ts";',
    resolveDir: resolve("."),
  },
  bundle: true,
  loader:{".ttf":"binary"},
  platform: "node",
  format: "esm",
  outfile: output,
  plugins:[{name:"office-runtime-deps",setup(b){b.onResolve({filter:/^exceljs$/},()=>({path:dependencyRequire(resolve("packages/plugins/office/package.json")).resolve("exceljs"),external:true}));}}],
});
const {
  documentDocx,
  exportAndPresent,
  editorContent,
  editorBlocks,
  documentDiff,
  applyOperations,
  parse,
  editInput,
} = await import(pathToFileURL(output));
const { createRequire } = await import("node:module");
const JSZip = createRequire(resolve("packages/plugins/office/package.json"))(
  "jszip",
);
const ExcelJS = createRequire(resolve("packages/plugins/office/package.json"))(
  "exceljs",
);
const snapshot = {
  documentId: "doc1",
  kind: "document",
  title: "报告",
  revision: 2,
  generation: "a",
  state: {
    modelVersion: 1,
    blockIds: ["b1", "b2"],
    blocks: {
      b1: {
        blockId: "b1",
        type: "heading",
        level: 2,
        runs: [{ runId: "r1", text: "标题<&> 😀", marks: ["bold"] }],
      },
      b2: {
        blockId: "b2",
        type: "paragraph",
        runs: [
          {
            runId: "r2",
            text: "  第一行\n第二行\t尾部 ",
            marks: ["italic", "underline", "strike"],
          },
        ],
      },
    },
  },
};
test("DOCX snapshot preserves text, marks, headings, whitespace and OOXML relationships", async () => {
  const blob = await documentDocx(snapshot),
    zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const xml = await zip.file("word/document.xml").async("string");
  assert.match(xml, /Heading2/);
  assert.match(xml, /标题&lt;&amp;&gt; 😀/);
  assert.match(xml, /<w:br\/>/);
  for (const tag of [
    "<w:b/>",
    "<w:i/>",
    '<w:u w:val="single"/>',
    "<w:strike/>",
    'xml:space="preserve"',
  ])
    assert.ok(xml.includes(tag));
  assert.ok(zip.file("[Content_Types].xml"));
  assert.ok(zip.file("_rels/.rels"));
  assert.ok(zip.file("word/_rels/document.xml.rels"));
  assert.ok(zip.file("word/styles.xml"));
});
test("Structured Word charts remain native Office charts with an editable embedded workbook", async () => {
  const chart={chartType:"bar",title:"月末现金余额",categories:["1月","2月","3月"],series:[{name:"余额",values:[120,330,480],color:"#2563eb"},{name:"保有量",values:[500,500,500],color:"#f97316"}],width:640,height:360,alignment:"center",legend:"bottom",yAxisTitle:"万元"};
  const state={modelVersion:1,blockIds:["chart-1"],blocks:{"chart-1":{blockId:"chart-1",type:"chart",runs:[],chart}}};
  const json=editorContent(state),blocks=editorBlocks(json);
  assert.deepEqual(blocks[0].chart,chart);
  assert.deepEqual(documentDiff(state,json),[]);
  const zip=await JSZip.loadAsync(await (await documentDocx({...snapshot,state})).arrayBuffer());
  const document=await zip.file("word/document.xml").async("string"),rels=await zip.file("word/_rels/document.xml.rels").async("string"),chartXml=await zip.file("word/charts/chart1.xml").async("string");
  assert.match(document,/<c:chart r:id="chart1"\/>/);
  assert.match(rels,/relationships\/chart/);
  assert.match(chartXml,/<c:barChart>/);
  assert.match(chartXml,/月末现金余额/);
  assert.match(chartXml,/<c:externalData r:id="rId1">/);
  assert.equal(Object.keys(zip.files).filter(name=>name.startsWith("word/media/")).length,0,"chart must not be exported as a raster image");
  const workbookBytes=await zip.file("word/embeddings/Microsoft_Excel_Worksheet1.xlsx").async("uint8array"),workbook=new ExcelJS.Workbook();
  await workbook.xlsx.load(workbookBytes);
  const sheet=workbook.getWorksheet("Sheet1");
  assert.equal(sheet.getCell("A2").value,"1月");
  assert.equal(sheet.getCell("B4").value,480);
  assert.equal(sheet.getCell("C1").value,"保有量");
  assert.deepEqual(parse(editInput,{documentId:"doc1",baseRevision:2,operationId:"chart-edit",operations:[{op:"document.insertBlocks",afterBlockId:"b2",blocks:[{type:"chart",runs:[],chart,clientRef:"chart"}]}]}).operations[0].blocks[0].chart,chart);
});
test("Rich semantic styles and nested lists survive editor roundtrip and DOCX download", async () => {
  const state = {
    modelVersion: 1,
    blockIds: ["a", "b", "c", "d", "e"],
    blocks: {},
  };
  const para = (blockId, text, list) => ({
    blockId,
    type: "paragraph",
    runs: [
      {
        runId: "run-" + blockId,
        text,
        marks: ["bold"],
        style: {
          fontFamily: "宋体",
          fontSize: 18,
          color: "#ad2121",
          backgroundColor: "#fff2a8",
        },
      },
    ],
    style: { alignment: "center", lineHeight: 1.5, indent: 1 },
    ...(list ? { list } : {}),
  });
  state.blocks.a = para("a", "第一项", { type: "ordered", depth: 0, start: 3 });
  state.blocks.b = para("b", "嵌套项", { type: "bullet", depth: 1 });
  state.blocks.c = para("c", "续段", {
    type: "ordered",
    depth: 0,
    start: 3,
    continuation: true,
  });
  state.blocks.d = para("d", "第二项", { type: "ordered", depth: 0, start: 3 });
  state.blocks.e = para("e", "普通段落");
  const json = editorContent(state),
    blocks = editorBlocks(json);
  assert.deepEqual(
    blocks.map((b) => b.list),
    state.blockIds.map((id) => state.blocks[id].list),
  );
  assert.deepEqual(documentDiff(state, json), []);
  const zip = await JSZip.loadAsync(
    await (await documentDocx({ ...snapshot, state })).arrayBuffer(),
  );
  const xml = await zip.file("word/document.xml").async("string"),
    numbering = await zip.file("word/numbering.xml").async("string");
  for (const token of [
    'w:val="center"',
    'w:line="360"',
    'w:val="36"',
    'w:val="ad2121"',
    'w:fill="fff2a8"',
    'w:eastAsia="宋体"',
    'w:left="1080"',
  ])
    assert.ok(xml.includes(token), token);
  assert.equal(
    (xml.match(/<w:numPr>/g) || []).length,
    3,
    "continuation paragraph must not create a new list number",
  );
  assert.match(numbering, /<w:startOverride w:val="3"/);
  assert.match(numbering, /<w:numFmt w:val="bullet"/);
  assert.ok(
    numbering.lastIndexOf("</w:abstractNum>") <
      numbering.indexOf("<w:num w:numId="),
    "OOXML requires abstract numbering before numbering instances",
  );
});
test("Host rejects unsafe style values and invalid list levels without partial changes", () => {
  const base = snapshot.state,
    block = { type: "paragraph", runs: [{ text: "x", marks: [] }] };
  const input = (extra) => ({
    documentId: "doc1",
    operationId: "rich-op",
    baseRevision: 2,
    operations: [
      {
        op: "document.replaceBlock",
        blockId: "b2",
        expectedText: "  第一行\n第二行\t尾部 ",
        block: { ...block, ...extra },
      },
    ],
  });
  for (const extra of [
    { style: { indent: 100 } },
    { runs: [{ text: "x", marks: [], style: { color: "url(evil)" } }] },
    { runs: [{ text: "x", marks: [], style: { fontFamily: "x; color:red" } }] },
    { list: { type: "ordered", depth: 6 } },
    { style: { fontSize: 22 } },
  ])
    assert.throws(() => parse(editInput, input(extra)));
  const before = JSON.stringify(base);
  const parsed = parse(
    editInput,
    input({ list: { type: "bullet", depth: 2 } }),
  );
  assert.throws(() => applyOperations(base, parsed.operations, () => "new-id"));
  assert.equal(JSON.stringify(base), before);
});
after(() => rm(temp, { recursive: true, force: true }));

test("Export delegates binary write and delivery to the official tool pipeline, never presents a failed write", async () => {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const { readFile } = await import("node:fs/promises");
  const cwd = await mkdtemp(join(tmpdir(), "office-export-"));
  const exec = {
    agent: {},
    callId: "export1",
    rootCallId: "export1",
    token: {},
    signal: new AbortController().signal,
    deferContext() {},
  };
  const calls = [];
  const tools = {
    get: (_name, scope) => {
      assert.equal(scope, exec.agent);
      return true;
    },
    execute: async (input) => {
      calls.push(input);
      assert.equal(input.parent, exec.token);
      assert.equal(input.agent, exec.agent);
      if (input.name === "bash") {
        const { stdout } = await promisify(execFile)(
          "bash",
          ["-c", input.arguments.command],
          { cwd },
        );
        return {
          isError: false,
          content: [{ type: "text", text: stdout }],
          value: {},
        };
      }
      const file = await readFile(join(cwd, input.arguments.files[0].path));
      const zip = await JSZip.loadAsync(file);
      assert.match(await zip.file("word/document.xml").async("string"), /标题/);
      return { isError: false, content: [], value: {} };
    },
  };
  try {
    const hostile = { ...snapshot, title: "报告'$()\\:/" };
    const result = await exportAndPresent({ tools }, exec, hostile);
    assert.equal(result.status, "presented");
    assert.equal(result.revision, snapshot.revision);
    assert.deepEqual(
      calls.map((x) => x.name),
      ["bash", "present"],
    );
    calls.length = 0;
    tools.execute = async (input) => {
      calls.push(input);
      return {
        isError: false,
        content: [{ type: "text", text: "[exit code: 1]" }],
        value: {},
      };
    };
    await assert.rejects(
      () => exportAndPresent({ tools }, exec, snapshot),
      /写入失败/,
    );
    assert.deepEqual(
      calls.map((x) => x.name),
      ["bash"],
    );
    await assert.rejects(
      () => exportAndPresent({ tools: { get: () => false } }, exec, snapshot),
      /官方 bash/,
    );
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("Export recovers a lost write receipt without duplicate files, refuses changed destinations and protects the frozen revision", async () => {
  const {execFile} = await import("node:child_process");
  const {promisify} = await import("node:util");
  const {readFile, readdir, writeFile} = await import("node:fs/promises");
  const cwd = await mkdtemp(join(tmpdir(), "office-export-recovery-"));
  const controller = new AbortController();
  const exec = {agent: {}, callId: "retry", rootCallId: "retry", token: {}, signal: controller.signal, deferContext() {}};
  let mode = "lost-write", presented = 0, writes = 0;
  const tools = {get: () => true, execute: async input => {
    if (input.name === "bash") {
      writes++;
      const {stdout} = await promisify(execFile)("bash", ["-c", input.arguments.command], {cwd});
      if (mode === "lost-write") throw Error("Connection lost after write");
      if (mode === "cancel-after-write") controller.abort();
      return {isError: false, content: [{type: "text", text: stdout}]};
    }
    presented++;
    if (mode === "lost-present") throw Error("Delivery connection lost");
    return {isError: false, content: []};
  }};
  try {
    await assert.rejects(() => exportAndPresent({tools}, exec, snapshot, 2), /写入结果未知/);
    assert.equal(presented, 0);
    const files = await readdir(join(cwd, "output"));
    assert.equal(files.length, 1);
    const original = await readFile(join(cwd, "output", files[0]));
    mode = "success";
    const result = await exportAndPresent({tools}, exec, snapshot, 2);
    assert.equal(result.path, "output/" + files[0]);
    assert.deepEqual(await readdir(join(cwd, "output")), files);
    assert.deepEqual(await readFile(join(cwd, result.path)), original);
    // Human-modified exported files must remain untouched, even when retrying the same revision.
    await writeFile(join(cwd, result.path), "human change");
    await assert.rejects(() => exportAndPresent({tools}, exec, snapshot, 2), /写入结果未知/);
    assert.equal(await readFile(join(cwd, result.path), "utf8"), "human change");
    assert.equal(presented, 1);
    const before = writes;
    await assert.rejects(() => exportAndPresent({tools}, exec, {...snapshot, revision: 3}, 2), /REVISION_CONFLICT/);
    assert.equal(writes, before);
    // A delivery-only failure exposes the stable path; replay verifies and reuses it.
    await writeFile(join(cwd, result.path), original);
    mode = "lost-present";
    await assert.rejects(() => exportAndPresent({tools}, exec, snapshot, 2), /原生交付结果未知/);
    mode = "success";
    assert.equal((await exportAndPresent({tools}, exec, snapshot, 2)).path, result.path);
    assert.deepEqual(await readdir(join(cwd, "output")), files);
    // Cancellation after the completed write must not invoke present.
    mode = "cancel-after-write";
    const count = presented;
    await assert.rejects(() => exportAndPresent({tools}, exec, snapshot, 2), /abort/i);
    assert.equal(presented, count);
    assert.deepEqual(await readdir(join(cwd, "output")), files);
  } finally {await rm(cwd, {recursive: true, force: true});}
});

test('HTML export sends the original committed source through official bash and present',async()=>{
 const html='<!doctype html><html lang="zh-CN"><body><h1>预算看板</h1></body></html>',calls=[];
 const ctx={tools:{get:()=>({}),execute:async call=>{calls.push(call);if(call.name==='bash'){const encoded=call.arguments.command.match(/b=Buffer.from\("([A-Za-z0-9+/=]+)","base64"\)/)[1];assert.equal(Buffer.from(encoded,'base64').toString('utf8'),html);return {content:[{type:'text',text:call.arguments.command.match(/OFFICE_EXPORTED_[a-f0-9-]+/)[0]}]};}return {content:[]};}}};
 const exec={signal:new AbortController().signal,agent:{},callId:'html-export',deferContext(){}};
 const result=await exportAndPresent(ctx,exec,{documentId:'html1',kind:'html',title:'预算看板',revision:2,generation:'one',state:{modelVersion:1,html}},2);
 assert.ok(result.path.endsWith('.html'));assert.equal(result.status,'presented');assert.equal(calls[1].name,'present');assert.equal(calls[1].arguments.files[0].path,result.path);
 await assert.rejects(exportAndPresent(ctx,exec,{documentId:'html1',kind:'html',title:'预算看板',revision:2,generation:'one',state:{modelVersion:1,html}},1),/REVISION_CONFLICT/);
});
