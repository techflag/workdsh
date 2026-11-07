/**
 * 网盘 DOCX 在线编辑器浏览器探针。
 *
 * 直接构建 office 运行时（含 React），在无 Host 的空白页里调用 mountDriveEditor，
 * 断言工具栏渲染、格式命令、查找替换、缩放、save/acknowledge 契约与 dispose 清理。
 * 产物写入 .artifacts/drive-docx-probe/。
 */
import { build } from "esbuild";
import { chromium } from "@playwright/test";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = new URL("../", import.meta.url);
const out = fileURLToPath(new URL("../.artifacts/drive-docx-probe/", import.meta.url));
await mkdir(out, { recursive: true });
const office = createRequire(new URL("../packages/plugins/office/package.json", import.meta.url));
const JSZip = office("jszip");
const { Document, Packer, Paragraph, TextRun } = createRequire(new URL("../package.json", import.meta.url))("docx");

const entry = out + "entry.tsx";
await writeFile(
  entry,
  `import { mountDriveEditor } from ${JSON.stringify(fileURLToPath(new URL("../packages/plugins/office/src/runtime.tsx", import.meta.url)))};\n` +
    `(window as unknown as { mountDriveEditor: unknown }).mountDriveEditor = mountDriveEditor;\n`,
);
const bundle = await build({
  entryPoints: [entry],
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  target: "es2022",
  jsx: "transform",
  logLevel: "silent",
  loader: { ".css": "text", ".ttf": "dataurl" },
  define: {
    "process.env.NODE_ENV": '"production"',
    __WORKDSH_PRESENTATION_ENABLED__: "true",
    __WORKDSH_SPREADSHEET_ENABLED__: "true",
  },
  plugins: [
    {
      name: "pdf-worker-source",
      setup(builder) {
        builder.onLoad({ filter: /pdf\.worker\.min\.mjs$/ }, async args => ({
          contents: await readFile(args.path, "utf8"),
          loader: "text",
        }));
      },
    },
    (await import("../scripts/build-pptx-native.mjs")).nativePptPlugin(),
  ],
});
const script = bundle.outputFiles[0].text;
const docx = await Packer.toBuffer(
  new Document({
    sections: [
      {
        children: [
          new Paragraph({ children: [new TextRun("Office Word test")] }),
          new Paragraph({ children: [new TextRun("Second paragraph")] }),
        ],
      },
    ],
  }),
);
const html =
  '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>html,body{margin:0;height:100%}#host{height:100%}</style></head>' +
  '<body><div id="host"></div><script src="/probe.js"></script></body></html>';

