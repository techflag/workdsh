# Office 浏览器面板接入

## 官方复用记录

用户明确授权提前扩展 P1-01 原生右侧文件面板：Word/PPT/Excel 均接入，停止额外公式计算开发，禁止服务端 Office 转换。D04 及 D15 不因此宣布完成。

公开文档：https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/subsystems/sidebar-right.zh.md；发布包 @deepseek-ai/dsh-client-ui-sidebar-documentpreview@0.1.5-rc.1 的 ./client exports/types 提供 DocumentPreviewProps、documentPreviews 与原生 sidebar.right.tab.document。登记字节 loading=bytes-complete；ctx.effect 拥有注册注销，slots.inject 等待 owner，默认文件地址、权限读取、Tab、刷新继续由原生所有者管理。没有自建传输、Loader、文件资源注册表、模型调用或转换服务。

Office 内容在 sandbox=allow-scripts allow-downloads 的 opaque-origin iframe 内运行；只接收匹配父窗口的文件字节消息，无应用凭据/Host API。CSP connect-src none，图片/字体只允许 data/blob，关闭 Word HTML altChunks；原件不自动覆盖，导出为浏览器下载副本。

Excel 使用已验证 Univer 0.25.1/ExcelJS 候选适配器；Word 使用 docx-preview@0.4.0；PPT 使用 npm pptx-preview@1.0.7 的公开预览接口（原样依赖，未复制修改其实现；作者说明 npm 包可免费使用，源码限制不能误写成全部开源）。Word/PPT 原始 ZIP 的正文/幻灯片文字片段以 namespace-aware XML 修改，保留未修改条目；仅文字片段编辑，不是完整排版或图形编辑。未适配 Univer Word/PPT 原始 Office 转换，不宣称三者都已完整使用 Univer。

## 验收范围

需验证真实 DOCX/PPTX/XLSX 文件在浏览器展示、编辑与导出读回，原件不改，未修改 ZIP 条目保留、网络请求拒绝、插件装配与官方 Tab 接入、错误状态可见。复杂图表/布局、签名、加密文档、压缩包展开量限制、保存回 Host 及冲突检测仍属缺口，正式生产可用性未签收。当前只支持现代 .docx/.pptx/.xlsx，旧 .doc/.ppt/.xls 不被冒充支持。

## 实测结果（2026-09-12）

构建、Office 类型检查、规划检查与2项规划测试通过；官方 pnpm pack 产生独立 tgz，preview:install 经 CLI 在项目预览 Profile 安装并核对当前 Host/Client 入口字节。Root Harness 版本族保持 0.1.5-rc.1；新增浏览器引擎与测试 fixture 依赖锁已更新，不是 Harness 升级。

probe:office：实际 DOCX/PPTX/XLSX 在 opaque sandbox 浏览器框架打开；Word/PPT 修改文字、更新预览、下载并检查导出 XML 通过，所有未修改的原始 ZIP 条目内容逐一 byte-identical。Excel 展示/副本导出读回通过，编辑操作另由现有 Univer 探针覆盖。三个文件测试网络请求数0，页面错误0。只有常规简单 fixture，不以此代替用户复杂文档验收。截图 .artifacts/office-integration/docx.png、pptx.png、xlsx.png 已人工检查。

probe:office:native：在独立临时 Home/Agents/工作区，由官方 CLI 安装七个产品包及一个明确仅测试的诊断插件；后者只调用公开 sidebarRight.openTabIn 与 documentPreviews.getSnapshot，不提供模型工具或生产后门。创建隔离原生专家 Session，但未发送模型请求，经原生 Files Tab 点击真实三个文件，官方资源读取→Office 组件→浏览器编辑界面均通过，页面错误数组为空。最初脚本在第一个文件打开后未重新切回 Files，导致找不到下一文件；已修正测试导航，完整重跑三类通过，不是隐去产品失败。1440×1000 原生右侧截图已复核，窄栏文字编辑区按响应式放在底部。证据 .artifacts/office-native/result.json 与 native-docx/pptx/xlsx.png。

