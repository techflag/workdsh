# pptx-react-viewer 独立测试（2026-09-13）

用户指定 ChristopherVR/pptx-viewer 后进行隔离测试，不替换18989或增加产品依赖。正式React包3.16.5、核心生成/独立回读包3.14.3；React/ReactDOM19.1.2。发布包peer的AI SDK要求React19.1.2等，未用force跳过冲突。npm安装仅位于.artifacts/pptx-react-trial，锁文件记录依赖。

复用记录：此阶段测试第三方公开npm包，不接Harness；后续Harness入口必须继续采用rc.1 Client Modules/React Slot/SidebarRight，同一Office服务，不直接启用第三方AI生成器或另建Agent loop。React包公开PowerPointViewer、ref API和i18n/styles；核心公开PptxHandler.create/addChart/save。测试脚本scripts/probe-pptx-react-trial.mjs，源码/结果/截图/native-edited.pptx在隔离目录。

通过：新建五页pie/bar/line/doughnut/area；编辑模式原生工具栏和缩略图显示；人工双击文字修改并Tab提交，保存后独立回读保留；人工点击缩略图翻页；公开goTo逐页控制；公开updateElement修改area数值7→77，undo回7，redo及getContent保存；独立核心回读和React内容重载保留77及五种图表；root卸载后host为空；pageerror为0。第一轮人工测试Escape取消编辑，改用Tab提交后复测通过，不把取消语义误判为编辑缺陷。

ZIP检查：保存文件包含5个原生chart XML，分别pieChart/barChart/lineChart/doughnutChart/areaChart，不是图片拼图。**没有ppt/embeddings工作簿**，因此PowerPoint/WPS“编辑数据”兼容性未签收；不能宣称导出无损或全面保真。

本轮未执行：原生图表属性面板手工数据编辑、全部23类型、图片/表格往返、真实AI/Harness Slot联测、完整宿主键盘事件与样式隔离、PowerPoint/WPS打开视觉及数据编辑、发布门禁。五页是功能样本，不是设计成品。公开接口控制证明可实现跟随，未证明真实AI已接入或逐页模型制作通过。

人工体验：http://127.0.0.1:19093/，仅隔离React编辑器，服务绑定本机，原WorkDSH未替换。

# 两个OfficeCLI项目区分

- iOfficeAI/OfficeCLI：官方说明是Office元素读取/创建/编辑命令和watch预览。本机现有1.0.149，help pptx chart/help watch已读取，未新增安装。watch帮助明确外部程序修改不会被检测，只有其命令通知会刷新；联合可视化编辑不能默认一致。
- officecli/officecli：不同项目，官方README为自然语言生成CLI，Hosted/External模型运行、可选publish；npm名officecli，前者提供@officecli/officecli。本机既有officecli技能对应前者。此新链接只文档核对，未安装或配置账号/模型；不将其独立生成流程直接引入Harness。

## 第二轮：原生图表面板、工作簿与宿主边界

2026-09-13，scripts/probe-pptx-chart-panel.mjs通过：原生属性面板spinbutton“Completed value 1”修改pie为91→Tab提交→getContent保存→独立PptxHandler回读保留91；没有用内部hooks或模拟生成图片。

导入现有PPTist八图文件（只读，原件不改），通过原生面板修改pie为91并保存；8原生chart及8嵌入xlsx保留，pie chart缓存和关联Microsoft_Excel_Worksheet1.xlsx工作表均含91，其他工作簿未被设91。**导入既有工作簿的同步写回已通过；新建图表未生成工作簿仍是另一项缺口**，不能将两者合并描述为“不支持图表数据”或“完整支持”。证据panel-result.json/chart-package-result.json/imported-panel-edited.pptx。

LibreOffice26.2.3.2独立headless Profile打开并导出PDF成功：新建编辑文件5页、导入编辑文件8页。第一页PNG用于视觉检查；PowerPoint/WPS真实“编辑数据”按钮未执行，LibreOffice转换不是它们的替代签收。

宿主小窗口900px试验结果：外部输入框能正常输入，卸载后能继续输入，无pageerror、onbeforeunload未新增；但随包CSS全局base reset将body margin8px→0px、外部button border outset→solid，组件卸载后CSS仍生效。因此**原样全局import styles不满足宿主边界**。不能凭React组件可卸载宣称完全兼容Harness。记录lifecycle-result.json/narrow-host.png，试验未改主应用。

