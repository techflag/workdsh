> 2026-09-13 最新范围：不开发画布与多维表格，停止新建候选展示（保留历史引用解析）；PDF 首版已实现新建分页工作副本、AI 按页更新、人工文字保存、真实 PDF.js 预览与 PDF 下载/导出；已有任意 PDF 导入、OCR 和图片编辑未接入。已有 HTML 实时预览保留。下文历史八类规划以此决定为准。

# WorkDSH Office 浏览器编辑插件

当前 alpha.5 候选仅保留 pptx-react-viewer 3.16.5 / pptx-viewer-core 3.14.3 作为 PPT 编辑器，沿用已确认的中文桌面工具栏与原生图表侧栏。PPTist、CreatPPT、旧 PPT 预览/画布适配已删除。Word 已发布 alpha.2；当前源码继续增加结构化原生图表能力，发布版本以新的候选验收为准。

PPT 新建、逐页 AI 修改、修订、权限及保存使用同一 Office 内容服务；原生文件 Tab 直接接收 Harness 授权字节，无 iframe。已有 PPTX 在浏览器编辑并下载副本；不静默覆盖原文件。服务新建的 PPT 工作副本支持自动保存、重新打开和下载。原生图表数据直接可编辑，不用图片或扇形拼图。原型构建适配固定版本的工具栏/侧栏并限定 CSS，不修改 Harness 或发布依赖文件；升级需重新复核。

`content_import_pptx(path,title,operationId)` 通过调用会话的 Harness 文件服务读取实际 PPTX，并打开独立实时工作副本；不覆盖模板。上限 8 MiB、50 页、每页 200 元素、解压 64 MiB，工作副本状态 30 MiB。要求客户模板时使用此入口，导入失败不能空白重绘。`presentation.updateText(slideId,elementId,expectedText,text)` 替换普通文字框，保留位置、占位符元数据和首段样式；整框文字替换不保留混合内联字体。仍需逐页检查实际渲染，导入不代表任意复杂对象都保真。人工 PPT 保存通道允许 30 MiB；普通文档和 AI 编辑仍沿用原大小限制。

content_open(kind=presentation) 初始化一页；content_edit 的 presentation.insertSlides/updateSlide 使用 core 原生 slides/elements，页 ID 为稳定业务 ID，nativeId 对应 PPTX 部件。删除、排序沿用结构操作。content_capabilities 提供当前字段和图表能力；旧模板操作不再可用。文件交付工具 content_export 已支持已提交 Word/DOCX 与 PPT/PPTX，通过官方 bash/present 策略链路交付文件卡；PPTX 上限 8 MiB，实际会话端到端验收待执行。

Word 预览版 `0.1.0-alpha.2`（表格/图片增量；历史文本预览版为 `0.1.0-alpha.1`），按官方 Loader/Profile 安装。插件接入原生右侧文件 Tab，文件授权读取与刷新继续由 Harness 拥有；不使用服务端 Office 转换，不依赖本机 Office/LibreOffice，不向第三方上传文件。

当前候选复用 Tiptap 3.31.0 MIT 的 TableKit 与 Image 扩展：工具栏靠前提供「表格」「插入图片」，增删行列、标题行、合并/拆分，以及原生列宽拖动和图片缩放；选中图片后可对齐。Word 图表使用 Office 插件自己的结构化 `chart` 块，浏览器绘制 SVG，DOCX 导出写入原生 Chart XML 和嵌入工作簿，不把图表生成 PNG。AI 使用同一个受授权内容服务分批写入，右侧实时显示。保存重开及 DOCX 导出保留表格、图片、图表数据和文字样式；DOCX 导入为非无损独立工作副本，现阶段不会把任意外部原生图表反向解析成结构化块。每张 PNG/JPEG 512 KiB，图表最多10个系列/50个分类，表格50行/50列且最多500单元格，批次1 MiB、文档2 MiB。嵌套表格、单元格内图片、复杂浮动布局、完整页眉页脚与 Word 分页仍未完成。历史记录描述 alpha.1 能力时以对应版本为准。


