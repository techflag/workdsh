# DSH 0.1.7 升级记录

## 2026-09-25：Web 与 Desktop 版本边界补充核对

### 版本与实际打包边界

| 部分 | 当前证据 | 判断 |
| --- | --- | --- |
| Web WorkDSH 插件 | 根依赖/覆盖和 pnpm 锁文件锁定 `0.1.7-rc.2`；构建、类型、版本门禁、134 项测试、独立 Profile 安装探针通过（详见 `DSH-0.1.7-UPGRADE-PLAN.md`） | 已完成本地 rc.2 接入验收；真实付费模型、长任务和跨平台仍未验证 |
| Desktop 打包的 WorkDSH Profile | `dsh-plugin-desktop/scripts/prepare-workdsh-runtime.mjs` 固定 `DSH_VERSION = '0.1.7-rc.2'`，从 WorkDSH `v0.1.0-alpha.10` Release 下载插件包，生成 rc.2 Profile；`prepare-workdsh-primary-runtime.mjs` 要求官方 rc.2 Node/Python 元数据 | 与 Web 插件不同的安装路径；应以最终安装包内 Profile 和真实启动为准 |
| Desktop 标准壳 | `dsh-plugin-desktop/package.json` 的官方 DSH 直接依赖仍为 `0.1.2-rc.1`；`upstream.json` 的 stable 频道也记录该运行包版本 | 壳本身未升级到 rc.2，不能称整个 Desktop 都已适配 rc.2 |
| Desktop Beta 壳 | `deepseek-harness` 子模块固定 rc.2 源码，但 `dsh-plugin-desktop-beta/package.json` 与 `upstream.json` 的 Beta 运行包仍是 `0.1.3-alpha.2`；其 134 个官方 DSH 依赖中，`dsh-agent-presets`、`dsh-code-runtime`、`dsh-settings-file` 已不在 rc.2 源码包清单 | 源码参考版本不等于实际解析的运行包版本；升级需先迁移这三个旧包的使用点，不能全局替换版本字符串 |
| GitHub Desktop 流水线 | `.github/workflows/ci.yml` 的 Windows、macOS x64/arm64 均构建 `dsh-plugin-desktop` 标准壳；发布 job 下载这三个产物 | 当前发布的安装包包含 rc.2 WorkDSH Profile，但标准壳自身仍使用旧 DSH 包 |

## 新能力核对

