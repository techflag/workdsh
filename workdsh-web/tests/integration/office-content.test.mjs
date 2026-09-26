import {createRequire} from "node:module";
const officeRequire=createRequire(new URL("../../packages/plugins/office/package.json",import.meta.url));
import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, mkdir, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Context } from "@deepseek-ai/cordis";
import Storage from "@deepseek-ai/dsh-storage";
import * as JsonStorage from "@deepseek-ai/dsh-storage-json";
import * as StorageDomain from "@deepseek-ai/dsh-storage-domain";
import Tools from "@deepseek-ai/dsh-tools";
import { AccessManager } from "../../packages/plugins/access/dist/index.js";
import { AuditJournal } from "../../packages/plugins/audit/dist/index.js";
const artifacts = new URL(
  "../../.artifacts/office-content-tests/",
  import.meta.url,
);
await mkdir(artifacts, { recursive: true });
await build({
  entryPoints: {
    "spreadsheet-adapter":"packages/plugins/office/src/spreadsheet/adapter.ts",
    "spreadsheet-xlsx":"packages/plugins/office/src/spreadsheet/xlsx.ts",
    connection:"packages/plugins/office/src/content/connection.ts",
    service:"packages/plugins/office/src/content/service.ts",
    model:"packages/plugins/office/src/content/model.ts",
    tools:"packages/plugins/office/src/content/tools.ts",
    export:"packages/plugins/office/src/content/export.ts",
    "native-deck":"packages/plugins/office/src/presentation/native-deck.ts",
  },
  outdir: artifacts.pathname,
  bundle: true,
  splitting: true,
  loader:{".ttf":"binary"},
  platform: "node",
  format: "esm",
  external: ["@deepseek-ai/*"],
  plugins:[{name:"office-runtime-deps",setup(b){b.onResolve({filter:/^exceljs$/},()=>({path:officeRequire.resolve("exceljs"),external:true}));}}],
});
const { ContentService } = await import(new URL("service.js", artifacts));
const toolPlugin = await import(new URL("tools.js", artifacts));
const { applyOperations, editInput, parse } = await import(
  new URL("model.js", artifacts)
);
const members = new Map(
  [
    ["a", "org-a"],
    ["b", "org-a"],
    ["c", "org-b"],
  ].map(([principalId, organizationId]) => [
    principalId,
    {
      organizationId,
      principalId,
      principalKind: "human",
      role: "owner",
      state: "active",
      revision: "1",
    },
  ]),
);
const actor = (p = "a") => ({
  principalId: p,
  organizationId: members.get(p).organizationId,
  sessionId: "session-" + p,
  requestId: "request-" + p,
  resolvedBy: "fixture",
});
const identity = {
  id: "fixture",
  resolve: async (input) => ({ ...actor(), sessionId: input?.sessionId }),
  membership: (o, p) =>
    members.get(p)?.organizationId === o ? members.get(p) : undefined,
};
async function boot(root, fs = {}) {
  const ctx = new Context();
  ctx.provide("fs", fs);
  ctx.provide("workdshIdentity", identity);
  await ctx.plugin(Storage);
  await ctx.plugin(JsonStorage, { root });
  await ctx.plugin(StorageDomain, { backend: "json" });
  await ctx.plugin(AuditJournal);
  await ctx.plugin(AccessManager);
  for (const p of ["a", "b", "c"])
    await ctx.workdshAccess.bindSession(actor(p), {
      sessionId: "session-" + p,
      workspaceId: "workspace",
    });
  const fiber = await ctx.plugin(ContentService);
  const sections = new Map();
  ctx.provide("systemPrompt", {
    tools() {},
    section(value) {
      sections.set(value.name, value);
      return () => sections.delete(value.name);
    },
    getSectionOrder() {
      return 0;
    },
  });
  await ctx.plugin(Tools);
  const toolFiber = await ctx.plugin(toolPlugin);
  return { ctx, fiber, toolFiber, sections, s: ctx.workdshOfficeContent };
}
const block = (text) => ({ type: "paragraph", runs: [{ text, marks: [] }] });
const create = async (s) =>
  s.open(actor(), {
    source: "new",
    title: "共享文档",
    operationId: "create-1",
  });
const change = (s, op, text) => ({
  documentId: s.documentId,
  baseRevision: s.revision,
  operationId: op,
  operations: [
    {
      op: "document.replaceBlock",
      blockId: s.state.blockIds[0],
      expectedText: s.state.blocks[s.state.blockIds[0]].runs
        .map((r) => r.text)
        .join(""),
      block: block(text),
    },
  ],
});