后续交付范围已扩展为Word、PPT、Excel、PDF、画布、多维表格、HTML、Markdown八类。HTML源码/实时预览、Markdown正文/源码编辑均须接入同一内容服务。当前原生 document 新建/编辑/修订同步已打通；以下文件表格是原有适配器范围，完整八类统一接口尚未完成。

当前实施边界：本包独立分发；Host根通过官方ctx.plugin组合内容服务、工具和Connection，Client进入官方模块图，默认WorkDSH组合仅装配本包。Host 内容服务、六个原生工具和原生 Tiptap 页现已实现；package的private标记不等于已发布npm。新增能力必须通过OP-T01—07的干净安装、生命周期、恢复和资源制品验收。

新原生文档：AI 调用 `content_open` 新建即自动打开当前会话右侧、`content_edit` 分批提交后页面自动更新；`content_present` 仅用于再次展示；用户点击“编辑”后直接在正文修改，完成编辑后 AI 用 `content_read` 获取最新内容。`content_capabilities` 列出已实现操作。Host/页面共享有修订和幂等收据的工作副本，不需要子智能体或外部 MCP。只接受可信 Session 绑定及同工作区授权。

普通文档写作由本插件通过 Harness `systemPrompt.section` 提供默认实时写作引导：先打开文档再分批写入，已有编辑器提供默认字体/层级样式；不替换专家 persona 或修改用户 Skill。短报告真实模型验证及范围见[U2证据](../../../docs/evidence/office-natural-writing-u2.md)。

早期 U1 尚未接入 DOCX 导入与导出；当前候选已经提供浏览器 DOCX 工作副本导入和 `content_export`，保留已支持的文字、表格及图片。完整文件保真仍未完成。早期范围见[U1 历史证据](../../../docs/evidence/office-live-u1.md)。

| 格式 | 当前能力 | 当前限制 |
| --- | --- | --- |
| `.xlsx` | Univer 表格编辑、单元格值/普通公式导出副本 | 原生图表不显示，含已检测高级对象禁止导出；不支持结构/格式修改导出 |
| `.docx` | 浏览器排版预览、正文文字片段修改、更新预览、导出副本 | 不是完整排版编辑器，不能编辑页眉页脚等未列出的内容 |
| `.pptx` | 当前中文原生幻灯片编辑、图表数据/样式、导出副本 | 复杂 PPTX 往返兼容性仍须逐项验证 |
| `.csv` | 右侧文件 Tab 只读表格预览（单元格网格线、表头/行号、冻结表头与行号列、UTF-8/GB18030/UTF-16 与逗号/分号/制表符识别） | 只读，不编辑不导出；超过 1500 行/120 列/24000 单元格只显示前缀并提示；混用换行的非规范文件按首个换行风格解析 |

Word/PPT 修改基于原始 ZIP 包，未修改条目保留；多文字 run 保持原有格式边界，编辑面板显示文字片段，不把它们混成整段而丢失格式。复杂对象与高级 Office 保真仍未签收。暂不支持旧 `.doc/.ppt/.xls`、密码文档，当前文件上限10MB；压缩展开限制等生产保护仍待完善。

```sh
corepack pnpm --filter workdsh-plugin-office build
corepack pnpm --filter workdsh-plugin-office typecheck
corepack pnpm probe:office
corepack pnpm probe:office:native
corepack pnpm probe:office:live
corepack pnpm test:office:content
corepack pnpm preview:install
```

`probe:office:native` 依赖前一个探针产生的测试文件，在隔离 Home 使用真实七包 Profile＋仅测试的诊断插件验证；不发送模型请求。图形预览不会由构建/测试自动打开。

