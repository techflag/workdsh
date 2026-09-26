import JSZip from "jszip";
import { blockInput, parse } from "../content/model.js";
import type { OfficeBlockInput, OfficeParagraphInput, OfficeMark, OfficeTextStyle } from "workdsh-contracts/office";
const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const children = (el: Element, name: string) => Array.from(el.children).filter(x => x.namespaceURI === W && x.localName === name);
const child = (el: Element | undefined, name: string) => el ? children(el, name)[0] : undefined;
const val = (el: Element | undefined, attr = "val") => el?.getAttributeNS(W, attr) ?? undefined;
const enabled = (el: Element | undefined) => !!el && !["0", "false", "off"].includes(val(el) ?? "");
async function xmlPart(zip: JSZip, name: string): Promise<Document | undefined> {
  const file = zip.file(name);
  if (!file) return;
  const text = await new Promise<string>((resolve, reject) => {
    let result = "";
    // JSZip's documented StreamHelper API is omitted from its JSZipObject typings.
    interface Stream {on(event: string, callback: (chunk: string) => void): Stream; pause(): Stream; resume(): Stream}
    const stream = (file as unknown as {internalStream(type: "string"): Stream}).internalStream("string");
    stream.on("data", chunk => {
      result += chunk;
      if (result.length > 1024 * 1024) {stream.pause(); reject(new Error("DOCX XML超过1 MiB导入限额。"));}
    }).on("error", reject).on("end", () => resolve(result)).resume();
  });
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error("不支持含DTD或实体声明的DOCX。");
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("DOCX XML损坏，无法导入。");
  return doc;
}
function runProps(rPr: Element | undefined) {
  const marks: OfficeMark[] = [];
  for (const [tag, mark] of [["b","bold"],["i","italic"],["u","underline"],["strike","strike"]] as const)
    if (enabled(child(rPr, tag)) && val(child(rPr, tag)) !== "none") marks.push(mark);
  const style: OfficeTextStyle = {};
  const fonts = child(rPr, "rFonts"), family = val(fonts, "eastAsia") ?? val(fonts, "ascii");
  if (family && /^[a-zA-Z0-9\u3400-\u9fff -]{1,80}$/.test(family)) style.fontFamily = family;
  const size = Number(val(child(rPr, "sz"))) / 2;
  if (size >= 6 && size <= 96) style.fontSize = size;
  const color = val(child(rPr, "color"));
  if (color && /^[a-fA-F0-9]{6}$/.test(color)) style.color = "#" + color;
  const background = val(child(rPr, "shd"), "fill");
  if (background && /^[a-fA-F0-9]{6}$/.test(background)) style.backgroundColor = "#" + background;
  return {marks, style};
}
/** Import a bounded semantic working copy. Never executes OOXML, fetches relationships, or overwrites source bytes. */
export async function importDocx(bytes: Uint8Array, address: string) {
  if (bytes.byteLength > 10 * 1024 * 1024) throw new Error("DOCX超过10 MiB导入限额。");
  const zip = await JSZip.loadAsync(bytes), doc = await xmlPart(zip, "word/document.xml");
  if (!doc) throw new Error("文件不是有效DOCX：缺少正文。");
  const body = doc.getElementsByTagNameNS(W, "body")[0];
  if (!body) throw new Error("DOCX缺少正文节点。");
  const styles = await xmlPart(zip, "word/styles.xml");
  const styleMap = new Map<string, Element>();
  for (const el of Array.from(styles?.getElementsByTagNameNS(W, "style") ?? [])) {
    const id = val(el, "styleId"); if (id) styleMap.set(id, el);
  }
  const defaults = styles?.getElementsByTagNameNS(W, "docDefaults")[0];
  const baseProps = runProps(child(child(defaults, "rPrDefault"), "rPr"));
  const paragraphs = Array.from(body.getElementsByTagNameNS(W, "p"));
  if (paragraphs.length > 2000) throw new Error("DOCX超过2000段导入限额。");
  function paragraph(p:Element):OfficeParagraphInput {
    const pPr = child(p, "pPr"), styleId = val(child(pPr, "pStyle"));
    const s = styleId ? styleMap.get(styleId) : undefined;
    const styleProps = runProps(child(s, "rPr"));
    const heading = /heading\s*([1-6])/i.exec(styleId ?? val(child(s, "name")) ?? "");
    const outline = Number(val(child(pPr, "outlineLvl")) ?? val(child(child(s, "pPr"), "outlineLvl")) ?? -1);
    const level = heading ? Number(heading[1]) : outline >= 0 && outline < 6 ? outline + 1 : undefined;
    const runs = Array.from(p.getElementsByTagNameNS(W, "r")).map(r => {
      const local = runProps(child(r, "rPr"));
      const marks = new Set([...baseProps.marks, ...styleProps.marks, ...local.marks]);
      for (const [tag, mark] of [["b","bold"],["i","italic"],["u","underline"],["strike","strike"]] as const)
        if (child(child(r, "rPr"), tag) && (!enabled(child(child(r, "rPr"), tag)) || val(child(child(r,"rPr"),tag)) === "none")) marks.delete(mark);
      const text = Array.from(r.children).map(x => x.namespaceURI !== W ? "" : x.localName === "t" ? x.textContent ?? "" : x.localName === "tab" ? "\t" : ["br", "cr"].includes(x.localName) ? "\n" : "").join("");
      return {text, marks: [...marks], style: {...baseProps.style, ...styleProps.style, ...local.style}};
    });
    const alignmentValue = val(child(pPr, "jc")) ?? val(child(child(s, "pPr"), "jc"));
    const alignment = alignmentValue === "both" ? "justify" : alignmentValue;
    const style: NonNullable<OfficeBlockInput["style"]> = {};
    if (["left", "center", "right", "justify"].includes(alignment ?? "")) style.alignment = alignment as typeof style.alignment;
    const spacing = child(pPr, "spacing"), line = Number(val(spacing, "line")) / 240;
    if ((!val(spacing, "lineRule") || val(spacing, "lineRule") === "auto") && line >= 1 && line <= 3) style.lineHeight = line;
    return {type: level ? "heading" : "paragraph", ...(level ? {level} : {}), runs, style};
  }
  const warnings:string[]=[];
  const R="http://schemas.openxmlformats.org/officeDocument/2006/relationships", A="http://schemas.openxmlformats.org/drawingml/2006/main", WP="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
  const relationships=await xmlPart(zip,"word/_rels/document.xml.rels");
  const rels=new Map(Array.from(relationships?.getElementsByTagNameNS("http://schemas.openxmlformats.org/package/2006/relationships","Relationship") ?? []).map(el=>[el.getAttribute("Id"),el]));
  async function images(p:Element):Promise<OfficeBlockInput[]> {
    const result:OfficeBlockInput[]=[];
    for(const drawing of Array.from(p.getElementsByTagNameNS(W,"drawing"))) {
      const blip=drawing.getElementsByTagNameNS(A,"blip")[0], rel=rels.get(blip?.getAttributeNS(R,"embed") ?? "");
      const target=rel?.getAttribute("Target") ?? "";
      const internal=target.replace(/^\/word\//,"");
      if(!rel || rel.getAttribute("TargetMode")==="External" || !rel.getAttribute("Type")?.endsWith("/image") || !/^media\/[a-zA-Z0-9_.-]+\.(png|jpe?g)$/i.test(internal)) {warnings.push("图片/图表");continue;}
      const file=zip.file("word/"+internal);if(!file){warnings.push("图片/图表");continue;}
      const data=await new Promise<Uint8Array>((resolve,reject)=>{
        let length=0;const chunks:Uint8Array[]=[];
        interface Stream {on(event:string,callback:(chunk:Uint8Array)=>void):Stream;pause():Stream;resume():Stream}
        const stream=(file as unknown as {internalStream(type:"uint8array"):Stream}).internalStream("uint8array");
        stream.on("data",chunk=>{length+=chunk.length;if(length>524288){stream.pause();reject(new Error("DOCX图片超过512 KiB限额，请先压缩图片。"));}else chunks.push(chunk);}).on("error",reject).on("end",()=>{const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}resolve(bytes);}).resume();
      });
      const extent=drawing.getElementsByTagNameNS(WP,"extent")[0], props=drawing.getElementsByTagNameNS(WP,"docPr")[0];
      const width=Number(extent?.getAttribute("cx"))/9525,height=Number(extent?.getAttribute("cy"))/9525;
      const src=`data:image/${/\.png$/i.test(internal) ? "png" : "jpeg"};base64,${btoa(Array.from(data,b=>String.fromCharCode(b)).join(""))}`;
      const alignment=paragraph(p).style?.alignment;
      const image:OfficeBlockInput={type:"image",runs:[],image:{src,width,height,alt:props?.getAttribute("descr") ?? "",alignment:alignment === "justify" ? "left" : alignment ?? "left"}};
      parse(blockInput,image);result.push(image);
      if(drawing.getElementsByTagNameNS(WP,"anchor").length) warnings.push("浮动图片布局");
    }
    return result;
  }
  function table(tbl:Element):OfficeBlockInput {
    if(tbl.getElementsByTagNameNS(W,"tbl").length) throw new Error("暂不支持嵌套表格，请保留原件。");
    const grid=children(child(tbl,"tblGrid") ?? tbl,"gridCol").map(el=>Number(val(el,"w"))/15);
    const active=new Map<number,NonNullable<OfficeBlockInput["table"]>["rows"][number]["cells"][number]>();
    const rows=children(tbl,"tr").map(tr=>{
      let col=0;const cells:NonNullable<OfficeBlockInput["table"]>["rows"][number]["cells"][number][]=[];
      const continuing=new Set<number>();
      if(child(child(tr,"trPr"),"gridBefore") || child(child(tr,"trPr"),"gridAfter")) throw new Error("暂不支持不完整表格网格。");
      for(const tc of children(tr,"tc")) {
        const props=child(tc,"tcPr"),span=Number(val(child(props,"gridSpan")) ?? 1),merge=child(props,"vMerge");
        if(tc.getElementsByTagNameNS(W,"drawing").length) throw new Error("暂不支持单元格内图片，请保留原件。");
        if(merge && val(merge)!=="restart") {
          const previous=active.get(col);if(!previous || previous.colspan!==span) throw new Error("DOCX表格合并结构无效。");
          previous.rowspan++;continuing.add(col);
        } else {
          const paragraphs=children(tc,"p").map(paragraph);if(!paragraphs.length) paragraphs.push({type:"paragraph",runs:[]});
          const colwidth=grid.slice(col,col+span).map(n=>Math.round(n));
          const cell={colspan:span,rowspan:1,paragraphs,...(colwidth.length===span && colwidth.every(n=>n>=25 && n<=2000) ? {colwidth} : {}),...(enabled(child(child(tr,"trPr"),"tblHeader")) ? {header:true} : {})};
          cells.push(cell);if(merge){active.set(col,cell);continuing.add(col);}else active.delete(col);
        }
        col+=span;
      }
      for(const key of active.keys()) if(!continuing.has(key)) active.delete(key);
      return {cells};
    });
    const block:OfficeBlockInput={type:"table",runs:[],table:{rows}};parse(blockInput,block);return block;
  }
  const blocks:OfficeBlockInput[]=[];
  for(const node of Array.from(body.children)) {
    if(node.namespaceURI!==W) continue;
    if(node.localName==="tbl") blocks.push(table(node));
    else if(node.localName==="p") {
      const text=paragraph(node), embedded=await images(node);
      if(text.runs.some(r=>r.text) || !embedded.length) blocks.push(text);
      if(text.runs.some(r=>r.text) && embedded.length) warnings.push("段内图片位置");
      blocks.push(...embedded);
    } else if(node.localName!=="sectPr") warnings.push("未支持的正文对象");
  }
  if (!blocks.length) blocks.push({type:"paragraph", runs:[]});
  if (new TextEncoder().encode(JSON.stringify(blocks)).byteLength > 1000000) throw new Error("导入正文超过1 MiB，请拆分文档。");

  for (const [tag, label] of [["pict","绘图"],["numPr","列表编号"],["fldChar","目录/域"],["fldSimple","目录/域"],["hyperlink","超链接"],["sectPr","页面设置"]])
    if (body.getElementsByTagNameNS(W, tag).length) warnings.push(label);
  if (Object.keys(zip.files).some(name => /^word\/(header|footer|footnotes|endnotes)/.test(name))) warnings.push("页眉页脚/注释");
  const data = new Uint8Array(bytes.byteLength + new TextEncoder().encode(address).byteLength);
  data.set(bytes); data.set(new TextEncoder().encode(address), bytes.byteLength);
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", data))).map(b => b.toString(16).padStart(2,"0")).join("");
  return {blocks, warnings: [...new Set(warnings)], operationId: "docx-" + digest};
}
