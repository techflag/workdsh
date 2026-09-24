# DSH 0.1.7 升级记录

## 2026-09-25：Web 预览升级至 0.1.7-rc.2

用户要求升级当前 `127.0.0.1:18989` 的 WorkDSH Web 应用。本专项不改变 D04 等业务步骤的完成状态。版本依据为 [DeepSeek Harness v0.1.7-rc.2 发布页](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.7-rc.2)。

- 根工作区、功能插件及 UI 对官方 `@deepseek-ai/dsh*` 的直接依赖和覆盖统一固定为 `0.1.7-rc.2`，更新 pnpm 锁文件；新增 rc.2 依赖也纳入版本门禁。
- 按 rc.2 发布包的 peer 要求，将 `@deepseek-ai/cordis-plugin-group` 和 `@deepseek-ai/cordis-plugin-loader` 分别固定为 `1.0.4` 与 `1.0.5`。Cordis 保持 `4.0.3`。
- 预览安装器避免在 CLI/账号包已为目标版本时重复安装，并将网络安装超时延长至 10 分钟。原预览 Profile 和用户数据保留。
- 本机 Node 22.23.2、pnpm 10.34.5；`pnpm build`、`pnpm typecheck`、`pnpm check:versions` 通过。版本门禁确认 556 条 DSH 锁记录统一为 rc.2。集成测试 115/115、项目 12/12、资料库 5/5、规划 2/2，合计 134 项。
- 预览 Profile 中 11 个 WorkDSH 包入口与当前构建逐字节一致；官方 Base、Web App、CLI 均为 rc.2；CLI 与设置编辑器共享同一 Boot，Agent Loop 与预设注册器共享同一 Scope。
- 使用该 Profile 启动 `18989`，匿名请求返回 401；通过登录链接打开页面，设置页显示“当前版本：0.1.7-rc.2”。
- 启用官方 Web 侧栏 Browser 条目后，合成配置显示 `ui-sidebar-browser.disabled: false`；实际右侧栏出现“浏览器”入口，`https://example.com/` 在 tab 内加载。该 tab 只负责用户侧网页展示；Agent 的 Playwright MCP 浏览器独立按 Session 管理，目前没有与 iframe tab 共用实例。
- `probe:browser-use:playwright` 验证 24 个浏览器工具，以及导航、快照和截图。连接器探针首次暴露根脚本直接导入的 `@deepseek-ai/dsh-credentials` 未声明为根开发依赖；补上精确 rc.2 依赖后，`probe:connectors` 验证连接器就绪、工具与资源注册、多实例、会话工具隔离及停用/恢复通过。
- 专家打包探针发现编辑弹窗的业务样式位于 CSS layer，无法覆盖未分层的共享 Modal 尺寸规则；将尺寸覆盖放到未分层规则后，专家创建、技能引用、发布确认、移动端宽度、两次冷启动和真实浏览器页面探针均通过。Skill 市场、安装/停用/恢复及资料库打包安装/卸载/恢复探针也通过。
- 原 `probe:experts:official` 仍使用 0.1.6 的 `dsh-agent-presets`（rc.2 不再发布），现指向当前官方 Team Web 组合探针。该探针中删除的 `remoteView()` 调用按 rc.2 文档改为 `listMembers()`/`listTasks()`；真实打包 Profile、成员技能、任务板、长任务、重连、失败恢复及冷启动全链路通过。旧 0.1.6 脚本保留为历史证据，不用于当前门禁。

首次 `preview:install` 的最终 pnpm 重复安装步骤在 180 秒超时，包实际已安装。安装器随后加入版本命中跳过和更长超时，但未重新完成一次全新的空 Profile 安装。现场 Profile 的包内容、依赖共享关系和浏览器启动已分别验证。未运行付费模型、长时间任务、跨浏览器和跨平台验证；本次不发布 npm 包或远端 Web 服务。

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