下一步限定解决公开组件的样式加载边界和新建图表工作簿路径，再接正式React Slot、同一Office服务/资源导出。不得在本次功能试验中自动替换Word、清理旧稿或启用第三方AI执行器。实际Slot加载/关闭/重开、键盘全生命周期及制品门禁仍未执行。


## 第三轮：新建工作簿补全与限定容器样式

2026-09-13，隔离导出增强脚本 `scripts/pptx-trial/complete-chart-workbooks.mjs` 复用 ExcelJS、JSZip 和 XML 库，为五类新建原生图表补入嵌入 XLSX、公式、关联及内容类型；不修改第三方包内部实现。公开组件重新载入后，通过原生数据面板修改 pie 91→95，再次导出：五个工作簿保留，关联工作簿数值同步为95。OfficeCLI OpenXML 验证两个文件均为0错误，LibreOffice独立打开并导出PDF成功。重复补全返回原字节；导入已有八工作簿文件也返回原字节，不重复生成或覆盖原件。

`scripts/pptx-trial/scope-css.mjs` 使用 PostCSS/选择器 AST 将随包 CSS 限定在 `.workdsh-ppt-editor`。900px宿主挂载/卸载测试：body margin仍8px、外部按钮border仍outset、overflow仍visible；外部输入和卸载后输入正常，pageerror为0。原生深色图表数据面板数字原本黑字，试验样式限定 input 为浅色文字；视觉复核95/3/5可读，图表及图例无裁切。此修正只验证当前深色面板，完整主题切换、全部弹窗与全局动画名冲突未签收。

可复现脚本：`scripts/pptx-trial/probe-completed.mjs` 和 `probe-scoped-lifecycle.mjs`；从仓库根目录运行，先运行原独立构建探针，隔离依赖还需 postcss@8.5.28/postcss-selector-parser@7.1.0，静态服务19093。结果位于隔离目录 completed-result.json、completed-package-result.json、scoped-lifecycle-result.json、completed-scoped-panel.png；完成文件 completed-workbooks.pptx 和 completed-resaved.pptx。

限定容器体验地址：http://127.0.0.1:19093/scoped.html。仍是独立编辑器，默认原生下载不自动调用工作簿增强脚本；正式导出链必须显式接入。补全只支持上述五类已测图表，其他新建类型会明确报错；不宣称23类或PowerPoint/WPS完整保真。没有替换18989，未执行正式Harness/真实AI/发布门禁。


## 中文桌面体验样板（2026-09-13）

用户对比WorkBuddy后要求先看体验。复用完整PowerPointViewer、官方i18next词典/默认语言配置、公开原生SlideBuilder生成六页演示日报，包括70%饼图；没有重做工具栏或启用第三方AI。源码 scripts/pptx-trial/experience.tsx，隔离构建 experience.js，体验19093/experience.html。原技术五图样本不替换。

浏览器验证六页、公开goTo进入第三页、pageerror为0；271/3620个词条已中文覆盖，未翻译词条回退英文，不能称全面汉化。视觉复核1600px宽窗口封面和饼图无裁切、功能区和缩略图正常；800px窄窗口左右面板挤压画布、功能区被截断、正文图例难读，未达窄侧栏编辑要求。独立截图 experience-wide.png / experience-pie.png / experience-narrow.png 和 experience-result.json。本轮未接正式产品、未签收真实AI或无损导出。

结论：国际化接口可行；当前完整原生组件窄窗口适配仍不合格。下一步只验证公开Toolbar/SlideCanvas组合接口能否保留必要编辑操作并按容器宽度释放画布空间；不能用强制CSS显示来假装桌面模式已完成，也不能以样板排版代替编辑器交互验收。


### 600px 桌面组合布局修正

完整组件以 window.innerWidth<768 判定移动模式，上一版汉化未解决。体验页改为官方公开 Toolbar、SlideCanvas、useViewerBuildingBlocks；通过 ToolbarProps.isNarrowViewport=false 保留桌面功能区，外层横向滚动，不伪造window尺寸或修改第三方私有hooks。左侧页列表使用公开getSlides/goTo，画布的公开zoom.canvasViewportRef挂载至main，由原生测量适应容器。600px测试六页载入、点击第三页焦点为2、10个画布元素显示、pageerror0；截图desktop-600.png。仍是布局原型，完整属性面板/弹窗/放映及人工编辑导出回归尚未签收，不能当作正式完整编辑器。原体验URL不变，需刷新。

