# PPT 编辑器候选复查（2026-09-13）

状态：官方项目文档与npm发布元数据调查；未安装新候选、未替换默认编辑器。用户要求重新找更适合WorkDSH的制作组件，暂停PPTist实施。

选择标准：正式React组件/公开API、常见图表数据编辑、可编辑PPTX导出、人工与AI使用统一内容接口、逐页更新和焦点控制、组件卸载与宿主样式/事件隔离。React本身不保证后两项，不再凭README宣称已经兼容。

## 候选

1. **SlideWise / @textcortex/slidewise 1.21.1**。npm元数据MIT、React/ReactDOM >=19，包解压约14.3MB（不是实际浏览器传输量）。官方README提供SlidewiseFileEditor、loadBlob/saveBlob、parsePptx/serializeDeck、applyEdits(setChartData/addChart/setTableData/setImage等)。声明原生图表及嵌入工作簿可保留，并支持受控编辑/主题/本地化。匹配当前React19和插件组件方向。新建编辑、具体图表类型/UI可操作范围、逐页焦点和宿主清理仍需发布包实测；README提到的src/lib/types.ts路径当前404，不能据此推定具体类型契约。

2. **ChristopherVR/pptx-viewer / pptx-react-viewer 3.16.5**。npm元数据Apache-2.0，React18/19，解压约37.1MB；依赖面较广，当前peer含AI SDK/i18n/framer-motion等，需要核对可选性。官方React README提供PowerPointViewer canEdit、完整编辑chrome、onContentChange、onDirtyChange、onActiveSlideChange、getContent/goTo及元素/页面操作。项目声明23图表类型和浏览器PPTX保存，核心有新建builder。比只有查看功能的viewer更适合评估。README的高保真/测试数量是作者声明；不作为本项目验收通过。需核对发布版本与main文档一致性、新建UI、原生图表导出、包大小、中文和宿主副作用。

3. **ONLYOFFICE Docs**。官方React集成与Presentation Office API文档较完整，图表包含柱/条/线/饼/环/区域/散点/雷达及组合。需要运行Document Server和文件保存回调；React组件不是自带完整引擎的纯前端库。外部界面Automation API官方说明仅Docs Developer提供。适合完整Office兼容路线，但增加服务部署和授权/连接复杂度，不作为当前本地纯组件接入首选。

PPTist继续作为能力对照，其八类原生图表已实测；它仍是Vue完整应用而非发布SDK。CreatPPT不足以满足用户常见图表要求，不再扩大。

## 来源

- https://github.com/textcortex/SlideWise
- https://raw.githubusercontent.com/textcortex/SlideWise/main/README.md
- https://raw.githubusercontent.com/textcortex/SlideWise/main/LICENSE
- https://github.com/ChristopherVR/pptx-viewer
- https://raw.githubusercontent.com/ChristopherVR/pptx-viewer/main/packages/react/README.md
- https://raw.githubusercontent.com/ChristopherVR/pptx-viewer/main/LICENSE
- https://api.onlyoffice.com/docs/docs-api/get-started/frontend-frameworks/react/
- https://helpcenter.onlyoffice.com/docs/userguides/presentation_editor/InsertCharts.aspx
- https://api.onlyoffice.com/docs/office-api/samples/presentation-editor/creating-chart-slide/
- npm view @textcortex/slidewise / pptx-react-viewer：version/license/peerDependencies/dist.unpackedSize（本机查询）

## 建议的有限验证

先评估SlideWise，pptx-react-viewer作第二候选；只在隔离探针安装精确版本，不改18989或根产品依赖。使用同一五页样本，包含饼、柱、折线、表格、图片：新建→人工改图表数据→AI接口改同一页→焦点跟随→保存重开→导出检查chart XML和xlsx数据→卸载/聊天快捷键回归。最终按实际结果只选一个默认编辑器；不会因为找到新库直接重写Office存储或Agent执行框架。

以上浏览器实测、发布包源码/API审查、Harness Slot联测和发布检查均未执行。