test("Office native tools, atomic batches, replay before CAS, leases, ownership and cold restart", async () => {
  const root = await mkdtemp(join(tmpdir(), "office-content-"));
  let h;
  try {
    h = await boot(root);
    const { ctx } = h;
    for (const name of [
      "content_open",
      "content_read",
      "content_capabilities",
      "content_edit",
      "content_present",
    ])
      assert.ok(ctx.tools.get(name));
    assert.ok(ctx.tools.get("content_export"));
    assert.throws(() => toolPlugin.apply(ctx), /already registered/);
    const exec = {
      agent: { id: "session-a" },
      signal: new AbortController().signal,
      callId: "test-call",
    };
    const first = await ctx.tools.get("content_open").execute(
      {
        input: { source: "new", title: "共享文档", operationId: "create-1" },
      },
      exec,
    );
    const replay = await create(h.s);
    assert.equal(replay.documentId, first.documentId);
    await assert.rejects(
      h.s.open(actor(), {
        source: "new",
        title: "changed",
        operationId: "create-1",
      }),
      { code: "IDEMPOTENCY_MISMATCH" },
    );
    const input = change(first, "batch-1", "第一段 😀 中文");
    const receipt = await ctx.tools
      .get("content_edit")
      .execute({ input }, exec);
    assert.equal(receipt.revision, 1);
    await h.s.edit(
      actor(),
      change(
        await h.s.read(actor(), first.documentId),
        "batch-2",
        "第二次修改",
      ),
    );
    assert.deepEqual(
      await h.s.edit(actor(), input),
      receipt,
      "old successful payload replays even after revision changes",
    );
    await assert.rejects(
      h.s.edit(actor(), { ...input, operationId: "new-stale" }),
      { code: "REVISION_CONFLICT" },
    );
    await assert.rejects(
      h.s.edit(actor(), {
        ...input,
        operations: [{ ...input.operations[0], block: block("wrong replay") }],
      }),
      { code: "IDEMPOTENCY_MISMATCH" },
    );
    let current = await h.s.read(actor(), first.documentId);
    await assert.rejects(
      h.s.edit(actor(), {
        ...change(current, "bad-batch", "must not persist"),
        operations: [
          ...change(current, "bad-batch", "must not persist").operations,
          { op: "document.removeBlock", blockId: "missing", expectedText: "" },
        ],
      }),
      { code: "TARGET_NOT_FOUND" },
    );
    assert.deepEqual(await h.s.read(actor(), first.documentId), current);
    const grant = await h.s.lease(
      actor(),
      first.documentId,
      "browser-a",
      "acquire",
    );
    await assert.rejects(
      h.s.edit(actor(), change(current, "ai-blocked", "AI overwrite")),
      { code: "HUMAN_EDITING" },
    );
    await assert.rejects(
      h.s.lease(actor(), first.documentId, "browser-b", "acquire"),
      { code: "HUMAN_EDITING" },
    );
    await h.s.editHuman(
      actor(),
      change(current, "human-1", "用户修改，AI 必须读到"),
      { token: grant.lease.token, clientId: "browser-a" },
    );
    await h.s.lease(
      actor(),
      first.documentId,
      "browser-a",
      "release",
      grant.lease.token,
    );
    current = await ctx.tools
      .get("content_read")
      .execute({ documentId: first.documentId }, exec);
    assert.equal(
      current.state.blocks[current.state.blockIds[0]].runs[0].text,
      "用户修改，AI 必须读到",
    );
    await h.s.edit(actor(), change(current, "ai-after-human", "AI 接着写"));
    for (const p of ["b", "c"])
      await assert.rejects(h.s.read(actor(p), first.documentId), {
        code: "FORBIDDEN",
      });
    await assert.rejects(
      h.s.read({ ...actor(), sessionId: "unbound" }, first.documentId),
      { code: "FORBIDDEN" },
    );
    members.get("a").state = "suspended";
    await assert.rejects(h.s.read(actor(), first.documentId), {
      code: "FORBIDDEN",
    });
    members.get("a").state = "active";
    assert.equal((await h.s.pending(actor())).length, 1, "creation automatically requests the right-hand editor");
    const presentation = await h.s.present(actor(), first.documentId);
    assert.equal((await h.s.pending(actor())).length, 1);
    assert.equal((await h.s.pending(actor("b"))).length, 0);
    await h.s.acknowledge(actor(), {
      ...presentation,
      clientId: "browser-a",
      appliedRevision: 4,
    });
    assert.equal((await h.s.pending(actor())).length, 0);
    const reopenedEdit = change(await h.s.read(actor(), first.documentId), "reveal-after-ack", "AI追加后重新打开");
    const reopenedReceipt = await h.s.edit(actor(), reopenedEdit);
    const reopenedRequest = (await h.s.pending(actor()))[0];
    assert.ok(reopenedRequest, "A fresh AI commit requests the sidebar again after the first ACK");
    assert.notEqual(reopenedRequest.requestId, presentation.requestId);
    assert.equal(reopenedRequest.revision, reopenedReceipt.revision);
    assert.equal((await h.s.pending(actor("b"))).length, 0, "Reveal remains scoped to the calling Session");
    await h.s.acknowledge(actor(), {...reopenedRequest, clientId: "browser-a", appliedRevision: reopenedReceipt.revision});
    await h.s.edit(actor(), reopenedEdit);
    assert.equal((await h.s.pending(actor())).length, 0, "Idempotent replay does not reveal the sidebar again");
    const oldLease = await h.s.lease(
      actor(),
      first.documentId,
      "browser-a",
      "acquire",
    );
    await h.s.editHuman(actor(), change(await h.s.read(actor(), first.documentId), "human-no-reveal", "人工保存不重开右栏"), {token: oldLease.lease.token, clientId: "browser-a"});
    assert.equal((await h.s.pending(actor())).length, 0, "Human autosave does not request presentation");
    const before = await h.s.read(actor(), first.documentId);
    await h.ctx.fiber.dispose();
    h = await boot(root);
    const restored = await h.s.read(actor(), first.documentId);
    assert.deepEqual(restored.state, before.state);
    assert.equal(restored.revision, before.revision);
    assert.notEqual(restored.generation, before.generation);
    await assert.rejects(
      h.s.editHuman(actor(), change(restored, "old-generation", "bad"), {
        token: oldLease.lease.token,
        clientId: "browser-a",
      }),
      { code: "LEASE_EXPIRED" },
    );
    assert.deepEqual(
      await h.s.edit(actor(), input),
      receipt,
      "receipt survives restart",
    );
    await h.s.edit(actor(), change(restored, "after-restart", "恢复后继续"));
    const old = h.s;
    assert.ok(h.sections.has("workdsh:office-authoring"));
    await h.fiber.dispose();
    assert.equal(h.sections.has("workdsh:office-authoring"), false, "Office disposal removes its writing guide");
    assert.equal(
      h.ctx.tools.get("content_read"),
      undefined,
      "service disposal unregisters dependent tools",
    );
    await assert.rejects(old.read(actor(), first.documentId), {
      code: "UNAVAILABLE",
    });
  } finally {
    members.get("a").state = "active";
    await h?.ctx.fiber.dispose();
    await rm(root, { recursive: true, force: true });
  }
});

test("Office reducer preserves unaffected IDs and rejects unknown fields, invalid marks and partial failure", () => {
  const initial = {
    modelVersion: 1,
    blockIds: ["one"],
    blocks: {
      one: {
        blockId: "one",
        type: "paragraph",
        runs: [
          { runId: "run-a", text: "hello", marks: [] },
          { runId: "run-b", text: "中文😀", marks: ["bold"] },
        ],
      },
    },
  };
  let i = 0;
  const result = applyOperations(
    initial,
    [
      {
        op: "document.replaceBlock",
        blockId: "one",
        expectedText: "hello中文😀",
        block: {
          type: "heading",
          level: 2,
          runs: [
            { text: "hello", marks: [] },
            { text: "中文😀改", marks: ["bold"] },
          ],
        },
      },
    ],
    () => `new-${++i}`,
  );
  assert.equal(result.state.blocks.one.runs[0].runId, "run-a");
  assert.notEqual(result.state.blocks.one.runs[1].runId, "run-b");
  assert.equal(initial.blocks.one.type, "paragraph");
  const valid = {
    documentId: "doc",
    baseRevision: 0,
    operationId: "op",
    operations: [
      {
        op: "document.insertBlocks",
        afterBlockId: "one",
        blocks: [{ ...block("x"), clientRef: "x" }],
      },
    ],
  };
  assert.throws(() => parse(editInput, { ...valid, actor: "spoof" }));
  assert.throws(() =>
    parse(editInput, {
      ...valid,
      operations: [{ op: "arbitrary.eval", code: "x" }],
    }),
  );
  assert.throws(() => parse(editInput, { ...valid, operationId: "__proto__" }));
});


test("Rich paragraph and run formatting survive a full Host cold start", async () => {
  const root = await mkdtemp(join(tmpdir(), "office-rich-cold-"));
  let h;
  try {
    h = await boot(root);
    const original = await create(h.s);
    const input = change(original, "rich", "富格式冷启动");
    input.operations[0].block.style = {alignment:"center",lineHeight:1.5,indent:1};
    input.operations[0].block.list = {type:"ordered",depth:0,start:3};
    input.operations[0].block.runs[0].style = {fontFamily:"宋体",fontSize:18,color:"#ad2121",backgroundColor:"#fff2a8"};
    await h.s.edit(actor(),input);
    const before = await h.s.read(actor(),original.documentId);
    await h.ctx.fiber.dispose();
    h = await boot(root);
    const after = await h.s.read(actor(),original.documentId);
    assert.deepEqual(after.state,before.state);
    assert.equal(after.revision,before.revision);
  } finally {await h?.ctx.fiber.dispose();await rm(root,{recursive:true,force:true});}
});

test("Imported semantic DOCX copy is atomic, authorized and reopens without replacing human edits", async () => {
  const root = await mkdtemp(join(tmpdir(), "office-import-"));
  const h = await boot(root);
  try {
    const input = {source:"import", title:"文件编辑副本", operationId:"source-docx-hash", blocks: [{type:"heading",level:1,runs:[{text:"导入标题",marks:["bold"],style:{fontSize:18,color:"#224466"}}]}, block("导入正文") ]};
    const imported = await h.s.open(actor(), input);
    assert.equal(imported.state.blockIds.length, 2);
    assert.equal(imported.state.blocks[imported.state.blockIds[0]].runs[0].text, "导入标题");
    assert.equal((await h.s.pending(actor())).length,0,"File tab owns display; no duplicate live tab");
    await assert.rejects(h.s.read(actor("b"), imported.documentId), {code:"FORBIDDEN"});
    const lease = await h.s.lease(actor(),imported.documentId,"import-browser","acquire");
    await h.s.editHuman(actor(),change(imported,"import-human-edit","已编辑标题"),{token:lease.lease.token,clientId:"import-browser"});
    const reopened = await h.s.open(actor(),input);
    assert.equal(reopened.documentId,imported.documentId);
    assert.equal(reopened.state.blocks[reopened.state.blockIds[0]].runs[0].text,"已编辑标题");
    await assert.rejects(h.s.open(actor(),{...input,blocks:[block("变更来源")]}),{code:"IDEMPOTENCY_MISMATCH"});
    const before = (await h.s.list(actor())).length;
    await assert.rejects(h.s.open(actor(),{...input,operationId:"bad-import",blocks:[{...block("bad"),style:{color:"red"}}]}),{code:"INVALID_INPUT"});
    assert.equal((await h.s.list(actor())).length,before,"Invalid import leaves no empty orphan copy");
  } finally {await h.ctx.fiber.dispose();await rm(root,{recursive:true,force:true});}
});