主要依赖：Univer 0.25.1、ExcelJS 4.4.0、docx-preview 0.4.0、pptx-react-viewer 3.16.5、pptx-viewer-core 3.14.3、PDF.js 5.4.624、pdf-lib 1.17.1、Tiptap 3.31.0、PapaParse 5.7.0。PPT 编辑与展示使用 ChristopherVR/pptx-viewer 的 Apache-2.0 包；CSV 解析使用 PapaParse 的 MIT 包，字节解码与显示上限为自有实现；没有重新引入已删除的 pptx-preview。

导出目前是浏览器下载副本，未实现覆盖 Host 原件及冲突检测。切换文件、刷新或关闭 Tab 可能丢弃未导出内容，请先导出副本。不要用此开发版本覆盖重要原件。

`node scripts/probe-office-live.mjs --real-model` 显式使用已配置 preview 模型进行隔离真实验收；临时凭据结束清理，不写入制品。默认探针仍不调用模型。

`probe:office:live` 单独安装 Office 与显式治理依赖，通过官方 Tools 和浏览器验证三批提交、人工编辑及重载；不发真实模型请求。构建生成 `dist/THIRD-PARTY-LICENSES.txt`、`dist/bundled-dependencies.json` 和 `dist/license-review.json`。当前完整候选保留精确依赖清单与已收集许可文本；另有 10 个依赖版本尚未收集到随包许可文本，`@univerjs/telemetry@0.25.1` 的包元数据未声明许可证。两类缺项均进入发布清单，报告不会改写为通过。


### U2/U3 原生文件交付与下载

完成文档后 AI 调用 content_export，将当前保存修订生成真实 DOCX，再通过官方 present 显示 Harness 文件交付卡，不使用自绘成果卡。卡片打开实际文件；右侧实时工作副本继续保留，可以编辑、跟随阅读和下载最新修订。导出文件是当时的修订，后续工作副本修改不会静默改写它。导出输出到当前 Session 的 output 目录，清理标题加 UUID 命名，独占创建，不覆盖原件。

导出工具复用官方 bash/present 的作用域、沙箱/审批和取消信号，不使用本地 Office/服务器转换。当前需要执行世界提供 Node/bash/present，最大 DOCX 1 MiB；拒绝/失败不声明成功文件，仍可右侧浏览器下载。文件写入成功但 present 失败时对已有路径重试 present；不要重新导出造成重复文件。未知写入结果、幂等导出收据和跨类型导出仍是后续 U3 门槛。旧工作副本不会自动生成历史交付声明，可请求 AI 导出已有文档，内容数据保留。DOCX 保真导入和表格仍未实现。

### 原生文档常用排版

支持字体/字号、颜色/高亮、标题1—6、对齐、行距/缩进、项目符号与编号列表（最多六级）、撤销重做、全选/清除格式、段内文字查找替换、缩放。人工和 AI 使用同一套语义样式，保存重开与浏览器 DOCX 下载保留上述格式。候选 alpha.2 增加表格行列、合并拆分、列宽拖动与图片上传/缩放/对齐，工具栏单行横向滚动；不等同于 Word 完整功能，页眉页脚、分页和完整 DOCX 保真迁移尚待后续。见[工具栏证据](../../../docs/evidence/office-document-toolbar-u2.md)。

工具栏现已复用 Tiptap 官方 MIT UI Components 的 Toolbar/ToolbarGroup、Button 和 SVG（锁定来源及适配差异见 src/live/tiptap-ui/SOURCE.md），44px 单行，窄栏横向滚动。未引入收费 DOCX 模板；文档格式操作继续使用同一实时保存服务。

## `/office` 输出选择与 `@` 文档引用

在已有原生任务输入框输入 `/office`，选择 Word、PPT、Excel、PDF、画布、多维表格、HTML 或 Markdown；原生输入框插入可删除的输出标签，例如「Word · 新建」。直接继续输入需求并发送，新建无需 `@`。标签由官方 reference chip 拥有删除、撤销和提交序列化，不替换附件、模型、权限、队列与发送器。

