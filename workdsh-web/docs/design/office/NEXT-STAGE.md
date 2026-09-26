# Office 下一阶段开发计划

## 2026-09-14 当前状态校正

本文件主体是2026-09-12的历史下一阶段方案。当前已发行Office alpha.4；PPT以现有React viewer路线为准，旧候选不再作为下一项开发。Word新增开发与Excel格式/合并/图表扩展暂停，画布与多维表格移出Office专项；现有Word/PPT/Excel/HTML/PDF首版保留。 当前有效台账见[STATUS](../../STATUS.md)。本次不恢复开发或推进验收。

## 历史批次记录

2026-09-12，用户授权发布 Word alpha.2 并规划后续；随后明确不再继续开发Word，因此Word完善暂停，PPT成为下一阶段。计划待实施，不将候选或规划写成完成。Office 仍是一个独立 Harness Host/Client 插件，八类编辑器是其按能力装配的适配器。模型负责理解、规划和内容综合；插件提供授权读写、图片传递、修订、实时展示及导出，不另造智能体/理解模块。

## Word 后续待办（暂停，不安排本阶段实施）

1. DOCX 列表与样式：保留编号/项目符号、起始编号和已支持的段落样式继承；不再把支持的编号全部降为普通段落。原文件保留，无法转换的结构仍提示。验收使用含多级编号、表格和图片的实际文档做导入—编辑—下载—重开，逐项核对。
2. 原生图片接入检查：不重做 Tiptap 图片交互，直接复用 Image；仅验证真实文件选择窗口/异步读取时光标位置、取消选择、图片对齐缩放和未保存修改。需要新图片资料时先核对 Harness 公开附件/文件接口，补官方复用记录，再提供最小授权数据传递；不另做资产底座。
3. 原生表格接入检查与缺陷修复：直接复用 TableKit 的选择、行列增删、合并/拆分和列宽拖动，不新增自己的表格工具栏、选择层或拖拽实现。只检查现有接入的可用状态、原生操作结果是否正确保存重开，以及 AI 是否能读取同一业务模型；发现接入缺陷才修复，无缺陷则不开发额外交互。
4. 写作验收语义：分别检查“每批提交实时可见”和“模型是否选择多批”。单批完成不是展示失败；不以人为强制拆批制造动画。短文允许一批，长报告以实际工具提交和右侧修订时间记录体验。保持内容工具优先，不改官方 Agent loop 或用户 Skill。

退出门槛：独立 Word-only tgz、原件不变、实际导入导出图文表结构检查、人机编辑/CAS/租约、卸载重装恢复、许可文本、真实模型及 WPS 样本；逐项说明未验的 Microsoft Word/OS IME/移动端。完整分页、页眉页脚及全部 OOXML 保真单列后续，不用“完整 Word”作为本阶段宣传。

## 下一阶段：PPT 实时制作最小闭环（当前优先）

优先阅读现有 OPEN-SOURCE-STACK 与 UNIFIED-API 的长期契约，完成公开组件 API/许可证核对及有限设计，再实施。采用已选定开源基础库的能力（Konva/React、JSZip/XML、现有导出库），不复制 GenOffice 产品源码，不启动第二 Agent loop。

首版范围：新建幻灯片、增删/排序页面、文字/图片及基本位置尺寸、选择与移动、逐页 AI 提交实时展示、保存重开及 PPTX 下载。模板/动画、全部 PPTX 导入保真及复杂图表后置。对外仍使用统一 content_* 入口与能力发现；类型专属操作由插件适配器公开，不强迫六/八类共享 Word 的 block 结构。/office 只在真实闭环通过后将 PPT 从待接入改为可用。

退出门槛：自然语言新建→右侧自动打开→至少两页制作→人工修改→AI读最新内容→下载→外部应用打开，独立插件安装/卸载/重装与授权/取消/失败回执测试通过。阶段开始前确定 DTO/操作/导出快照契约，不先造 UI 假能力。

## 第三阶段及完整八类路线

按单个闭环顺序继续 Excel → PDF → HTML/Markdown → 画布/多维表格；实际优先级可由用户调整。每种类型分别核对选定开源发行物和许可证、能力限制、文件原件与工作副本、统一工具输入、权限与生命周期，再开发。Excel 原生图表/格式回写与 PDF 内容编辑尤其不能拿预览或文本副本冒充完整编辑。八类全部保留在规划中，当前已发布实时能力仍只有 Word。