test("Office Host unload revokes tools and writing guide, and reinstall preserves saved documents", async () => {
  const root = await mkdtemp(join(tmpdir(), "office-unload-"));
  const h = await boot(root);
  try {
    const initial = await create(h.s);
    await h.s.edit(actor(), change(initial, "before-unload", "卸载插件后仍保留的文档"));
    const before = await h.s.read(actor(), initial.documentId);
    const names = ["content_open", "content_read", "content_capabilities", "content_edit", "content_present", "content_export"];
    for (const name of names) assert.ok(h.ctx.tools.get(name));
    assert.ok(h.sections.has("workdsh:office-authoring"));
    await h.toolFiber.dispose();
    for (const name of names) assert.equal(h.ctx.tools.get(name), undefined);
    assert.equal(h.sections.has("workdsh:office-authoring"), false);
    await h.fiber.dispose();
    assert.equal(h.ctx.workdshOfficeContent, undefined);
    const restoredFiber = await h.ctx.plugin(ContentService);
    try {
      await h.ctx.plugin(toolPlugin);
      for (const name of names) assert.ok(h.ctx.tools.get(name));
      const after = await h.ctx.workdshOfficeContent.read(actor(), initial.documentId);
      assert.deepEqual(after.state, before.state);
      assert.equal(after.revision, before.revision);
    } finally {await restoredFiber.dispose();}
  } finally {await h.ctx.fiber.dispose();await rm(root,{recursive:true,force:true});}
});

test("Tables and embedded images share tools, human leases, atomic validation and cold persistence", async () => {
  const root = await mkdtemp(join(tmpdir(), "office-rich-content-"));
  let h = await boot(root);
  try {
    const first = await create(h.s);
    const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf1kAAAAASUVORK5CYII=";
    const table = {type:"table",runs:[],table:{rows:[{cells:[{colspan:2,rowspan:1,colwidth:[100,140],header:true,paragraphs:[block("汇总")] }]},{cells:[{colspan:1,rowspan:1,paragraphs:[block("门店A")]},{colspan:1,rowspan:1,paragraphs:[block("待填")] }]}]}};
    const image = {type:"image",runs:[],image:{src:png,width:240,height:180,alignment:"center",alt:"说明图"}};
    const exec = {agent:{id:"session-a"},signal:new AbortController().signal,callId:"rich-tool"};
    await h.ctx.tools.get("content_edit").execute({input:{documentId:first.documentId,baseRevision:0,operationId:"rich-insert",operations:[{op:"document.insertBlocks",afterBlockId:first.state.blockIds[0],blocks:[{...table,clientRef:"table"},{...image,clientRef:"image"}]}]}},exec);
    let saved = await h.ctx.tools.get("content_read").execute({documentId:first.documentId},exec);
    const key = saved.state.blockIds[1], imageKey=saved.state.blockIds[2];
    assert.deepEqual(saved.state.blocks[key].table,table.table);
    const bad=structuredClone(table);bad.table.rows[1].cells.pop();
    await assert.rejects(h.s.edit(actor(),{documentId:first.documentId,baseRevision:saved.revision,operationId:"bad-grid",operations:[{op:"document.removeBlock",blockId:imageKey,expectedText:"说明图"},{op:"document.replaceBlock",blockId:key,expectedText:"汇总\n门店A\t待填",block:bad}]}),{code:"INVALID_INPUT"});
    assert.deepEqual(h.s.projectForAgent(await h.s.read(actor(),first.documentId)),saved,"failed batch retains image and revision");
    const lease=await h.s.lease(actor(),first.documentId,"rich-browser","acquire");
    const updated=structuredClone(table);updated.table.rows[1].cells[1].paragraphs=[block("人工修改")];
    const input={documentId:first.documentId,baseRevision:saved.revision,operationId:"rich-human",operations:[{op:"document.replaceBlock",blockId:key,expectedText:"汇总\n门店A\t待填",block:updated}]};
    await assert.rejects(h.s.edit(actor(),input),{code:"HUMAN_EDITING"});
    await h.s.editHuman(actor(),input,{token:lease.lease.token,clientId:"rich-browser"});
    await h.s.lease(actor(),first.documentId,"rich-browser","release",lease.lease.token);
    saved=await h.s.read(actor(),first.documentId);
    assert.equal(saved.state.blocks[key].table.rows[1].cells[1].paragraphs[0].runs[0].text,"人工修改");
    const invalidImage={...image,image:{...image.image,src:"https://external.test/image.png"}};
    await assert.rejects(h.s.edit(actor(),{documentId:first.documentId,baseRevision:saved.revision,operationId:"bad-image",operations:[{op:"document.replaceBlock",blockId:imageKey,expectedText:"说明图",block:invalidImage}]}),{code:"INVALID_INPUT"});
    await h.ctx.fiber.dispose();h=await boot(root);
    assert.deepEqual((await h.s.read(actor(),first.documentId)).state,saved.state);
  } finally {await h.ctx.fiber.dispose();await rm(root,{recursive:true,force:true});}
});

test("content_edit accepts one JSON-wrapped input object and rejects malformed wrappers", async () => {
  const root = await mkdtemp(join(tmpdir(), "office-json-wrapper-"));
  const h = await boot(root);
  try {
    const first = await create(h.s);
    const exec = {agent:{id:"session-a"}, signal:new AbortController().signal, callId:"json-wrapper"};
    const input = {documentId:first.documentId,baseRevision:0,operationId:"wrapped-edit",operations:[{op:"document.replaceBlock",blockId:first.state.blockIds[0],expectedText:"",block:block("兼容字符串包装")}]};
    const receipt = await h.ctx.tools.get("content_edit").execute({input:JSON.stringify(input)},exec);
    assert.equal(receipt.revision,1);
    assert.equal((await h.s.read(actor(),first.documentId)).state.blocks[first.state.blockIds[0]].runs[0].text,"兼容字符串包装");
    await assert.rejects(h.ctx.tools.get("content_edit").execute({input:"{bad json"},exec),{code:"INVALID_INPUT"});
    await assert.rejects(h.ctx.tools.get("content_edit").execute({input:"[]"},exec),{code:"INVALID_INPUT"});
  } finally {await h.ctx.fiber.dispose();await rm(root,{recursive:true,force:true});}
});