首次组合探针遗漏viewportRef导致画布过小，视觉复核发现后补上公开ref；600px背景画布重测346.5×194.9px，去掉重复手动缩放。


### 缩略图、常用汉化和缩放体验

2026-09-13继续改进隔离体验：复用公开PptxHandler.exportSlides(format=svg)生成六页样板缩略图，图片加载验证全部通过；公开goTo切第三页焦点2。使用公开zoomIn/zoomOut/setZoom，600px背景画布346.5×194.9→381.15×214.4，适应窗口恢复；靠上显示画布，减少上方空白。常用切换菜单和编辑标签中文覆盖372/3620，缺失词条仍回退英文，未全面汉化。pageerror0，截图experience-thumbnails.png。缩略图目前是样板生成时的静态SVG，修改后的同步刷新未接，不代表正式文件编辑闭环。完整属性弹窗、真实AI及正式产品门禁仍未执行。


### 对照WorkBuddy补可见汉化与文件标题

2026-09-13设计菜单浏览主题/编辑主题/页面大小/设置背景格式及悬浮说明、切换/字体/对齐等词典覆盖增至507/3620。提供文件名标题，缩略图标题缩小为12px。发布包存在硬编码children字符串；scripts/pptx-trial/build-experience.mjs仅在隔离构建内替换六处标签类别（+ Show/Slides/Font/Paragraph/Editing/Drawing），不改vendor文件，版本仍3.16.5。浏览器确认这几项可见英文消失、pageerror0，1200px设计页截图experience-design-zh.png。此构建补丁需版本升级时重新审计，不等于所有控件都走翻译接口。

组合模式编辑主题按钮未禁用，但tooltip明确未移植且主题面板不在本轮shell中；不能认为主题编辑功能通过。页面大小/背景等完整属性面板仍需接入。菜单窄窗口仍须横滚，真实人工全菜单交互未签收。用户参考图的紧凑功能分组和完整交互仍是体验目标，不照搬其私有编辑实现或将其项目能力归于本候选。


## 全面对标体验：完整原生桌面适配试验

用户要求全面对标WorkBuddy。新增full-desktop.html隔离试验，恢复完整PowerPointViewer承载原生属性/状态栏等。build-full-desktop.mjs构建内将发布包isMobileViewport判定固定false（第三方布局适配，非公开配置，未改vendor文件），不是Harness原生能力。700px加载六页/pageerror0；视觉复核无移动栏、关闭侧栏时画布完整；侧栏展开后的空间仍待验，功能区右侧仍超出窄窗口，不能因此替换组合体验。1400px第三页选择原生图表后出现10个spinbutton，完整属性面板可显示；实际数值修改/导出回归本轮未做。截图full-desktop-700.png/full-desktop-chart-panel.png。完整属性面板仍大量英文，全面汉化未完成。新地址19093/full-desktop.html供隔离对照，原experience.html保留。


## 新增第7页缩略图缺失修复

2026-09-13用户在experience.html新增第7页出现破图。根因是样板仅初始化固定六张SVG，按位置引用，新页src为空；不是截图能够证明的文档媒体丢失。改为监听公开getSlides快照变化，经公开getContent重新载入PptxHandler、exportSlides生成实时SVG，按稳定页面ID关联；180ms合并变化、effect取消旧任务提交、卸载清理计时器，加载期间使用固定16:9占位而非空src图片。生成失败显示明确提示。仍在隔离样板，同一组件公开API，不使用内部hooks。

scripts/pptx-trial/probe-thumbnail-sync.mjs浏览器测试：更新第一页文字后SVG变化；新增第7页产生预览；快速移至首位并删除一页后六张预览加载正常，pageerror0。人工视觉复核首位空白缩略图16:9无破图，更新后的标题在标签和预览中反映，饼图及后续列表预览正常。截图thumbnail-sync.png。全面中文、完整编辑面板和正式Harness接入尚未完成，不能宣称全面对标已交付。


## 完整原生图表面板编辑保存回归

