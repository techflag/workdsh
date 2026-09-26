import {pdfBytes} from "../pdf/encode.js";
import {spreadsheetXlsx} from "../spreadsheet/xlsx.js";
import type { Context } from "@deepseek-ai/cordis";
import type { ToolRunContext } from "@deepseek-ai/dsh-tools";
import type { OfficeContentSnapshot } from "workdsh-contracts/office";
import { documentDocx } from "../live/docx.js";
import { parsePresentation } from "../presentation/native-deck.js";
import { createHash } from "node:crypto";
/** Binary writes travel through the official bash policy pipeline, never bare Host fs. */
export async function exportAndPresent(
  ctx: Context,
  exec: ToolRunContext,
  snapshot: OfficeContentSnapshot,
  baseRevision?: number,
) {
  const isPpt = snapshot.kind === "presentation";
  const isPdf=snapshot.kind === "pdf";
  const isHtml=snapshot.kind === "html";
  const isSheet=snapshot.kind === "spreadsheet";
  const format = isPdf ? "PDF" : isHtml ? "HTML" : isSheet ? "Excel" : isPpt ? "PPT" : "Word";
  const extension = isPdf ? "pdf" : isHtml ? "html" : isSheet ? "xlsx" : isPpt ? "pptx" : "docx";
  exec.signal.throwIfAborted();
  if (baseRevision !== undefined && baseRevision !== snapshot.revision)
    throw new Error("REVISION_CONFLICT: 文档已更新，请读取最新修订后重新导出。");
  if (
    !exec.agent ||
    !ctx.tools.get("bash", exec.agent) ||
    !ctx.tools.get("present", exec.agent)
  )
    throw new Error(
      `${format} 文件交付需要当前会话的官方 bash 和 present 工具；右侧下载仍可使用。`,
    );
  const bytes = snapshot.kind === "pdf" ? Buffer.from(await pdfBytes(snapshot,exec.signal)) : snapshot.kind === "html" ? Buffer.from(snapshot.state.html,"utf8") : snapshot.kind === "spreadsheet" ? Buffer.from(await spreadsheetXlsx(snapshot)) : snapshot.kind === "presentation"
    ? Buffer.from(parsePresentation(snapshot.state.deck).bytes, "base64")
    : Buffer.from(await (await documentDocx(snapshot)).arrayBuffer());
  const maxBytes = (isPpt||isPdf) ? 8 * 1024 * 1024 : 1024 * 1024;
  if (bytes.length > maxBytes) throw new Error(`${format} 导出超过 ${(isPpt||isPdf) ? 8 : 1} MiB 上限。`);
  const title =
    snapshot.title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 40) ||
    "文档";
  const digest = createHash("sha256").update(bytes).digest("hex");
  const identity = createHash("sha256").update(snapshot.documentId).digest("hex").slice(0, 16);
  const filename = `${title}-r${snapshot.revision}-${identity}-${digest}.${extension}`;
  const path = `output/${filename}`;
  const marker = `OFFICE_EXPORTED_${crypto.randomUUID()}`;
  // All variable command tokens are generated UUIDs or base64. No user content/path becomes code.
  // Write a complete temporary file before linking it into its stable destination.
  // Existing destination bytes are checked; neither symlinks nor changed files are overwritten.
  const script = `const fs=require("node:fs"),crypto=require("node:crypto");fs.mkdirSync("output",{recursive:true});if(!fs.lstatSync("output").isDirectory())throw Error("Invalid output directory");const p=Buffer.from("${Buffer.from(path).toString("base64")}","base64").toString("utf8"),b=Buffer.from("${bytes.toString("base64")}","base64"),t="output/.office-${crypto.randomUUID()}.tmp";fs.writeFileSync(t,b,{flag:"wx"});try{try{fs.linkSync(t,p)}catch(e){if(e.code!=="EEXIST")throw e;if(!fs.lstatSync(p).isFile()||crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex")!=="${digest}")throw Error("Export destination conflict")}}finally{fs.unlinkSync(t)}console.log("${marker}")`;
  const commands = [`node -e '${script}'`];
  if (bytes.length > 96 * 1024) {
    // PPTX templates, embedded PDF fonts and other large files exceed shell
    // argument/terminal-input limits. Bound commands for every format.
    // Every chunk still runs through the official bash approval and sandbox chain.
    const temp = `output/.office-${crypto.randomUUID()}.tmp`;
    const encodedPath=Buffer.from(path).toString("base64");
    commands.length=0;
    for(let offset=0;offset<bytes.length;offset+=96*1024){
      const chunk=bytes.subarray(offset,offset+96*1024).toString("base64");
      const initialize=offset===0 ? `fs.mkdirSync("output",{recursive:true});if(!fs.lstatSync("output").isDirectory())throw Error("Invalid output directory");fs.writeFileSync(t,Buffer.alloc(0),{flag:"wx"});` : "";
      const final=offset+96*1024>=bytes.length ? `const p=Buffer.from("${encodedPath}","base64").toString("utf8");if(crypto.createHash("sha256").update(fs.readFileSync(t)).digest("hex")!=="${digest}")throw Error("Export digest mismatch");try{try{fs.linkSync(t,p)}catch(e){if(e.code!=="EEXIST")throw e;if(!fs.lstatSync(p).isFile()||crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex")!=="${digest}")throw Error("Export destination conflict")}}finally{fs.unlinkSync(t)}` : "";
      commands.push(`node -e 'const fs=require("node:fs"),crypto=require("node:crypto"),t="${temp}";${initialize}if(!fs.lstatSync(t).isFile())throw Error("Invalid temporary file");fs.appendFileSync(t,Buffer.from("${chunk}","base64"));${final}console.log("${marker}")'`);
    }
  }
  for(const [index,command] of commands.entries()) {
    exec.signal.throwIfAborted();
    let write;
    try { write = await ctx.tools.execute({
      name:"bash",arguments:{command,description:`Export current document as ${format}${commands.length>1?` (${index+1}/${commands.length})`:""}`,timeoutMs:30000},
      callId:`${exec.callId}:office-write${index?`-${index}`:""}` as typeof exec.callId,
      rootCallId:exec.rootCallId,parent:exec.token,agent:exec.agent,signal:exec.signal,
    }); } catch {
      throw new Error(`${format} 写入结果未知：${path}。未交付文件；重试 content_export 时使用同一 documentId 和 baseRevision ${snapshot.revision}，先核对已有文件，不覆盖原件。`);
    }
    for(const context of write.additionalContexts??[])exec.deferContext(context);
    if(write.isError||!write.content.some(b=>b.type==="text"&&b.text.includes(marker)))throw new Error(`${format} 文件写入失败、被策略拒绝或结果未知，未交付文件。目标 ${path}；可使用同一修订 ${snapshot.revision} 重试导出并核对已有文件，或使用右侧下载。`);
  }
  exec.signal.throwIfAborted();
  let present;
  try { present = await ctx.tools.execute({
    name: "present",
    arguments: {
      files: [
        {
          path,
          description: `${snapshot.title} · ${format} · 修订 ${snapshot.revision}`,
        },
      ],
    },
    callId: `${exec.callId}:office-present` as typeof exec.callId,
    rootCallId: exec.rootCallId,
    parent: exec.token,
    agent: exec.agent,
    signal: exec.signal,
  }); } catch {
    throw new Error(`${format} 已导出到 ${path}，但原生交付结果未知，请核对卡片后对该路径重试 present。`);
  }
  for (const context of present.additionalContexts ?? [])
    exec.deferContext(context);
  if (present.isError)
    throw new Error(
      `${format} 已导出到 ${path}，但原生交付失败，请对该路径重试 present。`,
    );
  return {
    documentId: snapshot.documentId,
    revision: snapshot.revision,
    path,
    status: "presented" as const,
  };
}