test("AI image references copy across authorized documents and reject changed or unauthorized sources", async () => {
  const root = await mkdtemp(join(tmpdir(), "office-image-reference-"));
  const h = await boot(root);
  try {
    const doc = await create(h.s);
    const src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5ZkAAAAASUVORK5CYII=";
    const image = {type: "image", runs: [], image: {src, width: 100, height: 100, alt: "图片"}};
    await h.s.edit(actor(), {documentId: doc.documentId, baseRevision: doc.revision, operationId: "seed-image", operations: [{op: "document.insertBlocks", afterBlockId: null, blocks: [{...image, clientRef: "image"}]}]});
    const snapshot = await h.s.read(actor(), doc.documentId);
    const exec = {agent: {id: "session-a"}, signal: new AbortController().signal, callId: "image-ref"};
    const projected = await h.ctx.tools.get("content_read").execute({documentId: doc.documentId}, exec);
    const imageId = snapshot.state.blockIds.find(id => snapshot.state.blocks[id].type === "image");
    const reference = projected.state.blocks[imageId].image.src;
    assert.match(reference, /^office-image:[^:]+:[^:]+:[a-f0-9]{64}$/);
    assert.equal(snapshot.state.blocks[imageId].image.src, src);
    const input = {documentId: doc.documentId, baseRevision: snapshot.revision, operationId: "reuse-image", operations: [{op: "document.insertBlocks", afterBlockId: imageId, blocks: [{...image, image: {...image.image, src: reference, alignment: "right"}, clientRef: "copy"}]}]};
    const receipt = await h.ctx.tools.get("content_edit").execute({input}, exec);
    assert.deepEqual(await h.s.editForAgent(actor(), input), receipt);
    assert.equal((await h.s.read(actor(), doc.documentId)).state.blocks[receipt.ids.copy].image.src, src);
    await assert.rejects(h.s.editForAgent(actor("c"), input), /./);
    await assert.rejects(h.s.editForAgent(actor(), {...input, operationId: "bad-hash", operations: [{...input.operations[0], blocks: [{...input.operations[0].blocks[0], image: {...image.image, src: reference.slice(0, -1) + (reference.endsWith("0") ? "1" : "0")}}]}]}), /图片引用/);
    const other = await h.s.open(actor(), {source: "new", title: "另一文档", operationId: "other-document"});
    const copied = await h.ctx.tools.get("content_edit").execute({input: {...input, documentId: other.documentId, baseRevision: other.revision, operationId: "cross-document-image", operations: [{...input.operations[0], afterBlockId: null}]}}, exec);
    assert.equal((await h.s.read(actor(), other.documentId)).state.blocks[copied.ids.copy].image.src, src);
    assert.equal((await h.s.read(actor(), doc.documentId)).revision, receipt.revision, "copy does not edit source");
    const foreign = await h.s.open(actor("c"), {source: "new", title: "跨组织来源", operationId: "foreign-source"});
    await h.s.edit(actor("c"), {documentId: foreign.documentId, baseRevision: foreign.revision, operationId: "foreign-seed", operations: [{op: "document.insertBlocks", afterBlockId: null, blocks: [{...image, clientRef: "foreign"}]}]});
    const foreignProjection = h.s.projectForAgent(await h.s.read(actor("c"), foreign.documentId));
    const foreignRef = Object.values(foreignProjection.state.blocks).find(b => b.type === "image").image.src;
    await assert.rejects(h.s.editForAgent(actor(), {...input, operationId: "unauthorized-source", operations: [{...input.operations[0], blocks: [{...image, image: {...image.image, src: foreignRef}, clientRef: "forbidden"}]}]}), {code: "FORBIDDEN"});
    assert.equal((await h.s.read(actor(), doc.documentId)).revision, receipt.revision);
    const workspaceActor = {...actor(), sessionId: "session-a-other-workspace"};
    await h.ctx.workdshAccess.bindSession(workspaceActor, {sessionId: workspaceActor.sessionId, workspaceId: "other-workspace"});
    const workspaceDoc = await h.s.open(workspaceActor, {source: "new", title: "另工作区来源", operationId: "workspace-source"});
    await h.s.edit(workspaceActor, {documentId: workspaceDoc.documentId, baseRevision: workspaceDoc.revision, operationId: "workspace-seed", operations: [{op: "document.insertBlocks", afterBlockId: null, blocks: [{...image, clientRef: "workspace-image"}]}]});
    const workspaceRef = Object.values(h.s.projectForAgent(await h.s.read(workspaceActor, workspaceDoc.documentId)).state.blocks).find(b => b.type === "image").image.src;
    await assert.rejects(h.s.editForAgent(actor(), {...input, operationId: "workspace-forbidden", operations: [{...input.operations[0], blocks: [{...image, image: {...image.image, src: workspaceRef}, clientRef: "workspace-copy"}]}]}), {code: "FORBIDDEN"});
    const legacyRef = reference.replace(`office-image:${doc.documentId}:`, "office-image:");
    assert.deepEqual(await h.s.editForAgent(actor(), {...input, operations: [{...input.operations[0], blocks: [{...input.operations[0].blocks[0], image: {...input.operations[0].blocks[0].image, src: legacyRef}}]}]}), receipt);

    await h.s.edit(actor(), {documentId: doc.documentId, baseRevision: receipt.revision, operationId: "remove-source", operations: [{op: "document.removeBlock", blockId: imageId, expectedText: "图片"}]});
    await assert.rejects(h.s.editForAgent(actor(), {...input, operationId: "removed-source"}), /来源图片/);
    assert.equal((await h.s.read(actor(), other.documentId)).state.blocks[copied.ids.copy].image.src, src, "target retains independent bytes after source removal");
  } finally {
    await h.ctx.fiber.dispose();
    await rm(root, {recursive: true, force: true});
  }
});

