# D01 Client 页面与 Remote 接入验证

> 2026-09-12 收口说明：本文记录的是早期 Client 探针；后续 Skill 与工作台证据已完成本地官方 Slot/Conversation/Connection 组合。生成的企业 Remote、长任务网络取消和多人入口移入 [企业版架构说明](../ENTERPRISE-EDITION.md)，不再阻塞本地 D01。


日期：2026-09-11。当前候选包 workdsh-bundle@0.1.0-alpha.14，仅本地预构建 tarball；当前步骤仍为 D01。

## 已通过

- 官方 CLI 安装 tarball，Host 载入包根入口。
- 官方 Client Modules 启动图包含且仅包含一个 workdsh-bundle 行；浏览器执行 ./client 构建产物。
- Harness 官方 Sidebar 保持唯一 owner；WorkDSH 只注册品牌 Slot，诊断参数启用时再通过 sidebar.panellist 增加独立验证入口。未替换 root、未创建第二套 React 根。
- 实际浏览器确认官方新建会话、添加工作区、搜索、视图选项、工作区/会话树和设置均存在；官方 DOM 同时提供工作区与会话操作按钮。旧 WorkDSH 聚合入口和双侧栏往返入口均不存在。
- 用户点击读取按钮，通过 ctx.remote.pluginInventory.list() 返回真实 Host 条目，断言 WorkDSH 条目 active。
- 浏览器刷新后，再次选择页面与查询通过。此项验证页面重建，不代表 WebSocket 中断重连或运行恢复已验证。
- 测试不填写 API Key；通过官方 Continue / Configure later 按钮完成初始化提示。
- Chromium 无未捕获 pageerror；截图人工检查并修复浅色主题对比度。

![实际浏览器页面](d01-client-probe.png)

## 实测发现与适配

1. rc.1 的 Client 扫描未识别 workdsh-bundle/probe 包子路径；仅 Host 激活，Client 启动图无对应行。改用包根导出，保留 ./probe 供独立生命周期测试。没有修改上游。
2. 调用 Remote 需要同时声明 remote 和 remote.pluginInventory 服务注入；只有其中之一均被 Cordis 拒绝。TypeScript 类型通过不能代替运行验证。
3. 浏览器产物采用公开 ClientBundleRegistration 的 factory 协议。单文件源码通过 TypeScript 转为 CommonJS 再封装注册函数，仅允许平台 react require；新运行依赖必须显式扩展构建而不能静默打包 Host。
4. dsh-client-ui-slots 作为直接类型依赖补入精确 override。业务包、浏览器模块及生成 Remote 是不同构建面。

## 验证命令

在合规 Node 下依次执行：corepack pnpm install --frozen-lockfile、build、typecheck、test:integration、check:versions、probe:browser。命令与浏览器安装方式见 ../DEVELOPMENT.md。

probe:browser 创建隔离 DSH_HOME/Profile，保留测试产物，结束时关闭 Chromium 与 Host。测试登录 cookie 不进入截图和证据；使用临时本机认证，不证明团队授权。

## 尚未完成

自有领域 Remote 生成/注册、逻辑流取消、长时间网络不可用及在途请求恢复、Client 运行中卸载清理、专家预设/技能恢复、全路径授权与数据库均未完成。本页面只读取官方插件清单，不是用户工作台或管理后台的交付。

官方参考：[Client Modules](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/client-modules)、[Web Client](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/web-client)。同时核对 rc.1 npm 包的公开类型与真实安装结果，未使用上游 checkout。

## 断线与卸载补充验证（2026-09-10）

本轮仅增强测试脚本，产品候选版本仍为 0.1.0-alpha.2。

- Playwright WebSocket 路由连接真实 Host，双向转发原始帧，不伪造响应。主动关闭浏览器与 Host 两端连接（1012），不刷新页面，断言官方客户端建立新连接并收到新帧。
- 切到 New Session 再返回探针，先断言“尚未发起查询”，消除旧结果干扰；重新点击查询，捕获 pluginInventory 的实际 HTTP POST 成功响应，再断言 active。
- 普通 Remote unary 使用 HTTP POST；WebSocket 用于逻辑流。连接恢复不等同于长任务或订阅精确续传。依据为 rc.1 发布包 dsh-client-connection README 的传输说明。
- CLI 停服移除 bundle 后，重启 Host 并重新认证，在新的 Chromium 中确认 Client 启动图、导航、页面都不含 WorkDSH。此项不证明运行中热卸载清理。
- 同一命令继续验证重装激活；finally 关闭 Host 和浏览器。测试不需要模型或外部业务账号。