- **专家与专家团**：WorkDSH 已改用 rc.2 的 `AgentPresetRegistry` 和官方 Team 组合；专家发布、技能引用、冷启动恢复和 Team 任务板探针通过。真实模型长时间协作尚未验收。
- **技能、连接器、项目、资料库**：本地打包安装和各模块探针通过；这是模块兼容证据，不是 Windows/macOS 安装后的全链路证据。下一轮应在两种安装系统上复测技能运行、连接器凭据、项目 `@` 引用和资料库预览。
- **右侧栏浏览器**：官方 `ui-sidebar-browser` 已在 Web Profile 开启并能加载用户网页；官方 Playwright MCP 为 Agent Session 维护独立浏览器，不会把 Agent 页自动显示到该栏。当前 macOS 配置还显式回退到机器安装的 Chrome；安装包未发现独立 Chromium。要实现用户期望的同页观看与操作，需会话拥有的浏览器与受控侧栏输入/展示通道，单纯启用 Browser tab 不够。
- **同页技术探针**：在隔离的本机 Playwright Chromium 中，启动端创建页面，第二个 CDP 连接观察到同一页面；启动端点击后第二端读取到更新，第二端输入后启动端读取到更新。探针证明一个受管 Chromium 页面可由两端共享状态，但未接入官方 MCP、Session 生命周期或右栏 UI，也未验证权限边界与打包浏览器。下一步应由 Session 拥有浏览器/CDP 端点，Agent 工具与右栏只获得该 Session 的受控连接；不得把 CDP 浏览器级端点直接暴露给网页或其他会话。
- **官方 MCP attach 探针**：进一步用 rc.2 锁定的 `@playwright/mcp@0.0.80` 启动 24 个正式浏览器工具，令其 `--cdp-endpoint` 连接受管 Chromium。`browser_navigate` 创建的页面能被独立 CDP 观察端找到；观察端点击后，MCP 的 `browser_snapshot` 立即包含更新状态。该探针证明官方工具与右栏控制端可以共享同一浏览器，不要求另造 Agent 工具。由于 `mountSessionMcp` 的 `command`/`args` 在 provider 激活时固定，正式实现仍需通过公开 `SessionResources`、`McpClient` 为每个 Agent 动态装配端点，或等待上游提供动态端点工厂；不能把单一固定 CDP 端点给多个 Session。该测试未验证 UI、认证/隔离、Windows/macOS 打包或浏览器二进制分发。
- **正式实现边界**：沿用官方 `SessionResources` 以实时 Agent 身份持有浏览器、串行化调用并在 Agent 释放时关闭；沿用官方 `McpClient` 的工具发现/结果/图像与 Session Scope，不复制 MCP 协议或 Agent loop。WorkDSH 仅补受管 Chromium 启动、每个 Session 的动态 CDP 地址、侧栏画面/输入和身份校验。侧栏请求必须绑定当前登录主体与确切 Session；只暴露画面和受限输入操作，不向渲染进程提供 CDP 浏览器端点。旧的固定 `browser-use-playwright-mcp` provider 应在新 provider 验收后退出默认组合，避免同一 Agent 同时拥有两套浏览器工具。验收含两个并发 Session、跨主体拒绝、工具导航/点击与右栏反向输入、关闭/取消/重启清理和三平台安装包；Web iframe 或单独打开 URL 不算通过。
- **Session/MCP/画面/Remote/侧栏代码切片（BROWSER-01）**：`packages/providers/browser-session` 已有 Host provider 和 Client 入口；它用官方 `SessionResources` 按 Agent Session 管理独立 Chromium，用官方 `McpClient` 接入 `@playwright/mcp`。画面与输入经该会话队列执行，官方 Connection 的 Fetch 路由只允许个人本机身份并重新解析实时 Agent。Client 用官方 `sidebar.right.pane.tab` 显示同页画面，浏览器工具实际使用后才尝试打开。真实浏览器集成测试验证两个 Session 的工具发现、分别导航、页面隔离、关闭清理、失效 Session/非个人身份拒绝，以及路由点击在 MCP 页面快照中可见。Client 构建通过但未做实机视觉/交互验收；默认 bundle 和 Windows/macOS 安装包未接入，真实 HTTP Connection 准入、团队会话授权也未验证，因此不构成发布版右栏同页操作闭环。
- **2026-09-25 体积约束与 Electron worker**：用户明确不要在 Desktop 安装包内再打包浏览器。已撤回 Headless Shell 下载、打包、Host 环境变量与校验改动。官方 `ui-sidebar-browser` 在 Desktop 用 Electron `<webview>`，但文档明确 Model Experience 为 None；现有 WorkDSH 简壳还禁止 webview guest，不能把官方用户侧 Browser 直接当成 Agent 工具。Desktop 两个变体新增隔离 worker 入口：复用随应用已有的 Electron 43.3.0 可执行文件，使用独立用户数据目录，只在 worker 进程开放本机 CDP，主应用不开放调试端口。WorkDSH browser-session provider 可按 Session 启动/关闭该 worker。开发态实际入口经 Playwright 1.58.2 连接，读到唯一页面、导航并点击成功；变体检查和两套类型检查通过。尚未接入默认 bundle、在安装包验证同可执行文件 worker 模式、MCP 与侧栏闭环、Windows/macOS 行为或真实 HTTP 权限。下一步先做官方 MCP 与右栏端到端，再更新默认 Profile 和发布安装包。
- **Desktop 更新**：独立壳已有“检查更新”入口；是否符合 rc.2 官方 Desktop 的下载、校验、安装与恢复能力，仍须对照官方 `apps/desktop` 实现和实际安装包验证。更新域名未解析不妨碍本地代码核对，但阻止线上更新端到端测试。
- **Beta 壳迁移范围**：源码 `profile.ts` 仍直接导入 `dsh-settings-file`，以 `dsh-agent-presets` 包定位随附预设，`packaged-runtime-smoke.ts` 也读取其 `ptc` 目录；相应 Profile 和安装包测试还断言这些旧路径。rc.2 官方 Web 组合改为 `@deepseek-ai/dsh-agent-preset` 声明式预设（见 `packages/bundle/web-app/presets/ptc.patch.yml`），因此预设根、历史别名和设置读写需要一起重做。`dsh-code-runtime` 在 Beta 源码中无直接导入，先核对它是否只是遗留的直接依赖。`corepack yarn check:layout` 在 Node 22.23.2 下通过，只证明当前双版本布局自洽，不能证明 rc.2 兼容。