test('Native PPT shares native tools, pending/ACK, CAS, human leases, ownership and cold storage',async()=>{
 const root=await mkdtemp(join(tmpdir(),'office-ppt-service-'));let h;
 try{
  h=await boot(root);const exec={agent:{id:'session-a'},signal:new AbortController().signal,callId:'ppt-call'};
  const input={source:'new',kind:'presentation',title:'门店经营汇报',operationId:'ppt-create',brief:'# 门店经营汇报\n\n## 经营概况\n\n- 经营资料待补'};
  const first=await h.ctx.tools.get('content_open').execute({input},exec);
  assert.equal(first.kind,'presentation');assert.equal(first.state.deck.slides.length,1);assert.equal(first.state.blocks,undefined);
  assert.deepEqual(first.state.deck.canvas,{width:1280,height:720,unit:'css-px'});
  const capabilities=await h.ctx.tools.get('content_capabilities').execute({},exec);
  assert.deepEqual(capabilities.presentation.canvas.default,{width:1280,height:720,unit:'css-px'});
  assert.equal(capabilities.presentation.canvas.authoritativePath,'state.deck.canvas');
  assert.equal(capabilities.presentation.fontSizeUnit,'points');
  const pending=await h.s.pending(actor());assert.ok(pending.some(item=>item.documentId===first.documentId));
  const request=pending.find(item=>item.documentId===first.documentId);
  await h.s.acknowledge(actor(),{documentId:first.documentId,requestId:request.requestId,clientId:'ppt-client',appliedRevision:0});
  const batch={documentId:first.documentId,baseRevision:0,operationId:'ppt-add-slide',operations:[{op:'presentation.insertSlides',afterSlideId:first.state.deck.slides.at(-1).id,slides:[{id:'new-action-slide',slideNumber:2,elements:[],name:'行动建议'}]}]};
  await assert.rejects(h.s.editForAgent(actor(),{...batch,operationId:'out-of-canvas',operations:[{op:'presentation.insertSlides',afterSlideId:first.state.deck.slides.at(-1).id,slides:[{id:'bad-slide',slideNumber:2,elements:[{id:'bad',type:'text',x:1200,y:40,width:160,height:40,text:'越界'}]}]}]}),/1280×720/);
  await assert.rejects(h.s.editForAgent(actor(),{...batch,operationId:'multi-page-rejected',operations:[{...batch.operations[0],slides:[...batch.operations[0].slides,{id:'second-content-page',slideNumber:3,elements:[]}]}]}),{code:'INVALID_INPUT'});
  assert.equal((await h.s.read(actor(),first.documentId)).revision,0);
  const receipt=await h.ctx.tools.get('content_edit').execute({input:batch},exec);assert.equal(receipt.revision,1);
  assert.equal((await h.s.read(actor(),first.documentId)).state.focusSlideId,'new-action-slide');
  assert.deepEqual(await h.s.editForAgent(actor(),batch),receipt);
  assert.ok((await h.s.pending(actor())).some(item=>item.documentId===first.documentId&&item.revision===1));
  await assert.rejects(h.s.read(actor('b'),first.documentId),{code:'FORBIDDEN'});
  await assert.rejects(h.s.read(actor('c'),first.documentId),{code:'FORBIDDEN'});
  await assert.rejects(h.s.editForAgent(actor(),{...batch,operationId:'stale'}),{code:'REVISION_CONFLICT'});
  const latest=await h.s.read(actor(),first.documentId),lease=await h.s.lease(actor(),first.documentId,'ppt-human','acquire');
  await assert.rejects(h.s.editForAgent(actor(),{...batch,baseRevision:1,operationId:'blocked'}),{code:'HUMAN_EDITING'});
  const deck=structuredClone(latest.state.deck);deck.slides.at(-1).name='用户编辑';
  const manual={documentId:first.documentId,baseRevision:1,operationId:'ppt-human-save',operations:[{op:'presentation.replaceDeck',deck}]};
  await h.s.editHuman(actor(),manual,{token:lease.lease.token,clientId:'ppt-human'});
  await h.s.lease(actor(),first.documentId,'ppt-human','release',lease.lease.token);
  await assert.rejects(h.s.editForAgent(actor(),{...manual,operationId:'whole-deck-agent',baseRevision:2}),{code:'INVALID_INPUT'});
  await h.s.editHuman(actor(),{...manual,baseRevision:2,operationId:'ppt-direct-save'},{token:'',clientId:'direct-presentation'});
  await assert.rejects(h.s.editHuman(actor(),{...manual,baseRevision:2,operationId:'ppt-direct-stale'},{token:'',clientId:'direct-presentation'}),{code:'REVISION_CONFLICT'});
  await h.ctx.fiber.dispose();h=await boot(root);
  const cold=await h.s.read(actor(),first.documentId);assert.equal(cold.kind,'presentation');assert.equal(cold.revision,3);assert.equal(cold.state.deck.slides.at(-1).name,'用户编辑');
  assert.equal((await h.s.read(actor(),first.documentId)).state.focusSlideId,'new-action-slide');
  assert.deepEqual(await h.s.editForAgent(actor(),batch),receipt);
  await assert.rejects(h.s.editForAgent(actor(),{documentId:first.documentId,baseRevision:3,operationId:'two-update-rejected',operations:cold.state.deck.slides.map(slide=>({op:'presentation.updateSlide',slideId:slide.id,patch:{name:'非法整批内容'}}))}),{code:'INVALID_INPUT'});
  const structural=await h.s.editForAgent(actor(),{documentId:first.documentId,baseRevision:3,operationId:'structural-batch',operations:[{op:'presentation.moveSlide',slideId:'new-action-slide',afterSlideId:null}]});
  assert.equal(structural.revision,4);
  assert.equal((await h.s.read(actor(),first.documentId)).state.focusSlideId,'new-action-slide');
 }finally{if(h)await h.ctx.fiber.dispose();await rm(root,{recursive:true,force:true});}
});


test("PPT export delivers committed native bytes, retries safely and rejects changed revisions", async () => {
  const {exportAndPresent}=await import(new URL("export.js",artifacts));
  const {createPresentation}=await import(new URL("native-deck.js",artifacts));
  const {execFile}=await import("node:child_process");
  const {promisify}=await import("node:util");
  const {readFile,writeFile}=await import("node:fs/promises");
  const home=await mkdtemp(join(tmpdir(),"office-ppt-export-"));
  const deck=await createPresentation("最终交付");
  const snapshot={documentId:"ppt-export-test",kind:"presentation",title:"最终交付",revision:3,state:{deck},generation:"test"};
  const calls=[];
  const ctx={tools:{get:()=>true,execute:async input=>{
    calls.push(input);
    if(input.name==="bash"){
      try{const {stdout}=await promisify(execFile)(process.execPath,["-e",input.arguments.command.slice(9,-1)],{cwd:home});return {content:[{type:"text",text:stdout}]};}
      catch{return {isError:true,content:[]};}
    }
    return {content:[]};
  }}};
  const exec={agent:{},signal:new AbortController().signal,callId:"export-test",deferContext:()=>{}};
  try{
    const first=await exportAndPresent(ctx,exec,snapshot,3);
    assert.match(first.path,/\.pptx$/);
    assert.equal(first.status,"presented");
    assert.deepEqual(await readFile(join(home,first.path)),Buffer.from(deck.bytes,"base64"));
    assert.equal(calls.at(-1).name,"present");
    assert.equal(calls.at(-1).arguments.files[0].path,first.path);
    assert.equal((await exportAndPresent(ctx,exec,snapshot,3)).path,first.path);
    const before=calls.length;
    await assert.rejects(()=>exportAndPresent(ctx,exec,snapshot,2),/REVISION_CONFLICT/);
    assert.equal(calls.length,before);
    await writeFile(join(home,first.path),"changed");
    await assert.rejects(()=>exportAndPresent(ctx,exec,snapshot,3),/未交付文件/);
    assert.equal(await readFile(join(home,first.path),"utf8"),"changed");
  }finally{await rm(home,{recursive:true,force:true});}
});


