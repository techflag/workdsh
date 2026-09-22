import './scope-pptx-native.mjs';
import {nativePptPlugin} from './build-pptx-native.mjs';
import { build } from "esbuild";
import {createHash} from "node:crypto";
import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = new URL("../packages/plugins/office/", import.meta.url);
const wordOnly = process.argv.includes("--word-only");
await mkdir(new URL("dist/", root), { recursive: true });
const font=await readFile(new URL("src/pdf/fonts/NotoSansSC.ttf",root));
const fontSource=JSON.parse(await readFile(new URL("src/pdf/fonts/source.json",root),"utf8"));
if(font.length!==fontSource.bytes||createHash("sha256").update(font).digest("hex")!==fontSource.sha256)throw Error("Bundled PDF font integrity mismatch");

// Word-only packages omit both the spreadsheet UI and its XLSX dependency.
const spreadsheetScope = {
  name: "spreadsheet-release-scope",
  setup(builder) {
    if (!wordOnly) return;
    builder.onResolve({filter: /spreadsheet\/(Page|xlsx)\.js$/}, args => ({path: args.path, namespace: "spreadsheet-disabled"}));
    builder.onLoad({filter: /.*/, namespace: "spreadsheet-disabled"}, () => ({
      contents: 'function unavailable(){throw new Error("Spreadsheet is unavailable in this release");} export {unavailable as LiveSpreadsheet, unavailable as spreadsheetXlsx, unavailable as downloadSpreadsheet};', loader: "js"
    }));
  }
};



const child = await build({
  metafile: true,
  entryPoints: [fileURLToPath(new URL(wordOnly ? "src/editor-word.ts" : "src/editor.ts", root))],
  bundle: true,
  write: false,
  outdir: "editor",
  format: "iife",
  platform: "browser",
  target: "es2022",
  loader: { ".woff": "dataurl", ".woff2": "dataurl", ".ttf": "dataurl" },
  define: { "process.env.NODE_ENV": '"production"', __WORKDSH_WORD_ONLY__: String(wordOnly) },
});
const js = child.outputFiles
  .find((f) => f.path.endsWith(".js"))
  .text.replace(/<\/script/gi, "<\\/script");
const css = child.outputFiles.find((f) => f.path.endsWith(".css"))?.text ?? "";
const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; img-src data: blob:; font-src data: blob:; connect-src 'none'; worker-src blob:"><style>${css}</style></head><body><header><span id="status" role="status">正在打开 Office 文件…</span><button id="info" aria-label="查看文件说明" aria-expanded="false" title="查看文件说明">ⓘ</button><button id="edit" hidden aria-expanded="false">编辑文字</button><button id="update" hidden>更新预览</button><button id="save" disabled>导出副本</button></header><main><div id="preview"></div><aside id="fields" hidden></aside></main><script>${js}</script></body></html>`;
await writeFile(new URL("dist/editor.html", root), html);
const client = await build({
  metafile: true,
  entryPoints: [fileURLToPath(new URL("src/client.tsx", root))],
  bundle: true,
  write: false,
  format: "cjs",
  platform: "browser",
  external: ["react", "react-dom", "react/jsx-runtime"],
  loader:{".css":"text"},
  define: { "process.env.NODE_ENV": '"production"', __WORKDSH_WORD_ONLY__: String(wordOnly) },
  plugins: [
    {name:"pdf-worker-source",setup(builder){builder.onLoad({filter:/pdf\.worker\.min\.mjs$/},async args=>({contents:await readFile(args.path,"utf8"),loader:"text"}));}},
    nativePptPlugin(),
    spreadsheetScope,
  ],
});
await writeFile(
  new URL("dist/client.browser.js", root),
  `window.__ModuleLoader__.load({id:"workdsh-plugin-office",factory:function(require){const module={exports:{}};${client.outputFiles[0].text}\nreturn module.exports;}});`,
);
// Everything too heavy for the startup bundle: the Host serves this artifact and
// the client shell injects it as the page-local module only when a document opens.
const runtime = await build({
  metafile: true,
  entryPoints: [fileURLToPath(new URL("src/runtime.tsx", root))],
  bundle: true,
  write: false,
  format: "cjs",
  platform: "browser",
  external: ["react", "react-dom", "react/jsx-runtime"],
  loader:{".css":"text"},
  define: { "process.env.NODE_ENV": '"production"', __WORKDSH_WORD_ONLY__: String(wordOnly) },
  plugins: [
    {name:"pdf-worker-source",setup(builder){builder.onLoad({filter:/pdf\.worker\.min\.mjs$/},async args=>({contents:await readFile(args.path,"utf8"),loader:"text"}));}},
    nativePptPlugin(),
    spreadsheetScope,
  ],
});
await writeFile(
  new URL("dist/office-runtime.js", root),
  `window.__ModuleLoader__.load({id:"workdsh-office-runtime",factory:function(require){const module={exports:{}};${runtime.outputFiles[0].text}\nreturn module.exports;}});`,
);
const host = await build({
  metafile: true,
  entryPoints: [fileURLToPath(new URL("src/index.ts", root))],
  bundle: true,
  external: ["@deepseek-ai/*", "exceljs"],
  loader:{".ttf":"binary"},
  plugins: [spreadsheetScope],
  format: "esm",
  define:{__WORKDSH_PRESENTATION_ENABLED__:String(!wordOnly),__WORKDSH_SPREADSHEET_ENABLED__:String(!wordOnly)},
  platform: "node",
  outfile: fileURLToPath(new URL("dist/index.js", root)),
});
// Ship notices from the actual bundled dependencies, including transitive SDK code.
const packages = new Map();
for (const result of [child, client, runtime, host])
  for (const input of Object.keys(result.metafile.inputs)) {
    if (!input.includes("node_modules/")) continue;
    let directory = dirname(resolve(input));
    while (directory !== dirname(directory)) {
      const manifest = await readFile(join(directory, "package.json"), "utf8")
        .then(JSON.parse)
        .catch(() => undefined);
      if (manifest?.name && manifest.version) {
        packages.set(directory, manifest);
        break;
      }
      directory = dirname(directory);
    }
  }
