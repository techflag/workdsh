import { Extension, type JSONContent } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import type {
  OfficeBlockInput,
  OfficeDocumentState,
  OfficeMark,
  OfficeOperation,
  OfficeList,
  OfficeTextStyle,
} from "workdsh-contracts/office";

/** Semantic styles cross the Host boundary; editor HTML/JSON never does. */
export const BlockIdentity = Extension.create({
  name: "workdshBlockIdentity",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading", "table", "image", "officeChart"],
        attributes: {
          blockId: {
            default: null,
            parseHTML: () => null,
            renderHTML: () => ({}),
          },
          lineHeight: {
            default: null,
            parseHTML: (element) => {
              const value = Number(element.style.lineHeight);
              return value >= 1 && value <= 3 ? value : null;
            },
            renderHTML: (attrs) =>
              attrs.lineHeight
                ? { style: `line-height:${attrs.lineHeight}` }
                : {},
          },
          indent: {
            default: 0,
            parseHTML: (element) =>
              Math.max(
                0,
                Math.min(
                  6,
                  Math.round(parseFloat(element.style.marginLeft || "0") / 24),
                ),
              ),
            renderHTML: (attrs) =>
              attrs.indent
                ? { style: `margin-left:${attrs.indent * 24}px` }
                : {},
          },
        },
      },
    ];
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction(transactions, _old, state) {
          if (!transactions.some((t) => t.docChanged)) return null;
          const seen = new Set<string>(),
            tr = state.tr;
          state.doc.descendants((node, pos) => {
            if (!["paragraph", "heading", "table", "image", "officeChart"].includes(node.type.name)) return;
            let key = node.attrs.blockId as string | null;
            if (!key || seen.has(key)) {
              key = `tmp-${crypto.randomUUID()}`;
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, blockId: key });
            }
            seen.add(key);
          });
          return tr.docChanged ? tr.setMeta("addToHistory", false) : null;
        },
      }),
    ];
  },
});
export const normalizedColor = (value: unknown): string | undefined => {
  if (typeof value !== "string") return;
  if (/^#[\da-f]{6}$/i.test(value)) return value.toLowerCase();
  if (/^#[\da-f]{3}$/i.test(value))
    return (
      "#" +
      value
        .slice(1)
        .split("")
        .map((c) => c + c)
        .join("")
        .toLowerCase()
    );
  const rgb = value.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
  if (rgb && rgb.slice(1).every((v) => +v <= 255))
    return (
      "#" +
      rgb
        .slice(1)
        .map((v) => (+v).toString(16).padStart(2, "0"))
        .join("")
    );
};
function textStyle(
  attrs: Record<string, unknown>,
): OfficeTextStyle | undefined {
  const style: OfficeTextStyle = {};
  const family = String(attrs.fontFamily ?? "").replace(/["']/g, "");
  if (/^[a-zA-Z0-9\u3400-\u9fff -]{1,80}$/.test(family))
    style.fontFamily = family;
  const size = String(attrs.fontSize ?? "");
  const points = parseFloat(size) * (size.endsWith("px") ? 0.75 : 1);
  if (points >= 6 && points <= 96)
    style.fontSize = Math.round(points * 100) / 100;
  const fg = normalizedColor(attrs.color),
    bg = normalizedColor(attrs.backgroundColor);
  if (fg) style.color = fg;
  if (bg) style.backgroundColor = bg;
  return Object.keys(style).length ? style : undefined;
}
export const editorContent = (state: OfficeDocumentState): JSONContent => {
  const root: JSONContent = { type: "doc", content: [] };
  const stack: { node: JSONContent; type: string; start: number }[] = [];
  for (const id of state.blockIds) {
    const b = state.blocks[id]!;
    if (b.type === "table") {
      stack.length=0;
      root.content!.push({type:"table",attrs:{blockId:id},content:b.table!.rows.map(row=>({type:"tableRow",content:row.cells.map(cell=>({
        type:cell.header ? "tableHeader" : "tableCell",attrs:{colspan:cell.colspan,rowspan:cell.rowspan,colwidth:cell.colwidth ?? null},
        content:editorContent({modelVersion:1,blockIds:cell.paragraphs.map((_,i)=>`cell-${i}`),blocks:Object.fromEntries(cell.paragraphs.map((paragraph,i)=>[`cell-${i}`,{...paragraph,blockId:`cell-${i}`,runs:paragraph.runs.map((r,j)=>({...r,runId:`r-${j}`}))}]))}).content!,
      }))}))});
      continue;
    }
    if (b.type === "image") {
      stack.length=0; root.content!.push({type:"image",attrs:{blockId:id,...b.image}}); continue;
    }
    if (b.type === "chart") {
      stack.length=0; root.content!.push({type:"officeChart",attrs:{blockId:id,chart:b.chart}}); continue;
    }
    const paragraph: JSONContent = {
      type: b.type,
      attrs: {
        blockId: id,
        ...(b.level ? { level: b.level } : {}),
        textAlign: b.style?.alignment ?? null,
        lineHeight: b.style?.lineHeight ?? null,
        indent: b.style?.indent ?? 0,
      },
      content: b.runs
        .filter((r) => r.text)
        .flatMap((r) => {
          const marks: NonNullable<JSONContent["marks"]> = r.marks.map(
            (type) => ({ type }),
          );
          if (r.style)
            marks.push({
              type: "textStyle",
              attrs: {
                ...r.style,
                ...(r.style.fontSize
                  ? { fontSize: `${r.style.fontSize}pt` }
                  : {}),
              },
            });
          return r.text
            .split("\n")
            .flatMap((text, i) => [
              ...(i ? [{ type: "hardBreak", marks }] : []),
              ...(text ? [{ type: "text", text, marks }] : []),
            ]);
        }),
    };
    const list = b.list;
    if (!list) {
      stack.length = 0;
      root.content!.push(paragraph);
      continue;
    }
    stack.length = Math.min(stack.length, list.depth + 1);
    const current = stack[list.depth],
      start = list.start ?? 1;
    if (!current || current.type !== list.type || current.start !== start) {
      stack.length = list.depth;
      const node: JSONContent = {
        type: list.type === "bullet" ? "bulletList" : "orderedList",
        attrs: { start },
        content: [],
      };
      if (!list.depth) root.content!.push(node);
      else {
        const parent = stack[list.depth - 1]?.node.content?.at(-1);
        if (!parent) throw new Error("列表层级不完整。");
        parent.content!.push(node);
      }
      stack.push({ node, type: list.type, start });
    }
    const node = stack[list.depth].node;
    if (!list.continuation)
      node.content!.push({ type: "listItem", content: [] });
    const item = node.content!.at(-1);
    if (!item) throw new Error("列表续段没有对应项。");
    item.content!.push(paragraph);
  }
  return root;
};
export function editorBlocks(
  json: JSONContent,
): (OfficeBlockInput & { blockId: string })[] {
  const blocks: (OfficeBlockInput & { blockId: string })[] = [];
  function paragraph(node: JSONContent, list?: OfficeList) {
    const style: NonNullable<OfficeBlockInput["style"]> = {};
    const attrs = node.attrs ?? {};
    if (attrs.textAlign) style.alignment = attrs.textAlign;
    if (attrs.lineHeight) style.lineHeight = Number(attrs.lineHeight);
    if (attrs.indent) style.indent = Number(attrs.indent);
    blocks.push({
      blockId: String(attrs.blockId),
      type: node.type as "paragraph" | "heading",
      ...(node.type === "heading" ? { level: Number(attrs.level) } : {}),
      ...(Object.keys(style).length ? { style } : {}),
      ...(list ? { list } : {}),
      runs: (node.content ?? [])
        .filter((r) => (r.type === "text" && r.text) || r.type === "hardBreak")
        .map((r) => {
          const style = textStyle(
            r.marks?.find((m) => m.type === "textStyle")?.attrs ?? {},
          );
          return {
            text: r.type === "hardBreak" ? "\n" : r.text!,
            marks: (r.marks ?? [])
              .filter((m) =>
                ["bold", "italic", "underline", "strike"].includes(m.type),
              )
              .map((m) => m.type as OfficeMark)
              .sort(),
            ...(style ? { style } : {}),
          };
        }),
    });
  }
  function visit(nodes: JSONContent[], depth: number) {
    for (const node of nodes) {
      if (["bulletList", "orderedList"].includes(node.type!)) {
        if (depth > 5) throw new Error("列表最多支持 6 级；请减少缩进。");
        for (const item of node.content ?? []) {
          let continuation = false;
          for (const child of item.content ?? []) {
            if (["paragraph", "heading"].includes(child.type!)) {
              paragraph(child, {
                type: node.type === "bulletList" ? "bullet" : "ordered",
                depth,
                ...(node.type === "orderedList"
                  ? { start: Number(node.attrs?.start ?? 1) }
                  : {}),
                ...(continuation ? { continuation: true } : {}),
              });
              continuation = true;
            } else visit([child], depth + 1);
          }
        }
      } else if (node.type === "table") {
        blocks.push({type:"table",blockId:String(node.attrs?.blockId),runs:[],table:{rows:(node.content ?? []).map(row=>({cells:(row.content ?? []).map(cell=>({
          colspan:Number(cell.attrs?.colspan ?? 1),rowspan:Number(cell.attrs?.rowspan ?? 1),
          ...(cell.attrs?.colwidth ? {colwidth:cell.attrs.colwidth} : {}),
          ...(cell.type === "tableHeader" ? {header:true} : {}),
          paragraphs:editorBlocks({type:"doc",content:cell.content}).map(({blockId,type,...p})=>{
            if(type!=="paragraph" && type!=="heading") throw new Error("单元格目前支持正文和标题；请撤销嵌套表格或图片。");
            return {...p,type};
          }),
        }))}))}});
      } else if (node.type === "image") {
        const a=node.attrs ?? {}; blocks.push({type:"image",blockId:String(a.blockId),runs:[],image:{src:String(a.src),width:Number(a.width),height:Number(a.height),...(a.alt ? {alt:String(a.alt)} : {}),...(a.alignment ? {alignment:a.alignment} : {})}});
      } else if (node.type === "officeChart") {
        const a=node.attrs ?? {}; blocks.push({type:"chart",blockId:String(a.blockId),runs:[],chart:structuredClone(a.chart) as NonNullable<OfficeBlockInput["chart"]>});
      } else if (["paragraph", "heading"].includes(node.type!)) paragraph(node);
      else throw new Error("当前文档包含尚未支持的内容，请撤销该操作。");
    }
  }
  visit(json.content ?? [], 0);
  return blocks;
}
const input = (b: OfficeBlockInput): OfficeBlockInput => ({
  type: b.type,
  ...(b.table ? {table:{rows:b.table.rows.map(row=>({cells:row.cells.map(cell=>({...cell,paragraphs:cell.paragraphs.map(p=>({...input(p),type:p.type}))}))}))}} : {}),
  ...(b.image ? {image:b.image} : {}),
  ...(b.chart ? {chart:b.chart} : {}),
  ...(b.level ? { level: b.level } : {}),
  ...(b.style && Object.keys(b.style).length ? { style: b.style } : {}),
  ...(b.list ? { list: b.list } : {}),
  runs: b.runs.map((r) => ({
    text: r.text,
    marks: [...r.marks].sort(),
    ...(r.style && Object.keys(r.style).length ? { style: r.style } : {}),
  })),
});
// DTO property order may change after Host schema validation; compare semantic values.
const comparable = (value:unknown):string => JSON.stringify(value,(_key,item)=>
  item && typeof item === "object" && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))) : item);
export const blockText = (b:OfficeBlockInput):string => b.table ? b.table.rows.map(row=>row.cells.map(cell=>cell.paragraphs.map(blockText).join("\n")).join("\t")).join("\n") : b.image ? b.image.alt ?? "" : b.chart ? b.chart.title ?? b.chart.series.map(series=>series.name).join("、") : b.runs.map(r=>r.text).join("");
export function documentDiff(
  base: OfficeDocumentState,
  json: JSONContent,
): OfficeOperation[] {
  const blocks = editorBlocks(json),
    present = new Set(blocks.map((b) => b.blockId));
  const operations: OfficeOperation[] = [];
  for (const key of base.blockIds)
    if (!present.has(key))
      operations.push({
        op: "document.removeBlock",
        blockId: key,
        expectedText: blockText(base.blocks[key]!),
      });
  let after: string | null = null;
  for (const b of blocks) {
    const previous = base.blocks[b.blockId];
    if (!previous)
      operations.push({
        op: "document.insertBlocks",
        afterBlockId: after,
        blocks: [{ ...input(b), clientRef: b.blockId }],
      });
    else if (comparable(input(previous)) !== comparable(input(b)))
      operations.push({
        op: "document.replaceBlock",
        blockId: b.blockId,
        expectedText: blockText(previous),
        block: input(b),
      });
    after = b.blockId;
  }
  const existing = blocks
    .filter((b) => base.blocks[b.blockId])
    .map((b) => b.blockId);
  if (
    JSON.stringify(existing) !==
    JSON.stringify(base.blockIds.filter((id) => present.has(id)))
  )
    throw new Error("当前版本不支持移动段落；请撤销该操作。");
  return operations;
}
