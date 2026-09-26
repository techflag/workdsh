import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {adaptInspector} from './pptx-trial/adapt-inspector.mjs';
export function nativePptPlugin(){return { name:'trial-static-labels-zh',setup(b){b.onLoad({filter:/pptx-react-viewer\/dist\/.*\.mjs$/},async({path})=>{
 let contents=adaptInspector(await readFile(path,'utf8'));
 contents=contents.replace('var SLIDE_NAV_THUMBNAIL_WIDTH = 156;','var SLIDE_NAV_THUMBNAIL_WIDTH = 100;');
 // Same fixed-version desktop trial override as full-desktop; vendor files unchanged.
 if(contents.includes('function isMobileViewport(width, height, isTouch) {'))contents=contents.replace('function isMobileViewport(width, height, isTouch) {','function isMobileViewport(width, height, isTouch) { return false;');
 contents=contents.replace('const [isInspectorPaneOpen, setIsInspectorPaneOpen] = useState(\n    () => typeof window === "undefined" ? true : window.innerWidth >= 768\n  );','const [isInspectorPaneOpen, setIsInspectorPaneOpen] = useState(false);');
 contents=contents.replace('const [isSlidesPaneOpen, setIsSlidesPaneOpen] = useState(\n    () => typeof window === "undefined" ? true : window.innerWidth >= 768\n  );','const [isSlidesPaneOpen, setIsSlidesPaneOpen] = useState(true);');
 contents=contents.replace('mode === "edit" && !isMobile && !dialogs.isNarrowViewport && state.isSlidesPaneOpen','mode === "edit" && !isMobile && state.isSlidesPaneOpen');
 if(contents.includes('function Toolbar(p) {')){
 contents='import {Ribbon as TrialRibbon} from '+JSON.stringify(fileURLToPath(new URL('../packages/plugins/office/src/presentation/native-react/Ribbon.tsx',import.meta.url)))+';\n'+contents;
 contents=contents.replace('function Toolbar(p) {',`function Toolbar(p) {
 const [all,setAll]=useState(false);
 useEffect(()=>{if(p.selectedElement?.type==='chart'&&!p.isInspectorPaneOpen)p.onToggleInspector()},[p.selectedElement?.id]);
 if(p.mode==='present')return jsx(NativeToolbar,p);
 return jsxs(Fragment,{children:[jsx(TrialRibbon,{p,canvas:{onFormatText:p.onUpdateTextStyle},onMore:()=>setAll(v=>!v),onAddSlide:()=>{const l=p.layoutOptions.find(l=>l.name?.toLowerCase()==='blank')??p.layoutOptions[0];if(l)p.onInsertSlideFromLayout(l.path,l.name)}}),all&&jsx(NativeToolbar,p)]});
}
function NativeToolbar(p) {`);
 }
 // The WorkDSH result header owns save status; avoid a second native title bar.
 contents=contents.replace('function TitleBar(p) {','function TitleBar(p) { return null;');
 const labels={'+ Show':'+ 新建放映',Slides:'幻灯片',Font:'字体',Paragraph:'段落',Editing:'编辑',Drawing:'绘图',Elements:'元素',Properties:'属性',Comments:'批注','Show type':'放映方式',Presented:'演讲者放映','Loop continuously':'循环放映','Show narration':'播放旁白','Show animation':'播放动画','Frame slides':'幻灯片边框','Slides / page':'每页张数',Theme:'主题','Apply First Master':'应用首个母版','Apply All Masters':'应用全部母版','Override theme for this slide':'覆盖本页主题','Preset sizes...':'预设尺寸…',Widescreen:'宽屏',Orientation:'方向'};
 for(const [en,zh] of Object.entries(labels))contents=contents.replaceAll('children: '+JSON.stringify(en),'children: '+JSON.stringify(zh));
 return {contents,loader:'js'};
 });}
};}