## 下一步顺序

1. 先在 Beta 壳定位并迁移上述三个已退役包的使用点，再以**已发布的 rc.2 包**升级依赖并跑 `check:desktop-variants`、Beta 包构建及运行探针；确认官方公开接口变化，再同步标准壳。不能仅修改 `upstream.json` 或版本显示。当前机器默认 Node 为 21，直接运行变体检查因 `import.meta.dirname` 报错；切至仓库要求的 Node 22.23.2 后，157 个共享源码文件一致性检查通过。
2. 使 CI 的标准壳和实际 WorkDSH Profile 同属 rc.2 族，保留两者分别验收的记录；重新打包 Windows/macOS 并检查安装包内 Node、Python、Profile 及启动功能。
3. 单独实现并验收 Agent 浏览器与右栏同一页面；先验证导航、点击、会话隔离和关闭清理，再调整默认浏览器路径及浏览器打包方案。

当前没有修改上游源码，也没有把版本声明或单个探针结果当成发行验收。

## 2026-09-25：Web 预览升级至 0.1.7-rc.2

用户要求升级当前 `127.0.0.1:18989` 的 WorkDSH Web 应用。本专项不改变 D04 等业务步骤的完成状态。版本依据为 [DeepSeek Harness v0.1.7-rc.2 发布页](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.7-rc.2)。

- 根工作区、功能插件及 UI 对官方 `@deepseek-ai/dsh*` 的直接依赖和覆盖统一固定为 `0.1.7-rc.2`，更新 pnpm 锁文件；新增 rc.2 依赖也纳入版本门禁。
- 按 rc.2 发布包的 peer 要求，将 `@deepseek-ai/cordis-plugin-group` 和 `@deepseek-ai/cordis-plugin-loader` 分别固定为 `1.0.4` 与 `1.0.5`。Cordis 保持 `4.0.3`。
- 预览安装器避免在 CLI/账号包已为目标版本时重复安装，并将网络安装超时延长至 10 分钟。原预览 Profile 和用户数据保留。
- 本机 Node 22.23.2、pnpm 10.34.5；`pnpm build`、`pnpm typecheck`、`pnpm check:versions` 通过。版本门禁确认 556 条 DSH 锁记录统一为 rc.2。集成测试 115/115、项目 12/12、资料库 5/5、规划 2/2，合计 134 项。
- 预览 Profile 中 11 个 WorkDSH 包入口与当前构建逐字节一致；官方 Base、Web App、CLI 均为 rc.2；CLI 与设置编辑器共享同一 Boot，Agent Loop 与预设注册器共享同一 Scope。
- 使用该 Profile 启动 `18989`，匿名请求返回 401；通过登录链接打开页面，设置页显示“当前版本：0.1.7-rc.2”。
- 启用官方 Web 侧栏 Browser 条目后，合成配置显示 `ui-sidebar-browser.disabled: false`；实际右侧栏出现“浏览器”入口，`https://example.com/` 在 tab 内加载。该 tab 只负责用户侧网页展示；Agent 的 Playwright MCP 浏览器独立按 Session 管理，目前没有与 iframe tab 共用实例。
- 浏览器同页操作边界复核：官方 `dsh-browser-use` 只注册提供方名称，不公开当前页面或导航事件；Playwright MCP provider 在 `launch` 模式为每个 Session 启动独立 Chromium，在 `attach` 模式连接一个已有 CDP 端点。官方右栏 Browser 的公开入口只创建用户侧 tab，README 明确其 Model Experience 为 None。因此，仅启用 `ui-sidebar-browser` 或将聊天链接偏好设为侧栏，均不能让 Agent 在右栏同一页面导航、点击。正式方案需要一个由 Session 拥有的浏览器实例及受控的右栏展示/输入通道，并以真实 Agent 操作、会话切换、关闭和恢复验收；不得把镜像 URL 当作同页操作。
- 已发布 `desktop-v2.0.5-alpha.18` 的 macOS arm64 DMG 实物检查：包内存在内置 Node 和 Python，但 `workdsh-runtime` 中找不到独立的 Chromium/Chrome 可执行文件；随包 `workdsh-bundle/cordis.patch.yml` 仍在 macOS 默认指向 `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`。这条配置会使用机器上的浏览器，并不能将 Agent 浏览器装入应用右栏。删除该路径而不提供受管浏览器只会造成无 Chrome 机器的功能失败，故此项保持未完成。
- `probe:browser-use:playwright` 验证 24 个浏览器工具，以及导航、快照和截图。连接器探针首次暴露根脚本直接导入的 `@deepseek-ai/dsh-credentials` 未声明为根开发依赖；补上精确 rc.2 依赖后，`probe:connectors` 验证连接器就绪、工具与资源注册、多实例、会话工具隔离及停用/恢复通过。
- 专家打包探针发现编辑弹窗的业务样式位于 CSS layer，无法覆盖未分层的共享 Modal 尺寸规则；将尺寸覆盖放到未分层规则后，专家创建、技能引用、发布确认、移动端宽度、两次冷启动和真实浏览器页面探针均通过。Skill 市场、安装/停用/恢复及资料库打包安装/卸载/恢复探针也通过。
- 原 `probe:experts:official` 仍使用 0.1.6 的 `dsh-agent-presets`（rc.2 不再发布），现指向当前官方 Team Web 组合探针。该探针中删除的 `remoteView()` 调用按 rc.2 文档改为 `listMembers()`/`listTasks()`；真实打包 Profile、成员技能、任务板、长任务、重连、失败恢复及冷启动全链路通过。旧 0.1.6 脚本保留为历史证据，不用于当前门禁。