执行命令：`corepack pnpm probe:browser`。早期断言曾错误地把 New Session 当 button、把 unary 查询当 WebSocket 消息；已按实际 UI 与公开传输契约修正，最终结果以完整重跑为准。

最终完整重跑：PASS，退出码 0；包含停服卸载后的浏览器缺席检查及重装激活。规划完整性和规划测试 2/2 同时通过。

## 布局导航补充

探针新增公开 layout 服务注入与“返回 Harness 会话”按钮，调用 selectPanel(null)。浏览器在断线恢复后点击该按钮，确认探针卸载，再从导航返回并读取新 Host 响应；完整安装/刷新/停服卸载/重装链重跑通过。build、typecheck 通过。未创建模型任务，此项不证明运行中会话内容无损切换；品牌替换、默认首页和完整外壳仍待验证。

## 品牌与默认面板探针

通过公开 Slots priority=-10 注册 sidebar.brand.name/mark；通过 main 声明感知回调注册后调用 layout.selectPanel 选择探针首页。真实 Chromium 验证启动无需点击即看到探针、WorkDSH 品牌可见、刷新后仍默认进入探针；返回会话与再次进入可用，卸载并重启后 WorkDSH 品牌和页面均消失。build/typecheck/probe:browser 通过。

这是隔离 Profile 内的覆盖机制验证，未修改上游。正式产品组合仍应按官方品牌包说明选择品牌提供者，而非无限叠加优先级；优先级 -10 是本探针的局部约定。当前首页仍为诊断页面，不是原型迁移完成；刷新会重新选择首页，尚未实现恢复最后页面或深链接优先级。

## 页面 URL 与刷新恢复

通过公开 usePanelInfo hook 读取布局选择，shell.overlay 注册无视觉内容的观察组件；URL 只同步展示位置，不持久化 Session 或权限。`conversation`、无参数、旧 `home` 和无效值都返回原生 `main.conversation`；skills 与 diagnostics 仍进入对应 WorkDSH 面板。workbench alpha.5 删除自建首页输入器，“新建任务”调用官方 Session clear 后显示原生空会话，因此 `/`、`@`、附件、权限、模型及 preset 沿用官方 Conversation 提交链。

alpha.13 本地预览实测：旧 `workdsh-view=home` 自动归一化为 `conversation`；输入 `/` 出现 compact/export/feedback/goal/permission/plan/model 及真实技能候选，输入 `@` 出现工作区目录、文件和会话候选。草稿随后清空，没有提交模型请求。

此项只覆盖当前两个视图，不是业务路由系统；尚无浏览器前进后退栈、多业务页深链接或具体会话 ID 恢复验证。未执行模型请求。

## 浏览器前进后退

增加 pushState 与 popstate 的两视图导航；首次/失效值归一化仍 replaceState，监听随组件清理。Chromium 真实 goBack/goForward 验证通过，同时重跑刷新、重连、卸载、重装。当前仅保证两个已注册视图，不宣称恢复具体 Session ID 或其他插件路由。

## 原生 Sidebar 所有权恢复

workbench alpha.6 删除自有 Sidebar occupant，skills alpha.4 删除旧“专家 · 技能 · 连接器”panellist，bundle alpha.14 只组合官方 Sidebar、WorkDSH 品牌和独立业务页面。这样工作区创建、折叠、重命名、删除，以及会话选择、时间、重命名、分叉、归档全部继续由 `@deepseek-ai/dsh-client-ui-workspace` 实现。

本地 18989 预览刷新后确认旧入口为 0，原生侧栏控件和操作按钮均存在。只查看了控件结构，没有执行删除、分叉、归档或模型请求。Node 22.23.2 下 typecheck、build 与 tarball 生成通过；浏览器探针断言已同步为官方侧栏模型。
