## 2026-09-26：文档第二轮清理

核对 README、发布索引、计划检查和全仓文本引用后，删除 9 份无人引用的早期 Alpha 独立说明、未发布的社交文案，以及已由现行浏览器会话方案取代的 Desktop 侧栏实验审计。仍被当前规则、设计决策或验收台账引用的 UI 原型、ADR、Office/专家设计和 evidence 保留；删除它们会破坏现有可追溯性。`check-plan`、双语文档一致性和 diff 检查通过；未运行产品构建或功能测试。

## 2026-09-26：清理旧版上游文档与退役审阅链路

移除仓库内 `0.1.6-alpha.2` 上游文档镜像及只依赖该镜像的审阅脚本；历史设计依据改为指向官方固定 tag，逐文件审查台账仍作为历史证据保留。删除无源码或文档引用的演示截图和旧赞助素材。当前代码和打包基线仍为 `0.1.7-rc.2`。已通过 `check-plan`、双语文档一致性、仓库布局、Web/Desktop 版本一致性及 `git diff --check`；未执行产品构建、运行测试或真实模型测试。后续若继续精简历史设计文档，须逐一核对计划、证据与链接依赖。

## 2026-09-25：受管浏览器会话首个代码切片

`packages/providers/browser-session` 0.1 在建模块已接入官方 `SessionResources`、`McpClient`、个人本机 Connection Fetch 路由，以及官方 `sidebar.right.pane.tab` 的 Client 画面/输入组件。真实 Chromium 集成测试验证两个 Agent Session 的导航、隔离、关闭清理、失效 Session/非个人身份拒绝，以及路由点击被 MCP 快照看到；Host/Client 构建、类型检查与 `check:plan` 通过。默认 bundle 仍使用官方独立浏览器 provider；新 Client 未做实机截图、1440/1920/390 视口和键盘交互验收。用户已明确禁止在 Desktop 安装包另带浏览器；相关打包尝试已撤回。Desktop 两个变体已有隔离 Electron worker 入口，browser-session provider 已可按 Session 启动/关闭它；开发态实际入口经 Playwright 连通、导航和点击通过，变体与两套类型检查通过。安装包、官方 MCP 到右栏闭环、真实 HTTP、取消/恢复、Windows/macOS 和团队授权仍未验证；下一步先完成这些验收，再接入默认 Profile。

## 2026-09-25：rc.2 模块文档口径复核

核对专家、连接器、技能、项目和资料库当前包依赖后，`check:versions` 通过：556 条 DSH 锁记录均为 `0.1.7-rc.2`，Cordis 为 `4.0.3`。专家、技能、连接器 README 中仍有 0.1.6 基线和旧 tgz 示例，现已改为当前源码版本，并区分本地 Web 验证与历史 GitHub 制品。项目和资料库 README 未发现同类旧基线声明。另检查 GitHub 发布的 Desktop alpha.18 macOS arm64 DMG：有内置 Node/Python，但没有独立 Chromium；随包 Playwright 配置仍默认调用机器上的 Google Chrome。官方 Browser tab 与 Playwright provider 无共享页面契约，安装包证据和正式验收要求已回填 [rc.2 升级记录](DSH-0.1.7-UPGRADE-PLAN.md)。本轮只修改文档；未重新构建、运行模型或做 Windows/macOS 安装后实机验收。浏览器 Agent 与右栏同页操作仍未完成；下一步实现受控的 Session 浏览器与右栏同页操作，并用安装包验收。
## 2026-09-25：Web/插件 alpha.10 rc.2 发行候选

11 个运行包与项目版本已递增，按官方 DSH `0.1.7-rc.2` 的公开接口重新构建；本次发行包将替换 Desktop 先前引用的 alpha.9 包。Node 22.23.2 / pnpm 10.34.5 下构建、类型检查、556 条版本锁定、115 项集成测试、12 项项目测试、5 项资料库测试与规划校验通过。规划台账里过时的 `resources/skills/expert-manager` 路径已改为实际受版本控制的 `resources/skills/workdsh-expert-manager`。11 个打包文件的 SHA-256 与清单逐项一致，安装器 dry-run 在 `0.1.7-rc.2` CLI 上通过；GitHub Release 尚未完成。浏览器 Agent 与右侧栏共享同一页面仍未实现。

## 2026-09-25：rc.2 Web 全新 Profile 安装复验

在独立空目录 `.test-runtime/rc2-fresh-install` 用 Node 22.23.2 / pnpm 10.34.5 执行 `corepack pnpm preview:install`，21.8 秒退出码 0。安装器核对 CLI、Base、Web App 均为 `0.1.7-rc.2`，Profile 的 11 个 WorkDSH 包入口与当前构建字节一致；另行读取已安装 Sidebar Browser 为 rc.2。原先“尚未完成全新空 Profile 安装”的缺口已补齐，详见 [升级记录](DSH-0.1.7-UPGRADE-PLAN.md)。未在该隔离 Profile 运行付费模型、长时间专家任务或跨平台浏览器验收；Agent 浏览器与用户侧栏 Browser 同页操作仍未实现。下一步继续完成 Desktop 构建和浏览器集成验证。

## 2026-09-23：alpha.8 发布准备

中英文 README 去重并更新完整应用截图与安装说明。整包补齐项目/资料库，固定 Harness 0.1.7、pnpm、原生构建配置和官方必需peer。全仓构建/typecheck、集成112项，后续安装器5项、专家20项回归通过。11包隔离安装、重装、冷启动及项目/资料库浏览器冒烟通过；273个DSH模块版本一致。旧专家显式重新发布路径通过，真实旧用户数据未自动迁移。当前等待GitHub登录以完成远端发布。详见 [发布审查](evidence/release-alpha8-review.md) 和 [更新说明](releases/v0.1.0-alpha.8.md)。

## 2026-09-22：alpha.8发布前审查

用户确认版本0.1.0-alpha.8，根版本已更新。审查补齐正式打包/安装漏掉的项目和资料库，并对齐官方base/web-app及Profile内CLI/账号peer；11包候选已生成，SHA256与dry-run通过。全仓build/typecheck、集成111、其他29、安装器修复后3项测试通过；依赖锁定检查通过。尚有阻塞：真实专家页9/9 preset异常，旧修订迁移/重新发布路径及真实任务待验；候选隔离新安装/历史升级未执行。未提交、推送、打标签或发布。审查报告 .artifacts/release-alpha8/REVIEW.md，截图同目录screenshots；专家图仅缺陷证据，主页/技能可作候选配图。

## 2026-09-22：弱化侧栏分界线

静止侧栏边框透明，依靠左右背景区分；悬停与拖动显示低透明度反馈。保留官方布局、拖动区域与导航。版本相关 CSS 适配集中于 ShellAppearance，升级须检查选择器匹配。bundle 构建/typecheck 与安装后明暗边框、拖动调宽验证通过，无 pageerror；18989 已更新。证据 docs/evidence/sidebar-divider.md，探针 scripts/probe-sidebar-divider.mjs，截图 .artifacts/project-home/divider-*.png。未执行全量业务回归，未提交/发布。

## 2026-09-22：项目主页视觉优化

参考用户 WorkBuddy 截图，标题区移除厚重横幅与大表情，改为无边框布局和线性图标；统一紧凑卡片、标题/时间层级、模板说明截断及容器响应网格。项目构建/typecheck 通过，18989 已安装重启。浏览器明暗截图、搜索、模板创建入口与 600px 无横向溢出验证通过，无 pageerror；已检查截图。证据 docs/evidence/project-home.md、scripts/probe-project-home.mjs、.artifacts/project-home/。未执行真实模型与全量业务回归，未提交/发布。预览安装超时与失效锁已解决，安装超时上限改为180秒。

## 2026-09-22：侧栏项目入口返回主页

已将项目主页与详情拆为独立 main key。侧栏“项目”固定打开主页，卡片和会话归属打开详情；旧项目深链兼容，详情刷新保留当前项目。项目和 bundle 构建/typecheck 通过，18989 已更新重启。浏览器探针 scripts/probe-project-navigation.mjs 验证详情→主页、会话→主页、会话归属→详情及详情刷新通过，无 pageerror；截图 .artifacts/project-navigation/home.png。未执行模型任务、全量业务回归；未提交/发布。当前修复无阻塞。

## 2026-09-22：项目对话菜单统一已安装验收

项目首页与项目会话共用＋级联菜单，支持文件、专家、技能、连接器，紧凑空态、主题与窄屏。保留原生编辑器、附件、权限、模型和发送；普通会话保持原生入口。首页选择仅存草稿，任务固定能力快照；会话连接器只修改当前任务，失败保持原选择。专家显式新建项目任务，不自动发送。

项目/资料库构建与类型检查、12 项项目测试通过。18989 已安装重启；无客户端制品注入的浏览器复验通过，含附件 chooser、主题、390px 返回、技能插入、原生 / 回退、连接器失败重试且项目配置不变。截图已检查。未执行真实模型、专家实际交付与完整上传发送；未提交或发布。详见 [验收证据](evidence/project-conversation-menu.md)。

## 2026-09-22：会话输入区主题修复

连接器弹层、详情及按钮改用原生主题别名；资料库图标悬停使用原生主文字色，避免浅色背景下变白。连接器与资料库构建通过，预览已更新。`scripts/probe-composer-theme.mjs` 在真实会话完成 light/dark/light 弹层背景变化、图标悬停颜色和截图验证，证据 `.artifacts/composer-theme/`。未发送模型消息、未改变连接器选择；未执行全量业务回归。

## 2026-09-22：输入区能力级联菜单

“＋”中的专家、技能、连接器改为输入框旁的二级面板，支持悬停/点击、搜索、就地添加、紧凑空状态。项目配置通过现有修订校验保存；新任务使用保存后的配置，不改变运行中任务。右侧配置管理仍保留。构建与 11 项测试通过；最终预览交互验收通过：三类空态/搜索/保存/失败重试、明暗主题、Escape、390px 返回和外部点击关闭；临时项目已归档。证据脚本 `scripts/probe-project-cascade.mjs`。未调用模型，未提交或发布。

## 2026-09-22：项目输入区添加入口

＋改为添加文件/专家/技能/连接器分类菜单，复用资料库上传与选择、已有项目能力配置；@ 保留项目引用，空内容提供添加文件入口。确认添加的文件自动成为输入区可移除的引用标签。模式/模型仍由原生会话提供，不放无效菜单项。构建通过，18989已更新；浏览器分类菜单、上传/资料库入口、专家配置、@引用及 Escape 关闭验证通过。未发送模型任务，未执行实际文件上传全链回归。

## 2026-09-22：项目任务排序与原生空间归属

- 任务列表按创建时间倒序。新任务由 Host 校验项目权限并解析独立目录，经官方 Workspace Controller 建立同名空间；删除最近 Session/首个工作区回退。
- 历史任务保留原 cwd/文件，不自动迁移。工作区与会话分组仍由原生 Sidebar 拥有。
- 构建、11项测试、真实预览的工作区命名/幂等/拒绝无效项目与列表排序验证通过；18989已更新。证据 [项目空间](evidence/project-workspace.md)。未执行真实模型任务，未提交/发布。

## 2026-09-22：修复项目选择框描边裁切

项目滚动区域增加 8px 横向留白，保持内容对齐，避免原生外部描边和焦点环被裁切。构建、最终安装后明暗任务/计划选择框及390px布局验证通过，18989已更新。未运行全量业务回归。

## 2026-09-22：项目详情体验修复

- 项目默认任务页；任务标题/来源/日期对齐，计划默认阅读、点击编辑并支持保存/取消/失败保留，配置栏压缩至 280px 并展示真实名称，活动按日期分组，输入区减小高度与阴影。
- 保留原生会话导航、主题、引用和任务执行管线。定时任务未开放时移除无效添加入口；窄屏配置默认收起。
- 项目构建/typecheck、10 项测试、规划与 diff 检查通过；最终安装后浏览器验证真实项目四页明暗主题、1920/390 布局、原生任务打开、计划取消/失败重试/刷新持久化通过。18989 已更新运行。
- 证据：[项目详情验收](evidence/project-detail-ux.md)。下一步由用户查看实际项目体验；未执行真实模型任务、屏幕阅读器及跨插件全量回归，未提交/推送/发布。

## 2026-09-22：补齐连接器、项目及资料库主题

## 2026-09-22：公共表单控件统一（UI-CONTROLS-01）

- 范围：项目、资料库、技能、专家、连接器的标准操作按钮、Input、Select、Textarea。Button/Input 复用 DSH 0.1.7-alpha.1 原生组件；选择框及文本域由公共 UI 补齐，不引入 shadcn。
- 统一标准单行外框 36px、紧凑操作 28px、原生主次按钮主题；导航、卡片、开关和对话引用仍保留原有专用语义。
- 修复原生 Input 容器引起的项目名称布局偏移；适配聚焦 ref，保留资料库搜索 submit；小屏按钮不收缩、项目说明单独占行。
- 构建、类型检查与规划检查通过；五页面主题、控件几何、聚焦、选择、搜索提交已通过，最终包安装后 1920/390 项目弹窗、按钮不换行复验通过；18989 开发环境运行中。
- 证据：[公共控件验收](evidence/shared-form-controls.md)，探针 scripts/probe-preview-controls.mjs，截图 .artifacts/controls/。
- 未执行：全模块移动端业务流程、屏幕阅读器与 Host 全量回归；未提交、推送或发布。


UI-017-04 已修复：三页表面/文字/输入/按钮改用原生主题语义变量，移除项目强制深色。三个受影响包构建和类型检查通过；已安装到18989并完成五页面明暗往返检查，含添加MCP及新建项目弹窗，截图已检查。文档原文及品牌/类型图标保留原色。证据见 [升级验收](evidence/dsh-0.1.7-acceptance.md)。未提交/发布，未执行真实模型任务或全量业务回归。

## 2026-09-22：修复技能/专家页面及弹窗不跟随系统主题

UI-017-03 已关闭：移除技能与专家页面及共享 Modal 的固定深色，使用原生主题语义颜色与投影；浅色→深色→浅色的页面、卡片、按钮及专家弹窗验证通过。全量构建、受影响包 typecheck、版本/计划/diff 检查通过，修改已安装到 18989 开发预览。截图与回执见 [升级验收](evidence/dsh-0.1.7-acceptance.md)。旧专家 preset 异常属于独立兼容问题，本次未重新发布旧修订；未提交/发布，未执行真实模型任务或全量业务回归。

## 2026-09-22：修复开发预览内测声明无法保存

DEV-017-02 已关闭：仓库 CLI 与 Profile 设置插件加载不同的 app-boot 实例，导致配置重载根入口缺失。改为 Profile 内安装并启动精确版本官方 CLI，安装和启动时校验实例一致，并补齐账号适配器原生 peer。18989 已重启；原生确认保存、刷新、进程重启后全新浏览器均通过，最终启动无未激活入口告警。未修改上游，未绕过声明，未提交/发布。证据见 [升级验收](evidence/dsh-0.1.7-acceptance.md)。本次仅启动脚本变更；全仓测试和真实模型任务未执行。

## 2026-09-22：开发环境直接切换并启动 0.1.7-alpha.1

按用户明确要求不备份，直接执行 preview:install；11 个 WorkDSH 模块及官方 base/web-app 更新完成，安装脚本核验入口文件与当前构建一致。修复安装脚本遗留的 dsh-agent-presets 包名校验，改为 0.1.7 的 dsh-agent-preset-registry。启动 18989 成功，登录兑换 303，浏览器显示 WorkDSH、历史工作区、项目/专家/资料库入口且无 pageerror；新版首次提示尚需用户确认。未发送真实模型任务，未提交/发布。日志 .test-runtime/upgrade-017/preview-install.log、preview-server.log；截图 .artifacts/upgrade017-acceptance/development-started.png。

## 2026-09-22：修复升级验收遗留 UI-017-01

资料引用预览改用官方主题语义颜色，移除容器固定深色背景及文字/分割线/状态提示色。浅色→深色→浅色即时切换截图和计算样式验证通过；资料库 build/typecheck、浏览器 17 项（含项目引用、原生预览、编辑入口、冷启动重开）通过，无浏览器错误。已更新验收记录，当前已发现的主题遗留问题关闭。未部署 18989，未提交/发布；真实模型质量、用户历史数据迁移和跨平台仍属未测范围。下一步为备份及升级用户预览，验证真实历史数据。

## 2026-09-22：升级核心链验收通过，保留一项界面问题

DSH 0.1.7-alpha.1 隔离验收：16 项浏览器检查通过（六格式原生预览、三编辑入口、项目 @ 引用与上下文、消息右侧预览、冷启动后重开任务），无浏览器错误；旧格式专家回归 20/20，资料库两次冷启动及卸载重装通过。发现浅色主题下资料引用预览硬编码深色（UI-017-01，未修复），因此界面不作全部通过结论。模型使用确定性测试夹具，不代表付费模型质量。下一步修复主题问题，再备份并验证用户 Profile 升级；18989 未切换，未提交/发布。详见 [验收记录](evidence/dsh-0.1.7-acceptance.md)。

## 2026-09-22：DSH 0.1.7-alpha.1 原生优先升级（本地未发布）

完成依赖升级、官方声明式专家预设注册与恢复、原生过程展示替代、原生预览优先、Session V4 工具结果适配。修改计划、验收与未测范围见 [升级计划](DSH-0.1.7-UPGRADE-PLAN.md)。全量 build/typecheck、110 集成、5 资料库、10 项目、2 规划测试通过；隔离安装与专家浏览器 13 项通过（含两次冷恢复）。旧目录专家需重新发布；未切换用户 Profile，未提交/发布。旧 0.1.6 专项长任务探针未迁移；不宣称所有业务链路或版本发行验收完成。

## 2026-09-20：WorkDSH v0.1.0-alpha.7 公开发布回执

按既定项目级发布流程完成 alpha.7 公开发布：源码提交 `8e29c4c`（release: prepare）已推送 main（`31f68bb..8e29c4c`），annotated tag `v0.1.0-alpha.7` 指向发布提交；GitHub prerelease [v0.1.0-alpha.7](https://github.com/techflag/workdsh/releases/tag/v0.1.0-alpha.7) 携带 13 个资产（九包 .tgz + SHA256SUMS + release-manifest.json + RELEASE-NOTES.md + install-workdsh.mjs），未发布 npm。

- 九包版本：identity-local α.5、audit α.4、access α.5、skills α.31、experts α.7、connectors α.2、activity α.4、office α.7、bundle α.47（本批 bump skills/experts/connectors/bundle 四个模块：外观主题修复与行业应用标签删除）。
- 发布门槛：全仓 build + typecheck PASS；集成 110/110、活动 14/14、规划 2/2；`check:plan` PASS（29 模块/50 文档）、`check:versions` PASS（513 条 α2 锁定）。
- 打包（rel04）：提交 8e29c4c 后重新打包，`release-manifest.json` 的 `sourceCommit` 与 tag 指向同一提交；`shasum -c SHA256SUMS` 九包全 OK。
- 隔离安装（rel05）：`.test-runtime/release-alpha7-jLMzE0` 全新 Profile 经官方 CLI 安装九包 → 匿名 401 / 认证 200 → 全模块移除后冷启动 PASS；回执 `.artifacts/release-alpha7-smoke.json`。
- 公开发布：13 资产逐一通过 GitHub SHA-256 digest 校验后发布；发布过程中一个未关联 tag 的孤立重复 draft 已删除，正式 release 保留唯一。
- 公开回读（rel08）：13 个资产无认证下载逐字节一致（`PUBLIC_VERIFY_PASS`，日志 `.artifacts/release-alpha7-public-verify.log`）；GitHub API 回读确认 draft=false、prerelease=true。

证据：`.artifacts/project-v0.1.0-alpha.7/`（发行制品）、`.artifacts/release-alpha7-{build,typecheck,tests,activity,planning,checkplan,versions,pack,smoke,publish,public-verify}.log`、`.artifacts/project-alpha7-release.json`。

未执行/边界：相对 alpha.6，专家团长任务探针、真实模型两阶段交接、连接器隔离探针与腾讯文档实连未在本批制品上复跑（release-manifest limitations 与 RELEASE-NOTES 已声明）；Windows 与 Linux 验收、卸载/事务式回滚、签名 SBOM、交互式 OAuth、小时级专家团稳定性仍未签收；projects 与 library α.2 不进入本次安装组合（library 保持独立发行）；npm 未发布（项目策略）。

## 2026-09-20：外观（主题）切换修复（bundle α.47，用户报告）

用户报告设置→通用设置→外观切换不起作用（附截图）。根因：`packages/bundle/src/client/harness/client.ts` 客户端注册并强制 `workdsh` 深色主题、监听 `theme/change` 把非深色快照拉回。设置页点击实际已写入 settings（settings.yaml 实证 light 已持久化），但 DOM 被立即拉回深色，且激活偏好变成非内置值，三个选项均无选中态。官方 `ui-theme` 偏好与 ThemePresenter 应用链本身完好，问题全部来自该强制层（alpha.1 起引入，对应 UI-DESIGN 旧表述“维持深色呈现”）。

修复：bundle α.46→α.47（随本批发布）删除主题强制块与 `ui-theme` import；`dsh.client.inject` 与 devDependencies 的 ui-theme 引用同步移除；UI-DESIGN 相关表述改写为“外观由官方 ThemeRuntime 与用户偏好驱动，不注册第二套主题、不拦截 theme/change”。构建与 typecheck 通过；重装预览并重启后浏览器实测：加载按 system 解析生效，点「深色」→ themeSource=dark、body 深色，点「浅色」→ 白底且 settings.yaml 同步写入，点「跟随系统」→ source=system，三选项选中态正确显示。

同日 preview 清理：`dsh.profile.bundles` 又出现两个滞留 agent-team bundle（19→17，疑似运行中 UI 操作写回），备份 `.test-runtime/preview/_fix-backup-1789890313/` 后移除，dump-config 无重复 id。

未执行：刷新后持久性的最后一轮浏览器复验被中断（三向切换与 settings 写入当日已实测）；未单独复跑浅色全站深度视觉走查。

## 2026-09-20：能力中心「行业应用」标签删除（用户决定修正）

用户明确指令：删除能力中心「行业应用」标签项（`['apps', '行业应用']`），行业应用暂时用不到；此前批次记录的“隐藏、实现后恢复”处理按此修正为删除。

核对现状：三处 `capabilityTabs`（ExpertsPanel/SkillsPanel/ConnectorsPanel）源码与构建产物均已不含该标签项，能力页保留专家/技能/连接器三标签。文档同步：skills α.31 / experts α.7 / connectors α.2（Unreleased）CHANGELOG、MODULE-VERSIONS 与 UI-DESIGN 措辞由“隐藏（实现后恢复）”改为“删除（暂时用不到）”。应用域规划与模块登记（applications 模块、D08/P1-05）保留，台账与交付顺序未变。

预览生效过程（用户报告界面仍显示「行业应用」）：根因是预览环境装载的是旧制品（skills α.29 / experts α.6 / connectors α.1，均含四标签），源码与工作区 dist 的删除未同步到预览。本批次重新 `npm pack` 三个包并装入 preview（skills α.31 sha256 `aad8517e…5759`、experts α.7 `86453460…ce31`、connectors α.2 `60d440a8…a4ef`），重启后浏览器实测能力中心工具栏为 3 个标签「专家/技能/连接器」，页面全文无「行业应用」（uid 快照与 DOM 统计双证）。未执行：专家/技能/连接器各标签页深度交互复跑（本轮仅验证标签栏与技能页首屏）；未提交、未推送。

## 2026-09-20：preview 启动阻塞修复（滞留 agent-team-profile 层）

用户要求启动 WorkDSH 预览；启动报 `duplicate loader entry id: agent-team`。根因：preview profile 的 `dsh.profile.bundles` 中存在无代码/脚本引用的滞留条目 `@deepseek-ai/dsh-experimental-agent-team-profile`（0.1.6-alpha.2 升级仅作 pnpm.overrides 版本锁定，仓库脚本与文档均无装配引用），其官方 patch 与 workdsh-plugin-experts 的 "Official Team composition" 插入重复的 `agent-team`/`tool-agent-team` 条目。按 2026-09-15 用户授权决定（官方 Team 由 experts 插件装配）移除该滞留条目，保留 experts 装配（maxMembers: 16）；原 package.json 备份于 /tmp/preview-profile-package.json.bak。

验证：dump-config 仅剩一个 `id: agent-team`；`corepack pnpm preview`（Node 22.23.2，heap 8192，隔离 Home .test-runtime/preview）启动成功，18989 token 兑换 303 → 首页 200；Client 启动图含 workdsh-plugin-experts/office/activity 与 client-ui-agent-team。

未执行：浏览器真实交互与专家团真实模型任务；未提交、未推送、未改仓库代码与锁文件。备注：preview 当前制品批次为 Sep 19 安装（experts α.4 / skills α.29 / bundle α.45），落后于已发布 alpha.6 制品（α.5/α.30/α.46），未在本轮重装。

同日续：按用户要求在 WorkDSH 预览环境安装第三方插件 `@wxg-prc-cpg/browser-skill-dsh-plugin@0.3.0`（腾讯 BrowserSkill 的 DSH 插件）。经官方 `dsh plugin --profile preview add`（DSH_HOME=.test-runtime/preview）装入，bundles 追加、dump-config 含 `id: browserskill`；重启预览后经认证 API `/api/workdsh-skills` list 实测技能总数 169、含 `browser-skill`（state=readonly，插件自带技能）。同插件此前已按用户最初命令装入 `~/.dsh/profiles/web`（Host/client 加载已单独验证）。浏览器扩展连接（bsk 0 连接）与 `browser_*` 工具端到端调用未验证；pnpm 忽略构建脚本警告为既有依赖，未处理。

同日续二：修复用户报告的设置面板出现两个「Agent 预设」页。根因：`workdsh-plugin-experts` 的 PresetMenu 为在原生设置页过滤专家预设并拦截对它们的“设为默认/复制”，对 `settings.section` 槽做了包装式注册（复用官方 id/order/label）；但该槽是官方声明的增量 list 槽——每条注册各自成页、无替换语义，包装只会生成第二个同名设置页（实测两条目内容相同、DOM 同图标，且不随开关累积）。`conversation.hero.agentPreset` 是单座槽（后注册者接管），那里的包装仍然有效。按用户选定方案 A 移除包装：`PresetMenu.tsx` 删除 settings.section 包装注册（保留 hero 单座槽接管与守卫），`tests/integration/expert-native-presets.test.mjs` 改为单注册断言并新增防回归（注册项不得含 settings.section）。expert-native-presets 3/3、专家相关（manager/preset-authoring/preset-projection）21/21 通过，构建后 `client.browser.js` 中 settings.section 计数为 0。

experts 由 α.5 bump 至 α.6（Unreleased，含 CHANGELOG/README/MODULE-VERSIONS）；tarball sha256 `80266b1e…f47349`，装入 preview（file: 依赖指向新 tarball）并重启，浏览器实测设置导航 7 项且「Agent 预设」恰好 1 个（修复前 2 个），设置页内容正常、控制台无错误。已知边界：设置页层面的专家预设过滤与守卫随包装移除（依赖官方 Host，官方页自身对 broken 预设提供“加载失败”标记与禁用/删除）。附带发现（与本修复无关，未处理）：预览数据中 3 个自定义预设显示“加载失败”（需求分析顾问、工作复盘顾问、重复的旧钱日清 `wd-exp-member-e65ec2cc5a6d-5503a26730a7`），其 compose 引用 harness 已更名的 `@deepseek-ai/dsh-workflow-worker-thread`（现为 `workflow-ptc`）。新会话 hero 席位的真实选专家任务未复跑。

同日续三（用户追问「agent 为什么会加载失败」，复核并修正上条判断）：从运行界面读取官方悬停原因，3 行完全相同——`row "workflow-worker-thread" names a plugin that cannot be resolved: @deepseek-ai/dsh-workflow-worker-thread`。机制：官方 `dsh-agent-presets` 发现期健康检查（`packageInstalled`）从 harnessBase 逐级向上查 `node_modules/<pkg>/package.json`，任一插件行不可解析即整份预设标 broken（设置页「加载失败」徽标、选择器过滤、不可设为默认/复制）。修正上条：①需求分析顾问（rev-5058e190350f）与工作复盘顾问（rev-5c1bd5347882）**当前发布修订本身**仍是 `workdsh-expert-compiler/0.1` 于 9-12 编译的产物（origin=default 内置种子，并非“已删专家”），专家详情显示「preset 异常／请重新发布后再召唤」且不可召唤，修复路径＝专家页重新发布（`presetIdFor` 将 COMPILER_VERSION 计入摘要，重编必产新目录、必含 `workflow-ptc` 行）；②旧钱日清行 `wd-exp-member-e65ec2cc5a6d-5503a26730a7` 是被 rev-6fde772afe3d 取代的历史修订（rev-d495197e1084，0.1 编译）的残留目录，当前发布的钱日清修订（`…-22b44693c88f`，0.3 编译）健康，不影响钱日清当前使用。主环境 `~/.dsh` 亦有同批 3 个引用 worker-thread 的旧预设（含文档评审顾问），但主环境 node_modules 链仍解析到 0.1.5-rc.1 的该包（全局 dsh 自带、hoisted），按官方解析算法可解析——该失败为 alpha.2 运行环境（预览）特有。未执行：重新发布修复动作本身、残留目录清理、主环境运行态复核。

## 2026-09-19：WorkDSH v0.1.0-alpha.6 公开发布回执

按既定项目级发布流程完成 alpha.6 公开发布：源码提交 `debc429`（release: prepare）+ `ab096f0`（installer 测试断言修复）已推送 main（`8ba8626..debc429`），annotated tag `v0.1.0-alpha.6` 指向发布提交；GitHub prerelease [v0.1.0-alpha.6](https://github.com/techflag/workdsh/releases/tag/v0.1.0-alpha.6) 携带 13 个资产（九包 .tgz + SHA256SUMS + release-manifest.json + RELEASE-NOTES.md + install-workdsh.mjs），未发布 npm。

- 九包版本：identity-local α.5、audit α.4、access α.5、skills α.30、experts α.5、connectors α.1、activity α.4、office α.7、bundle α.46（后五个随 alpha.2 升级与开发推进 bump，其余沿用已验收版本）。
- 发布门槛（rel01/rel02）：全仓 build + typecheck PASS；集成 110/110、活动 14/14、规划 2/2；`check:plan` PASS（29 模块/50 文档）、`check:versions` PASS（513 条 α2 锁定）；修复升级批次遗留的 `project-installer.test.mjs` 断言（硬编码 `0.1.6-alpha.1` → 常量引用）。
- 打包（rel04）：先提交 debc429 再重新打包，`release-manifest.json` 的 `sourceCommit` 与 tag 指向同一提交；`shasum -c SHA256SUMS` 九包全 OK。
- 隔离安装（rel05）：`.test-runtime/release-alpha6-ZKPjiC` 全新 Profile 经官方 CLI 安装九包 → 匿名 401 / 认证 200 → 全模块移除后冷启动 PASS；回执 `.artifacts/release-alpha6-smoke.json`。
- 公开回读（rel08）：13 个资产无认证下载逐字节一致（`PUBLIC_VERIFY_PASS`，日志 `.artifacts/release-alpha6-public-verify.log`）；GitHub API 回读确认 draft=false、prerelease=true、target_commitish=debc429。

证据：`.artifacts/project-v0.1.0-alpha.6/`（发行制品）、`.artifacts/release-alpha6-{build,typecheck,tests,activity,planning,pack,smoke,public-verify}.log`、`.artifacts/project-alpha6-release.json`。

未执行/边界：Windows 与 Linux 验收、卸载/事务式回滚、签名 SBOM、交互式 OAuth、小时级专家团稳定性仍未签收；projects 与 library α.2 不进入本次安装组合（library 保持独立发行）；npm 未发布（项目策略）。

## 2026-09-19：代码评审修复批次收口（findings 15/16/18/19 + word-only 制品探针）

代码评审对升级分支未提交变更产出的 21 项 findings 已完成逐项核对与修复；finding #3（UI 召唤点击失效）已在上一 T10 条目单独收口，本条目汇总其余修复与批次验证证据。修复细节见各模块 CHANGELOG（projects alpha.2、office alpha.7、bundle alpha.46、contracts alpha.9）。

- finding 15（死代码）：`encode` 已随更早批次清除并经全包 grep 复核无残留；`AssetPicker` 的 `upgradeIds` 只声明未接线，删除（主面板同名状态仍由「更新到最新修订」使用，保留）。
- finding 16（composer `@`）：改为 `onKeyDown` 拦截（文末、无选区、非 IME 合成时 `preventDefault` 并打开引用菜单）+ `onChange` 精确追加检测（恰好追加单个 `@` 时剥离并开菜单）；快速连按 `@` 不再把字面量留在草稿。
- finding 18（URL 契约）：bundle alpha.46 CHANGELOG 显式列出——`?workdsh-view=assistant|automation|more` 不再切换视图（静默回落对话视图），`?task=` 在项目面板打开时清理。
- finding 19（word-only CSV）：office 客户端注册按 `__WORKDSH_WORD_ONLY__` 门控——CSV 预览与侧栏 Tab 不再注册；`workdsh-office` 文件扩展在 word-only 下收窄为 `["docx"]`。
- 新探针 `probe:office:word-only`（scripts/probe-office-word-only-scope.mjs）：构建两态 Client 产物并在 VM 沙箱 + mock Cordis ctx 中断言注册面；证据 `.artifacts/office-word-only-scope/result.json`（failures: []；word-only 仅 DOCX、normal 保留 CSV；两态 release-scope.json 一致）。
- esbuild 实证：非 minify 构建不做 `if (!wordOnlyRelease)` 分支消除（CSV 字符串在两产物中均保留），静态字符串断言不可行，故采用 VM 运行时注册断言；沙箱以 `window === globalThis` 自引用 + 最小 DOM 桩（document/DOMMatrix 等）对齐浏览器语义。
- 预先存在阻塞（如实记录）：word-only 打包仍被许可文本门禁拦截（缺 @ai-sdk/provider-utils 5.0.0/5.0.28、@nodable/entities、@pdf-lib/fontkit、pptx-viewer-mcp；build-office.mjs 与 HEAD 无差异，非本批引入）。探针容忍该门禁验证已写出的 bundle，并以 try/finally 保证结束时恢复 normal dist。
- 批次验证：`check:plan` PASS（29 模块/50 文档）；`typecheck` 12 包 PASS；`test:office:csv` 2/2、`test:office:content` 21/21、`office-rich-editor` 3/3。
- 未执行/边界：word-only 制品的真实浏览器端到端验证（受许可门禁阻塞，无法打包）；本探针为 VM 注册级证据；未提交、未推送、未发布 npm。

## 2026-09-19：原生 Office 探针重跑通过（T10 收口：官方缺陷证据链 + 探针适配）

代码评审 finding #3（「UI 召唤前 30s 无 create 请求」）随本批修复收口：全新隔离 Home/Agents 上 `probe:office:native` 重跑全绿——result.json 7 项 checks PASS、`native-docx/pptx/xlsx/csv.png` 四类截图；CSV 第四类分支首次随本探针实际跑通（表头、引号转义与中文单元格断言）。较 09-12 首轮，验收会话由「页面自建 blank」改为「首创建绑定会话」。

- 官方缺陷归属（与升级证据 V3 的 browser-use 跨装 dsh-scope 缺陷同源）：alpha.2 上 Web 客户端**页面加载必消耗首个激活槽**（无会话→自动建 blank；有会话→恢复最近者）；此后任何 create-execution（UI 召唤或 API）均为第二次激活——`prepare-execution succeeded → access.session-bind succeeded → session.create failed gateway/internal → experts/internal`，会话空壳落盘但不激活、无绑定。失败尝试遗留的「未激活会话空壳」已按会话 createdAt 与 audit session-bind 精确对齐取证。
- 探针适配（不改上游，金丝雀自恢复）：首创建改在**页面加载前**经插件 API 发出（与 UI 召唤同一 prepare/create 业务服务）——第一激活成功并留下真实绑定会话，页面加载恢复该会话；四类 Office 验收全部运行在绑定会话上，修复 fallback 到页面自建 blank 时 DOCX 导入 FORBIDDEN（content service `sessionOwner` 绑定检查）的问题。页面内 UI 召唤降级为**容错金丝雀**：拒绝时 result.json diagnostics 记录真实错误码且不阻塞；上游修复后自动翻回严格 PASS（verify-binding），无需改探针。
- 侧栏前置（T10 debug7 实证）：`sidebarRight.openTabIn` 对未被面板 adopt 的会话静默 no-op（官方 client.js `actionsFor` undefined 直接返回；侧栏折叠时面板未 mount）。探针改走「展开右栏 + 官方 Start 引导页 Workspace files 卡片」的 UI 原生路径；openTabIn 保留为兜底。
- fresh-load UI 竞态（如实记录）：全新 Home 首次加载后短窗口内 pointer 点击可持续 15s+15s 超时且无任何请求（prepareSeen=false）；同 Home 二次加载 0.21s 正常。探针以「重试 + DOM click 兜底 + 条件诊断」容忍，不掩盖真实拒绝。待查：`/api/workdsh-office` 每 500ms 轮询（debug3/4 观测，未隶属本缺陷链）。

证据：`.artifacts/office-native/{result.json,native-*.png,files.png,probe-rerun.log}`；失败现场留档 `.artifacts/office-native/t10-rerun1/`；调试脚本 `.test-runtime/t10-ui-debug[1-8].mjs`（隔离临时 Home，不进产品包）。文档同步：`docs/evidence/office-integration.md` 末节。

未执行/边界：不修改上游源码，缺陷修复依赖上游版本；本探针不发送模型消息；未提交、未推送、未发布 npm。

## 2026-09-18：文档镜像刷新为 alpha.2 语料（引用同步 + 审计）

按既定「镜像刷新单独批次」决策，将 alpha.1 语料镜像整批替换为 alpha.2 快照 `https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/`（543 文件 / 337 md / 规范对象 171；新增 persistence-changes、postmortem、i18n 等章节；`subsystems/code-runtime.*` 更名重写为 `subsystems/ptc-runtime.*`，`ctx.codeRuntime`→`ctx.ptcRuntime`）。

- 引用同步：全仓 44 文件 117 处旧路径 token 更新；`subsystems/code-runtime`→`subsystems/ptc-runtime`（含 3 个文档的链接标签与 prose 修订：office HARNESS-INTEGRATION、desktop MANAGED-RUNTIME、harness-review-closure）；`.idea` IDE 状态与 `.artifacts` 历史证据不改写。
- 行号重锚（新语料）：d07 证据 5 处——slots.md:147→:150、persistence-catalog.md:403-407→:473-477、tool-catalog.md:222-228→:624-630、:22→:25（slots.md:25-41 不变）；`docs/HARNESS-OFFICIAL-DEVELOPMENT.md` 基线字样 0.1.5-rc.1→0.1.6-alpha.2（Typert 段保留历史探测表述）。
- 审计：专项 `p5-doc-mirror-audit` 15/15 PASS（替换完整 543/337、旧 token 全仓白名单扫描、台账 127⊆171、实跑复查；允许残留=更名/升级/依赖历史文件）+ `audit:harness-docs` PASS——127/171 canonical reviewed、44 pending（新语料新增面待后续审查）；台账 `corpusRoot` 已指向新语料；产物 `.artifacts/dsh-0.1.6-alpha.2-upgrade/p5-doc-mirror-audit.{mjs,json}`。
- delta 复核（新语料 vs 本升级运行面）：① `maxActiveSubagents` 已入 config-catalog（部分收口；`ACTIVATION_LIMIT_REACHED` 术语仍未入镜像，以 `dsh-subagent` 包 README + V3 探针为准）；② `plugin-manager`/`sidebar-browser`/`workspace-changes` 关键词已覆盖（完全收口）；③ `sidebar-right.zh.md` L11 持久化表述仍与 V2 实测矛盾（保持差异记录，以发布包实测为准）；④ `plan.zh.md` 仍缺 client-ui-plan 评审 UI 覆盖（以 V1 实测为准）；⑤ `code-runtime`→`ptc-runtime` 更名（引用已同步）。
- 文档补记：升级证据文档新增「刷新执行」节；UPGRADE-PLAN §1/§10 补记；DOC-06 条目与升级条目补记（原「仍为 alpha.1 语料」边界解除）。

未执行/边界：44 份新增文档未逐份审查（台账 pending）；Typert Remote 生成器外部 workspace 兼容未重测（沿用既有结论）；`.artifacts` 内部旧路径引用不回溯改写；未提交、未推送、未发布 npm。

## 2026-09-18：项目任务创建语义确认（三项取舍落档）

代码评审指出升级批次的 `client.tsx` 相对 09-17 已记录行为改变了任务创建三项语义且未落档：旧——未选资产默认全量进入会话、技能以 `/技能ID` 前缀放消息开头、项目指令拼入消息体；新——资料仅显式勾选进入、技能与待办以 `@项目/<名称>` 引用文本提交、指令经官方 `system-prompt/assemble` 注入。核对官方锁定版公开面后确认保留新语义，并完成落档：

- 资料显式选择：与 PROJECT-DESIGN「不把整个库塞入提示词」一致；`set-task-selection` 本就是资料库的会话级显式选择通道，不提供全量回退。
- 技能引用记为已知降级：官方 `skills.zh.md` 中模型调用为 `skill({name})` 按需加载（`modelInvocable` 策略）、用户调用经官方 `/` 菜单、会话挂载由 preset 决定，无「任务创建时激活技能」的公开编程接口；`/技能ID` 前缀同样只是消息文本，不具备确定激活语义。项目技能绑定固定修订与展示，加载由运行时决定，待官方提供会话级激活能力后升级。
- 指令移出消息体：走公开注入通道（上下文名 `workdsh:project-task`），历史会话回放与导出不再含指令正文，指令修订固定为任务创建时捕获的 ProjectConfigRevision。

落档：PROJECT-DESIGN §3 新增第 7–9 条与 §5 的 ProjectTaskLink 写入时机（会话就绪后、首条消息发送前；会话未就绪不落任务、发送失败保留任务并提示重发）。回归探针按新语义执行，结果随本批修复记录统一登记。

## 2026-09-18：DSH 0.1.6-alpha.2 升级（依赖/编译/运行/新能力全流程 + 收口）

运行基线与全局精确锁定 alpha.1 → alpha.2：根 overrides/devDependencies、12 个功能包 + bundle 的 DSH 依赖、锁文件与脚本引用全量对齐；迁移 alpha.2 破坏性变化（Client Session 多实例化）影响的 6 个插件 client 文件；不改变业务功能范围；contracts 领域模型仅新增项目任务上下文只读契约（补记 α.9 bump，见 P5）。计划与逐项记录：[DSH-0.1.6-alpha.2-UPGRADE-PLAN.md](DSH-0.1.6-alpha.2-UPGRADE-PLAN.md)；命令/结果/未覆盖项：[升级证据](evidence/dsh-0.1.6-alpha.2-upgrade.md)。

- 依赖面（P1）：480 处替换（root 273 + 12 包 198 + scripts/tests 9）；新增 override 9 条（预判 8 + install 暴露 `@deepseek-ai/dsh-lazy-require`）；`check:versions` PASS（513 条锁文件条目全部 α2、Cordis 4.0.2）。
- 编译面（P2）：6 个 client 文件迁移——projects（startTask 改 retain(`workdshProjectTaskStart`)→ready→轮询 binding.ctx→send→finally release；openTask 改 `uiWorkspace.openSession`）、experts（`subagentAddress` 判成员 + 3 处 openSession）、skills/library（current 改 `retainedBy.mainView` 推导 + openSession）、office（current 推导 ×3）、activity（成员观测 retain(`workdshActivityMember`)→ready→release 重写）；B5 修复（`CsvDocument.tsx` 三变体显式收窄）；全仓 typecheck PASS（13 包）。
- 运行面（P3）：build + preview:install（clean env）+ 启动 PASS，数据完好（292 会话文件/项目 8 资产）；探针回归全过（chip 正反例、attribution、connectors、library、presets、office、team web 14 项）；startTask/openSession 专项 + 重开复核 v2 强断言 warm/warm2/cold 三次全过。attribution 一轮失败定性=探针历史槽位占满（`(2)~(5).md` 占满 NAME_ATTEMPTS=5 重试），非回归，探针已改动态文件名。
- 新能力（P4）：运行时卸载验证 `ctx.effect/provide/slot` 可完整撤销（禁用+重启完全卸载、启用+重启恰好一次恢复、无重复监听；UI 静默=官方行为，不改官方代码）；官方新页面实弹核对通过（右栏 Start 卡片与 WorkDSH「文档」卡片共存、Browser 页签、回合文件改动卡片→官方 `Review · turn 2` diff、子代理 lineage）；9 个 `workflow-worker-thread` 旧 preset（0.1.5 时代陈留）挂载失败定性为非 alpha.2 回归（活跃 ptc preset 会话实弹正常对照）；子代理默认值 `maxDepth=1`/`maxActiveSubagents=8` 与专家团 16 成员名册校验核对无冲突（16=名册容量 vs 8=活跃上限）；团队探针复跑全 PASS。
- 收口（P5）：8 包 bump（bundle α.46、projects α.2、experts α.5、skills α.30、library α.2、office α.7、activity α.4、contracts α.9〔补记 09-17 只读任务上下文契约〕）+ CHANGELOG 适配条目 + MODULE-VERSIONS 当前版本表同步；`AGENTS.md` 基线更新为 `@deepseek-ai/dsh@0.1.6-alpha.2`；`check:plan` PASS（29 模块/50 文档）。
- 复核补测（V1–V5，同日追加）：V1 计划预览官方 preview 实弹 PASS（`/plan` → chip → `exit_plan_mode` → 评审面板 → Approve → 右栏自动打开 plan tab → 刷新后计划卡片从历史恢复，0 pageerror）；V2 侧栏布局持久化专项 PASS（折叠/展开逐同刷新保持 + server 重启后恢复布局、plan tab 与卡片）；V3 `ACTIVATION_LIMIT_REACHED` 隔离确定性探针 PASS（8 个活跃 child → 第 9 次同步被拒 "active child limit: 8" → `drainContinuableChildren` 释放 1 槽 → 重试 admitted；与 α2 包 README 逐条吻合）；V4 worker-thread 旧 preset 复核完成（编译器只产 ptc + `resolveBasePreset` 硬性 standard；磁盘 16 preset 中 4 孤儿/0 brokenRef，保留只读不批量修复决定成立）；V5 文档镜像定界完成（375 文件/249 md 全为 2026-09-10 alpha.1 批次快照；三类 stale 抽检；刷新维持独立批次；2026-09-18 补记：刷新已执行，见顶部条目）。明细见证据文档「未覆盖项与边界」表与计划 §10 V 条目。

未执行/边界：worker-thread 旧 preset 保留只读（5 个专家当前修订仍引用，重新发布即转 ptc，属后续独立任务）；文档镜像当时仍为 alpha.1 语料（delta 已记账，刷新单独批次；2026-09-18 补记：独立刷新批次已执行，本条原「仍为」表述随之更新，见顶部条目）；README 面向已发布制品的 alpha.1 表述随下次发布批次更新；未提交、未推送、未发布 npm。

## 2026-09-17：项目任务会话顶栏项目 chip 与 present 交付自动归属

两项增量：①项目任务会话标题右侧显示「项目 / 项目名」chip，点击打开项目面板并聚焦该项目；②项目任务对话中模型按官方 present 语义交付的文件自动登记资料库（source=task、记录来源会话）并幂等关联为项目资产。全部走锁定版 `@deepseek-ai/dsh@0.1.6-alpha.1` 公开面，范围 `packages/plugins/projects`（0.1.0-alpha.1，Unreleased）与 contracts 只读任务上下文契约补全（`ProjectTaskContext`/`taskContext`）；当时未同步 contracts 版本线，2026-09-18 补记 bump `0.1.0-alpha.9`，本条原「未改 contracts」表述随之修正。未改 library/ui/bundle。

- chip：经官方槽 `conversation.session.header.actions` 注册（`order:-20`，紧跟标题，与同排官方 chip 齐平）；文案「项目 / 项目名」，非项目会话零渲染；点击走 `?project=` URL 恢复 + 模块级 focus 通道双保险，打开并聚焦项目面板。视觉与官方 chip 同型（22px 高、6px 圆角、12px 字号、`--dsw-alias-fill-tsp-secondary`），保留键盘焦点环，长名称省略（max-width 180px + ellipsis）。
- 交付归属：Host 新增 `deliverable-attribution.ts`——订阅官方 `session/event` 的 `deliverables/presented`（present 工具成功后的官方交付信号），经 `identity.resolve` → `projects.taskContext` 判定项目任务会话（非项目/子代理整体跳过），`ctx.fs` 读文件后 `library.importAsset(source:'task', sourceTaskId:会话)`，名称冲突自动 ` (n)` 后缀重试（≤5 次），成功后幂等 `addAsset` 关联项目资产；失败仅 warn、无假成功、不写第二状态。新增一个只读 RPC 端点 `task-context` 与 client management 方法；归因子插件静态 inject（`fs`/`workdshLibrary`/`workdshProjects`/`workdshIdentity`），缺失依赖时单独 PENDING，不影响其余能力。
- 文档：projects CHANGELOG Unreleased 两条；PROJECT-DESIGN §2/§3 补 chip 行为与交付归属语义边界；modules.json 补 `src/client/components/project-lineage`；证据 [D07 项目路径 chip 与交付归属](evidence/d07-projects-lineage-attribution.md)。

验证：项目插件 typecheck/build/test 9/9（含归因纯函数 6 项新用例：跳过/字段/后缀/隔离/去重/幂等）、全仓 `pnpm typecheck` 退出 0、check:plan PASS（29 模块/50 文档）。真实预览 18989 三支探针全绿：chip 正反例 `verify.json` 21/21（文案/位置/键盘焦点/点击聚焦 URL+面板、1440/1920/390 无视口溢出且 chip 保持、专家/blank/draft 会话零 chip）；真实模型 present 归因 `attribution.json` 11/11（`project-deliverable-check.md` 出现在项目资产与资料库，source=task、sourceTaskId 精确匹配，任务行/活动记录/选择器回归全过）；反例 `negatives.json` 12/12、failures 空（手工资产增删复原、预置冲突名→ ` (2)` 后缀落库、zip present 后确定性跳过 approvals 0 且零假资产零库节点、子代理会话真实 emit present 而项目零泄漏）。截图 `.artifacts/project-lineage/verify-0*.png`、`attribution-0*.png`、`negative-0*.png`；全程 pageerror/console error 0。

UI-DESIGN §8 记录：chip 属插件内局部 UI，不新增公共组件；视觉对照与官方 chip 同型（22px/6px/12px 实测）；交互验证键盘焦点保留、长名称省略（180px+ellipsis）、390 视口无溢出；未完成项：超长项目名专项截图、深色主题对照未做。

未执行/边界：不提交、不推送、不发布 npm；重启/HMR 不补历史归因（官方 constructor seeds do not emit）；归因失败 warn 落 cordis 内存 ring buffer，本仓预览 profile 无落盘 exporter，无法从日志文件核对（已由单测 + 行为链断言替代）；重复交付同名文件超 5 次触顶跳过为计划内上限；「同资产新修订」需 library 新公开方法，另立项。人工复验需用新 token URL 打开 18989。

## 2026-09-17：项目任务对话改走官方会话导航（第二套对话管线退役）

用户指出项目任务视图的对话“不对”（对照 WorkBuddy 截图），并明确“不仅仅是 UI，是逻辑”。真实预览对照探针证实：该视图运行第二套会话管线——自定义 feed 只把消息扁平化成纯文本（无思考块、轨迹、用量、操作栏），假 composer（textarea+➤，无 @/附件/模型/队列/权限），自定义运行态判断（“正在项目中处理…”/“该任务还没有消息记录”）；同一 Session 经侧栏打开则完整渲染。处理：任务=原生 Session，打开任务走官方会话导航。

- `client.tsx`：`openTask(sessionId, onFailed?)` 重写为官方导航 `sessions.open(sessionId)` + `ctx.layout.selectPanel(null)`（与官方 ui-workspace `openSession` 等价；保留 25×200ms 重试）；删除 `conversationSource`/`sendTask`、`uiConversation` 注入与注册参数；`startTask` 不再切回项目面板。
- `ProjectsPanel.tsx`：删除 `ProjectConversationHost`、`ProjectConversation` 自定义渲染器与 `activeSession` 状态、假 composer；`syncUrl` 只保留 `?project=` 并清理历史 `?task=`；任务行与新建任务均经 `openTask` 进入官方会话，失败时面板内提示。
- `styles.ts`：删除 `.wd-p-main-conversation`、`.wd-p-project-conversation`、`.wd-p-conversation-*`、`.wd-p-message`、`.wd-p-running`、`.wd-p-run-context` 等对话专用规则。
- 文档：PROJECT-DESIGN 任务条目（§2、§7.1.2、§7.1.3）同步“打开任务=官方会话界面，不进入项目内嵌对话”；CHANGELOG Unreleased 记录。

验证（真实预览 18989，headless 浏览器 + 真实模型）：before 对照 `.artifacts/project-task-probe.mjs`（`comparison.json`：自定义视图仅扁平文本 6 条，原生视图含 Thought/Usage/Ran for）；after `.artifacts/project-task-verify.mjs`：打开已有任务 → `workdsh-view=conversation`、自定义渲染器与 feed 计数 0、原生 composer 存在、消息文本完整渲染；返回 → `?project=` 恢复“项目 / Host持久化验证”详情；从项目输入区创建“只回复：ok” → 自动进入原生会话、真实模型回复 ok、用量/成本统计与连接器 chip（测试 ERP 系统）生效；浏览器 pageerror/console error 0。截图 `05-task-native.png`、`06-return.png`、`07-create-task.png`，报告 `.artifacts/project-task/verify.json`。构建（contracts+tsc+build-projects）通过；`preview:install` 逐字节校验后重启 18989。

未执行/边界：返回路径的任务列表刷新依赖项目快照重取，未单独测试面板不卸载场景；历史遗留空任务（linkTask 成功但 send 未发出）打开后是原生空会话，未清理；未提交、未推送、未发布 npm。人工复验需用新 token URL 打开 18989。

## 2026-09-17：隐藏未实现的侧栏入口（助理/定时任务/更多）

用户看到左侧「助理」「定时任务」「更多」进入的只是“当前模块尚未接入领域数据”占位页，要求先隐藏未实现的功能。处理：workbench 0.1.0-alpha.10→0.1.0-alpha.11，`businessPanels` 增加 `pending` 标记（助理/定时任务/更多 为 true），`harness/client.ts` 对 pending 面板不再注册 `sidebar.panellist` 入口和占位 main 页；项目、专家 · 技能 · 连接器、资料库保持。UI-DESIGN 左侧导航一节与 workbench CHANGELOG 同步记录；probe-browser 断言更新为三项隐藏、三项可见。

验证：bundle build（含 workbench 与客户端重打包）与 workbench typecheck 通过，bundle dist/client.js 确认含 pending 跳过且占位页组件已被剔除；`preview:install`（逐字节校验）后重启 18989，headless 浏览器实测：项目/专家 · 技能 · 连接器/资料库 各 1 个入口可见，助理/定时任务/更多 均为 0，无浏览器错误；截图与 result.json 位于 `.artifacts/sidebar-hide/`（脚本 `.artifacts/sidebar-hide-check.mjs`）。check:plan 通过（29 模块/50 文档）。

未执行/边界：probe-browser.mjs 完整探针本轮未重跑（仅同步断言）；未提交、未推送、未发布 npm。实现后恢复：把对应面板 `pending` 置 false 并接入真实 main 页。

## 2026-09-17：CSV 表格预览与单元格网格线（office alpha.6）

用户两轮反馈：右侧面板打开 CSV 只有溢出纯文本；出现表格后单元格没有框线。实现：CSV 渲染器 `src/csv/CsvDocument.tsx` 与 `csv.css`（表头/行号、单元格网格线四边 1px、冻结表头与行号列、数字右对齐、超长省略悬停），解析经用户选定换用 PapaParse 5.7.0（MIT），字节解码与 1500 行/120 列/24000 单元格上限为自有实现；注册走官方 `ctx.documentPreviews` 与 `sidebar.right.tab.document`，不新增 Tab kind、传输或状态真源，未知扩展继续回退官方纯文本。office 升 0.1.0-alpha.6（未发布）。

验证：解析单测与浏览器渲染测试 2/2、office typecheck/build 通过；alpha.6 经 `preview:install`（逐字节校验）装入 preview Profile 并重启 18989；headless 浏览器 token 登录打开用户文件 `/Users/techflag/project/vipshop/2021040501_可导入数据.csv`，面板 Tab、`region "CSV 表格预览"`、表头 `lineNo`、状态栏 `UTF-8 · 逗号分隔 · 10 列 × 2 行` 与单元格/行号/表头计算边框均 1px 全部断言通过，无浏览器错误；证据 `.artifacts/preview-csv/04-table.png` 与 result.json（脚本 `.artifacts/preview-csv-verify.mjs`，本轮修正了交付卡 Open 按钮选择器）。许可：papaparse MIT 全文随构建自动收集，不在缺文本清单。

未执行/边界：原生 Files Tab 探针（probe-office-native 的 CSV 分支）仍被隔离探针环境 create-execution workspaceId 分支阻塞，待重跑（2026-09-19 补记：已重跑通过，缺陷链见顶部条目）；AI-EDITING 指南无 CSV 条目（只读预览不属于八类 AI 编辑范围），未改；未提交、未推送、未发布 npm。人工复验需用新 token URL 打开 18989。

## 2026-09-17：录入减负演示包（用户导入/创建路径实测）

为客户演示制作「录入减负智能体」全套可导入/可创建制品，全部位于 `.artifacts/entry-demo/`，未修改 packages/ 下任何插件、内置 skill/专家/连接器代码与种子。制品：3 个技能包（workdsh-entry-extract 单据信息提取、workdsh-entry-validate 数据校验清洗、workdsh-entry-export 结构化输出与系统对接，各含 references 规则表与 zip）；4 个专家包（采购/质检/生产/财务单据录入专家，workdsh-expert schemaVersion 1，manifest 含 sha256，skillRequirements 引用上述 3 技能，futureRequirements 声明可选连接器需求）；2 个测试 MCP stdio 服务器（workdsh-erp-test 4 工具、workdsh-mes-test 3 工具，内存数据+种子行）；样单（送货单含 -50 数量阻断异常行、质检报告）与演示手册 README.md。模型共用官方底座，图片理解走官方模型视觉能力；自学习诚实表述为「字段映射模板沉淀 + 专家修订」，未宣称自动微调。

预览 Profile（18989）按用户路径实测：技能页导入 3 个 zip 预检通过并启用；专家页导入 4 个 zip 预检通过（sha256 摘要、3 项技能依赖显示正确）、发布校验通过（技能固定修订 rev-98b708a9/rev-a511e72c/rev-f914231f）、发布成功（采购 rev-749f1f977d05、质检 rev-4346ea4aa2c9、生产 rev-b73352bd4b13、财务 rev-7e365129c665），详情页显示技能配备与连接器需求；连接器页新建「测试 ERP 系统」「测试 MES 系统」stdio 连接器，健康检查 ready、工具名正确（mcp__workdsh-erp-test__query_purchase_orders 等）。会话链路全通：召唤采购录入专家→加载 3 技能与字段映射表→提取（字段/依据/置信度）→校验（日期清洗 2026年9月17日→2026-09-17，第 2 行 -50 标记 quantity-non-negative 阻断）→writable=false 停下人工确认→用户选择「第 2 行暂挂，先回写第 1 行」→展示待写入数据并经批准后调用 mcp__workdsh-erp-test__create_receive_order 回写（返回 GRN20260917002）→query_receive_orders 读回核对 7/7 字段一致→生成 DN20260917002_录入结果.json/.csv 交付物。写入工具仅在用户批准后调用，此前的查重查询为只读调用。

未执行/边界：真实企业 ERP/MES API 对接（测试服务器为内存模拟）、私有化部署路线、真实 OCR 服务（使用官方模型视觉能力）、模型微调；本次未发布 npm、未改版本号，演示制品不入仓库发布。

## 2026-09-17：项目任务会话修复（历史消息、空态与刷新恢复）

按 [项目任务会话交接](PROJECT-CONVERSATION-HANDOFF.md) 修复项目内任务视图的三个运行时 bug，并完成 preview 运行时验证。根因链：仅 `ctx.uiConversation.binding(sessionId)` 不足以让未打开的历史 Session 组装 Chat snapshot，必须由 Session Controller `sessions.open()`（内部 `manager.select` → 事件窗口拉取）先打开该 Session。另两个衍生问题：发送失败遗留的空任务误显“正在项目中处理…”，以及刷新后任务视图丢失（`activeSession` 是纯组件 state）。

- `client.tsx`：`openTask(sessionId, onReady?, onFailed?)` 保留 25×200ms 重试（刷新后 session list 尚未拉取时 `sessions.open` 会抛 `unknown session`）；`conversationSource` 继续经 `ctx.uiConversation.binding`。
- `ProjectsPanel.tsx`：新增 URL 持久化 `?workdsh-view=projects&project=<id>&task=<sessionId>`（`replaceState`，与官方 NavigationLocation 不冲突），面板挂载时恢复项目/任务并调用 `openTask`，成功后才切换视图、失败则清除 task 参数并提示；新增 `ProjectConversationHost`：binding 调用包 try/catch，会话尚未列入客户端列表时显示“正在载入任务会话…”并在 session list 更新后自动重试，不再整面板 crash（修复前会触发 `uiConversation.binding: unknown session` 并 crash slot entry）。
- 空态改为读取官方 `SessionSummary.running`/`blank`：不再误报运行中；空任务显示“该任务还没有消息记录…”，仍可发送第一条消息。

运行时验证（Playwright + preview 18989）：11 个任务中 3 个有消息任务正确显示 user/assistant（1/1、1/6、1/2）；8 个空任务全部显示诚实空态且 running-hint=0；打开任务 URL 带 `task`、返回保留 `project`、回列表清空，无漂移；刷新恢复 `inside=1 user=1 assistant=1`，控制台 pageerror/console error 为 0。检查：项目插件测试 3/3、集成测试 108/108、`pnpm typecheck` 退出 0、check:plan 通过（29 模块/50 文档）、`git diff --check` 干净。脚本 `.artifacts/verify-project-task-fix.mjs`，截图 `verify-project-task-messages.png`、`verify-project-task-empty.png`、`verify-project-task-reload.png`（忽略文件）。

未完成/未执行：孤儿任务生命周期标记（交接 #6）、原生引用芯片（#3）、新任务全链路 prompt assembly 验证（#2）；真实模型任务本轮未执行。preview 已重装重启供人工复验；未提交/推送/发布。（本条目的自定义渲染管线已于当日后续条目“项目任务对话改走官方会话导航”中整体退役，保留为历史修复记录。）

## 2026-09-16：专家团长任务、交接、重连与失败恢复验收

新增 `probe:experts:team:resilience` 与显式 `probe:experts:team:real` 发布验收入口。探针把 identity、audit、access、skills、experts、bundle、activity 七个正式包打包并经官方 CLI 安装到仓库外临时 Profile，使用生产 Host、官方 Agent Teams 服务/工具/Web Client 和真实 Chromium。resilience 模式用本地确定性适配器固定等待、中断和一次成员失败；real 模式另建独立执行，使用 `deepseek-official/deepseek-flash` 的真实 lead 与两名真实成员。

六条场景已通过：20 秒成员长任务在两次完整浏览器连接间保持同一成员和 `in_progress` 任务归属；人工停止产生 `aborted` 终态但保留原成员和任务，恢复消息由同一成员继续；任务经官方 reassign 和持久消息从分析成员交给复核成员；失败回合没有错误完成任务，活动条明确显示“本轮未完成”；Host 冷重启后同一成员 ID、任务及所有权恢复且没有重复成员；真实 lead 创建 `REAL-ANALYZE` / `REAL-REVIEW`，通过官方消息、`wait_agent` 与状态读取完成 analyst→reviewer 两阶段交接，两名成员 Session 均新增完成回合。官方成员回合结束后会释放激活实例，因此由 lead 对仍归属于预期成员的任务执行最终签收，探针没有增加自有团队运行表。

真实模式结果为 16 项检查通过、浏览器 pageerror 为 0；活动投影单测为 14/14。结构化回执和截图位于 `.artifacts/dsh-0.1.6-upgrade/native-team-web/`，判定边界见 [专家团韧性验收](evidence/expert-team-resilience.md)。真实密钥只复制到一次性 DSH Home 的凭据引用，退出时删除，命令参数、报告与脱敏日志不含密钥。本次未部署用户 preview，也未运行官方 fork 成员浏览器历史；不将有界真实交接或 20 秒确定性长任务写成小时级专业业务稳定性。

## 2026-09-16：PPT 原生画布坐标修正

用户实际 16:9 演示稿在右侧编辑器中集中于左上区域。根因不是页面 CSS 对齐，而是 AI 按 PowerPoint 的 960×540 point 页面尺寸写入几何坐标，原生 `pptx-viewer-core` 编辑器实际使用 1280×720 CSS pixel 画布；Office 能力和文档状态此前没有暴露权威画布尺寸，新建页也沿用了 960 宽度尺度。

原生演示稿状态现保存 `state.deck.canvas`，新建 16:9 文档为 1280×720 css-px，导入模板读取模板自身尺寸；`content_capabilities`、工具 schema 和写作指南明确几何坐标使用 CSS pixel，`textStyle.fontSize` 仍使用 point。插入或替换页面时校验所有带几何信息的元素完整、有限、正尺寸且不越界。新建文档的首个标题页按 1280×720 布局初始化。浏览器人工保存后也会持久化重新解析得到的画布尺寸。

现有 10 页预算演示稿已通过同一 Office 内容服务逐页迁移，仅将 x/y/width/height 及对应 EMU 几何值按 4/3 等比换算，文字字号和图表数据保持原值；文档修订从 11 到 21，保存画布为 1280×720。LibreOffice 实际渲染 10 页通过，重点抽查第 1、6、8 页，压力情景页已使用主要横向空间且文本完整；另生成布局修正版 PPTX 供文件交付。Office typecheck 与内容集成测试 21/21 通过，Preview 重装并重启，18989 返回认证保护的 HTTP 401。启动时既有错误连接器仍会独立报告缺失 `sd` 模块，不影响 Web 服务。

## 2026-09-15：真实网页购物任务截图进入 README

用户在 WorkDSH 真实任务中要求打开京东购买方便面；运行过程已打开京东并取得搜索结果，在用户选品后将指定商品加入购物车，随后把结构化执行结果与真实购物车截图放在同一任务中，并停在结算之前。中英文 README 使用该真实 WorkDSH 画面替换此前仍在运行、未展示业务结果的浏览器截图，文案只声明截图实际证明的“搜索、加入购物车、证据与结算前人工控制”，不宣称已购买或完成支付。

本次截图中的执行标签为 Web Access（浏览器自动化），因此它不替代官方 Computer Use/Playwright MCP 的独立验收证据；官方原生 Computer Use 的截图、桌面感知与可见 Chrome 操作仍按专项证据分别记录。未修改网页执行代码，未触发结算或支付。中英文图片引用、git diff 与规划链接检查通过。

## 2026-09-15：DSH 0.1.6 官方 Team 已公开发布

本批公开版本为 experts alpha.3、skills alpha.29、activity alpha.2、office alpha.5、bundle alpha.42；配套 identity-local alpha.5、audit alpha.4、access alpha.5。自建专家团执行器已移除，已发布旧团队在下次调用时升级为新的官方 Team 执行修订，历史修订保持不可变。

源码提交 `bbda262fd0f7d3332d1a9a864d24e0114b2dc811` 与 5 个模块 tag 已推送，5 个 GitHub prerelease、23 个附件已公开；无认证回读全部 HTTP 200，内容与本地制品 SHA-256 一致。发布门槛通过 build、typecheck、integration 102/102、activity 9/9、check:versions、check:plan、P0 acceptance、官方 Team 生产探针和真实 Web 提示词核对。P1 长期台账 52 项继续保留；官方 fork 历史查询缺陷、跨平台、60 分钟资源收敛与 Office 10 项许可证正文缺口写入 alpha 边界。发布说明见 [2026-09-15 DSH 0.1.6 alpha](releases/2026-09-15-dsh-0.1.6-alpha.1.md)。

## 2026-09-15：官方 Team 替换已实现并完成隔离验证

已移除自建 TeamRunsManager、SOP 运行状态机/团队运行表、workdsh_expert_team_* 工具和 workdsh-expert 委派 provider。正式插件通过 patch 装配 0.1.6-alpha.1 官方 Team 服务、九项工具和官方 Web Client；构建先清理 dist，候选 tgz 无旧执行器。专家作品、成员与技能固定修订、授权和历史保留为资产；公开 agent/created / pre-step 将对应 Persona/Skill Filesystem 挂在官方成员作用域，不创建自有子任务运行表。旧委派记录保留但不续跑旧调度器，需重新召唤官方 Team 任务。

生产插件真实 Loader/AgentLoop/Team 测试 9/9，独立进程恢复子检查 2/2：两成员并行、各自角色/实际技能读取、fresh/fork、未知成员与跨主体/组织拒绝、官方任务依赖与 CAS、模型调用 spawn_teammate、中断及原成员 ID 冷恢复均通过。七个独立包通过官方 CLI 安装到仓库外 Web Profile，7/7 检查通过：真实生产 Host 的 spawn/skill 工具经过 Access 桥、官方成员/任务面板、浏览器实际新增任务、打开成员会话、冷重启保持成员与任务；无 pageerror，旧团队活动条不再显示。仅模型 I/O 使用确定性夹具，未使用付费模型。

回归：根 build、typecheck、integration 101/101、activity 9/9、frozen install、check:versions（483 个 DSH 锁定条目均为 0.1.6-alpha.1，Cordis 仅 4.0.2）、check:plan（29 模块/50 文档）通过。旧执行器专属测试随删除实现退役，因此 integration 数量由前一阶段 124 调整为 101，并以真实官方运行与独立 Web 探针补充。git diff --check 通过。

证据：`.artifacts/dsh-0.1.6-upgrade/native-expert-team/result.json`、`cold-result.json`、`native-team-web/result.json`；截图为 `native-team-web/official-team.png`、`official-member.png`、`official-team-cold.png`；命令日志同目录，最终候选包在 `final-pack/`。迁移决策和边界见专家插件 README、ADR-0033。

独立限制：纯官方默认及角色组合均复现 fork 的 sessionQuery 读取错误 `seeded session constructor seed must equal its inherited prefix`；公共持久化读取和 fork 队友继续执行已通过，不能据此承诺分叉 Web 历史正常。默认 fresh 成员的完整 Web 链路已通过。后续处理官方分叉查询、真实模型专业成果与升级计划其余官方新能力；不恢复旧执行器，不把上述检查写成 D04/D11 或整个升级全部验收。

未执行：用户 preview 部署/重启、用户旧数据迁移演练、付费模型业务、完整热卸载、企业远程多人、提交/推送/发布。用户运行环境保持原状。

## 2026-09-15：官方 Team 替换自有专家团（用户明确授权）

用户要求直接废弃自有专家团执行实现。当前专项改为：移除 TeamRunsManager、SOP 运行状态机、workdsh_expert_team_* 工具和 workdsh-expert one-shot provider；以 0.1.6-alpha.1 官方 Agent Teams、九项工具及官方 Web 团队面板实现。角色/技能/WorkBuddy 导入和已发布专家内容保留为资产配置，协作场景作为工作指导，运行事实仅由官方 Session 日志和 Team 拥有。旧运行数据保留原地，不再续跑旧调度器；新任务使用官方 Team。公开查询缺陷单独实测和修复，不再作为保留旧执行器的理由。

复用：发布包 @deepseek-ai/dsh-experimental-agent-team、dsh-experimental-tool-agent-team、dsh-experimental-client-ui-agent-team；公开 agent/created、agentTeams.tryMembership 和 Agent 局部 persona/skill-filesystem 组合。已有 V1 证据包含并行、角色/技能隔离、fresh/fork、未知成员拒绝、中断和冷恢复；本次必须补生产插件测试，不能用独立探针替代。保持原有资产授权，禁止复制上游实现或增加团队运行表。未验收完整真实模型业务，不对其宣称完成。

## 2026-09-15 — 专家实现缩减与官方 Team 局部组合实测

用户确认优先用官方能力替换专家实现。更新专项计划与 PLAN：不预设保留整套 ExpertsManager/preset 编译器/协作服务，保留用户作品与历史，按必要差异评估导入、授权和专业验收。新增 [官方专家组合探针](../scripts/probe-official-expert-composition.mjs) 与 `probe:experts:official` 命令；使用精确 0.1.6-alpha.1 的官方发布包，不加载 WorkDSH 专家服务或旧执行 Guard。

真实 Loader/AgentLoop/Team/Skill/persistence、确定性模型的实测表明：默认队友无需旧 binding 可运行；通过公开 `agent/created`、`tryMembership` 和 `agent.ctx.plugin()` 的 Persona/Skill Filesystem 局部挂载，两名原生队友同时 running，首请求角色和实际读取技能分别正确，父级/兄弟目录未污染。fresh/fork、初始化失败不发请求、官方中断、关闭 runtime 和独立进程通过消息唤醒原队友均已跑到；冷恢复包含原 fresh 与 fork Session ID 的实际新回合。`agent.ctx.loader.create()` 的 Persona 重复注册、把 Context 当 Skill scope 及错误恢复参数均属于探针调用问题，已按公开契约修正后复测。

主流程 9 项、冷进程 3 项断言通过；但官方 `sessionQuery.readSession` 的分叉历史读取在默认组合、局部专家组合和冷恢复中仍报 inherited prefix 错误，总结果明确 partial、退出 2。公开 persistence 读取可用，探针据此继续其他断言，没有把查询失败计为通过。完整 Web Profile 与进一步公开查询方案尚未验证。旧专家 baseline 也已在 0.1.6 复跑，确认旧 binding Guard 阻止默认子代理，不能据此说官方不能运行专家。详见[证据](evidence/dsh-0.1.6-official-integration.md)及 .artifacts/dsh-0.1.6-upgrade/official-expert-composition/。

本轮修改的是探针、命令与迁移计划，生产专家实现尚未切换，用户 preview 未部署重启。下一步验证用户作品/固定修订到官方局部配置的关联、官方工具 Guard 与专业签收，继续定位分叉历史查询与 U16-2 回归。真实模型、用户数据迁移、资源权限、热卸载、Web UI 与整体升级验收未执行；不删除仍在使用的旧路径，不标记 D04/TM-01 完成。

## 2026-09-15 — 升级范围补齐官方新能力接入

按用户要求，DSH 0.1.6 升级交付同时包含现有功能回归与官方新能力落地。更新[专项计划](DSH-0.1.6-UPGRADE-PLAN.md)及 PLAN，列出 U16-F01—F12：会话工作区、官方 Team、浏览器操作、电脑操作、MCP 资源、SSH 工作区、Headless、自动审核、长任务/PTC、图片与 Messages、可见过程与重连、插件配置恢复。每项均明确官方所有者、WorkDSH 接入责任、实际任务和失败路径验收；V4 最小接点验证不再等同于产品交付。外部环境未就绪保持待办，不静默删功能；保留用户配置和权限。

核对已发布 0.1.6-alpha.1 的 web-app/base patch、MCP Resources 与 agent-presets README：官方已声明终端、归档、预览、资源工具与公开组合查询。WorkDSH 安装脚本不会重新初始化已有 Profile，旧专家保存的 preset 也须单独迁移验证。四个公开来源的版本/声明及摘要回执见 .artifacts/dsh-0.1.6-upgrade/official-feature-inventory.json，新增[证据记录](evidence/dsh-0.1.6-official-integration.md)。这里只确认公开声明和工程组合方式，不代表最终配置已启用或功能运行通过。

check:plan 通过（29 模块/50 文档）；12 个独立工作项、三份计划/证据文档的本地引用与空白检查、git diff --check 通过。本轮只更新计划与证据，未执行新增功能运行探针、类型检查、构建、模型任务、部署、重启或发布。F01—F12 待产品验收，下一步继续 U16-2 旧数据/协议/长任务回归及必要适配，再按计划批次推进 U16-3。上一轮隔离升级回归结果保持，D04/TM-01 仍未整体验收。

## 2026-09-15 — 升级顺序调整：先运行再修复适配

按用户最新方向，先在隔离环境升级 DSH 0.1.6-alpha.1，沿用已有业务组合执行类型、构建、安装启动和功能回归，依据真实失败修复。官方 Team 迁移与新增能力验证在升级后的环境继续，不将完整迁移设计作为升级底座前置；原有业务验收与权限不放宽。用户正在使用的 preview 不安装、不重启。

已建立 codex/dsh-0.1.6-upgrade 分支并保存原有差异。frozen-lockfile 安装、475 项版本锁定、全工程类型和构建通过。首轮 integration 112/123，11 项失败定位到新版官方 Skill path 已规范为真实路径，/var 与 /private/var 别名被原字符串比较误判为不可管理，影响技能编辑/启停/卸载及专家发布冻结。修正 skills/src/services/manager.ts：受管目录与 symlink 检查后对比真实文件身份；同名外部技能仍只读，不能误操作本地副本。新增实际 provider 的别名/重名来源回归，修复后 integration 124/124、activity 9/9、技能 build/typecheck 通过。

七层官方 Web Profile 工程外安装、Host 鉴权、专家原生 Session 固定绑定、DOCX/PPTX/XLSX 原生 Tab 共 6 项通过、浏览器错误 0；现有 --team 确定性协作 10/10、14 个原生子 Session 与实际文件验收通过；修复后的技能独立包浏览器与冷移除/重装 8 项通过。两个隔离 Profile 的 agent/session/skill/skill-filesystem/client-connection 均解析为 0.1.6-alpha.1。证据见 [隔离升级与适配记录](evidence/dsh-0.1.6-official-integration.md)，原始日志、机器汇总及截图位于 .artifacts/dsh-0.1.6-upgrade/20260915-154820/。规划检查 29 模块/50 文档及 git diff --check 通过。

下一步继续 U16-2 的真实旧数据/协议/长任务回归，再进入 U16-3 官方新增能力与 Team 替换。当前通过的是原有协作在新底座运行，V1—V3 官方 Team 替换、V4 全部新能力、付费模型、实际用户数据升级/回退和长时间资源检查未执行。用户 preview 未部署重启，未提交/推送/公开发布；D04/TM-01 保持未整体验收。

## 2026-09-15 — DSH 0.1.6 升级计划复审与验证前置

新增 [DSH 0.1.6 升级计划](DSH-0.1.6-UPGRADE-PLAN.md)，以用户最新要求覆盖早期对话方案：不等 RC、公开预览版、官方运行与自有业务展示；“未找到官方接点”只表示待验证，不直接认定不可实现或删减功能。首要工作是隔离复跑旧 A/B 专家绑定失败场景，并验证默认组合、官方配置及公开 Provider/生命周期/Guard 接点，随后验证技能快照、SOP专业验收、冷恢复和实际 UI。新路径未通过前不删除既有执行适配或业务校验。

计划同时补齐旧 Profile/preset 兼容修订、数据备份与回退演练、Messages/Files API/事件上报配置、不同运行面实验能力的实际条件，以及公开制品回读验证。上轮试升级变更仍未提交；此前版本检查、类型检查、构建通过不代表 0.1.6 功能验收。D04/TM-01 完成状态不变；下一执行项 U16-0 → U16-V1。

上述计划复审已通过 check:plan（29 模块、50 文档）与 git diff --check；当时未执行新运行探针、真实模型、安装包验收、部署、重启、提交与发布。

## 2026-09-15 — README 特色复核与 Office 路线归位

重新检查中英文 README 的产品表达：首屏明确 WorkDSH 是面向 DeepSeek Harness 的独立开源 WorkBuddy 式工作台，并说明并非 WorkBuddy 官方开源版本。特色表突出任务—可见过程—人工介入—可编辑成果闭环、真实文件交付、人与 AI 实时共编、带资源和固定修订的专业能力、可见的专家团队过程、Harness 原生工作流和独立插件交付，同时保留 TM-01 未整体验收等边界。下载区补齐当前五个公开模块，修正 Office alpha.3/alpha.4 和 Word-only 旧描述，英文入口移除重复中文段落；顶部导航同时提供 GitHub Releases 与 `https://gitee.com/techflag/workdsh` 国内镜像。删除开发文档区中孤立且已经过时的“PPT 实时制作 → 其他六类”说明，在 README 路线表补充 Office 0.1，并由 `docs/ROADMAP.md` 统一记录当前公开版本、PPT 开发重点、Word 扩展暂停和真实文件/独立插件生命周期验收要求。`docs/design/office/NEXT-STAGE.md` 仅作为历史阶段与实现记录。此次只修改文档，不改变运行能力、安装包或验收状态。

## 2026-09-15 — README 产品首屏重构

对照 OpenWorkBuddy 公开 README 后，重构中英文入口的前半部分：首屏先说明“交付真实成果”的定位，以用户真实 HTML 看板截图和一条可直接试用的任务展示闭环，再给出 PPT、表格、技能、专家团的需求—过程—成果映射及三组真实产品截图。版本矩阵、架构、许可与验收边界保留在后半部分；同步清理中文 README 的 skills alpha.24 / bundle alpha.39 旧安装示例。没有照抄对方文案或功能宣称，未将 TM-01、任意 Office 保真和多平台验收写成已完成。

本轮仅修改 `README.md`、`README.zh-CN.md` 与状态记录；未修改运行代码、未重新打包、未部署或重启。README 重构已随提交 `e98e29a` 推送至 `origin/main`；`scripts/desktop/` 继续保持本地未跟踪，未纳入本次提交。

## 2026-09-15 — 发布候选清理与打包修复

清理默认 lefthook 样例和 Python 缓存，并为后续缓存增加忽略规则；保留有意新增的 `scripts/desktop/`，该目录不纳入本批 Web 发布范围。根锁定补齐 `@deepseek-ai/dsh-client-store@0.1.5-rc.1`，三个已漂移的浏览器探针按当前技能、专家和 Office UI 修正。Office 原生探针改为可在干净隔离 Home 首次安装的 `--prefer-offline`，仅显式允许 protobufjs 构建脚本；新鲜 Profile 的 DOCX/XLSX/PPTX 打开验证通过。

候选版本更新为 contracts alpha.8、ui alpha.6、skills alpha.29、experts alpha.3、office alpha.5、bundle alpha.42。Node 22.23.2 下 typecheck、build、123 项 integration、技能完整安装生命周期、专家 13 项与两次冷启动、Office 浏览器探针及完整七层原生 Profile 探针全部通过；版本锁定检查为 465 项 Harness 依赖均为 0.1.5-rc.1、Cordis 仅 4.0.2，规划检查 29 模块/50 文档通过，技能质量 3/3 和六个内置技能目录安全审计通过（仅入口长度建议）。

修复过时的 `release:office:pack`：不再构建 Word-only alpha.2，而是生成当前完整 alpha.5 Office 候选，保留 PPT/Excel 等依赖和多格式 release-scope。tgz 内嵌精确依赖清单、已收集许可文本与原始缺项报告；发布清单如实记录 10 项未收集文本、`licenseTextsComplete:false`，以及 `@univerjs/telemetry@0.25.1` 无声明许可证元数据。根 README 和 Office notice 同步披露，按用户决定不作为本次预览发行阻塞，但不宣称许可证收集完成。

源码提交 `b4f5309` 已快进推送到 `origin/main`；`scripts/desktop/` 保持本地未跟踪且未进入提交。没有创建 GitHub Release、发布 npm、部署或重启 preview。真实模型完整长任务、TM-01 整体验收和多平台验收仍未完成，不能据此宣称整套系统完成。

已生成六个当前源码候选 tgz（contracts alpha.8、ui alpha.6、skills alpha.29、experts alpha.3、office alpha.5、bundle alpha.42）及统一 SHA256/机器清单，位于忽略目录 `.artifacts/release-candidate-2026-09-15/`。逐包读取 package.json、摘要复核通过；技能包不含 Python 缓存，专家包不再携带旧 `expert-manager` 空目录。候选附件不等于已经完成公开发行。

## 2026-09-14 — 长任务修复已部署重启

用户授权重启。停止旧preview后通过官方preview:install更新插件，Office Host/Client安装入口与最新构建逐字节一致。重启launcher PID22686，直接本地HTTP返回401（认证保护正常），启动日志未发现EMFILE、without inject、端口冲突、堆溢出或模块缺失。本次包含大文件分块导出与图片临时引用重绑定修复；真实模型任务再次导出的完整验收未执行，历史EMFILE根因不据此宣称已解决。

## 2026-09-14 — 长任务 PPT 导出与文件膨胀代码修复

用户提供577条会话记录：最终保存30页、revision22；7次content_export中出现超过8MiB和写入失败，最后turn/end为user aborted。实际1750695字节文件用单参数Node命令复现errno7 Argument list too long；所有格式大于96KiB改分块官方bash写入，保留审批/沙箱、信号、摘要、原子落盘和重试语义。

实际精简模板每次新增正文原先重复增加2份背景图约1MiB，最终触及上限。原因是PptxHandler.load每次生成不同backgroundImage blob句柄，脏页比较误判。通过公开解析的当前包基线重绑定已知媒体引用后，隔离内存扩展至31页约1.83MiB，媒体始终5个。未调用模型生成汇报、未修改用户会话文档；早先只读恢复副本不代表内容验收。

新增大模板分块导出、失败不present、过期Host媒体句柄、连续插页及媒体字节保留回归；20项集成测试与Office类型检查通过。Office构建及git diff --check通过。尚未部署/重启运行中的preview，真实会话导出回执及完整视觉验收未执行。

## 2026-09-14 — 客户汇报技能切换为精简模板 1.0.3

按用户新指定文件替换独立 unit-report-ppt 的 base-template.pptx，实际4页：首页、目录、正文示例、结束页。同步封面缩略图、XML profile、来源SHA及模板策略；正文以第3页按需扩展，不恢复旧31页重复结构。下载包与 ~/.agents 安装资源同步，原安装目录已备份；不修改通用内置PPT、不覆盖用户提供的原文件、不重启应用。ZIP模板字节核对及资源引用检查通过；新模板的完整生成会话、绘图与导出渲染验收未执行。

## 2026-09-14 — 修复模板导入 Fs 注入声明并同步客户技能

用户真实会话发现模板导入抛出 cannot get property fs without inject，之前隔离服务测试未覆盖该缺陷。Office Loader 入口和工具插件均新增 fs 依赖声明，测试改为加载前提供 Fs；18 项集成测试、Office 类型检查与构建通过。官方 CLI 部署至 preview 并逐字节核对，已重启 launcher PID 8443。客户 unit-report-ppt 安装目录同步至 1.0.2，旧目录备份于 ~/.cache/workdsh-skill-backups/，模板二进制一致。当前正在运行的会话与已创建空白 PPT 不会自动转为模板；需要重新明确调用模板导入，认证模型导入任务尚未实测验收。

## 2026-09-14 — PPT 模板修改部署至 preview

完整工程构建通过；停止旧 Host 后通过官方 CLI 更新 preview，安装脚本对 Host/Client 入口逐字节核对通过。已重启，launcher PID 3980 / Host PID 3981，127.0.0.1:18989 正常监听，直接本地请求返回 401（认证保护正常）。新启动日志中未发现 EMFILE、堆溢出、模块缺失或端口冲突；不代表历史账本问题已根治。Office 安装文件与本次构建一致，content_import_pptx 已包含在部署制品中。认证模型会话整体验收未执行，用户技能包 1.0.2 未自动覆盖用户已安装技能。

## 2026-09-14 — PPTX 公司模板导入与保存验证

- Office 新增 `content_import_pptx`，通过 Harness Fs 读取原始模板，建立独立工作副本；原模板文件不被覆盖。支持受版本与旧文字检查保护的 `presentation.updateText`。
- 已用客户实际 31 页模板验证工具导入、Agent 文字修改及超过 1.5 MiB 的人工保存。保留母版、版式、主题与媒体；主题和 5 个媒体文件字节未变。
- 修复保存时明确指定的 RGB 文字颜色被母版主题色覆盖；使用原生公开 `isDirty` 标记保留未修改页的 XML。修复 DemiBold/SemiBold CJK 字体重复加粗造成的页脚视觉重影。
- 真实编辑器组件截图：封面、目录画布与原模板像素一致，第 6 页除修改标题外画布像素一致；浏览器错误为 0。私有验证材料位于 `.artifacts/ppt-template-probe/`，不随公开包提交。
- 当前完成源码及组件/服务层验证，未重启或部署运行中的应用；尚未验收认证模型对话的完整流程。文字整体替换保留首段样式，不承诺保留混合行内格式或所有复杂 PPTX 对象的完整保真。


## 客户 PPT 模板截图验证（2026-09-14）
使用实际 mountPptx 编辑组件及工程 nativePptPlugin/CSS，隔离 headless 浏览器 1440×1000 打开原模板与另存 PPTX，截取 1/2/6 页并人工查看。封面 logo、建筑照片、红色标题区，目录背景与内容页 logo/页脚均显示。第 6 页单位页脚文字重叠，不能宣称模板显示完全正常。原模板和另存同页截图像素比较见 .artifacts/ppt-template-probe/visual-comparison.json，浏览器 pageerror 为零。首次 about:blank localStorage 限制造成加载失败，改隔离本地路由后成功；实际切页使用实例公开 setActiveSlideIndex。未修改用户原文件、未部署或重启；实际 Agent 导入工作副本链路仍未接通。

## PPT 底层模板能力实证（2026-09-14）

纠正前轮过宽结论：工程锁定 pptx-react-viewer 3.16.5 / pptx-viewer-core 3.14.3；已有 ImportedPptx 文件编辑组件。使用客户 base-template.pptx 调用公开 PptxHandler.load/save，31 页、1280×720、1 母版、13 版式解析及另存重载通过，warnings 空。ZIP 对比：3 个主题、5 个素材均字节一致；母版和 13 版式均保留但 XML 被重写，不能据此声称完全保真。探针及回执在 .artifacts/ppt-template-probe。底层可以将现有 PPTX 用作编辑基础；content_open 的 Agent 实时工作副本导入尚未接通。浏览器视觉及修改后保真验收未执行，未部署/重启。

## 客户 PPT 模板约束与实时能力冲突纠正（2026-09-14）

用户反馈模板与显示不符。核对 model.ts presentationOpenInput 只有 source:new，existing 为实时 documentId；无任意 PPTX 模板导入。修正 Office presentationGuide：公司标准模板优先，能力核实前不能新建空白、通用风格卡或相似颜色重绘冒充套用；保真需要实际验证，不从 CLI 支持列表推断。没有实现模板导入引擎，没有检查此次实际生成文件。Office typecheck 通过；实际模板导入/渲染保真验收未执行，未部署/重启。

## 技能创建入口纠正（2026-09-14）

按用户要求以 WorkBuddy 的完整创建流程作为 SKILL.md 主体，六步、示例与资源组织直接在入口；DSH 生命周期/安装差异放 dsh-authoring.md，移除重复的 workbuddy-creation-process.md 并修正引用。原配套脚本和许可证保留。skills build、官方 Host 注册/生命周期回归、git diff --check 通过，六步入口与平台引用检查通过；未执行真实模型完整制作试用。本轮未部署或重启。

## 内置技能创建完整流程接入（2026-09-14）

用户授权完整采用 WorkBuddy 创建能力。接入完整方法参考与三个 Python 标准库脚本，保留 Apache-2.0 许可证及修改来源说明；使用唯一 workdsh-skill-creator。适配为工作区草稿初始化、真实资源制作、基础校验/ZIP 交付，正式安装仍经专用导入；单文件继续官方草稿工具。不复制 CodeBuddy 目录/市场元数据，不声称草稿工具新增资源树发布。skills build、官方 Host 注册/生命周期回归、git diff --check 通过；实际 Python 子进程验证初始化、非法名称、占位文件、缺失引用、合法包、输出目录边界、ZIP 二进制素材保留通过。未执行：认证模型完整制作试用、用户页面 ZIP 安装、部署；运行中的 preview 尚未更新，未重启或发布。

## 弹框更新部署与重启（2026-09-14）

按用户要求构建并打包 skills/experts，通过官方 CLI 安装至 preview；两个模块 Host 与 client.browser.js 均与构建产物逐字节一致。已重启，HTTP 401 认证入口响应正常。认证页面实际弹框复验未执行；本轮未提交或发布。

## 全部自有弹框外观统一（2026-09-14）

用户扩大范围至全部弹框；沿用共享 Modal 与现有服务，统一中性灰黑、紧凑字号/间距、SVG 关闭按钮、移动端留边、减弱动效并尊重减少动态设置。覆盖技能详情/目录预览/编辑/资源/卸载/回收/导入，专家详情/导入/草稿编辑/发布确认；原生 Harness 弹框保持官方所有权。官方复用：现有 Client React 与公共 Modal，仅展示样式差异，无新服务。skills/experts typecheck 与 git diff --check 通过。导入实际 React 组件及共享 Modal 技能详情布局的 headless 桌面/375px 边界、关闭热区、字号和长列表滚动检查通过；详情截图使用展示 fixture，不是认证会话。专家各弹框真实操作与全量业务回归未执行；本轮未打包安装、未重启运行应用。

## 导入技能弹框外观切片（2026-09-14）

### Preview 重启与导入弹框部署（2026-09-14）

- 按用户要求重启 preview，并通过官方 CLI 安装本次 skills 构建包；安装后的 Host / Client 入口与工程构建产物逐字节一致。
- 本地 18989 端口监听正常，HTTP 返回 401（认证入口）；导入弹框外观调整已部署，未进行真实登录后的导入验收。
- 启动日志仍出现 cost-meter EMFILE 写入失败，既有资源增长问题尚未解决。独立 unit-report-ppt 1.0.1 技能包仍由用户上传更新，本次未替换用户安装的技能。

用户要求改善外观并明确不要重启。仅调整技能导入弹框展示结构和样式：600px紧凑宽度、20px标题、32px桌面关闭按钮、灰黑中性信息卡、单一正文滚动区、固定底部操作栏、按钮文字不换行；窄屏按钮及关闭触控区44px。沿用公共Modal与已有导入服务，不引入新运行底座或外部组件依赖；采用成熟Dialog的视觉布局思路，未声称安装shadcn。移除原导入弹框累积宽度和移动端旧样式，其他弹框未推广。

官方能力复用：现有Harness Client/React装配、公共Modal展示壳及SkillManagementClient保持；仅业务布局差异，不新增服务或Slot。skills typecheck与git diff --check通过；真实React组件headless浏览器在1280px/375px渲染、80项长文件清单、按钮不换行、固定footer/单滚动和边界检查通过；已查看桌面/窄屏截图。截图在.artifacts/import-dialog-visual，使用导入回执fixture而非认证Host真实上传，完整业务导入回归本轮未执行。只改源代码，未打包安装、未重启或修改运行Profile；监听进程仍PID70626。本轮未提交/发布，等待用户外观反馈再推广公共弹框规范。

## 用户专用单位汇报PPT技能包（2026-09-14）

用户要求制作可上传DSH的独立技能及随包基础模板。产物 /Users/techflag/Downloads/WorkDSH-skills/unit-report-ppt-1.0.0.zip，12文件约1.68MiB；独立名称 unit-report-ppt，官方 disable-model-invocation:true/user-invocable:true，仅用户显式调用。包含文字稿转页面、表达模式、版式、绘图、模板策略、运行能力和交付规范，以及用户原始PPT完整副本、内嵌封面缩略图和实际XML提取的模板概况。没有改动通用内置技能或默认工作流；Word正文未纳入默认知识或技能包，后续须附当次文字稿。

验证：实际SkillImportStaging ZIP上传/commit、隔离临时Profile安装、锁定官方filesystem解析、仅用户调用策略、相对引用读取、二进制模板字节保留通过；验证回执保存在同一Downloads目录。首次探针watch:false下提前初始化provider导致新增文件未发现，调整为安装后冷启动官方provider，验证通过，不绕过解析器。认证浏览器上传、实际模型制作PPTX、复杂图形渲染和母版保真未执行；不把原模板骨架当作完整绘图库，不称技能上传可新增模板导入引擎。工程仅记录任务状态，本轮未安装到用户现有技能目录、未提交或发布。

## PPT 四套封面预览候选（2026-09-14）

用户要求继续实现 WorkBuddy 式风格选择。Office 新增 content_preview_styles，通用与红色各四套不同封面，真实标题/副标题/已知落款、五色配色与标签；经同一 Office 身份、授权、存储及 Session 右侧预览保存。内置唯一 PPT 技能改为先需求对齐、预览、官方 ask_user_question 等待选择，再恢复原生 PPT 并应用全局风格；红色不自动认定红金，具体模板/风格及明确快速交付跳过。没有新增 answerer/Agent loop，HTML 卡不直接提交选择；第一版八套固定方案，不代表任意风格自动生成或 WorkBuddy 完整复刻。

证据：Office typecheck、Office/技能 build 通过；Office 内容及封面浏览器回归15项通过，另有技能 Host/生命周期2项及原生输入/HTML浏览器3项通过。覆盖预览持久保存、相同参数重试不抬 revision、跨组织拒绝、取消、卸载、转义、桌面/360px布局；已人工查看生成截图并修正红金底色。截图位于 .test-runtime/ppt-style-preview，是真实渲染测试结果，不是已认证 Session 截图。两包打包并通过官方CLI安装preview，Host入口与内置资源字节核对通过；重启后HTTP401认证响应正常，仍出现既有 cost-meter EMFILE，不宣称启动稳定性根因已修复。

未执行：认证 Web 原生提问 answerer 实测、真实模型从需求确认到选择恢复、三页样稿及最终PPTX视觉和完整交付验收；此前 API 余额问题本轮未处理。下一步必须用实际模型会话验收上述链路，不能将提示词规定视作运行成功。本轮未提交/推送/对外发布，D04/TM-01主线状态不变。官方复用记录见 docs/design/office/NEXT-STAGE.md。

## 内置 PPT 去重（2026-09-14）

用户要求只有一个内置PPT、不使用腾讯命名。合并为 resources/skills/workdsh-ppt-design，保留新接入的设计/叙事/红金等方法和既有图表/交付参考；删除重复 tencent-pptx 注册与目录。显示名称PPT制作，Office默认只加载workdsh-ppt-design。原版研究资料及内部来源说明保留，不作为产品名称。内置数量当前为skills插件5个+experts插件1个，共6个；此前7个记录为历史。旧PPT目录内容完整备份至 ~/.cache/workdsh-builtin-migrations/2026-09-14/workdsh-ppt-design-before-merge。Skills与Office build/pack通过，4项相关回归通过（含唯一PPT入口断言与全部入口参考读取）；check:plan及git diff --check通过。两内容寻址制品经官方CLI安装preview，安装Host字节及唯一PPT目录核对通过，已重启。真实模型制稿与视觉/导出本次未执行，不对外发布。

## 内置技能工程化纠正（2026-09-14）

用户定义：工程精细维护/直接集成的是内置，通过技能管理创建流程制作的是用户技能。本次统一七个现有WorkDSH内置：skills插件六个（skill-creator、PPT/Word/Excel/Web设计、腾讯PPT原生适配），experts插件一个expert-manager。目录统一为所属插件 `resources/skills/<正式技能名>/SKILL.md`，附属references/runtime保留；原TypeScript正文迁回Markdown，skills构建通过锁定官方filesystem Skill provider单向生成注册内容，不增运行解析器/执行器。专家已有Markdown源保留并统一路径。所有权、来源与目录规则写入ARCHITECTURE/PLAN及Skills README。模块版本保持当前源码候选，未对外发布。

腾讯原版研究资料仍在docs；随包提供WorkDSH原生适配和重新编写的设计方法，不复制原版引擎、DSL或脚本。既有第三方插件贡献继续由其原插件包管理，不另拷用户目录；来源不明的其他用户技能不批量迁移，workdsh-import-test为测试资料保留。唯一上轮误放用户根的tencent-pptx副本已完整备份至 `~/.cache/workdsh-builtin-migrations/2026-09-14/tencent-pptx-user-copy` 并撤出活动根，未删除用户创建内容。

证据：两插件build通过；skill-creator-host、skill-plugin-lifecycle、expert-authoring-skill共4项通过。两tgz解包到工程外隔离目录，官方list/get发现7个技能、正文可读及5个入口链接存在，无用户根依赖；官方CLI安装到preview，Host及所有包内技能资源逐文件字节一致并重启。check:plan（29模块/50文档）与git diff --check通过。当前内置仍是技能页只读条目，不宣称页面独立停用开关已实现。真实模型制稿、视觉/导出、浏览器管理交互本次未执行；历史审计快速增长/启动资源不足问题仍需单独修复，不以本次技能工程化标记解决。

## Office PPT 默认设计接入（2026-09-14）

用户授权把本机腾讯技能集成到已有 /office.ppt。复用 Office 已有公开 systemPrompt 注册及官方 skill 工具/目录，不新增命令或执行器：原生 presentationGuide 在打开并提交第一张有用页面后，优先加载实际目录中的 tencent-pptx，无需用户额外输入；缺失时采用已有 workdsh-ppt-design，不声称第三方资源随包提供。编辑仍走原生 content_*，不转交 PPT Master。仅改变设计指令，原版腾讯资源仍本机安装、未纳入产品制品。本次为 preview 候选，未对外发布。Office build/pack、2项 Office 输入回归及 git diff --check通过；内容寻址制品经官方CLI安装到preview，安装入口逐字节核对通过并重启。真实模型自动加载腾讯技能、制稿渲染与导出本次未执行。

## 腾讯 PPT 执行路径更正（2026-09-14）

用户明确要求沿用已有 `/office.ppt`，撤销上一适配中转交 PPT Master 的选择。本机 `~/.agents/skills/tencent-pptx` 入口改为原生 Office content_* 制作：先打开右侧、读取能力/原生 schema、逐页提交、保留用户编辑、导出真实PPTX；腾讯资源仅提供叙事和视觉方法，原版DSL/SDK和强制中间文件不适用。核对现有 Office input、authoring、tools、native-deck 与 README 后修改指令，未修改 Office 实现或卸载用户已有生成插件。上一“腾讯 PPT 技能本机适配”记录为历史，本节覆盖其执行路径。官方文件技能解析及资源检查通过；真实模型制作、浏览器视觉和导出本次未执行。

## 腾讯 PPT 技能本机适配（2026-09-14）

用户授权集成本地 `docs/workbuddyskills/tencent-pptx`（v20260904）。原目录未修改；完整26份源文件复制到用户官方 Agents skills 根 `~/.agents/skills/tencent-pptx`，保存 ORIGINAL-SKILL.md 和逐文件 SHA256 SOURCE-MANIFEST.json，增加 WorkDSH 执行适配入口与说明。官方复用：Harness skills.zh.md 的 filesystem provider、目录包和用户根，发布包 `@deepseek-ai/dsh-skill` / `dsh-skill-filesystem@0.1.5-rc.1` 实测；没有新增解析器或运行器。保留腾讯需求对齐/叙事/视觉/红金资源，通过已有独立 ppt-master 的官方 skill 加载执行；不运行原版 slidep/SlideDSL 或 WorkBuddy editor_sdk。原技能目录未发现许可证，因此仅本机使用，不纳入发布制品；不是原版引擎完整迁移。官方隔离 custom 根与 preview 默认 user-agents 根 list/get、user/model invocation 和5个入口相对引用检查通过。文件生成完整模型任务、视觉渲染、浏览器菜单交互本次未执行；上一会话HTTP402余额不足仍需用户处理。无需改变模块版本或主线阶段；官方 watcher 负责刷新发现。

# WorkDSH 当前开发台账

更新日期：2026-09-15。当前有效状态以本节、`development-order.json` 与 `modules.json` 为准；下方按日期保留的日志记录当时状态，不能据此覆盖后续发行或用户决定。

## 每周发行计划（2026-09-14）

已制定[每周版本计划](WEEKLY-RELEASE-PLAN.md)，首个目标发行日2026-09-18，滚动8周。每周冻结一个可验收闭环；前置未退出则顺延，未达标不抬版本凑数。计划日期/周次及相对链接检查、check:plan（29模块/50文档）与git diff --check通过；产品测试本次未执行。该计划不代表开发/验收已完成，不创建自动发布任务。当前D04、TM-01及暂停范围保持。

## 局域网访问核对（2026-09-14）

用户要求局域网访问；实际CLI拒绝0.0.0.0监听（远程代码执行暴露限制），已恢复127.0.0.1启动配置，未绕过官方限制。SSH隧道使用说明见[开发文档](DEVELOPMENT.md)。跨设备隧道验证未执行。

## preview崩溃恢复（2026-09-14）

用户反馈无法访问，日志确认启动约40秒触及默认4GB堆上限而退出。提高8GB后仍曾出现快速增长；停用cost-meter与中立cwd均未证明根因，原插件配置已恢复。旧依赖备份移出active Profile保留；当前以8GB上限恢复，预览脚本同步该上限，后续仍需定位启动内存增长，不宣称彻底修复。用户数据/技能目录未替换。最终连续30秒三次HTTP401认证响应正常，RSS约1.16—1.18GiB；已越过此前约40秒崩溃窗口。启动脚本语法、check:plan（29模块/50文档）、git diff --check通过；认证后浏览器完整功能与更长时间稳定性未执行。

## 外部PPT Master安装（2026-09-14）

用户授权将https://github.com/pn1024/dsh-ppt-master安装到preview。官方CLI加入`dsh-ppt-master@6.1.0`（link到`/Users/techflag/.cache/workdsh-plugins/dsh-ppt-master`），源ZIP提交`3c956467cd053fec36816cb7d2ca973729a5d4d1`，SHA256 `aab8f8de75180c56d62ec53ce58fd34f2a4155e21c02e826772ad99cf9af177c`。Python3.13独立环境`/Users/techflag/.cache/workdsh-plugins/ppt-master-runtime`，依赖安装及pip check通过；插件`.venv`链接该环境，当前启动PATH包含环境bin。Provider入口最小验证通过（不是付费模型验收）；自带质量检查及一页SVG→真实PPTX转换/ZIP结构检查通过。预览已重启。图片API Key未配置，不替换Office编辑器，不宣称复杂PPT/模板/音频端到端验收。此前PresetMenu修复构建及3项现有菜单回归通过，但尚未安装到preview；稳定性和百万审计记录增长问题仍待修复。

## 状态口径与当前任务

- `implemented`：登记范围已有实现，不等于整个产品或所有业务场景验收通过。
- `in_progress`：实现或验收仍有明确缺口；已公开 alpha 的模块也可保持此状态。
- `planned` / `todo`：规划或脚手架，不能当作可用功能。
- `paused`：保留成果与待办，未经用户恢复不继续开发。
- 主线仍为 **D04 专家**；优先切片仍为 **TM-01 专家团协作闭环**。本次仅整理台账，不推进阶段、不执行真实模型任务。

## 已实现与待验收

| 范围 | 当前事实 | 未完成边界 |
| --- | --- | --- |
| D00—D03、基础治理与技能 | 已登记范围完成；技能管理、导入、编辑、资源与对话式制作已有实现 | 不代表第三方技能依赖环境、企业多租户或整个 P1 完成 |
| 专家 / 专家团 | 专家制作、发布修订、召唤、共享技能、有限 SOP、指定成员委派、评审及文件版本闸门已实现；故障恢复回归与确定性原生子会话探针通过 | D04 全部专业场景与 TM-01 真实模型完整流程、实际旧任务恢复、AT-T01～T07 未整体验收；D11 全范围仍 todo，不能解释成团队运行完全未实现 |
| 活动与协作展示 | 独立插件已实现；普通46px / 团队56px、半宽居中、固定修订头像、Siri彩边、动效开关、官方子任务运行期间每3秒刷新 | 最新刷新修复后的真实长任务成员切换未完整重验；没有已验证交接事件，不制造交接动画或签收成功 |
| Office | Word、当前 React PPT viewer、实验性 Excel、HTML 实时工作副本及 PDF 首版已有实现 | 全功能文件保真、跨平台及真实模型组合验收未完成；任意 PDF 导入/OCR/图片编辑未接入；不是八类编辑器全部完成 |
| bundle | 可安装组合已发行，8包精确组合的官方 Web Profile 生命周期验证通过 | 不替代各功能验收，不等于 D10 首期全模块集成验收 |

证据：[TM-01](evidence/expert-team-tm01.md)、[发行与验证范围](releases/2026-09-14-development-candidate.md)。历史日志中的临时 `/tmp` 路径只是当时运行记录，不代表可长期复用的验收材料。

## 当前公开发行

2026-09-14 已推送并公开5个 GitHub prerelease：experts `0.1.0-alpha.2`、skills `0.1.0-alpha.28`、activity `0.1.0-alpha.1`、office `0.1.0-alpha.4`、bundle `0.1.0-alpha.41`。源提交 `557d076`；23个公开附件匿名下载回读且 SHA256 一致。未发布 npm，Twitter 由用户自行发布，没有代发。

本批已有验证：完整构建（含类型检查）、115项集成、9项活动测试；8个精确tgz隔离官方 Web Profile安装、两次冷启动、匿名401/认证200、活动及全部模块移除后冷启动通过。环境为 Harness `0.1.5-rc.1` / Node `22.23.2` / macOS。这些是既有证据，本次台账整理没有重跑产品测试。

Office许可证文本收集10项缺项保留原报告；按用户决定用README与依赖清单记录引用，不作为本次发行阻塞，不改成“许可证收集通过”。

## 暂停与未开发

- Office专项仍在 deferredSlices：整体工作暂停保留；Word新增开发、Excel格式/合并/图表扩展暂停。画布与多维表格已移出该专项，Markdown本轮不扩展；这些不删除D15长期路线。
- D05连接器 → D06资料库 → D07项目 → D08行业应用 → D09后台 → D10首期集成，仍未完成；后续D11整体验收、D12自动化、D13示例、D14团队部署、D15表格/页面/业务场景保留。
- 本地身份提供方、授权和审计已有实现，不等于组织管理、SSO、模型策略、用量统计和不互信多租户服务已完成。
- LIMS目前只有讨论，没有开发授权、实现或验收。Desktop兼容与环境管理不因本次整理恢复。

## 下一步、阻塞与本次检查

下一步仍为TM-01有限验收：真实模型执行—评审—交接—交付，核对同版文件、异常恢复及活动栏成员状态。确定性回归不能代替真实任务证据；阶段退出须逐项登记实测，不能只写“等待用户确认”。未开发模块不提前启动。

尚缺上述真实运行验收证据；没有据此断言存在新的已定位代码bug。本次不调用付费模型、不修改preview、不提交或推送。默认 `lefthook.yml` 样例已清理；有意新增的 `scripts/desktop/` 保留且不纳入本批 Web 发布范围。

本次台账检查：计划完整性与文档差异检查在整理后执行，结果见下方整理记录；产品构建、浏览器、真实模型、多平台检查本次均未执行。

## 2026-09-14 开发台账整理记录

已核对发布回执、当前包版本与开发顺序；同步STATUS、PLAN、模块发行字段、TM-01待验收项、Office暂停范围和两份交接入口。历史scope保留至scopeHistory，原始阶段状态未推进。`node scripts/check-plan.mjs`通过（29模块/50文档），`git diff --check`通过。本次产品构建、浏览器、真实模型及多平台检查未执行；未提交、推送或修改preview。

---

# 历史开发记录

以下记录保留当时版本、授权与检查结论；“未发布”“当前”“下一步”等表述仅适用于该条记录的日期。

公开下载回读：5个公开prerelease共23个附件无认证下载成功，SHA256全部一致；源提交557d076，模块tag不随文档回执移动。

2026-09-14 对外发行：本批新增experts alpha.2、skills alpha.28、activity alpha.1、office alpha.4、bundle alpha.41；8个精确tgz隔离官方Web Profile安装、两次冷启动、匿名401/认证200及活动/全部模块移除后冷启动通过。已推送并按模块公开alpha Release，不发布npm、不发送Twitter。保留TM-01和真实长任务成员切换未验收范围。

## 2026-09-14 发布源码提交与Twitter宣传准备

本次发布候选版本：experts alpha.2、skills alpha.28、contracts alpha.7、activity alpha.1。完整build、115项集成、9项活动测试、check:plan 29模块/50文档通过；8个独立tgz已重打到.artifacts/release-submit-2026-09-14并带SHA256清单。本次提交包含相关专家/团队/活动与技能展示改动、文档证据和3张原始真实截图；无关scripts/desktop和lefthook保持原状态。

用户明确指示Office文本收集缺项不作为本次阻塞；README列出对应项目、10个版本条目与声明许可证，199项完整打包依赖清单保存在docs/evidence/office-bundled-dependencies-2026-09-14.md，已有notice保留。缺项报告未伪改为通过。Twitter中文主推文/可选跟帖/两张真实配图说明位于docs/social/twitter-2026-09-14.md，未发送。此次未推送/创建公开Release/发布npm；新版本完整组合隔离安装、真实长任务成员状态切换及TM-01整体验收仍未执行。

## 2026-09-14 成员运行状态刷新与兜底修复

用户截图显示4个子任务、真实委派/评审调用，但栏内主理人处理中。代码发现只读缓存catalog，未主动刷新采样状态；新增公开ISessions.refreshSubagents每3秒刷新（只在父任务运行时），首次与结束刷新，组件清理计时器。委派调用未返回且没有运行成员时展示“正在委派或等待成员结果”，读取加载/失败不再误归主理人。保持driver running/inactive语义，不据此宣称成功验收。定向build含TypeScript通过；实际任务复核时已完成，不能回溯证明当时子任务running状态。无付费重跑/真实长任务切换验收；隔离浏览器验证记录于/tmp/activity-catalog-browser.log。任务结束后经官方CLI安装新版，preview重启；不影响原生团队执行/SOP和文件卡。

## 2026-09-14 顶部专家团场景栏

按最新参考图只改顶部栏：团队56px双层文字、团队名称与真实执行动作、三人36px头像组、实际运行成员青色光圈，保留半宽居中/Siri彩边/动画开关；普通栏46px。专家经公开可选ActivityIdentity.members提供固定绑定修订组成及头像，缺图保留首字，不使用草稿。未核实真实交接事件，未制造交接箭头、光点或文案。原生正文/工具/文件卡保留。

专家与活动定向build（含TypeScript）通过；12项相关测试、隔离官方Profile浏览器通过（普通46px/团队56px布局、半宽/中心、动效关闭持久化/减少动态效果/原生正文）。日志/tmp/team-strip-browser.log、/tmp/team-strip-tests.log。官方CLI安装两插件并核对browser字节，preview已重启；真实浏览器复核当前团队任务：3个头像、560×56px、中心一致、无pageerror，截图.artifacts/activity/live-team-scene.png，日志/tmp/team-scene-live.log。该固定修订缺图片，呈现郑/钱/甄首字。付费模型/真实交接、多平台本批未执行；TM-01未推进。此前.artifacts/release-candidate-2026-09-14早于这次修改，不含新场景栏，正式发布需重新版本化/打包。

## 2026-09-14 README截图与发布候选准备

3张用户PNG原图保存至docs/assets/screenshots并核对字节一致；README补充工作动态、HTML实时制作、专家团详情与草稿/修订说明。发布候选说明位于docs/releases/2026-09-14-development-candidate.md。完整build通过；集成回归115项、活动投影9项通过，check:plan 29模块/50文档通过。首轮集成发现测试新增react-dom/server未声明依赖，已移除不必要SSR依赖并重新执行全套集成成功。8个当前工作区版本tgz及SHA256SUMS/release-manifest位于.artifacts/release-candidate-2026-09-14，摘要逐一核对。未提交/推送/建tag/发布npm或GitHub Release，未重启用户preview。

此前候选记录（后续版本与用户决定见顶部）：源码固定与版本准备当时尚未完成，Office报告10项许可证文本收集缺项；新制品完整隔离Profile安装/冷启动/移除、付费模型、多平台本批未执行，TM-01未整体验收。候选包不等于已具备完整公开发布准入。

## 2026-09-13 召唤后专家名称显示修复

普通preset列表过滤误删hero当前已绑定专家的名称行，原生组件找不到chosen.name退回内部wd-exp ID。已召唤专家单独显示只读名称，从官方当前preset roster的已有name读取；未加载显示“已召唤专家”，不构造名称、不提供内部preset切换。普通菜单与设置过滤、绑定guard保持。定向build（含TypeScript）及3项菜单回归通过；官方CLI安装并核对browser字节，preview更新重启。日志 /tmp/expert-seat-name-tests.log、/tmp/expert-seat-name-install.log。

## 2026-09-13 活动栏半宽居中

按用户最新截图缩减至此前宽度一半：可用区域50%、最大560px，水平居中；46px高度与Siri式彩边动画保持。窄屏保持可读宽度，按容器宽度收敛成员信息。局部头像显式corner-shape:round避免官方全局squircle影响圆形。定向build与隔离官方Profile真实浏览器通过：半宽/中心位置、圆形头像、旋转彩边、动画开关持久化、系统减少动态效果及原生正文保留。日志 /tmp/activity-half-browser.log。用户明确授权打断当前任务后，preview已通过官方CLI安装新版并重启；未新增模型请求或推进TM-01验收。

## 2026-09-13 按认可图校准活动栏与Siri式动态边框

用户要求：保持单行、宽屏收敛宽度、留白与圆形头像；边框四周柔和彩色色条循环，动画可关闭。实现46px单行/最大1120px/标签下12px留白、轻边框、普通助理去双轮廓、工作时眨眼/三点波动；局部mask伪元素配conic-gradient角度旋转，working且动效开启时每5秒一周，终态不滚动。暂停按钮悬停/键盘聚焦可见，关闭状态保留开启动效入口；系统减少动态效果覆盖伪元素。官方Session与Header utilities Slot保持，未新增执行器。隔离浏览器已验证彩边角度随时间改变、暂停及系统减少动态效果停止；当前继续验证用户要求的半宽居中。

## 2026-09-13 普通对话误用专家默认配置修复

用户截图排查：preview settings.yaml 的 agent-presets.default 为 wd-exp-work-retrospective-advisor-020c83907b5a，普通会话 session-6cb6ee80-98ee-4eee-878e-4af6305588b1 挂载该preset却无绑定。原生执行guard拒绝符合预期；此前新任务菜单允许公开专家preset、设置页面未过滤专家内部preset导致错误创建。修正两个公开Slot的呈现与操作：普通配置菜单/全局默认设置排除所有wd-exp-*，专家从绑定感知召唤路径创建。官方复用记录：锁定ui-agent-preset公开AgentPresetSeat/AgentPresetSection注入load/select/makeDefault与快照，ui-slots StoredEntry.options及同cell shadow；不改上游/执行器，不跳过专家绑定guard。当前默认已恢复官方standard，原设置已备份 /tmp/workdsh-settings-before-native-default.yaml；23项相关测试及typecheck通过。真实浏览器确认设置内容排除内部专家preset、新任务默认Standard mode、普通hero菜单不出现专家。用户随后普通新闻查询已正常完成，未额外发送模型测试。原生Settings导航基于raw ledger而非shadow winners，设置分类重复显示的UI缺口另记，未宣称已修复。

## 2026-09-13 活动栏外观修订

单行40px保持；成员姓名/职责/真实运行状态分段、重叠头像、渐变与SVG图标。固定修订头像资源读取已补；旧会话缺少头像时不借用未发布草稿。根build/typecheck与9项投影测试通过；preview已安装重启，真实浏览器复核通过：两位成员、40px、无pageerror；原生正文保留、动画关闭刷新保留、系统减少动态效果与Escape收起通过。证据 /tmp/activity-ui-live.json 与 /tmp/activity-ui-browser.log，截图 .artifacts/activity/live-ui-strip.png。

## 2026-09-13：独立活动与协作展示插件0.1完成

用户授权需求与实现位于 packages/plugins/activity/DESIGN.md、packages/plugins/activity。覆盖普通问答、技能、专家、团队的紧凑40px单行呈现，展开浮层展示原生子任务状态/查看过程；助手表情、呼吸/完成点头及长任务节奏可关闭，偏好持久化并遵守系统减少动态效果。只使用结构化原生Session事件、子会话目录，专家/技能经公开可选契约提供固定修订身份与已有标题；不增加模型请求、任务执行器或任务真源。使用官方Header utilities附加Slot+只匹配插件所在header的局部布局CSS；原Header、正文、工具调用、Composer所有权保留。初版Header包装的声明时序/子Slot所有权问题已通过真实浏览器发现并移除。

验证：根build/typecheck、112项现有集成回归及9项活动状态测试通过；check:plan（29模块/50文档）、git diff --check通过。独立目录官方CLI安装tgz与字节核对通过；真实浏览器确认单40px栏、保留正文、动画关闭刷新持久化、系统减少动态效果、Escape、无pageerror。独立Profile停用插件后组件和局部CSS消失、原生会话正文/header恢复。安装包 .artifacts/workdsh-plugin-activity-0.1.0-alpha.1.tgz，截图 .artifacts/activity/browser.png；日志 /tmp/workdsh-activity-browser-final.log、/tmp/workdsh-activity-disabled.log、/tmp/workdsh-activity-regression.log、/tmp/workdsh-activity-typecheck-final.log。

边界：浏览器使用独立原生历史夹具，不是付费模型/真实专家团端到端验收；成员执行中来自原生目录，未伪造待评审/SOP已签收。后续用户反馈未显示，已更新18989正式preview并重启。在原1000万预算会话真实浏览器确认团队协作栏出现、固定修订主理人郑守衡及成员甄有据/钱日清加载、原生终态为本轮结束/文件已交付、无pageerror。未重新执行模型任务。截图 .artifacts/activity/live-preview.png，证据 /tmp/workdsh-activity-live-browser.json。启动时用量账本仍有已知EMFILE重试，不宣称修复。未提交推送，TM-01整体状态不因此推进。

## 2026-09-13：修复专家委派悬空

用户授权修复 session-561c400bfdca87cf336dfb9fbb63305a 暴露的阶段等待/异常收尾问题。未能从导出日志判定原始中断触发源，已修复应用层悬空：官方原生子任务等待增加5分钟无进展/30分钟最长等待；启动准备3分钟上限及取消后迟到句柄释放。阶段执行和评审准备、创建、结果/回执异常统一结束当前尝试；保留文件、前置验收和尝试预算。显式 workdsh_expert_team_recover 通过官方 sessionQuery 核对原子会话，仅确认中断且无活跃成员时作废当前尝试；已完成未结算、未知状态不盲目重派/签收。status 显示待恢复，团队主理人 Markdown 增加续作规范，不修改上游执行器。

验证：专家构建/typecheck通过；故障恢复12项及专家管理21项测试共33项全部通过。生产路径隔离确定性 --team 探针退出0、outcome=expert-team-verified，含真实子会话、取消后重试、文件漂移拒绝及独立进程冷读；check:plan与git diff --check通过。日志 /tmp/workdsh-recovery-tests.log、/tmp/workdsh-recovery-team.log。preview正式Profile安装通过并重启；浏览器读取原生输入框/侧栏通过（首次Standard mode定位超时，实际选中工作复盘顾问，复核DOM确认可用）；启动时用量账本出现EMFILE，即便调整本次启动文件句柄上限仍短暂出现；未将该独立插件问题宣称修复。未调用付费模型、未改用户历史日志/已发布作品、未提交推送。旧预算任务并未自动生成最终Excel：应在原会话显式恢复第三阶段，保留前两阶段；整体TM-01验收及真实模型端到端结果未执行。

## 2026-09-13：筛选专家模式与中文指令展示

通过官方Slot低优先级展示覆层复用原组件和控制器。仅显示当前可用独立作品preset，内部成员和历史修订不进入模式选择。指令列表读取已有中文title，并为自有技能补充产品中文标题；第三方无中文标题保持原名，调用标识及pick索引不变。experts/skills构建、preview安装通过并重启。实际浏览器验证模式菜单无内部会计/出纳、表格分析单行；六个自有技能中文名称出现，无页面错误。首次验证因浏览器默认英文误用中文按钮定位，改用实际按钮后通过。未发送模型请求，未提交推送。

## 2026-09-13：修改提示词展示作品名称

移除可见存储ID与中文名称的JSON引号；保留中文名称，英文名称仅从作品manifest的displayName.en/name或单专家Agent MD的displayName.en/name读取，缺失或无效时省略，不翻译、不构造。用户追加要求采用WorkBuddy句式：帮我修改专家：[名称]，增加/优化[请补充你希望新增/优化的技能或知识领域等]方面的能力。构建、preview安装通过；实际浏览器验证中文及已有英文Corporate Finance Team正确、无ID、原生输入预填通过。未发送、未发布、未提交推送。

## 2026-09-13：专家编辑转入原生对话

默认编辑与继续编辑改为原生Session对话，预填选中作品名称、类型与稳定ID的修改请求；文件编辑留为“编辑制作文件”高级入口，不自动发送或发布。资源图片改为网格、统一112px预览。experts build、preview:install通过并重启18989；实际浏览器验证公司财务专家团的“编辑”进入原生输入、提示词及ID正确、未打开原始文件编辑器通过，截图.artifacts/expert-pages/edit-conversation.png。图片网格仅经构建验证，未执行付费模型或全量回归，未提交推送。

## 2026-09-13：专家团使用详情重排

用户要求参考WorkBuddy截图完善：使用页以用途、快捷提问、主理人/成员与协作场景为主，原始MD收进专业设定。复用既有已发布ExpertDetail与召唤草稿管线，不更改修订内容，不编造头像/使用次数。experts build与git diff --check通过，preview更新并重启，实际浏览器验证快捷提问/三个成员/原文默认隐藏通过，截图.artifacts/expert-pages/team-detail.png。发现四张头像在工作区与ZIP中存在但发布团队未保存：管理资源工具缺fs注入，现已补齐。编辑页新增资源支持；通过真实UI保存四张头像及头像引用进已有团队草稿，读回确认团队与两成员头像存在，未发布（保持旧修订）。草稿截图team-avatar-draft.png。未执行付费模型或全量回归，未提交推送。

## 2026-09-13：分析 WorkBuddy 技能可复用性

盘点 docs/workbuddyskills 的26个顶层技能与3个嵌套技能，重点比较创建器、Office路由、设计参考与平台依赖。分析与实施建议见 design/WORKBUDDY-SKILLS-AUDIT.md，文件数量与入口哈希见 design/WORKBUDDY-SKILLS-INVENTORY.json。发现我方创建器仍为TS正文且自然语言工具仅支持SKILL.md；原始创建器隔离实测错误YAML/空描述/缺引用误通过、打包包含dummy .env与缓存。仅运行临时目录本地校验/打包函数，无远端调用或用户技能安装；未验证付费模型/金融算法/腾讯服务。建议先增强整包制作能力，后续技能按真实工具契约适配；本轮不改运行代码、不改路线状态、不重启preview、不提交推送。

## 2026-09-13：专家中心直接区分专家与专家团

用户反馈中心无法区分类型。将类型切换从我的作品扩展到中心，复用现有 Host expertType 查询；来源筛选与类型组合，搜索/空态/创建按钮同步类型，卡片显式类型标签。类型保留到 URL。加载序号阻止快速切换时旧响应覆盖当前目录。experts build、git diff --check、preview:install 通过并重启18989。实际 preview 的 Playwright 验证中心两种类型切换、列表隔离、类型标签及刷新保持通过；截图 .artifacts/expert-pages/center-{agent,team}.png。首次自动化误停在默认技能页，改为点击专家入口后通过。未执行付费模型测试或全量回归，未提交推送。

## 2026-09-13：更新并重启 preview

用户授权安装当前插件并重启。首次实际启动发现专家 Host integration 未声明官方 agents/subagents/sessionQuery 服务注入，隔离探针此前未覆盖正式 Loader 消费者的声明。补齐现有公开服务 inject，不修改上游或用户数据；experts build 与 preview:install 退出0，官方 Loader 实际启动成功并监听18989；已打开认证预览页面。未认证请求401符合本地认证要求。未执行付费模型测试、未提交推送。官方复用依据：https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/config-catalog.zh.md 的服务 Requires 与锁定 Cordis 运行时报错。

## 2026-09-13：按 WorkBuddy 截图拆分专家作品浏览与创建入口

专家中心与“我的专家”分工明确；我的作品独立提供专家/专家团标签、各自数量、搜索、状态过滤、创建卡片及返回中心入口，分类保留到 URL，刷新不丢。制作菜单区分创建专家/专家团，均经原有官方 Session 与原生输入草稿交接，填入不同自然语言提示词，不自动发送。完整文件编辑仍单独打开。卡片突出职业、领域标签、两行简介和真实头像，默认头像改中性灰。

Host 同一 list 增加 expertType 条件，在授权目录分页前分类；摘要增加类型/职业/标签，隐藏成员不重复列为作品。没有新增作品存储、原生编辑器或运行器。公共契约与覆盖矩阵回填。

验证：experts build、根 typecheck、集成100/100、check:plan（28模块/50文档）、git diff --check通过；隔离 Playwright 浏览器实际 React 面板通过类型数量/显示隔离、两种创建分流、刷新分类保持、返回中心及创建菜单（CSS视口1440x900），截图 .artifacts/expert-pages/mine.png，日志 /tmp/workdsh-expert-pages-ui.log；该浏览器数据为隔离fixture，不是用户Profile。Host集成新增团队分类/计数/搜索断言。未安装preview、未启动用户应用、未提交推送；原生创建全链路及实际模型体验尚未在本轮验收。

## 2026-09-13：补齐 WorkBuddy 专家制作与交付能力范围

用户明确要求覆盖完整 expert-manager 体系，取消此前将单成员直调与二进制资源列为范围排除项。覆盖矩阵见 [WORKBUDDY-COVERAGE](design/experts/WORKBUDDY-COVERAGE.md)。完整 MD 是源，补齐转换/批量制作纪律、稳定身份检查、成员展示信息与真实头像；二进制原资源和可执行 bin 保存、固定安装、字节与目录漂移核对、原包导入导出。save_resources 从绑定工作区实际读取文件；export_file 经官方 Bash 沙箱写真实 ZIP、读回核对并原生 present，含空格/引号路径通过。

团队增加单成员 team_ask：固定成员真实子 Session，完整输出中转给主理人，不强制独立评审。team_open 可按完整正文 Workflow 形成计划，由 Host 解析当前固定成员；评审可选，无依赖阶段并发预留保留两条绑定，后序收到完整前序产出。未修改上游、未另建执行器；仍复用官方 provider/AgentLoop/Session/StorageDomain/SkillFilesystem/原生沙箱。

验证：根 build/typecheck、最终 experts build；集成100/100（含长正文、较大二进制清单、CLI安装/资源漂移、稳定身份、并发阶段与可选评审），规划2/2，check:plan 28模块/50文档，git diff --check。原生 --team 退出0，outcome=expert-team-verified、teamReady=true，10项检查通过，14个真实子 Session，独立进程读回4个运行；普通单成员没有评审子任务。证据 .artifacts/expert-team-probe/team-result.json；日志 /tmp/workdsh-coverage-{tests,native,root-build,typecheck,plan}.log。

回归：--adapter/--sop/--integration 三模式退出全0，分别 one-shot-adapter-verified/sop-policy-verified/expert-integration-verified（integrationReady=true）；冻结锁文件安装检查通过。

边界：这是代码能力与隔离确定性组合验证；integrationReady=false 在 --team 模式中表示没有运行 --integration 模式，不是 teamReady 失败。未安装 preview、未做浏览器视觉验收，未运行付费模型专业质量与模型同时派发多个阶段的验收，不宣称完整商业体验已经通过。bin 安装在固定作品目录，以运行说明中的绝对路径执行，不改宿主全局 PATH。未提交推送，保留其他 AI 共享改动。

## 2026-09-13：完整专家/专家团制作文件作为创作源

按用户“修改吧”授权修正文件包模型。四份 WorkBuddy 原始规范原样保留（agent-md-spec/team-spec/plugin-json-spec/avatar-spec），Apache-2.0 归属及平台差异分开记录。完整 Agent MD 与包内文本资源作为创作源，保存时重新解析身份、成员、依赖与兼容索引；编辑界面直接编辑原文件，拒绝仅修改旧摘要造成不同真相。导入导出保留原包文本；get_documents 返回内容后仍需 write/present 才是实际文件交付。

发布复用同一 Host 服务和统一确认，固定隐藏成员修订；完整资源固定于官方 preset 的 expert-package，包内 Skill 经官方 skill-filesystem customSkillDirs 挂载。就绪检查及执行绑定校验逐字节与目录清单，修改、额外文件或软链接漂移拒绝执行；脚本不因保存而自动执行。

验证：根 build、typecheck、最终 experts build；集成测试95/95，规划测试2/2，check:plan（28模块/50文档），git diff --check 均通过。新增验证覆盖自由MD/完整资源往返、官方preset挂载、原文件编辑重新解析、旧发布版本保持不变、资源漂移拒绝、团队一次发布固定成员与冷启动绑定。发现并修复旧专家空资源重复编译兼容问题。证据日志 /tmp/workdsh-expert-package-integration.log；复现 corepack pnpm build / typecheck / test:integration / test:planning / check:plan（Node22.23.2）。

边界：已保存文件包的团队协作复用现有受控 SOP；单成员直接委派、自然语言 Workflow 自动编译、二进制头像/bin PATH 安装尚未完成。未安装 preview、未运行付费模型、未做浏览器视觉验收，不能据此宣称达到全部 WorkBuddy 体验。ADR-0021与工作范围已回填；未提交推送，保留其他AI的共享改动。

## 2026-09-13：Skill 开发规范纳入工程约束

按用户要求新增 [Skill 开发规范](SKILL-DEVELOPMENT-STANDARD.md)，并在根 AGENTS.md 的“指令与技能质量”中加入强制引用。覆盖 Markdown 内容源、按需资源、真实工具、运行依赖、发布资源、产物交付、验证和许可证。规范适用于内置技能及创建器生成的技能；此次仅加入开发约束，不宣称现有技能已全面符合，也未实现自动检查器。

验证：文档引用和本次 diff 空白检查通过。未执行：build、typecheck、运行测试（仅文档变更）。后续在具体技能开发与审查时执行本规范；不改变当前开发顺序，未安装 preview、未提交推送。

## 2026-09-13：TM-01 运行接入实测通过（生产工具、插件托管 provider、三闸门）

按用户“运行接入”指令完成 TM-01 收口切片：one-shot 适配迁入专家插件正式生命周期、六项 AI 可调用受控委派工具、签收/交接/交付三闸门文件版本校验。`probe-expert-team.mjs --team`退出0，`outcome=expert-team-verified`、`teamReady=true`、`teamNativeChildren=13`；7项检查全部通过，机器证据在`.artifacts/expert-team-probe/team-result.json`。

实际组合：隔离 home 加载与目标 Profile 相同的官方行，按生产入口装载插件——`TeamRunsManager`子Fiber + 六项`workdsh_expert_team_*`工具 + 专家插件自有one-shot委派provider（`ctx.effect`托管注册/撤销/清理，启动授权统一走`ctx.workdshTeamRuns.admission`）。正例：两位已有专家在真实host会话中经工具6次委派完成draft/publish两阶段生成与交叉评审，三处pin（draft输出、publish输出、交付）sha256等于盘上字节（`15c02643…`）；重复交付与已验收重派被拒（`already-delivered`/`sop/attempt-not-retryable`）、跳步在预留前拒（`sop/predecessor-not-accepted`）。反例：外部改写文件后在签收/交接/交付三处均被`stale-artifact`拒绝（交接拒绝不留尝试与预留），回写同字节后复过，最终`acceptedVersion===deliveredVersion`（`96cf23a8…`）；用户取消主持人回合后host/成员原生aborted、尝试弃置、重试新尝试评审accepted。独立进程冷读3运行/2交付/2含弃置尝试，`deliveryArtifactMatch=true`、`executionResumed=false`。

新增代码（专家插件内部，未发布未安装preview）：`runtime/delegation-provider.ts`、`tools/team-tools.ts`、`services/team-runs.ts`、`storage/team-domain.ts`、`domain/team-sop.ts`、`scripts/probe-expert-production.mjs`，以及`execution-guard`/`experts-manager`/contracts的delegation扩展。探针暴露并修复一个真实产品缺陷：`open`工具输出schema缺`delivered`/`max_total_attempts`被官方`additionalProperties:false`拒绝。

回归（Node 22.23.2）：根build、typecheck、集成88/88、规划测试2/2、check:plan（28模块/50文档）通过；`--adapter`/`--sop`/`--integration`回归退出0不变。注意：本机shell默认Node v21.0.0，`Promise.withResolvers`缺失导致部分测试挂起/失败，须显式使用仓库要求的v22.23.2（`.node-version`）复跑。

未执行：团队创建/编辑页面（本批明确不做）、完整生产Profile安装、付费模型自主编排与专业判断、进程kill中途恢复、Windows/Linux沙箱差异、完整AT-T01～07。**TM-01整体退出与TM-02～04准入等待用户验收，未标记完成；**未修改Harness、未改用户preview或根依赖、未提交推送，新证据与交接位于忽略目录，提交须显式纳入。

## 2026-09-13：TM-01 目标 Profile 组合、文件成果版本与中断对账通过

按交接包第0节完成TM-01剩余三项应用集成验证。`probe-expert-team.mjs --integration`退出0，`outcome=expert-integration-verified`、`integrationReady=true`；10项检查9通过、1项设计性缺口，机器证据在`.artifacts/expert-team-probe/integration-result.json`。

实际组合：加载与preview一致的21项官方模块；工作区工具15个（核心10个全在）；静态盘点实际安装专家preset（31行）与dsh-base补丁；`sandboxPolicy.defaultMode=workspace-write`且session级resolve一致；工作区内fs/bash写入真实成功、工作区外fs拒绝（isError）、bash以seatbelt非零退出拒绝。缺口：stock原生委派工具被专家guard在子模型前拦截（子任务0请求/0输出，父任务3请求含官方`subagent-settled`唤醒），拦截符合绕行防护；受控委派工具接入不在本批。

文件版本：真实文件v1（`15c02643…`）经指定评审返工（意见文件同pin）→v2（`c3f99a97…`）→publish经官方`present`真实交付并pin同一v2字节→发布评审accepted；两阶段全部pin由Host重读同字节；漂移后`stale-artifact`拒绝、回写同字节复过。中断对账：取消（写入副作用已存在时abort）后同label重跑拒绝（`experts/conflict`）、同operation重放同binding、异载荷`experts/idempotency-conflict`、`abandon`后补记拒绝（`output-immutable`）且请求数不变，新operation第2次尝试复评审accepted；不确定派发先重放对账（不重派）再记录一次、二次拒绝。独立进程冷读14份session/10份专家子历史，8项restored全true、`executionResumed=false`不自动恢复。

新增代码仅`team-sop.ts`的`SopReceipt.artifacts`/`verifySopArtifacts`、`scripts/probe-expert-integration.mjs`、主探针`--integration`分支；文件读写/present/沙箱/审批仍归官方。回归：三模式退出全0；根build、typecheck、88项测试、check:plan（28模块/50文档）通过。未执行：crash mid-write对账、Windows/Linux沙箱差异、workflow/ralph动态行、生产Profile安装、付费模型、团队UI及完整AT-T01～07。`integrationReady=true`仅指本隔离组合通过，不等于生产接入或D04/D11完成；provider与Host装配暂仅在隔离探针；未提交推送，新证据与交接位于忽略目录，提交须显式纳入。

## 2026-09-13：TM-01 有限 SOP 验证通过

交接补充：已在[实施入口第0节](design/experts/TEAM-IMPLEMENTATION-HANDOFF.md#0-发给接手-ai-的指令)整理可复制的接手指令、剩余有限范围、最小回归命令及本地未提交/忽略文件的移交说明。其他AI可在同一workdsh工作区接手；尚未创建其他任务、派发执行或提交推送。此次补充仅文档，不新增运行验证结论。

按用户“SOP你先验证”完成内部业务策略与真实原生子任务探针。`probe-expert-team.mjs --sop`退出0，8组SOP检查（总11组）通过：未验收不放行、指定评审/当前正文版本、有限返工、评审取消不签收不重置预算、单Host存储CAS、执行前撤销复查、provider及真实可见原生工具绕行拒绝。独立Node进程冷读11份one-shot子历史及业务记录，验收版本和预算仍保留，没有恢复执行。

新增专家内部`team-sop.ts`，只拥有业务准入与验收；原生Loop、工具、Session与Storage继续复用官方。Host装配和provider仍仅在隔离脚本中，未安装人工preview、未修改Harness。既有专家18项+SOP5项测试共23/23、专家包build、根typecheck、`--adapter`回归通过。详见[第三批证据](evidence/expert-team-tm01.md)。

规划完整性28模块/50文档、规划测试2/2、三份探针语法及git diff --check通过。当前任务仍TM-01，下一步验证目标Profile工具/权限组合与真实文件版本回执，再迁入专家正式Host生命周期。未执行：完整Profile/浏览器、任意shell/HTTP绕行、跨进程派发对账、真实模型专业判断、文件字节存证、外部写入取消、冷恢复执行、完整AT-T01～07。`sopPolicyReady=true`不等于`integrationReady=true`，D04/D11未标完成；未提交推送。新证据/交接仍位于忽略目录，提交时必须显式纳入。

## 2026-09-13：TM-01 精确专家子任务最小适配通过

实际补了专家Host的`reserveDelegation`/`claimDelegation`、可选子绑定字段与pre-step父关系/工作区/深度校验。固定依赖锁也与专家修订比对；没有新增模型委派工具。测试provider仅在隔离脚本注册，使用公开Agent创建/setup/mount与原生Loop，未接入preview或修改Harness。

`probe-expert-team.mjs --adapter` 6组检查通过/退出0：同一主持人下两个子任务分别读到A/B冻结Skill并completed；错误父任务、重复领取/重放、persona覆盖和continuable启动拒绝；交付前取消无模型调用且清理；活动子任务取消不影响同父另一个活动任务；独立进程读取4份one-shot历史。新增Host测试包含两主体/两组织、并发领取、停用、header不符和冷重启防重复领取，专家集成18/18；专家包build与根typecheck通过。

原Teams基线复跑保持9组观测通过/3缺口/退出2；混装Teams服务及工具时，B子任务读完Skill后被其成员检查拒绝，因此本次明确分开运行组合。**最小适配通过不等于TM-01或专家团整体完成。**下一步只补SOP准入/指定评审/有限返工/工具绕行验证，再冻结生产适配。详见[证据](evidence/expert-team-tm01.md)及[接手顺序](design/experts/TEAM-IMPLEMENTATION-HANDOFF.md)。

规划检查28模块/50文档、规划测试2/2、两份探针脚本语法与git diff --check通过。未执行：生产Profile安装/浏览器、付费模型、真实审批沙箱、外部写入取消、冷恢复执行及完整AT-T01～07。仅workspaceId而无已解析workspaceRef的父binding明确拒绝；不得猜目录。D04/D11和Office延期范围保持，未提交推送。新证据/交接位于忽略目录，提交时需显式纳入。

## 2026-09-13：TM-01 原生团队第一批验证

由当前设计者执行 [TM-01 探针](evidence/expert-team-tm01.md)，实际加载同版本官方 Agent Teams 服务/工具，创建真实子 Agent，运行确定性模型与 Skill 工具。9项观测通过，3项缺口复现；退出码2明确表示默认集成不通过，不能写成团队上线。

两位单专家发布/固定Skill快照、原生任务依赖/CAS、活动成员局部取消、独立进程读取持久历史通过。默认team成员和默认one-shot+persona均继承主持人preset且缺自身绑定，被现有guard在模型调用前拒绝。公开Agent setup能选另一preset，但还需要专家域子绑定及受控provider；全局setFactory不能用于覆盖原生owner。原生task completed不等于专业验收。

台账activeSlice切换为expert-team-tm01；原Office专项保留在deferredSlices，D04/D11未标完成。下一项仍TM-01：最小公开provider+业务绑定适配的完整生命周期验证；完整生产Profile/跨组织E2E/真实模型/外部写入取消/团队UI未执行。未修改产品runtime、上游、用户preview或根依赖；未提交推送。规划检查通过（28模块/50已登记文档），规划测试2/2、脚本语法及git diff --check通过。完整产品build/typecheck未重跑，因为产品源码未变；--prepare下载装配路径与缓存复跑均执行，默认集成仍以退出码2拒绝签收。

## 2026-09-13：专家团设计收敛为实施交接

按用户“设计应能交给一般 AI 开发”的要求，新增 [TEAM-IMPLEMENTATION-HANDOFF](design/experts/TEAM-IMPLEMENTATION-HANDOFF.md)：固定首版产品范围、现有服务复用位置、拟新增领域字段/方法、整团部分发布回执、阶段准入/评审、取消与未知结果规则，以及 TM-01～04 文件级顺序和12条验收场景。TM-01 明确先验证官方 Agent Teams 的两位专家精确组合与自身绑定；公开接点不支持时给出失败证据和有限备选，不虚构 API。

交接索引、方案、契约历史说明、计划和 ADR 已同步，旧 workflow/one-shot 唯一路线不再作为实施要求。当前仅文档，D04/D11台账未修改；启动优先实施时先记录顺序例外，保留未完成模块。规划完整性检查通过（28模块/50已登记文档），规划测试2/2通过，新交接4个相对链接及12条验收场景核对通过，git diff --check通过；运行构建、团队探针、真实模型和浏览器验证均未执行，未安装 Profile、未提交推送。新交接文件位于仓库忽略的 docs 目录，后续提交须显式纳入，不能只提交引用它的已跟踪文件。

## 2026-09-13：我安装的独立页面（入口导航，参考 WorkBuddy）

用户反馈「我安装的 N」不可点击、已安装技能只内联在市场页。skills 0.1.0-alpha.27 / ui 0.1.0-alpha.5 把市场头部「我安装的 N」改为可点击入口，进入同一面板内的独立安装页：顶部「全部技能」返回链接、计数标题、右上「批量管理」与「搜索已安装的技能」页内搜索；卡片、启停、详情、安装与批量选择复用市场同一实现，不新增第二个 main 注册、URL 映射或安装路径。进入与返回重置面板滚动，焦点分别迁移到返回链接与入口按钮；ui 包新增 back 图标（alpha.5）。

验证：ui/skills build 与 typecheck 通过；`probe:skills` 8/8 段全部 PASS（新增安装页导航、页内搜索过滤与空结果、批量开关、返回焦点与滚动归零断言，截图 `.artifacts/skills-standalone/installed-page.png`）；18989 活预览重装 alpha.27 后实测入口「我安装的 163」、安装页标题、返回链接聚焦、滚动归零、四列卡片、页内搜索过滤与空结果、批量选择/退出、返回后焦点回入口，pageerror 0（browser-use 原生视图不可用，改用无头 Playwright 核对脚本 `.test-runtime/preview-check-18989.mjs` 并人工查看截图 `18989-installed-page.png`、`18989-installed-search.png`、`18989-market-top.png`）。

探针附带修正：bundled 断言原检查未加前缀的 `skill-creator`（重命名前旧构建），修正为循环断言五个 `workdsh-` 前缀技能各注册一次；经 alpha.26/alpha.27 tarball 解包对比确认为上一轮重命名工作遗留，与本轮 UI 无关。旧 `probe-browser.mjs` 技能段滞后不维护。未执行：URL 深链、安装页状态跨会话记忆、真实模型调用。

## 2026-09-13：AUTHORING-01 腾讯内容制作方法适配与 Preview 安装

新增 workdsh-ppt-design、workdsh-word-design、workdsh-excel-design、workdsh-web-design 四个 bundled只读指南及八份配套参考，使用官方 SkillRegistration/resourceBase，不复制腾讯转换器/SDK/子代理流水线。PPT补逐页叙事、视觉系统与原生图表；Word补体裁、层级与交付；Excel补schema、实际行号、公式与审查；网页补价值叙事、令牌、响应式、中英文与真实交互。Office默认Word/PPT引导按需使用相应指南。

[来源与复用记录](design/TENCENT-AUTHORING-ADAPTATION.md)限定相关入口、重点参考和脚本依赖，未宣称完整审查全部目录/许可。统一spreadsheet/html新建与高级格式仍未实现，指南明确禁止猜工具分支或冒充已生成文件。此增量是专业方法增强，不是四类完整编辑能力上线。

Node22.23.2下Skills与Office构建/typecheck通过，技能Host+Office内容10项、卸载生命周期1项通过，官方get/render与引用文件存在验证通过。修复Office既有构建路径依赖cwd的问题：两处路径改由import.meta.url定位，标准包构建通过；首次失败测试曾使用旧Office产物，重新构建后已重跑通过。

官方CLI以哈希制品地址更新preview Skills/Office，两包Host/Client及八份安装参考逐字节一致，重启18989。已认证管理list HTTP200/ok=true确认四指南readonly可用。用户原版技能/其他插件未改动，未提交推送。真实模型四类成品、视觉检查、Excel公式重算与交付质量未执行，后续分别验收；D04保持当前阶段。

## 2026-09-13：CREATION-01 内置创建方法与参考接入

已增强 Skills/Experts 两套实际 bundled 指南：案例驱动与资料转化、专业判断尺度、编辑保护、真实成果和未执行试用的状态区分。新增四份包内 references，以官方 SkillRegistration.resourceBase directory 接入，Skills 独立包新增 resources 文件清单。旧技能指南的工作区发布承诺已修正为真实工具支持的 shared-agents/profile；未支持的资源树不冒充已发布。

官方复用记录见 [深度分析](design/WORKBUDDY-CREATION-PROMPTS-DEEP-ANALYSIS.md) CREATION-01。Node 22.23.2 下两包构建与 typecheck 通过；技能 Host/管理及专家管理/成果 28 项集成通过，其中实际官方 get/render 保留资源目录且引用文件存在。两包本地 pack 的归档均包含相应 references，git diff --check 通过。

未修改用户 preview 技能、未安装候选包到运行 Profile、未执行模型 A/B、未提交推送。当前 D04 保持不变。下一步：资源树草稿接口与独立完整性检查，再进行单技能/单专家真实模型专业试用；本切片不宣布这些能力已完成。

## 2026-09-13 创建能力深入分析

进一步核对 WorkBuddy builtin 技能初始化/基础校验/递归打包与专家完整校验/简易注册/过滤打包的实际程序边界，区别指令要求和代码保证。整理资料转化、资源生产、产品发现与专业验收的价值及本宿主适配优先级，见 [深入分析](design/WORKBUDDY-CREATION-REVIEW.md)。本轮仅分析文档，不执行原版写入脚本、不修改用户对象；真实模型效果未执行。

## 2026-09-13 WorkBuddy 原版创建能力对照

阅读用户指定 workbuddy 目录中的 builtin skill-creator、expert-manager 及相关规范/脚本重点，对照当前 WorkDSH 创建服务与指南。明确应保留案例驱动、资料转化、资源组织、编辑保护、校验与交付，原版路径/注册/Team 工具需宿主适配。详见 [创建能力对照](design/WORKBUDDY-CREATION-REVIEW.md)。仅文档整理，未改 runtime、用户对象或 Profile；真实模型创建/分享验收未执行。

## 2026-09-13 Preview 实际技能清单

按用户纠正，从运行中 preview 已认证管理接口只读取得 list/catalog（HTTP 200、ok=true）。管理 161 条：149 启用、2 只读、1 停用、9 格式异常；151 可被模型调用。市场 170 条，137 本地 installed。已整理全量分类、核心能力、异常状态和多版本来源边界，见 [清单](design/PREVIEW-SKILLS-INVENTORY.md)。实际 skill-creator 是 WorkDSH bundled 指南；腾讯 PPT 不在当前 list/catalog。未逐项执行技能、修复异常、改用户文件/配置或启动模型测试。

## 2026-09-13 优秀技能设计整理

核对本机 tencent-pptx、ppt-implement、市场/WorkBuddy/Codex 多版本 skill-creator；整理叙事、具体视觉系统、渐进引用、确定性脚本、校验与交付方法，区分来源及本项目原生适配边界。详见 [优秀技能整理](design/EXCELLENT-SKILLS-REVIEW.md)。不按长度否定优秀技能，未改用户技能、运行引擎或 Profile；真实成品验证未执行。

## 2026-09-13 只读技能质量审查工具

已新增 audit:skills 工程工具与 3 项相关测试，不改运行时技能加载或用户文件。本机扫描 215 文件，139 个有启发式审阅项，主要为描述较长；不等于不可用或官方运行冲突。完整本机路径报告留在忽略的 .artifacts，公开文档仅记录汇总。详见 [审查文档](design/PROJECT-INSTRUCTION-AUDIT.md)。测试通过，模型 A/B、产品 UI 接入及全量构建未执行；currentStep 不变。

## 2026-09-13 项目级指令与技能审查

按用户授权对整个项目应用 OpenAI 指令/技能文章的原则，核对开发规则、技能格式校验、专家官方 preset 编译与交付字段、Office authoring/export 指令。已修正 AGENTS 按任务读文档及历史 D00 限制；详见 [审查与有限改进方案](design/PROJECT-INSTRUCTION-AUDIT.md)。未改运行代码、用户技能或专家修订。后续技能质量建议和多模型 A/B 尚未实现/执行，不更改 D04 顺序。验证见审查文档；模型与产品构建测试未执行。

## 2026-09-13 中英文产品网站上线

按用户要求提供 WorkDSH 中英文产品展示网站，英文默认入口 https://techflag.github.io/workdsh/ ，中文入口 zh-CN.html。页面包含真实开发截图、PPT/技能/文档切换、架构与快速开始入口、开发预览边界及开源致谢。网站通过 GitHub Pages 官方 Actions 自动部署，首轮部署运行 34711881370 成功，双语更新运行 34712076797 成功。线上中文页面 lang=zh-CN、无控制台错误、手机无横向溢出。中英文页面经 Playwright 检查，截图切换正常、390px 手机布局无横向溢出。此网站为静态产品展示，不包含应用运行服务。

## 2026-09-13：英文产品网站与 GitHub Pages

- 用户授权参考 Hermes Studio 制作英文产品网站并托管 GitHub。新增独立 `website/` 静态目录及官方 Pages Actions，不运行模型或暴露工作区。
- 包含当前产品定位、PPT/技能/文档交互截图、独立插件说明、真实预览边界和开源致谢；不复制参考站代码和品牌。
- 桌面/390px 手机布局、截图加载、tab 切换、无控制台错误/横向溢出已验证。GitHub Pages 首轮部署成功，双语更新及线上验证见顶部记录。


## 2026-09-13：README 截图与 GitHub 源码预览发布

- 已推送源码 `0b042c5` 与 `office-v0.1.0-alpha.3` tag，并确认 GitHub prerelease 发布（无实验安装包附件）。用户授权推送与发布；中英文 README 增加最新 PPT 应用截图，开源组件、用途、许可和 WorkBuddy/CodeBuddy 致谢。
- 更新依赖后全量测试发现 ProseMirror model 双版本，统一为 1.25.11；全量类型检查、71 项集成测试、Office 构建和 PPT 浏览器回归已通过。
- Office alpha.3 本次为源码 GitHub prerelease，完整实验构建的第三方许可正文仍待核验，不上传未清理的实验安装包；npm 发布未执行。真实模型 PPT 视觉质量及新最终文件卡端到端未执行。
- 宣传文案已准备，Twitter 发送未执行。后续继续当前唯一 PPT 编辑器的品质验收和许可核验。


## 2026-09-13：PPT 最终产物与腾讯设计流程适配

- `content_export` 扩展原生 PPTX 分支，复用官方 bash/present 策略链路，直接交付已保存字节，保留组织授权、修订检查、稳定文件名、冲突拒绝与重试。
- 完整查阅本机 tencent-pptx 主技能及制作、叙事、设计规则，补每页观点、视觉节奏和具体日报版式指导；不重引入腾讯引擎或中间文件构建流程。
- Office 构建、类型检查已通过；新增文件交付字节/回执、同修订重试、修订冲突、文件覆盖冲突测试。官方真实会话产物卡端到端和模型美观度验证未执行，预览更新需服务重启生效。


## 2026-09-13：PPT 集成 UI 样式回归修复

- Word 容器的通用 button/select 样式原先穿透原生 PPT 子树，造成按钮边框和密度变化；现在明确排除 `.workdsh-ppt-editor` 后代。
- 固定版本构建适配移除重复原生 TitleBar，保留自定义中文文件标题与工具栏；补备注及状态语言文本。
- Office 构建、类型检查、浏览器回归通过；探针加入真实 Word 祖先样式，验证工具栏按钮无边框、无重复 AutoSave、原生图表数据修改保存及卸载。查看修复后截图确认紧凑灰黑工具栏和侧栏；剩余少量原生英文标签待后续处理。正式应用截图及真实模型视觉验收未执行。


## 2026-09-13：README 当前预览与来源致谢

- 中英文 README 新增用户提供的技能市场应用截图、当前原生 PPT 开发集成范围、主要开源依赖用途/许可及 WorkBuddy/CodeBuddy 体验和技能设计参考致谢。品牌、第三方技能及费用插件与随包依赖明确区分。
- Office 第三方声明移除已删除的旧 PPT 适配器描述，补当前 Apache-2.0 pptx-viewer 与本地化/图标来源。
- 核对本地包元数据与图片路径；未执行构建、产品测试或发布（仅文档和截图更新）。下一步仍为原生 PPT 实际模型流程与视觉验收。


## 2026-09-13：原生 PPT 生成路径与设计指导补强

- 截图对应 preview 会话包含现有原生 PPT 指导和通用 PPT 文件生成技能目录，仍执行了 `build_deck_v4.py`。这说明模型延续了文件生成流程，不能据此判断旧 CreatPPT 在运行；未证明模型实际读取了 `pptx-generator` 技能正文。
- Office 提示词明确普通制作、重新生成、压缩页数和美化请求默认使用原生 `content_*`，不执行其他 PPT 引擎或文件生成技能的构建命令。既有独立 PPTX 预览与 live working copy 的边界保持明确。
- 查阅本机 WorkBuddy 的 `ppt-implement`（网页演示模板流程）和 `tencent-pptx`（依赖腾讯 slidep 工具）。只借鉴叙事、字号层级、配色、视觉焦点和布局对齐建议；未安装其运行时或重新引入另一套 PPT 引擎。
- 已通过 Office 类型检查、构建及 8 项内容服务集成测试。实际模型在新指导下生成的美观度及流程遵循尚未验证；不能将提示词改进等同于视觉验收。


## 当前：技能弹框与市场卡片对齐 WorkBuddy（2026-09-13）

技能目录预览/详情弹框继续复用 workdsh-ui 公共 Modal（未改公共默认宽度与无障碍行为），仅经插件级高特异性类名收窄：预览 720px、详情 820px、确认 480px；图标 64px（原 112）、标题 24px（原 32）、关闭按钮 40px 与标题行垂直居中（实测中心 206.73=206.73），小节改名「基本信息」并修复「概述」缺失图标；修复预览弹框「＋ 安装」按钮被卡片圆形样式挤压致文字换行。市场卡片高度 190→152→131px（内容自然高度：内距 14px、描述上边距 6px、无底部空余），对齐 SkillHub 更扁的列表观感；分类标签栏隐藏滚动条（保留横向滚动）。探针弹框回归断言（宽度≤760、图标 64、标题 24px）不变，`probe:skills` 7/7；18989 实测卡片 131px、预览 720px/详情 820px、可安装 33 全图标、pageerror 0。截图 `.artifacts/skills-market-top.png`、`.artifacts/skills-market-preview.png`、`.artifacts/skills-market-detail.png`。注意：preview 的 office 存储中一条旧 schema 文档（用户 PPT 工作遗留）与新版 office 构建不兼容阻塞启动，已备份迁至 `.artifacts/office-documents-quarantine/`（可还原）。

## 当前：技能市场对标 WorkBuddy 完成（2026-09-13）

skills 0.1.0-alpha.26 把技能页升级为与 WorkBuddy 相同体验的一体式技能市场：14 个真实分类标签、「可安装 34」与「已安装 160」分区、卡片品牌图标＋中文名＋中文描述、未安装项「＋」直接安装（复用官方 installImport 名称锁与原子发布，不新增第二套安装路径）。目录为 WorkDSH 自有 `~/.agents/.workdsh-catalog`（170 条/13 分类/76 图标），缺失或损坏时返回 missing/invalid 诊断不造假，超限条目保留展示并禁用安装。验证：技能相关集成 20/20、`probe:skills` 7/7、skills/experts typecheck 通过、18989 活预览实测 pageerror 0（图标路由 200 image/svg+xml）。`check:plan` 失败为未跟踪的 packages/pptist-adapter 未注册，属 PPT 工作遗留，与本次无关。见 [evidence/skills-browser.md](evidence/skills-browser.md)。

PPT体验页恢复单一完整原生编辑器：原生右侧数据配置与画布同屏，撤掉进入返回流程；600px侧栏流布局和修改数据保存重开通过。中文工具栏完整整理仍待完成。

窄屏图表配置修复通过：600px实际点击入口、原生Inspector展开、修改数值与返回保存重开均通过；标题栏避免窄屏面板遮罩拦截。

图表配置试验入口通过：选中图表进入完整原生编辑器，修改后返回并保留内容；数据8/3保存重开通过。原生面板汉化、顶部遮挡及窄屏待完善。

<!-- PPT trial update: 2026-09-13 -->
中文分组工具栏新增切换、动画：原生 transition/animation callbacks；600px 视觉检查通过；probe-effects 验证应用全部、保存重开、画布选中后移除动画。美化、放映及图片选择仍待组合界面挂载。

## 当前：折线图插入按钮窄窗口可用（2026-09-13）

experience.html加入常驻图表类型与插入入口，复用原生onAddChart；600px折线图插入、保存独立回读、重新打开通过，pageerror0，缩略图同步显示。原下拉只选类型而插入按钮在右侧被挤出视口是本次根因。原生默认插入位置可与现有元素重叠，用户可移动。探针probe-insert-line.mjs，仍为隔离体验。

## 当前：完整原生图表面板修改保存重开通过（2026-09-13）

1400px full-desktop.html人工图表数值7→8、导出独立回读和完整组件重开通过，pageerror0；中文覆盖630/3620。背景与页面设置、放映、窄屏展开面板仍待验，当前experience.html保持组合布局并同步汉化。未接正式产品或发布。

## 当前：第7页缩略图与编辑后同步修复（2026-09-13）

experience.html由静态六图改为按页面ID实时生成预览，新增/修改/调换/删除后同步，生成中显示16:9占位。文字更新、新增第7页、快速调换删除、图片加载和pageerror0通过，视觉复核无破图。探针scripts/pptx-trial/probe-thumbnail-sync.mjs，原体验页刷新可看。全面汉化和完整面板仍继续验收，正式产品未替换。

## 当前：对标完整编辑体验，验证完整原生桌面承载（2026-09-13）

恢复完整PowerPointViewer隔离试验，构建内第三方移动判定桌面适配，700px六页/pageerror0及画布正常；1400px图表属性面板可显示。19093/full-desktop.html仅新隔离对照，展开两侧面板、全汉化、保存编辑与放映尚待验，原experience.html保留。该补丁不是公开SDK配置，正式采用需版本约束与完整回归。Word暂停，不替换18989。

## 当前：对照参考图补常用汉化和文件名（2026-09-13）

PPT体验样板中文词典覆盖507/3620，补设计菜单提示与文件名标题、缩小缩略图标题；隔离构建补6类硬编码英文标签，vendor源文件未改。可见标签浏览器检查及pageerror0通过。组合模式主题编辑及完整属性面板仍缺失，未宣称完整编辑能力，不接正式产品。体验19093/experience.html刷新可看，证据见office-pptx-react-trial。

## 当前：PPT样板补缩略图、缩放与常用汉化（2026-09-13）

复用公开SVG导出生成六张样板缩略图；600px加载、切页、公开缩放/适应窗口通过，pageerror0。中文覆盖372/3620，画布靠上显示。体验URL19093/experience.html不变。缩略图编辑后同步、全面汉化及完整属性弹窗尚未接，仍为隔离体验，不替换18989。

## 当前：600px PPT体验页改为桌面组合布局（2026-09-13）

使用公开Toolbar/SlideCanvas/useViewerBuildingBlocks，保留桌面顶部功能区和左侧页列表；600px六页加载/第三页焦点/画布元素/pageerror0通过。体验19093/experience.html刷新可看，不修改window断点或第三方内部实现。完整属性弹窗和编辑导出回归仍待验，仍为隔离布局原型，未接正式产品。

## 当前：中文PPT体验样板完成，窄侧栏未达标（2026-09-13）

19093/experience.html提供原生完整组件六页中文演示日报，含70%饼图；271/3620项翻译，六页/公开翻页/pageerror0通过。视觉复核宽窗口内容正常，800px窄窗口属性面板挤占画布和功能区截断，仍不满足桌面侧栏编辑要求。下一步验证公开组合组件布局与必要操作，不直接正式接线。详见[evidence/office-pptx-react-trial.md](evidence/office-pptx-react-trial.md)。原18989未替换，Word暂停。

## 当前：React PPT接入前两项边界试验通过（2026-09-13）

五类原生新建图表工作簿导出增强、原生面板修改后同步写回、重复补全及既有工作簿原字节保留通过；OpenXML验证0错误、LibreOffice打开通过。限定容器CSS挂载/卸载保持宿主按钮/边距/输入正常；图表数据面板文字对比度修正并视觉复核。脚本已保留到scripts/pptx-trial，见[evidence/office-pptx-react-trial.md](evidence/office-pptx-react-trial.md)。19093/scoped.html仅独立体验，默认原生下载尚未自动接补全；18989未替换、Word暂停、费用插件保留。下一步正式React Slot与同一Office服务/导出接线，实际AI逐页跟随、完整主题弹窗、PowerPoint/WPS及发布门禁仍待验。

## 当前：React PPT图表面板与导出边界验证（2026-09-13）

用户继续授权pptx-react-viewer候选。原生面板人工修改新建/导入饼图并保存回读通过；导入8图/8工作簿保留且chart缓存与xlsx数值同步；新建图表仍无工作簿。LibreOffice独立打开/导出5页和8页通过，不等于PowerPoint/WPS数据编辑签收。900px宿主外部输入及卸载后输入正常，但原样随包CSS全局重置body/button且卸载后保留，正式接入前必须解决。证据见[evidence/office-pptx-react-trial.md](evidence/office-pptx-react-trial.md)。本轮不替换18989、Word暂停、费用插件保留。下一步样式边界/新建工作簿可用路径→正式React Slot同服务接线；实际Harness联测/完整发布门禁未执行。

## 当前：iOfficeAI/OfficeCLI独立PPT验证（2026-09-13）

按用户指定测试既有officecli1.0.149，五类原生PPT图表创建、数据修改关闭重读、OpenXML验证、watch真实SSE刷新及五图视觉检查通过。导出无嵌入工作簿，Office/WPS数据编辑待验；watch goto不支持PPT元素且第五页修改不自动进入视口，不能视为实时焦点需求完成。19094原生预览供体验，原18989/19093不替换、不新增安装或模型配置。见[evidence/officecli-ppt-trial.md](evidence/officecli-ppt-trial.md)。下一步按用户选择明确文件操作工具/可视化编辑器职责；真实模型及Harness接入、全类型/图片表格、发布门禁未执行，Word暂停、费用插件保留。

## 当前：用户指定React PPT编辑器隔离测试（2026-09-13）

pptx-react-viewer3.16.5/core3.14.3独立测试通过：五种常见图表、多页原生React界面、人工文字编辑及翻页、公开API修改/焦点/撤销重做、PPTX保存重载、组件卸载，无pageerror；导出含5原生图表XML但没有嵌入工作簿，PowerPoint/WPS编辑数据未验证。19093本机试验供体验，不替换18989、Word暂停、费用插件保留。区分用户新发的两个同名OfficeCLI项目，仅核对文档和本机既有1.0.149帮助，不新增生成流程。证据见[evidence/office-pptx-react-trial.md](evidence/office-pptx-react-trial.md)。下一步核验图表手工数据编辑与工作簿导出后再确定接入；真实AI/Harness联测及产品全量门禁未执行。

## 当前：重新调查可嵌入React PPT编辑器（2026-09-13）

按用户要求暂停PPTist接入，调查项目官方文档与npm元数据，找到SlideWise（MIT，发布1.21.1、React19）及pptx-react-viewer（Apache-2.0，发布3.16.5、React18/19）；两者提供正式组件及内容/保存接口。ONLYOFFICE提供正式React集成及全面图表，但需Document Server，外部Automation API为Developer能力。见[候选比较](design/office/PPT-EDITOR-CANDIDATES.md)。建议先隔离验证SlideWise、第二候选pptx-react-viewer；具体图表/新建/UI/导出/焦点/卸载兼容尚未实测，不替换默认编辑器，不改18989。PPTist未完成候选代码保留，Word暂停、费用插件保留；产品全量门禁未执行。

## 当前：暂停PPTist实现，先核对官方接入契约（2026-09-13）

按用户要求只做技术核对，未继续接入代码或安装。核对本地官方Client Modules/Slots/Sidebar Right/Web Client/Resources说明及rc.1发布包公开声明：正式页面扩展为React Slot + Tab；没有找到Vue/iframe专用SDK，不能将浏览器隔离策略当作官方推荐。技术结论见[接入边界](design/office/PPTIST-INTEGRATION.md)，修正ADR-0027。下一步优先限定容器的Vue挂载兼容验证，验证后再确定承载。此前新增适配代码仍为未通过候选：隔离桥接未就绪，ProseMirror类型重复；正式接入/迁移/根全量门禁未执行。18989仍为旧候选加费用插件，19092独立演示；Word暂停。

## 当前：PPTist 直接挂载可行性验证（2026-09-13）

用户要求尽量复用原生能力。独立Vue挂载构建及浏览器探针通过：原生编辑器显示、组件卸载、无pageerror；确认全局CSS改变宿主body overflow，原生App的onbeforeunload卸载后未恢复。源码还存在body Teleport、document查询和全局拖动事件，原样直接挂载不能交付。见ADR-0027和scripts/probe-pptist-mount.mjs；只修改隔离试验，不替换18989。用户已确认商业授权后期付费，接入继续授权；下一步采用最少原生修改的文档隔离适配同一Office服务，或完成直接挂载全部边界改造。正式接入/旧数据转换/根完整门禁未执行。费用插件安装保留，Word暂停。

## 当前：安装第三方费用统计插件（2026-09-13）

按用户要求，暂缓PPTist接入，通过官方 npm 插件命令安装 `dsh-cost-meter`，解析版本1.7.21。实际命令为 `DSH_HOME="$PWD/.test-runtime/preview" node node_modules/@deepseek-ai/dsh/lib/bin.js plugin --profile preview add dsh-cost-meter`；当前18989属于preview，未改其他web Profile或默认产品bundle。已重启人工预览；日志确认Host加载账本，隔离浏览器确认Client资源加载、无pageerror。费用设置页及真实调用金额核对未执行；用户刷新18989后体验。PPTist接入尚未实现，用户已明确后期商业付费，继续保留单编辑器接入任务。

## 当前：PPTist 八类原生图表验证（2026-09-13）

用户要求常见PPT图表，暂停扩大CreatPPT，按ADR-0027验证单一PPTist底座。固定官方提交e4912589ffdbec389fcc1bf25a85852dfe3040a8/package2.0.0，AGPL-3.0，private应用无发布嵌入SDK。原生构建通过，4项浏览器验证通过：8类图表显示、饼图数据编辑、JSON文件保存重开、PPTX包含8个原生图表对象/8个嵌入工作簿。19092独立原生体验已打开，默认8页示例；仅替换公开mock数据，未改编辑器实现。见 evidence/office-pptist-u1.md。

18989仍使用原有候选，旧稿件保留，没有并行默认编辑器。下一步定义PPTist与现有Office服务/AI同一接口的受控接入，核对许可兼容和完整资源。原生AI按钮尚不是WorkDSH AI；完整字体资源、Office/WPS视觉验收、根完整门禁未执行。Word暂停及八类路线保留。

## 当前：PPT 逐页提交与明确制作页（2026-09-12）

按用户要求改为通用逐页制作契约：新建初始化一页；AI每次内容提交最多新增/更新一页，结构操作可以原子批量执行，原生人工整稿保存保持原有能力。快照持久化 focusSlideId，右侧优先展示该页，避免模板归一化错误选封面。CreatPPT statement 只渲染 title/body、agenda 渲染 bullets 的原生限制已进入能力描述。类型检查/构建、8项内容集成（含多页内容拒绝、结构批处理、冷重开焦点）、实际应用9项回归通过。真实模型自然语言“五页PPT”验收通过：约5.48秒建稿，7.64/8.73/9.86/12.04/13.12秒逐页提交，最终6次提交/5页，原日报保留，无脚本绕行，最终画布显示 focusSlideId 对应页。首次模型试验逐页成功但因列表版式说明不足查了本地实现，修正 API 描述后复测通过。

18989候选经官方CLI安装并重启，Host/Client编译字节核对一致；浏览器需刷新加载新版。连续快速提交时轮询可能合并中间帧，不承诺逐字动画。旧会话实际压缩7→5页、PPT文件卡、完整发布检查未执行；PPT未发布，Word暂停及八类路线保留。见 evidence/office-creatppt-u2.md。

## 当前：PPT 跟随实际变更页（2026-09-12）

用户反馈7页成稿但看不到制作变化。先前每次提交固定选最后页，改为对前后已提交DeckSpec比较，选择首个新增/内容变更页，删除/排序时选择受影响位置；初次打开仍从首页开始。仍以真实提交为刷新边界，不伪造逐字/逐页动画。类型检查/构建通过，实际应用9项回归通过（含中间页修改自动展示），18989候选已安装核对Host/Client字节并重启，浏览器需要刷新加载新Client。模型单批提交时不能声称有多个制作阶段；PPT原生文件卡仍未完成，八类范围与Word暂停不变。

## 当前：PPT 直接编辑与中文翻页修复（2026-09-12）

用户日志session.v32确认工作副本已保存多页，文件交付卡缺失因为PPT content_export未实现。中文原生按钮匹配错误导致就绪/翻页失败；全屏不能点击由于只读iframe被inert。按用户决定，PPT默认直接原生编辑，取消页面编辑模式及租约；人工保存仍经同一授权/审计/CAS服务，Word规则保留。页面有未保存输入时阻止AI修订重载，冲突保留缓冲。中文900px/展开1600px原生页面翻页/下载测试已通过；新版实际应用8项回归通过，18989修复候选已通过官方CLI安装、编译字节核对并重启；浏览器旧页需刷新加载新Client。PPT成品受控导出/官方文件卡仍是未完成项，不以浏览器下载替代。见evidence/office-creatppt-u2.md。

## 当前：PPT 原生应用闭环与真实模型验收（2026-09-12）

CreatPPT 0.1.4 已通过同一 Office ContentService/六工具/官方右侧 Tab 接入；采用发布包原生 Vue/SVG 页面与公开 DeckSpec API，不加载其 DSH 插件或另建存储/服务器。12项内容/原生页面集成、Office构建和类型检查通过；PPT实际Harness应用8项（自动打开、两批同步、人工保存、PPTX下载、刷新重开）及Word应用16项回归通过。详细证据见 [office-creatppt-u2](evidence/office-creatppt-u2.md)。

18989 人工预览已通过官方 CLI 安装并重启 alpha.3 本地候选，Host/Client编译字节核对一致；公开Word alpha.2未变，PPT未发布。真实模型新任务自然语言转换已通过：读取Word参考、保留原件、新建6页PPT、自动打开右侧；实际一次内容提交，无脚本/技能绕行。首个PPT约5.46秒、正文约9.81秒。加入全局pptx/elite-powerpoint-designer技能的隔离新任务复测也通过，无脚本/技能绕行；旧会话回放未执行。下一步根据实际工具选择与技能冲突证据收口；不写死“日报转PPT”或新增Agent loop。PPT文件导入、受控文件交付卡、原生浏览器包完整传递许可审查、PPT安装卸载重装全验收与Office/WPS视觉验证未执行；八类路线/D04/D15保留。

## 当前：CreatPPT 单编辑器接入（2026-09-12）

用户在 19091 体验后确认继续。采用 CreatPPT 0.1.4 发布包，停止自建 PPT 画布扩展；依据 [ADR-0026](adr/0026-creatppt-native-editor.md) 接既有 Office 服务与原生页面。独立页面不等于应用接入完成，PPT 菜单暂不启用。Word 与已发布 alpha.2 保持当前范围。

本轮薄适配器与原生保存/重开/PPTX 下载实测完成，10/10 内容回归和 Office 类型检查通过。无图默认封面原生阻止导出，纯文字生成改用原生 statement/planSlide；未关闭质量检查。证据 [office-creatppt-u1.md](evidence/office-creatppt-u1.md)。正式服务类型、六工具、右侧页面同步、真实模型与制品生命周期仍未执行；下一步从既有 ContentService 扩展 presentation 分支，不新建存储。

# 当前状态与任务台账

更新时间：2026-09-12。

## 当前：PPT方案校正与GenOffice源码复核（2026-09-12）

按用户质疑复核固定GenOffice提交de139a061537bea40f0cc81ef8f09a95f77ac52a：生产结构化页面由自研pptx-engine生成/保存，pptx-render负责布局和RenderTree，Konva/react-konva负责交互；不能把开发依赖PptxGenJS当对方完整生产方案。保留PPT-01新建导出探针，但不提前启用菜单。下一步在PPT-02接线前校正OOXML中心旋转语义和codec/画布边界，随后接原统一服务/工具/右栏。对方private源码包不是已核验发行SDK；本轮只静态审阅，未复制到产品，未决定源码分叉。具体见[复核记录](design/office/GENOFFICE-SLIDES-REVIEW.md)。本轮GenOffice构建/运行、导入往返、应用实时PPT和发布均未执行；Word和18989预览不变。

## 当前：PPT-01 原生适配器探针通过（2026-09-12）

Word后续开发暂停。新增独立presentation语义模型、原子幻灯片/文字/图片操作、MIT Konva10.5.0原生拖动与Transformer缩放、MIT PptxGenJS4.0.1可编辑PPTX导出。按用户要求核对Konva公开API，记录文字输入/绝对坐标/缩放/持久化/销毁边界；修正元素ID混入载荷、销毁期间图片decode中断、Konva原点与PPTX中心旋转偏移。源码alpha.3未发布，不启用PPT菜单，不改18989人工预览，不改变已发布alpha.2。

Office类型检查通过；4项PPT浏览器/模型/导出探针及7项既有内容服务回归合计11/11通过，git diff --check通过。实际画布截图已查看，仅是技术探针；样例PPTX XML核对可编辑中文文字、两页、尺寸和原图片字节。证据见[evidence/office-presentation-u1.md](evidence/office-presentation-u1.md)。全仓构建/检查、真实模型、应用右侧PPT、PPT插件制品安装/卸载/重装、Office/WPS视觉核验均未执行。下一步PPT-02扩展既有统一内容服务类型适配、六工具与右侧页面，并按官方示例接入DOM文字编辑；不复制第二套存储/授权/租约，不新增Agent执行框架。D04/D15不变。

## 最新范围：停止Word后续开发，下一阶段优先PPT（2026-09-12）

用户明确“不用再搞Word了”。保留并完成已授权的alpha.2发布，不继续实施Word列表/样式/图片/表格完善。上述后续项仅保留待办，下一阶段为PPT最小实时制作闭环，再依计划推进其他六类；直接复用开源组件原生能力，不重做工具栏/拖拽等交互。alpha.2已发布且6附件大小/摘要、源码标签及编译字节核对通过，收据见office-word-final-u3.md。

## 本轮：授权发布 Word alpha.2 与下一阶段计划（2026-09-12）

用户已明确授权推送版本。发布Word表格/图片预览，不将每次固定分批作为承诺：编辑器每次提交自动展示，模型可按任务单批或多批；最近自动化的多批/无文件绕行检查未通过，用户实际应用测试可用，保留该差异。构建/类型、69集成、16浏览器、6生命周期、规划检查通过，许可齐全。公开alpha.1保持不变；alpha.2只发布独立Word-only制品及匹配治理配套，不发布npm。GitHub发布验证完成后回填收据。

下一阶段依[开发计划](design/office/NEXT-STAGE.md)先完善Word导入列表/样式、图片定位、表格体验及写作验收语义，再实现PPT最小实时闭环，然后Excel/PDF/HTML/Markdown/画布/多维表格。仍是一个Office插件的类型适配器，不新增理解模块/子智能体/Agent loop。其他七类实时制作与完整Word分页仍待实现，D04/D15不变。

## 本轮：Word 候选收口（2026-09-12）

全仓构建/类型、69集成、check:plan及2规划测试通过；Word-only候选许可齐全，实际卸载重装6项及浏览器16项通过。修正README过时DOCX说明、候选安装路径和公开alpha.1/本地alpha.2边界。真实模型复测未通过多批/无文件绕行断言：任务idle、文档和导出存在，但仅修订1且调用bash/write，明确保留失败。用户催促，停止扩展和反复探针，更新人工preview候选供实际测试；公开发布不执行。详情[收口证据](evidence/office-word-final-u3.md)。完整Word/其他七类、Word/真实IME/完整分页仍未完成，下一步仅原生写作工具策略稳定性，不另做跨文档理解模块。主线D04/D15不变。

## 本轮：跨 Word 工作副本图片引用（2026-09-12）

用户最新范围澄清：文档理解/总结/改写交给模型，不继续扩大跨文档专项。本轮候选代码保留但未提交、未安装到人工预览；18989仍运行上一轮同文档引用版本。无需新增跨文档界面、智能体或理解引擎。

OFFICE-IMAGE-REF-02 扩展已有模型引用，增加源documentId，复用 ContentService 的来源读取与目标编辑检查、组织/工作区边界、哈希校验和原提交路径。跨文档复制保留源修订，目标保存独立图片字节，源删除不影响已复制内容；旧版同目标短引用兼容。工作副本以外文件资源/远程URL及其他七类实时制作仍待接入。源删除后的旧引用重试边界不变；未新增底座或资产真源。检查与制品/预览结果续记在 office-word-compatibility-u2.md；本次真实模型、WPS与全仓门槛未执行，未公开发布。

## 本轮：已存图片的模型引用（2026-09-12）

OFFICE-IMAGE-REF-01 在既有六工具/ContentService 内增加同目标文档图片短引用投影及授权解析，避免 AI 读取已存图时复制 Base64。页面和持久状态不变，未增加资源注册表、文件访问或上传底座。Office 类型检查、17项集成与 Word-only 构建打包通过；真实制品浏览器复测结果见 evidence/office-word-compatibility-u2.md。新资料图片/跨文档引用仍待接入；源删除后旧引用重试存在明确边界。全仓门槛和本次真实模型/WPS复测未执行，未提交/推送/发布。

## 本轮：Word 真实模型富文档与 WPS 验收（2026-09-12）

新增 OFFICE-WORD-03 真实模型图文表格场景，通过19项原生链路检查；模型首工具content_open，正文/表格/图片分批显示，图片数据原样保持，content_export产生官方卡片并可重开/下载/刷新，文件字节核对相等，任务idle且无bash/skill/write/edit绕行。首次长图片资料测试暴露模型重抄二进制并绕行shell，补插件既有写作引导明确参数/失败边界；最终紧凑PNG通过并不代表长二进制资料引用已解决。两个探针前置错误（缺少服务inject、原始预览隐藏导出按钮）已修复，未另建下载或Agent实现。详情见[发布前验收](evidence/office-word-compatibility-u2.md)。

WPS通过访达实际打开三份导出DOCX，无修复弹框；最终真实AI制品的一页正文、两列表格及完整居中PNG截图正常。测试文件关闭且无编辑保存。WPS有环境缺失字体提示，未安装系统字体。Office typecheck/build、16项Office集成、6项卸载重装、脚本语法及diff检查通过；全仓检查沿用上一轮，本轮未重跑。Microsoft Word、OS IME、复杂分页/页眉页脚/目录、390px/1920px完整应用未执行。最新alpha.2候选已更新preview并重启18989，其他插件和数据保留，未提交/推送/发布。下一步完善可授权图片资源引用，随后按Word预览版收口；完整Word与其他七类仍待开发，主线D04/D15不变。

## 本轮：Word 表格与图片候选接入（2026-09-12）

Office `0.1.0-alpha.2` 开发候选复用 MIT Tiptap 3.31.0 TableKit/Image：工具栏前部增加表格行列、标题行、合并拆分、原生列宽拖动及图片上传/缩放/对齐。AI 和页面共享 block DTO、修订/CAS、人工租约与批次回滚；表格原子块和嵌入 PNG/JPEG 保存在同一工作副本，保存重开及已支持 DOCX 导入导出保留结构和文字样式。修复新增节点保存后的 ID 映射、字段顺序引起的重复保存，以及非法图片校验异常。

全仓 build/typecheck、68项集成、check:plan及2项规划测试通过；实际 Word-only tgz 浏览器15项与卸载重装6项通过，无pageerror，另含原生鼠标列宽/图片缩放与 DOCX 往返测试。最新 tgz 仅 README 范围说明随最后重打包更新，安装后 Host/Client 字节与已验收构建一致。已通过官方CLI更新当前preview Profile并重启18989，保留其他6项插件依赖、文档存储和原文件。候选未提交、推送或公开发布，已发布 alpha.1不变。详细证据见[表格图片验收](evidence/office-tables-images-u2.md)。

当前限制：50行/50列、最多500单元格；每张嵌入 PNG/JPEG 512 KiB；批次1 MiB、文档2 MiB、Host DOCX交付1 MiB。单元格图片、嵌套表格、复杂浮动布局、完整页眉页脚/分页及部分导入列表编号仍未支持，原件保留并提示转换限制。未执行真实模型表格图片生成、Word/WPS打开、OS IME、390px/1920px完整应用验收；其余七类实时编辑待开发，主线D04/D15不变。

## 本轮：Office Word alpha.1 已发布（2026-09-12）

用户授权的 Word 预览发布已完成。源码提交 2c18bd79746381d9febb54ae4ef3f9ac4187d145 已推送 origin/main，标签 office-v0.1.0-alpha.1 指向该源码提交，GitHub [prerelease](https://github.com/techflag/workdsh/releases/tag/office-v0.1.0-alpha.1) 已公开。附件4个独立插件tgz（Office及配套identity-local/access/audit）、SHA256SUMS与release-manifest，上传返回摘要逐一核对本地SHA-256，Office包558347字节。中英文README特色、Word/选择入口及用户截图随源码提交。仅Word文本预览，其他能力边界与未执行项见上一条；本轮未安装新发行包到用户Profile、未重新启动用户应用，未发布npm/Desktop。下一步按原计划推进文档表格/图片、完整排版与其余七类，不将本次预览发布视为八类完成。

## 本轮：Word 文本预览发布收口（2026-09-12）

Word-only 打包独立阶段目录，剔除旧 Univer/Excel/PPT 适配器及运行依赖，保留源码实验与八类路线。实际50个打包依赖许可文本齐全，已知双许可按MIT分支，打包失败关闭。导出同修订稳定ZIP与路径，独占链接完整文件、核对已有摘要不覆盖人工修改、写入/交付回执未知及取消保护，新增故障测试。全仓build/typecheck、65项集成、check:plan、2项规划，以及Word-only tgz的12浏览器与6卸载重装通过，均无pageerror。真实模型沿用此前15项，本轮未重复执行；Word/WPS、OS IME、跨Host/掉电恢复未执行。准备office-v0.1.0-alpha.1预览标签，完整Word与八类尚未完成；主线D04/D15保持。发布结果在后续记录。

## 本轮：Word 条件发布核对（2026-09-12）

用户授权在 Word 开发完成后推送版本。复核实际代码、候选 CHANGELOG 与第三方 notices：当前仅 Word 文本工作副本预览，表格/图片/完整分页仍未完成；dist/license-review.json 有7项缺失许可文本记录，旧适配器仍随候选打包，尚未满足此前无商用限制要求的发布收口。此次 Office typecheck 与内容/输入/导入/下载12项集成测试通过。浏览器、真实模型、全仓构建/检查及新制品验收本轮未执行；此前证据保留。未创建发布标签、提交、推送或发布。下一步先收口可分发的 Word 预览制品依赖/许可及导出故障恢复，完整 Word 后续能力继续保留，不将文本预览声明为 Word 整体完成。

## 本轮：保存 Office 输出选择截图（2026-09-12）

保存用户原始截图为 docs/assets/screenshots/office-output-selector.png，中英文 README 加入引用及当前适配范围说明，截图目录登记来源。原图与副本 SHA-256 一致，图片引用存在，git diff --check 通过。仅文档与图片变更，未运行构建或运行测试；未提交、推送或发布。

## 本轮：重新安装 Office 并记录命令（2026-09-12）

按用户要求使用官方 CLI 将已验收的 alpha.1 本地候选 tgz 安装回当前 preview Profile，验证 dependencies 恢复 Office，随后重新启动18989。中英文 README 及 Office README 补充当前 Profile 的安装、卸载与启动命令，说明先停止应用、保持同一 DSH_HOME/Profile、新建无需引用及卸载保留内容。此轮未修改运行时代码，未额外运行测试；沿用此前候选制品验收。未提交、推送或发布。

## 本轮：用户观察 Office 实际卸载效果（2026-09-12）

按用户要求通过官方CLI从当前preview Profile移除workdsh-plugin-office，已验证Profile dependencies无Office并重新启动18989。保留文档存储及原文件，不自动重装，供用户刷新观察菜单/编辑入口撤销。此轮未执行额外测试，先前安装/卸载验收证据保留；未提交或发布。

## 本轮：Word 预览版与独立插件制品收口（2026-09-12）

验证完整tgz安装生命周期，而非仅开发态卸载。六工具注册的disposer已由Office ctx.effect托管。Host卸载工具及guide、移除服务再装保留内容/修订；实际CLI从隔离Profile移除制品后冷启无content工具/guide、接口404，再装tgz恢复菜单/六工具/已写入文本和修订。Client热卸载撤销类型与文档来源、预览和右栏注册，用户旧草稿标签保留且发送失败。12项内容/输入/导入/下载测试、Word12项、真实模型15项、制品重装6项通过；最终44px DOCX工具栏和宽度约束通过Word浏览器回归。DOCX编辑期间外部文件更新不替换缓冲。证据见[Word发布收口](evidence/office-word-release-u3.md)。

中英文README突出实时写作、人机接续、原生文件交付、插件按需组合；CHANGELOG和候选 `.artifacts/office-release/workdsh-plugin-office-0.1.0-alpha.1.tgz`、SHA256与manifest已准备，包内容检查通过。新版安装到preview并重启18989。仍仅Word文本副本预览，表格/图片/页眉页脚/完整分页和七类实时适配待开发；Word/WPS、OS IME、完整U3故障恢复及全仓check未执行。未提交、推送、打tag或发布；主线D04/D15不变。

## 本轮：Office 输入说明行错位修复（2026-09-12）

用户截图确认新增 input.dock 说明行与原生 composer 居中布局不一致且重复标签。已删除 OfficeInputGuide 组件及 dock 注册，不修改官方布局 CSS，直接保留输入框内原生类型/参考/修改标签。Office typecheck/build、2项输入语义测试和4项专项浏览器检查通过；标准宽度和900px窄窗口（右栏收起）截图复核，标签位于输入框内，说明行不存在。新版已安装并重启18989。真实模型和全仓回归未执行；八类后续范围不变，未提交、推送或发布。

## 本轮：Office 原生输入类型选择和文档引用（2026-09-12）

OFFICE-INPUT-01 已接入 `/office` 八类输出选择与可删除原生输入标签、新建无需 `@`；`@` Office 工作副本明确区分参考与修改对象。公开输入触发/codec/原生发送器复用，提交重新核验任务和文档访问。其余七类实时适配标明待接入，原生文件引用入口保留。Office typecheck/build、6项集成及4项专项浏览器检查通过，见[输入验收](evidence/office-input-u2.md)。新版已安装到 preview 并重启18989。真实模型、标签冷刷新和全仓回归未执行。后续按U2—U5完善编辑器和故障收口，主线不变；未提交、推送或发布。

## 本轮：保存 Office Word 发布截图（2026-09-12）

按用户要求将原始截图保存为 `docs/assets/screenshots/office-word-preview.png`，英文及中文 README 已引用，截图目录记录来源与能力边界，供后续发布复用。已验证原图与保存文件 SHA-256 一致，README 图片路径有效。仅文档及图片变更；构建、运行测试未执行；未提交、推送或发布。

## 本轮：后续 AI 写作自动展开右栏修复（2026-09-12）

已修复首次展示ACK后新AI提交不刷新展示请求，以及客户端先标seen导致打开失败不再重试。新的 agent commit 在同一原子记录更新presentation（当前Session、新requestId、当前revision、5分钟有效）；人工保存和幂等重放不制造新请求。Client成功调用官方openTabIn后才标记seen。无第二套布局/传输。

Office typecheck/build、7项集成测试、11项浏览器检查通过；新增ACK→AI提交→新pending、重放不重新揭示、人类保存不重新揭示，以及真实浏览器首次ACK→收起右栏→AI写入→自动展开回归。证据见[右栏修复](evidence/office-sidebar-reveal-u2.md)。新版已安装并重启18989。本轮真实模型、全仓回归未执行；用户截图对应历史Session日志未复现，不能断言此前每次失败均来自这两处。仅文件工具/officecli生成的独立文件不自动变为实时工作副本。主线D04、八类范围不变，未提交/推送/发布。

## 本轮：复用 Tiptap 官方紧凑工具栏（2026-09-12）

用户指出自绘多行工具栏体验差。核对官方 UI Components 与 Simple Editor MIT 文档，复用锁定提交的 Toolbar/ToolbarGroup、Button 无 tooltip 分支和官方 SVG，按现有 Office scoped 样式适配单行44px布局。字体/字号/颜色/列表/查找/缩放功能保留；窄栏横向滚动，键盘焦点自动揭示按钮。原生 select/input 保留键盘行为，Tab 离开工具栏，箭头跳过禁用按钮。没有替换现有 Editor、修订、租约或保存服务，也没有引入收费 DOCX 模板。

Office typecheck/build、7项集成测试和11项确定性浏览器检查通过；截图及官方来源见[复用记录](evidence/office-official-toolbar-u2.md)。新版已安装到 preview 并重启18989。本轮真实模型、Word/WPS和全仓回归未执行，旧原生交付卡链路未修改。后续仍是文档表格/U3故障收口与U4其余七类；未提交/推送/发布，D04不变。

## 本轮：接入 Harness 原生文件交付卡（2026-09-12）

已移除 Office 自绘卡片/Conversation 投影，注册第六个 content_export 工具：读取授权下已保存文档，复用浏览器 DOCX codec，经官方嵌套 bash 和 present 交付实际文件，由官方 ui-deliverables 原生卡显示。作用域工具查找传入实际 agent，继承 token/rootCallId/signal，不绕过沙箱/审批。文件名清理并编码，独占新建，不覆盖用户原件。实时右栏、跟随及最新人工修改下载保留；导出文件代表当时修订，后续编辑不静默改写它。

Office typecheck/build、7 项集成测试通过（含富格式文档 Host 冷启动），真实模型分批写入→官方 present 日志→原生卡→刷新恢复通过；卡片打开/右栏预览下载通过，真实模型模式共14项检查通过，详见[原生文件卡记录](evidence/office-native-delivery-u3.md)。旧文档工作副本数据保留，旧轮次不会自动补造文件交付，可请求 AI 导出已有文档。完整 U3 幂等导出/未知写入恢复、Word/WPS 保真和其余七类仍待开发；全仓回归未执行，新版已安装并重启18989，未提交/推送/发布，主线 D04 不变。

## 本轮：原生产物卡片复用纠正（2026-09-12）

用户指出 Office 自绘成果卡应复用官方文件交付卡，已确认当前确有重复 UI。锁定 rc.1 官方 ui-deliverables 的原生卡由真正文件路径和成功 present 声明驱动；当前实时工作副本只有浏览器 DOCX 下载，尚没有 Host 文件导出桥接。公开 ./client 仅导出 ProducedFiles 文件改动标签，不导出交付卡组件，不能私有导入或照抄外观。官方复用记录已补入 U1-IMPLEMENTATION；下一项是受控 DOCX 文件导出→官方 present→原生卡，并保留实时右栏和修订关联，再移除自绘卡。

本轮只核对公开发布包/镜像文档，未修改运行代码、重启、提交或发布。新原生交付链路测试未执行；不能声称已替换。主线 D04 和八类后续范围不变。

## 本轮：文档常用编辑工具栏（2026-09-12）

原生 Tiptap 文档补齐字体/字号、文字颜色/高亮、标题1—6、四种对齐、行距/缩进、原生项目符号/编号列表、撤销/重做、全选/清除格式、文字查找替换、缩放与字符数。工具栏分组换行，避免窄面板把按钮藏到水平滚动区域。复用 Tiptap 3.31.0 MIT 扩展；Office 独立插件及统一服务架构不变。

可选文字/段落样式和列表层级进入语义契约、Host 校验、AI 工具 schema 与 DOCX 下载；旧记录兼容。6 项集成测试通过，浏览器验证编辑/保存/重开/下载，真实模型继续分批展示并保留成果卡。详细范围及验收见[工具栏记录](evidence/office-document-toolbar-u2.md)。仍未实现文档表格、图片、页眉页脚、分页排版或完整 Word 保真；其余七类继续既有 U3—U5 计划，主线 D04 未改变。未提交/推送/发布。

## 本轮：Office 成果卡片、跟随阅读和下载（2026-09-12）

完成轮次保留原生文档成果卡，可打开、下载并在刷新后恢复；使用独立 Conversation Definition/Chat keyed Node，不替换官方文件卡片。右侧“下载 Word”与卡片下载共用活跃文档事务，先保存人工修改再导出当前修订；保存失败或组合输入未完成时拒绝导出旧内容。浏览器生成段落/标题/文字标记 DOCX，无本地 Office 或服务器转换。追加内容自动跟随到底部，上滚暂停、按钮恢复。

验证：Office typecheck/build、4 项集成用例通过；预构建独立 Profile + 真实模型探针 11 项通过，浏览器异常为空，覆盖最新修改下载、中文/emoji/标记、长内容跟随/暂停、完成卡片打开/下载/刷新恢复。新版已安装到项目 preview，并重启 18989；详见[U2 文档交付记录](evidence/office-document-delivery-u2.md)。未改用户原件，未提交/推送/发布。

下一步为文档表格与 U3 保真导入/导出、失败恢复；本轮浏览器下载不代表完整 Word 分页保真或八类已完成。全仓回归、Word/WPS 分页验收、专家/PTC 全矩阵未执行；主线 D04 不变。

## 本轮：Office 默认写作与真实模型验收（2026-09-12）

新增 lifecycle-managed `workdsh:office-authoring` 提示词工作流，使用 rc.1 systemPrompt.section/公开 TOOL_REPORT placement，通过 Office 工具子插件贡献，不覆盖专家 persona。不改用户 officecli 技能。普通写作先创建右栏，再写首段和小批次；默认样式由现有编辑器提供。明确表格/DOCX 未实现，避免用户误认为工作副本就是 Word 文件。

验证：Office typecheck/build 和 2 项集成测试通过，新增卸载时引导清理检查。隔离预构建 Profile 探针 7 项与真实模型场景通过；测试保留真实 officecli Skill，在合成空工作区发送普通中文报告请求，无工具名称。最新真实样本右侧空文档修订0约3.3秒、首批修订1约5.5秒、修订2约7.6秒、修订3约10.8秒；模型 idle 结束，调用 content_open 和 content_edit，无 Bash/文件工具/skill 绕行。按文档 ID 排除其他测试文档，防止旧工作副本造成误判。凭据仅从已配置 preview 用于临时隔离 Home，已清理，不进入模型输入/制品。

已通过官方CLI安装新版Host/Client到项目preview并重启18989，不改用户原件或其他Profile。证据见[U2真实模型记录](evidence/office-natural-writing-u2.md)。此为标准模式短报告样本，长文/专家/PTC/八类/表格和DOCX导出未验收，不能标 Word 完整交付。下一步补文档表格与 U3 DOCX冻结导出/重开、失败恢复；主线D04/D15未完成。全仓回归/发布未执行，未提交/推送。

## 本轮：Office 创建即展示修正（2026-09-12）

用户真实测试显示旧预览模型没有文档工具并退回 Markdown 文件交付，不能视为实时文档链路验收成功。已修正新建文档原子保存会话定向展示请求，重开现有文档也请求展示；无需额外 content_present。补齐根 Loader 的 tools/connection 载体依赖，工具描述引导分批写作并说明自动展示。

验证：Office typecheck/build、2 项服务集成测试通过；独立预构建包浏览器探针 7 项通过，新增真实 Session prompt assembly 工具可见性检查和首批写入前空文档自动打开；不调用 content_present，三批提交自动显示，人工编辑后 AI 工具读最新内容、重载恢复通过。修正已通过官方 CLI 安装到项目 preview Profile，并重启原 18989 预览服务。没有修改用户原件、其他 Profile，未提交/推送/发布。

实时当前为每个 content_edit 已提交批次自动同步，尚非工具参数逐 token 流式渲染。真实模型自然语言写作与连续生成体验仍需验收；普通文件 Markdown/Word/PPT 导入尚未迁移，八类全部实时链路未完成。下一步仍 U2 真实模型验收和生成节奏，不扩展后续选型。全仓回归/PTC/完整八类未执行。

## 本轮：Office U1 最小文档插件已接通（2026-09-12）

已实现独立 Office Host 内容服务、五个原生 content_* 工具、认证 Connection 与原生右侧 Tiptap 文档页。AI/用户写同一份有修订的内容，人工租约阻止相互覆盖；原子收据支持重复请求与重启恢复。公共 office 类型契约已导出。组件只使用 Client model 的状态/actions，未新增 Agent loop/MCP/插件框架。

验证：contracts build、Office typecheck/build 通过；内容服务 2 个集成用例及干净预构建包 6 项浏览器检查通过，覆盖三批工具写入→原生页面逐次显示→人工改段落/分段/加粗/emoji→工具读最新内容并续写→浏览器重载。中文 composition 保护以浏览器模拟事件通过，未替代系统 IME 测试；未调用真实模型。详见[验收证据](evidence/office-live-u1.md)及[U1 实施记录](design/office/U1-IMPLEMENTATION.md)。

附加检查：9份相关文档的链接/围栏与JSON通过，`node scripts/check-plan.mjs`通过（仅规划完整性），`git diff --check`通过，Host 构建中无 private contracts 运行时导入。

当前是新建原生 document 工作副本链路；旧 Office 文件导入未迁移，content_export 未注册。下一步 U2 真实模型与编辑恢复验收，再 U3 冻结导出/文件重开/在途卸载，之后 U4 其余七类。旧依赖的六项许可文本缺口列入制品报告，最终发布门槛未完成。八类、D04/D15 及总体版本均未标完成；不重复扩展选型。

未执行真实模型/PTC、全仓回归、完整八类/热卸载故障与发布；未修改用户 Profile/原件，未重启、提交、推送或发布。

## 本轮：Office插件架构复审与交付边界修订（2026-09-12）

复审组件方案、统一接口v0.3和U1—U5，静态核对Office manifest/patch/空Host/Client注册/构建脚本、tables/pages/library职责、ADR-0018/0019与官方公开文档/声明。发现[OP-R01—06](design/office/ARCHITECTURE-REVIEW.md)：插件组成未落定、卸载在途提交缺口、跨领域所有权不明、原生Client与制品兼容缺门槛、类型codec/schema生命周期不完整、顺序台账未同步当前专项。

已新增[插件架构与OP-T01—07](design/office/PLUGIN-ARCHITECTURE.md)，统一接口修订为v0.4：独立workdsh-plugin-office包、官方ctx.plugin组合Host服务/工具/Connection、官方Client图与renderer、公开契约、请求运行代/停稳恢复、独立内容多维表格与tables业务库边界、HTML与pages发布边界。同步组件方案、计划、ADR、模块README和公开架构说明。顺序台账使用已有activeSlice机制登记OFFICE-AI-01并保留完成的Skill切片，主线D04/D15未改为完成。

下一步U1以真实最小文档能力验证插件服务/工具/Client与干净预构建包，再U2验证AI写→人工改→AI续写。八类全部保留。此次为设计处置，不是代码修复；新增依赖安装、构建、业务/浏览器/真实模型、插件卸载及制品测试未执行；未改运行代码、用户数据、Profile，未重启、提交、推送或发布。

验证：15份本轮设计/规划/模块说明的相对链接、围栏、JSON与空白检查通过；顺序台账Office专项/旧Skill历史/主线D04保留检查通过；`node scripts/check-plan.mjs`通过（28模块/50文档，仅脚手架完整性），`git diff --check`通过。六项Review是设计已处置、运行门槛待验。

## 本轮：HTML与Markdown纳入八类正式编辑器（2026-09-12）

用户明确要求HTML、Markdown也要集成。已同步[组件方案](design/office/OPEN-SOURCE-STACK.md)、[统一接口v0.3](design/office/UNIFIED-API.md)、AI协作需求、Harness集成、ADR-0024修订3、PLAN及Office README：HTML用CodeMirror源码/隔离预览，Markdown用Tiptap正文/CodeMirror源码与Mermaid/KaTeX。八类共用六个content_*工具；新增严格源码模型、绑定修订的补丁、同文档视图切换、资源导出与独立预览回执。补充Markdown未知语法保留及HTML资源/脚本隔离验收，U4先接Markdown/HTML再推广其余类型。

下一项仍为U1/U2的Tiptap真实文档链路。本轮修改的是需求/设计/计划与模块说明；新增依赖安装、业务构建、浏览器/真实文件/真实模型验收未执行，未修改运行代码或重启、提交、发布。

文档验证：8份文档相对链接、代码围栏、JSON示例及空白检查通过；`node scripts/check-plan.mjs`通过（28模块/50文档，仅规划完整性），`git diff --check`通过。已复查当前设计中的类型计数；六个工具保持不变，编辑器范围为八类。检查不代表产品集成已完成。

## 本轮：采用 GenOffice 使用的上游开源组件（2026-09-12）

用户明确意图是采用同一批开源基础库。已将技术方向落实为[OPEN-SOURCE-STACK](design/office/OPEN-SOURCE-STACK.md)：Tiptap/ProseMirror文档、现有Univer开源表格、Konva演示/画布、PDF.js/pdf-lib/PDFium；Harness运行与统一API不变。多维表格复用网格基础并保持独立字段/记录/关系模型。旧候选探针留存，停止作为默认方向继续扩展。

静态核对GenOffice提交de139a061537bea40f0cc81ef8f09a95f77ac52a的包声明及有关Docs/PPT/PDF编辑源文件，确认Univer声明同为0.25.1族、Tiptap3.31.0、Konva9族等；明确声明范围不是已解析锁定版本。源文件只读快照位于.artifacts/genoffice-reference，不进入产品代码。核对Tiptap/Konva/Univer官方许可证，记录MPL字体部件与ee边界；并未安装或运行GenOffice。

同步统一API、Harness集成决策、ADR、旧选型说明和PLAN。下一项U1/U2使用已选Tiptap完成真实文档链路，不再扩大选型。新增库安装、构建、浏览器/文件往返/真实模型测试未执行；未修改运行代码/依赖、用户文件或应用配置，未重启、提交、推送、发布。

## 本轮：统一接口修订与 Harness 技术方向（2026-09-12）

按用户要求修订 [UNIFIED-API v0.2](design/office/UNIFIED-API.md)，补齐Review六项：富文本权威模型/UI事务映射、单记录原子提交与幂等、已有文件open/reuse/fork、修订恢复与可信会话展示、冻结修订导出、人工lease接手与撤销。新增 [HARNESS-INTEGRATION](design/office/HARNESS-INTEGRATION.md)，核对官方tools/code-runtime/subagent/web-client/storage/sidebar-right/API Gateway/Agent Teams相关说明、官网工具与subagent页面、锁定0.1.5-rc.1公开声明及既有Remote失败证据。结论是单原生Agent+统一工具+Client镜像；PTC复用工具，子智能体仅复杂分工可选。rc.1采用已验证官方Connection领域通道，不假设未验证的自有RemoteStream可用。

同步ADR-0024、AI-EDITING、Review处置与PLAN有限U1—U5。设计问题已答复，故障修复及运行签收仍待实现。下一项为U1/U2文档真实闭环：模型/原生编辑器→Host工具→持久修订→正确会话右侧显示→人工修改→AI续写；其余五类按同接口逐项接入。

本轮仅文档与静态公开面核对，运行代码/依赖未修改。构建、业务/浏览器/真实模型、崩溃恢复与导出测试未执行；未重跑历史Remote探针，未启动子Agent、重启、提交、推送或发布。

文档验证：5份设计/ADR的相对链接、代码围栏、JSON示例与空白检查通过；`node scripts/check-plan.mjs`通过（28模块/50文档，仅规划完整性），`git diff --check`通过。此结果不替代Harness集成或产品验收。

## 本轮：统一接口架构 Review（2026-09-12）

审查 design/office/UNIFIED-API.md 的157行版本，交叉核对AI-EDITING、实际Office空Host入口与Harness storageDomain/sidebar-right文档。记录 [Review](design/office/UNIFIED-API-REVIEW.md)：5项P1（权威模型与UI映射、原子幂等、已有文件入口、订阅/会话路由、修订导出），1项P2（人工输入与持续AI写入冲突）。结论为需修订后再作为实现契约；保留原文便于对照。本轮为静态架构审查，故障场景尚未通过运行复现，业务/浏览器/真实模型测试未执行，未修改运行代码、重启或发布。

## 本轮：统一 AI 内容接口架构（2026-09-12）

用户要求从架构统一六类编辑器。新增 design/office/UNIFIED-API.md：6个content_*工具、严格操作联合、能力查询、有界结构读取、稳定ID、Host统一提交、客户端显示回执与文件导出回执分离、原生适配边界和真实场景。核对现有 tools/storageDomain/Connection/documentPreviews 与 sidebarRight 官方文档及实际代码。用户架构反馈优先，先完成契约收敛，未增加空工具、另一套MCP或执行器。运行代码/依赖未改变；构建、UI、真实模型验收未执行。下一项为Word首条Host工具→持久化→右侧原生编辑器链路。未提交、重启或发布。

## 本轮：六类编辑器 AI 同文档协作设计（2026-09-12）

用户新增 AI API/内部MCP与实时写作可见要求。已核对现有 Office 为 client-only、无Host文档服务或工具，记录 ADR-0024 与 design/office/AI-EDITING.md：AI与UI同领域服务、修订冲突、幂等回执、重连、取消、部分提交、权限和六类操作边界。内部优先官方原生工具，MCP不另起一套状态。实施按 A—D 有限范围推进；首条链路为文档分段写作与人工修改交接。此次为需求/架构落地，工具、Remote、实时显示与六类集成代码尚未实现；构建/浏览器/真实模型测试未执行。未提交、重启、发布。

## 本轮：PPT 候选原生 UI 与 MPL 复核（2026-09-12）

MPL 官方 FAQ 与发布包许可证核对完成：允许商用和专有组合，分发需满足覆盖源码与声明条件。新增隔离 UI 探针；有来源页面加载10页，无来源容器因 localStorage 失败。5次远程字体请求全部拦截；文件首页/工具栏遮挡导致标题双击超时，直接编辑尚未通过，未用强制点击绕过。完整结果见宽松许可选型文档及 .artifacts/pptx-candidate/ui-result.json。下一项处理公开配置下的首页遮挡和字体来源，再验收编辑/撤销/导出。未接入、重启或发布；正式构建/业务测试未执行。

## 本轮：PPT 替代引擎真实浏览器读写（2026-09-12）

隔离安装 pptx-viewer-core@3.14.3；新增 probe-pptx-candidate.mjs。真实10页PPT在浏览器内导入、修改文字、导出副本、重开通过，6个图表对象数量保持；原件不变，外部网络请求/页面错误0。证据在 .artifacts/pptx-candidate/result.json，详细限制见宽松许可选型文档。尚未验收原生UI、视觉保真、撤销及应用集成；正式业务测试未执行，未重启或发布。依赖清单发现 mtx-decompressor 为 MPL-2.0，尚未通过完整许可准入；下一项先核对该依赖许可，再做编辑器UI逐页显示与直接操作验收。

## 本轮：宽松许可浏览器编辑器选型（2026-09-12）

用户确认覆盖六类编辑器并优先 MIT/Apache-2.0。新增[选型证据与有限验证计划](evidence/browser-editors-permissive-selection.md)。PPT 新增 Apache-2.0 的 pptx-viewer 候选；Grist static 官方明确修改不保存、导入导出缺失，不能作为完整多维表格交付。既有 Univer 全组件范围保留，商业 SDK 迁移暂不推进，先按新许可约束验证替代组件。候选实际安装、构建、浏览器与文件回归未执行；未重启、提交或发布。

## 本轮：Univer 完整组件范围与原生编辑兼容探针（2026-09-12）

用户追加截图全类别：Sheets、Modern/Traditional Docs、Slides、Boards、Bases、PDFs、Compose & Embed、Customization & Integration。已记录ADR-0023与PLAN覆盖，不遗漏组件。新族统一1.0.0-rc.0独立安装（30个SDK包），已有应用仍0.25.1；没有服务器转换、上传文件或修改用户Office原件。旧族Docs真实键盘和Slides原生Operation修改通过，开发探针依赖与运行依赖分开。

新版公开preset组合已补Pro公式技术依赖并正确排序license，独立来源测试页8类初始化/canvas/原生Facade修改通过，两类Docs真实键盘通过，外部请求/页面错误0；Embed只验证注册和宿主文字，不签收真实嵌入。授权未配置，官方水印保留。当前opaque srcdoc应用容器的IndexedDB与Bases history兼容失败，因此没有直接替换已运行应用。完整对象编辑、撤销重做、保存重开、所有可选元素、实际Office/PDF转换及官方Tab迁移尚未验收；视觉复核单独登记。[完整证据](evidence/univer-complete-components.md)。

Office类型检查与规划/差异检查通过；正式业务全量、真实模型、新族应用集成未执行。未重装/重启应用，未提交/推送/发布。本轮成果是可复现SDK装配与兼容探针，不能称全组件集成完成。下一步为安全来源资产交付和文件转换公开面，授权问题等待用户回复，凭据不通过聊天获取。

## 本轮：Univer原生编辑需求纠正（2026-09-12）

用户拒绝额外文字片段模块，要求页面直接编辑。官网Sheets/Docs/Slides安装和导入导出已核对；当前Word/PPT预览加表单不符合需求，未签收原生编辑。当前0.25.1与官网1.0.0-rc.0有差异；Docs同版预设存在，pro Slides同版404。官方三类Office转换均要求转换后端，用户无服务器约束保留。此次没有运行代码/依赖修改，详细证据见[evidence](evidence/univer-native-editing-review.md)。

## 本轮：Word/PPT预览布局与实际文件回归（2026-09-12）

默认收起文字片段编辑，明确编辑文字按钮展开，更新按钮仅编辑时显示；Word页面按容器缩放、灰色画布与纸张阴影；PPT列表预览移除单页高度的内部滚动容器，用预览区统一滚动并适配宽度。真实PPT缺少可选defaultTextStyle导致第三方解析Object.keys(undefined)，仅预览内存副本补空默认样式，导出原包不改。真实用户Word/PPT在700px宽度无横向溢出，Word3页/PPT10页DOM及可滚动高度、编辑展开收起、原件hash不变、页面错误/外部请求0通过；截图复核。常规三类编辑/导出回归与类型检查通过。复杂图表/字体/分页完整保真未验收，不能以页面DOM计数宣称内容完整。插件重装，现有应用重启；未提交发布。

## 本轮：WorkDSH 桌面未签名测试版构建与冒烟（2026-09-12）

按用户四项决策（暂缓 Apple 凭据先做未签名测试版、品牌 WorkDSH、预置全部 7 包、应用 ID com.workdsh.app），在锁定 dsh-v0.1.5-rc.1 隔离快照上完成 5 文件 WORKDSH TEST PATCH 并实现全链路贯通：7 包 tarball → 核心包集 248 → unsigned 种子（bundles=内置两层+7 层，integrity 270 文件）→ electron-builder --dir **exit=0**（Electron 44 改走 npmmirror 镜像完成下载）。产物 WorkDSH.app（1.0G，CFBundleIdentifier=com.workdsh.app，adhoc 签名无 quarantine）本机冒烟通过：首启离线安装 248 包至 ~/.dsh/profiles/desktop（7 个 workdsh 全部就位），staging healthCheck 与正式 Host 激活（[workdsh:probe] 生命周期），二次启动快路径，CDP 截图确认 WorkDSH 品牌、侧边导航（新会话/项目/专家·技能·连接器/定时任务/资料库）与真实 session 轨迹完整渲染。旧 desktop profile 残留已备份为重命名目录（保留数据）。Dock 图标已接线：品牌概念图转 10 档 iconset → workdsh-icon.icns，mac.icon 接入后重打包 exit=0，SHA-256 与源一致。窗口壳融合已实施（main.ts hiddenInset 主窗口 + preload-app.ts 注入适配样式）：侧边栏 logoRow 顶部留白 48px（品牌行 y=56，避开红绿灯）、logoRow 与内容 header 为 drag 区、交互控件 no-drag；运行时 CDP 核验 innerHeight=840=outerHeight（原生标题栏已移除）、shellMark=inset、header region=drag；重打包 exit=0（须带 --config electron-builder.config.mjs，首次遗漏误产物 dist/ 已清除）。红绿灯实际落位与窗口拖动、Dock 显示待用户肉眼确认（如 Dock 仍是旧图属缓存，移除重添或 killall Dock）。未执行：正式签名/公证、DMG/ZIP 分发制品、自动更新通道、长会话真实性验收、设置页/全屏视图红绿灯检查；产物仅本机自用不可分发。详见[evidence](evidence/desktop-pack-test.md)。

打包流程已按用户要求固化为可复用入口：新增 `scripts/desktop/pack-desktop.mjs` 一键脚本（Node 22 自举 → 补丁 SHA-256 校验 → build:desktop → electron-builder → 产物断言，支持 `--skip-build/--check-only/--sync-patches/--restart`）、补丁存档 `scripts/desktop/patches/upstream/`（9 文件防漂移比对）、打包指南 `docs/DESKTOP-PACKAGING.md`（用法/补丁表/快照重建/Windows 说明/常见问题，打包资料主体按用户要求集中于此）与技能触发入口 `.qoder/skills/workdsh-desktop-pack/SKILL.md`（指向指南；个人级副本已移除）。测试：`--check-only`（Node 21→22 自举、9 补丁一致）与完整打包均 exit=0，产物断言全过（1.0G）。macOS 不能产出 Windows 版：官方 `package-target.ts` 的 win-x64 硬门槛要求 Windows x64 主机、`prepare-seed` 需目标平台 Node 生成平台专用种子、Windows 强制 EV 签名且无未签名降级；如需 Windows 版须在 Windows x64 真机/虚拟机复刻并新增等价 unsigned 补丁。技能跨会话触发与快照重建未实测；未提交/推送/发布。

## 本轮：修复 Office 工具栏样式污染（2026-09-12）

自定义 header/button/main/label/textarea/h3 规则收敛到直属顶部区与文字编辑区，避免影响 Univer 内部元素。配置公开 ribbonType classic；实际宽度仍受 Univer 自适应布局控制，不保证参考截图的全部菜单。构建、类型检查、真实 XLSX 浏览器回归、截图复核通过；按钮恢复显示，图表限制不变。

## 本轮：Office 顶部空间压缩（2026-09-12）

说明与操作区收为40px单行，小屏不再换行；说明截断，信息按钮展开浮层查看全文，不挤压表格。Office构建/类型检查、真实图表文件浏览器回归与截图复核通过，插件已重新安装。

## 本轮：含原生图表 XLSX 打开错误修复（2026-09-12）

用户文件触发 ExcelJS drawing reconcile 的 undefined.anchors。适配器仅在内存解析副本移除未支持的图表/绘图关系，保留原始高级对象检测与禁止导出规则；源文件不写入。真实用户 XLSX 的 opaque 浏览器探针已通过：表格 canvas 显示、禁止有损导出、原件 SHA256 不变、页面错误和外部请求均为0。原生图表仍未显示，本次只修复表格打开，不签收图表保真。验证脚本 scripts/probe-office-chart-regression.mjs 接收外部 fixture 路径，用户文件不加入仓库。证据见 .artifacts/office-chart-regression/result.json。

## 本轮：Word/PPT/Excel 原生右侧集成（2026-09-12）

用户要求直接集成三类且停止额外公式计算。新增独立 workdsh-plugin-office@0.1.0-alpha.1，通过官方 documentPreviews/Slot 接入原生 Tab，不启动 Office 转换服务；Excel 用 Univer，Word/PPT 用浏览器预览与原包文字片段修改。构建/类型检查/打包、三类实际 fixture 预览/编辑/下载读回、官方七包 Profile＋仅测试诊断插件的原生 Files→右侧三类文件打开均通过，网络请求0，页面错误0，截图已复核。preview:install 已将 Office 加入项目预览 Profile；使用现有预览需重启加载新插件，本轮没有自动启动图形窗口。

[实施证据](evidence/office-integration.md)、[ADR-0022](adr/0022-browser-office-document-extension.md)、模块README明确：Word/PPT不是完整排版编辑器，Excel原生图表尚不显示且含已检测高级对象不能导出；Host覆盖保存与冲突检测、复杂保真、安全硬化未签收。Root Harness精确版本不变，新增依赖锁已更新，D04/D15状态不变。规划检查/2项规划测试通过；正式业务插件全量/真实模型验收未执行，未提交/推送/发布。

## 本轮：Office 纯浏览器编辑验证（2026-09-12）

用户明确禁止服务端转换并要求编辑，ADR-0021 服务端提案已标为 Rejected。新增隔离 examples/univer-browser-edit，不声明假 Harness 插件、不更改 Profile/根锁。Univer 与浏览器 ExcelJS 候选转换完成真实 XLSX 导入 → Facade/双击键盘编辑 → XLSX 导出，独立 XML 和读回确认单元格、两个工作表、原数字格式及公式表达式保留；构建、实际 Chromium 探针通过，无外部网络请求。图表对象反例禁止导出，尚不显示图表；浏览器公式实时重算未验收。视觉1440×1000已复核，小屏/深色/应用侧 Tab 未执行。详见[evidence](evidence/univer-browser-edit.md)。Word/PPT、复杂保真、Host 保存仍未实现，D04/D15 状态不变。探针登记modules并作为独立锁示例排除根workspace，规划检查/2项规划测试通过；正式插件全量集成未执行，未提交/发布。

## 本轮：Office 服务端预览接入调查（2026-09-12）

新增用户要求：客户端不依赖本机 Office/LibreOffice，调查 dsh-univer-office。隔离 npm 包完整性验证通过；严格 peer 安装失败，当前声明范围不覆盖 Harness 0.1.5-rc.1。发布包默认 Viewer URL 指向 Host loopback，远程 Web 尚不满足。已记录[证据与有限实施计划](evidence/univer-office-compatibility.md)及[Proposed ADR-0021](adr/0021-server-office-preview-bridge.md)。未改 Profile、运行代码或依赖锁；未完成运行、远程 Web 与 Office 保真验收，不宣布预览交付。企业后台与专家团阶段不因本次调查自动提前。

## 本轮：发布单个专家alpha.1（2026-09-12）

用户明确授权提交git并发布版本。本次准备experts-v0.1.0-alpha.1及匹配身份alpha.4/审计alpha.3/授权alpha.4/Skillalpha.25/展示alpha.40；模块各自版本，contracts开发契约alpha.6。中英文README新增专家能力、真实打包截图、安装与专业验收限制。源码包含必要治理与共享Skill配套；团队只保留设计文档，没有开放团队运行。发布验证记录见docs/evidence/experts-alpha1-release.md；D04仍in_progress，专业报告两处语义问题与E收尾保留，不以预发布替代验收完成。

## 本轮：专家团官方子系统补充复核（仅文档）

按用户指定subsystems目录补读subagent及相关workflow、agent-team、core、Session投影/引用、Conversation、Skills和approval契约，官网Subagent交叉核对。锁定SubagentRuntime声明已有continuable/消息/中断/子级发现，不能重做其inbox与激活管理。补充[团队方案第9节](design/experts/EXPERT-TEAMS.md)与ADR-0020：one-shot固定SOP、多轮continuable及实验性Agent Teams分别评估；成员provider不是先验必需。continuable准备钩子只贡献seed，精确专家组合须单独探针，冷恢复子Session不代表workflow脚本可续跑。TM-01范围细化，D04/D11状态与顺序未改变。本轮无运行代码、模型调用、依赖升级或提交发布。

## 本轮：专家团SOP架构修订（2026-09-12，仅方案）

根据用户“多专家＋SOP工作流”的反馈修订[专家团方案](design/experts/EXPERT-TEAMS.md)第2～4/8节及[ADR-0020提议](adr/0020-expert-team-sop-on-native-workflow.md)：首版即复用原生WorkflowEngine，后置通用设计器；区分原生运行事实与业务阶段验收，明确前置、并行、成果交接、评审和有界返工。核对锁定0.1.5-rc.1公开声明，发现原生spawn不直接选择专家preset、composeFrom继承父组合、phase仅显示，以及直接调用engine不保证自动持久化tool-workflow呈现事件。这些纳入TM-01公开适配探针，未宣称可运行。

本轮未编码、调用模型、升级依赖、修改用户任务或提交推送。D04仍in_progress，上一轮专业报告验收缺口保留；D11仍todo及既定前置D10，TM-01～04范围保留，企业后台继续后置。架构提议供审阅，不将其当作当前插件已实现能力。

## 本轮：D04 D 真实模型专业场景验收（2026-09-12）

用户在应用完成模型配置后明确授权继续真实模型验收。本轮在仓库外临时 Home/Profile 中安装六个独立 tgz，通过官方 Host Loader、完整发布专家 preset 和原生 Conversation 调用 deepseek-official/deepseek-flash（UI DeepSeek-V41-Flash，high）。使用虚构门店 CSV 和独立验收专家；没有编辑/发布用户现有「表格分析」，没有改现有用户任务。验收答案留在仓库侧，凭据只以0600临时凭据文件供原生提供方读取，退出移除；从未输出到聊天/日志/成果。

正常、信息不足、数据质量异常三条真实路径的持久 v3 日志均确认 turn/end=completed、skill 工具成功读取 retained-revisions 中发布时固定的技能、实际 read input.csv 与 Python 计算。正常收入55,000→46,000，-9,000/-16.3636%，A/B/C贡献-4,000/-5,000/0；缺字段时仅确认收入变化，门店明细为空、未知指标null并列必要追问；脏数据明确重复A/5月、B/6月缺客流及C/6月fen单位，未填补客流，归一化口径收入对账。三者原始输入hash不变，实际JSON/Markdown生成，独立只读日志/成果复核及冷启动任务绑定核对通过。第四条依赖不可用路径新增确定性Host/原生pre-step测试：停用配备Skill后禁止创建替代任务、既有任务拒绝下一步执行，没有远程模型调用。

专业复核未全部通过：初轮正常报告把结构性客单价上升当成可保护成果，脏数据报告误抄行公式并越过细粒度推断边界。补充方法技能后重新执行正常/脏数据完整真实任务：正常已按订单权重正确拆解整体客单价，明确非门店内改善；脏数据已使用正确50×30,000=1,500,000，并明确客单价持平不能证明单品价格或店内结构不变。原始报告保留，没有修改输出来隐藏失败。但最新脏数据报告仍错误以“乘法自洽性不符”排除数值本身为CNY的假设，以及用A+C转化率稳定暗示整体缺口只来自缺失值；B转化率未知时不能作此推断。这两处专业语义仍需关闭。D04保持in_progress/专家0.1，AT-27不整体签收；E稳定性收尾保留，不扩展0.2/专家团/企业后台。

新增显式probe:experts:professional（normal/incomplete/dirty）、独立数值核对和原生持久日志/冷启动复查脚本；普通测试不依赖API Key。初次浏览器可见性断言因完成后的Skill卡片自动折叠而失败，已改以持久tool/result、turn/end验证；旧任务经独立复核完成，不重复发送。严格方法复验的dirty主探针完整通过；normal任务与冷启动复查通过，但当轮核对器错误把合法字符串质量说明当伪造异常。已纠正未约定的格式限制：允许非空字符串或detail对象，数值仍严格独立核对，自然语言真假由专业复核承担；更新核对器经已有完成日志复查通过，没有为此再次调用模型。修正该格式限制后的normal主探针整条重跑未执行。

Experts构建/类型检查、52/52全量集成及规划检查/2项规划测试通过。最后对新增主脚本做语法/whitespace核对；预览18989仍运行，本轮未重装预览/提交/推送/发布。三份最新报告目录normal/incomplete/dirty的report.json保留professionalReview=required，具体人工审查见证据；D仍有已列明专业报告问题，不能从工具完成宣称整体可无监督使用。

证据：[D04修复与验收记录](evidence/d04-experts-review-fixes.md)；本地报告与截图在`.artifacts/experts-professional-normal/`、`experts-professional-incomplete/`、`experts-professional-dirty/`。专业复核说明与源文件保持分离。

## 本轮：D04 C 对话创建引导与完整使用预览（2026-09-12）

本轮交付C的候选代码：expert-manager 独立指南按目标/经验/方法/成果引导，信息够则先起草，仅追问影响判断的缺口，明确用户实际经验与通用建议的区别，不虚构履历，也不擅自添加用户未要求的连接器。制作专家仍只在原生任务框填草稿，不自动发送。新增只读 workdsh_expert_list_skills，通过同一Experts Host的目录和可编辑权限查询，返回稳定标识/简介/状态，不输出资源路径、不提供发布工具。

发布确认从同草稿修订的已保存Host定义生成纯TSX使用预览：完整简介、标签、示例、固定技能、扩展声明与完整专业设定，取消返回编辑；预览/打开链接不发布、不执行任务。确认请求的对象、草稿修订和两项摘要须与所见内容一致，变化要求重新预览，再由既有受信UI确认/Host发布路径处理。公共Modal、760px/820px上限、内部滚动和固定确认动作继续复用。

Experts构建（含contracts/UI）、类型检查与47/47全量集成通过；目录工具新增真实注册/执行及跨成员拒绝/资源路径不泄漏断言。独立六包probe通过长专业内容/六示例/取消不发布/摘要变化不交换证明、1440/1920/390px及两次冷重启；桌面和小屏截图、完整专业设定截图已人工复核。截图复核发现主题悬停色导致主要按钮对比不足，已增加限定于发布页的主按钮悬停样式并重跑探针。规划检查与2项规划测试通过。真实模型下的必要追问、完整专业交付、AT-27仍未执行，归下一阶段D实际场景验收；不从指南文本宣称模型行为已通过。

本地预览已完成六包内容寻址重装与入口摘要核对，重启18989。实际浏览器打开原「表格分析」已保存草稿的完整发布前预览，通过操作请求监测及前后draft/expert对比确认没有编辑、发布或创建任务；截图`.artifacts/preview-expert-use-review.png`。用户已打开页面需刷新加载当前Client。未提交/推送/发布，D04仍in_progress/专家0.1；剩余既定阶段为D真实专业任务验收、E稳定性收尾，不开展专家团/公共运营/企业后台。

## 本轮：专家草稿与已发布详情区分（2026-09-12）

用户新增 frontend-design 后编辑器与详情技能数量不同。详情仍正确使用已发布定义，但缺少草稿版本说明；本轮修正展示，不自动发布或迁移用户数据。可编辑用户在已保存草稿不同于已发布内容时看到尚未发布提示、两版技能数量及编辑入口；编辑器明确保存/发布/已有任务版本关系。扩展能力声明独立分区，不再混入真实配备技能，也不将未实现的接入校验写成实时“未满足”。

Experts 构建（含 contracts/UI）与类型检查通过；扩展真实独立六包探针通过草稿/已发布技能分离、编辑跳转、可选扩展能力分区、1440/1920/390px 无横向溢出及两次冷重启。首轮发现旧 info 样式隐藏标题，次轮发现编辑提示仅位于加载分支，均已修正并通过真实可见性断言。截图 `.artifacts/experts-package/expert-unpublished-*.png`；已复核390px文字/按钮布局。全量集成测试本轮未重跑（上轮47/47），真实模型执行、全量可访问性与最终头像素材仍未执行。预览六包重装/入口核对并重启18989，保留用户数据；未提交、推送、发布。D04仍为专家0.1；下一工作切片是既定C：原生对话创建引导与发布前使用预览。重点是自然语言经验信息、必要追问、可审阅草稿和示例，不增加第二个聊天框或扩大到专家团/企业后台。该切片本轮未执行。

## 本轮：D04 A+B 专业详情与真实技能选择（2026-09-12）

候选实现新增 ExpertSkillOption/listSkills 的公开契约和同一 Experts Host 的 Connection 操作；available须拥有目标专家编辑权限，equipped仅返回可读专家显式配置，不输出技能资源路径或凭据。消费公开 workdshSkills.list，当前本地稳定ID等于唯一技能名称，不把该接口宣传为企业授权目录。

编辑器不再要求手填依赖名称：真实技能可搜索、查看简介/状态、勾选、取消或确认；数量受限、重复添加不允许、失效项明确处理，旧名称引用确认选择后保存稳定skillId。移除仅解除引用；发布仍校验和冻结Skills修订。详情提供擅长领域、完整示例和配备技能真实简介/状态，并明确当前目录信息与发布固定内容的区别。

build、全量typecheck、47/47集成、规划检查/2项规划测试通过。真实独立六包安装探针新增搜索无结果/取消不改草稿/移除后仍能选择/保存稳定ID/重载，发布冻结与两次冷重启通过。初轮误写测试文件，已从本任务原读取及变更记录完整恢复原9项及后续4项并保留新增目录测试，总47项全部通过；重载后的官方配置提示遮挡测试已处理，未弱化操作断言。

本地预览已通过六包内容寻址重装与入口摘要核对，重启 18989 后实际浏览器验证「表格分析」草稿可以打开真实已安装目录并显示 officecli 选择项；未保存或修改用户草稿。截图 `.artifacts/preview-expert-skill-picker.png`，已打开页面需刷新。

D04保持in_progress/0.1；此轮只交付A+B的详情/选择器，专业内容质量仍需后续完整场景验收。C对话创建增强/使用预览、D整份Loader与远程模型交付、E既有恢复/卸载/交接等缺口继续保留，不宣称新增AT全部完成。未提交或发布。

## 本轮：专家与专家团需求及开发规划修订（2026-09-12）

本轮只改需求、UX、技术边界、验收和规划，不改运行代码或发布。PRD 1.1 将专家明确为真实能力加领域经验、专业判断与完整交付职责，团队为多专家加 SOP；保留用户三张补充图作为产品依据。新增 REQ-EXP-013～016、REQ-TEAM-004～006及追溯元数据，验收 AT-24～27、AT-T05～T07 均未执行。纠正原“专家管理占位”现状与旧弹框尺寸，区分使用详情和编辑，补真实技能选择、自然语言经验引导、可核验专业成果与团队阶段/交接/评审反馈。

D04 继续 in_progress / 0.1，D11仍todo且前置D10不变。开发计划 A～E 纳入既有 EP-05/EP-07 等包，不新建专家0.2；下一次代码从 A+B 专业详情与真实技能选择开始。团队后续 TM-01～04必须包含 SOP；通用设计器、公共运营、企业服务器/管理 Web仍后置。本轮 check:plan（26模块/50已登记文档）、2/2规划测试、git diff --check通过；另独立解析PRD YAML，22项需求与主表/来源/验收一致。初轮发现新增元数据插入到了 test_cases 后，已修正并重新解析通过。运行构建/模型/浏览器未重跑。

## 本轮补充：专家弹框与官方运行回合（2026-09-12）

编辑弹框桌面宽度上限 760px，详情 800px，高度上限 820px 且受视口限制；正文内部滚动，标题及保存/发布操作固定。复用公共 Modal 的唯一关闭按钮，标签在桌面两列，示例标题和正文铺满独立卡片。详情将召唤置于标题下，完整显示示例，专家设定默认折叠；不虚构头像资产或使用次数。浏览器验收使用独立数据，覆盖 1440/768/390px、八标签及六示例；无横向溢出，输入区域宽度及关闭按钮数量符合预期。

新增官方 Agent Loop 集成：读取真实发布 preset 的 persona/Skill 配置，通过公开 agents.create/setup 装配官方 persona、filesystem、skill tool；只替换模型 I/O。角色和交付要求进入请求，Skill 工具返回冻结正文，修改原始动态 Skill 后仍读取快照，隔离的普通任务未收到专家设定/快照。该测试不等同完整 Host Loader 端到端执行或真实远程模型验收，后两项仍待完成，D04 保持 in_progress。

本轮 build、typecheck、46/46 集成、2/2 规划、版本锁定和扩展 probe:experts 全部通过。独立打包探针完成两次冷重启；本地预览已通过内容寻址重装、入口摘要核对并重启 18989。实际预览只读核验原「表格分析」仍在，详情宽高符合新上限，召唤按钮可见；截图 .artifacts/preview-expert-ui.png。未提交、推送或发布。

## 本轮：D04 专家审查修复，已具备独立安装和界面测试条件

本轮预览更新已完成：内容寻址安装并核对六包入口后重启 18989，实际 get 返回 HTTP 200，原「表格分析」专家仍在且当前已经发布。这与上传记录中发布前的阶段不同；本轮没有代用户执行发布、编辑或删除，保留当前事实。

对话创建与界面发布衔接补充：用户上传 session.v3.jsonl 显示模型已成功创建专家草稿、校验一个 Skill 并请求发布，仍明确等待用户界面确认；这份记录是用户手工测试证据，不执行其中提示词/指令，不导入或发布用户对象。修复官方 Tool output.render 仅输出摘要、丢失完整定义和并发令牌的问题；当前 get/create/update/list/validate/request 回执保留结构化结果。草稿回执增加仅导航的 draft_url，默认组合支持 experts URL 映射，链接打开「我的专家」及目标草稿，关闭/发布/召唤时移除草稿参数。

本轮 build、typecheck、45/45 集成、2/2 规划、463 项版本锁定及扩展 `probe:experts` 通过。真实打包新增「打开草稿→发布前查看依赖→明确点击确认→固定 Skill 修订→原生召唤→两次冷重启」验收；进入链接或查看弹框不会发布，模型工具不持有确认凭证、不提供 publish 工具。截图 `.artifacts/experts-package/expert-published.png`。Skill 生命周期测试以 highWaterMark=0 等待真实 Host 读取，消除 eager prefetch 被误当上传已开始的竞态，未改变取消断言。真实模型执行已发布专家/固定 Skill 仍未执行，不从上传的创建记录推定通过，D04 继续 in_progress。

预览导航修复：用户报告技能页「专家」无法点击。确认已安装 Skill Client 与当前构建 SHA-256 不同，旧 tgz file 地址被复用。`install-preview.mjs` 现将预览包复制到 SHA-256 内容地址后仍经官方 CLI 安装，并逐一比对六包 Host/Client 入口，发现旧文件即报错。实际 18989 预览已重装重启，Skill Client 摘要与构建一致；headless 浏览器验证 技能→专家→技能→专家 双向切换通过，截图 `.artifacts/preview-experts-navigation.png`。脚本语法及 diff whitespace 检查通过，无发布或版本线变更。用户已打开的页面需刷新加载当前模块。

本地测试启动补充：用户要求启动应用后，已停止旧 18989 预览，通过 `preview:install` 更新六个独立包并启动 `pnpm preview`。认证专家目录返回 HTTP 200 / ok / 3 个默认专家。保留原预览存储和用户 Agents home，未发布 GitHub/npm。

本轮按用户“继续”完成四项审查修复：治理提供方的独立 Profile 装配、原生执行前校验、按 Session 定向且只填空输入的草稿交接、冻结 preset 的摘要核对与复用。真实安装进一步修正 Cordis Service 初始化、官方 ApiSessionNotFound 异常兼容，以及召唤任务的 Workspace ID 关联。详情弹框为关闭按钮保留空间，避免挡住管理菜单。

Node 22.23.2 / Harness 0.1.5-rc.1 / Cordis 4.0.2 下：build、typecheck、44/44 集成、2/2 规划、463 项依赖锁定通过。新增 `corepack pnpm probe:experts` 在仓库外隔离安装 identity/audit/access/skills/experts/bundle 六个独立包，验证真实 Host、默认专家目录、原生任务绑定、浏览器示例召唤和制作专家草稿、用户已有输入保护、不同 Session 隔离，以及两次 Host 冷重启。截图、运行报告位于 `.artifacts/experts-package/`。详细证据见 [审查修复验证](evidence/d04-experts-review-fixes.md)，装配决策见 [ADR-0019](adr/0019-installable-host-self-containment-and-governance-assembly.md)。

**D04 保持 in_progress，不声明专家 0.1 全部完成。** 本轮浏览器仅准备任务，未发送模型请求；执行 guard 的回归使用公开 agent/pre-step waterfall，不能代替真实 Agent loop 验收。仍需按既有 EP-07 核验真实模型 persona/固定 Skill 运行、跨插件停用与卸载后的运行安全、真实关联交接、导入导出反例及故障恢复。guard 当前随 Experts 插件注册，移除插件后的遗留 preset 防护尚未验收；preset 写入失败的原子恢复、模型选择失败后已创建 Session 的结果恢复仍需核验。安装态 Host 入口不依赖 private workspace 运行时包，但部分导出声明仍引用 private contracts，仓库外 TypeScript 消费验收未执行。

当前修复为未发布候选，不更新模块版本线，不自动推送或发布；按随后启动测试指令更新了本地预览 Profile。企业服务器、管理 Web、公共发布与专家团仍按既有后期计划，不增加当前验收范围。以下历史“专家规划中/未开始/真实安装阻塞”的陈述已由本节替代。

## 上轮：按模块发布 GitHub 制品

用户明确暂停旧桌面兼容性改造，转为推送现有代码、完善中英文 README 和上传模块对应安装包。本轮不修改 Skill 运行逻辑、不升级桌面应用、不更改用户 ssh Profile。

交付映射：`skills-v0.1.0-alpha.24` → 独立 Skill 包；`bundle-v0.1.0-alpha.39` → 可选展示组合包。各自附 tgz、SHA256SUMS、带源提交的 release-manifest.json。其他模块的源码/设计同步提交，但尚未独立交付的模块不伪造安装包；规则见 [模块发布说明](RELEASES.md)。

中英文 README 已按插件特色、真实截图、模块下载、安装步骤、路线图和开发入口重写。测试截图来自当前正式打包制品与隔离演示数据，替换旧原型截图。公开材料同步明确：Harness 0.1.5-rc.1 Web 已通过；DSH Desktop 2.0.5 内置 0.1.2-rc.1 安装后入口缺失仍未修复，不能以市场显示“启用中”推断 Client 激活。

本轮重跑 build、typecheck、33/33 集成、2/2 规划、463 项依赖锁定、probe:skills 和 probe:browser 均通过。真实模型、其他操作系统图形端、旧桌面兼容修复和完整 live CLI 热卸载未执行。GitHub 代码与两个模块 tag 已推送，制品源提交为 `c6e0fd5`；两个预发布及全部六个附件已发布，并通过无认证公开下载回读 SHA-256 校验。README 中英文正文与三张嵌入截图已从 GitHub 原始地址回读一致。运行功能版本保持不变。

## 上轮：Skill 独立插件改造完成

按用户授权落实 ADR-0018，完成 D04 前置交付修正：Skill `0.1.0-alpha.24` 有独立 Host/Client、官方配置层与浏览器制品；bundle `alpha.39` 不再隐藏初始化 Skill，默认预览通过官方 CLI 显式安装两层。Workbench `alpha.10` 改为正式子插件注册，独立分发仍待其后续交付，不声称全部模块均已改造。

`workdsh-contracts@0.1.0-alpha.5` 新增 `./skills` 本地管理服务 v1。真实 Cordis 测试验证两个消费者共享、提供方缺失/恢复和上传取消清理；独立 tarball 在仓库外安装后通过真实浏览器编辑、冲突、启停、卸载/恢复及移除重装。默认产品浏览器回归和冷重启均通过；证据与边界见[独立交付验收](evidence/skills-standalone-package.md)。

本轮无开发阻塞；npm 发布、真实模型和完整运行中 CLI 热卸载未执行。当前仍为 Skill 0.1，D04 专家业务未开始。下一项业务仍按既有专家交接包实施，不增加公共市场、企业后台或新的产品版本。新预览安装命令为 `corepack pnpm preview:install`，在预览停止时执行，再启动 `corepack pnpm preview`。

本地预览 Profile 已通过官方 CLI 更新至 Skill alpha.24 + bundle alpha.39，18989 已启动；认证目录请求返回 200，当前读取 16 项技能。使用原有用户 Agents home，未迁移或删除技能文件。默认组合额外验证了双向移除：移除 Skill 后工作台/新会话可用，移除展示包后 Skill 仍可用。

## 当前模块版本

版本规划已固定为“一个模块一条版本线”，详见 [模块版本规划](MODULE-VERSIONS.md)。技能管理模块 **0.1** 已完成当前默认/本地范围，制品为 `workdsh-plugin-skills@0.1.0-alpha.24`；治理契约、本地身份、资源授权和审计的本地 **0.1** 基线已经完成；工作台与共享 UI **0.1** 已完成，当前开发顺序进入专家模块 D04。`workdsh-bundle@0.1.0-alpha.39` 仍表示当前本地候选组合版本，不代替各模块版本。`modules.json` 与 `check:plan` 已加入版本线和 package major/minor 一致性检查。

Skill 0.1 提前切片现已正式结项：`development-order.activeSlice` 标为 completed，`packages/plugins/skills` 标为 implemented，P1-03 标为 completed。D01—D03 已按本地交付范围过序；这不表示业务不可变 SkillRevision 与所有管理入口的 ActorContext/access/audit 适配已经实现。D04 需要的技能依赖修订/治理适配见专家交接方案，不重复开发技能页面和本地管理闭环。

D01、D02 及提前完成的 D03 Skill 0.1 均已收口，当前步骤进入 D04 专家模块。`workdsh-contracts@0.1.0-alpha.5` 定义服务端解析的 ActorContext、IdentityProfile、Organization、Membership、ResourceOwner、AccessGrant、AuthorizationDecision、SessionOwnerBinding、RuntimeBinding、AuditEvent 及 identity/access/audit 提供方接口，并增加审计排空边界。该包无 Cordis、UI、数据库或传输依赖；架构依据见 ADR-0016。

P0-05 的本地基线交付为 `workdsh-provider-identity-local@0.1.0-alpha.3`。本地 provider 已注册为 Cordis Host Service，通过官方 `ctx.storageDomain` 原子保存主体、个人组织与 owner 成员关系；冷启动保持同一 revision，配置与持久身份冲突时拒绝启动。principal/organization 仍只来自 Host 配置，每次请求生成独立 requestId，输入夹带的伪造身份字段会被忽略。Harness 官方匿名安装 ID 明确只用于遥测关联，未被误用为用户身份。

`workdsh-plugin-audit@0.1.0-alpha.2` 和 `workdsh-plugin-access@0.1.0-alpha.3` 已建立真实 Cordis Host Service。两者使用官方 Storage Domain 分域持久化；Access 只经 IdentityService 查询成员关系，实行组织隔离、资源 owner、显式 grant/revoke、revision 冲突检测，并在返回授权结果前写入审计。独立 Session owner Domain 与官方工具流水线桥接已生效；新增 `workdshSessionAccess` Host 入口，在调用官方 Session Controller 创建前先保留不可替换的 owner，并在恢复 Agent 前按最新成员关系和 grant 重新授权。个人 Profile 可首次工具调用自动绑定；企业式组合应关闭该回退并只从受控入口创建/恢复。该入口当前是 Host Service；企业外部 Session Remote、文件与其他 Remote 的多人治理、成员撤权后的在途取消、服务器端认证和管理 Web 已集中记录到[企业版架构说明](ENTERPRISE-EDITION.md)，不再阻塞本地 D01。团队远程入口继续关闭。证据见 [Access 与 Audit 验证](evidence/d01-access-audit.md)。

当前根构建、类型检查、33/33 集成测试、2/2 规划测试、计划清单、版本锁定和补丁格式检查均通过。

skills alpha.23 / bundle alpha.35 收口认证 Fetch 的超时与取消。Client 对列表和修改请求设置有界超时，上传打包、流读取、预检和确认安装共用 `AbortSignal`；界面在上传和安装阶段均提供真实取消入口。Host 主动取消阻塞中的流读取并清理私有暂存目录，在文件遍历、摘要、复制及最终原子重命名前检查中止；原子发布完成后按成功结算，避免技能已安装但界面报告取消。中途上传取消与提交前取消/重试已进入 19/19 集成回归。该能力继续使用 Harness Connection 的认证 exact Fetch 扩展面，不增加第二套传输。

2026-09-11 补齐真实打包 Web 的 Skill 冷重启验收。第一次 Host 重启后，浏览器确认导入技能仍被全局发现、回收站凭据仍可恢复、编辑后的完整 `SKILL.md` 与新增资源内容未丢失；恢复后停用技能。第二次 Host 重启后，浏览器确认停用来源凭据仍有效，并将技能恢复到原始共享根。随后原有停服移除、Client/Host 缺席和重新安装流程继续通过。此项复用 Harness 官方 Web、Connection 认证、Skill provider/watcher 和 Loader，不新增状态协议；产品包版本未变。

C01 的 live Session 隔离探针也已补齐：两个官方 Agent Session 在各自 setup scope 挂载同名 `sample` 技能，并发走完官方模型—skill 工具—模型回合；A/B 的请求和持久 Session 事件只包含各自正文。dispose B 后 A 再次调用仍只读取 A。专项 3/3、完整集成 19/19 通过。该结果不代替 WorkDSH 的不可变 SkillRevision 或团队授权。发布版 Typert 的外部 workspace 生成问题保留为 Harness 升级兼容项，不阻塞已经采用官方 Connection exact Fetch 扩展面的本地 Skill 0.1。

skills alpha.22 / bundle alpha.34 补齐本地 Skill 0.1 的最后一组领域能力：批量启用、停用与可恢复卸载逐项返回结果；卸载前由 Host 汇总已注册领域的依赖影响，确认携带影响 revision，执行时发现依赖变化或强依赖会停止卸载。组合回归从受管导入开始，保留资源文件，销毁 Host 后由冷启动新进程通过官方 Skill 工具成功调用。Node 22.23.2 下 build、typecheck 与 18/18 集成测试通过。Skill 0.1 的个人本地管理闭环已完成；真实打包浏览器已验证全局目录、详情、编辑、资源、导入、原生创建交接、依赖确认、菜单可点击、重连、移除与重装。按 ADR 0015，当前不开发公共市场；企业服务端、管理 Web、组织目录、分类、版本和下发策略进入后期 ToDo，不阻塞默认/本地 Skill 0.1。

仓库首个预发布快照定为 `v0.1.0-alpha.1`。发布前在 Node 22.23.2 / pnpm 10.34.5 下重新通过 frozen install、build、typecheck、26 模块/36 文档规划检查、463 项 DSH/Cordis 版本锁定、18/18 集成测试及正式打包浏览器探针；浏览器探针覆盖匿名 401、认证 Web 200、Host 激活、官方 Sidebar 所有权、全局技能目录、Remote inventory、重连、移除、重启和重装。发布范围排除 `tmp/`、`.test-runtime/`、`.artifacts/` 与环境文件，高置信凭据扫描 0 命中。

skills alpha.21 / bundle alpha.33 将对话创建从“提示模型直接写目录”改为 Host 权威闭环。三个模型工具使用 Harness 官方 `ctx.tools.register(defineTool(...))` 注册，分别保存私有草稿、重新校验和发布；发布必须携带精确 revision 与用户确认，仍在全局技能锁中查重、原子写入并回读验证。无效的本地 `SKILL.md` 不再从目录中静默消失，列表和详情返回诊断并允许编辑修复。

skills alpha.20 / bundle alpha.32 修复导入安装的名称一致性和内容一致性缺口。安装现在按技能全局名称取得跨进程锁，并在全部官方技能根、扁平 `.md`、目录形式及其他注册提供方中拒绝同名候选，避免由 provider 顺序决定实际调用版本。暂存收据与安装副本都校验按相对路径排序的完整内容 SHA-256 指纹，能够拒绝预检后发生的同长度修改。回归覆盖跨根扁平冲突、暂存篡改、两个并发确认仅一个成功，以及 Host 重启后继续校验并确认。

skills alpha.11 按 WorkBuddy 参考重组已安装列表和详情；alpha.12 修正长列表进入详情后沿用旧滚动位置的问题。列表明确标题与真实数量，卡片使用首字母标识并进入独立详情；详情展示官方 Remote 当前确实提供的名称、说明、适用场景、调用策略和命令，“去试试”创建 Harness 原生任务并预填 `/name`。官方浏览器目录尚不提供完整正文、路径或写操作，因此编辑、打开目录、启停和卸载等待技能管理 Host 契约后再开放，不显示无响应控件。真实 Chromium 已覆盖列表、进入详情、滚动归顶、返回、试用草稿、创建草稿、重连、卸载及重装；技能相关集成测试 4/4 通过。

skills alpha.13 将技能列表与详情组件迁移为 `.tsx`。Slot、Remote 与 Session 交接行为未改变；组件继续只接收 `main` Slot 注入的最小 props，Harness renderer 保持唯一 React root。Node 22.23.2 下 typecheck、build、check:plan、463 项版本锁定、技能集成 4/4 和完整 Chromium 安装/重连/卸载/重装回归通过；18989 预览已安装 bundle alpha.25 并验证 15 项真实目录、详情与返回。

skills alpha.14 / ui alpha.3 将已安装技能改为 WorkBuddy 参考的紧凑卡片、启停入口、卡片管理菜单和浮层详情；公共 Modal 负责遮罩、Escape、焦点约束与焦点返回，可供后续专家、连接器和行业应用复用。Host 新增 `SkillManager`，以官方 `ctx.skills.list/get` 为读取底座，读取完整本地 `SKILL.md` 与资源清单，使用 SHA-256 预期修订阻止覆盖冲突，通过移出官方技能根实现不修改正文的启停，并把卸载项移动到可恢复目录。浏览器到该服务的严格 Remote 仍受 rc.1 外部包生成限制，因此当前卡片管理动作先交接到原生 `/skill-creator` 任务；UI 不伪报即时成功。公共目录、分类、更新和组织发布仍未实现。

skills alpha.15 为 Host 增加安全导入契约：先验证直接 `SKILL.md`、名称、说明、目录深度、文件数、总大小和符号链接，再复制到官方技能根内的临时目录，复核名称与字节数后原子改名；冲突或失败会删除临时产物。默认安装到共享 Agents root，也可明确选择 Profile root。该服务已通过真实官方 filesystem provider 测试；Client 直连和公共目录仍沿用上一段边界。

skills alpha.16 将原 229 行 Client 文件拆成 74 行 Harness 装配入口、独立 `SkillsPanel.tsx`、任务草稿交接和样式模块。页面结构使用 TSX，样式作为独立模块由 Slot 组件挂载；没有增加 React root、运行时加载器或自定义 Host 通道。该重构为后续生成 Remote 接入保留单一数据适配点。

skills alpha.17 / bundle alpha.29 已将技能列表和管理切换到全局 Host `SkillManager`。管理器读取官方 registry，并补充扫描 Profile 与共享 Agents 的受控技能根，避免 Session preset 临时投影漏掉实际已安装技能。编辑保存、revision 冲突、打开文件夹、启停和可恢复卸载均为直接实现，成功后重新读取 Host 事实；创建与上传继续使用原生 Conversation。由于 rc.1/rc.2 的 Typert 生成器仍不能为外部 npm workspace 生成 Remote，当前兼容层使用 Harness Connection 公开且带浏览器认证的 exact Fetch route，迁移条件和安全边界已写入官方开发规范。隔离 Chromium 已实测编辑正文、停用、启用、试用和卸载，并完成停服移除、重启与重新安装；集成测试 11/11 通过。

skills alpha.18 / bundle alpha.30 继续封闭本地管理风险：停用时在 Host 状态目录记录原始技能根和入口，启用时原位恢复，避免 Profile 技能漂移到共享目录；所有正文、资源、启停、卸载和恢复操作按技能名获取跨进程文件锁，拿锁后重新核对 revision。受控目录使用 `lstat` 与 `realpath` 拒绝符号链接逃逸。详情支持读取、编辑和新建资源文件；“最近卸载”读取 Host 回收凭据并可恢复到卸载前的启用/停用状态。页面在重新获得焦点或恢复可见时重新读取全局目录，承接原生创建/上传任务的完成结果。Node 22.23.2 下 build、typecheck、12/12 集成测试与完整 Chromium 安装、资源编辑、启停、卸载恢复、插件移除重启及重装验收通过。

skills alpha.19 / bundle alpha.31 将“上传技能”改为独立的导入弹框。浏览器支持 `.zip`、单个 `.md` 和文件夹选择，文件通过 Connection 的认证 `requestBody: 'streaming'` exact Fetch route 交给 Host；Host 以官方文件技能格式校验 YAML frontmatter、名称、说明、唯一 `SKILL.md`、路径、展开体积、文件数和深度。预检不安装，用户看到文件清单与共享/Profile 范围后确认才原子写入；同名冲突不覆盖，失败保留暂存供重试，取消、成功或 24 小时过期后清理。分类栏作为未来公共目录的禁用设计位恢复，当前不会产生无结果点击。Node 22.23.2 下 build、typecheck、13/13 集成测试及完整 Chromium 文件选择、预检、确认安装、详情重开、插件移除重启与重装回归通过。

skills alpha.10 将 `skill-creator` Host 贡献从组合包源码迁回技能插件根入口，bundle 只在构建时组合它。所有任务共享技能默认使用官方 `$DSH_AGENTS_HOME/skills`（未配置时 `~/.agents/skills`），Profile 私有和工作区范围必须由用户明确选择；同名目标先读取、展示冲突并再次确认，不能覆盖无关技能。设计保留未来“已安装/公共技能”范围与真实分类，但分类由公共目录契约拥有，不污染 Harness 官方 skill frontmatter。Node 22.23.2 下新增 Host 注册/释放测试、官方冷重启持久化和调用策略测试 4/4 通过；typecheck、build、check:plan、版本锁定及完整 Chromium 安装/重连/卸载/重装回归通过。

skills alpha.9、bundle alpha.21 修正技能库筛选语义：官方目录目前只提供已安装技能及说明，没有办公协同、开发工具、数据分析、内容创作、知识学习等分类元数据，也没有未安装集合，因此页面移除这些虚构分类和无动作的“我安装的”按钮。顶部只保留真实搜索、静态“已安装 N”状态与可执行的“添加技能”菜单。分类将在领域契约提供真实字段与有效集合后再开放。Node 22.23.2 下 typecheck、build、check:plan、463 项版本锁定及完整 Chromium 安装/重连/卸载/重装回归通过；18989 人工预览已升级，实测读取当前用户目录的 15 个技能且不存在上述分类按钮。

18989 预览曾误用项目内空的 `.test-runtime/preview/agents`，导致官方文件提供方只发现 bundle 自带的 `skill-creator`；用户原有技能并未删除，仍位于 `/Users/techflag/.agents/skills`。预览已恢复使用当前用户 Agents home；用户新增 `file-count-by-category` 后，实测技能库显示 15 个。新增 `corepack pnpm preview` 固定该启动方式；自动化探针继续隔离，不能把测试目录当成人工预览目录。


## 2026-09-12：D02 工作台代码边界收口

workbench `0.1.0-alpha.9` / bundle `0.1.0-alpha.36` 将公开入口、Harness Slot 装配、TSX 页面结构和样式拆开。`packages/plugins/workbench/src/index.ts` 只导出装配函数，`src/harness/client.ts` 只负责官方 Slot 注册，`BusinessPanel.tsx` 和独立样式模块负责展示。没有创建第二个 React root，也没有改变 Harness 对 Sidebar、Workspace、Session 和 Conversation 的所有权。Node 22.23.2 下相关 build/typecheck、32/32 集成测试及完整打包浏览器探针通过。

bundle `0.1.0-alpha.37` 同样拆分默认 Client 入口、Harness 装配、品牌、URL 状态、诊断 TSX 与样式，并把 D01 接入验证限制为显式 `diagnostics=1`。普通产品路径不再注册诊断 panel 或导航，未知/诊断 view 均回到原生 Conversation。完整打包浏览器探针已覆盖显式诊断可用、普通路径诊断不可见、刷新归一化、重连、停服移除与重装。

## 2026-09-12：本地 D01 收口与企业版后置

D01 的完成范围现明确为本地单用户产品基线：锁定 Harness 官方扩展方式，完成干净安装、官方 Client/Host 组合、默认/本地 Skill 消费与恢复、可信 local identity、资源授权、审计、Session owner/runtime binding 和官方工具 guard。发布版 Typert 对外部 workspace 的生成兼容问题不影响当前采用官方 Connection exact Fetch 的本地功能。

企业 Session Remote、服务器认证、组织成员管理、文件与其他 Remote 的全路径多人授权、撤权后的在途取消、隔离 Worker、管理 Web 和组织能力分发均移入[企业版架构说明](ENTERPRISE-EDITION.md)与 [ToDo](TODO.md)。这些能力不会从计划中消失，也不再被写成当前本地版本的伪完成条件。P0-02—P0-05 和 P1-09 的 `completed` 只表示本地基线完成；企业版必须以 E01—E05 重新立项和验收。

结构化顺序台账已把 D01—D03 标为 completed，当前步骤为 D04 专家模块。企业服务端继续保持后置。

## 当前约束：Harness 官方开发规范

已将官方 Web Client Slots、右侧 Sidebar 与新增 Package 说明固化为 [Harness 官方开发规范](HARNESS-OFFICIAL-DEVELOPMENT.md)，并加入 AGENTS.md 与 `check:plan` 强制检查。左栏只通过 `sidebar.brand.*`、`sidebar.panellist` 和配对 `main` entry 增量扩展；Harness 继续拥有 Workspace、Session、新会话、菜单与设置。右栏只承载当前 Session 的文件、目录、资料、成果和上下文页面，不承担全局导航或全局管理。

本轮审计确认当前 `ctx.slots.inject(...)` 用法符合官方 owner 生命周期示例；独立 registry、监听器、timer、watcher 和子进程继续由 Cordis effect/disposer 管理。旧 ADR 0014、UI 规范和侧栏证据中关于整块 sidebar priority 替换、“更多/返回 WorkDSH”及设置中转弹框的陈述已修订，不再作为实现依据。

代码审计同时把 skills、workbench 与 bundle Client 的 Slot 组件 props 改为从官方 `PropsRuntime<K>` 与 `InjectFace<I>` 推导；rc.1 未完整推导 `usePanelInfo` selector 参数处保留官方 `PanelInfo` 标注。该修改只收紧类型契约，不改变生成后的界面行为。

验证：Node 22.23.2 下 `check:plan`、planning tests、`check:versions`、typecheck 和 build 全部通过；463 个 DSH 锁定项保持 `0.1.5-rc.1`，Cordis 仅 `4.0.2`。本轮未改变运行 UI，未重装或重启 18989 预览，也未运行模型、Remote 或浏览器交互测试。

## 当前交付：新增技能原生闭环

skills alpha.8、bundle alpha.20 将“添加技能”改为查找、上传、创建三项菜单。查找聚焦当前已安装目录；上传与创建在当前或首个工作区创建 Harness 原生 Session，打开官方 Conversation，并通过公开 `conversation.input.setDraft` 分别预填导入说明或 `/skill-creator 请帮我创建一个可以实现「……」的 skill`。斜杠指令、`@`、附件、确认对话、权限、模型、文件工具与发送继续由 Harness 原生界面处理。

bundle 0.1.0-alpha.20 在官方 `ctx.skills` 注册随包 `skill-creator` 引导技能。它定义创建、更新和安全导入流程，不实现第二套执行器：导入先检查附件结构且不执行脚本，确认后由官方工具把技能写入 `$DSH_HOME/skills/<name>/SKILL.md`（全局）或 `<workspace>/.dsh/skills/<name>/SKILL.md`（工作区），由 `dsh-skill-filesystem` watcher 更新目录，再通过官方 `/name` 链调用。DeepSeek Harness rc.1 没有发布 skill-creator 成品，故引导正文由 WorkDSH 提供，注册、发现、加载和调用均复用官方接口。

验证：Node 22.23.2 下 planning 2/2、check:plan、463 项官方版本锁定、typecheck、build 与完整真实 Chromium 安装/重连/停服卸载/重装回归通过。18989 预览已安装 alpha.20；实测菜单三项可见，创建草稿精确显示参考文案，上传草稿与原生附件、权限、模型和发送控件同时存在。未发送模型请求或实际安装外部技能包；导入落盘、冲突、权限拒绝及重启发现仍待 D03 闭环验收。

这与计划 P1-03 不冲突；它替换此前临时只读切片，并提前完成“自然语言创建”这一段。表单导入、不可变修订、启停、卸载、依赖影响与组织发布仍未完成，P1-03 和 D03 不标记完成。

## 当前交付：原生新任务入口（P1-01 展示切片）

最新纠偏：workbench alpha.6、skills alpha.4、bundle alpha.14 撤销 WorkDSH 对整块 sidebar 的替换，并删除 skills 插件残留的“专家 · 技能 · 连接器”panellist 项。左侧恢复 Harness 官方工作区/会话列表和创建、重命名、删除、分叉、归档、时间、折叠、搜索及设置行为；WorkDSH 只保留品牌和独立业务页面。旧“更多/返回 WorkDSH”双侧栏方案废止。

进一步纠偏：纯 Harness 侧栏也不是最终产品形态。workbench alpha.8、bundle alpha.16 在同一个官方 Sidebar 中，按 WorkBuddy 参考通过公开 `sidebar.panellist` 恢复助理、项目、“专家 · 技能 · 连接器”、定时任务、资料库和更多；其下仍是 Harness 原生工作区/会话树。能力中心保持一个入口，页面内部再分专家、技能、连接器。领域页当前只说明接入状态，后续由各领域服务替换，不能伪造业务数据。

用户再次纠偏后，workbench alpha.5、bundle alpha.13 删除了 WorkDSH 自建首页 textarea、开始按钮、场景标签和工作区回显。“新建任务”现在只清除当前 Session 并进入 Harness 原生空 Conversation，直接获得 `/` 指令、`@` 文件或对话引用、附件、权限、模型、preset、发送与取消能力。旧 `workdsh-view=home` 和无效页面参数统一归一化到 `conversation`。左侧工作区行只展开/收起，会话行打开已有 Session，不再用点击文件夹暗中创建任务。

设计规范已将“不得复制 Composer”列为硬约束；日常办公、代码开发、设计创意、快捷能力与案例入口延后到有公开 command/skill/preset/draft 接入后实现。当前改动不发送模型请求，也不新增 Session 执行器。

验证：Node 22.23.2 下 alpha.16 typecheck 与 build 通过并已安装到本地 18989 预览。同一官方 Sidebar 内依次显示 WorkDSH 的助理、项目、“专家 · 技能 · 连接器”、定时任务、资料库、更多，以及 Harness 原生工作区/会话树；新建会话、添加工作区、搜索会话、视图选项、会话时间和设置均保留。点击“专家 · 技能 · 连接器”进入现有真实技能库，页面内部保留专家、技能、连接器、行业应用分栏。原生空 Conversation 继续显示 `/` 指令、`@` 文件或对话引用、附件、权限、模型、preset 与发送控件。本轮未发送消息，也未触发工作区或会话写操作。

以下 alpha.12/alpha.11 内容保留为历史纠偏记录，已由上述原生入口规则替代。

## 历史纠偏：自建新任务首页

用户纠偏后，workbench alpha.4、bundle alpha.12 已恢复 Harness 原版的左侧“工作区 → 会话”结构：工作区来自官方 Workspace Controller，会话按 workspace.sessionIds 归组，未归组会话单独显示；点击工作区会选择新任务归属并打开首页。首页移除工作区下拉，只回显当前工作区。左侧“专家 · 技能 · 连接器”聚合入口已删除，技能页面仍保留为独立插件视图，等待后续确定非左侧入口。

验证：真实预览显示 `vipshop`、`skshu` 和未分组层级；点击 `skshu` 后首页当前工作区同步为 `skshu`，聚合入口数量为 0，浏览器无未捕获错误。Node 22.23.2 下 build、typecheck、check:plan 与完整 probe:browser 通过，安装、重连、卸载和重装回归保持通过。截图为 `.artifacts/workdsh-home-alpha12.png`。

workbench alpha.3、bundle alpha.11 已将 `workdsh-view=home` 从接入验证页改为正式新任务入口。页面采用 WorkBuddy 参考的居中标题、场景切换、主输入框、工作区选择和常用任务起点；工作区来自 Harness 官方 Workspace Controller。用户点击开始后，通过官方 Session Controller 创建任务，将描述写入官方 Conversation 草稿并进入原生会话，模型、权限、附件、审批和执行状态仍由 Harness 管理。

接入验证保留在 `workdsh-view=diagnostics`，不再占据正常首页。当前任务场景标签仅表达入口偏好，尚未绑定 preset；专家引用、附件和推荐内容等待对应领域服务，不在首页伪造。无工作区时页面显示真实空状态并禁止开始任务。

验证：Node 22.23.2 下 typecheck、build、check:plan、check:versions 与完整 probe:browser 通过。真实浏览器读取 `vipshop`、`skshu` 工作区；创建任务后 URL 进入 `conversation`，原生输入框保留首页草稿且未提交模型请求，浏览器无未捕获错误。安装、重连、卸载与重装回归通过。预览已升级至 bundle alpha.11；当前步骤仍为 D01，activeSlice 为 workbench-home。

## 当前交付：全局技能库语义修正（P1-03 切片）

依据用户对 WorkBuddy 的纠偏，skills alpha.3、bundle alpha.9 已将技能页从“某个任务的技能目录”改为用户/组织全局技能库。页面移除了任务选择、新建任务和“打开对应任务”；增加“我安装的”、添加技能、已安装/SkillHub/套件及分类骨架。真实安装、市场和分类服务尚未接入，对应动作保持禁用。技能详情说明 `/name` 可在任意 WorkDSH 任务中调用，实际加载仍由 Harness 官方 Skill 子系统完成。

产品规则已固定：技能由用户或组织拥有，所有 WorkDSH 业务任务默认解析全局层；项目和 preset 可以追加或覆盖，Session 只是运行时解析视图。rc.1 的公开 `skills/list` Remote 仍要求 Session，因此当前页面以已有 Session 的官方目录作只读去重汇总；无任务时显示诚实空状态，不暗中创建任务。完整安装台账等待自有 Host Remote 可通过官方生成链发布后，改为无 scope 的 `ctx.skills.list()` 投影。

验证：Node 22.23.2 下 build、typecheck、check:plan、check:versions 通过；完整 Chromium 安装、全局页面、无任务空状态、无任务选择器、1440/1920/390 响应式、重连、卸载及重装通过。预览已升级为 bundle alpha.9，地址仍为 `http://127.0.0.1:18989/?workdsh-view=skills`。

## 当前交付：公共工作台侧栏（P1-01 展示切片）

> 历史记录：本节描述 alpha.8 的整块侧栏替换方案，已由上方 alpha.16 的官方 Sidebar 增量方案取代。设置说明弹框、“更多/返回 WorkDSH”、自建任务列表与 useSessions 页面投影均不属于当前实现。

依据用户图2与 ADR 0014，已实现 ui alpha.2、workbench alpha.2；skills alpha.2 复用公共图标。bundle alpha.8 已安装到 18989。alpha.8 修正设置弹框主按钮被侧栏通用文字色覆盖的问题，并锁定正常与悬停对比度。

当时的替代侧栏包含品牌工具区、中文导航、任务/搜索/展开收起、空间待开放状态和固定设置入口；任务曾直接订阅官方 useSessions。该展示已撤销，现由 Harness 官方 Sidebar owner 直接提供这些原生行为。

验证：build、typecheck、check:plan、check:versions 通过；完整 Chromium 查询/详情/任务导航/搜索/设置弹框/原生侧栏往返/重连/卸载重装通过。主按钮计算样式为深色文字 `rgb(23,23,23)` 与浅色背景 `rgb(238,238,238)`。1440/1920/390 截图检查及窄屏紧凑态通过；截图 `.artifacts/client-probe-settings.png`、`workbench-preview-1440.png`、`workbench-preview-390.png`。本轮未执行模型请求、团队鉴权或持久化集成测试；不涉及这些行为修改。

剩余：原生框架栏宽仍由官方 layout 管理（默认280px）；没有 Web 交通灯、假账号或示例业务项目；rc.1 无公开设置控制器，确认进入后仍需在官方侧栏点击“设置”；任务菜单/更多领域视图/公共弹框完整迁移未实现。下一步先实现新建任务首页与共用输入周边布局，仍复用官方 Conversation，随后承接技能管理准入与导入；不把本切片标作完整 P1-01 或 D02 完成。

## 历史修正：技能页首次对齐原型

用户指出正式界面与原型差距。bundle 0.1.0-alpha.4 通过官方主题 register/setTheme 为 WorkDSH 提供中性深色呈现，处理 Host 设置异步回填后的主题一致性，卸载释放同步并恢复此前偏好。未用 CSS 隐藏原生 DOM。

技能顶部恢复专家/技能/连接器/行业应用分类、右侧搜索；任务选择/新建/刷新收入“可用范围”，卡片置于工具栏下方。非技能分类标注尚未实现并禁用；不伪造导航数据。诊断导航仅 diagnostics=1 时展示。真实名称、说明与调用行为保留。

仍有差距：原生侧栏布局、完整业务入口、统一公共组件迁移、技能中文展示名和全局管理服务未完成。此轮不宣称整体还原。下一步优先迁移公共工作台导航与组件，再承接技能导入；现有查询功能保留。

验证与预览：alpha.4 的 build、typecheck、check:plan 与 Chromium 安装/查询/详情/重连/卸载重装检查通过；1440/1920/390 布局检查通过。18989 预览已安装 alpha.4 并重启，真实目录截图 `.artifacts/skills-preview-aligned.png`。预览依赖缓存由 pnpm 11 迁回仓库 pnpm 10，旧 node_modules 已保留备份，任务数据未删除。

## 当前交付：技能浏览页面（P1-03 切片）

依据用户确认改按可用功能推进，见 ADR 0013 和 development-order.activeSlice。D01 未通过项仍保留；旧接续段落中的“下一步做隔离探针”由本节覆盖。当前 skills 0.1.0-alpha.1 通过 bundle 0.1.0-alpha.4 装配。

**可以看到**：正式应用左栏“专家 · 技能 · 连接器”，地址 `http://127.0.0.1:18989/?workdsh-view=skills`。支持新建/选择任务、真实技能目录、名称/说明/场景搜索、详情弹框、复制 /name、打开对应原生任务。无任务时提示创建；目录按任务读取，不是全局安装列表。预览已安装并重启；首次浏览器仍须使用官方登录链接建立 cookie。

**尚未完成**：文件导入、完整正文/资源查看、不可变技能修订、创建技能、业务发布和团队管理。没有伪造导入按钮。下一步以本地导入和重新打开后可用为目标，补齐必要的身份归属/持久化/官方解析调用接口；不继续扩展无关独立探针。

验证：build、typecheck、check:plan、check:versions、集成 8/8 通过；真实 Chromium 安装链通过，包含创建任务、真实目录、搜索无结果、详情、Escape 与返回任务。1440/1920/390 截图检查通过；390 先用公开 layout 控制折叠原生侧栏。对照截图可见主页面采用中性暗色、紧凑卡片，原生外壳已使用官方主题服务统一深色，导航结构仍未完整迁移。错误状态/复制失败有界面处理，尚未自动覆盖所有权限及断网分支；未执行真实模型或外部业务写入。

构建用 esbuild 只打包自有模块，React 和运行期加载继续由官方 Client loader 提供。没有自建 Skill registry/解析器/Remote/Session/Conversation。共享 UI 包仍未整体迁移。

## 最新接续：官方持久化冷恢复与技能退役

新增 `tests/integration/skill-persistence.test.mjs`，使用官方 JSONL 提供方及 create/resume/open/read/flush，在四个独立 Node 进程中依次创建、读取、恢复执行、再次读取。落盘事件与运行时快照一致；技能文件移除后最新目录为空，新调用返回错误，旧正文和结果保留。

测试发现此前 followup 普通对象缺少消息身份，已在两个测试入口改用官方 `createMessage`。目录退役实际通过追加空目录事件记录，不是覆盖历史事件。共享测试组件抽到 `tests/helpers/skill-runtime.mjs`；未改产品插件或官方代码。

验证：集成 8/8，build、typecheck、版本检查通过。仅证明正常 flush/dispose 后冷启动恢复；未验证崩溃恢复、真实模型、团队权限或数据库。页面未更新。

下一步：验证两个同时存活的官方 Agent Session 对同名技能的实际调用与卸载隔离，把已有 scope 隔离证据推进到完整 Session 执行层。Remote 生成兼容阻塞保留，D01 / P0-03 仍 in_progress，不进入 D02。

## 最新接续：官方 skill 的 Session 消费正反例

新增 `tests/integration/skill-session.test.mjs`，运行真实官方 Agent loop / Session / tools / tool-skill / scope；模型 I/O 使用本地固定 LlmAdapter，不发网络请求、不使用凭据。首个请求仅收到目录，官方工具读取后下一请求收到规范正文，Session 公开事件记录保存目录、调用及结果。禁止模型调用的反例中，目录不暴露该技能，强行请求返回关联到原 call id 的工具错误，正文未进入请求或事件。此规则是技能调用策略，不是组织权限或任意文件沙箱。

8 个已在锁文件中的官方组件显式声明为根测试依赖，均精确 rc.1；未增加产品执行器或改动业务插件。复用记录及结果见 [预设证据](evidence/d01-presets.md)。初稿漏传创建所需 sessionId，补入独立 UUID 后正反例及全集重跑通过。

验证：集成 7/7；build、typecheck、版本检查和冻结安装通过。当前 Session 是内存事件日志，未接磁盘 persistence；本轮未执行浏览器、真实模型、数据库、外部连接器测试。预览服务和页面未更新。

下一步：用官方 Session persistence 验证 skill 目录/调用结果的保存与冷恢复，并补目录变化/退役的持久语义。Remote 生成兼容阻塞保留，D01 / P0-03 仍 in_progress，不进入 D02。

## 最新接续：Remote 识别边界定位与 C01 正文隔离

P0-02 已定位 rc.1 generator 的 protocol 符号识别边界：纯 npm 导入不属于它登记的 workspace 包，也不是它接受的 ambient module。公开运行时 `remoteMethods` 与服务 namespace 检查通过，说明 decorator 正常，失败位于构建分析。生成命令仍返回非零，未修改官方包或伪造声明，见 [Remote 证据](evidence/d01-remote.md)。

同一 D01 内已推进独立 C01：复用公开 createScope、SkillRegistry 和文件提供方，两个 scope 并发读取同名技能得到各自正文，全局不可见，卸载 B 不影响 A。它不是 Session 工具消费或团队鉴权证明。新增 scope 为精确 rc.1 测试依赖。

验证：既有及新增集成测试 5/5，Remote 生命周期/marker 测试 4/4。marker 测试初稿误把 Cordis 服务代理当原对象、要求同名 exportName 必须冗余存在，按公开 marker 的可选别名语义修正后重跑通过。Remote 生成再次复现原错误。

下一项：C01 官方 skill 工具的 Session 内实际消费及持久目录验证；P0-02 保留生成兼容阻塞，公开解决前不能完成 Remote 网络链。D01 保持 in_progress，不进入 D02；产品页面和预览服务未更新。

计划检查、版本检查（463 个 DSH 锁条目均 rc.1）和冻结安装通过。本轮产品 build/typecheck、浏览器、真实模型、数据库、外部连接器测试未执行；fixture 已由测试命令编译通过。

## 最新接续：P0-02 Remote 生成兼容性与 Host 清理

已新增隔离的纯 npm Remote 最小例与官方生成器入口，证据见 [Remote 探针](evidence/d01-remote.md)。官方 generator/protocol 精确锁定 rc.1，未添加运行时底座。Host 生命周期测试 3/3 通过：完成与参数拒绝、取消不影响并发请求、卸载清理及重装。

生成门槛仍失败：服务和方法被识别，但没有 Remote 元数据，报 `publishes Remote artifacts but has no Remote methods`。暂不能确认是外部包兼容性还是缺少公开配置。失败保留为非零检查，最小例隔离在 examples，不装进现有产品 Profile。产品 bundle 版本、入口与预览服务未更新；网络 Client/Host 取消、严格 wire 校验尚未执行。

下一步先解决该生成兼容点，再接自有 Remote 端到端链；C01 剩余 Session 正文/工具隔离和其他 D01 门槛继续保留。仍为 D01 / P0-02 in_progress，不跳 D02。

本轮验证：build、typecheck、既有集成 4/4、新增生命周期 3/3、规划测试 2/2、冻结安装和版本检查通过（463 个 DSH 锁条目均 rc.1）。check:plan 首次提示新示例未登记，补入 modules.json 后通过（26 模块、34 必需文档）。生成探针仍失败，如上；浏览器、真实模型、数据库与外部连接器测试未执行。

## 最新接续：官方优先复用约束与 C01 探针

用户要求已固化到 AGENTS.md“官方优先复用硬约束”和 PLUGIN-DELIVERY 的复用记录模板。每项编码先定位官方能力、精确版本及公开入口，明确业务差异；禁止重复建设执行底座，新基础抽象需缺口证据与 ADR。当前探针的记录见 [预设证据](evidence/d01-presets.md)。

本轮实际增加：真实 Host 中同时存在的两 Session 技能目录隔离、切换 B 不改变非空 A；官方 SkillRegistry + FileSystemSkillProvider 正文按需加载、目录与正文分离、旧返回值保持、取消拒绝和卸载后不可用。两个测试依赖精确锁定 rc.1；未增加业务插件实现。

验证：`corepack pnpm test:integration` 4/4；`corepack pnpm probe:presets` 完整通过（含重启、原地改写与删除回归）；冻结安装、版本检查（461 个 DSH 锁条目均 rc.1）、build、typecheck、check:plan 和探针语法检查通过。首次双页面测试因 Playwright context 创建及新会话配置引导遮挡失败，修正测试后完整重跑通过；未改官方 UI。使用 Corepack 固定 pnpm 10.34.5 后未出现此前裸 pnpm 的 overrides 警告。

边界：正文测试是发布包接口集成，不是模型 skill 工具消费；双会话目录隔离不证明提示词、任意工具、正文或团队权限全部隔离。真实模型、外部连接器与业务数据库测试未执行。D01 仍 in_progress；下一步接自有生成 Remote/取消探针，随后继续 C01 剩余的 Session 内正文/工具隔离及其他 P0 门槛。预览服务未更新。

## 前次接续：DOC-06 全量收尾

H08 development/i18n 6 份及 H09 剩余子系统 14 份已审，累计 127/127、0 待审。新增 [审查收尾与探针清单](research/harness-review-closure.md)，同步架构、契约、团队、项目、计划和逐插件顺序；修正 Typert 一元调用的表述，保留 stream 与 Plan 提交时机的 rc.1 待验证项。既有 ADR 的不可变修订、官方 Storage 和 Session/业务事实分界继续有效。

验证：`pnpm audit:harness-docs` 127/127；`pnpm check:plan` 通过（25 模块、34 文档及相对链接）；检查脚本语法与 `git diff --check` 通过。仓库仍未跟踪，diff 检查不代表新增文件全部受 Git 审查。pnpm 的 overrides 忽略警告仍存在，本轮未改依赖配置。产品构建、浏览器、真实模型、业务数据库和外部连接器测试未执行；本轮没有业务实现变更。

DOC-06 标记 completed，D01 仍 in_progress。下一步明确为 C01 / P0-03：现有 probe:presets 增加两个同时存活 Session 与技能正文按需加载验证，随后继续自有 Remote/取消和其余 D01 门槛。尚无新的外部阻塞；完整团队服务与正式业务工作台仍未实现。

## 当前阶段

D00 设计修订完成，当前 D01 集成验证进行中。已安装并锁定发布依赖，bundle 安装探针已实现；已有 Client 接入验证页，尚无业务工作台或业务数据库。

- 最近完成：DOC-05（R01—R06 设计修订及机器验收映射）；已完成发布依赖安装、bundle build/typecheck。此前完成 DOC-04（逐插件顺序及版本规则落盘）。此前完成 DOC-03（修订 7 项目界面补充）。此前完成 DOC-02。项目已提升为首期独立领域；四份官方文档映射已补齐。此前完成 DOC-01。团队身份、权限、审计和运行隔离已前移到首期设计。
- 下一步：解决 P0-02 隔离用例的 Remote 元数据生成失败，再接自有 Remote/网络取消；随后验证 Session 内 skill 正文与工具隔离。C01 已完成双 Session 目录及发布包正文接口测试，完整绑定/权限仍待验，不跳到 D02。
- 后续修订：P1-09 本地治理基线是本地业务模块前置；P1-10 已移入后期企业版，不再作为当前本地发布门槛。
- 环境：默认 shell Node v21 不符合目标；本轮使用已安装 Node v22.23.2 与 pnpm 10.34.5 验证。执行前须切换合规 Node。
- 禁止推断：Git 初始 main 尚无提交；没有自动提交或发布。

## 状态含义

`todo` 未开始；`in_progress` 正在处理；`blocked` 有具体外部或接口障碍；`completed` 有完成证据。目录存在不代表所属功能完成。

| ID | 任务 | 阶段 | 状态 |
| --- | --- | --- | --- |
| DOC-01 | 完整开发计划、团队首期设计与目录 | 基础 | completed |
| DOC-02 | 项目与专家/技能/资料库设计细化 | 基础 | completed |
| DOC-03 | 六图项目交互依据、规格和验收补充 | 基础 | completed |
| DOC-04 | 逐插件开发顺序与版本规则 | 基础 | completed |
| DOC-05 | 修复 R01—R06 设计审查 | 基础 | completed |
| DOC-06 | DeepSeek Harness 官方文档全量能力审查 | D01 | completed |
| P0-01 | 环境与发布依赖锁定 | P0 | completed |
| P0-02 | bundle/Host/Client 安装链探针 | P0 | completed |
| BROWSER-01 | Agent Session 受管浏览器与右栏同页操作 | P1 专项 | in_progress |
| P0-03 | 专家预设、技能与恢复探针 | P0 | completed |
| P0-04 | 契约与兼容门槛 | P0 | completed |
| P0-05 | 团队身份与全路径隔离探针 | P0 | completed |
| P1-01 | 契约与工作台 | P1 | completed |
| P1-02 | 专家管理及 expert-manager | P1 | todo |
| P1-03 | 技能管理及 skill-creator | P1 | completed |
| P1-04 | 连接器管理 | P1 | todo |
| P1-05 | 行业应用与项目 | P1 | todo |
| P1-06 | 资料库与成果 | P1 | todo |
| P1-07 | 跨插件业务执行 | P1 | todo |
| P1-08 | P1 发布验收 | P1 | todo |
| P1-09 | 团队基础实现 | P1 | completed |
| P1-10 | 企业管理后台基础入口 | P1 | todo |
| P1-11 | 项目配置、待办、任务、资产与交接 | P1 | in_progress |
| P2-01 | 专家团模型及执行映射 | P2 | todo |
| P2-02 | 专家团失败与取消 | P2 | todo |
| P2-03 | 自动化配置与调度 | P2 | todo |
| P2-04 | 调度恢复与去重 | P2 | todo |
| P2-05 | 提供方接入示例 | P2 | todo |
| P3-01 | 企业后台/SSO/隔离运行提供方 | P3 | todo |
| P3-02 | 团队资产提供方 | P3 | todo |
| P3-03 | 在线表格 | P3 | todo |
| P3-04 | 业务页面 | P3 | todo |
| P3-05 | 发布撤销与分享 | P3 | todo |
| P3-06 | 工厂业务场景验收 | P3 | todo |

## 验证证据

- DOC-01：计划完整性检查的结果见 `docs/evidence/planning-validation.md`。
- bundle 探针 build/typecheck 通过；规划测试 2/2 通过。业务 unit/integration/e2e 未执行，尚无对应实现。
- 真实模型与连接器业务测试：未执行。

## 接续记录模板

每轮更新：任务 ID、实际变更、验证命令与结果、未完成项、阻塞与下一步。范围变化附 ADR 编号。不要把后续阶段从表中删除。

DOC-02：新增 PROJECT-DESIGN 与官方依据记录，更新计划/契约/验收/目录；检查结果见 [规划证据](evidence/planning-validation.md)。所有产品任务仍为 todo，下一步仍是 P0-01。

## 修订 6 审查记录

2026-09-10：完成文档 review，发现 6 项待处理设计问题，详见 [审查报告](evidence/plan-review-2026-09-10.md)。审查完成不表示问题已修复；原三份设计文档未改动。计划检查通过，产品测试未执行。下一步优先修订 R01—R06，随后继续 P0-01。

DOC-03：补入截图事实分级、四主标签、配置侧栏、留言评论、能力选择、成员授权与结构化引用；新增 UI01—UI10 按单一阶段记录，补建 4 个占位目录。R01—R06 尚未关闭，原 J/T 验收阶段问题仍待专项修订。检查结果见 planning-validation；产品实现与测试未执行。

## 当前执行门槛

当前步骤 D01，状态 in_progress；DOC-05 已设计关闭，P0-01 已完成，P0-02 部分通过。业务插件仍未启动；完整步骤门槛见顺序台账。

DOC-05：见 [D00 证据](evidence/d00-resolution.md)。前述 R01—R06 待处理文字为历史记录；当前设计处理完成，产品保障仍待探针验证。

## D01 当前接续记录

已锁定 0.1.5-rc.1 发布包并生成 pnpm-lock.yaml；冻结安装通过。安装探针已验证 bundle Host 激活、匿名 HTTP 401、登录后 HTTP 200。CLI 移除后的运行中 disposer 等待超时，完整 probe:install 尚未通过，不能宣称热卸载可用；下一步区分 Profile 配置移除、重启生效与运行时卸载行为。Client、团队授权、数据库仍未验证或实现。

用户端/管理端及存储设计见 [部署与存储](DEPLOYMENT-AND-STORAGE.md)。首期共享 Host 和领域数据，独立界面与权限；数据库从 D02 各领域实现开始，不以探针代替业务持久化。

### D01 安装探针接续

安装/停服卸载/重启/重装探针现已通过；真实 Cordis 生命周期测试通过。运行中 CLI 热卸载仍未验证，不覆盖前次失败记录。新增依赖锁定检查及可复现开发命令，证据见 [D01 安装验证](evidence/d01-installation.md)。下一步继续 P0-02 Client 模块产物、Remote 与 Slots 探针；D01 不标完成、不跳到 D02。

### D01 Client 接续

候选包升级为 0.1.0-alpha.2：真实浏览器导航/页面注册、官方 Remote 查询和页面刷新验证通过。新 UI 使用公开模块注册协议，Host 通过包根加载以满足 rc.1 扫描；Remote 同时注入根服务与具体命名空间。截图与详细证据见 [Client 验证](evidence/d01-client.md)。冻结安装、构建、类型检查、生命周期测试通过；Slots 精确依赖补齐后执行版本与规划检查。自有 Remote、逻辑取消、物理断线恢复和隔离仍待验，P0-02 不整体完成。

### 工程目录整理

按用户要求将 16 个功能插件归到 packages/plugins/<domain>，父目录仅分类，子插件独立版本。同步 workspace、模块台账和相对文档链接；提供方与基础包保持原目录。此项为用户指定工程整理，不改变 D01 及后续开发顺序。决策见 ADR-0008。

目录整理验证：25 个模块完整性及相对链接检查通过，旧 packages/plugin-* 路径引用扫描无残留；冻结依赖安装、build、typecheck 与规划测试 2/2 通过。业务行为未改动，未重复浏览器测试。

### D01 连接与停服卸载验证

P0-02：增强真实浏览器验收，验证 WebSocket 两端关闭后自动重连、不刷新页面重新查询成功，以及停服卸载重启后 Client 模块/导航/面板缺席。修正认证探针，必须拿到有效 cookie 并验证认证后 200，避免仅凭 bootstrap 返回 200 假定成功。产品代码和包版本未改动。

证据见 [Client 验证](evidence/d01-client.md)。自有 Remote 生成/注册、逻辑取消、在途恢复、运行中 Client 热卸载仍未完成；下一步先实现公开 Typert 生成器的最小自有 Remote，再验证取消。P0-03/P0-04/P0-05 保持待办，不跳到 D02。真实模型、外部服务、数据库和团队产品测试未执行。

本轮验证：probe:browser 完整通过（安装、认证、断线后重连与新查询、刷新、停服卸载后 Host/Client 缺席、重装）；check:plan 通过，test:planning 2/2 通过。产品源码/依赖未变，build/typecheck/生命周期单测本轮未重复执行。

### 提供方目录整理

按用户要求将 4 个提供方归到 packages/providers/<name>。同步 workspace、模块清单、相对链接与完整性检查；父目录不声明 npm 包，各子提供方仍为 planned。此项不改变 D01 和业务开发顺序，见 ADR-0009。

验证：25 个模块完整性与相对链接检查、冻结依赖安装、规划测试 2/2 通过；旧提供方完整路径扫描无残留。本轮未修改产品源码，build/typecheck/浏览器测试未执行。

### UI 设计提案 v1

按用户要求制作独立交互原型 docs/ui/index.html 和 UI-DESIGN.md。深色中文工作台、四个核心页面、能力搜索、项目四标签、空状态切换和示例预览已提供；资料库/管理/自动化为补充布局。全部为明确标注的示例数据，不调用产品 API。视觉方向待用户审阅；业务实现状态与当前 D01 不变。

原型验证：真实 Chromium 页面切换、场景填入、搜索、项目标签、空状态、预览弹窗与 390px 窄屏溢出检查通过，无 pageerror；已生成四页截图并检查首页与项目布局。check:plan 通过。产品 build/typecheck、模型与业务 API 测试本轮未执行。

### UI v2：按 WorkBuddy 参考修正

v1 与用户参考差距过大，按用户反馈重新对齐灰黑配色、三栏比例、紧凑导航、项目动态正文、配置卡片顺序与底部输入区；更新 UI-DESIGN。仍是示例原型，未连接业务服务，D01 状态不变。

验证：四页 Chromium 交互回归、搜索/空状态/弹窗/窄屏检查、check:plan 通过。项目页截图已目视检查；产品构建与业务 API 测试未执行。

### UI v3：图标与可读性

按用户反馈，将导航、工具栏、配置加号、输入操作与首页分类统一为本地 SVG 线性图标，统一尺寸/描边/对齐；专家字章调整为人物轮廓，技能类型字章保留。提高正文与次要文字可读性。原型交互回归和 check:plan 通过；目视检查项目截图。未执行产品构建或业务测试，D01 不变，视觉仍待审阅。

### UI v4：首页对照

用户以两张截图指出整体差距，本轮调整首页层次、比例、双层输入区、快捷入口、案例缩略图与侧栏缺项。四页原型交互检查通过，首页截图目视检查；仅设计原型，未执行产品构建和业务 API 测试，D01 不变。

### UI v5：专家中心参考对齐

按用户两图对比重排能力中心，精选场景、分类筛选、四列紧凑专家目录与顶部搜索已实现原型；场景封面和头像仍待素材完善。Chromium 四页回归通过，专家页截图目视检查。产品构建/业务 API 未执行，D01 仍进行中。

### UI 风格规范固化

将多轮提案合并为 UI-DESIGN 1.0，统一颜色、字号、SVG、布局、页面骨架、交互状态与视觉验收。旧提案移到 docs/ui/DESIGN-HISTORY.md，仅作历史。AGENTS/PLAN 与计划检查接入现行规范。当前原型仍有素材、组合筛选和组件抽取欠缺；不视作整体已达标，D01 不变。

本轮检查：check:plan 通过（25 模块、24 必需文档），规划测试 2/2 通过。未修改 UI 行为，未执行浏览器回归或产品构建。

### UI 资料库专项对齐

按用户截图增加资料库二级导航、容量、共享分段、类型筛选、四列表格和引导卡；补充 UI-DESIGN 第 9 节。浏览器检查包含七条示例资料、表格筛选三条、分享空状态、搜索单条及小屏无横向溢出；截图已目视检查。未执行产品构建/业务测试，D01 不变。

### UI 项目配置右栏修正

按用户两张截图修正右栏：限定宽度、消除内容横向溢出，收紧卡片和头像字章，统一标题/计数/加号对齐；定时任务改为 6px 状态点与独立时间行，查看全部保留可操作入口。尺寸与规则写入 UI-DESIGN 第 10 节。

验证：Chromium 五页原型回归通过；项目右栏在 1440、1920、1050、390px 宽度无内部横向溢出、卡片未越界；查看全部弹窗与 Escape 通过。1440×1000 项目截图已目视检查。check:plan 通过。参考截图视口不同，本轮未声称像素一致；专家头像和连接器标识仍为占位，未完成全量可访问性审计。未执行产品构建及业务 API 测试，当前 D01 不变。

### UI 共用配置弹框

按参考图替换项目专家、技能、连接器的文字占位小弹框，改为固定标题/页脚、可滚动两列卡片的大弹框；连接器包含个人/公共授权切换。抽出 docs/ui/components 的共用弹框和卡片，领域示例单独放在 project-dialogs.js；正式 packages/ui 仍待 D02 迁移，不改变 D01 状态。

验证：五页 Chromium 回归、三个弹框卡片数量、授权标签切换、Escape 焦点恢复、390px 弹框边界和取消通过；专家弹框截图目视检查；check:plan 通过。原型添加仅提示未接入，确定仅关闭，未保存数据。头像仍占位。产品构建、业务 API 与完整可访问性审计未执行。

### 共用 UI 与实际应用入口澄清

补充 UI-DESIGN 第 12 节：公共组件目录、领域状态边界，以及当前默认 Harness 外壳/独立原型/目标 WorkDSH Profile 三者区别。核对官方 Web Client 文档与现有 Client 探针源码：只验证 main 与 sidebar.panellist 注册，完整布局替换和默认首页尚未验证，列为 D01 后续验证项。无产品代码变更；本轮未执行浏览器、构建及业务测试。

### D01 公开布局接口核对与导航分类

读取已安装 0.1.5-rc.1 的 ui-layout/ui-sidebar README.zh.md 与公开 service.d.ts，确认品牌两个 single slot、panellist/main 配对和 selectPanel(null) 返回会话。默认左栏和刷新重置行为与原型存在差异，已写入 UI-DESIGN 第 13 节；逐插件入口位置同处登记。无导航不代表停用，UI 隐藏不替代授权。SSH 仅以截图观察，不猜测内部注册方式。此项为发布包文档/类型核对，完整外壳浏览器验证仍未执行，D01 未完成。

### D01 真实面板与原生会话往返

现有 Client 探针增加 layout 服务注入，通过 selectPanel(null) 返回原生会话视图。更新 Chromium 检查验证探针退出、导航返回及新 Remote 响应。build/typecheck 与完整 probe:browser 重跑通过。没有修改原型或上游源码，也未发送模型请求。品牌 Slot 占用组合、默认首页和完整工作台外壳尚未实现；下一步继续验证这些公开组合边界，D01 保持进行中。

### D01 品牌与默认首页真实验证

公开 Slot priority 覆盖品牌 mark/name，main 注册后通过 layout 选择探针。build、typecheck 与完整 probe:browser 通过：默认进入、品牌显示、刷新、会话往返、停服卸载品牌缺席和重装验证。实际仅替换品牌与默认面板，尚未迁移深色原型或完整导航；正式 Profile 应选定品牌提供者，当前为局部优先级探针。D01 不变，下一步处理页面恢复/深链接与正式布局组合。未执行模型任务、业务 API 或运行中热卸载验证。

### D01 页面刷新恢复

新增公开 usePanelInfo 驱动的 URL 展示状态同步；home/conversation 刷新恢复与失效参数回退已通过真实 Chromium。build/typecheck/probe:browser 通过。测试配置提示遮挡已使用官方稍后配置流程处理。未建立业务状态副本或发送模型请求。当前仍是两视图诊断探针，浏览器历史栈、业务深链接和正式导航未完成，D01 不变。

### D01 浏览器历史导航

页面切换写入 history，popstate 通过公开 layout 操作恢复 home/conversation；组件释放移除监听。build/typecheck/probe:browser 通过，新增真实后退离开探针、前进返回断言。18989 预览服务已重装当前本地 tarball 并重启。依旧为诊断页，不代表业务首页完成，未执行模型请求。多业务路由、历史项中的具体会话恢复尚未覆盖。

### Agent preset 设计与下一步计划落盘

补充 ARCHITECTURE 中专家/preset/Session 的职责、四种模式用途及安全边界。PLUGIN-DELIVERY 明确 P0-03 六步验证顺序与证据要求，PLAN 和 STATUS 同步优先级；currentStep 仍为 D01，不将原生说明算作本项目运行证据。本轮仅文档变更，未执行产品构建、模型或浏览器测试。


### 跨功能执行组合纳入系统功能

ARCHITECTURE 将 preset 提升为跨功能执行组合，区分角色/组合/范围；PLAN 映射普通任务、创作、应用、项目、管理和自动化到已有任务，CONTRACTS 补充拟定义引用，UI-DESIGN 补充选择与创作入口，ACCEPTANCE 新增 EC01—EC07（全部待实现）。下一步仍为 P0-03 探针，不提前开放四种模式或宣称业务完成。本轮仅文档，产品构建/浏览器/模型测试未执行。

### P0-03 第一组：预设发现与创作

新增 pinned agent-presets 直接开发依赖，使用发布包公开根导出建立可重复测试。真实 discover/copy API 覆盖两个副本、资源复制、修改隔离、重复/越界拒绝与 broken 诊断，1/1 通过。证据见 evidence/d01-presets.md。该测试仅文件发现与创作，不是可运行专家或安全隔离证据。下一步验证原生服务/Session 挂载及技能可见性，D01 仍进行中。本轮未修改预览服务、未执行模型或浏览器测试。

### P0-03 投影与切换入口边界

补充公开预设投影测试，验证选择后的组合优先于创建头，重放结果一致；集成测试 3/3 通过、冻结安装通过。P0-03 表格状态修正为 in_progress。明确 recompose 不执行空会话检查，业务入口必须使用受保护的选择接口。详见 evidence/d01-presets.md。真实 Host 挂载、技能发现及重启恢复仍未完成；下一步保持这些验证，不进入 D02。产品构建、浏览器和模型测试本轮未执行。

### P0-03 官方 Skill 运行探针

新增 `probe:presets`：隔离官方 Web Host 中复制 Cordis/Minimal 两个预设，真实 Chromium 创建空白 Session 并通过官方 `agentPresets/select` 往返切换。`skills/list` 实测为 Cordis 组合 15 项（含两项随包技能）、Minimal 组合 0 项、切回后恢复 15 项；`/` 菜单同步更新。非空 Session 切换被官方 Host 以 `agent-preset/locked` 拒绝；同一 DSH_HOME 重启后，原 Session 的 Cordis 技能目录恢复为 15 项。ARCHITECTURE 固定官方 Skill 子系统为唯一技能执行底座。证据见 evidence/d01-presets.md；P0-03 仍为 in_progress，下一步验证预设修改/删除、技能正文加载及两会话隔离。探针显式移除模型密钥，`MISSING_CREDENTIAL` 仅用于形成非空记录，未执行模型、外部连接器或业务数据库测试。

### P0-03 preset 修订与删除边界

真实重启探针确认：相同 preset ID 的组装文件改写后，历史 Session 会采用新组合；删除目录后，官方 `skills/list` 对历史 Session 成功返回空数组，没有明确缺失失败。新增 ADR-0010，规定已发布组合使用不可变 preset 修订 ID、引用存续期间不得物理删除、恢复前校验摘要和健康状态。官方 Skill 仍是唯一执行底座，WorkDSH 只补业务修订与保留策略。下一步验证两会话状态隔离和技能正文按需加载；P0-03 保持 in_progress。

### DOC-06 Harness 官方文档审查

用户提供 `docs/dsh-v0.1.6-alpha.2` 完整镜像后，将全量能力审查加入 D01 前置。机器盘点为 375 个文件、249 个 Markdown；按中文对侧优先及 5 个无中文对侧英文文档，共 127 份规范审查对象。新增审查计划、逐文件台账与 `audit:harness-docs`，当前 H01 进行中，4/127 已登记，禁止把目录扫描写成全量读完。首批结论确认 Cordis 插件树、Session/agent/能力事件分工、官方 Storage 候选和官方 Skill 执行底座；下一步依固定 H01—H09 审查并反查现有设计，未完成前不进入 D02。（2026-09-18 补记：镜像已整批替换为 alpha.2 快照（`docs/dsh-v0.1.6-alpha.2`，543 文件/337 md、规范对象 171）；原 127 份审查台账顺延、新增 44 份待审；见顶部「文档镜像刷新」条目与 `p5-doc-mirror-audit` 证据。）

H01 已完成，当前 8/127。补充约束：scope-local 能力不会自动传给 subagent，专家团必须显式重算组合与授权；人类命令不经过模型但也不自动成为持久事实；`agent/pre-step` 适配必须继续 waterfall；模块/事件关系不代表团队授权。H02 转为进行中。

H02 已完成，当前 25/127，H03 转为进行中。Cordis 约束已进入架构与交付门槛：配置顺序不表达依赖；必需服务用 inject；PENDING/FAILED 必须显式诊断；服务更换会重启消费方；所有外部资源归属 effect 并等待完全停稳；Loader 条目使用稳定 id；工具注册必须连同 systemPrompt、schema、结果持久化和注销验证。防御规则同时约束自动化运行区间、监听器异常隔离、子进程凭据环境和链接删除。下一步按 H03 审查 Web、Client modules、Slots、Conversation、Sidebar 与样式，确定原型到真实 WorkDSH Profile 的公开实现映射。

H03 已完成，当前 33/127，H04 转为进行中。正式形态固定为官方 Web Client 内的 WorkDSH Profile：品牌与业务导航通过公开 Slots 贡献，业务页面与原生 Conversation 往返，会话右栏用于资料/成果预览，官方 renderer 保持唯一 React root。功能组件按 Host → Remote → Client model → Slot props 取数，跨插件 UI 不导入运行时实现；可靠领域状态自行提供 baseline/cursor/query。UI-DESIGN 已加入正式页面映射和官方 theme/primitives 约束。下一步审查 Session、投影、持久化、附件、工作区与查询，校正项目、任务、资料库及数据库所有权。

H05 已完成，当前 59/127，H06 转为进行中。新增执行能力复用矩阵：官方 Skill 是唯一执行底座，但已发布正文必须投影为不可变修订；MCP 是连接器适配，不是连接器业务对象；Schedule/Webhook/Job/Workflow 是自动化底层候选，不拥有持久规则和运行历史；Web 私网阻断不等于敏感数据外发策略。工具单调 guard 必须覆盖 native/PTC/MCP 子调用，调用策略与工具可见性都不能替代业务授权。下一步审查 Settings、Credentials、Approval、Permission、Sandbox、Storage 与配置目录。

本轮校验：`test:integration` 3/3、`check:plan`、`audit:harness-docs`、`git diff --check` 与脚本语法检查通过。仅文档和计划校验清单发生变化；bundle build/typecheck、浏览器、真实模型、外部连接器及业务数据库测试未执行。

H06 第一批完成，当前 65/127。已审 Settings、Credentials、Approval、Permission Presets、Sandbox 与 API Gateway，并新增治理能力复用矩阵。设计已明确：Settings 只保存运行偏好；秘密由 Credentials 按操作解析；业务 access、连接授权、单次 Approval 和 runtime/sandbox 分层失败关闭；Permission Preset 不等于 RBAC；Sandbox 不约束网络且 partial 不满足团队强隔离；Typert Remote 只承载严格生成的一元方法，流与分页使用专用协议。ARCHITECTURE、ADMIN-DESIGN、TEAM-DESIGN、DEPLOYMENT-AND-STORAGE、CONTRACTS 和 PLAN 已同步。

下一步继续 H06 配置目录与 Loader/Profile 文档，核对配置文件、Settings、插件启停、重组和管理端入口的边界。当前只完成文档审查，治理服务和业务数据库仍未实现；本轮未执行产品构建、浏览器、真实模型、外部连接器或业务数据库测试。

H06 已完成，当前 66/127，H07 转为进行中。配置目录完整反查确认四类制品边界：有配置可加载、无配置可加载、seam 不可直接加载、纯库无插件入口；插件管理端不能以 npm 包存在推断可启停。正式 Profile 保留 user preset 等同 shell 的信任标记、sandbox 默认只读、Domain backend 路由、Settings/Credentials 分离，并禁止普通管理入口开放 literal secret 或绕过式 subagent permission mode。

H07 下一批先读 Agent lifecycle、Agent team、Subagent、scope 与模型/压缩专题。治理能力仍需 P0-04 锁定发布包探针；本轮未实现治理服务、业务数据库或正式 UI，也未执行浏览器、真实模型与外部连接器测试。

H07 第一批完成，当前 74/127。新增 Agent 与专家编排矩阵，固定 ExpertRevision、preset 和 Session 三层对象；子代理 flat scope 不继承父能力与权限；一次性/可继续子代理有不同结果、取消和停稳语义；实验性 Agent Team 只承载根 Session 内成员、mailbox 和 task DAG，不是组织、专家团或项目待办。精确模型能力由 adapter 解析，系统提示词与动态上下文走官方组装和 surface，Compaction 不删除业务资料，TokenMeter 不作为组织账单。ARCHITECTURE、CONTRACTS、TEAM-DESIGN 与 PLAN 已同步。

H07 已完成，当前 80/127，H08 转为进行中。第二批补读 Core/preset、LLM wire 扩展、适配器开发、扩展模式和 Python SDK；确认 `composeFrom` 是显式同代组合绑定而非权限继承，`followup` 回执不等于结果，preset `recompose` 不能绕过空会话保护。团队 Profile 默认关闭会外发完整会话后缀的 `dsh_session_log`；Python `sdk-minimal` 不作为 WorkDSH Web 或团队隔离方案。P0-03 的固定探针扩展为十步。

H08 Cookbook 第一批完成，当前 88/127。新增扩展交付清单，区分可用于外部插件的 Remote、Settings、Tool、Host/Client 配对规则与只适用于 Harness 上游仓库的 package/session-format/vendoring 流程。单插件门槛已补入稳定领域错误码、生成 Client、settings revision、规范工具结果、PTC 同链 guard、Client toolview 回退和公共 UI 组件边界。

下一批审查 User、Testing 与 Postmortem。上述均为文档契约结论，仍需 P0-03/P0-04 在锁定发布包上验证；本轮未实现正式业务插件或数据库，也未执行真实模型、浏览器和外部连接器测试。

### DOC-06 H08 用户指南与事故回归

已完成 User 13 份、Testing 1 份和 Postmortem 5 份，累计 107/127。扩展交付清单新增 bundle/Profile 分工、整行 config 覆盖、模型端点修订、动态 Cordis 实验隔离、代理和 Webhook 边界；开发计划新增真实 Loader、独立成果断言、确切 origin 验收及结构化错误保留。事故 0002 的历史 disabled 行为与现行 primer 存在时间差异，列入 rc.1 探针，不认定当前版本仍有该缺陷。

下一步：development/i18n 共 6 份及剩余 14 个子系统反查。当前仍为 D01，正式业务插件、数据库和完整工作台未开始。此轮仅文档与审查台账变更，产品构建、浏览器、真实模型和外部连接器测试未执行。

验证：`audit:harness-docs` 为 107/127、20 待审；`check:plan` 通过（25 模块、33 文档），检查脚本语法与 `git diff --check` 通过。仓库当前文件未跟踪，diff 检查不能代替新增文件审阅；本轮文档链接由计划检查器覆盖。pnpm 仍提示 package.json 的 overrides 被忽略，本轮未更改依赖配置。

## 2026-09-12：D02 完成与跨平台品牌资产

共享 UI `0.1.0-alpha.4` 将公开入口收为纯导出文件，Icon、LogoMark、导航组件、Modal、设计令牌及样式分别维护；Skills 与 Workbench 继续通过相同公开 API 消费。默认组合包升级为 `0.1.0-alpha.38`，Harness Sidebar 品牌 Slot 使用共享 LogoMark，未创建额外 React root 或修改上游。

新增跨平台 WorkDSH 主标与应用图标：蓝色折叠 W 配青色智能火花，分别提供透明 SVG、通用圆角底座 SVG 与高分辨率 PNG 视觉稿。品牌不绑定单一桌面系统，也不复用 WorkBuddy、DeepSeek Harness 或其他产品的商标图形。

D02 的工作台行为、公共 UI 边界、失败恢复和打包浏览器条件已满足；D03 Skill 0.1 使用既有完整管理闭环证据正式过序。当前唯一下一阶段为 D04 专家模块 0.1；企业服务端和管理 Web 仍留在后期 ToDo。


## 2026-09-12 专家与专家团文档交接

按用户要求交付 [专家开发文档包](design/experts/README.md)：PRD、三图交互规范、Host/Client 技术架构、拟新增契约、专家团设计、官方依据和 7 个有限开发包。15 条需求映射到 23 条单专家验收和 4 条团队验收；新增 ADR-0017 为 Proposed，公开接口须在实施时验证。

当前源码审查确认专家仍为规划目录；现有 contracts 仅导出治理契约，Skill 摘要/digest 不等于不可变业务修订，受控 Session bridge 不自动覆盖所有原生入口，实验性 Agent Team 未在当前锁定依赖中。已在方案中明确这些缺口和验证条件，避免接手工具假设接口已存在。

本次没有修改业务运行源码、安装新依赖或递增包版本。currentStep 仍为 D04、状态 todo；D11 团队与企业后台继续后置。验证结果见 [文档核对记录](design/experts/REFERENCES.md)。


## 2026-09-12 插件交付边界复核

用户指出目录结构不能证明真实独立插件。核对官方入门、生命周期和打包教程后确认：workdsh-bundle 是官方机制组合包，但其中直接调用 Skill Host/Client 和 Workbench helper，尚未建立各功能完整的独立 Fiber/自动安装边界；experts 等仍为规划目录。服务类插件、共享库和可安装 bundle 必须分别描述。

已补 [复核说明](design/experts/PLUGIN-DELIVERY-REVIEW.md) 并纳入 D04 EP-01/G05、EP-07/AT-20。单功能独立安装/加载/移除的结论不能由整个 bundle 安装证据推导。本次仅修正文档约束，未重构业务代码；实际入口与制品修正由后续实施验证。


## 2026-09-12 Skill 独立制品原状实测

按用户要求对原有 skills alpha.23 执行真实 build、pack、隔离 Profile 的官方 plugin add 和 dump-config。构建/打包/普通依赖安装通过，但包缺少 dsh.bundle 与 dsh.client，CLI 明确告警未激活 Profile layer，配置中没有 Skill 插件。详见 [独立包验证](evidence/skills-standalone-package.md)。

此前 Skill 0.1 本地业务闭环完成的证据仍指随 workdsh-bundle 运行，不包含独立插件发行。独立打包发布安装目标尚未完成；本次没有发布 npm 或修改原包来改变验证结果。

## 2026-09-12 全平台插件组合与共享依赖说明

针对“独立打包是否影响全局、专家如何包含 Skill”，补充 [ADR-0018](adr/0018-composable-feature-plugins-and-shared-skills.md)。用户随后明确要求遵循 Harness 自身的插件组合精神，架构方向已 Accepted，实施仍未完成。官方底座和自有功能统一用官方插件机制装配，不建立业务大核心；专家保存共享技能引用，contracts/ui 保持库，npm 制品、Cordis 服务和业务修订分别管理。明确必需依赖消失会影响消费者，插件移除不等于删除用户数据，当前不能承诺完整热卸载或独立 Skill 发行已完成。约束已同步 AGENTS 和专家交付复核。

本次只补架构与交接文档、文档检查清单；不修改运行源码、依赖版本或 currentStep。公共市场和企业服务端继续后置；Skill 独立交付修正仍纳入既有 D04 前置与 EP-01/EP-07 验收，不增加新阶段。

验证：文档计划检查通过（26 模块、50 文档），本轮文档相对链接与代码围栏检查、git diff --check 通过。产品构建、运行测试、浏览器与模型调用未执行。

## 2026-09-12 Skill 独立插件改造进行中

用户已授权实施 ADR-0018。当前工作为 D04 的 Skill 0.1 交付前置修正：独立 Host/Client、显式 Profile 组合、公共技能服务契约及制品/生命周期验收。沿用既有业务功能和数据目录，不启动专家业务或公共/企业功能；验证结果写入 skills-standalone-package 证据。此处保留开始时的范围记录；后续完成结果见本文顶部及独立交付验收，不能以原 alpha.23 打包记录代替 alpha.24 运行证据。

安装回执：仅通过官方 dsh plugin --profile preview add 更新 Office 制品，已比对安装后的 Host/Client 与当前 dist 字节完全一致。18989 预览恢复运行，dsh-cost-meter 保留。实际文件资源 Tab 打开导出的 PPTX，修改图表 8→9，原文件字节不变，应用探针通过。未自动提交、推送或发布 npm。

## 2026-09-13：WorkBuddy 创建提示词、参考与模板深度审查

补充 [创建提示词深度分析](design/WORKBUDDY-CREATION-PROMPTS-DEEP-ANALYSIS.md)：覆盖内置技能/专家创建入口、四份专家参考、两份市场模式参考、生成模板与内置脚本，区分创建者提示词、生成执行定义、程序保证和宿主加载。提出保留案例驱动、材料映射、专业判断、资源与成果交付的方法，适配到 WorkDSH 现有受控服务；团队能力继续留后续阶段。

原版打包测试实际执行：四项均在 setUp 因缺少 MAX_PACKAGE_BYTES 报错，未进入行为断言。禁用 pycache，仅使用临时目录，没有注册专家或修改用户技能。分析发现默认路径、agent_created、资源校验、头像完成态与批量内容生成存在文本/实现差异，结论限定本机副本。

本轮仅文档补充，未实现新增资源树接口或运行模型 A/B，未提交推送。下一步以真实单技能和单专家案例适配并验收，不以字数或标签数代替质量。

## 2026-09-13：CREATION-01 Preview 安装与启动

用户授权安装后，以内容哈希地址通过官方 dsh plugin --profile preview add 更新 Skills 与 Experts 两个独立包。核对安装后的 Host/Client entry 和四份参考逐字节一致；未更改其他插件版本或用户 ~/.agents 技能文件。preview 使用默认用户 Agents home 启动于 127.0.0.1:18989。已认证管理 list 返回 HTTP 200/ok=true，skill-creator、expert-manager 均为内置 readonly 项。

该安装增强当前 Profile 中同名内置创建指南，不替换官方 Skill loader/Agent loop，不删除用户原版副本，也不改 Office export。新增指南与参考已安装；真实模型读取参考与创建质量试用仍未执行。未提交推送。

## 2026-09-13：OFFICE-EXCEL-01 Preview 首段接入

统一 Office 内容服务新增 spreadsheet 工作副本，支持新建、读取、单元格值/公式、多工作表、修订控制、幂等操作、人工编辑租约与 XLSX 导出。使用已有 Univer 0.25.1 原生浏览器编辑器和 ExcelJS 4.4.0；与 Word/PPT 共用授权、存储、审计和成果交付链路。技能指南同步当前能力，优先读取 content_capabilities。

Office 类型检查和完整构建通过；内容/下载集成测试 16 项通过，覆盖多表、公式、不一致修订、跨主体拒绝、租约、持久化恢复和 XLSX 数据回读。Preview 示例工作簿在真实浏览器显示公式结果 0.7，完成编辑返回已保存，已点击下载入口。未执行真实模型端到端生成或外部 Excel/WPS 验证。格式、合并、图表和实时 XLSX 导入仍未接入，不宣称完整 Excel。Word-only 构建已排除新增表格 SDK，但仍被原有 PPT/AI SDK 缺许可证文本阻断；保留发布门禁。本轮不提交、推送或 npm 发布，不改变 D04 主线完成状态。

安装回执：Office 与 Skills 经官方 preview CLI 更新，安装后 Host/Client 与构建制品逐字节一致；18989 已重启，原应用标签页已恢复。补充 Office 输入入口测试 2 项通过，总计本轮相关测试 18 项。

## 2026-09-13：CREATION-02 创建入口冲突与中断进度修正进行中

官方能力复用记录：读取 subsystems/skills.md、subsystems/slots.md，锁定 dsh-skill/dsh-client-ui-conversation 0.1.5-rc.1 的公开注册与 Slot 类型。官方 provider 继续拥有技能解析；WorkDSH 采用独立命令名称避免用户同名文件技能覆盖，补充进度与恢复指南，不改 Harness 或历史日志。验收将使用官方 Registry 验证原版与增强版同时存在、入口命令与注册一致、插件卸载清理。中断 UI 扩展面尚在核对，不能将提示词约束视为确定性状态修复。

CREATION-02 UI 复用面：采用 conversation.input.dock list Slot、SessionStandardProps.useSession/useProjection，以及公开 chat timeline 的 turn/end；读取 todos 投影和官方 running 状态，仅补充停止提示，不复制原生待办列表或修改其 owner。

CREATION-02 实现与验证：创建入口与注册名改为 workdsh-skill-creator / workdsh-expert-manager，用户原版保留；两份指南加入原生 todo_write 阶段更新与中断恢复检查。Workbench 通过官方 conversation.input.dock、todos 投影、Session.running 与公开 Chat timeline 增量展示中断/停止提示，不改历史待办状态或原生动画。Skills、Experts、Workbench、bundle 构建通过，19 项相关集成测试通过。Skills/Experts/bundle 经官方 CLI 更新 preview，安装入口字节核对一致。真实模型创建与阶段更新试用未执行；资源树发布仍未接入，财务分析技能脚本未修改。无 Harness 源码修改、提交、推送或 npm 发布。

CREATION-02 浏览器实测：重启 18989 后打开“创建财务分析Excel读取技能”原会话，DOM 显示“已中断 · 8 项任务尚未确认完成。任务列表保留上次记录，不代表仍在执行。”，原始待办 1 进行中 / 7 待处理保持原日志值；未发送继续指令、未修改该技能脚本。

## 2026-09-13：Desktop 托管 Python 设计登记

用户确认方向，新增 design/desktop/MANAGED-RUNTIME.md，并关联 ADR-0025、PLAN、ARCHITECTURE。设计区分解释器/依赖供给与官方 sandbox，覆盖离线精选依赖、额外依赖隔离、来源许可证/签名、原子升级回滚、可运行状态与干净机器门禁。RUNTIME-01～03 均待实现；本轮仅文档，未安装 Python、未改 Harness、未进行打包或测试、未提交推送。不恢复暂停的 Excel 格式/合并/图表开发。

## 2026-09-13：WorkBuddy 专家需求与技术复核

网页技能安装回执：按用户测试请求，Skills最新候选包经内容哈希地址由官方CLI安装到人工preview，Host/authoring内容/新增workflow参考字节一致；18989重启并验证认证页面HTTP成功，保留既有Profile与用户Agents目录。用户可通过 /workdsh-web-design 试用；本轮未自动发送模型任务或部署网站。

网页优先开发切片：用户确认现有功能先保留，连接器与资料库后移。再次核对腾讯Ardot设计转代码、落地页与Web应用指南；增强实际 workdsh-web-design，新增 workflow-and-delivery 参考，按现有工程/静态页/应用/设计稿选择实现，要求真实预览、响应式/语言/交互检查及源码入口/素材/运行说明/实际文件交付，不照搬Ardot工具或禁预览流程。Node22 Skills构建/typecheck与注册/生命周期2项测试通过，check:plan/whitespace通过；独立包浏览器安装管理及恢复主要路径通过，最终冷启动见skills-standalone探针回执。尚未生成新的模型网页成品、未执行成品视觉验收，人工preview未更新，未提交推送。下一步用一份明确需求完成网页成品及预览/文件链路，不启动连接器/资料库或恢复Excel高级编辑。

推送检查点：用户确认当前功能保留，下一阶段优先网页制作，连接器与资料库后移；D04历史未签收项保留，未冒记整体验收。当前实现和设计打包为一次仓库提交；Desktop未集成实验及空lefthook示例不纳入。Node22完整构建/typecheck通过，集成/技能质量/规划共79项测试通过；DOCX幂等测试固定ZIP夹具时间戳，避免同内容两次打包哈希随机变化。规划/whitespace及暂存路径/疑似密钥检查通过，预览数据与凭据未纳入。不发布npm或创建Release。

体验启动回执：最新Experts包通过内容哈希地址由官方CLI安装到人工preview，Host/Client与分析参考字节核对一致；18989已重启，保留默认用户Agents目录及既有Profile数据，应用入口已请求打开。本轮未运行模型任务。

使用闭环开发：新增只读 ExpertWorkSummary，详情和保存后发布预览共享 deliverables/methodology/boundaries 投影，优先呈现交付、工作方法和使用边界；角色可展开，不新增字段或模型摘要。原生召唤/草稿交接保持官方实现。Node22 Experts构建/typecheck、管理16项测试通过；独立安装态浏览器探针验证工作摘要、长内容、390/1440/1920响应式、发布取消与确认、真实技能选择、召唤原生Session、一次草稿交接/已有输入保护，以及两次冷启动绑定全部通过。已检查1440发布预览截图。check:plan/whitespace通过。安装态验证只使用临时Profile，人工preview尚未更新；本轮无模型调用。D04专业语义剩余缺口及E原有未验收项仍保留，不能据此宣称模块整体完成。

继续开发/验证：dirty隔离真实模型复测两轮，独立run label保留历史。第一轮自动拒绝子集1300冒充整体；第二轮原生完成、金额、固定Skill/实际计算/原件/冷启动全部通过，但人工发现完整基期误置null及单位敏感性场景贡献方向错误，professional-review记录failed。原两处规则有改进但AT-27仍不签收；已补按期间独立完整性与反事实逐店计算，最后补充未复测。创建参考同步，成果校验3项和规划/whitespace通过；未安装人工preview，不改Harness/用户专家。下一步只复验剩余两处，详见d04-experts-review-fixes末尾。

开发补充：已将单位判断、缺失与零、子集/总体和均值/结构边界加入实际 expert-manager 参考，并在创建指南要求分析类专家将规则落实到 methodology/boundaries；试用参考同时要求数值与文字结论核验、真实成果和验证范围说明。Node 22.23.2 下 Experts 构建通过，专家管理及成果校验19项测试通过，check:plan 与 diff whitespace 通过。该变更增强新创建定义，不修改已有发布专家或任务。尚未安装 preview、未执行创建入口真实模型及 dirty 方法最终复测，AT-27仍未整体签收；下一步按对应场景补模型证据，不以19项确定性测试证明专业语义已修复。

新增 design/experts/WORKBUDDY-REASSESSMENT.md，关联专家交接包及有限开发计划。对照本机 expert-manager、Agent/展示规范、工作报告专业规则和行业研究章节契约，补充任务优先详情、场景分流、专业证据、refs/脚本归属、发布与试用分离及有限验收顺序。复核保留当前 D 已有真实模型证据和两处 dirty 判断缺口，未将旧状态误作未执行。下一步先关闭该缺口，再补材料转化创建案例与 E 签收；资源树/运行时独立跟踪。本轮仅设计文档，运行测试、模型调用、安装发布均未执行；未改 Harness 或恢复 Excel 高级开发。

### 2026-09-13：单文件 HTML 实时工作副本

网页/看板接入现有 Office 服务：content_open(kind:html) 立即请求右侧展示；html.replaceDocument 按修订更新完整 HTML，预览跟随已提交修订；源码只读查看，下载和 content_export 交付真实 HTML。沿用授权、审计、CAS、重试回执和官方文件交付，不修改 Harness。浏览器验证实时更新、内联交互、脚本隔离和原始源码下载；Office 原有内容回归及全项目类型检查通过。范围为单文件、内联资源；多文件/服务器应用保留工程流程，已有独立 HTML 尚无自动导入。

### 2026-09-13：预算 HTML 样式冲突修复

用户截图对应 vipshop/output/预算编制数据分析看板.html，根因是头部与柱状图共享 .bar，图表 width:26px 覆盖头部。拆为 dashboard-header/chart-bar，导航不拆字，窄屏网格子项允许收缩与长文本换行。网页设计参考补充类名作用域、保留样式和实际响应式检查。检查实际文件桌面/侧栏/手机尺寸；不修改 Harness 或放宽 iframe 隔离。

### 网页技能可靠性复审

针对用户纠偏，改为系统技能复审而非继续修改独立产物。对照腾讯 Ardot 组件代码指南、UI 入口及 core 分级验证，增强 workdsh-web-design 的组件契约、样式作用域、全文保留、区域/整页验收与真实浏览器检查；Office 作者引导同步。参考细节见 TENCENT-AUTHORING-ADAPTATION。注册/构建检查不替代模型成品评测；未执行模型对比，自动视觉验收尚未接入。

本次网页可靠性指南修订：Office/Skills 标准构建及 13 项注册与内容回归通过，两包通过官方 CLI 安装 Preview 并核对 Host/Client 字节。真实模型网页生成与腾讯成品对比未执行。

### 下一步聚焦 PDF（用户范围决定）

取消 Office 专项画布/多维表格开发，隐藏其新建候选但保留历史引用解析；HTML 新建候选标记已支持实时写作。计划与台账已更新，下一步仅 PDF，Markdown 本轮不扩展。PDF 底层库已有选型说明，当前尚无统一内容适配器；先验证新建/中文/预览/更新/导出重开，真实 PDF 文本编辑仍需单独验收。此轮为范围及候选源码调整，未完成或安装 PDF，未执行 PDF 浏览器验收。

### 2026-09-13：PDF 首版实时工作副本实现

Office 0.1 新增 kind=pdf、稳定分页/text/rectangle 严格模型；沿用授权/CAS/幂等/人工租约/审计，content_open 先请求侧栏展示、pdf.updatePage 等工具提交修订，PDF.js 显示真实编码文件，人工编辑本页文字后保存。使用完整嵌入的静态 Noto Sans SC 字体；子集编码实测漏字，已禁用，并新增逐中文字形像素检查。用户运行不需要 Python/系统字体/CDN。PDF 下载及 content_export 使用同一修订字节，后者分块经过官方 Bash 写入/校验后 present；不改 Harness。

服务及已有 Office 回归 21 项、PDF 浏览器 1 项、完整项目类型检查、Office 标准构建与计划完整性检查通过。独立安装包真实侧栏、AI 工具修订与人工保存、官方 present 文件卡片及 Host 冷恢复签收通过（8 项；交付使用公开 Session 测试轮次夹具，无模型调用）；真实模型与复杂版式评测未执行。已有任意 PDF 导入、OCR、图片编辑未接入。画布/多维表格取消本专项开发，Markdown 本轮不扩展，Office 专项仍为 in_progress。实现边界和官方复用记录见 [PDF-LIVE](design/office/PDF-LIVE.md)。

PDF 当前候选已通过官方 CLI 安装到人工 Preview Profile，并核对 Host/Client 与标准构建字节一致；保留用户 ~/.agents 技能目录。独立产物示例 .artifacts/office-pdf-live/report.pdf、视觉对照 pdf-live.png；真实 PDF.js 字形/交互、页编辑/下载/交付和浏览器 pageerror=0 已验证。当前首版无直接已有 PDF 文件导入，也不宣称复杂排版无损。

### 2026-09-13：PDF 真实模型两页交付及成品复查

隔离官方任务完成两页预算简报：先 content_open，再两次 content_edit，读回后 content_export 正式文件卡片交付。模型保留收入1000万元、支出800万元、结余200万元/20%，未知基期/责任人/日期标待确认。首次主探针因 1,000 千位分隔格式被校验器误拒绝；已修正规则，直接复查该次实际 PDF，两页解码、内容及截图人工检查通过，未重复调用模型。证据 .artifacts/office-pdf-live-real；主探针修正后整条重跑未执行，不冒记主探针全部通过。只新增验收脚本，无产品代码更新，不需重装 Preview。

下一步限定 D04 AT-27 异常财务案例复验：完整基期2500不可被目标期缺失抹除；反事实 C 原始金额为 CNY 时必须重算逐店与整体方向。核对器补基期/订单数字检查，自然语言专业复核仍独立进行。

专家异常复测结论：dirty-pdf-followup-20260913 原生任务完成但专业验收失败。单位反事实子项正确；完整基期仍写null，目标订单被误写300而正确为280，报告订单/AOV及A店转化描述互相矛盾。已保留原始成果和独立professional-review.json；补的基期/订单核对器已实际拒绝签收，不是生产通用校验功能。AT-27保持未签收，失败后冷恢复未执行，无自动模型重试。后续需领域方法的可执行计算/成果校验，不能继续仅靠追加prompt宣称修复。此轮为有限验收及核对器改进，未重装/改用户专家/推送发布。

### 2026-09-13：用户纠偏后的公共专家制作范围

不实施为当前财务专家特制计算 Skill。增强公共 workdsh-expert-manager：按需求组织方法、实际能力、成果与代表性试用，移除公共参考中的财务测试数字；脚本按职责需要选择，不能强制配备。保留 AT-27 失败证据，不宣称提示词更新已修复模型错误。复用现有官方 Skill 注册及受信 UI 发布流程，不改 Harness，不改变已发布专家或运行中任务。本轮构建、注册与打包验证待完成；跨领域真实模型效果未验证。

专家标准构建、类型检查、16 项 Host 回归及 13 项隔离安装包/浏览器/冷恢复检查通过。Preview 官方 CLI 更新命令超时，但复核实际安装的 Host、Client 与两份参考字节均匹配，重启后 HTTP200；不能冒记 CLI 正常结束。跨领域真实模型效果未验证，AT-27 保持未签收。

### 2026-09-13：公共专家制作跨领域真实模型有限验收

隔离官方 Profile 完成写作、资料研究、Node.js 代码三类：模型实际读取 workdsh-expert-manager 和两份参考，经公开工具创建同名唯一草稿、校验；测试通过受信 UI 发布后在每位真实专家的独立原生任务执行，持久日志证明正常完成与真实产物，原始输入哈希未变。每类创建/试用各一次，无模型循环重试；早期探针装配错误发生于模型发送前，已修正并保留为 setup-failure 证据，不冒计为模型失败。

专业评审：公告 116 英文词，现有功能/preview/未知价格日期正确，但“功能在路上”和后续发布承诺无材料支持，部分通过；研究引用、未实测 B、未知价格与驻留边界正确，但虚构 S1/S3 内部来源属性，严格事实验收失败；代码交付与实际运行完成，生成的20测试复跑及45项更换数据/原型键/异常输入独立检查通过，保留浮点与无原型输出对象限制。三类草稿方法并非财务模板，未增加特制 Skill。

财务 dirty 复测 JSON 当前正确记录 55000→46000、基期客流2500/目标null、订单350→280；实际询问重复/单位等口径后暂停，六分钟未交付 Markdown，主探针退出1。状态是待业务澄清和交付超时，不是完整专业通过；AT-27仍未签收，冷恢复未执行，不自动替用户确认业务事实。所有临时测试凭据删除已复核。

证据：.artifacts/experts-crossdomain-{writing,research,code}-20260913 的 model-created-expert.json、creation/trial-trace.json、产物及 report.json；代码 independent-check.json 与 test-rerun.txt；财务 experts-professional-dirty-public-verify-20260913/partial-review.json。只适用于当前配置 DeepSeek 与合成样本，不证明其他模型/领域普遍效果。下一步若修复，针对来源属性与承诺约束作公共方法改进并另行有限验证，不把样本答案写入模板。

### 2026-09-13：公共事实保真修订与不同材料复验结果

指南/参考增加来源属性、未来承诺逐条核对，并要求进入生成专家的 methodology/boundaries/deliverables；不强制短成果展示冗长台账。复用官方 https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/subsystems/skills.md、@deepseek-ai/dsh-skill@0.1.5-rc.1 ctx.skills.register/resourceBase 与已有公开专家工具、原生Agent/受信UI，不新增自动评分或Harness执行器。构建/类型检查、16项Host与3项oracle回归、计划/差异检查通过。官方CLI --offline正常更新Preview，Host/Client/参考字节匹配，重启HTTP200，用户冻结专家不变。

不同holdout材料各一次真实创建/发布/执行/交付：公告不再补路线图或通知承诺，但仍附五个审查小节，部分通过；研究仍添加“内部评测记录”，且把没有独立测试证据写成否，失败。新增边界确实进入生成定义，执行仍有矛盾，不宣称提示词已保证事实保真。模型信息见对应report.json，仅代表当前DeepSeek有限样本。

财务仅在测试提示确认去重/fen/缺失口径，完整JSON/MD与基础数字、冷恢复通过；人工发现A+C子集2500应为1500、8%应为10%，已确认单位又称待确认，以及可比范围/整体方向文字矛盾。只读核对器从原始CSV去重后按声明子集/期间推导，实际拒绝该次产物（2500 !== 1500）。保留最初较窄脚本成功与独立专业失败记录，AT-27仍未签收，不新增特制领域Skill，无自动模型重试。

证据：.artifacts/experts-crossdomain-{writing,research}-holdout-20260913 与 experts-professional-dirty-confirmed-20260913 的定义/持久日志/真实产物/report.json/professional-review.json；subset-recheck.txt记录拒绝。临时测试凭据删除逐案核对。当前仅为带限制开发候选；专业收口不能依赖模型自检宣称可靠。未推送发布。

### 2026-09-13：用户确认阶段性 Git 发布范围

本次按平台已完成的创建、发布、真实配备、原生任务及交付流程整理开发提交。专业样本是评测与限制记录，不再将逐个修复样本输出作为本次 Git 提交/推送前置；保留失败证据，不宣称模型保证正确或专家模块整体验收完成。无关 Desktop 实验、测试运行数据和凭据不纳入。只推送源码及文档，不发布 npm 包或创建稳定版标签。最终工程检查执行中。

本次提交前完整项目 build、typecheck、79项集成测试及计划/差异检查通过。README新增中英文HTML/PDF范围及字体/PDF组件致谢；设计文档、许可证和静态字体纳入源码。专业样本失败保持记录，与本次开发提交条件分开。

### 2026-09-13：README 补充 HTML 成品截图

按用户提供的截图补充中英文 HTML 看板生成/本地原生预览/文件卡片交付说明，新增 docs/assets/screenshots/workdsh-html-dashboard-preview.png。截图不改动，示例路径/会话/数据不作为内置默认值。仅文档与图片变更；不修改网页源码或继续专业样本优化，不运行无关产品构建/模型测试。

### 2026-09-13：下一步专家团规划

读取WorkBuddy expert-manager及team-spec，细化EXPERT-TEAMS第10节：真实成员、唯一主持人、固定SOP、受控交接、原生进度与实际文件汇总。四包TM-01～04保持，首项为锁定公开能力探针；无团队代码、安装或模型调用，D11仍todo，主线前置未改变。专业效果另列评测，不把当前样本逐个修好作为无限平台发布前置。

### 2026-09-13：专家团设计 review

对照官方subagent/workflow在线文档、本地Agent Teams/core镜像、锁定0.1.5-rc.1公开声明及现有专家guard/compiler/service。发现设计接点：普通子代理继承父组合且缺自身专家绑定会被现有守卫拒绝；等待workflow返回的主持人不能被该流程反向等待；工作项、成员和原生会话需分开；取消须限定本次成员。已修订EXPERT-TEAMS、ADR-0020与TM-01要求：有限workflow段在主持人判断前返回、独立子绑定、分别验证one-shot/continuable、按真实句柄及selected-child drain清理。Skill冻结保留公共目录，不宣称技能白名单隔离。规划完整性检查（28模块/50文档）与git diff --check通过；团队运行探针/真实模型测试未执行，无产品代码或依赖变更，下一步仍TM-01。

### 2026-09-13：WorkBuddy整团创建与官方Agent Teams发布核对

用户提供Downloads/workbuddy及创建专家团截图；读取expert-manager与team/agent/plugin refs，四文件与此前project目录对应版本一致。补两条制作路径：复用已发布专家，或从需求同时生成成员和团队草稿；经验进入专业方法，单问题可路由单成员。

纠正Agent Teams选型前置：npm已确认@deepseek-ai/dsh-experimental-agent-team及dsh-experimental-tool-agent-team均有0.1.5-rc.1；当前项目未安装，不能以此认定不可用或必须升级。曾查询不带experimental短名得到404，已通过官方manifest纠正。服务包仅npm pack --ignore-scripts下载临时目录并读取公开声明，SpawnTeammateRequest仍无preset/setup，精确专家绑定待验证。方案/ADR改为TM-01优先评估官方Team名册/消息/任务能力，workflow保留固定段候选；未安装Profile、未改锁文件、未运行团队模型。规划完整性检查（28模块/50文档）与git diff --check通过；公开声明核对不替代运行验收。

### 2026-09-15：官网视觉与完整工作台叙事

重做 `website/` 中英文静态官网，以“开源版 WorkBuddy”为主要定位。新增电光蓝轨道主视觉、8 项可切换侧栏功能导览、真实应用截图画廊与放大、既有 24 秒产品短片、安装命令复制，以及只包含 GitHub/Gitee 的开源地址导航。独立介绍所有功能开发遵循 DSH 原生插件机制，开发者可修改现有功能插件或开发自己的独立插件，提供实际源码及开发文档入口。

功能文案核对 `workbench/BusinessPanel.tsx` 与对应模块 README：助理、项目、定时任务、资料库仍为建设中，专家/技能/连接器分别说明已有与规划范围。官网功能导览不冒充运行中的产品页面；保留独立项目身份，不宣称已完成 WorkBuddy 全功能等价。截图复用既有公开产品素材，不修改业务运行时、Profile 或用户任务。

Chrome/Playwright 覆盖中英文、1440/1920 桌面与 390/320 手机、功能/截图选项卡、开源链接、图片放大与焦点恢复、视频加载播放及关闭暂停、真实剪贴板命令、FAQ、减少动画和本地 HTML 读取。首次新增回归在 file:// 懒加载图片立即断言时失败，改为等待真实加载，不修改图片响应或伪造成功；最终结果见 `.artifacts/website-review/verification.json`，截图保存在同目录。Safari/Firefox 和新版本公共 Pages 部署未验证。现有 Pages 工作流仍在 main 分支 website 变更推送后部署，本轮仅本地制作与预览，未推送。

最终新增官网回归 15 组检查通过，脚本错误与资产 HTTP 错误均为 0；两份 HTML 的本地资源和页内锚点检查通过，规划完整性检查通过（29 模块 / 50 文档）。交付包 `.artifacts/workdsh-website.zip` 已生成并校验解压完整性。

### 2026-09-15：官网补充 WorkBuddy 技能与专家包兼容特色

中英文首屏、页面摘要、技能介绍与新增独立区域明确“兼容 WorkBuddy 技能包与专家包”，展示技能指令、参考资料、脚本以及专家设定、头像和资源的导入复用。核对技能 ZIP 导入代码，以及专家 `.codebuddy-plugin/plugin.json` 的 ZIP 解析分支与完整文档/资源保留；FAQ 说明专用工具/SDK 需适配，账号和权限不自动迁移，不宣称全部运行环境等价。

内置浏览器定向检查：中文 1440/390/320、英文 320 CSS 像素均无横向溢出；中文桌面与手机截图已查看；两种语言的兼容说明链接均展开对应 FAQ。新版本公共部署、业务包导入端到端运行和完整产品构建未执行，本次只改官网与记录，不重启应用、不推送。更新网站 ZIP 并检查归档和本地链接；后续发布仍按现有 Pages 流程。

### 2026-09-15：官网按阅读逻辑收敛内容

按用户要求将中英文官网收为五段：定位 → 真实应用截图 → 工作台导览 → 兼容与插件扩展 → 安装使用。顶部导航同步顺序；兼容不再抢在产品证据前，插件机制与兼容复用归入同一个选择理由区域。删除重复功能卡、四步流程、底座数字条及末尾营销口号，保留全部八个侧栏入口和准确的支持状态；精简面板重复标签、描述和 FAQ。同步清理 133 条已删除区块的 CSS 规则。

内置浏览器验证两种语言的五段结构与导航顺序、8 个功能面板和 4 个截图切换、两种兼容 FAQ 展开、中文 1440/390/320 与英文 960/320 无横向溢出；已查看中文桌面/手机实际截图，英文中等宽度导航无重叠。全套历史浏览器回归、完整产品构建、业务运行和公开部署未执行，本次仅官网修改。静态资源/锚点、JS/CSS 语法、规划检查和归档核对完成后更新网站 ZIP；不重启应用、不提交推送。

### 2026-09-15：官网已推送并发布

用户授权后，将中英文页面、样式、交互、真实截图与视频统一随 `website/` 提交，发布提交为 `52f3a7f`，已推送 `origin/main`。既有 Pages 流程成功：[部署 34939425911](https://github.com/techflag/workdsh/actions/runs/34939425911)。中文官网为 https://techflag.github.io/workdsh/zh-CN.html ，英文入口为 https://techflag.github.io/workdsh/ 。

公网逐字节核对 `zh-CN.html`、`index.html`、`style.css`、`app.js` 与本地提交一致；品牌图、四张产品截图、短片封面均 HTTP 200，视频 Range 请求 HTTP 206 且返回指定 1024 字节。未重新启动应用或发布应用安装包，无关 `scripts/desktop/` 保留未跟踪。Gitee 本轮只核对 Pages 可用性，未配置网站托管或推送镜像；官方服务页检索仍有暂停说明，本仓库 Pages 入口返回 404，未确认服务恢复。
## 2026-09-16：Word 图表改为插件原生结构化图表

用户提供的真实任务记录确认旧路径把分析图表编码为 PNG/Base64，并以图片块插入 Word；它不能编辑数据，也不属于 Word 原生图表。Office 文档模型现新增 `chart` 块，模型只提交图表类型、分类、系列和值；Client NodeView 由插件绘制 SVG，DOCX 导出生成 `word/charts/chartN.xml`、关系和嵌入 XLSX，禁止用图表图片代替。

Office build/typecheck 以及 content/download/rich-editor 30 项相关测试通过；浏览器断言图表为 SVG 且无 `img`，DOCX 断言存在 `c:chart`、嵌入工作簿数据且无图表媒体文件。现有图片图表不能从像素可靠恢复数据，不自动迁移；外部 DOCX 原生图表反向导入和五类图表逐一 Word/WPS 人工打开仍待验证。证据见 [office-word-native-charts](evidence/office-word-native-charts.md)。preview 已重装并重启，18989 返回认证保护的 HTTP 401，安装包内 Host/Client 均包含新图表实现；已有错误连接器仍会独立报告缺失 `sd` 模块，不影响 Web 服务启动。
## 2026-09-16：专家团动态切回真实主理人

修复顶部动态长期停留在已完成队友的问题。官方 Team 的成员 Session 可能在共享任务完成后短暂保持 `running`；现在有任务历史的队友以原生任务状态为准，`completed` 后退出活动候选，仍在 `in_progress` 的任务优先，否则回到运行中的 lead。专家活动身份同时加入 `lead` 映射，顶部和展开详情均显示专家作品中的真实姓名，不再显示内部键 `lead`。Activity 11/11、Activity build、Experts typecheck/build 与 diff 检查通过。preview 已重新安装并重启，安装产物包含新选择逻辑和 lead 身份映射；真实会话的队友任务均结束后，顶部不再停留在“钱日清”，而按终态显示“任务已中断，已有成果保留”。运行中 lead 接管的“郑守衡 · 正在处理”分支由回归测试覆盖。

## 2026-09-16：Office 工具兼容一次 JSON 字符串包装

修复部分模型调用 `content_edit` 时把规范对象再次 `JSON.stringify`，导致工具参数层直接报 `invalid arguments: "input" must be an object` 的问题。工具 Schema 现在仍以对象为首选，同时允许一次 JSON 字符串包装；执行入口只解包一层，随后继续使用原有文档类型、操作、权限、批量上限和 CAS 严格校验。畸形 JSON、数组及超限载荷仍会拒绝。Office typecheck 与 21/21 内容集成测试通过；preview 已用 Node 22.23.2 重新安装并重启，安装产物包含兼容入口，18989 返回认证保护的 HTTP 401。

## 2026-09-17：项目输入闭环到原生任务

修复项目输入区只创建 Session 和任务关联、却仅写入草稿并落到空白新会话的问题。项目提交现在经官方 Session Controller `prompt` 接口获得接纳结果后保存项目任务关联，再打开同一个原生会话；任务列表行可重新打开对应会话。真实 preview 提交后显示用户消息、完成模型回合并返回“测试通过”，随后从项目任务列表成功回到相同结果。项目包测试与类型检查通过，证据见 [projects-alpha-task-closure](evidence/projects-alpha-task-closure.md)。

## 2026-09-22：用户委托的三项专利交底书初稿

本轮为独立文档编写任务，不推进或变更插件开发步骤。已按用户说明形成 AI问数与SPC图表生成、QMS本体与语义层、跨网中转RPC 三份 Word 方案初稿及 Markdown 来源，位于 `output/patent-disclosures-20260922/`。RPC按用户补充采用参考Dubbo的连接中转场景，不采用网闸或文件摆渡；连接代次绑定等细节明确为拟议设计。

证据：三份DOCX生成成功；使用捆绑渲染器生成4、5、5页并逐页检查，修正中文字体发现及标题样式问题后中文、分页和内容显示正常。SPC数值例核对NIST公式系数，本体基础概念核对W3C，RPC基础字段核对Apache Dubbo公开文档。渲染及制作记录位于 `tmp/patent-disclosures-20260922/`。未执行系统实现、真实数据试验、专利现有技术检索和产品构建测试；附图目前为流程文字说明，未绘制正式申请附图。

下一步：发明人确认候选技术组合与实际业务口径，补充网络连接方向及RPC已有机制，再进行针对性检索和正式附图制作。当前无初稿交付阻塞；正式定稿仍缺少发明人信息、现场数据结构和实际实现证据。未提交、推送或对外发送。

## 2026-09-22：按用户指定技能重写三项专利交底书

本轮继续独立文档任务，不改变插件开发阶段。已读取用户指定的 `/Users/techflag/.workbuddy/skills/patent-disclosure-skill/` 并按纠正迭代流程生成六章交底书，每份含10条权利要求式条款，分别突出SPC样本/基线约束、本体约束到查询操作的转换、RPC连接代次及原调用核对。新稿为 `output/patent-disclosures-20260922/*_20260922210617.md` 及同名DOCX，保留旧稿，并追加修订对话记录及单独的编写依据说明。

证据：执行技能mermaid_render.py生成7张系统、流程及RPC时序图并嵌入Word；三份Word各10页，使用捆绑渲染器逐页检查，修正链接显示、字体、页码和分页。结构检查确认每份六章及10条保护条款，公式与数值例已核对。分别调用国知局检索脚本的三次尝试因缺少Playwright依赖未取到结果，已改用公开检索并核对引用专利及NIST、W3C、Dubbo官方文档，未宣称完成全面查新。

下一步：由发明人核实拟议机制与实际设计，补充技术联系人和现场数据；可据此进一步细化权利要求及扩大检索。未执行系统实现、现场数据试验、全面新颖性/创造性检索或产品测试。无文稿交付阻塞，正式申请仍需核实真实技术方案及申请信息。未提交、推送或对外发送。

## 2026-09-22：交底书正文来源信息精简

按用户要求将三份交底书第一章的公司、机构名称和链接移至独立检索说明，保留专利标识及技术对比。另存 `*_20260922211530.md/.docx` 与修订版压缩包，旧稿保留，已追加修订对话记录。技术方案、参数、附图及权利要求式条款未改动。三份Word重新渲染均为10页；4个变化页面已查看，另26页PNG与已审阅上一版逐字节相同。全文检查确认目标名称及链接已从正文移出。未执行新检索、现场试验或产品测试。下一步按用户反馈修订；无本轮阻塞，不改变插件开发步骤。

## 2026-09-22：三项交底书聚焦工业制造

按用户指令在前版上完成制造场景合并修订。SPC独立条款加入产品/工序/工艺版本及抽样约束；本体独立条款明确制造对象与检验事件关系；RPC独立条款限定总院与生产厂部署及认证工厂范围。补充工艺变更、检验对象关联和制造数据写入示例，未引入设备控制或实时调度。新稿为 `*_20260922212003.md/.docx`，并提供工业制造场景压缩包，旧稿保留。

证据：Word与Markdown正文一致；六章、各10条保护条款及7张附图结构核对完成；重新渲染为10、11、11页并检查全部页面。修正题名更换时Markdown图片路径误替换，所有图片引用文件及打包路径已核对。沿用已核对的公开技术资料，未执行新增检索、全面新颖性/创造性判断、真实系统试验或产品测试。下一步由发明人核实具体制造数据、抽样制度和RPC机制，再按实际技术补充检索。无本轮文稿交付阻塞，不改变插件开发步骤。

## 2026-09-22：删除交底书模板注意事项

按用户要求删除三份交底书“注意事项”标题及三条说明，另存 `*_20260922212237.md/.docx` 和完整包。比对确认仅删除指定部分，技术正文不变；重新渲染10、11、11页，检查变化页面，其余页面与已检查上一版一致。未执行新增检索或产品测试。无阻塞；下一步按用户反馈修订，不改变插件步骤。

### 项目选择状态修复（2026-09-22）
- 专家、技能、连接器和资料选择统一使用原生主题变量，移除浅色主题下深底黑字；引用标签同步适配主题。
- 卡片标题与说明分行，说明最多两行；筛选使用原生按钮选中状态，额外焦点描边仅用于键盘。
- 项目构建与 11 项测试通过；浏览器验证四类选择器明暗主题、勾选和取消。截图位于 `.artifacts/project-selection/`。此次未调用模型或保存测试选择。
## 2026-09-24：资料库界面修复与项目资料分析核查

资料库原有样式位于低优先级的 CSS layer，公共按钮样式覆盖了“最近”列表、创建菜单和文件操作菜单，造成按钮膨胀、文字重叠。现将资料库样式提升到与公共控件一致的层级，列表行、菜单项和文件头操作改用语义化原生按钮，并限制菜单在视口内。已在实际 18989 预览的明暗主题检查“最近”列表、创建菜单和文件操作菜单；资料库 build/typecheck、5 项资料库测试、12 项项目测试及 diff check 通过。

项目输入区的资料引用会校验固定修订、绑定项目任务并在模型系统上下文注入正文；但资料库自身“添加到新对话”创建的是普通工作区会话，不会自动归属项目。此前称“项目内资料分析闭环”不严谨：代码路径和模块测试已证实，尚缺一次实际模型响应及项目任务归属的端到端验证。此次未提交、推送或发布。
## 2026-09-24：专家与官方智能体团队状态核查

截图中的“工作复盘顾问”是内置单专家模板（`templates.ts` 中无 `team` 定义），会话标题旁“智能体团队”是会话运行模式标识，不表示该专家已成为专家团或已派出成员。截图只见模型分析请求，未见 `spawn_teammate` 或成员执行回执，不能据此认定多智能体协作成功。插件页“智能体团队”开关关闭也不能单独判断 WorkDSH 专家能力不可用，因为 WorkDSH 专家插件的 patch 自行装配官方 `agent-team`、`tool-agent-team` 与 UI 模块。

但当前 18989 预览 Profile 有实际配置冲突：除 `workdsh-plugin-experts` 外，`dsh.profile.bundles` 还包含 `@deepseek-ai/dsh-experimental-agent-team-profile`；`--dump-config` 显示两份同名 `agent-team` 和 `tool-agent-team` 条目，参数分别为 16 与 8 名成员。这会使开关状态与运行模块来源不一致，并存在重启加载冲突风险。预览安装和启动脚本已增加去重，下一次启动会保留 WorkDSH 专家装配、移除冗余的独立 Profile；当前预览有运行中的用户会话，本轮未重启或中断会话。专家 typecheck 与 23 项管理/原生预设测试通过。旧 `probe:experts:team` 因已不存在的 `dsh-agent-presets` 包而未运行；Web 探针现已更新并通过，详见本日隔离验收条目。
## 2026-09-24：官方专家团隔离验收

将旧 `probe-native-team-web` 的 0.1.6 安装依赖与已停用活动条断言对齐当前 0.1.7：固定 Base/Web 版本，使用官方只读 Team 面板与 Host 权威任务状态验证。隔离 Profile 的生产专家包、官方团队服务及 Web 客户端完成 15 项确定性检查：成员创建、角色与技能隔离、面板任务显示、成员会话跳转、冷重启、运行中浏览器重连、中断恢复、成员交接、失败后恢复均通过。随后再以 DeepSeek `deepseek-flash` 执行真实模型测试，主专家调用 `team_task_create`、`send_message`、`wait_agent` 等团队工具；analyst 与 reviewer 两名成员分别完成 REAL-ANALYZE、REAL-REVIEW 任务，成员 ID 保持稳定，全程无浏览器 pageerror，共 16 项检查通过。结果见 `.artifacts/dsh-0.1.6-upgrade/native-team-web/result.json`。预览 Profile 去重函数另有 2 项测试通过。尚未在用户 18989 预览运行团队任务，也未验证 fork 成员浏览器历史；正在运行的预览尚未重启，去重将在下次启动应用。
### 2026-09-24：预览重新编译与安装

用户要求重新编译发布。Node 22.23.2 下完整 `pnpm build`、`pnpm typecheck` 通过；预览 Team 去重测试 2/2、资料库插件测试 5/5 通过，`git diff --check` 通过。通过官方 Profile 安装流程重新打包并安装各 WorkDSH 插件，18989 预览重启后返回预期的登录状态 401；Profile 仅保留 `workdsh-plugin-experts` 作为 Team 装配来源。当前完成的是本机预览部署；GitHub/npm 对外发布尚未执行，`gh` 未登录且远端读取未返回，不能宣称公共发布完成。
## 2026-09-24：WorkDSH alpha.9 与 Desktop alpha.12 发布回执

资料库界面与预览 Team 去重修复已进入 Web 源码。Node 22 完整构建、类型检查、资料库 5 项和去重 2 项测试通过；11 包重新打包，清单 SHA-256 逐项核对，安装器 dry-run 通过。Web `v0.1.0-alpha.9` 已推送并发布 GitHub Release。Desktop 固定引用 alpha.9 后，由 `desktop-v2.0.5-alpha.12` 标签触发 GitHub CI；检查、Windows x64、macOS x64/arm64 与发布作业全部成功，Release 有一个 Windows 安装包、两份独立 Mac DMG 和 SHA256SUMS。仍未执行新安装包的真人安装使用测试；Mac DMG 为未签名预览包。下一步核验实际安装体验与更新已有文档中遗留的 alpha.8 状态表述。
## 2026-09-24：GitHub 首页增加 Desktop 下载

中英文 README 顶部增加 Desktop Release 与 Windows x64、macOS arm64/x64 安装包直链，并将 Web/插件下载更新到 alpha.9。Desktop alpha.12 是预发布版，因此 GitHub 侧栏的 Latest 标识不会指向它；首页直接入口用于解决安装包难找的问题。本次仅修改文档，未重新打包；安装体验仍需实机验收。
## 2026-09-24：技能市场未配置目录静默显示

用户反馈 Windows 发布版无本地技能目录时显示内部路径与仓库脚本提示。技能市场现将 `missing` 视为正常空状态，不显示该诊断；已有技能继续可见。目录存在但无法解析时保留简短错误。技能插件构建和 typecheck 通过。此项为已发布技能插件的缺陷修复，不改变市场目录来源；Windows 资源卡片“已在文件管理器中显示”但未实际打开的问题属于 Harness 原生文件打开链路，仍待 Windows 路径和原生命令实测。
# 2026-09-25：Web 预览升级至 DSH 0.1.7-rc.2

当前 `18989` 使用的 WorkDSH Web 预览已从 `0.1.7-alpha.1` 升级至官方 `0.1.7-rc.2`，设置页实测显示 rc.2。构建、类型检查、版本门禁和 134 项相关测试通过；11 个本地发布包与当前构建一致，官方 Base/Web/CLI 及共享 Boot/Scope 已核对。证据与未验证范围见 [rc.2 Web 升级记录](DSH-0.1.7-UPGRADE-PLAN.md#2026-09-25web-预览升级至-017-rc2)。此专项不代表 D04/D11 功能整体完成；下一步在目标功能上做真实模型和长任务验收。

补充 rc.2 探针：官方 Playwright 浏览器操作的导航、快照、截图通过；连接器探针发现根脚本缺少直接声明的 credentials 依赖，补齐后工具、资源、实例及会话隔离验证通过。右侧栏 Browser 已启用，但与 Agent 浏览器实例仍为两个独立载体。

专家打包浏览器探针发现编辑弹窗尺寸被共享未分层 CSS 覆盖，现已修复；专家、技能和资料库的独立打包与冷启动探针通过。上述验证仍不等于付费模型或跨平台验收。

rc.2 官方 Team Web 探针已适配新公开服务 API：移除退役的 `remoteView()` 依赖，验证成员列表与任务板、长任务、浏览器重连、中断、失败及冷恢复。旧 0.1.6 组合探针仅作历史记录。

Web 预览另已通过 WorkDSH bundle 启用官方右侧 Sidebar Browser：合成配置显示 `ui-sidebar-browser.disabled: false`，页面内可从右栏打开 Browser tab 并在 iframe 中加载 `https://example.com/`。官方 Browser tab 是用户侧页面，不是 Agent 的 Playwright 工具浏览器；两者尚未联动，不能把侧栏打开网页视为 Agent 浏览器操作已在侧栏呈现。
## 2026-09-25：alpha.12 安装包与浏览器复用验证

WorkDSH alpha.12 新增 `workdsh-provider-browser-session`，Desktop Profile 使用打包应用自带的 Electron 启动隔离 CDP worker，Web Profile 保持原浏览器路径。macOS arm64 `WorkDSH-2.0.5-arm64.dmg` 已在本地构建并通过挂载校验，大小 548 MB；解包确认内置 Python、Node 和新 provider，未发现额外 Chrome/Chromium 可执行文件。实际打包应用作为浏览器 worker 完成导航和点击，官方 Agent Session 的 MCP 双会话隔离测试直接调用该应用，通过 1/1。构建候选及相关测试已通过，但 alpha.12 与 Desktop 对应提交尚未推送 GitHub，Windows/macOS x64 新流水线与发布仍待远端验收。