2026-09-13继续：中文词典扩展到630/3620，包含图表类型/图例/分类/坐标轴和布局、背景等标签；仍未全覆盖。scripts/pptx-trial/probe-full-panel.mjs在1400px完整组件中人工选择第三页饼图，通过原生spinbutton将功能数量首值7→8、Tab提交，getContent导出，独立PptxHandler回读以及完整组件重开均为8，pageerror0。保存full-panel-saved.pptx，截图full-panel-zh.png。完整样板其他固定摘要文字仍是演示数据，不自动随图表值改动；仅此图表数据验证，背景/页面设置、放映和窄屏展开面板尚未实测。原组合体验同步汉化，不替换用户当前页面，两个隔离入口保留。


## 折线图插入入口修复

2026-09-13用户报告experience.html折线图无法插入。发布包原生下拉onChange只更新类型，右侧按钮才调用onAddChart；窄窗口按钮超出可见区域。组合样板新增常驻明确图表类型和插入按钮，复用公开ToolbarProps.onAddChart，不实现自有图表渲染器。快捷类型列出五种已测类别，原工具栏完整菜单保留。scripts/pptx-trial/probe-insert-line.mjs在600px人工选择line并点击插入，模型包含line、getContent保存独立回读和重新打开保留，pageerror0。截图insert-line-600.png，视觉复核常驻按钮完整、新图和缩略图显示；插入位置为原生默认，覆盖已有封面元素，需人工移动，不当作设计稿验收。导出inserted-line.pptx仅原生保存，工作簿增强仍未自动接入。


## 中文分组工具栏第一批

2026-09-13按用户七张参考图要求定制，使用frontend-design技能整理深色图标分组。组合样板新增Ribbon.tsx/ribbon.css，开始/插入/视图三个工具页，低频原生功能通过全部工具展开保留。常用动作继续调用公开ToolbarProps/SlideCanvasProps和handle；图表下拉选项直接调用onAddChart，移除独立快捷图表栏。新增页、撤销/重做、字体/段落菜单、文本/形状/表格、图表菜单、视图缩放/网格/标尺接线；图片文件输入尚未接，按钮禁用且提示，不宣称可用。其余四页未定制。

scripts/pptx-trial/probe-ribbon.mjs在600px验证折线图和表格插入、新增页、网格线、工具页切换，pageerror0。首次连续点击表格失败，定位Action在Ribbon内定义导致选择变化时重挂载、点击丢失；提至稳定组件后复测通过。probe-insert-line更新到新菜单，插入/保存独立回读/重开通过。视觉复核当前开始页紧凑无截断、缩略图原页和空白页网格正常；其他页视觉和完整编辑流程仍需验证。样板仅隔离体验，未替换正式WorkDSH。

### 中文切换、动画分组

使用公开 ToolbarProps.onTransitionChange/onApplyTransitionToAll/onAddAnimation/onRemoveAnimation，未改 vendor 文件。提供无切换、淡出淡入、推入、擦除，持续时间和应用全部；动画提供淡入、飞入、缩放进入、脉冲强调、淡出退出、移除。未选中元素时禁用动画操作。

`probe-effects.mjs` 在600×900验证切换及1200ms应用全部、淡入与强调、原生保存重开、画布点击选中后移除，pageerror为空。初始测试加载期间调用命令选中失败，改为用户画布点击后通过。视觉代理检查 effects-600.png 无重叠裁切。其余美化、放映和图片入口尚待完成；仍为19093隔离试验。

### 图表原生配置入口

公开导出仅包含完整 PowerPointViewer，未提供独立 Inspector/ChartPanel。体验页新增选中图表后“图表配置”，序列化当前编辑内容到完整原生编辑器并恢复页面和选区，完成后序列化回简洁工具栏；保留全部文档编辑，不重写数据控件。固定版本桌面 trial 复用此前 isMobileViewport 内存构建覆盖（非官方配置，vendor文件不修改），尚非产品适配。

probe-chart-config.mjs 验证7改8、完成返回、独立解析、保存重开，pageerror为空。视觉确认8/3数据区完整；原生面板顶部 OVERLAY SHAPES 部分被固定页签遮挡，英文与整体布局仍待整理。未验证所有格式项及窄屏展开面板。

### 窄屏图表配置修复