test("Excel live service persists batches, fences human edits, and delivers actual XLSX",async()=>{
 const root=await mkdtemp(join(tmpdir(),"office-excel-live-"));let h;
 const {spreadsheetXlsx}=await import(new URL("spreadsheet-xlsx.js",artifacts));
 const {default:ExcelJS}=await import(pathToFileURL(officeRequire.resolve("exceljs")).href);
 try{
  h=await boot(root);const exec={signal:new AbortController().signal,agent:{id:"session-a"}};
  const first=await h.ctx.tools.get("content_open").execute({input:{source:"new",kind:"spreadsheet",title:"销售日报",operationId:"excel-create"}},exec);
  assert.equal(first.kind,"spreadsheet");assert.deepEqual(first.state.sheetOrder,["sheet-1"]);
  assert.ok((await h.s.pending(actor())).some(r=>r.documentId===first.documentId));
  const batch={documentId:first.documentId,baseRevision:0,operationId:"excel-values",operations:[{op:"spreadsheet.setCells",sheetId:"sheet-1",cells:[{address:"A1",cell:{value:"收入"}},{address:"A2",cell:{value:7}},{address:"B2",cell:{value:3}},{address:"C2",cell:{formula:"=SUM(A2:B2)"}}]}]};
  const receipt=await h.ctx.tools.get("content_edit").execute({input:batch},exec);assert.equal(receipt.revision,1);assert.deepEqual(await h.s.editForAgent(actor(),batch),receipt);
  await assert.rejects(h.s.editForAgent(actor(),{...batch,operationId:"stale"}),{code:"REVISION_CONFLICT"});
  const add={documentId:first.documentId,baseRevision:1,operationId:"excel-second-sheet",operations:[{op:"spreadsheet.addSheet",sheetId:"summary",name:"汇总"},{op:"spreadsheet.setCells",sheetId:"summary",cells:[{address:"A1",cell:{formula:"='工作表1'!C2"}}]}]};
  await h.s.editForAgent(actor(),add);
  for(const p of ["b","c"])await assert.rejects(h.s.read(actor(p),first.documentId),{code:"FORBIDDEN"});
  const lease=await h.s.lease(actor(),first.documentId,"excel-human","acquire");
  await assert.rejects(h.s.editForAgent(actor(),{...batch,baseRevision:2,operationId:"lease-blocked"}),{code:"HUMAN_EDITING"});
  const state=structuredClone((await h.s.read(actor(),first.documentId)).state);state.sheets["sheet-1"].cells.A2={value:9};
  const manual={documentId:first.documentId,baseRevision:2,operationId:"excel-human-save",operations:[{op:"spreadsheet.replaceState",state}]};
  await h.s.editHuman(actor(),manual,{token:lease.lease.token,clientId:"excel-human"});
  await h.s.lease(actor(),first.documentId,"excel-human","release",lease.lease.token);
  await assert.rejects(h.s.editForAgent(actor(),{...manual,baseRevision:3,operationId:"whole-state-agent"}),{code:"INVALID_INPUT"});
  await assert.rejects(h.s.editForAgent(actor(),{...batch,baseRevision:3,operationId:"out-of-range",operations:[{op:"spreadsheet.setCells",sheetId:"sheet-1",cells:[{address:"CW1",cell:{value:4}}]}]}),{code:"INVALID_INPUT"});
  assert.equal((await h.s.read(actor(),first.documentId)).revision,3);
  const latest=await h.s.read(actor(),first.documentId);const bytes=await spreadsheetXlsx(latest);assert.deepEqual(bytes,await spreadsheetXlsx(latest));
  const wb=new ExcelJS.Workbook();await wb.xlsx.load(bytes);assert.equal(wb.worksheets.length,2);assert.equal(wb.getWorksheet("工作表1").getCell("A2").value,9);assert.equal(wb.getWorksheet("工作表1").getCell("C2").formula,"SUM(A2:B2)");assert.equal(wb.getWorksheet("汇总").getCell("A1").formula,"'工作表1'!C2");
  const {exportAndPresent}=await import(new URL("export.js",artifacts));const calls=[];const delivery={tools:{get:()=>true,execute:async input=>{calls.push(input);if(input.name==="bash"){const marker=/OFFICE_EXPORTED_[a-z0-9-]+/.exec(input.arguments.command)[0];return {content:[{type:"text",text:marker}]};}return {content:[]};}}};
  const file=await exportAndPresent(delivery,{agent:{},signal:new AbortController().signal,callId:"excel-export",deferContext(){}},latest,3);assert.match(file.path,/\.xlsx$/);assert.equal(calls.at(-1).name,"present");
  await h.ctx.fiber.dispose();h=await boot(root);const cold=await h.s.read(actor(),first.documentId);assert.equal(cold.kind,"spreadsheet");assert.equal(cold.state.sheets["sheet-1"].cells.A2.value,9);assert.deepEqual(await h.s.editForAgent(actor(),batch),receipt);
 }finally{if(h)await h.ctx.fiber.dispose();await rm(root,{recursive:true,force:true});}
});

test("Univer working-copy mapping preserves formulas and refuses lossy manual formatting",async()=>{
 const {univerSnapshot,stateFromUniver}=await import(new URL("spreadsheet-adapter.js",artifacts));
 const state={modelVersion:1,sheetOrder:["s1"],sheets:{s1:{sheetId:"s1",name:"Sheet1",cells:{A1:{value:"类别"},B2:{formula:"=SUM(C2:D2)"}}}}};
 const native=univerSnapshot(state,"test","测试"),baseline=structuredClone(native);native.sheets.s1.cellData[1][1].v=10;
 assert.deepEqual(stateFromUniver(native,baseline),state);
 native.sheets.s1.cellData[0][0].s={bl:1};assert.throws(()=>stateFromUniver(native,baseline),/格式/);
});

test("HTML opens live, commits revisions atomically, and persists across restart",async()=>{
 const root=await mkdtemp(join(tmpdir(),"office-html-live-"));let h;
 try{h=await boot(root);const exec={signal:new AbortController().signal,agent:{id:"session-a"}};
 const first=await h.ctx.tools.get("content_open").execute({input:{source:"new",kind:"html",title:"预算看板",operationId:"html-create"}},exec);
 assert.equal(first.kind,"html");assert.ok((await h.s.pending(actor())).some(r=>r.documentId===first.documentId));
 const html='<!doctype html><html><body><h1>预算分析</h1><script>document.body.dataset.ready="yes"</script></body></html>';
 const batch={documentId:first.documentId,baseRevision:0,operationId:"html-first",operations:[{op:"html.replaceDocument",html}]};
 const receipt=await h.ctx.tools.get("content_edit").execute({input:batch},exec);assert.equal(receipt.revision,1);assert.deepEqual(await h.s.editForAgent(actor(),batch),receipt);
 await assert.rejects(h.s.editForAgent(actor(),{...batch,operationId:"html-stale"}),{code:"REVISION_CONFLICT"});
 await assert.rejects(h.s.read(actor("b"),first.documentId),{code:"FORBIDDEN"});
 assert.equal((h.s.projectForAgent(await h.s.read(actor(),first.documentId))).state.html,html);
 await h.ctx.fiber.dispose();h=await boot(root);assert.equal((await h.s.read(actor(),first.documentId)).state.html,html);
 }finally{await h?.ctx.fiber.dispose();await rm(root,{recursive:true,force:true});}
});

test('PDF opens live, persists pages and rejects stale, unauthorized and invalid edits',async()=>{
 const root=await mkdtemp(join(tmpdir(),'office-pdf-live-'));let h;
 try{h=await boot(root);const exec={signal:new AbortController().signal,agent:{id:'session-a'}};const first=await h.ctx.tools.get('content_open').execute({input:{source:'new',kind:'pdf',title:'预算分析报告',operationId:'pdf-new'}},exec);assert.equal(first.kind,'pdf');assert.ok((await h.s.pending(actor())).some(r=>r.documentId===first.documentId));
 const page=structuredClone(first.state.pages[0]);page.elements[1].text='年度预算：收入 1000 万元。缺失参数待确认。';const batch={documentId:first.documentId,baseRevision:0,operationId:'pdf-page1',operations:[{op:'pdf.updatePage',pageId:page.id,page}]};const receipt=await h.ctx.tools.get('content_edit').execute({input:batch},exec);assert.equal(receipt.revision,1);assert.deepEqual(await h.s.editForAgent(actor(),batch),receipt);
 const second={...structuredClone(page),id:'page-2'};second.elements[0].text='明日计划';await h.s.editForAgent(actor(),{documentId:first.documentId,baseRevision:1,operationId:'pdf-page2',operations:[{op:'pdf.insertPage',afterPageId:page.id,page:second}]});
 await assert.rejects(h.s.editForAgent(actor(),{...batch,operationId:'pdf-stale'}),{code:'REVISION_CONFLICT'});await assert.rejects(h.s.read(actor('b'),first.documentId),{code:'FORBIDDEN'});
 const overflow=structuredClone(page);overflow.elements[1].height=10;await assert.rejects(h.s.editForAgent(actor(),{...batch,baseRevision:2,operationId:'pdf-overflow',operations:[{op:'pdf.updatePage',pageId:page.id,page:overflow}]}),{code:'INVALID_INPUT'});assert.equal((await h.s.read(actor(),first.documentId)).revision,2);
 const lease=await h.s.lease(actor(),first.documentId,'pdf-human','acquire');await assert.rejects(h.s.editForAgent(actor(),{...batch,baseRevision:2,operationId:'pdf-leased'}),{code:'HUMAN_EDITING'});
 page.elements[1].text='用户确认：预算收入 1000 万元。';await h.s.editHuman(actor(),{...batch,baseRevision:2,operationId:'pdf-manual',operations:[{op:'pdf.updatePage',pageId:page.id,page}]},{token:lease.lease.token,clientId:'pdf-human'});await h.s.lease(actor(),first.documentId,'pdf-human','release',lease.lease.token);
 await h.ctx.fiber.dispose();h=await boot(root);const saved=await h.s.read(actor(),first.documentId);assert.equal(saved.revision,3);assert.equal(saved.state.pages[0].elements[1].text,page.elements[1].text);assert.equal(saved.state.pages[1].id,'page-2');
 }finally{await h?.ctx.fiber.dispose();await rm(root,{recursive:true,force:true});}
});


