import { TextStyleKit } from "@tiptap/extension-text-style";
import { Node, mergeAttributes } from "@tiptap/core";
import TextAlign from "@tiptap/extension-text-align";
import { TableKit } from "@tiptap/extension-table";
import Image from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";
import { BlockIdentity } from "./adapter.js";
import type { OfficeChart } from "workdsh-contracts/office";

const NS="http://www.w3.org/2000/svg", palette=["#2563eb","#f97316","#16a34a","#9333ea","#dc2626","#0891b2"];
const svg=(tag:string,attrs:Record<string,string|number>={})=>{const el=document.createElementNS(NS,tag);for(const [key,value] of Object.entries(attrs))el.setAttribute(key,String(value));return el;};
function renderChart(chart:OfficeChart) {
  const figure=document.createElement("figure");figure.className="wd-office-chart";figure.style.width=`min(100%, ${chart.width}px)`;figure.dataset.alignment=chart.alignment ?? "left";
  if(chart.title){const title=document.createElement("figcaption");title.textContent=chart.title;figure.append(title);}
  const width=chart.width,height=chart.height,plotTop=chart.title?30:14,plotBottom=chart.legend==="none"?28:52,plotLeft=chart.yAxisTitle?56:42,plotRight=18;
  const canvas=svg("svg",{viewBox:`0 0 ${width} ${height}`,role:"img","aria-label":chart.title ?? "图表"});figure.append(canvas);
  const values=chart.series.flatMap(series=>series.values),max=Math.max(0,...values),min=Math.min(0,...values),span=max-min||1;
  const x0=plotLeft,y0=height-plotBottom,pw=width-plotLeft-plotRight,ph=y0-plotTop;
  const color=(index:number)=>chart.series[index]?.color ?? palette[index%palette.length]!;
  if(chart.chartType==="pie"||chart.chartType==="doughnut"){
    const data=chart.series[0]!.values,total=data.reduce((sum,n)=>sum+Math.max(0,n),0)||1,cx=width/2,cy=plotTop+ph/2,r=Math.min(pw,ph)*.38;let angle=-Math.PI/2;
    data.forEach((value,index)=>{const next=angle+Math.PI*2*Math.max(0,value)/total,x1=cx+r*Math.cos(angle),y1=cy+r*Math.sin(angle),x2=cx+r*Math.cos(next),y2=cy+r*Math.sin(next),large=next-angle>Math.PI?1:0;const path=svg("path",{d:`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`,fill:palette[index%palette.length]!});canvas.append(path);angle=next;});
    if(chart.chartType==="doughnut")canvas.append(svg("circle",{cx,cy,r:r*.54,fill:"white"}));
  }else{
    canvas.append(svg("line",{x1:x0,y1:y0,x2:x0+pw,y2:y0,stroke:"#94a3b8"}));canvas.append(svg("line",{x1:x0,y1:plotTop,x2:x0,y2:y0,stroke:"#94a3b8"}));
    const point=(value:number,index:number)=>({x:x0+(index+.5)*pw/chart.categories.length,y:plotTop+(max-value)/span*ph});
    if(chart.chartType==="bar"){
      const group=pw/chart.categories.length,bar=Math.max(2,group*.72/chart.series.length);
      chart.series.forEach((series,si)=>series.values.forEach((value,i)=>{const p=point(value,i),zero=point(0,i).y;canvas.append(svg("rect",{x:p.x-group*.36+si*bar,y:Math.min(p.y,zero),width:bar-1,height:Math.max(1,Math.abs(zero-p.y)),fill:color(si)}));}));
    }else chart.series.forEach((series,si)=>{const points=series.values.map((value,i)=>point(value,i));const d=points.map((p,i)=>`${i?"L":"M"} ${p.x} ${p.y}`).join(" ");if(chart.chartType==="area")canvas.append(svg("path",{d:`${d} L ${points.at(-1)!.x} ${y0} L ${points[0]!.x} ${y0} Z`,fill:color(si),opacity:.2}));canvas.append(svg("path",{d,fill:"none",stroke:color(si),"stroke-width":2.5}));points.forEach(p=>canvas.append(svg("circle",{cx:p.x,cy:p.y,r:3,fill:color(si)})));});
    chart.categories.forEach((category,i)=>{const t=svg("text",{x:x0+(i+.5)*pw/chart.categories.length,y:y0+18,"text-anchor":"middle",fill:"#475569","font-size":11});t.textContent=category;t.setAttribute("title",category);canvas.append(t);});
  }
  if(chart.legend!=="none"){
    const legend=document.createElement("div");legend.className="wd-office-chart-legend";chart.series.forEach((series,i)=>{const item=document.createElement("span"),swatch=document.createElement("i");swatch.style.background=color(i);item.append(swatch,document.createTextNode(series.name));legend.append(item);});figure.append(legend);
  }
  return figure;
}
const OfficeChartNode=Node.create({
  name:"officeChart",group:"block",atom:true,selectable:true,draggable:false,
  addAttributes(){return {chart:{default:null},blockId:{default:null}};},
  parseHTML(){return [{tag:'figure[data-office-chart]',getAttrs:element=>{try{return {chart:JSON.parse(decodeURIComponent(element.getAttribute("data-chart") ?? ""))};}catch{return false;}}}];},
  renderHTML({HTMLAttributes}){return ["figure",mergeAttributes(HTMLAttributes,{"data-office-chart":"","data-chart":encodeURIComponent(JSON.stringify(HTMLAttributes.chart))})];},
  addNodeView(){return ({node})=>({dom:renderChart(node.attrs.chart as OfficeChart)});},
});
/** Reuse native schemas, commands, cell selection, column resizing and image NodeView. */
export function documentExtensions() {
  return [
    StarterKit.configure({blockquote:false,code:false,codeBlock:false,horizontalRule:false,link:false,trailingNode:false}),
    TextStyleKit.configure({lineHeight:false}),
    TextAlign.configure({types:["paragraph","heading"]}),
    TableKit.configure({table:{resizable:true,renderWrapper:true}}),
    Image.extend({
      parseHTML(){return [{tag:"img[src]",getAttrs:element=>/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(element.getAttribute("src") ?? "") ? null : false}];},
      addInputRules(){return [];},
      addAttributes(){return {...this.parent?.(),alignment:{default:"left",parseHTML:element=>element.getAttribute("data-alignment") ?? "left",renderHTML:attrs=>({"data-alignment":attrs.alignment})}};}}).configure({allowBase64:true,resize:{enabled:true,minWidth:24,minHeight:24,alwaysPreserveAspectRatio:true}}),
    OfficeChartNode,
    BlockIdentity,
  ];
}
