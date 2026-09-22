# 0.1.0-alpha.15 — 2026-09-22

「新建任务」由「点击即起空会话」改为任务创建器（UI-DESIGN 第 5 节，2026-09-22 用户决定：做成豆包式创建器，官方「新会话」入口文案不动）。

- [`NewTaskPanel.tsx`](src/client/components/NewTaskPanel.tsx)：`workdsh-new-task` 的 `main` 面板由不渲染内容的占位改为创建器，含运行位置（工作空间）、项目（可选）、专家（可选）、连接器（可选）、任务描述（可选）与「本版待开放」六段。待开放项逐条写明未实现原因与当前替代路径，不放置无效控件。
- 一次挂载读取一次选项：项目/专家/连接器分别走 `/api/workdsh-projects`、`/api/workdsh-experts`、`/api/workdsh-connectors` 的公开信封；单一来源失败降级为显式原因文案，不返回空列表冒充「没有可选项」。
- 专家任务走 `prepare-execution` → `create-execution` → `consume-handoff`（与专家插件的召唤链路同构）：不可召唤在创建前就作为可见拒绝返回，不要半成品任务。
- 项目任务走 `link-task`、连接器走 `set-selection`；选中项目时按其配置预勾选连接器，同一项目不产生两套装备不同的任务。
- 任务描述只作为一次性草稿交给原生输入器（`sessionStorage` + `conversation.input.overlay`，与既有专家/技能草稿同构），**绝不自动发送**。
- 本版不注册自建输入器、不复制编辑器、不持有会话或执行状态：`/` 指令、`@` 引用、附件、权限、模型、Agent preset、发送与取消继续由原生 Conversation 提供。`inject` 因此增加 `layout`/`sessions`/`workspaces`（官方 Web 客户端已由 `dsh-client-ui-workspace` 载入 workspace controller，与 projects/skills/experts/library 既有注入一致）。
- 需与 `workdsh-bundle@0.1.0-alpha.52` 同批安装。

# 0.1.0-alpha.14

- 新增「新建任务」导航项：客户端注册 `sidebar.panellist` 行（`id: workdsh-new-task`、`label: 新建任务`、`order: 0`）与配对的不渲染内容 `main` 面板。官方 Sidebar 的行按钮固定调用 `ctx.layout.selectPanel(id)`（ui-sidebar 的 PanelRow），没有自定义 onClick 的公开面；点击由面板挂载后的 `ctx.uiWorkspace.startSession()` 承接，随后官方 `replaceMain`/`clearMain` 执行 `selectPanel(null)` 回到原生空会话。`inject` 因此增加 `uiWorkspace`。
- 该面板不持有输入器、会话或执行状态：`/` 指令、`@` 文件与对话引用、附件、权限、模型、Agent preset、发送与取消继续由原生 Conversation 提供（UI-DESIGN 第 5 节）。
- 组合包需与 `workdsh-plugin-projects@0.1.0-alpha.3` 同批安装：项目行 `order` 由 20 改为 5，排在新建任务之后、助理之前。

# 0.1.0-alpha.13

- 合并上游 `0.1.6-alpha.2` 线后，工作台只列仍未实现、仍待开放的入口：`businessPanels` 现为「助理」「定时任务」「更多」三项，`pending` 说明恢复为必填字段。
- 「项目」入口交还 `workdsh-plugin-projects`：项目页面已实现，由 `workdsh-plugin-projects@0.1.0-alpha.2` 自持 `main` 与 `sidebar.panellist` 行（`order: 20`），工作台不再为它登记待开放占位。
- 版本号撞号修复：本线与上游线都发布过 `0.1.0-alpha.11`（内容不同），合并后重新定版为 `0.1.0-alpha.13`。上游 `alpha.11` 的「隐藏未实现入口」决定已被本条取代——未实现入口保留侧栏行并标「（待开放）」，而不是消失。下游 `0.1.0-alpha.12` 为本线资料库入口交还记录，保留在下方。
- 组合包、`workdsh-plugin-projects` 与 `workdsh-plugin-library` 需同批升级：只升工作台会让「项目」「资料库」入口消失。