本轮不签收完整 WYSIWYG、Office 全格式保真、Host 覆盖保存/冲突检测、解压总量限制、用户六图表 Excel、生产硬化、暗色适配或全部小屏视口；正式业务插件全量模型验收未执行。不额外实现公式计算，不修改用户文件/任务，不提交推送或发布。

## 用户图表文件回归（2026-09-12）

真实含六张原生图表的 XLSX 触发 ExcelJS 解析器 undefined.anchors，ignoreNodes drawing 不能解决。新增内存解析副本清除图表/绘图引用，原始 bytes 不修改，高级对象清单在清除前记录，含图表导出仍禁止。scripts/probe-office-chart-regression.mjs 接收用户提供的本地 fixture；实际 Chromium opaque iframe 表格 canvas、状态提示、禁止导出、原件 hash 不变、页面错误0、外部请求0通过。该文件未加入源码；本次不签收原生图表展示。常规三类 Office 回归另行重跑。

修复后 Office 构建、类型检查、常规 Word/PPT/Excel 预览与导出回归通过，预览 Profile 已重新打包安装并重启，端口18989响应。

## 本轮：Word/PPT预览布局与实际文件回归（2026-09-12）

默认收起文字片段编辑，明确编辑文字按钮展开，更新按钮仅编辑时显示；Word页面按容器缩放、灰色画布与纸张阴影；PPT列表预览移除单页高度的内部滚动容器，用预览区统一滚动并适配宽度。真实PPT缺少可选defaultTextStyle导致第三方解析Object.keys(undefined)，仅预览内存副本补空默认样式，导出原包不改。真实用户Word/PPT在700px宽度无横向溢出，Word3页/PPT10页DOM及可滚动高度、编辑展开收起、原件hash不变、页面错误/外部请求0通过；截图复核。常规三类编辑/导出回归与类型检查通过。复杂图表/字体/分页完整保真未验收，不能以页面DOM计数宣称内容完整。插件重装，现有应用重启；未提交发布。


证据 .artifacts/office-layout-regression/docx-result.json、pptx-result.json 与截图；scripts/probe-office-layout.mjs 接收本地fixture，真实用户文件不加入源码。既有原生Profile三类探针本次未重跑。

## CSV 表格预览（2026-09-17）

用户反馈右侧面板打开 CSV 只有溢出纯文本，长行不可读。官方复用记录：任务 P1-01 / OFFICE-AI-01 右侧展示增量；官方文档 `https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/subsystems/sidebar-right.zh.md` 的“文档渲染器”节；锁定发布包 `@deepseek-ai/dsh-client-ui-sidebar-documentpreview@0.1.6-alpha.1` 的 `./client` 公开 `ctx.documentPreviews`（`DocumentPreviewDefinition`：extensions/title/loading/wrap/priority）与 `sidebar.right.tab.document` keyed slot。复用同一注册方式：`ctx.effect` 拥有注册注销，`slots.inject` 等待官方 owner；不新增 Tab kind、传输、文件读取或状态真源。文件授权、字节读取、刷新、渲染器下拉与换行控件继续由官方所有者管理；未知扩展仍回退官方纯文本。

WorkDSH 差异只在业务呈现：新增定义 `workdsh-office-csv`（extensions=["csv"]、loading=bytes-complete、wrap=true）与只读表格组件 `src/csv/CsvDocument.tsx`（表头、行号、单元格网格线、冻结表头/行号列、UTF-8/GB18030/UTF-16 识别、逗号/分号/制表符识别、超限截断提示）；既有 xlsx/docx/pptx 定义不变。空字节时可直接切换到官方“纯文本”，不替换回退实现。

解析依赖登记（2026-09-17 用户选定）：RFC 4180 解析、引号/嵌入换行字段与分隔符识别改用 PapaParse 5.7.0（MIT，`dependencies` 精确锁定；`@types/papaparse` 5.5.2 仅开发期类型）。字节解码与 1500 行/120 列/24000 单元格显示上限仍为 WorkDSH 自有的业务差异。解析以 `preview: 上限行数 + 1` 提前停止，用实际多出的那一行证明“确实溢出”，规避 `meta.truncated` 在文件恰好等于上限且带结尾换行时的假阳性；换行风格按 Papa 首个出现的 LF/CRLF/CR 决定，单一风格文件均支持，混用换行的非规范文件不做额外归一化。许可文本已随 office build 自动收集进 dist/THIRD-PARTY-LICENSES.txt（MIT 全文完整）与 bundled-dependencies.json，license-review.json 既有 10 项缺文本清单不变，papaparse 不在缺文本清单。