用户600px窗口反馈无响应。复测发现原生Inspector默认仅>=768px展开，进入原生视图后没有数据面板；窄屏开启Inspector还有全屏遮罩挡返回。入口保护pointer/mouse down并保存最近选中图表目标；隔离构建固定版本Inspector初始展开（内存覆盖，非官方prop）；返回标题栏z-index高于面板遮罩。probe-chart-config改为600×900，以实际用户点击验证进入、7改8、返回、保存及重开通过。之前1400px验证不足以覆盖用户窗口。

### 恢复单一完整原生编辑界面

根据用户官方侧栏截图，experience.tsx改为直接渲染完整PowerPointViewer，移除组合building-block shell及进入/返回配置流程。同一原生文档状态和handle贯穿编辑、数据配置、保存。保留中文i18next映射。旧Ribbon为历史试验，当前体验页不使用。

600px下data-pptx-inspector外层与内部面板均改为flow260px占位，隐藏窄屏面板遮罩，关闭面板不占位。probe-chart-config验证画布真实点击选中饼图、7改8、独立读取及保存重开通过，页面无错误；视觉确认画布与8/3同屏，无覆盖模糊。原生工具栏仍有英文与右端溢出，600px画布约328×184，精细编辑空间有限。未宣称完成WorkBuddy工具栏对齐。

### 默认布局回归修正

用户反馈切回完整原生编辑器后更差：左缩略图隐藏，默认Inspector占位，工具栏溢出。现在完整PowerPointViewer内部Toolbar以隔离构建适配接入中文Ribbon，公开ToolbarProps回调直接使用原生状态，全部工具保留原Toolbar。Inspector默认关闭，选中新的图表id时调用原生toggle展开；用户关闭不自动重复展开。左侧默认开启，窄屏也显示，120px宽；原生固定预览宽156同步为100避免裁切。右配置240px流布局。所有变换为固定版本3.16.5隔离试验，vendor文件不改；尚非官方slot配置，生产需要审阅源适配。

probe-ribbon在600px验证折线图插入、表格、添加第7页、网格、工具页及导航；probe-chart-config验证原生数据7改8保存重开。默认右侧无占位，中文首屏不溢出。两侧展开后600px画布仍小，不宣称完成整体体验。

### 图表配置侧栏可用性整理

adapt-inspector.mjs仅隔离构建重排原生ChartDataGrid到前面，并将原生格式组件包在中文details分组：类型标题、显示、坐标轴、数据点、系列颜色等。位置大小默认折叠；底部AnimationPanel默认折叠并不再固定占大块高度。原生编辑回调及控件保留。侧栏硬编码Elements/Properties/Comments标签改中文；输入和页签紧凑且关闭按钮可见。固定版本组件签名变化会构建报错。

probe-chart-config在600×900验证数值7→8、分类已完成→已交付、数据输入在视口内、独立解析与保存重开；无pageerror。视觉检查数据无需滚动、格式标题无重叠、关闭按钮完整。双侧展开时600px画布仍约224×126，不宣称所有配置完整汉化或整体体验完成。

### UI视觉统一

使用公开PowerPointViewer.theme prop统一background/card/popover/secondary/muted/border到中性深灰，primary/ring蓝色。仅编辑器Chrome，未修改PPT内容配色。Ribbon补文件名行，统一字体、边框、间距；原生侧栏分组去卡片层叠改细分隔、输入对比与焦点统一。保持同一原生编辑状态。600px probe-chart-config数据修改及保存重开仍通过。

### 补齐用户截图侧栏漏译

中文i18next补辅助功能标签和占位、动作事件、变换、批注和插值、图层及三维图/曲面/直方/帕累托/漏斗/矩形树/旭日/箱线/填充地图等类型名称。少量硬编码Transform/Opacity/旋转/上下移在隔离构建替换；图层与批注非文本元素显示用elementType翻译键，文本自身内容保留。内部类型、id、数据不翻译。

probe-inspector-zh在600px检查图表下拉漏译，原生pie切换line、辅助功能填写、图层文本、真实新增批注，无pageerror。截图inspector-properties-zh/elements-zh/comments-zh。不宣称所有3620键已翻译或所有图表类型验证完成。

补充复核：批注对象使用中文元素类型，默认作者改为“我”，日期使用 zh-CN；底部页码中文化。侧栏汉化交互探针通过，涵盖图表类型切换、辅助说明、图层及新增批注，页面异常为空。仅适用于 19093 隔离原型。
