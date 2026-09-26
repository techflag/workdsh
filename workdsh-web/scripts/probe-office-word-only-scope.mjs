// Office release-scope probe: builds both the normal and the --word-only Client
// bundle and loads each one against a mock Cordis context. The word-only artifact
// must register the DOCX preview/tab only (dist/release-scope.json: ["docx"]);
// the normal artifact must additionally register the CSV preview/tab. The normal
// build runs last so dist/ ends in the standard state.
import { spawnSync } from "node:child_process";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = fileURLToPath(new URL("../", import.meta.url));
const officeDist = fileURLToPath(new URL("../packages/plugins/office/dist/", import.meta.url));
const out = fileURLToPath(new URL("../.artifacts/office-word-only-scope/", import.meta.url));
await mkdir(out, { recursive: true });

// The word-only build writes every bundle before the license gate runs; a
// pre-existing missing-license block is recorded, not treated as a probe failure.
function build(wordOnly) {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL("build-office.mjs", import.meta.url)), ...(wordOnly ? ["--word-only"] : [])], { cwd: root, encoding: "utf8" });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status === 0) return "built";
  const stderr = result.stderr ?? "";
  if (wordOnly && stderr.includes("Word release has missing license texts; packaging is blocked.")) return "license-gate-blocked";
  throw new Error(`office build failed (wordOnly=${wordOnly})`);
}

const require = createRequire(new URL("../packages/plugins/office/package.json", import.meta.url));

// pdf.js constructs a scale matrix at module init (SCALE_MATRIX); the probe
// never renders, so a minimal standalone matrix stand-in is enough to load.
class DOMMatrixStub {
  constructor(init) {
    const m = Array.isArray(init) || ArrayBuffer.isView(init) ? init : [1, 0, 0, 1, 0, 0];
    this.a = m[0]; this.b = m[1]; this.c = m[2]; this.d = m[3]; this.e = m[4]; this.f = m[5];
  }
  translate(x = 0, y = 0) { this.e += x; this.f += y; return this; }
  scale(x = 1, y = x) { this.a *= x; this.b *= x; this.c *= y; this.d *= y; return this; }
  multiplySelf() { return this; }
  preMultiplySelf() { return this; }
  invertSelf() { return this; }
}

const stubNode = () => ({ style: {}, appendChild() {}, removeChild() {}, insertBefore() {}, setAttribute() {}, addEventListener() {}, removeEventListener() {} });

async function smoke(label) {
  const source = await readFile(officeDist + "client.browser.js", "utf8");
  const previews = [], slots = [], cleanups = [];
  const run = fn => { const done = fn(); if (typeof done === "function") cleanups.push(done); };
  let plugin;
  const mockScope = {
    effect: run,
    workdshLibraryPreview: { register: () => () => {} },
  };
  const ctx = {
    inject: (_deps, callback) => callback(mockScope),
    effect: run,
    slots: {
      inject: (_key, callback) => { callback(); },
      register: (definition) => { slots.push(definition.key ?? definition.id); return () => {}; },
    },
    documentPreviews: {
      register: definition => {
        previews.push({ id: definition.id, extensions: [...definition.extensions], wrap: definition.wrap ?? false });
        return () => {};
      },
    },
    sidebarRightTabs: { register: () => () => {} },
    sidebarRight: {},
    sessions: { list: { getSnapshot: () => ({ byId: {} }) } },
    uiConversation: {},
    inputTriggers: { registerSource: () => () => {} },
  };
  // Bundled web libraries (pdf/pptx tooling) touch DOM classes during module
  // init; expose the Node-native ones on the sandbox global.
  const domGlobals = {
    DOMException, Event, EventTarget, Blob, File, FormData, Headers, Request, Response,
    MessageChannel: globalThis.MessageChannel, MessagePort: globalThis.MessagePort,
    AbortController, AbortSignal, DOMMatrix: DOMMatrixStub,
  };
  const sandbox = {
    document: {
      visibilityState: "hidden",
      documentElement: stubNode(),
      head: stubNode(),
      body: stubNode(),
      createElement: () => stubNode(),
      createTextNode: () => ({}),
      createDocumentFragment: () => stubNode(),
      addEventListener() {}, removeEventListener() {},
    },
    console, process, setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask,
    URL, URLSearchParams, TextEncoder, TextDecoder,
    crypto: globalThis.crypto, performance: globalThis.performance, structuredClone,
    navigator: { userAgent: "workdsh-probe" },
    fetch: async () => { throw new Error("network is not expected in this probe"); },
    ...domGlobals,
  };
  // In a browser window === globalThis; bundled libraries probe window.Array,
  // window.MessageChannel, ... so the sandbox global must stand in for both.
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.__ModuleLoader__ = { load: spec => { plugin = spec.factory(require); } };
  vm.runInNewContext(source, sandbox, { filename: `client.browser.js (${label})` });
  if (!plugin || typeof plugin.apply !== "function") throw new Error(`${label}: built bundle did not export apply()`);
  plugin.apply(ctx);
  for (const cleanup of cleanups) cleanup();
  return { label, previews, slots };
}

