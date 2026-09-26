import type {} from "@deepseek-ai/dsh-fs";
import { renderStylePreview } from "../presentation/style-preview.js";
import type { OfficeContentSnapshot } from "workdsh-contracts/office";
import type { Context } from "@deepseek-ai/cordis";
import { defineTool, type ToolRunContext } from "@deepseek-ai/dsh-tools";
import { capabilities, openInput, contentOpenInput, parse, ensure } from "./model.js";
import { exportAndPresent } from "./export.js";
import { registerAuthoringGuide } from "./authoring.js";
export const name = "workdsh-office-tools";
export const inject = [
  "fs",
  "tools",
  "systemPrompt",
  "workdshOfficeContent",
  "workdshIdentity",
];
const pdfGeometry={id:{type:"string",required:true},x:{type:"number",required:true},y:{type:"number",required:true},width:{type:"number",required:true},height:{type:"number",required:true}} as const;
const pdfPageSchema={type:"object",additionalProperties:false,properties:{id:{type:"string",required:true},width:{type:"number",required:true},height:{type:"number",required:true},background:{type:"string",required:true},elements:{type:"array",required:true,items:{oneOf:[{type:"object",additionalProperties:false,properties:{...pdfGeometry,type:{type:"string",const:"text",required:true},text:{type:"string",required:true},fontSize:{type:"number",required:true},lineHeight:{type:"number",required:true},color:{type:"string",required:true}}},{type:"object",additionalProperties:false,properties:{...pdfGeometry,type:{type:"string",const:"rectangle",required:true},fill:{type:"string",required:true}}}]}}}} as const;
const pdfOperation=[
 {type:"object",additionalProperties:false,properties:{op:{type:"string",const:"pdf.insertPage",required:true},afterPageId:{oneOf:[{type:"string"},{type:"null"}],required:true},page:{...pdfPageSchema,required:true}}},
 {type:"object",additionalProperties:false,properties:{op:{type:"string",const:"pdf.updatePage",required:true},pageId:{type:"string",required:true},page:{...pdfPageSchema,required:true}}},
 {type:"object",additionalProperties:false,properties:{op:{type:"string",const:"pdf.removePage",required:true},pageId:{type:"string",required:true}}},
] as const;
const string = { type: "string", required: true } as const;
const textStyleSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    fontFamily: {
      type: "string",
      description:
        "Font family, e.g. 宋体 or Calibri; letters, Chinese, spaces and hyphens only.",
    },
    fontSize: { type: "number", description: "Font size in points, 6–96." },
    color: { type: "string", description: "#rrggbb" },
    backgroundColor: { type: "string", description: "#rrggbb" },
  },
} as const;
const paragraphStyleSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    alignment: { type: "string", enum: ["left", "center", "right", "justify"] },
    lineHeight: {
      type: "number",
      description: "Line spacing multiplier, 1–3.",
    },
    indent: { type: "integer", description: "Indent steps, 0–6." },
  },
} as const;
const listSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    type: { type: "string", enum: ["bullet", "ordered"], required: true },
    depth: {
      type: "integer",
      description: "0–5; first item depth 0, no depth jumps.",
      required: true,
    },
    start: {
      type: "integer",
      description: "Ordered lists only; start number 1–9999.",
    },
    continuation: {
      type: "boolean",
      description:
        "True for another paragraph of the existing item at this depth.",
    },
  },
} as const;
const run = {
  type: "object",
  additionalProperties: false,
  properties: {
    text: string,
    style: textStyleSchema,
    marks: {
      type: "array",
      required: true,
      items: {
        type: "string",
        enum: ["bold", "italic", "underline", "strike"],
      },
    },
  },
} as const;
const blockProperties = {
  type: { type: "string", enum: ["paragraph", "heading", "table", "image", "chart"], required: true },
  level: {
    type: "integer",
    description: "Required for heading (1–6); omit for paragraph.",
  },
  runs: { type: "array", items: run, required: true },
  style: paragraphStyleSchema,
  list: listSchema,
} as const;
const paragraphBlock = {type:"object",additionalProperties:false,properties:{...blockProperties,type:{type:"string",enum:["paragraph","heading"],required:true}}} as const;
const extendedBlockProperties = {...blockProperties,
  table:{type:"object",additionalProperties:false,properties:{rows:{type:"array",required:true,items:{type:"object",additionalProperties:false,properties:{cells:{type:"array",required:true,items:{type:"object",additionalProperties:false,properties:{colspan:{type:"integer",required:true},rowspan:{type:"integer",required:true},header:{type:"boolean"},colwidth:{type:"array",items:{type:"integer"}},paragraphs:{type:"array",required:true,items:paragraphBlock}}}}}}}}},
  image:{type:"object",additionalProperties:false,properties:{src:{type:"string",required:true,description:"Use office-image:sourceDocumentId:blockId:hash returned by content_read to copy an image from an authorized Office document. New image: embedded PNG/JPEG data URL, up to 512 KiB. Remote URLs unsupported."},alt:{type:"string"},width:{type:"number",required:true},height:{type:"number",required:true},alignment:{type:"string",enum:["left","center","right"]}}},
  chart:{type:"object",additionalProperties:false,description:"Native editable Word chart. Supply structured data; never render a chart to PNG.",properties:{chartType:{type:"string",enum:["bar","line","pie","doughnut","area"],required:true},title:{type:"string"},categories:{type:"array",required:true,items:{type:"string"}},series:{type:"array",required:true,items:{type:"object",additionalProperties:false,properties:{name:{type:"string",required:true},values:{type:"array",required:true,items:{type:"number"}},color:{type:"string",description:"Optional #rrggbb series colour"}}}},width:{type:"number",required:true,description:"Display width in CSS pixels, 240–1200"},height:{type:"number",required:true,description:"Display height in CSS pixels, 160–800"},alignment:{type:"string",enum:["left","center","right"]},legend:{type:"string",enum:["none","top","right","bottom","left"]},xAxisTitle:{type:"string"},yAxisTitle:{type:"string"}}},
} as const;
const block = {
  type: "object",
  additionalProperties: false,
  properties: extendedBlockProperties,
} as const;
const operation = {
  oneOf: [
    {
      type: "object",
      additionalProperties: false,
      properties: {
        op: { type: "string", const: "document.insertBlocks", required: true },
        afterBlockId: {
          oneOf: [{ type: "string" }, { type: "null" }],
          required: true,
        },
        blocks: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: { ...extendedBlockProperties, clientRef: string },
          },
          required: true,
        },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      properties: {
        op: { type: "string", const: "document.replaceBlock", required: true },
        blockId: string,
        expectedText: string,
        block: { ...block, required: true },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      properties: {
        op: { type: "string", const: "document.removeBlock", required: true },
        blockId: string,
        expectedText: string,
      },
    },
  ],
} as const;
const snapshot = {
  type:"object",additionalProperties:false,
  properties:{documentId:string,kind:{type:"string",enum:["document","presentation","spreadsheet","html","pdf"],required:true},title:string,revision:{type:"integer",required:true},generation:string,
    state:{type:"object",additionalProperties:true,required:true,description:"document: modelVersion/blockIds/blocks; presentation: modelVersion/deck, pptx-viewer-core native slides and PPTX bytes with stable slide IDs and elements."}},
} as const;
const sheetCell={type:"object",additionalProperties:false,properties:{value:{oneOf:[{type:"string"},{type:"number"},{type:"boolean"},{type:"null"}]},formula:{type:"string",description:"= prefixed formula; omit value"}}} as const;
const sheetOperation={oneOf:[
 {type:"object",additionalProperties:false,properties:{op:{type:"string",const:"spreadsheet.setCells",required:true},sheetId:string,cells:{type:"array",required:true,items:{type:"object",additionalProperties:false,properties:{address:{...string,description:"A1 address, within A1:CV1000"},cell:{...sheetCell,required:true}}}}}},
 {type:"object",additionalProperties:false,properties:{op:{type:"string",const:"spreadsheet.clearCells",required:true},sheetId:string,addresses:{type:"array",required:true,items:{type:"string"}}}},
 ...["spreadsheet.addSheet","spreadsheet.renameSheet"].map(op=>({type:"object" as const,additionalProperties:false as const,properties:{op:{type:"string" as const,const:op,required:true as const},sheetId:string,name:string}})),
 {type:"object",additionalProperties:false,properties:{op:{type:"string",const:"spreadsheet.removeSheet",required:true},sheetId:string}},
]} as const;
const pptOperation={oneOf:[
 {type:"object",additionalProperties:false,properties:{op:{type:"string",const:"presentation.updateText",required:true},slideId:string,elementId:string,expectedText:string,text:string}},
 {type:"object",additionalProperties:false,properties:{op:{type:"string",const:"presentation.updateSlide",required:true},slideId:string,patch:{type:"object",required:true,additionalProperties:false,properties:{elements:{type:"array",items:{type:"object",additionalProperties:true}},name:{type:"string"},backgroundColor:{type:"string"},notes:{type:"string"}}}}},
 {type:"object",additionalProperties:false,properties:{op:{type:"string",const:"presentation.insertSlides",required:true},afterSlideId:{oneOf:[{type:"string"},{type:"null"}],required:true},slides:{type:"array",required:true,items:{type:"object",additionalProperties:true,description:"One pptx-viewer-core native slide. Use state.deck.canvas exactly; geometry x,y,width,height is top-left CSS pixels and must remain inside the canvas. textStyle.fontSize is points, not a canvas coordinate. chartData holds chartType,categories,series [{name,values}]."}}}},
 {type:"object",additionalProperties:false,properties:{op:{type:"string",const:"presentation.removeSlide",required:true},slideId:string}},
 {type:"object",additionalProperties:false,properties:{op:{type:"string",const:"presentation.moveSlide",required:true},slideId:string,afterSlideId:{oneOf:[{type:"string"},{type:"null"}],required:true}}},
]} as const;
const render = (_args: unknown, value: unknown) => [
  { type: "text" as const, text: JSON.stringify(value) },
];
async function actor(ctx: Context, exec: ToolRunContext) {
  exec.signal.throwIfAborted();
  return ctx.workdshIdentity.resolve(
    exec.agent ? { sessionId: String(exec.agent.id) } : undefined,
    exec.signal,
  );
}
type WireValue = string | number | boolean | null | WireValue[] | {[key:string]:WireValue};
function jsonValue(value:unknown):WireValue {
  if(value===null || typeof value==="string" || typeof value==="number" || typeof value==="boolean") return value;
  if(Array.isArray(value)) return value.map(jsonValue);
  if(typeof value==="object") return Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined).map(([k,v])=>[k,jsonValue(v)]));
  throw new Error("Invalid Office wire value");
}
function objectInput(value: unknown): unknown {
  if (typeof value !== "string") return value;
  ensure(Buffer.byteLength(value) <= capabilities.limits.batchBytes,
    "LIMIT_REACHED", "单批编辑不能超过 1 MiB。");
  let decoded: unknown;
  try { decoded = JSON.parse(value); }
  catch { ensure(false, "INVALID_INPUT", "input JSON 字符串无法解析。"); }
  ensure(decoded !== null && typeof decoded === "object" && !Array.isArray(decoded),
    "INVALID_INPUT", "input JSON 必须解码为对象。");
  return decoded;
}
function wire(s:OfficeContentSnapshot) {
 return {...s,state:jsonValue(s.state) as {[key:string]:WireValue}};
}
export function apply(ctx: Context) {
  for (const toolName of [
    "content_import_pptx",
    "content_preview_styles",
    "content_open",
    "content_read",
    "content_capabilities",
    "content_edit",
    "content_present",
    "content_export",
  ]) {
    if (ctx.tools.get(toolName))
      throw new Error(`Office tool name already registered: ${toolName}`);
  }
  registerAuthoringGuide(ctx);
  ctx.effect(() => ctx.tools.register(defineTool({
    name:"content_import_pptx",
    description:"Open a real PPTX template/file as a separate editable live working copy. Read the known file path via the calling Session Harness filesystem. Preserve original package, masters, layouts, theme and media; never modify the source file. Use this instead of source=new when a customer template is required. Reuse operationId and identical file bytes on retries. Inspect imported slides before editing, retain native metadata, and never treat template sample text as report facts. Limit 8 MiB, 50 slides, 200 elements per slide.",
    parameters:{path:string,title:string,operationId:string},
    output:{schema:snapshot,render},
    execute:async(args,exec)=>{
      const identity=await actor(ctx,exec);
      ensure(ctx.fs,"UNAVAILABLE","此会话没有 Harness 文件服务，不能导入模板。");
      const target=await ctx.fs.resolve(args.path,{cwd:exec.agent?.session.header.cwd,signal:exec.signal});
      const bytes=await ctx.fs.readBytes(target,exec.signal,8*1024*1024);
      return wire(ctx.workdshOfficeContent.projectForAgent(await ctx.workdshOfficeContent.open(identity,{source:"pptx",kind:"presentation",title:args.title,operationId:args.operationId,bytes:Buffer.from(bytes).toString("base64")},exec.signal)));
    },
  })));

  ctx.effect(() => ctx.tools.register(
    defineTool({
      name: "content_export",
      description:
        "Export a committed PDF working copy as its actual PDF file, or HTML webpage as its actual HTML file, or Word document as real DOCX or native presentation as real PPTX, or spreadsheet as real XLSX through the official present card. Use baseRevision from content_read. Same document/revision/content has a stable path; uncertain-write retries check existing bytes and never overwrite conflicts. Uses official bash approval and requires bash/present in this Session. On delivery-only failure, check the card and retry present for the returned path. The live editor remains editable. Tables and embedded PNG/JPEG images are retained; complex Word pagination is not lossless.",
      parameters: { documentId: string, baseRevision: {type: "integer", description: "Latest revision from content_read. Reuse on uncertain-write retries; rejects changed document revisions."} },
      output: {
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            documentId: string,
            revision: { type: "integer", required: true },
            path: string,
            status: { type: "string", const: "presented", required: true },
          },
        },
        render,
      },
      execute: async (args, exec) =>
        exportAndPresent(
          ctx,
          exec,
          await ctx.workdshOfficeContent.read(
            await actor(ctx, exec),
            args.documentId,
            exec.signal,
          ),
          args.baseRevision,
        ),
    }),
  ));
  ctx.effect(() => ctx.tools.register(
    defineTool({
      name: "content_open",
      description:
        "Create or reopen Word, PPT, Excel, PDF or a live single-file HTML webpage. For new PDF use kind=pdf, source=new; read pages and edit one page through pdf.updatePage/insertPage/removePage. Coordinates are top-left points, A4 595.28x841.89. Text and rectangles are supported; Chinese font is bundled. Existing arbitrary PDF import/OCR/image editing is unavailable. For HTML use kind=html, source=new, then html.replaceDocument with a complete self-contained HTML string in each meaningful batch; preview opens immediately and refreshes after committed revisions. Inline scripts/styles work; external dependencies are blocked in preview. For Excel use kind=spreadsheet, source=new; returned state has sheetOrder and sheets with A1-keyed cells. For a customer PPTX template call content_import_pptx with its actual path; never substitute a blank deck. For an ordinary new PPT set input.kind=presentation, source=new, title and operationId; optional brief. Automatically opens the live right-hand editor immediately; no content_present call is needed. New documents start with one empty paragraph. Use content_edit in small meaningful batches as you write so the user sees progress in the document, rather than waiting for the whole report. Reuse operationId on retries. This is not DOCX import.",
      parameters: {
        input: {
          oneOf: [
            {
              type: "object",
              additionalProperties: false,
              properties: {
                source: { type: "string", const: "new", required: true },
                title: string,
                operationId: string,
              },
            },
            {
              type: "object",
              additionalProperties: false,
              properties: {
                source: { type: "string", const: "existing", required: true },
                documentId: string,
              },
            },
            {type:"object",additionalProperties:false,properties:{source:{type:"string",const:"new",required:true},kind:{type:"string",const:"html",required:true},title:string,operationId:string}},
            {type:"object",additionalProperties:false,properties:{source:{type:"string",const:"new",required:true},kind:{type:"string",const:"pdf",required:true},title:string,operationId:string}},
            ...(ctx.workdshOfficeContent.spreadsheetEnabled?[{type:"object",additionalProperties:false,properties:{source:{type:"string",const:"new",required:true},kind:{type:"string",const:"spreadsheet",required:true},title:string,operationId:string}} as const]:[]),
            ...(ctx.workdshOfficeContent.presentationEnabled?[{type:"object",additionalProperties:false,properties:{source:{type:"string",const:"new",required:true},kind:{type:"string",const:"presentation",required:true},title:string,operationId:string,brief:{type:"string",description:"Optional planning context; opening initializes only one title page. Add/update each slide in a separate content_edit."}}} as const]:[]),
          ],
          required: true,
        },
      },
      output: { schema: snapshot, render },
      execute: async (args, exec) =>
        wire(
          ctx.workdshOfficeContent.projectForAgent(await ctx.workdshOfficeContent.open(
            await actor(ctx, exec),
            parse(contentOpenInput, args.input),
            exec.signal,
          )),
        ),
    }),
  ));
  ctx.effect(() => ctx.tools.register(defineTool({
    name: "content_preview_styles",
    description: "Save four PPT cover style previews in the calling Session right sidebar. This is an HTML planning preview, not a PPT export or a submitted user choice. Then use official ask_user_question with the returned A–D labels and wait. Red means four red directions, not automatically red-gold. After a choice, reopen the original presentation by documentId and apply the selected palette/layout to native slides. Reuse operationId and identical arguments on retries.",
    parameters: {title:string,subtitle:{type:"string"},footer:{type:"string"},family:{type:"string",enum:["general","red"]},recommended:{type:"string",enum:["A","B","C","D"]},operationId:string},
    output:{schema:{type:"object",additionalProperties:true},render},
    execute: async(args,exec) => {
      const {html,styles}=renderStylePreview(args);
      const owner=await actor(ctx,exec);
      const opened=await ctx.workdshOfficeContent.open(owner,{source:"new",kind:"html",title:"PPT 风格预览",operationId:args.operationId},exec.signal);
      const current=await ctx.workdshOfficeContent.read(owner,opened.documentId,exec.signal);
      if (current.kind!=="html") throw new Error("Style preview operationId belongs to another document kind");
      // A lost receipt can be retried without advancing a persisted identical preview.
      if (current.state.html!==html) await ctx.workdshOfficeContent.editForAgent(owner,{documentId:current.documentId,baseRevision:current.revision,operationId:args.operationId+"-preview",operations:[{op:"html.replaceDocument",html}]},exec.signal);
      const presented=await ctx.workdshOfficeContent.present(owner,current.documentId,exec.signal);
      return {documentId:current.documentId,status:presented.status,styles:styles.map(s=>({...s,label:s.id+" · "+s.name})),next:"Ask via ask_user_question, wait, then reopen the original native presentation. Preview cards do not submit answers."};
    },
  })));
  ctx.effect(() => ctx.tools.register(
    defineTool({
      name: "content_read",
      description:
        "Read the latest committed document, revision and stable block/run IDs. Re-read after a user edit or REVISION_CONFLICT; never guess revision or text. Image src values are opaque references, not Base64; copy them exactly into content_edit for the target document; source read access is checked.",
      parameters: { documentId: string },
      output: { schema: snapshot, render },
      execute: async (args, exec) =>
        wire(
          ctx.workdshOfficeContent.projectForAgent(await ctx.workdshOfficeContent.read(
            await actor(ctx, exec),
            args.documentId,
            exec.signal,
          )),
        ),
    }),
  ));
  ctx.effect(() => ctx.tools.register(
    defineTool({
      name: "content_capabilities",
      description:
        "Discover implemented operations and limits. Word supports native paragraphs/headings/tables/embedded images and structured editable charts; DOCX export writes Office chart parts with embedded workbooks instead of chart pictures. Browser DOCX working-copy import is available but complex objects are not lossless. pptx-react-viewer presentations support native slides and editable charts; PPTX download is available in the right-hand editor, content_export delivers the saved PPTX through the official file card. Excel supports new live workbooks, A1 cell values/formulas, and sheet add/rename/remove; browser Univer computes formulas, Host does not. Excel formatting/charts and live XLSX import remain unavailable.",
      parameters: {},
      output: {
        schema: {
          type: "object",
          additionalProperties: true,
          description:
            "Versioned capability descriptor: operations, marks, limits, import/export availability.",
        },
        render,
      },
      execute: async (_args, exec) => {
        await actor(ctx, exec);
        return JSON.parse(JSON.stringify(ctx.workdshOfficeContent.capabilities()));
      },
    }),
  ));
  ctx.effect(() => ctx.tools.register(
    defineTool({
      name: "content_edit",
      description:
        "Atomically commit a small streamed batch: at most 4 typed operations / 1 MiB; Word insert calls contain at most 8 top-level blocks, with a table in its own call. Each batch is visible without waiting for the whole answer. Use baseRevision from content_read and a new operationId. Retry uncertain delivery with exactly the same payload and ID. HUMAN_EDITING: user holds the editor; stop writing and wait, do not repeatedly call. A committed receipt is durable content, not an exported Office file.",
      parameters: {
        input: {
          oneOf: [{
            type: "object",
            additionalProperties: false,
            properties: {
              documentId: string,
              baseRevision: { type: "integer", required: true },
              operationId: string,
              operations: { type: "array", required: true, description: "Keep streamed JSON bounded. For Word, insert no more than 8 top-level blocks per call and put a table or chart in its own call.", items: {oneOf:[...operation.oneOf,...pdfOperation,{type:"object",additionalProperties:false,properties:{op:{type:"string",const:"html.replaceDocument",required:true},html:string}},...(ctx.workdshOfficeContent.spreadsheetEnabled?sheetOperation.oneOf:[]),...(ctx.workdshOfficeContent.presentationEnabled?pptOperation.oneOf:[])]} },
            },
          }, {
            type: "string",
            description: "Compatibility only: one JSON-encoded input object. Prefer the object form.",
          }],
          required: true,
        },
      },
      output: {
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            operationId: string,
            revision: { type: "integer", required: true },
            status: { type: "string", const: "committed", required: true },
            ids: {
              type: "object",
              additionalProperties: true,
              required: true,
              description: "clientRef to assigned blockId mapping",
            },
          },
        },
        render,
      },
      execute: async (args, exec) =>
        ctx.workdshOfficeContent.editForAgent(
          await actor(ctx, exec),
          objectInput(args.input),
          exec.signal,
        ),
    }),
  ));
  ctx.effect(() => ctx.tools.register(
    defineTool({
      name: "content_present",
      description:
        "Request this document in the calling Session right sidebar. Call once, then continue edit batches. status=requested does not claim a browser displayed it. Never switches another Session.",
      parameters: { documentId: string },
      output: {
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            requestId: string,
            documentId: string,
            revision: { type: "integer", required: true },
            status: { type: "string", const: "requested", required: true },
          },
        },
        render,
      },
      execute: async (args, exec) =>
        ctx.workdshOfficeContent.present(
          await actor(ctx, exec),
          args.documentId,
          exec.signal,
        ),
    }),
  ));
}