# 0.1.0-alpha.12

- 资料库不再由工作台登记：这一版起 `businessPanels` 只列仍未实现的入口，`pending` 不再是可空字段。
- 修复「有入口、无页面」隐患：此前工作台无条件注册「资料库」侧栏行，而 `workdsh-library` 的 `main` 面板归资料库插件；若某 profile 只装组合包不装资料库，点击该行会抛 `layout.selectPanel: main panel "workdsh-library" is not registered`。现在入口与页面同属一个插件，插件缺席就没有入口。
- 组合包与资料库需同批升级：只升组合包会让「资料库」入口消失直到资料库升到 `0.1.0-alpha.2`。

# 0.1.0-alpha.11

- 助理、项目、定时任务、更多四个未实现入口改为「待开放」呈现：侧栏注册标签追加「（待开放）」，配对主面板给出职责、未实现原因与当前可用的替代路径。
- 资料库入口的 `main` 席位交还 `workdsh-plugin-library`：工作台只为自己 `pending` 的入口注册主面板，资料库页面归资料库插件，避免同一 key 重复注册。
- 官方 `sidebar.panellist` 的公开注册面只有 `id`/`order`/`label`，行按钮与 `selectPanel` 由官方 Sidebar owner 持有，没有 disabled 语义；因此待开放无法做成字面禁用项，只能以标签后缀与说明面板表达，该限制记入代码注释与本 CHANGELOG。

# 0.1.0-alpha.10

- 导出标准 name/inject/apply，由默认展示包通过 ctx.plugin 注册独立子插件生命周期。
- 将能力中心侧栏入口交还 Skill Client，移除 Skill 后不残留空入口；原生工作区和会话导航保持。
- 仍随展示产物编译，本版本不宣称独立 npm 安装交付。

# 0.1.0-alpha.9

- 进入 D02，将 Harness Slot 装配、工作台 TSX 页面结构与样式拆分，公开入口只导出装配函数。
- 保持官方 Sidebar、Workspace、Session 与 Conversation 所有权，未接入领域页继续显示真实边界。

# 0.1.0-alpha.8

在 Harness 官方 Sidebar 上按 WorkBuddy 信息架构增量加入助理、项目、“专家 · 技能 · 连接器”、定时任务、资料库和更多。“专家 · 技能 · 连接器”保持一个能力中心入口，内部再分领域；官方工作区/会话区域及全部菜单继续由 Harness 持有。

# 0.1.0-alpha.6

撤销整块 sidebar 替换，恢复 Harness 官方工作区和会话导航，因此保留工作区创建/重命名/删除、会话重命名/分叉/归档、时间、折叠和原生新会话行为。WorkDSH 后续只通过增量公开 Slot 添加业务入口。

# 0.1.0-alpha.5

“新建任务”直接进入 Harness 原生空会话，不再渲染 WorkDSH 自建输入器。`/` 指令、`@` 引用、附件、权限、模型及 preset 全部沿用官方 Conversation；左侧工作区行改为展开/收起分组，不再误触发任务创建。

# 0.1.0-alpha.4

侧栏改为 Harness 原生语义的“工作区 → 会话”层级，工作区选择留在左侧并驱动新任务首页；移除左侧“专家 · 技能 · 连接器”聚合入口。

# 0.1.0-alpha.3

新增正式 WorkDSH 新任务首页：读取 Harness 官方工作区列表，通过官方 Session Controller 创建任务，并将描述写入原生 Conversation 草稿。首页只负责任务入口，执行、模型、权限和附件继续由 Harness 管理。

# 0.1.0-alpha.2

修复“运行设置”直接替换侧栏却未打开设置的错误交互。入口改为“设置”，先显示 WorkDSH/Harness 设置职责及明确的跳转动作；支持遮罩、取消和 Escape 关闭。

# 0.1.0-alpha.1

通过官方 sidebar slot 提供 WorkDSH 导航；useSessions 读取真实任务，clear/open 返回原生 Conversation。更多/运行设置恢复官方侧栏，footer 可返回。