首次 `preview:install` 的最终 pnpm 重复安装步骤在 180 秒超时，包实际已安装。安装器随后加入版本命中跳过和更长超时。2026-09-25 又在独立空目录 `.test-runtime/rc2-fresh-install` 运行完整 `corepack pnpm preview:install`，21.8 秒退出码 0；新 Profile 的 CLI、Base、Web App 和 Sidebar Browser 均为 `0.1.7-rc.2`，安装脚本还逐项验证 11 个 WorkDSH 包的已安装入口与当前构建字节一致。现场 Profile 的包内容、依赖共享关系和浏览器启动已分别验证。未运行付费模型、长时间任务、跨浏览器和跨平台验证；本次不发布 npm 包或远端 Web 服务。

日期：2026-09-22。用户授权实施；原则：能用原生就用原生。
基线：0.1.6-alpha.2；目标：0.1.7-alpha.1。独立升级专项，不代表 D04/D11 或其他业务模块整体完成。

## 实施与验收

- [x] U17-1：核对已发布包 exports/types，更新精确版本族及锁文件；禁止改上游和用户 Profile。
- [x] U17-2：专家发布/恢复改用官方 AgentPresetRegistry，保留业务修订、资源校验、授权和冷启动注册；不创建每专家 npm 包。旧修订不能静默重编后冒充同一运行组合。
- [x] U17-3：默认使用原生工作过程与 Team 面板，停止组合重复 Activity 展示；保留独立插件历史兼容与业务活动记录。
- [x] U17-4：默认使用原生 XLSX/XLS/CSV/TSV 预览，保留差异编辑入口；适配原生二进制预览契约。
- [x] U17-5：检查 Session V4、附件、配置和项目引用链，使用隔离数据验证；不直接改写用户 Session 日志。
- [x] U17-6：构建、类型、相关单元/集成测试、版本/计划门禁、隔离 Profile 启动与冷恢复；回填真实证据和未验证范围。

## 官方能力复用记录