const browser = await chromium.launch({ headless: true });
const result = {};
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  // 127.0.0.1 是安全上下文，crypto.subtle 可用（导入 DOCX 需要）。
  await page.route("**/*", route => {
    const url = route.request().url();
    if (url === "http://127.0.0.1/")
      return route.fulfill({ contentType: "text/html", body: html });
    if (url === "http://127.0.0.1/probe.js")
      return route.fulfill({ contentType: "text/javascript", body: script });
    return route.abort();
  });
  await page.goto("http://127.0.0.1/");
  await page.waitForFunction(() => typeof window.mountDriveEditor === "function", null, { timeout: 60000 });
  await page.evaluate(async bytes => {
    window.__handle = await window.mountDriveEditor(document.getElementById("host"), {
      fileId: "file-1",
      revisionId: "rev-1",
      name: "probe.docx",
      bytes: new Uint8Array(bytes),
    });
  }, Array.from(docx));

  const toolbar = page.locator('[role="toolbar"][aria-label="文档编辑工具"]');
  await toolbar.waitFor({ timeout: 60000 });
  result.layout = await page.evaluate(() => {
    const bar = document.querySelector('[role="toolbar"][aria-label="文档编辑工具"]').getBoundingClientRect();
    const scroll = document.querySelector(".wd-office-paper-scroll").getBoundingClientRect();
    const paper = document.querySelector(".wd-office-paper").getBoundingClientRect();
    return { barHeight: bar.height, barTop: bar.top, scrollTop: scroll.top, scrollHeight: scroll.height, paperWidth: paper.width };
  });
  assert.ok(result.layout.barHeight > 20 && result.layout.barHeight <= 52, "toolbar row height " + result.layout.barHeight);
  assert.ok(result.layout.scrollTop >= result.layout.barTop + result.layout.barHeight - 1, "paper scroll starts below toolbar");
  assert.ok(result.layout.scrollHeight > 500, "paper scroll viewport " + result.layout.scrollHeight);
  assert.ok(result.layout.paperWidth > 700 && result.layout.paperWidth <= 800, "paper width " + result.layout.paperWidth);
  assert.equal(await page.locator(".wd-office-count").innerText(), "32 字符");

  // 加粗、字号、字体作用在同一选区。
  await toolbar.getByRole("button", { name: "全选" }).click();
  await toolbar.getByRole("button", { name: "加粗", exact: true }).click();
  assert.match(await page.locator(".wd-office-writing").innerHTML(), /<strong>/);
  await toolbar.getByLabel("字号").selectOption("18");
  await toolbar.getByLabel("字体").selectOption("黑体");
  const styled = await page.locator(".wd-office-writing").innerHTML();
  assert.match(styled, /font-size:\s*18pt/);
  assert.match(styled, /font-family:\s*黑体/);

  // 查找与替换。
  await toolbar.getByRole("button", { name: "查找与替换" }).click();
  const search = page.getByRole("search", { name: "文档查找替换" });
  await search.getByLabel("查找文字").fill("Office Word test");
  await search.getByLabel("替换为").fill("已修复");
  await search.getByRole("button", { name: "全部替换" }).click();
  await page.waitForFunction(() => document.querySelector('[role="search"] [role="status"]')?.textContent?.includes("已替换 1 处"));
  assert.match(await page.locator(".wd-office-writing").innerText(), /已修复/);
  await search.getByLabel("查找文字").fill("Second");
  await search.getByLabel("查找文字").press("Enter");
  await page.waitForFunction(() => document.querySelector('[role="search"] [role="status"]')?.textContent?.includes("找到 1 处"));
  await toolbar.getByRole("button", { name: "查找与替换" }).click();

  // 末尾新增段落并应用项目符号。
  await page.locator(".wd-office-writing").click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("列表项");
  await toolbar.getByRole("button", { name: "项目符号" }).click();
  assert.match(await page.locator(".wd-office-writing").innerHTML(), /<ul>/);

  // 缩放只作用于纸张。
  await toolbar.getByLabel("文档缩放").selectOption("125");
  result.zoom = await page.evaluate(() => {
    const paper = document.querySelector(".wd-office-paper");
    return { style: paper.style.zoom, width: paper.getBoundingClientRect().width };
  });
  assert.equal(result.zoom.style, "1.25");
  assert.ok(result.zoom.width > 900, "paper grew with zoom " + result.zoom.width);
  await toolbar.getByLabel("文档缩放").selectOption("100");

  // 保存契约：有改动导出字节，未 acknowledge 前重复保存仍导出，acknowledge 后无改动不导出。
  const first = await page.evaluate(async () => {
    const bytes = await window.__handle.save();
    return bytes ? Array.from(bytes) : null;
  });
  assert.ok(first && first.length > 1000, "save returns bytes");
  result.firstSaveBytes = first.length;
  const xml = await (await JSZip.loadAsync(Buffer.from(first))).file("word/document.xml").async("string");
  assert.match(xml, /已修复/);
  assert.match(xml, /<w:b\/>|<w:b /);
  assert.match(xml, /w:sz w:val="36"/);
  assert.match(xml, /<w:numPr>/);
  assert.ok(!xml.includes("Office Word test"), "replaced text removed from export");
  result.retryBytes = await page.evaluate(async () => (await window.__handle.save())?.length ?? 0);
  assert.ok(result.retryBytes > 1000, "repeat save before acknowledge still exports");
  assert.equal(
    await page.evaluate(async () => {
      window.__handle.acknowledge();
      return (await window.__handle.save()) ?? null;
    }),
    null,
    "no-op save after acknowledge",
  );
  await page.locator(".wd-office-writing").click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.type("追加");
  result.secondSaveBytes = await page.evaluate(async () => (await window.__handle.save())?.length ?? 0);
  assert.ok(result.secondSaveBytes > 1000, "edit after acknowledge exports again");

  await page.screenshot({ path: out + "editor.png" });
  await writeFile(out + "saved.docx", Buffer.from(first));

  // dispose 清理挂载点与工具栏监听。
  result.dispose = await page.evaluate(() => {
    window.__handle.dispose();
    const host = document.getElementById("host");
    return { children: host.children.length, html: host.innerHTML.length };
  });
  assert.deepEqual(result.dispose, { children: 0, html: 0 });
  assert.deepEqual(errors, []);
  result.pageErrors = errors;
  result.passed = true;
  console.log(JSON.stringify(result, null, 2));
  await writeFile(out + "result.json", JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