function verify(wordOnly, result) {
  const failures = [];
  const officePreview = result.previews.find(row => row.id === "workdsh-office");
  const csvPreview = result.previews.find(row => row.id === "workdsh-office-csv");
  const expectedExtensions = wordOnly ? ["docx"] : ["xlsx", "docx", "pptx"];
  if (!officePreview) failures.push(`${result.label}: workdsh-office preview not registered`);
  else if (JSON.stringify(officePreview.extensions) !== JSON.stringify(expectedExtensions)) failures.push(`${result.label}: workdsh-office extensions ${JSON.stringify(officePreview.extensions)} != ${JSON.stringify(expectedExtensions)}`);
  if (!result.slots.includes("workdsh-office")) failures.push(`${result.label}: workdsh-office tab slot not registered`);
  if (wordOnly) {
    if (csvPreview) failures.push(`${result.label}: CSV preview still registered`);
    if (result.slots.includes("workdsh-office-csv")) failures.push(`${result.label}: CSV tab slot still registered`);
  } else {
    if (!csvPreview) failures.push(`${result.label}: CSV preview missing`);
    else if (JSON.stringify(csvPreview.extensions) !== JSON.stringify(["csv"]) || csvPreview.wrap !== true) failures.push(`${result.label}: CSV preview definition drifted ${JSON.stringify(csvPreview)}`);
    if (!result.slots.includes("workdsh-office-csv")) failures.push(`${result.label}: CSV tab slot missing`);
  }
  return failures;
}

const failures = [];
const bundlePath = officeDist + "client.browser.js";
const bundleBefore = (await stat(bundlePath)).mtimeMs;
let wordOnlyResult;
try {
  const wordOnlyBuild = build(true);
  const bundleAfter = (await stat(bundlePath)).mtimeMs;
  if (bundleAfter <= bundleBefore) throw new Error("word-only build did not write a fresh client.browser.js");
  wordOnlyResult = await smoke("word-only");
  wordOnlyResult.build = wordOnlyBuild;
  if (wordOnlyBuild === "license-gate-blocked") console.log("NOTE: word-only packaging stays license-gate blocked (pre-existing); probing the written Client bundle");
  wordOnlyResult.releaseScope = JSON.parse(await readFile(officeDist + "release-scope.json", "utf8"));
  if (wordOnlyResult.releaseScope.wordOnly !== true || JSON.stringify(wordOnlyResult.releaseScope.fileExtensions) !== JSON.stringify(["docx"]))
    failures.push(`word-only release-scope.json mismatch: ${JSON.stringify(wordOnlyResult.releaseScope)}`);
  else console.log(`PASS: word-only build declares scope ${JSON.stringify(wordOnlyResult.releaseScope.fileExtensions)}`);
  failures.push(...verify(true, wordOnlyResult));
  if (!failures.length) console.log("PASS: word-only Client bundle registers the DOCX preview/tab only");
} finally {
  // Always rebuild the normal artifact so a failing word-only smoke cannot
  // leave dist/ in the reduced build state.
  build(false);
}

const normalResult = await smoke("normal");
normalResult.releaseScope = JSON.parse(await readFile(officeDist + "release-scope.json", "utf8"));
if (normalResult.releaseScope.wordOnly !== false) failures.push(`normal release-scope.json mismatch: ${JSON.stringify(normalResult.releaseScope)}`);
failures.push(...verify(false, normalResult));
if (failures.length === 0) console.log("PASS: normal Client bundle keeps the CSV preview/tab");

await writeFile(out + "result.json", JSON.stringify({
  generatedAt: new Date().toISOString(),
  wordOnly: wordOnlyResult,
  normal: normalResult,
  failures,
}, null, 2) + "\n");
if (failures.length) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  console.error(`Evidence: ${out}result.json`);
  process.exit(1);
}
console.log(`PASS: office release scope matches release-scope.json in both artifacts (evidence: ${out}result.json)`);