输入 `@` 时，Office 分组列出当前任务授权可访问的工作副本，每份提供「参考资料」与「修改此文档」两项。参考资料保留原件、生成新文档；修改对象序列化为明确 target，读取最新修订后修改。类型和引用用途直接展示在原生输入标签内，不额外占用一行说明。未选择类型时仍可使用自然语言。原生 `@` 文件和任务引用入口保留；本增量的显式 reference/target 标签针对 Office 工作副本，不宣称已支持任意文件保真导入。

八类输出选择均可用，但当前统一内容工具的实时适配仅 Word 工作副本就绪；其余菜单明确显示「实时编辑待接入」，输出意图告知 AI 不得误建为 Word 或假称完成实时编辑。类型和角色经原生 codec 在提交时序列化为模型可见 JSON；这是输入意图，不替代 Host 授权和严格操作校验。文档序列化重新检查访问，切换任务后的旧引用拒绝发送并要求重新选择。多个输出或 target 要求 AI 澄清。


## 安装、卸载与内容保留

发布物是独立 `.tgz`：Host入口、Client模块、`cordis.patch.yml`、编辑器资源、版本说明和许可说明都随包交付。安装使用官方 `dsh plugin --profile <名称> add <Office.tgz>`，并显式提供本地身份、授权、审计基础插件及匹配 Harness `0.1.6-alpha.2` Web Profile。已有 WorkDSH Profile 可复用这些治理依赖，不需要装专家、技能管理或工作台插件。Word-only 预览制品见 [GitHub prerelease](https://github.com/techflag/workdsh/releases/tag/office-v0.1.0-alpha.1)；不将其宣称为完整 Office 正式版。

通过官方 `dsh plugin --profile <名称> remove workdsh-plugin-office` 移除安装，按官方Profile流程重新启动/加载配置。Office菜单、文档引用来源、六个工具、写作guide、预览与实时页注册一起撤销；保留用户已保存内容和原文件。已存在输入标签属于草稿，不能替用户删除，插件缺失时引用无法解析、发送失败；删除标签后可正常输入。重装对应制品后入口恢复，同一Profile中已保存记录和修订保留；未承诺自动恢复卸载时未保存的浏览器缓冲。

### 安装与卸载 Office 候选包

以下命令用于本仓库已配置的 `preview` Profile，要求完成开发环境准备，先运行 `corepack pnpm release:office:pack` 生成当前完整 Office 候选 `.tgz`。已发布旧版本的能力范围以对应版本说明为准。使用 Node.js 22.23.2。先在运行预览的终端按 `Ctrl+C` 停止应用，再执行安装和启动：

```bash
cd /Users/techflag/project/workdsh

# 安装本地候选包 / Install the local candidate
DSH_HOME="$PWD/.test-runtime/preview" \
  corepack pnpm exec dsh plugin --profile preview add \
  "$PWD/.artifacts/office-release/workdsh-plugin-office-0.1.0-alpha.8.tgz"

# 启动 / Start
corepack pnpm preview
```
卸载也先停止应用，再执行以下命令，随后运行 `corepack pnpm preview` 并刷新页面：

```bash
DSH_HOME="$PWD/.test-runtime/preview" \
  corepack pnpm exec dsh plugin --profile preview remove workdsh-plugin-office
```
请保持安装、卸载和启动使用同一 `DSH_HOME` 与 Profile。卸载撤销 Office 入口及工具，保留已保存文档和原文件；重新安装恢复入口。新建 Word 无需 `@` 引用，在任务输入框选择 `/office` → Word 即可。

生命周期与真实 tgz 冷启动重装证据见 `docs/evidence/office-word-release-u3.md` 和当前原生 Office 探针；各版本范围见 CHANGELOG.md。候选支持多格式工作副本和模板导入，具体保真边界以本页各格式说明为准。

## 当前完整候选与历史 Word-only 分发

运行 `corepack pnpm release:office:pack` 生成当前完整 Office tgz，包含构建产物、精确依赖清单、已收集许可文本和缺项报告。打包器不会再生成过时的 Word-only 变体，也不会因 10 项已知文本缺项伪装为“许可证完整”；`release-manifest.json` 会保留 `licenseTextsComplete: false` 及具体项目。alpha.1/alpha.2 的 Word-only 包仅是历史发布物。

同一文档修订与内容产生稳定 DOCX 字节和路径。`content_export` 可传 `baseRevision`（来自 content_read）；文档已更新时拒绝旧修订导出。官方 bash 将完整临时文件独占链接到目标，已存在时核对摘要，不覆盖修改后的文件。写入回执丢失时同一修订重试可复用文件；交付失败/结果未知返回现有路径，先核对原生卡片再重试 present。取消后不继续交付。幂等文件不表示 present 卡片具备跨进程去重，跨 Host/执行世界迁移及掉电恢复尚未验收。

### 已存图片的 AI 引用（alpha.2 开发）

content_open/content_read 的模型快照将图片 src 投影为 `office-image:<sourceDocumentId>:<blockId>:<SHA-256>`，不重复返回 Base64。将该 src 原样放入 content_edit 的 image 载荷，可在同一文档复用或复制到另一个有权限的 Word 工作副本，并调整宽高、对齐或替代文字。Host 分别检查目标编辑和来源读取权限、组织/工作区边界，核对原图哈希，再走既有修订/租约/提交。来源不变，目标独立保存原始图片字节，来源以后修改/删除不会联动目标。旧版不含源 documentId 的短引用仍限定目标文档，保持兼容。

模型快照仅为投影；页面、持久状态、DOCX 保留嵌入图片，未增加资产注册表或文件访问底座。范围仅限可读取的 Office 工作副本文档，尚不支持新文件资料/远程 URL/其余七类编辑器的跨格式制作。失效来源须重新读取；源删除后的旧引用重试仍可能失败，通用资产幂等未完成。新图片仍使用已有 PNG/JPEG 嵌入输入。

后续范围以真实文件和发行验收为准。各阶段以真实文件、实时编辑和独立插件生命周期验收，规划不代表能力已完成。

### Excel 工作副本（Preview）

通过 `/office` 选择 Excel，或由模型读取 `content_capabilities` 后使用统一 `content_open/read/edit/export`。支持值、公式及多工作表；浏览器编辑时取得租约，完成后保存，下载真实 XLSX。限制为 20 张表、A1:CV1000、10,000 个非空单元格；格式、合并、图表与实时 XLSX 导入暂未接入。公式在浏览器计算，导出保留表达式并要求 Excel 重新计算。

## 0.1.0-alpha.4 Web preview

Full experimental Office package for Harness 0.1.6-alpha.1 Web. Includes the current HTML, Word, PDF, PPT and spreadsheet implementation; feature-specific limitations remain documented. Third-party dependency references are listed in the root README and existing notices are preserved.

### PPT 风格预览

`content_preview_styles` 使用同一 Office 服务保存独立 HTML 规划预览，通用和红色各四套封面；返回方案 label、palette、layout 和预览 documentId。真正答案由官方 `ask_user_question` 收集，不在 HTML 内自行桥接会话。选择后重新打开原始原生 PPT，应用全局风格并导出；预览不是整份 PPT 或交付回执。当前首版固定八套设计，不等同于 WorkBuddy 任意动态风格生成。

模板中字重名称含 DemiBold/Semibold 的文字在画布按 CSS 600 绘制，避免再次选用粗体产生中文字形重影；不改导出 PPTX 的字体名称或样式。

### 长任务导出与背景资源

超过96KiB的导出文件统一分块经过官方bash审批/沙箱链，不将整个PPTX Base64放入单个命令参数。最终核对SHA并原子落盘，拒绝覆盖冲突目标；中途失败不展示成功交付卡片。保存基于当前PPTX重新绑定已知blob媒体句柄，再判断页面变更，避免临时URL变化触发背景重复打包。未知媒体引用应重新读取或提供实际嵌入图片。
