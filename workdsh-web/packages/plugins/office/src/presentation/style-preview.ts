import { z } from "zod";
import { id } from "../content/model.js";

export const stylePreviewInput = z.object({
  title: z.string().trim().min(1).max(160),
  subtitle: z.string().max(160).default(""),
  footer: z.string().max(120).default(""),
  family: z.enum(["general", "red"]).default("general"),
  recommended: z.enum(["A", "B", "C", "D"]).default("A"),
  operationId: id.max(120),
}).strict();
type Style = { id: string; name: string; palette: string[]; tags: string[]; layout: string };
const families: Record<"general" | "red", Style[]> = {
  general: [
    {id:"A",name:"深蓝科技",palette:["#0E2A47","#1B4F8A","#00A9A5","#E8792B","#F2F5F8"],tags:["科技","严谨","数据感"],layout:"rail"},
    {id:"B",name:"石墨青灰",palette:["#1F2933","#3E4C59","#7B8794","#0F6E56","#E4E7EB"],tags:["克制","学术","理性"],layout:"band"},
    {id:"C",name:"靛蓝紫调",palette:["#1B1F3B","#3C3489","#7F77DD","#00C2B2","#EEEDFE"],tags:["现代","简洁","清晰"],layout:"center"},
    {id:"D",name:"墨绿材料",palette:["#0B2E24","#0F6E56","#4FA98A","#EF9F27","#EAF3DE"],tags:["材料","沉稳","自然"],layout:"split"},
  ],
  red: [
    {id:"A",name:"红金政务",palette:["#9E1B1B","#6B1111","#C8A052","#FBF7F0","#2B2118"],tags:["庄重","权威","中文优先"],layout:"formal"},
    {id:"B",name:"科技红",palette:["#D92B2B","#16202B","#5A6673","#12A594","#F2F4F7"],tags:["现代","硬朗","有力"],layout:"split"},
    {id:"C",name:"砖红沉稳",palette:["#A63A2B","#3A2A22","#C97B4A","#B8934A","#F5EFE7"],tags:["温暖","稳重","务实"],layout:"rail"},
    {id:"D",name:"绯红学术",palette:["#C0392B","#1B2A4A","#6B7280","#FAF0EE","#22282F"],tags:["学术","证据","简练"],layout:"paper"},
  ],
};
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]!);

/** Static preview only. Human answers remain owned by the official user-question UI. */
export function renderStylePreview(input: z.input<typeof stylePreviewInput>) {
  const args = stylePreviewInput.parse(input);
  const styles = families[args.family];
  const cards = styles.map(s => {
    const light = ["formal","paper","split"].includes(s.layout);
    return `<article class="card"><header><h2>${s.id} · ${s.name}</h2>${s.id===args.recommended?'<span class="recommended">推荐</span>':""}</header>
      <div class="palette">${s.palette.map(c=>`<div><i style="background:${c}"></i><small>${c}</small></div>`).join("")}</div>
      <div class="cover ${s.layout}" style="--primary:${s.palette[0]};--secondary:${s.palette[1]};--accent:${s.palette[2]};--paper:${s.palette[3]};--light:${s.palette[4]};background:${s.layout==="formal"?s.palette[3]:light?s.palette[4]:s.palette[0]};color:${light?s.palette[1]:"#FFFFFF"}"><div class="cover-content"><h3>${escape(args.title)}</h3><p>${escape(args.subtitle)}</p><small>${escape(args.footer)}</small></div></div>
      <div class="tags">${s.tags.map(t=>`<span>${t}</span>`).join("")}</div></article>`;
  }).join("");
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PPT 风格预览</title><style>
    *{box-sizing:border-box}body{margin:0;padding:20px;background:#121212;color:#e7e7e7;font:14px/1.6 "PingFang SC","Microsoft YaHei",sans-serif}h1{font-size:20px;margin:0 0 6px}.hint{color:#a5a5a5;margin:0 0 20px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.card{padding:16px;background:#242424;border:1px solid #343434;border-radius:16px;min-width:0}header{display:flex;align-items:center;justify-content:space-between;gap:8px}h2{font-size:15px;margin:0 0 12px;font-weight:600}.recommended{font-size:12px;color:#a5a5a5;white-space:nowrap}.palette{display:grid;grid-template-columns:2fr repeat(4,1fr);gap:6px;margin-bottom:16px}.palette div{min-width:0}.palette i{display:block;height:18px;border-radius:4px}.palette small{display:block;font-size:10px;color:#a5a5a5;margin-top:5px;overflow-wrap:anywhere}.cover{aspect-ratio:16/9;position:relative;border-radius:10px;overflow:hidden;display:flex;align-items:center;padding:7%;isolation:isolate}.cover-content{position:relative;z-index:1;min-width:0}.cover h3{font-size:clamp(16px,2.5vw,26px);line-height:1.45;margin:0 0 12px;overflow-wrap:anywhere;font-weight:600}.cover p{margin:0 0 12px;font-size:12px}.cover small{font-size:10px}.rail{border-right:18px solid var(--accent)}.rail p{color:var(--light)}.band{align-items:flex-start}.band:after{content:"";position:absolute;bottom:0;left:0;right:0;height:25%;background:var(--light)}.band small{display:block;margin-top:12px;color:#FFFFFF}.center{text-align:center;justify-content:center}.center h3{border-top:1px solid var(--accent);border-bottom:1px solid var(--accent);padding:12px 0}.split{padding-left:24%;border-left:34px solid var(--primary)}.split p{border-top:3px solid var(--secondary);padding-top:10px}.formal{text-align:center;justify-content:center;border-top:7px solid var(--primary)}.formal h3{color:#2B2118}.formal p,.formal small{color:var(--primary)}.paper{background:#FFFFFF!important;border-left:8px solid var(--primary)}.paper h3{color:var(--secondary)}.tags{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.tags span{border:1px solid #555;border-radius:16px;padding:2px 10px;font-size:12px;color:#a5a5a5}@media(max-width:580px){body{padding:12px}.grid{grid-template-columns:1fr}.cover h3{font-size:22px}}@media(prefers-color-scheme:light){body{background:#F7F7F7;color:#202020}.card{background:#FFFFFF;border-color:#DDDDDD}.hint,.recommended,.palette small,.tags span{color:#666666}}
    </style></head><body><h1>${args.family==="red"?"选择一种红色方向":"选择 PPT 视觉风格"}</h1><p class="hint">请在对话中的选择题回答 A–D，也可以描述其他偏好。这里展示封面方案，尚未生成整份 PPT。</p><main class="grid">${cards}</main></body></html>`;
  return {html,styles};
}
