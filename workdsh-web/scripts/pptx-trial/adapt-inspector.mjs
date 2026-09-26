// Fixed-version isolated UI adaptation. Native components and editing callbacks remain intact.
export function adaptInspector(source){
 let s=source;
 s=s.replaceAll('getElementLabel(targetElement)','(targetElement.type === "text" ? getElementLabel(targetElement) : t("pptx.elementType."+targetElement.type))');
 s=s.replace('userName = "You"','userName = "我"');
 s=s.replace('return parsed.toLocaleString(void 0, {','return parsed.toLocaleString("zh-CN", {');
 for(const [en,zh] of Object.entries({Transform:'变换',Opacity:'不透明度'}))s=s.replaceAll('children: '+JSON.stringify(en),'children: '+JSON.stringify(zh));
 s=s.replaceAll('children: "Rotation (\\xB0)"','children: "旋转（°）"').replaceAll('children: "\\u2191 Forward"','children: "↑ 上移一层"').replaceAll('children: "\\u2193 Backward"','children: "↓ 下移一层"');
 s=s.replaceAll('element: getElementLabel(selectedElement)','element: selectedElement.type === "text" ? getElementLabel(selectedElement) : t("pptx.elementType."+selectedElement.type)');
 s=s.replace('function elementLabel(element) {','function elementLabel(element, t) {').replace('return text || element.type;','return text || t("pptx.elementType."+element.type);').replace('children: elementLabel(el)','children: elementLabel(el, t)');
 if(!s.includes('function ChartDataPanel('))return s;
 s=s.replace('label: "Elements"','label: "元素"').replace('label: "Properties"','label: "属性"').replace('label: "Comments"','label: "批注"');
 const start=s.indexOf('function ChartDataPanel('),end=s.indexOf('function OleSheetGridEditor(',start);
 let block=s.slice(start,end);
 const gridStart=block.indexOf('    /* @__PURE__ */ jsx(\n      ChartDataGrid,'),gridEnd=block.indexOf('\n  ] });',gridStart);
 if(gridStart<0||gridEnd<0)throw Error('Native chart grid layout changed');
 const grid=block.slice(gridStart,gridEnd);
 block=block.slice(0,gridStart).replace(/,\s*$/,'')+block.slice(gridEnd);
 const childrenStart=block.indexOf('return /* @__PURE__ */ jsxs(Fragment, { children: [');
 if(childrenStart<0)throw Error('Native chart panel children changed');
 const insertion=childrenStart+'return /* @__PURE__ */ jsxs(Fragment, { children: ['.length;
 block=block.slice(0,insertion)+'\n'+grid+',\n'+block.slice(insertion);
 s=s.slice(0,start)+block+s.slice(end);
 // Keep native formatting controls, grouped in expandable sections.
 const groups={AnimationPanel:'动画',ChartTypeSelector:'图表类型与标题',ChartDisplayOptions:'标题、图例与网格线',ChartSubtypeOptions:'图表选项',ChartDataLabelOptions:'数据标签',ChartAxisOptions:'坐标轴',ChartAxisStyleOptions:'坐标轴与网格线样式',ChartMarkerOptions:'数据标记',ChartComboTypeOptions:'组合图',ChartDataPointOptions:'数据点',ChartDataPointMarkerOptions:'数据点标记',ChartTrendlineOptions:'趋势线',ChartErrorBarOptions:'误差线',ChartSeriesColorOptions:'系列颜色',ChartFilteredSeriesOptions:'数据筛选',ChartUserShapeOptions:'图表附加元素'};
 for(const [name,title] of Object.entries(groups)){
  const sig='function '+name+'(';
  if(!s.includes(sig))throw Error('Native inspector component changed: '+name);
  s=s.replace(sig,'function Native'+name+'(');
  s+='\nfunction '+name+'(p){return jsxs("details",{className:"trial-inspector-section",children:[jsx("summary",{children:'+JSON.stringify(title)+'}),jsx(Native'+name+',p)]})}\n';
 }
 const bodyStart=s.indexOf('function ElementInspectorBody(');
 let tail=s.slice(bodyStart);
 tail=tail.replace('jsxs("div", { className: CARD, children: [','jsxs("details", { className: "trial-inspector-section", children: [jsx("summary",{children:"位置与大小"}),');
 s=s.slice(0,bodyStart)+tail;
 s=s.replace('className: "border-t border-border p-3 overflow-y-auto flex-shrink-0",\n                style: { height: animationPanelHeight },','className: "trial-animation-section border-t border-border p-3 overflow-y-auto flex-shrink-0",\n                style: { height: "auto" },');
 return s;
}