|任务|官方依据/公开面|WorkDSH 差异与验证|
|---|---|---|
|U17-1|docs/dsh-v0.1.7-alpha.1/docs/config-catalog.zh.md；已发布 0.1.7-alpha.1 包|精确依赖、Loader/Profile 安装与构建|
|U17-2|subsystems/core.zh.md 的 ctx.agentPresets；dsh-agent-preset-registry|专家多对象/冻结修订/主体绑定仍由专家服务拥有；注册、释放、重启、资源漂移测试|
|U17-3|release.txt 工作过程/Team；原生 Conversation 与 Team 工具|不另解析和调度执行；默认组合不注册自有重复过程栏|
|U17-4|subsystems/sidebar-right.zh.md；documentPreviews|只保留 Office 编辑业务；原生预览优先、字节数据和选择器验证|
|U17-5|persistence-changes/2026-09-16-session-format-v4.zh.md；workspace.zh.md|自有业务引用与 Session 格式分离；历史恢复、引用展示/读取验证|

## 风险与回退

先验证发布包，再实现，文档不能代替运行。既有旧专家预设是目录格式；迁移必须显式诊断不支持的历史格式。Session V4 用官方迁移，测试副本先行。保留正式预览现有运行版本直到隔离验收完成。安装失败、真实模型未执行或视觉未验收须明确记录。提交、推送、发布不属于本次授权。

## 执行记录

- 初始工作树干净；npm 已确认目标 dsh 版本存在。当前 shell Node 21，后续使用本机 Node 22.23.2 与 pnpm 10.34.5。

## 验收结果（2026-09-22）

- Node 22.23.2 / pnpm 10.34.5；全量 build、typecheck 通过。
- 精确版本门禁通过：545 条 DSH 锁记录统一 0.1.7-alpha.1，Cordis 4.0.3、schemastery 3.18.3。
- 集成 110/110，资料库 5/5，项目 10/10，规划 2/2；Activity 15/15（含新增 Session V4 回归）。
- 真正的公开 Loader + AgentPresetRegistry 验证声明注册、释放、重新注册、冻结内容以及摘要漂移拒绝。专家发布采用临时目录再原子重命名，失败不会覆盖既有修订。
- 隔离安装探针验证打包安装、Host 启动、匿名 401/登录 200、卸载重启和重新安装。
- 专家浏览器探针 13 项通过：独立 Profile 安装、真实身份授权/审计、原生 Session 与固定绑定、草稿引用、技能选择、显式发布与召唤、响应式界面无页面错误、两次 Host 冷启动恢复。
- 本地日志：`.test-runtime/upgrade-017/` 的 build-final.log、typecheck-final.log、integration2.log、library.log、projects.log、versions.log、install-probe.log、experts-package.log。浏览器证据在 `.artifacts/experts-package/`。

## 交付边界与迁移注意

- 完成本地代码与验证；未提交、推送、发布，也未替换用户正在运行的 Profile。
- 原生工作过程与 Team 面板拥有展示；项目自身业务活动记录保留。Activity 历史事件投影兼容 V3/V4，但不再注册重复界面或轮询子代理。
- Office 不再接管 CSV/TSV；Office 编辑注册为 builtin 备选，随默认原生预览之后加载，保留编辑入口。原生 XLS/XLSX/CSV/TSV 已发布支持；本轮补充六种格式浏览器视觉验收，均正常；三种编辑入口也可切换。
- 旧目录格式专家修订不静默重编。旧资产及日志保留，需要重新发布形成新的声明式预设，再创建新任务；旧任务自动迁移续跑不在已验证范围。
- Session V4 的 Skill 调用与持久化恢复已测；没有直接修改用户历史日志。项目/资料库为模块回归，本轮已跑项目 @ 引用→原生执行→右侧预览→冷启动重开链路；未做跨项目权限的全面浏览器回归。
- 未运行付费模型、专家团小时级长任务、OAuth、跨平台测试。`probe-presets.mjs`、`probe-official-expert-composition.mjs`、`probe-native-expert-team.mjs` 仍是旧 0.1.6 诊断脚本，不作为本次证据；本次采用新版 registry 集成与 experts-package 浏览器探针。

## 补充验收

详见 [2026-09-22 验收记录](evidence/dsh-0.1.7-acceptance.md)：16 项浏览器检查和旧格式专家回归通过；资料引用预览浅色主题不一致已修复，续轮 17 项浏览器验收通过（含主题往返切换）。核心升级兼容通过不等于完整产品或发行验收。