const notices = [],
  missingLicenseTexts = [];
for (const [directory, pkg] of [...packages].sort((a, b) =>
  a[1].name.localeCompare(b[1].name),
)) {
  const files = (await readdir(directory)).filter((name) =>
    /^(licen[cs]e|copying|notice)([.-]|$)/i.test(name),
  );
  // protocol's 0.25.1 tarball omits LICENSE; retain the verified same-tag upstream text.
  const texts =
    !files.length &&
    pkg.name === "@univerjs/protocol" &&
    pkg.version === "0.25.1"
      ? [await readFile(new URL("notices/univer-0.25.1-LICENSE", root), "utf8")]
      : await Promise.all(
          files.map((name) =>
            readFile(join(directory, name), "utf8").catch(() => ""),
          ),
        );
  // isarray 1.0.0 ships its complete MIT text in README.md rather than LICENSE.
  if (!texts.some(Boolean) && pkg.name === "isarray" && pkg.version === "1.0.0") {
    const readme = await readFile(join(directory, "README.md"), "utf8");
    const license = readme.split("## License\n")[1];
    if (license?.includes("Permission is hereby granted") && license.includes("SOFTWARE.")) texts.push(license);
  }
  if (!texts.some(Boolean)) {
    if (pkg.name.startsWith("@tiptap/"))
      throw new Error(`Missing new editor license: ${pkg.name}@${pkg.version}`);
    missingLicenseTexts.push({
      name: pkg.name,
      version: pkg.version,
      declaredLicense: pkg.license,
      repository: pkg.repository,
    });
    texts.push(
      "Upstream tarball does not include a license text. Release review remains required; metadata alone is not a substitute for permission.",
    );
  }
  notices.push(
    `${pkg.name}@${pkg.version} — ${typeof pkg.license === "string" ? pkg.license : JSON.stringify(pkg.license)}\n${texts.join("\n")}`,
  );
}
notices.push("Noto Sans SC (SIL Open Font License 1.1)\n"+await readFile(new URL("src/pdf/fonts/LICENSE",root),"utf8"));
await writeFile(
  new URL("dist/THIRD-PARTY-LICENSES.txt", root),
  notices.join("\n\n----------------------------------------\n\n") + "\n\nTiptap UI Components @ 799929bea4804c73767562b69f8acc2acdb8ac86\n" + await readFile(new URL("src/live/tiptap-ui/LICENSE", root), "utf8"),
);
await writeFile(
  new URL("dist/bundled-dependencies.json", root),
  JSON.stringify(
    [...packages.values()].map((p) => ({
      name: p.name,
      version: p.version,
      license: p.license,
    })),
    null,
    2,
  ) + "\n",
);
await writeFile(
  new URL("dist/license-review.json", root),
  JSON.stringify({ missingLicenseTexts }, null, 2) + "\n",
);
await writeFile(new URL("dist/release-scope.json", root), JSON.stringify({wordOnly, fileExtensions: wordOnly ? ["docx"] : ["docx", "xlsx", "pptx"]}, null, 2) + "\n");
if (wordOnly && missingLicenseTexts.length) throw new Error("Word release has missing license texts; packaging is blocked.");
