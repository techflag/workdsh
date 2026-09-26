// Isolated UI prototype only. Published vendor files remain unchanged.
import {build} from 'esbuild';
import {readFile,copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {adaptInspector} from './adapt-inspector.mjs';
await Promise.all(['experience.tsx','Ribbon.tsx','ribbon.css'].map(name=>copyFile('scripts/pptx-trial/'+name,'.artifacts/pptx-react-trial/'+name)));
await copyFile('scripts/pptx-trial/ribbon.css','.artifacts/pptx-react-trial/web/ribbon-ui.css');
await build({entryPoints:['.artifacts/pptx-react-trial/experience.tsx'],bundle:true,format:'esm',platform:'browser',target:'es2022',outdir:'.artifacts/pptx-react-trial/web',splitting:true,define:{'process.env.NODE_ENV':'"production"'},plugins:[{
 name:'trial-static-labels-zh',setup(b){b.onLoad({filter:/pptx-react-viewer\/dist\/.*\.mjs$/},async({path})=>{
 let contents=adaptInspector(await readFile(path,'utf8'));
 contents=contents.replace('var SLIDE_NAV_THUMBNAIL_WIDTH = 156;','var SLIDE_NAV_THUMBNAIL_WIDTH = 100;');
 // Same fixed-version desktop trial override as full-desktop; vendor files unchanged.
 if(contents.includes('function isMobileViewport(width, height, isTouch) {'))contents=contents.replace('function isMobileViewport(width, height, isTouch) {','function isMobileViewport(width, height, isTouch) { return false;');
 contents=contents.replace('const [isInspectorPaneOpen, setIsInspectorPaneOpen] = useState(\n    () => typeof window === "undefined" ? true : window.innerWidth >= 768\n  );','const [isInspectorPaneOpen, setIsInspectorPaneOpen] = useState(false);');
 contents=contents.replace('const [isSlidesPaneOpen, setIsSlidesPaneOpen] = useState(\n    () => typeof window === "undefined" ? true : window.innerWidth >= 768\n  );','const [isSlidesPaneOpen, setIsSlidesPaneOpen] = useState(true);');
 contents=contents.replace('mode === "edit" && !isMobile && !dialogs.isNarrowViewport && state.isSlidesPaneOpen','mode === "edit" && !isMobile && state.isSlidesPaneOpen');
 if(contents.includes('function Toolbar(p) {')){
 contents='import {Ribbon as TrialRibbon} from '+JSON.stringify(resolve('.artifacts/pptx-react-trial/Ribbon.tsx'))+';\n'+contents;
 contents=contents.replace('function Toolbar(p) {',`function Toolbar(p) {
 const [all,setAll]=useState(false);
 useEffect(()=>{if(p.selectedElement?.type==='chart'&&!p.isInspectorPaneOpen)p.onToggleInspector()},[p.selectedElement?.id]);
 if(p.mode==='present')return jsx(NativeToolbar,p);
 return jsxs(Fragment,{children:[jsx(TrialRibbon,{p,canvas:{onFormatText:p.onUpdateTextStyle},onMore:()=>setAll(v=>!v),onAddSlide:()=>{const l=p.layoutOptions.find(l=>l.name?.toLowerCase()==='blank')??p.layoutOptions[0];if(l)p.onInsertSlideFromLayout(l.path,l.name)}}),all&&jsx(NativeToolbar,p)]});
}
function NativeToolbar(p) {`);
 }
 const labels={'+ Show':'+ 新建放映',Slides:'幻灯片',Font:'字体',Paragraph:'段落',Editing:'编辑',Drawing:'绘图',Elements:'元素',Properties:'属性',Comments:'批注','Show type':'放映方式',Presented:'演讲者放映','Loop continuously':'循环放映','Show narration':'播放旁白','Show animation':'播放动画','Frame slides':'幻灯片边框','Slides / page':'每页张数',Theme:'主题','Apply First Master':'应用首个母版','Apply All Masters':'应用全部母版','Override theme for this slide':'覆盖本页主题','Preset sizes...':'预设尺寸…',Widescreen:'宽屏',Orientation:'方向'};
 for(const [en,zh] of Object.entries(labels))contents=contents.replaceAll('children: '+JSON.stringify(en),'children: '+JSON.stringify(zh));
 return {contents,loader:'js'};
 });}
}]});