test("PPT style preview tool saves through Office permissions, retries durably and disposes", async()=>{
 const root=await mkdtemp(join(tmpdir(),"ppt-style-tool-"));let h;
 try {
  h=await boot(root);
  const tool=h.ctx.tools.get("content_preview_styles");assert.ok(tool);
  const exec={agent:{id:"session-a"},signal:new AbortController().signal,callId:"styles"};
  const args={title:"材料节点建设方案",family:"red",operationId:"styles-red"};
  const preview=await tool.execute(args,exec);
  assert.equal(preview.styles.length,4);assert.match(preview.styles[1].label,/科技红/);
  const saved=await h.s.read(actor(),preview.documentId,exec.signal);
  assert.equal(saved.kind,"html");assert.match(saved.state.html,/材料节点建设方案/);
  const again=await tool.execute(args,exec);assert.equal(again.documentId,preview.documentId);
  assert.equal((await h.s.read(actor(),preview.documentId,exec.signal)).revision,saved.revision);
  await assert.rejects(h.s.read(actor("c"),preview.documentId,exec.signal));
  const cancelled=new AbortController();cancelled.abort();
  await assert.rejects(tool.execute({...args,operationId:"cancelled"},{...exec,signal:cancelled.signal}));
  await h.toolFiber.dispose();assert.equal(h.ctx.tools.get("content_preview_styles"),undefined);
 }finally{if(h)await h.ctx.fiber.dispose();await rm(root,{recursive:true,force:true});}
});


test("PPTX import uses Harness fs, preserves package and supports template text edits",async()=>{
 const root=await mkdtemp(join(tmpdir(),"ppt-template-import-"));let h;
 try{
  const {createPresentation}=await import(new URL("native-deck.js",artifacts));
  const template=await createPresentation("单位标准模板");
  let bytes=Buffer.from(template.bytes,"base64");let reads=0;
  const target={targetKey:"opaque-template"};
  h=await boot(root,{resolve:async(path,opts)=>{assert.equal(path,"templates/company.pptx");assert.equal(opts.cwd,"/workspace");return target;},readBytes:async(t,signal,cap)=>{assert.equal(t,target);assert.equal(cap,8*1024*1024);reads++;return bytes;}});
  const exec={signal:new AbortController().signal,agent:{id:"session-a",session:{header:{cwd:"/workspace"}}}};
  const args={path:"templates/company.pptx",title:"客户汇报",operationId:"template-import"};
  const tool=h.ctx.tools.get("content_import_pptx");
  const first=await tool.execute(args,exec);const full=await h.s.read(actor(),first.documentId);
  assert.equal(full.state.deck.bytes,template.bytes);assert.equal(first.state.deck.bytes,undefined);
  assert.equal(full.state.deck.slides.length,template.slides.length);
  assert.ok((await h.s.pending(actor())).some(p=>p.documentId===first.documentId));
  assert.deepEqual(await tool.execute(args,exec),first);assert.equal(reads,2);
  await assert.rejects(h.s.read(actor("b"),first.documentId),{code:"FORBIDDEN"});
  await assert.rejects(h.s.read(actor("c"),first.documentId),{code:"FORBIDDEN"});
  const slide=full.state.deck.slides.find(s=>s.elements.some(e=>e.text==="单位标准模板"));
  const element=slide.elements.find(e=>e.text==="单位标准模板");
  const batch={documentId:first.documentId,baseRevision:0,operationId:"template-title",operations:[{op:"presentation.updateText",slideId:slide.id,elementId:element.id,expectedText:element.text,text:"客户项目实际内容"}]};
  await h.s.editForAgent(actor(),batch);
  const edited=await h.s.read(actor(),first.documentId);
  const result=edited.state.deck.slides.find(s=>s.id===slide.id).elements.find(e=>e.id===element.id);
  assert.equal(result.text,"客户项目实际内容");assert.equal(result.x,element.x);assert.deepEqual(result.textStyle,element.textStyle);
  const {PptxHandler}=await import(officeRequire.resolve("pptx-viewer-core"));const handler=new PptxHandler();
  const loaded=await handler.load(Uint8Array.from(Buffer.from(edited.state.deck.bytes,"base64")).buffer);
  assert.ok(loaded.slides.some(s=>s.elements.some(e=>e.text==="客户项目实际内容")));
  assert.deepEqual(bytes,Buffer.from(template.bytes,"base64"));
  await assert.rejects(h.s.editForAgent(actor(),{...batch,baseRevision:1,operationId:"wrong-current-text"}),{code:"REVISION_CONFLICT"});
  await assert.rejects(h.s.editForAgent(actor(),{...batch,operationId:"stale-text"}),{code:"REVISION_CONFLICT"});
  bytes=Buffer.from((await createPresentation("另一个模板")).bytes,"base64");
  await assert.rejects(tool.execute(args,exec),{code:"IDEMPOTENCY_MISMATCH"});
  await assert.rejects(h.s.open(actor(),{source:"pptx",kind:"presentation",title:"坏文件",operationId:"bad-template",bytes:Buffer.from("not-pptx").toString("base64")}));
  const abort=new AbortController();abort.abort();await assert.rejects(tool.execute({...args,operationId:"aborted-import"},{...exec,signal:abort.signal}));
 }finally{await h?.ctx.fiber.dispose();await rm(root,{recursive:true,force:true});}
});


test("Large template browser saves are accepted only for authorized PPT documents",async()=>{
 const root=await mkdtemp(join(tmpdir(),"ppt-template-rpc-"));let h;
 try{
  h=await boot(root);
  const {createPresentation}=await import(new URL("native-deck.js",artifacts));
  const template=await createPresentation("标准模板");
  const JSZip=(await import(officeRequire.resolve("jszip"))).default;
  const zip=await JSZip.loadAsync(Buffer.from(template.bytes,"base64"));
  zip.file("customXml/workdsh-padding.bin",Buffer.alloc(2*1024*1024,7));
  const bytes=(await zip.generateAsync({type:"nodebuffer",compression:"STORE"})).toString("base64");
  const first=await h.s.open(actor(),{source:"pptx",kind:"presentation",title:"大模板",operationId:"large-template",bytes});
  let endpoint;
  h.ctx.provide("connection",{fetch:{register:spec=>{endpoint=spec;return()=>{};}}});
  await h.ctx.plugin(await import(new URL("connection.js",artifacts)));
  const envelope={sessionId:"session-a",request:{endpoint:"edit",input:{documentId:first.documentId,baseRevision:0,operationId:"large-browser-save",operations:[{op:"presentation.replaceDeck",deck:first.state.deck}]}}};
  const body=JSON.stringify(envelope);assert.ok(Buffer.byteLength(body)>1500000);
  const send=async(text)=> (await endpoint.fetch(new Request("http://local/api/workdsh-office",{method:"POST",body:text}))).json();
  const saved=await send(body);assert.equal(saved.ok,true);assert.equal(saved.value.revision,1);
  assert.deepEqual(await send(body),saved);
  const forbidden=await send(JSON.stringify({...envelope,sessionId:"session-b"}));assert.equal(forbidden.error.code,"FORBIDDEN");
  const ordinary=JSON.stringify({sessionId:"session-a",request:{endpoint:"open",input:{source:"new",title:"普通 Word",operationId:"too-large-word"}}})+" ".repeat(1600000);
  assert.equal((await send(ordinary)).error.code,"LIMIT_REACHED");
 }finally{await h?.ctx.fiber.dispose();await rm(root,{recursive:true,force:true});}
});