共同约束：复用官方 Loader/Profile、Remote/Connection、Tools、Storage、会话/附件/成果卡；AI/页面调用同一内容服务；不新增 MCP 传输或插件框架。MIT/Apache/BSD 等已批准许可版本精确锁定，实际打包许可文本逐版验收。PPT阶段退出后才开展下一类实现，主线 D04/D15 不因此标完成。

## PPT 风格选择闭环（2026-09-14，用户优先切片）

官方能力复用记录：Office-PPT-STYLE。官方文档 `https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/subsystems/user-questions.md`、`tool-catalog.md`；锁定官方 `ask_user_question@0.1.5-rc.1` 提供等待/取消/答案协议。Office 已实现 content_open(kind:html)、html.replaceDocument、content_present，沿用同一身份、授权、持久化和 Session 预览服务。业务差异仅为四套可复用的封面设计、预览生成工具和内置技能选择规则，不新增 Agent loop、answerer 或 iframe 通信协议。

第一版：右侧四套真实标题封面，原生提问选择；支持红色细分、明确模板/具体风格/快速交付跳过，选定后恢复原生 PPT。HTML 卡片只预览，不伪装已提交选择。验收包括转义、窄屏、不同版式、保存/重试及现有 Office/技能回归；真实模型、认证浏览器、选择恢复和最终 PPTX 视觉须另行实测，未通过不得称完整闭环。主线 D04/TM-01 不因此标记完成。

### PPTX 模板工作副本导入（2026-09-14）

复用已安装 `pptx-viewer-core` 公共 `PptxHandler.load/save` 和 Harness 0.1.5-rc.1 的 `ctx.fs.resolve/readBytes`（见 `https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/subsystems/filesystem.md`）。新增 Office 领域导入工具，不绕过文件提供者，不修改原文件；工作副本继续走现有所有权、会话、CAS、审计和实时编辑通道。普通新建仍保留，明确要求模板时不得新建空白代替。实际客户模板仅用于本地验证，不收入公开测试资源。

验证：Office 集成测试包含模板导入、原包字节保留、文字替换后重新解析、所有权、幂等/取消及大模板 HTTP 人工保存。客户 31 页模板的本地导入—编辑—人工保存结果位于 `.artifacts/ppt-template-probe/import-edit-save-result.json`；只验证组件/领域通道，尚未在已认证 preview 中走完整模型对话。DemiBold 页脚重影通过同名字体 CSS 字重 600 修复，无字体替换。

### 模板保存保真补充验证（2026-09-14）

使用公开 PptxSlide.isDirty 标记保留未修改页面，修改页清除与明确 authored RGB 冲突的 inherited colorRef。实际客户模板导入、文字修改、人工保存后，封面与目录画布像素一致，第 6 页标题区域以外像素一致。该证据属于实际组件及服务验证，不等于认证模型会话整体验收。

### 真实注入缺陷修复（2026-09-14）

用户会话发现 cannot get property fs without inject。此前根 Context 测试没有覆盖 Loader 的服务声明。按照 Cordis 4.0.2 公开 Plugin.Base.inject 契约，在 Office Loader 入口与子工具插件均声明 fs；测试在加载前提供 Fs，模板读取由插件声明的 Context 执行。必须部署后检查真实 Loader 启动，不能把隔离组件截图作为该链路成功证据。

### 长任务最终导出失败修复（2026-09-14）

实际客户任务30页、修订22的1750695字节PPTX在单命令参数写入时复现 errno 7 Argument list too long。原逻辑仅PDF分块，PPTX虽允许8MiB但无法通过系统参数上限。所有格式超过96KiB改用分块官方bash调用，继续透传 parent/rootCallId/signal/deferred contexts 与审批/沙箱；最终SHA校验、原子链接、同修订重试与目标冲突保护保持。失败不得present，模板媒体不转换。复用依据为锁定 Harness tools.zh.md 的 ctx.tools.execute 公开嵌套调用流水线。

连续新增正文时，原始页面的 backgroundImage 为每次 load 产生的新 blob URL，脏页比较误判并重新打包背景，实际4页模板每次新增约1MiB素材。修复从包基线公开解析结果重绑定已知图片临时句柄，再比较与序列化；无跨文档引用、私有API或图片格式转换。回归覆盖旧Host失效句柄、连续插页、素材字节不变及普通文本 blob: 不被当成图片。