已验收（2026-09-17）：解析单测与浏览器渲染测试 2/2；office typecheck/build 通过；0.1.0-alpha.6 经 `preview:install` 装入 preview Profile 后，在 18989 真实浏览器（headless、token 登录）打开用户文件 `/Users/techflag/project/vipshop/2021040501_可导入数据.csv`：面板 Tab 打开、`region "CSV 表格预览"` 与表头 `lineNo` 存在、状态栏 `UTF-8 · 逗号分隔 · 10 列 × 2 行`、单元格/行号/表头计算样式边框均 1px、无浏览器错误；证据 `.artifacts/preview-csv/04-table.png` 与 result.json（脚本 .artifacts/preview-csv-verify.mjs）。未执行：原生 Files Tab 探针（probe06）仍被隔离探针环境的 create-execution workspaceId 分支阻塞，待重跑。（2026-09-19 补记：已重跑通过，缺陷链与探针适配见下节。）

## 原生 Files Tab 探针重跑与官方缺陷证据链（2026-09-19，alpha.2）

「待重跑」项收口：`probe:office:native` 在 alpha.2 基线上重跑全绿——result.json 7 项 checks PASS（隔离安装、真实 Host 默认面、首创建绑定会话、docx/pptx/xlsx/csv 四类原生 Tab），截图 native-docx/pptx/xlsx/csv.png 与 files.png；CSV 第四类分支首次随本探针实际跑通（表头、引号转义与中文单元格断言，状态栏 `UTF-8 · 逗号分隔 · 9 列 × 3 行`）。运行日志 `.artifacts/office-native/probe-rerun.log`，失败调试现场留档 `t10-rerun1/`。

重跑中确认并归属的官方缺陷（与升级证据 V3 的 browser-use 跨装 dsh-scope 缺陷同源）：

1. 页面打开后 create-execution 必被拒：Web 客户端页面加载必消耗首个激活槽（无会话→自动建 blank；有会话→恢复最近者）；此后任何 create（UI 召唤或 API）均为第二次激活——`prepare-execution succeeded → access.session-bind succeeded → session.create failed gateway/internal → experts/internal`，会话空壳落盘但不激活、无绑定。失败尝试遗留的「未激活会话空壳」已按会话 createdAt 与 audit session-bind 精确对齐取证。
2. 探针适配（不改上游）：首创建改在页面加载前经插件 API 发出（与 UI 召唤同一 prepare/create 业务服务）——第一激活成功并留下真实绑定会话，页面加载恢复它；四类 Office 验收全部运行在绑定会话上，修复 fallback 到页面自建 blank 时 DOCX 导入 FORBIDDEN（content service `sessionOwner` 绑定检查）的问题。页面内 UI 召唤降级为容错金丝雀：拒绝时 result.json diagnostics 记录真实错误码且不阻塞，上游修复后自动翻回严格 PASS（verify-binding 断言）。
3. `sidebarRight.openTabIn` 静默 no-op：未被面板 adopt 的会话不生效（官方 client.js `actionsFor` undefined 直接返回；侧栏折叠时面板未 mount）。探针改走「展开右栏 + 官方 Start 引导页 Workspace files 卡片」UI 原生路径（debug7 实证），openTabIn 保留兜底。
4. fresh-load UI 竞态：全新 Home 首次加载后短窗口内 pointer 点击可持续超时且无任何请求；探针以「重试 + DOM click 兜底 + 条件诊断」容忍（详见 STATUS 2026-09-19 条目）。待查：`/api/workdsh-office` 每 500ms 轮询。

本轮不签收范围不变：完整 WYSIWYG、Host 覆盖保存/冲突检测、解压总量限制、生产硬化等；探针不发送模型消息，复杂用户文档保真仍待验收。
