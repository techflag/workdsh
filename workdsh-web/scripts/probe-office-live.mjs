import assert from "node:assert/strict";
import { spawn, execFile } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
  realpath,
  unlink,
  cp,
  copyFile,
} from "node:fs/promises";
import { tmpdir, homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { createRequire } from "node:module";
import { randomUUID,createHash } from "node:crypto";
import { chromium, expect } from "@playwright/test";

const root = fileURLToPath(new URL("..", import.meta.url));
const installFlags=process.argv.includes("--online-packages")?[]:["--offline"];
const pdfMode=process.argv.includes("--pdf");
const pptMode=process.argv.includes("--ppt");
const withPptSkills=process.argv.includes("--with-ppt-skills");
const packageRoundtrip = process.argv.includes("--package-roundtrip");
const inputOnly = process.argv.includes("--input-only") || packageRoundtrip;
const realRich = process.argv.includes("--real-rich");
const realModel = process.argv.includes("--real-model") || realRich;
const artifacts = join(
  root,
  pdfMode ? realModel ? ".artifacts/office-pdf-live-real" : ".artifacts/office-pdf-live" : pptMode ? realModel ? withPptSkills ? ".artifacts/office-ppt-live-real-skills" : ".artifacts/office-ppt-live-real" : ".artifacts/office-ppt-live" : inputOnly ? ".artifacts/office-input" : realModel ? ".artifacts/office-live-real" : ".artifacts/office-live",
);
let credential;
const home = await realpath(
  await mkdtemp(join(tmpdir(), "workdsh-office-live-")),
);
await mkdir(artifacts, { recursive: true });
const workspace = join(home, "workspace");
await mkdir(workspace);
await mkdir(join(home, "storages"));
const workspaceId = randomUUID();
const now = new Date().toISOString();
await writeFile(
  join(home, "storages/workspace.json"),
  JSON.stringify({
    unit: { name: "workspace", version: 2 },
    global: {
      initialized: true,
      workspaceIds: [workspaceId],
      archivedSessionIds: [],
    },
    tables: {
      workspaces: {
        [workspaceId]: {
          path: workspace,
          title: "Office integration",
          sessionIds: [],
          createdAt: now,
          updatedAt: now,
        },
      },
    },
  }),
);
const env = {
  ...process.env,
  DSH_HOME: home,
  DSH_AGENTS_HOME: join(home, "agents"),
  PATH: `${join(root, "node_modules/.bin")}:${dirname(process.execPath)}:${process.env.PATH}`,
};
const dsh = join(root, "node_modules/@deepseek-ai/dsh/lib/bin.js");
const pnpm = join(root, "node_modules/pnpm/bin/pnpm.cjs");
const exec = promisify(execFile);
const command = async (bin, args, cwd = home) =>
  (
    await exec(process.execPath, [bin, ...args], {
      cwd,
      env,
      timeout: 60_000,
      maxBuffer: 8 * 1024 * 1024,
    })
  ).stdout;
const cli = (...args) => command(dsh, args);
let server,
  browser,
  log = "";
const browserErrors = [];
const checks = [];
const pass = (text) => {
  checks.push(text);
  console.log(`PASS: ${text}`);
};
async function start() {
  log = "";
  server = spawn(
    process.execPath,
    [
      dsh,
      "--profile",
      "office",
      "--host",
      "127.0.0.1",
      "--port",
      "0",
      "--no-open",
    ],
    { cwd: home, env, stdio: ["ignore", "pipe", "pipe"] },
  );
  server.stdout.on("data", (value) => {
    log += value;
  });
  server.stderr.on("data", (value) => {
    log += value;
  });
  const deadline = Date.now() + 25_000;
  while (!/http:\/\/127\.0\.0\.1:\d+\/\?token=[\w-]+/.test(log)) {
    if (server.exitCode !== null || Date.now() > deadline)
      throw new Error(
        `Host startup failed: ${log
          .replaceAll(credential || "\0", "[redacted]")
          .replace(/token=[^\s]+/g, "token=[redacted]")
          .slice(-2500)}`,
      );
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const loginUrl = log.match(/http:\/\/127\.0\.0\.1:\d+\/\?token=[\w-]+/)[0];
  let response;
  while (!response) {
    try {
      response = await fetch(loginUrl, {
        redirect: "manual",
        signal: AbortSignal.timeout(2000),
      });
    } catch {
      if (server.exitCode !== null || Date.now() > deadline)
        throw new Error(
          `Host unavailable: ${log
            .replaceAll(credential || "\0", "[redacted]")
            .replace(/token=[^\s]+/g, "token=[redacted]")
            .slice(-4500)}`,
        );
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  const cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  assert.ok(cookie);
  return { address: new URL(loginUrl).origin, cookie };
}
async function stop() {
  if (!server || server.exitCode !== null || server.signalCode !== null) return;
  const stopped = new Promise((resolve) => server.once("close", resolve));
  server.kill("SIGTERM");
  const timer = setTimeout(() => server.kill("SIGKILL"), 3000);
  await stopped;
  clearTimeout(timer);
}
async function api(host, request, path = "/api/office-live-probe") {
  const response = await fetch(host.address + path, {
    method: "POST",
    headers: { cookie: host.cookie, "content-type": "application/json" },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(pdfMode ? 120000 : 20000),
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.ok, true, JSON.stringify(result));
  return result.value;
}
const para = (text) => ({ type: "paragraph", runs: [{ text, marks: [] }] });
try {
  if (realModel) {
    await mkdir(join(home, "agents/skills"), { recursive: true });
    await cp(
      join(homedir(), ".agents/skills/officecli"),
      join(home, "agents/skills/officecli"),
      { recursive: true },
    );
    if(withPptSkills)for(const name of ["pptx","elite-powerpoint-designer"])await cp(join(homedir(),".agents/skills",name),join(home,"agents/skills",name),{recursive:true});
    const require = createRequire(
      join(root, "packages/plugins/experts/package.json"),
    );
    const { parseDocument, stringify } = require("yaml");
    const source = parseDocument(
      await readFile(
        join(root, ".test-runtime/preview/.credentials.yaml"),
        "utf8",
      ),
    ).toJSON();
    credential = source.refs?.DEEPSEEK_API_KEY;
    assert.ok(
      typeof credential === "string" && credential.trim(),
      "Configure preview DeepSeek model before real acceptance",
    );
    await writeFile(
      join(home, ".credentials.yaml"),
      stringify({
        version: 1,
        records: {},
        refs: { DEEPSEEK_API_KEY: credential },
      }),
      { mode: 0o600 },
    );
  }
  const tarballs = [];
  for (const directory of [
    "packages/providers/identity-local",
    "packages/plugins/audit",
    "packages/plugins/access",
    "packages/plugins/office",
  ]) {
    const release = process.argv.find(x => x.startsWith("--office-tgz="));
    if (directory === "packages/plugins/office" && release) {
      tarballs.push(resolve(release.slice("--office-tgz=".length)));
      continue;
    }
    const manifest = JSON.parse(
      await readFile(join(root, directory, "package.json"), "utf8"),
    );
    await command(
      pnpm,
      ["--filter", manifest.name, "pack", "--pack-destination", artifacts],
      root,
    );
    tarballs.push(join(artifacts, `${manifest.name}-${manifest.version}.tgz`));
  }
  const fixture = join(home, "probe");
  await mkdir(fixture);
  await writeFile(
    join(fixture, "package.json"),
    JSON.stringify({
      name: "workdsh-office-live-probe",
      version: "0.0.0",
      type: "module",
      exports: { ".": "./index.js", "./client": "./client.js" },
      dsh: {
        bundle: { patch: "./patch.yml" },
        client: {
          platform: "web",
          inject: [
            "@deepseek-ai/dsh-client-ui-sidebar-right",
            "@deepseek-ai/dsh-api-session-controller",
          ],
        },
      },
    }),
  );
  await writeFile(
    join(fixture, "patch.yml"),
    "- insert:\n    - id: office-live-probe\n      name: workdsh-office-live-probe\n",
  );
  await writeFile(
    join(fixture, "index.js"),
    `
import {assembleContextFor} from '@deepseek-ai/dsh-agent';
export const inject=['connection','workdshSessionAccess','tools','systemPrompt','workdshIdentity'${realModel ? ", 'workdshOfficeContent'" : ""}];
export function apply(ctx){ctx.effect(()=>ctx.connection.fetch.register({path:'/api/office-live-probe',methods:['POST'],requestBody:'buffered',async fetch(request){try{
 const r=await request.json();let value;
 if(r.action==='create'){value=await ctx.workdshSessionAccess.create({workspaceId:${JSON.stringify(workspaceId)}});}
 else if(r.action==='fixture-turn'){
  const resolved=await ctx.workdshSessionAccess.resolveAgent(r.sessionId,request.signal);if(!resolved.agent)throw Error('agent unavailable');
  // Test-only public Session fixture: native present requires an open turn. No synthetic event path is installed in the product.
  if(r.open)resolved.agent.session.append('turn/start',{turn:1});else resolved.agent.session.append('turn/end',{turn:1,reason:{kind:'completed'}});value={fixture:true};
 }else if(r.action==='real-write'){
  const resolved=await ctx.workdshSessionAccess.resolveAgent(r.sessionId,request.signal);
  if(!resolved.agent)throw Error('agent unavailable');
  resolved.agent.send({role:'user',id:r.messageId,content:[{type:'text',text:r.prompt}],source:{kind:'user'}},'next-turn',true);
  value={sent:true};
 }else if(r.action==='real-state'){
  const resolved=await ctx.workdshSessionAccess.resolveAgent(r.sessionId,request.signal);
  if(!resolved.agent)throw Error('agent unavailable');
  const actor=await ctx.workdshIdentity.resolve({sessionId:r.sessionId},request.signal);
  const docs=await ctx.workdshOfficeContent.list(actor,request.signal);
  value={status:resolved.agent.status,deliveries:resolved.agent.session.snapshotEvents().filter(e=>e.type==='deliverables/presented'),trace:resolved.agent.session.snapshotEvents().filter(e=>['tool/call','step/start','turn/end'].includes(e.type)).map(e=>({type:e.type,time:e.time,name:e.type==='tool/call'?e.data.name:undefined})),documents:await Promise.all(docs.map(d=>ctx.workdshOfficeContent.read(actor,d.documentId,request.signal)))};
 }else if(r.action==='guide'){
  const resolved=await ctx.workdshSessionAccess.resolveAgent(r.sessionId,request.signal);
  const assembly=await ctx.systemPrompt.assemble(assembleContextFor(resolved.agent,request.signal));
  value={present:assembly.sections.some(s=>s.name==='workdsh:office-authoring'&&s.text.includes('First call content_open'))};
 }
 else if(r.action==='visible-tools'){
  const resolved=await ctx.workdshSessionAccess.resolveAgent(r.sessionId,request.signal);
  if(!resolved.agent)throw Error('agent unavailable');
  const assembly=await ctx.systemPrompt.assemble(assembleContextFor(resolved.agent,request.signal));
  value=assembly.tools.map(t=>t.name);
 }
 else if(r.action==='tool'){
  if(!['content_open','content_read','content_capabilities','content_edit','content_present','content_export'].includes(r.name))throw Error('tool not allowed');
  const resolved=await ctx.workdshSessionAccess.resolveAgent(r.sessionId,request.signal);
  if(!resolved.agent)throw Error(JSON.stringify(resolved));
  const result=await ctx.tools.execute({name:r.name,arguments:r.args,callId:r.callId,agent:resolved.agent,signal:request.signal});
  if(result.isError)throw Error(JSON.stringify(result));value=result.value;
 }else throw Error('unknown probe action');
 return Response.json({ok:true,value});
 }catch(e){return Response.json({ok:false,error:String(e)})}}}));}`,
  );
  await writeFile(
    join(fixture, "client.js"),
    `window.__ModuleLoader__.load({id:'workdsh-office-live-probe',factory:function(){return {inject:['sidebarRight','sessions','documentPreviews','sidebarRightTabs'],apply:function(ctx){ctx.effect(function(){window.officeLiveProbe={uninstallOffice:async function(){let found=false;for(const [plugin,runtime] of ctx.registry.entries()){if(runtime.name==='workdsh-office-client'){await Promise.all([...runtime.fibers].map(f=>f.dispose()));found=true;break}}if(!found)throw Error('Office Client not found');return {preview:ctx.documentPreviews.getSnapshot().some(d=>d.id==='workdsh-office'),tab:!!ctx.sidebarRightTabs.get('workdsh-office-live')}},open:async function(sid){await ctx.sessions.refresh();ctx.sessions.open(sid)},file:function(sid,address){ctx.sidebarRight.openResourceIn(sid,address)},collapse:function(){if(ctx.sidebarRight.isExpanded())ctx.sidebarRight.toggleExpanded()},tab:function(sid,id){ctx.sidebarRight.openTabIn(sid,'workdsh-office-live',{params:{documentId:id}})}};return function(){delete window.officeLiveProbe}})}}}});`,
  );
  await command(pnpm, ["pack", "--pack-destination", artifacts], fixture);
  tarballs.push(join(artifacts, "workdsh-office-live-probe-0.0.0.tgz"));
  await cli(
    "--profile",
    "office",
    "--from-default-profile",
    "web",
    "--dump-config",
  );
  const profileManifest=join(home,'profiles/office/package.json');
  const profileJson=JSON.parse(await readFile(profileManifest,'utf8'));profileJson.packageManager='pnpm@10.34.5';await writeFile(profileManifest,JSON.stringify(profileJson,null,2)+'\n');
  for(let i=0;i<tarballs.length;i++){
    const digest=createHash('sha256').update(await readFile(tarballs[i])).digest('hex');
    const target='/tmp/workdsh-packs';await mkdir(target,{recursive:true});
    const archive=join(target,digest+'.tgz');await copyFile(tarballs[i],archive);tarballs[i]=archive;
  }
  await cli("plugin", "--profile", "office", "add", ...tarballs, ...installFlags);
  pass(
    "Standalone prebuilt Office + explicit governance packages installed outside checkout; no experts/skills/workbench bundle",
  );
  let host = await start();
  const created = await api(host, { action: "create" });
  const sid = created.sessionId;
  assert.equal(
    (await api(host, { action: "guide", sessionId: sid })).present,
    true,
    "native Session must receive the Office writing workflow",
  );
  const visibleTools = await api(host, {
    action: "visible-tools",
    sessionId: sid,
  });
  for (const name of [
    "content_open",
    "content_read",
    "content_edit",
    "content_present",
    "content_capabilities",
    "content_export",
  ])
    assert.ok(
      visibleTools.includes(name),
      `${name} must be visible to the actual Session prompt assembly`,
    );
  pass(
    "All six content tools are visible in the native Session model prompt assembly",
  );
  let call = 0;
  const tool = (name, args) =>
    api(host, {
      action: "tool",
      sessionId: sid,
      callId: `office-probe-${++call}`,
      name,
      args,
    });
  const caps = await tool("content_capabilities", {});
  assert.deepEqual(caps.export.formats, ["docx"]);
  assert.equal(caps.kind, "document");
  let doc = await tool("content_open", {
    input: {
      source: "new",
      title: pptMode ? "门店 PPT 实时制作" : "人和 AI 共写一份文档",
      ...(pdfMode?{kind:"pdf"}:pptMode?{kind:"presentation"}:{}),
      operationId: "office-probe-create",
    },
  });
  const first = (pptMode||pdfMode) ? undefined : doc.state.blockIds[0];
  pass(
    "Five real native tools register and execute through official Tools + trusted native Session",
  );
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1500, height: 1050 },
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await page.context().addCookies(
    host.cookie.split("; ").map((pair) => {
      const at = pair.indexOf("=");
      return {
        name: pair.slice(0, at),
        value: pair.slice(at + 1),
        url: host.address,
      };
    }),
  );
  await page.goto(host.address);
  for (const name of ["Continue", "Configure later"])
    await page
      .getByRole("button", { name, exact: true })
      .click({ timeout: 4000 })
      .catch(() => {});
  await page.waitForFunction(() => window.officeLiveProbe, { timeout: 20000 });
  await page.evaluate((sid) => window.officeLiveProbe.open(sid), sid);
  if(pdfMode){
    const status=page.getByRole("status").filter({hasText:"修订 0 · 预览已更新"});await expect(status).toBeVisible({timeout:25000});
    pass("Standalone official Session auto-opens a real PDF.js preview without a model request");
    const firstPage=structuredClone(doc.state.pages[0]);firstPage.elements[1].text="年度预算：收入 1000 万元。缺失参数待确认。";
    await tool("content_edit",{input:{documentId:doc.documentId,baseRevision:0,operationId:"pdf-real-first",operations:[{op:"pdf.updatePage",pageId:firstPage.id,page:firstPage}]}});
    await expect(page.getByRole("status").filter({hasText:"修订 1 · 预览已更新"})).toBeVisible({timeout:20000});
    pass("Committed Chinese page revision reaches the actual official Sidebar through authenticated Connection");
    await page.getByRole("button",{name:"编辑本页文字"}).click();await page.getByRole("textbox",{name:"PDF 文本 body",exact:true}).fill("用户确认：预算收入 1000 万元。");await page.getByRole("button",{name:"完成编辑并保存"}).click();
    await expect(page.getByRole("status").filter({hasText:"修订 2 · 预览已更新"})).toBeVisible({timeout:20000});
    doc=await tool("content_read",{documentId:doc.documentId});assert.equal(doc.state.pages[0].elements[1].text,"用户确认：预算收入 1000 万元。");
    pass("Human page edit saves through the same authorized service and live PDF preview");
    const pending=page.waitForEvent("download");await page.getByRole("button",{name:"下载 PDF"}).click();const downloaded=await pending;await downloaded.saveAs(join(artifacts,"report.pdf"));assert.equal((await readFile(join(artifacts,"report.pdf"))).subarray(0,5).toString(),"%PDF-");
    await api(host,{action:"fixture-turn",sessionId:sid,open:true});
    const exported=await tool("content_export",{documentId:doc.documentId,baseRevision:doc.revision});assert.equal(exported.status,"presented");assert.ok(exported.path.endsWith(".pdf"));assert.ok((await readFile(join(workspace,exported.path))).equals(await readFile(join(artifacts,"report.pdf"))));
    await api(host,{action:"fixture-turn",sessionId:sid,open:false});
    pass("With a test-only public Session turn fixture, official file card delivers exactly the same committed PDF bytes as browser download");
    await page.screenshot({path:join(artifacts,"pdf-live.png")});await stop();host=await start();const cold=await tool("content_read",{documentId:doc.documentId});assert.deepEqual(cold.state,doc.state);
    pass("Independent installed Host cold restart retains the saved PDF working copy");
    if(realModel){await page.context().addCookies(host.cookie.split("; ").map(pair=>{const at=pair.indexOf("=");return {name:pair.slice(0,at),value:pair.slice(at+1),url:host.address}}));await page.goto(host.address);await page.waitForFunction(()=>window.officeLiveProbe);const {verifyRealPdf}=await import("./probe-office-pdf-real.mjs");await verifyRealPdf({api,host,page,workspace,artifacts,root,pass});}
  } else {
  if(pptMode){
    if(realModel)throw new Error("Current PPT integration model acceptance must use the new native slide contract; this probe is deterministic only.");
    const native=page.getByTestId("office-presentation");
    await expect(native).toBeVisible({timeout:20000});
    await expect(native.locator("iframe")).toHaveCount(0);
    await expect(native.locator('[data-pptx-element]')).not.toHaveCount(0,{timeout:20000});
    pass("PPT content_open opens the official right Tab with the single native editor, no iframe");
    const chart={id:"native-chart",type:"chart",x:80,y:120,width:500,height:300,chartData:{chartType:"pie",categories:["已完成","待完成"],series:[{name:"功能数",values:[7,3]}],title:"完成情况",hasLegend:true}};
    await tool("content_edit",{input:{documentId:doc.documentId,baseRevision:0,operationId:"native-chart-seed",operations:[{op:"presentation.updateSlide",slideId:doc.state.deck.slides[0].id,patch:{elements:[chart]}}]}});
    await native.locator('[data-pptx-element][aria-label^="Chart:"]').click({timeout:20000});
    const value=native.locator('input[aria-label="功能数 value 1"]');
    await value.fill("8");await value.blur();
    await expect.poll(async()=>JSON.stringify((await tool("content_read",{documentId:doc.documentId})).state.deck.slides)).toContain('"values":[8,3]');
    pass("Native chart data edits persist through the same authorized Host content service");
    const [download]=await Promise.all([page.waitForEvent("download"),page.getByRole("button",{name:"下载 PPT",exact:true}).click()]);
    await download.saveAs(join(artifacts,"native-live.pptx"));await page.screenshot({path:join(artifacts,"native-ppt-right.png")});
    await page.reload();
    for(const name of ["Continue","Configure later"])await page.getByRole("button",{name,exact:true}).click({timeout:2000}).catch(()=>{});
    await page.waitForFunction(()=>window.officeLiveProbe,undefined,{timeout:20000});
    await page.evaluate(async({sid,id})=>{await window.officeLiveProbe.open(sid);window.officeLiveProbe.tab(sid,id);},{sid,id:doc.documentId});
    await native.locator('[data-pptx-element][aria-label^="Chart:"]').click({timeout:20000});
    await expect(native.locator('input[aria-label="功能数 value 1"]')).toHaveValue("8");
    pass("Saved editable native chart reopens after real application refresh");
    const fixtureBytes=await readFile(join(artifacts,"native-live.pptx"));await writeFile(join(workspace,"imported-native.pptx"),fixtureBytes);
    const officeRequire=createRequire(new URL('../packages/plugins/office/package.json',import.meta.url));
    const {fileAddressFor}=createRequire(officeRequire.resolve("@deepseek-ai/dsh-client-ui-sidebar-right"))("@deepseek-ai/dsh-util-workspace-path");
    const address=fileAddressFor(sid,workspace,"imported-native.pptx");await page.evaluate(({sid,address})=>window.officeLiveProbe.file(sid,address),{sid,address});
    const imported=page.getByLabel("PPTX 编辑",{exact:true});await expect(imported).toBeVisible({timeout:20000});await expect(imported.locator('iframe')).toHaveCount(0);
    await imported.locator('[data-pptx-element][aria-label^="Chart:"]').click({timeout:20000});const importedValue=imported.locator('input[aria-label="功能数 value 1"]');await expect(importedValue).toHaveValue("8");await importedValue.fill("9");await importedValue.blur();await expect(importedValue).toHaveValue("9");assert.ok((await readFile(join(workspace,"imported-native.pptx"))).equals(fixtureBytes));
    pass("Official authorized PPTX file resource opens in native editor, edits chart data and preserves original bytes");

  }else{
  if (inputOnly) {
    await expect.poll(() => page.evaluate(async sid => {
      const response = await fetch('/api/workdsh-office', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sessionId:sid,request:{endpoint:'pending'}})});
      return (await response.json()).value?.length;
    },sid)).toBe(0);

    const composer = page.locator('[contenteditable="true"][role="textbox"]').first();
    await expect(composer).toBeVisible({timeout:20000});
    await composer.fill("/office");
    await expect(page.getByRole("option").filter({hasText:"office.word"})).toBeVisible();
    await expect(page.getByRole("option").filter({hasText:"office."})).toHaveCount(8);
    await page.getByRole("option").filter({hasText:"office.word"}).click();
    await expect(page.getByText("标签可用退格删除", {exact:false})).toHaveCount(0);
    await expect(composer).toContainText("Word · 新建");
    await composer.press("ControlOrMeta+A");
    await composer.press("Backspace");
    await expect(composer).toHaveText("");
    await expect(composer).toHaveText("");
    await composer.pressSequentially("@");
    await expect(page.getByRole("option").filter({hasText:"修改此文档"}).first()).toBeVisible();
    await page.getByRole("option").filter({hasText:"修改此文档"}).first().click();
    await expect(composer).toContainText("修改此文档");
    await page.screenshot({path:join(artifacts,"office-input-reference.png")});
    await composer.press("ControlOrMeta+A"); await composer.press("Backspace");
    await expect(composer).toHaveText("");
    await composer.pressSequentially("@");
    await page.getByRole("option").filter({hasText:"参考资料"}).first().click();
    await expect(composer).toContainText("参考资料");
    await page.evaluate(() => window.officeLiveProbe.collapse());
    await page.setViewportSize({width:900,height:800});
    await expect(composer).toBeVisible();
    await composer.scrollIntoViewIfNeeded();
    const box = await composer.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 901 && box.y >= 0 && box.y + box.height <= 801, "Native composer stays within viewport");
    await expect(page.getByText("标签可用退格删除", {exact:false})).toHaveCount(0);
    await page.screenshot({path:join(artifacts,"office-input-narrow.png")});
    pass("Native /office menu offers eight types, creates removable output chip without @; native @ document chips distinguish target and reference");
    // Leave a real Office chip in the draft: uninstall must preserve user input,
    // remove the source and refuse serialization rather than silently send it.
    const registrations = await page.evaluate(() => window.officeLiveProbe.uninstallOffice());
    assert.deepEqual(registrations,{preview:false,tab:false});
    await expect(composer).toContainText("参考资料");
    await composer.press("ControlOrMeta+Enter");
    await expect.poll(() => page.evaluate(() => document.body.innerText)).toMatch(/reference|引用|source|serialize/i);
    await expect(composer).toContainText("参考资料");
    await composer.press("ControlOrMeta+A"); await composer.press("Backspace");
    await composer.pressSequentially("/office");
    await expect(page.getByRole("option").filter({hasText:"office.word"})).toHaveCount(0);
    await composer.press("ControlOrMeta+A"); await composer.press("Backspace");
    await composer.pressSequentially("@");
    await expect(page.getByRole("option").filter({hasText:"修改此文档"})).toHaveCount(0);
    pass("Office Client uninstall removes type/document menu sources, preview and right tab registrations; stale draft chip is preserved and send fails closed");
    if (packageRoundtrip) {
      const savedText = "打包后重装仍保留的 Word 内容";
      await api(host,{action:"tool",sessionId:sid,name:"content_edit",args:{input:{documentId:doc.documentId,baseRevision:doc.revision,operationId:randomUUID(),operations:[{op:"document.replaceBlock",blockId:doc.state.blockIds[0],expectedText:"",block:{type:"paragraph",runs:[{text:savedText,marks:[]}]}}]}},callId:randomUUID()});
      await browser.close(); browser = undefined;
      await stop();
      await cli("plugin", "--profile", "office", "remove", "workdsh-plugin-office");
      host = await start();
      const without = await api(host,{action:"visible-tools",sessionId:sid});
      assert.ok(!without.some(name=>name.startsWith("content_")));
      assert.equal((await api(host,{action:"guide",sessionId:sid})).present,false);
      const response = await fetch(host.address + "/api/workdsh-office", {method:"POST",headers:{cookie:host.cookie,"content-type":"application/json"},body:JSON.stringify({sessionId:sid,request:{endpoint:"list"}})});
      assert.equal(response.status,404);
      await stop();
      const officeTarball = tarballs.find(path=>path.includes("workdsh-plugin-office-"));
      await cli("plugin", "--profile", "office", "add", officeTarball, ...installFlags);
      host = await start();
      const tools = await api(host,{action:"visible-tools",sessionId:sid});
      for(const name of ["content_open","content_read","content_edit","content_present","content_export","content_capabilities"]) assert.ok(tools.includes(name));
      const reopened = await api(host,{action:"tool",sessionId:sid,name:"content_read",args:{documentId:doc.documentId},callId:randomUUID()});
      assert.equal(reopened.documentId,doc.documentId);
      assert.equal(reopened.title,doc.title);
      assert.equal(reopened.revision,doc.revision+1);
      assert.ok(JSON.stringify(reopened.state).includes(savedText));
      browser = await chromium.launch({headless:true});
      const installedPage = await browser.newPage({viewport:{width:1500,height:1050}});
      await installedPage.context().addCookies(host.cookie.split("; ").map(pair=>{const at=pair.indexOf("=");return {name:pair.slice(0,at),value:pair.slice(at+1),url:host.address}}));
      await installedPage.goto(host.address);
      for(const name of ["Continue","Configure later"]) await installedPage.getByRole("button",{name,exact:true}).click({timeout:4000}).catch(()=>{});
      await installedPage.waitForFunction(()=>window.officeLiveProbe);
      await installedPage.evaluate(sid=>window.officeLiveProbe.open(sid),sid);
      const reinstalledComposer = installedPage.locator('[contenteditable="true"][role="textbox"]').first();
      await reinstalledComposer.fill("/office");
      await expect(installedPage.getByRole("option").filter({hasText:"office.word"})).toBeVisible({timeout:15000});
      await installedPage.screenshot({path:join(artifacts,"office-reinstalled.png")});
      pass("Real tgz Profile uninstall removes Host tools, guide and endpoint; tgz reinstall restores saved document and native /office menu");
    }


  } else {
  // Creation itself must request presentation; do not depend on content_present.
  const body = page.getByRole("textbox", { name: "文档正文" });
  await expect(body).toBeVisible({ timeout: 20000 });
  await expect(body).toHaveText("");
  await expect.poll(() => page.evaluate(async sid => {
    const res = await fetch('/api/workdsh-office', {method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({sessionId: sid, request: {endpoint:'pending'}})});
    const data = await res.json();
    return data.value?.length;
  }, sid)).toBe(0);
  await page.evaluate(() => window.officeLiveProbe.collapse());
  await expect(body).not.toBeVisible();
  await tool("content_edit", {
    input: {
      documentId: doc.documentId,
      baseRevision: 0,
      operationId: "batch-1",
      operations: [
        {
          op: "document.replaceBlock",
          blockId: first,
          expectedText: "",
          block: {
            type: "heading",
            level: 1,
            runs: [{ text: "门店调研报告", marks: [] }],
          },
        },
        {
          op: "document.insertBlocks",
          afterBlockId: first,
          blocks: [
            { ...para("AI 第一批：先说明调研目标。"), clientRef: "intro" },
          ],
        },
      ],
    },
  });
  await expect(body).toBeVisible({timeout: 20000});
  await expect(page.getByLabel("文档正文")).toContainText("AI 第一批", {
    timeout: 20000,
  });
  for (let batch = 2; batch <= 3; batch++) {
    doc = await tool("content_read", { documentId: doc.documentId });
    await tool("content_edit", {
      input: {
        documentId: doc.documentId,
        baseRevision: doc.revision,
        operationId: "batch-" + batch,
        operations: [
          {
            op: "document.insertBlocks",
            afterBlockId: doc.state.blockIds.at(-1),
            blocks: [
              {
                ...para(`AI 第${batch}批：补充调查结论与建议。`),
                clientRef: "batch-" + batch,
              },
            ],
          },
        ],
      },
    });
    await expect(page.getByLabel("文档正文")).toContainText(`AI 第${batch}批`, {
      timeout: 5000,
    });
  }
  pass(
    "Creation automatically opens the empty native right Tab without content_present; three committed batches appear incrementally",
  );
  doc = await tool("content_read", {documentId:doc.documentId});
  const richP = text=>({type:"paragraph",runs:[{text,marks:[]}]});
  const richImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf1kAAAAASUVORK5CYII=";
  await tool("content_edit",{input:{documentId:doc.documentId,baseRevision:doc.revision,operationId:"rich-table-image",operations:[{op:"document.insertBlocks",afterBlockId:doc.state.blockIds.at(-1),blocks:[
    {type:"table",runs:[],clientRef:"rich-table",table:{rows:[{cells:[{colspan:2,rowspan:1,colwidth:[120,180],header:true,paragraphs:[richP("表格实时展示")] }]},{cells:[{colspan:1,rowspan:1,colwidth:[120],paragraphs:[richP("门店A")]},{colspan:1,rowspan:1,colwidth:[180],paragraphs:[richP("待填")] }]}]}},
    {type:"image",runs:[],clientRef:"rich-image",image:{src:richImage,width:120,height:90,alignment:"center",alt:"实时插图"}}
  ]}]}});
  await expect(body.locator("table")).toContainText("表格实时展示");
  await expect(body.locator('th[colspan="2"]')).toBeVisible();
  await expect(body.locator('img[alt="实时插图"]')).toBeVisible();
  pass("AI semantic table/image tool batch appears in the native right-hand editor");
  const sourceSnapshot = await tool("content_read", {documentId: doc.documentId});
  const sourcePicture = Object.values(sourceSnapshot.state.blocks).find(block => block.type === "image");
  assert.match(sourcePicture.image.src, /^office-image:[^:]+:[^:]+:[a-f0-9]{64}$/);
  const imageCopy = await tool("content_open", {input: {source: "new", title: "跨文档图片副本", operationId: "cross-image-create"}});
  await tool("content_edit", {input: {documentId: imageCopy.documentId, baseRevision: imageCopy.revision, operationId: "cross-image-copy", operations: [{op: "document.insertBlocks", afterBlockId: null, blocks: [{type: "image", runs: [], clientRef: "copy", image: {...sourcePicture.image, width: 240, alignment: "right", alt: "跨文档插图"}}]}]}});
  await expect(body.locator('img[alt="跨文档插图"]')).toBeVisible();
  assert.equal(await body.locator('img[alt="跨文档插图"]').getAttribute("src"), richImage);
  const [crossDownload] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", {name: "下载 Word", exact: true}).click()]);
  const crossPath = join(artifacts, "cross-document-image.docx");
  await crossDownload.saveAs(crossPath);
  const officeRequire = createRequire(
    join(root, "packages/plugins/office/package.json"),
  );
  const CrossZip = officeRequire("jszip");
  const crossZip = await CrossZip.loadAsync(await readFile(crossPath));
  const media = Object.keys(crossZip.files).find(name => name.startsWith("word/media/") && !crossZip.files[name].dir);
  assert.ok(media);
  assert.deepEqual(await crossZip.file(media).async("nodebuffer"), Buffer.from(richImage.split(",")[1], "base64"));
  assert.equal((await tool("content_read", {documentId: doc.documentId})).revision, sourceSnapshot.revision);
  pass("Cross-document image reference opens the target live editor, preserves source and downloads exact image bytes");
  await tool("content_open", {input: {source: "existing", documentId: doc.documentId}});
  await expect(body.locator('img[alt="实时插图"]')).toBeVisible();

  await page.getByRole("button",{name:"编辑",exact:true}).click();
  await expect(body).toHaveAttribute("contenteditable","true");
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await body.getByText("AI 第一批：先说明调研目标。",{exact:true}).click();await page.keyboard.press("End");await page.keyboard.press("Enter");
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.getByLabel("表格操作",{exact:true}).selectOption("insertTable");
  await expect(body.locator("table")).toHaveCount(2);
  const createdTable=body.locator("table").filter({hasNotText:"表格实时展示"});
  await createdTable.locator("p").first().click();await page.keyboard.insertText("人工表格内容");
  await page.getByLabel("表格操作",{exact:true}).selectOption("addRowAfter");
  await expect(createdTable.locator("tr")).toHaveCount(4);
  await page.getByRole("button",{name:"完成编辑",exact:true}).click();
  await expect(page.getByRole("status")).toContainText("已保存",{timeout:15000});
  const manualSaved=await tool("content_read",{documentId:doc.documentId});
  assert.equal(Object.values(manualSaved.state.blocks).filter(block=>block.type==="table").length,2);
  assert.ok(manualSaved.state.blockIds.every(id=>!id.startsWith("tmp-")));
  pass("Native toolbar creates and edits a table; human save remaps its ID and AI reads the saved structure");
  await page.getByRole("button",{name:"编辑",exact:true}).click();await expect(body).toHaveAttribute("contenteditable","true");
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await body.getByText("AI 第一批：先说明调研目标。",{exact:true}).click();await page.keyboard.press("End");await page.keyboard.press("Enter");
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const manualPng=await page.evaluate(()=>{const canvas=document.createElement("canvas");canvas.width=160;canvas.height=100;const context=canvas.getContext("2d");context.fillStyle="#3159b9";context.fillRect(0,0,160,100);context.fillStyle="#fff";context.font="18px sans-serif";context.fillText("门店分析",22,56);return canvas.toDataURL("image/png").split(",")[1];});
  // Use the native find command to select a known paragraph before async file selection.
  await page.getByRole("button", {name: "查找与替换", exact: true}).click();
  await page.getByLabel("查找文字", {exact: true}).fill("AI 第一批：先说明调研目标。");
  await page.getByRole("button", {name: "下一处", exact: true}).click();
  await page.getByRole("button", {name: "查找与替换", exact: true}).click();
  await body.press("ArrowRight");
  await expect(page.getByLabel("表格操作", {exact: true}).locator('option[value="insertTable"]')).toBeEnabled();
  await expect(page.getByLabel("图片对齐", {exact: true})).toBeDisabled();
  await page.getByLabel("插入图片",{exact:true}).setInputFiles({name:"manual-office.png",mimeType:"image/png",buffer:Buffer.from(manualPng,"base64")});
  const manualImage=body.locator('img[alt="manual-office.png"]');await expect(manualImage).toBeVisible();await expect(body.locator('img[alt="实时插图"]')).toBeVisible();await manualImage.click();
  await page.getByLabel("图片对齐",{exact:true}).selectOption("right");
  await page.getByRole("button",{name:"完成编辑",exact:true}).click();await expect(page.getByRole("status")).toContainText("已保存",{timeout:15000});
  const imageSaved=await tool("content_read",{documentId:doc.documentId});const savedImage=Object.values(imageSaved.state.blocks).find(block=>block.image?.alt==="manual-office.png");
  assert.equal(savedImage.image.alignment,"right");assert.ok(imageSaved.state.blockIds.every(id=>!id.startsWith("tmp-")));
  await page.screenshot({path:join(artifacts,"table-image-toolbar.png")});
  pass("Native toolbar image upload and alignment save with a stable ID in the same AI-readable working copy");
  const appendLong = async (label) => {
    const latest = await tool("content_read", { documentId: doc.documentId });
    await tool("content_edit", {
      input: {
        documentId: doc.documentId,
        baseRevision: latest.revision,
        operationId: randomUUID(),
        operations: [
          {
            op: "document.insertBlocks",
            afterBlockId: latest.state.blockIds.at(-1),
            blocks: [
              {
                ...para(label + "。阅读测试：追加文档内容。".repeat(300)),
                clientRef: randomUUID(),
              },
            ],
          },
        ],
      },
    });
    await expect(page.getByLabel("文档正文")).toContainText(label);
  };
  const scroll = page.locator(".wd-office-paper-scroll");
  await appendLong("滚动第一批");
  await expect
    .poll(() =>
      scroll.evaluate((el) => el.scrollHeight - el.clientHeight - el.scrollTop),
    )
    .toBeLessThan(64);
  await scroll.evaluate((el) => {
    el.scrollTop = 100;
  });
  await expect(
    page.getByRole("button", { name: "跟随最新内容" }),
  ).toBeVisible();
  await appendLong("滚动第二批");
  assert.ok(
    await scroll.evaluate((el) => el.scrollTop < 200),
    "manual upward reading must be preserved",
  );
  await page.getByRole("button", { name: "跟随最新内容" }).click();
  await expect
    .poll(() =>
      scroll.evaluate((el) => el.scrollHeight - el.clientHeight - el.scrollTop),
    )
    .toBeLessThan(64);
  pass(
    "Appended content follows the bottom; manual upward scrolling pauses following and can resume",
  );
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  await expect(page.getByLabel("文档正文")).toHaveAttribute(
    "contenteditable",
    "true",
  );
  const paragraph = page.getByLabel("文档正文").locator("p").first();
  await paragraph.click({ clickCount: 3 });
  await page.keyboard.insertText("用户修改：优先复核数据。");
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "加粗", exact: true }).click();
  await page.keyboard.insertText("原生加粗段落 😀");
  const styledParagraph = page
    .getByLabel("文档正文")
    .locator("p")
    .filter({ hasText: "原生加粗段落" });
  await styledParagraph.click({ clickCount: 3 });
  await page.getByLabel("字体", { exact: true }).selectOption("宋体");
  await page.getByLabel("字号", { exact: true }).selectOption("18");
  await page.getByLabel("文字颜色", { exact: true }).fill("#ad2121");
  await page.getByRole("button", { name: "应用文字高亮", exact: true }).click();
  await page.getByRole("button", { name: "居中对齐", exact: true }).click();
  await page.getByLabel("行距", { exact: true }).selectOption("1.5");
  await page.getByRole("button", { name: "增加缩进", exact: true }).click();
  await page.getByRole("button", { name: "项目符号", exact: true }).click();
  await expect(styledParagraph.locator("..")).toHaveJSProperty("tagName", "LI");
  await page.getByRole("button", { name: "编号列表", exact: true }).click();
  await expect(page.getByLabel("文档正文").locator("ol")).toContainText(
    "原生加粗",
  );
  const beforeUndo = await page.getByLabel("文档正文").innerHTML();
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect
    .poll(() => page.getByLabel("文档正文").innerHTML())
    .not.toBe(beforeUndo);
  await page.getByRole("button", { name: "重做", exact: true }).click();
  await expect(page.getByLabel("文档正文").locator("ol")).toContainText(
    "原生加粗",
  );
  await page.getByRole("button", { name: "查找与替换", exact: true }).click();
  await page.getByLabel("查找文字", { exact: true }).fill("原生加粗段落");
  await page.getByRole("button", { name: "下一处", exact: true }).click();
  await page.getByLabel("替换为", { exact: true }).fill("原生加粗示例");
  await page.getByRole("button", { name: "全部替换", exact: true }).click();
  await expect(page.getByLabel("文档正文")).toContainText("原生加粗示例");
  await page.getByRole("button", { name: "查找与替换", exact: true }).click();
  await page.getByLabel("文档缩放", { exact: true }).selectOption("125");
  await expect(page.locator(".wd-office-paper")).toHaveCSS("zoom", "1.25");
  await page.getByLabel("文档缩放", { exact: true }).selectOption("100");
  await page
    .getByLabel("文档正文")
    .locator("p")
    .filter({ hasText: "原生加粗示例" })
    .click();
  await page.keyboard.press("End");
  await page.locator(".wd-office-ribbon").evaluate(el => el.scrollLeft = 0);
  await page.screenshot({ path: join(artifacts, "document-toolbar.png") });
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.screenshot({ path: join(artifacts, "document-toolbar-narrow.png") });
  const ribbon = page.locator(".wd-office-ribbon");
  const layout = await ribbon.evaluate((el) => {
    el.scrollLeft = 0;
    const bounds = el.getBoundingClientRect();
    const boxes = [...el.querySelectorAll("button, select, input")].map(control => control.getBoundingClientRect());
    return { height: bounds.height, sameRow: boxes.every(box => box.top >= bounds.top && box.bottom <= bounds.bottom), scrollable: el.scrollWidth > el.clientWidth };
  });
  assert.ok(layout.height <= 52 && layout.sameRow, "Official toolbar remains one compact row in a narrow pane");
  assert.equal(layout.scrollable, true, "Narrow toolbar can scroll to all controls");
  await page.getByRole("button", { name: "清除格式", exact: true }).focus();
  assert.equal(await ribbon.evaluate(el => el.scrollLeft > 0), true, "Keyboard focus reveals offscreen controls");
  await page.keyboard.press("Home");
  await expect(page.getByRole("button", { name: "查找与替换", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("button", { name: "撤销", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "撤销", exact: true })).not.toBeFocused();
  await ribbon.evaluate(el => el.scrollLeft = 0);
  await page.screenshot({ path: join(artifacts, "document-toolbar-narrow.png") });
  await page.setViewportSize({ width: 1500, height: 1050 });
  pass(
    "Rich toolbar applies font, size, colors, highlight, alignment, spacing, indentation and native lists; undo/redo, find/replace and zoom work",
  );
  // Exercise the browser composition guard without claiming an OS IME test.
  await page
    .getByLabel("文档正文")
    .evaluate((el) =>
      el.dispatchEvent(
        new CompositionEvent("compositionstart", { bubbles: true }),
      ),
    );
  const composingRevision = (
    await tool("content_read", { documentId: doc.documentId })
  ).revision;
  await page.keyboard.insertText(" 中文组合输入");
  await page.waitForTimeout(800);
  assert.equal(
    (await tool("content_read", { documentId: doc.documentId })).revision,
    composingRevision,
    "composition must not commit unfinished input",
  );
  await page
    .getByLabel("文档正文")
    .evaluate((el) =>
      el.dispatchEvent(
        new CompositionEvent("compositionend", { bubbles: true }),
      ),
    );
  // Download must save the latest local input before exporting.
  await page.keyboard.insertText(" 下载前最新文字<&>");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载 Word", exact: true }).click();
  const download = await downloadEvent;
  assert.match(download.suggestedFilename(), /\.docx$/);
  await download.saveAs(join(artifacts, "live-document.docx"));
  const JSZip = officeRequire("jszip");
  const zip = await JSZip.loadAsync(
    await readFile(join(artifacts, "live-document.docx")),
  );
  const xml = await zip.file("word/document.xml").async("string");
  assert.match(xml, /下载前最新文字&lt;&amp;&gt;/);
  assert.match(xml, /😀/);
  assert.match(xml, /<w:b\/>/);
  assert.match(xml, /<w:jc w:val="center"\/>/);
  assert.match(xml, /<w:sz w:val="36"\/>/);
  assert.match(xml, /<w:color w:val="ad2121"\/>/);
  assert.match(xml, /<w:shd w:val="clear" w:fill="fff2a8"\/>/);
  assert.match(xml, /<w:numPr>/);
  assert.ok(zip.file("word/numbering.xml"));
  assert.match(xml,/<w:tbl>/);assert.match(xml,/<w:gridSpan w:val="2"/);assert.ok(zip.file("word/media/image1.png"));
  pass(
    "Downloaded DOCX preserves toolbar text styles, paragraph layout and real list numbering",
  );
  pass(
    "Right-side DOCX download saves pending human input and preserves Chinese, emoji, escaping and bold",
  );
  await expect(
    page.getByRole("button", { name: "编辑", exact: true }),
  ).toBeVisible({ timeout: 10000 });
  doc = await tool("content_read", { documentId: doc.documentId });
  assert.match(JSON.stringify(doc.state), /用户修改：优先复核数据/);
  assert.ok(
    Object.values(doc.state.blocks).some((b) =>
      b.runs.some(
        (r) => r.text.includes("原生加粗") && r.marks.includes("bold"),
      ),
    ),
  );
  await tool("content_edit", {
    input: {
      documentId: doc.documentId,
      baseRevision: doc.revision,
      operationId: "after-human",
      operations: [
        {
          op: "document.insertBlocks",
          afterBlockId: doc.state.blockIds.at(-1),
          blocks: [
            {
              ...para("AI 已读取用户修改，继续整理后续行动。"),
              clientRef: "continue",
            },
          ],
        },
      ],
    },
  });
  await expect(page.getByLabel("文档正文")).toContainText("AI 已读取用户修改", {
    timeout: 5000,
  });
  pass(
    "Native paragraph edit, Enter split, bold and emoji persist; AI reads the human edit and continues",
  );
  pass(
    "Browser composition guard holds partial input until compositionend (simulated events, not an OS IME test)",
  );
  await page.screenshot({ path: join(artifacts, "live-document.png") });
  await page.reload();
  await page.waitForFunction(() => window.officeLiveProbe);
  await page.evaluate(
    async ({ sid, id }) => {
      await window.officeLiveProbe.open(sid);
      window.officeLiveProbe.tab(sid, id);
    },
    { sid, id: doc.documentId },
  );
  await expect(page.getByLabel("文档正文")).toContainText("用户修改", {
    timeout: 15000,
  });
  await expect(page.getByLabel("文档正文").locator("ol")).toContainText(
    "原生加粗",
  );
  await expect(
    page
      .getByLabel("文档正文")
      .locator("span")
      .filter({ hasText: "原生加粗" })
      .first(),
  ).toHaveCSS("font-size", "24px");
  pass(
    "Browser reload recovers committed document and rich formatting in native editor",
  );
  await page.getByRole("button", {name:"Configure later", exact:true}).click({timeout:4000}).catch(() => {});
  await expect.poll(() => page.evaluate(async sid => {
    const response = await fetch('/api/workdsh-office', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sessionId:sid,request:{endpoint:'pending'}})});
    return (await response.json()).value?.length;
  },sid)).toBe(0);
  const fileDelivery = {path:"import-fixture.docx"};
  await writeFile(join(workspace,fileDelivery.path), await readFile(join(artifacts,"live-document.docx")));
  const {fileAddressFor} = createRequire(officeRequire.resolve("@deepseek-ai/dsh-client-ui-sidebar-right"))("@deepseek-ai/dsh-util-workspace-path");
  const fileAddress = fileAddressFor(sid,workspace,fileDelivery.path);
  await page.evaluate(({sid,address}) => window.officeLiveProbe.file(sid,address), {sid,address:fileAddress});
  const fileEditor = page.getByRole("region", {name:"DOCX文档编辑", exact:true});
  await expect(fileEditor.getByLabel("文档编辑工具")).toBeVisible({timeout:20000});
  assert.ok((await fileEditor.getByLabel("文档编辑工具").boundingBox()).height <= 45,"Imported DOCX toolbar remains one compact row");
  await expect(fileEditor.getByLabel("文档正文")).toContainText("原生加粗", {timeout:20000});
  await expect(fileEditor.locator("table").filter({hasText:"表格实时展示"})).toBeVisible();await expect(fileEditor.locator('img[alt="实时插图"]')).toBeVisible();
  await fileEditor.getByRole("button", {name:"编辑",exact:true}).click();
  await expect(fileEditor.getByLabel("文档正文")).toHaveAttribute("contenteditable","true");
  await page.screenshot({path:join(artifacts,"docx-import-before-edit.png")});
  await fileEditor.getByLabel("文档正文").locator("p").last().click();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await page.keyboard.insertText("DOCX导入后直接编辑");
  await page.screenshot({path:join(artifacts,"docx-import-after-edit.png")});
  await expect(fileEditor).toBeVisible();
  await fileEditor.getByRole("button", {name:"完成编辑",exact:true}).click();
  await expect(fileEditor.getByRole("status")).toContainText("已保存",{timeout:15000});
  const importDownload = page.waitForEvent("download");
  await fileEditor.getByRole("button", {name:"下载 Word",exact:true}).click();
  const importedPath = join(artifacts,"docx-import-edited.docx");
  await (await importDownload).saveAs(importedPath);
  const importedZip = await JSZip.loadAsync(await readFile(importedPath));
  assert.match(await importedZip.file("word/document.xml").async("string"), /DOCX导入后直接编辑/);
  const originalDownload = page.waitForEvent("download");
  await fileEditor.getByRole("button", {name:"下载原文件",exact:true}).click();
  const originalPath = join(artifacts,"docx-import-original.docx");
  await (await originalDownload).saveAs(originalPath);
  assert.deepEqual(await readFile(originalPath), await readFile(join(workspace,fileDelivery.path)), "Original download is byte-for-byte unchanged");
  await fileEditor.getByRole("button", {name:"查看原始排版",exact:true}).click();
  await expect(page.frameLocator('iframe[title="Office 文档编辑"]').locator("#preview")).toContainText("原生加粗",{timeout:15000});
  await fileEditor.getByRole("button", {name:"返回编辑器",exact:true}).click();
  await expect(fileEditor.getByLabel("文档正文")).toContainText("DOCX导入后直接编辑",{timeout:15000});
  await page.reload();
  await page.getByRole("button", {name:"Configure later", exact:true}).click({timeout:4000}).catch(() => {});
  await page.evaluate(({sid,address}) => window.officeLiveProbe.file(sid,address), {sid,address:fileAddress});
  await expect(page.getByRole("region", {name:"DOCX文档编辑"}).getByLabel("文档正文")).toContainText("DOCX导入后直接编辑",{timeout:20000});
  await page.screenshot({path:join(artifacts,"docx-import-toolbar.png")});
  pass("DOCX file preview opens the same Tiptap Toolbar; human edits persist and export; original bytes and original preview remain available");
  if (realModel) {
    const real = await api(host, { action: "create" });
    await page.evaluate(
      (sid) => window.officeLiveProbe.open(sid),
      real.sessionId,
    );
    const suppliedPng = realRich ? await page.evaluate(()=>{const c=document.createElement("canvas");c.width=160;c.height=100;const ctx=c.getContext("2d");ctx.fillStyle="#3159b9";ctx.fillRect(0,0,160,100);return c.toDataURL("image/png").split(",")[1];}) : "";
    const baseline = await api(host, {
      action: "real-state",
      sessionId: real.sessionId,
    });
    const priorDocuments = new Set(baseline.documents.map((d) => d.documentId));
    const started = Date.now();
    await api(host, {
      action: "real-write",
      sessionId: real.sessionId,
      messageId: randomUUID(),
      prompt:
        realRich ? "请写一份门店经营分析报告，约200字，包含分析目标、问题分析和行动建议。没有实际数据的地方标明待确认。请在文档中插入一个两列三行表格，表头为问题、行动，列出排队时间和库存管理两项；并插入下面提供的PNG资料图片，图片160×100像素，居中，替代文字为门店分析资料图。请完成文档并交付Word文件。图片资料：data:image/png;base64," + suppliedPng : "请写一份门店经营分析报告，约200字，包含分析目标、问题分析和行动建议。没有实际数据的地方标明待确认。",
    });
    const samples = [];
    let state;
    const deadline = Date.now() + 180000;
    while (Date.now() < deadline) {
      state = await api(host, {
        action: "real-state",
        sessionId: real.sessionId,
      });
      state.documents = state.documents.filter(
        (d) => !priorDocuments.has(d.documentId),
      );
      const doc = state.documents[0];
      if (doc && samples.at(-1)?.revision !== doc.revision) {
        samples.push({
          revision: doc.revision,
          elapsedMs: Date.now() - started,
        });
        console.log(
          `Real document revision ${doc.revision} appeared after ${Date.now() - started}ms`,
        );
        await expect(page.getByLabel("文档正文")).toBeVisible({
          timeout: 10000,
        });
      }
      if (doc?.revision > 0 && state.status === "idle") break;
      if (state.status === "idle" && Date.now() - started > 15000) break;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    await writeFile(
      join(artifacts, "real-result.json"),
      JSON.stringify(
        {
          sessionId: real.sessionId,
          samples,
          trace: state?.trace,
          deliveries: state?.deliveries,
          status: state?.status,
          document: state?.documents[0],
        },
        null,
        2,
      ),
    );
    assert.ok(
      state?.documents[0]?.revision >= 2,
      "ordinary writing must create a live document and commit multiple batches",
    );
    assert.equal(state.status, "idle", "real model turn must finish");
    const calls = state.trace.filter((e) => e.type === "tool/call");
    assert.equal(
      calls[0]?.name,
      "content_open",
      "the first real model tool must open the document",
    );
    assert.ok(
      calls.filter((e) => e.name === "content_edit").length >= 2,
      "real model must commit multiple edits",
    );
    assert.ok(
      !calls.some((e) => ["bash", "skill", "write", "edit"].includes(e.name)),
      "live writing must not detour into shell/file generation skills",
    );
    await expect(page.getByLabel("文档正文")).toContainText("门店", {
      timeout: 10000,
    });
    assert.ok(calls.some(e => e.name === "content_export"), "Real model must export completed document");
    assert.ok(state.deliveries?.length, "Official present must persist the delivery event");
    const delivery = state.deliveries.at(-1).data.files[0];
    const exported = await readFile(join(workspace, delivery.path));
    const exportedZip = await JSZip.loadAsync(exported);
    const exportedXml = await exportedZip.file("word/document.xml").async("string");
    assert.match(exportedXml, /分析目标/);
    assert.match(exportedXml, /行动建议/);
    if (realRich) {
      await expect(page.getByLabel("文档正文").locator("table")).toContainText("库存管理");
      await expect(page.getByLabel("文档正文").locator('img[alt="门店分析资料图"]')).toBeVisible();
      assert.match(exportedXml, /<w:tbl>/);
      assert.match(exportedXml, /<w:drawing>/);
      assert.equal(Object.values(state.documents[0].state.blocks).find(b=>b.type==="image").image.src,"data:image/png;base64,"+suppliedPng,"Real model must retain supplied image bytes exactly");
      assert.ok(Object.keys(exportedZip.files).some(name=>name.startsWith("word/media/")));
      pass("Real model creates a semantic table and supplied embedded PNG in the live editor and exported DOCX");
    }
    await expect(page.getByText(delivery.description, {exact: true})).toBeVisible({timeout:15000});
    await expect(page.getByTestId("office-deliverables")).toHaveCount(0);
    await page.screenshot({ path: join(artifacts, "native-deliverable.png") });
    await page.getByRole("button", {name: `Preview ${delivery.path} in sidebar`, exact: true}).click();
    await expect(page.getByRole("region",{name:"DOCX文档编辑"}).getByLabel("文档编辑工具")).toBeVisible({timeout:20000});
    await page.getByRole("button",{name:"查看原始排版",exact:true}).click();
    const exportedFrame = page.frameLocator('iframe[title="Office 文档编辑"]');
    await expect(exportedFrame.locator("#preview")).toContainText("分析目标", {timeout:15000});
    const [cardDownload] = await Promise.all([page.waitForEvent("download"), page.getByRole("region",{name:"DOCX文档编辑"}).getByRole("button", {name: "下载原文件", exact:true}).click()]);
    const cardPath=join(artifacts, "native-card-document.docx");await cardDownload.saveAs(cardPath);
    assert.deepEqual(await readFile(cardPath),exported,"Original download from official delivery must preserve exported bytes");
    pass("Official card opens the real Word file in the Sidebar; the file preview supports browser download");
    await page.reload();
    await expect(page.getByText(delivery.description, {exact: true})).toBeVisible({timeout:15000});
    pass("Official file deliverable card appears from real present and survives refresh; custom Office card is absent");
    await page.screenshot({ path: join(artifacts, "real-document.png") });
    pass(
      "Ordinary natural-language writing uses live document tools and auto-opens the editor with multiple committed batches",
    );
  }
  }
  }
  }
  assert.deepEqual(browserErrors, []);
  await writeFile(
    join(artifacts, "result.json"),
    JSON.stringify(
      { checks, browserErrors, documentId: doc.documentId, realModel, realRich },
      null,
      2,
    ),
  );
} catch (error) {
  await writeFile(
    join(artifacts, "failure.txt"),
    String(error).replaceAll(credential || "\0", "[redacted]"),
  );
  await writeFile(
    join(artifacts, "host.log"),
    log
      .replaceAll(credential || "\0", "[redacted]")
      .replace(/token=[^\s]+/g, "token=[redacted]"),
  );
  const page = browser?.contexts()[0]?.pages()[0];
  if (page) {
    await page.screenshot({ path: join(artifacts, "failure.png") });
    await writeFile(
      join(artifacts, "failure-dom.txt"),
      await page.locator("body").innerText(),
    );
  }
  throw new Error((String(error)+"\n"+(error.stdout??"")+"\n"+(error.stderr??"")).replaceAll(credential || "\0", "[redacted]"));
} finally {
  await browser?.close();
  await stop();
  await unlink(join(home, ".credentials.yaml")).catch(() => {});
}