test("Native snapshots stay aligned with committed PPTX after repeated saves",async()=>{
 const {createPresentation,applyPresentation}=await import(new URL("native-deck.js",artifacts));
 const {PptxHandler}=await import(officeRequire.resolve("pptx-viewer-core"));
 let deck=await createPresentation("标准模板标题");
 const slide=deck.slides.find(s=>s.elements.some(e=>e.text==="标准模板标题"));
 const element=slide.elements.find(e=>e.text==="标准模板标题");
 deck=await applyPresentation(deck,[{op:"presentation.updateText",slideId:slide.id,elementId:element.id,expectedText:element.text,text:"实际项目标题"}]);
 for(let i=0;i<3;i++){
  deck=await applyPresentation(deck,[{op:"presentation.replaceDeck",deck}]);
  const native=await new PptxHandler().load(Uint8Array.from(Buffer.from(deck.bytes,"base64")).buffer);
  for(let index=0;index<deck.slides.length;index++){
   assert.equal(deck.slides[index].nativeId,native.slides[index].id);
   const fields=s=>s.elements.map(e=>({id:e.id,type:e.type,text:e.text,x:e.x,y:e.y,width:e.width,height:e.height,color:e.textStyle?.color,segments:e.textSegments?.map(r=>({text:r.text,color:r.style?.color}))}));
   assert.deepEqual(fields(deck.slides[index]),fields(native.slides[index]));
  }
  assert.ok(native.slides.some(s=>s.elements.some(e=>e.text==="实际项目标题")));
 }
});


test("Authored RGB text survives an inherited theme reference on save",async()=>{
 const {createPresentation,applyPresentation}=await import(new URL("native-deck.js",artifacts));
 let deck=await createPresentation("颜色保真");
 const slide=deck.slides.find(s=>s.elements.some(e=>e.text==="颜色保真"));
 const element=slide.elements.find(e=>e.text==="颜色保真");
 const colorXml={"a:srgbClr":{"@_val":"D6000F"}};
 const colorRef={scheme:"tx1"};
 const style={...element.textStyle,color:"#D6000F",colorXml,colorRef,authoredRunStyle:{colorXml},inheritedRunStyle:{colorRef}};
 element.textStyle=style;element.textSegments=[{text:element.text,style}];
 deck=await applyPresentation(deck,[{op:"presentation.updateText",slideId:slide.id,elementId:element.id,expectedText:element.text,text:"目录红色"}]);
 for(let i=0;i<2;i++){
  const actual=deck.slides.flatMap(s=>s.elements).find(e=>e.text==="目录红色");
  assert.equal(actual.textStyle.color.toUpperCase(),"#D6000F");
  deck=await applyPresentation(deck,[{op:"presentation.replaceDeck",deck}]);
 }
});


test("Large template PPTX exports through bounded commands without changing package bytes",async()=>{
 const {exportAndPresent}=await import(new URL("export.js",artifacts));
 const {createPresentation}=await import(new URL("native-deck.js",artifacts));
 const {default:JSZip}=await import(officeRequire.resolve("jszip"));
 const {execFile}=await import("node:child_process");
 const {promisify}=await import("node:util");
 const {readFile}=await import("node:fs/promises");
 const home=await mkdtemp(join(tmpdir(),"office-large-ppt-export-"));
 const deck=await createPresentation("客户模板");
 const zip=await JSZip.loadAsync(Buffer.from(deck.bytes,"base64"));
 zip.file("customXml/large-template.bin",Buffer.alloc(1750695,77));
 const bytes=await zip.generateAsync({type:"nodebuffer",compression:"STORE"});deck.bytes=bytes.toString("base64");
 const snapshot={documentId:"large-ppt",kind:"presentation",title:"大模板",revision:22,state:{deck},generation:"test"};
 const calls=[];let denied=false;
 const ctx={tools:{get:()=>true,execute:async input=>{
  calls.push(input);
  if(input.name!=="bash")return {content:[]};
  assert.ok(Buffer.byteLength(input.arguments.command)<(process.platform==='win32'?30000:100000));
  if(denied)return {isError:true,content:[{type:"text",text:"denied"}]};
  const {stdout}=await promisify(execFile)(process.execPath,["-e",input.arguments.command.slice(9,-1)],{cwd:home});
  return {content:[{type:"text",text:stdout}]};
 }}};
 const exec={agent:{},signal:new AbortController().signal,callId:"large-export",deferContext(){}};
 try{
  const first=await exportAndPresent(ctx,exec,snapshot,22);
  assert.deepEqual(await readFile(join(home,first.path)),bytes);
  assert.ok(calls.filter(c=>c.name==="bash").length>10);
  assert.equal(calls.at(-1).name,"present");
  assert.equal((await exportAndPresent(ctx,exec,snapshot,22)).path,first.path);
  denied=true;const start=calls.length;
  await assert.rejects(()=>exportAndPresent(ctx,exec,snapshot,22),/未交付文件/);
  assert.equal(calls.slice(start).some(c=>c.name==="present"),false);
 }finally{await rm(home,{recursive:true,force:true});}
});


test("Template page expansion revives runtime image handles without duplicating backgrounds",async()=>{
 const {createPresentation,importPresentation,applyPresentation}=await import(new URL("native-deck.js",artifacts));
 const {default:JSZip}=await import(officeRequire.resolve("jszip"));
 const source=await createPresentation("背景保真");
 const zip=await JSZip.loadAsync(Buffer.from(source.bytes,"base64"));
 const image=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP1sAAAAASUVORK5CYII=","base64");
 zip.file("ppt/media/template-background.png",image);
 const slide=source.slides[0].nativeId;
 const xml=await zip.file(slide).async("string");
 zip.file(slide,xml.replace(/<p:cSld([^>]*)>/,'<p:cSld$1><p:bg><p:bgPr><a:blipFill><a:blip r:embed="rIdTemplateImage"/><a:stretch><a:fillRect/></a:stretch></a:blipFill><a:effectLst/></p:bgPr></p:bg>'));
 const rel=slide.replace("/slides/","/slides/_rels/")+".rels";
 const relXml=await zip.file(rel).async("string");
 zip.file(rel,relXml.replace("</Relationships>",'<Relationship Id="rIdTemplateImage" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/template-background.png"/></Relationships>'));
 const ct=await zip.file("[Content_Types].xml").async("string");
 if(!/Extension="png"/.test(ct))zip.file("[Content_Types].xml",ct.replace("</Types>",'<Default Extension="png" ContentType="image/png"/></Types>'));
 let deck=await importPresentation("背景保真",(await zip.generateAsync({type:"nodebuffer"})).toString("base64"));
 assert.match(deck.slides[0].backgroundImage,/^blob:/);
 // A handle from a previous Host process is unavailable; package bytes own its image.
 deck.slides[0].backgroundImage="blob:nodedata:previous-host-process";
 const originalSize=Buffer.from(deck.bytes,"base64").length;
 for(let i=0;i<8;i++){
  deck=await applyPresentation(deck,[{op:"presentation.insertSlides",afterSlideId:deck.slides.at(-1).id,slides:[{id:"body-test-"+i,slideNumber:deck.slides.length+1,elements:[]}]}]);
  const saved=await JSZip.loadAsync(Buffer.from(deck.bytes,"base64"));
  assert.equal(Object.values(saved.files).filter(f=>f.name.startsWith("ppt/media/")&&!f.dir).length,1);
  assert.deepEqual(Buffer.from(await saved.file("ppt/media/template-background.png").async("uint8array")),image);
  assert.ok(Buffer.from(deck.bytes,"base64").length<originalSize+40000);
 }
 const title=deck.slides[0].elements.find(e=>e.text==="背景保真");
 deck=await applyPresentation(deck,[{op:"presentation.updateText",slideId:deck.slides[0].id,elementId:title.id,expectedText:title.text,text:"blob: is literal text"}]);
 assert.ok(deck.slides[0].elements.some(e=>e.text==="blob: is literal text"));
});
