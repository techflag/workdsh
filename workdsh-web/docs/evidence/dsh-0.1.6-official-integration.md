# DSH 0.1.6 隔离升级与适配证据

## U16-F01 Web Profile 升级实测

2026-09-15 对既有 Preview Profile 与全新官方 Web Profile 做了对照。旧 Profile 的 bundle 清单虽然仍包含 `@deepseek-ai/dsh-web-app`，但仅重装 WorkDSH 本地包不会更新该官方 bundle 的实际依赖，因此启动页缺少 0.1.6 新增的 Terminal 与归档会话 Client 模块。

- 修复：`scripts/install-preview.mjs` 从根 `package.json` 的 `pnpm.overrides` 读取锁定版本，每次安装 Preview 时同时通过官方 `dsh plugin add` 重装精确版本的 `@deepseek-ai/dsh-web-app`，并核对落盘版本；没有复制或替换官方终端、归档与预览实现。
- 配置结果：`--dump-config` 已包含 `@deepseek-ai/dsh-api-terminal-controller`、`@deepseek-ai/dsh-client-ui-sidebar-terminal`、`@deepseek-ai/dsh-client-ui-settings-unarchive-sessions`、`@deepseek-ai/dsh-mcp-resources`、`@deepseek-ai/dsh-ptc-runtime-node` 和 `@deepseek-ai/dsh-workflow-ptc`。
- 浏览器结果：使用全新无缓存浏览器连接认证 Web 页面，工作区与既有会话正常加载，控制台错误和失败请求均为 0；Settings 的 `Archived sessions` 可打开并列出真实归档会话及 `Unarchive` 操作。
- 边界：右栏 Terminal 模块和入口已经进入最终 Client 组合，但本轮自动化创建终端的定位不稳定，尚未完成命令执行、多标签、Shell 切换和刷新恢复四项行为验收，因此 U16-F01 仍为 partial。

其余官方新能力按有效运行面核对：Node PTC 和 workflow-ptc 已装配。MCP Resources、Headless、Browser Use 与 Computer Use 的后续实测见下节；Auto review 已完成官方层装配和可见入口验证；SSH 远端工作区仍不得写为已通过。官方 Team 的单独实测见后文。

## U16-F05 官方 MCP Resources 实测

2026-09-15 使用锁定的 `@deepseek-ai/dsh-mcp-client@0.1.6-alpha.1` 和 `@deepseek-ai/dsh-mcp-resources@0.1.6-alpha.1`，启动本地无凭据 stdio MCP fixture，并通过 `ctx.tools.execute` 调用官方共享工具。fixture 只用于验收，不进入正式 Profile，也不取代用户配置的真实 MCP Server。

- fixture 的第一页返回 `workdsh://guide/start` 和 `nextCursor`，第二页返回 `workdsh://guide/second-page`；官方 MCP SDK 自动追取并聚合两页，模型工具一次调用得到两个资源且不再暴露 cursor。服务不声明 tools 能力，证明无工具 MCP Server 仍可提供资源。
- `list_mcp_resource_templates` 返回 `workdsh://guide/{topic}`。
- `read_mcp_resource` 读取固定 URI 后返回 `WorkDSH MCP resources are ready.`，读取展开 URI `workdsh://guide/presentation` 后返回对应 topic。
- 可复现命令：`corepack pnpm probe:mcp:resources`；探针同时断言三个工具在调用 Agent 的作用域中可见，并在结束时关闭 MCP 子进程。
- 边界：本轮证明普通调用作用域内的分页发现、无工具服务器、固定读取与模板读取。断连重连、错误专家作用域和 Streamable HTTP 尚未完成，因此 F05 仍为 partial；正式产品不会默认连接测试服务。

## U16-F07 官方 Headless 实测

2026-09-15 直接运行 `dsh@0.1.6-alpha.1 --profile headless`，没有注入 Web Client。自动探针 `corepack pnpm probe:headless` 校验帮助入口、stdin 空任务拒绝、`--json` 机器可读错误和未知 `--session-id` 在执行前拒绝。

- 真实 stdin + JSONL：管道输入“只回复 HEADLESS_OK”，事件从 `session` 开始，经 `turn_start`/`step_start`/`text`/`turn_end`，以 `final` 结束，退出码 0。
- 真实续跑：使用首轮返回的同一个 Session ID 再次启动独立进程，事件显示 `turn: 2`，模型能读取上一轮并再次返回 `HEADLESS_OK`。
- 真实文件任务：新 Session 调用官方 `write` 创建 `.artifacts/headless-created.txt`，再调用 `bash` 核对 17 字节和尾换行；JSONL 包含对应 `tool_call` 与 `tool_result`，最终答案为 `HEADLESS_FILE_OK`，退出码 0。
- 失败路径：隔离 Home 中请求不存在的 Session，stdout 返回 `{"type":"error",...}`，stderr 返回 `dsh:` 诊断，退出码 1。
- 边界：尚未实测运行中取消、异常工具导致的 `turn_end` 失败，以及由 WorkDSH 自有自动化模块发起任务；因此不把 F07 标为完整产品验收。

## U16-F04 官方原生 Computer Use 接入

2026-09-15 按 `dsh-v0.1.6-alpha.1` 官方 Computer Use 子系统说明，WorkDSH bundle 显式组合 `@deepseek-ai/dsh-computer-use` 与唯一的 `@deepseek-ai/dsh-experimental-computer-use-cua-driver-native` Provider。没有复制官方工具、截图或输入实现，也没有同时启用 MCP Provider。

- 发布包差异：两个官方 npm 包没有声明 `dsh.bundle`，单独执行 `dsh plugin add` 只会安装依赖，不会自动写入 Loader 图。WorkDSH 在自身 bundle 的公开 `cordis.patch.yml` 中显式插入两个官方模块；隔离 Profile 证明该组合可启动。
- 原生能力探针：`corepack pnpm probe:computer-use:native` 实际启动 `@trycua/cua-driver@0.28.0`，发现 55 个工具；只读 `check_permissions(prompt:false)` 返回 macOS Accessibility=true、Screen Recording=true，随后显式 shutdown。
- 打包生命周期：`corepack pnpm probe:install` 核对安装后的 `--dump-config` 同时包含服务与 Provider，卸载 bundle 后两行同时消失，重新安装后 Host 再次激活。
- Preview：重新安装并启动后，真实 `--dump-config` 包含 `computer-use` 与 `computer-use-cua-driver-native`，认证 Web 页面可加载。原生 Provider 启动日志无错误。
- 边界：本轮没有让模型执行点击、键盘输入或截图任务；这类行为还需要用具备图片输入能力的模型做端到端任务验收。因此当前结论是“官方原生 Computer Use 已装配，驱动和权限通过”，不是“所有桌面操作场景已通过”。

## U16-F03 官方 Playwright MCP Browser Use 接入

2026-09-15 按官方 Browser Use 文档选择无需额外模型密钥的 Playwright MCP Provider。WorkDSH bundle 同时挂载 `@deepseek-ai/dsh-browser-use` 与唯一的 `@deepseek-ai/dsh-experimental-browser-use-playwright-mcp`，使用 `mode: launch`、`headless: true`，每个活动 Session 的浏览器所有权和跨轮次状态由官方运行时管理。

- 浏览器发现实测：官方固定的 `@playwright/mcp@0.0.80` 自动发现会寻找未安装的 Chrome for Testing，因此不能在本机直接工作。组合按官方 `executablePath` 字段读取 `DSH_BROWSER_EXECUTABLE`，macOS 默认落到已安装的系统 Google Chrome。
- 后端实测：`corepack pnpm probe:browser-use:playwright` 以与官方 Provider 相同的固定 CLI 参数启动后端，发现 24 个工具，在本地受控 HTTP 页面完成 `browser_navigate`、`browser_snapshot` 与 `browser_take_screenshot`；截图为 `.artifacts/browser-use-playwright.png`。
- 打包与 Preview：安装生命周期探针核对服务和 Provider 随 bundle 一起出现、卸载和恢复；Preview 冷安装、冷启动后 `--dump-config` 包含两行，认证 WorkDSH Web 页面正常加载。
- 边界：MCP 后端的真实浏览器动作已通过，但还没有由付费模型在普通/专家/团队三种 Session 中逐一调用，也未验证跨轮次状态、取消和 Session 销毁后的浏览器清理。因此不把 F03 标为完整端到端验收。

## U16-F08 官方 Auto review 接入

2026-09-15 读取并安装精确版本 `@deepseek-ai/dsh-experimental-auto-review@0.1.6-alpha.1` 的官方 bundle layer。WorkDSH 不实现另一套审核器；官方插件负责当前会话权限选项、逐次模型审核、拒绝回执、取消和卸载清理。

- bundle 生命周期：`corepack pnpm probe:install` 实际验证安装后的有效配置包含 `dsh-experimental-auto-review`，卸载 WorkDSH bundle 后该层消失，重装后 Host 再次成功启动。
- 真实 Web 入口：更新并重启 Preview 后，在新会话“访问模式”中看见 `Auto review` 和 `EXP` 标记；选择后出现官方风险确认框，正文明确无沙箱、每次原生工具与 PTC 内层调用前由当前 Agent 同模型审核并消耗额外 token。“启用 Auto review”在勾选风险确认前保持禁用；取消后当前权限仍为“工作区内修改”。
- 默认行为：Auto review 只出现在当前会话选择器，不进入常规设置或未来会话默认值；WorkDSH 没有自动替用户开启。
- 边界：本轮通过的是官方层装配、安装生命周期、入口、确认与取消。允许、拒绝、审核服务失败，以及普通/专家/团队中对真实工具调用的逐次执行仍需确定性模型探针和实际任务回执，因此 F08 仍为 partial。

## U16-V1 官方专家组合复用验证（接点实测，产品迁移未完成）

- 范围：验证官方 Team 的默认角色/技能行为，以及公开 `agent/created` 事件中的 Agent 局部 Persona/Skill 组合；不加载 WorkDSH ExpertsManager 或旧 binding Guard，不用旧内部结构判定官方能力。
- 官方依据：0.1.6-alpha.1 的 `dsh-agent` 根导出公开 `Agent.ctx` 与串行异步 `agent/created`；`dsh-persona`、`dsh-skill-filesystem` 公开插件配置；`dsh-experimental-agent-team` 与 `dsh-experimental-tool-agent-team` 的根导出、README；本地镜像版本落后之处以锁定发布包为准。
- 原生所有者：官方 Loader、AgentLoop、Team、continuable subagent、Persona、SkillRegistry、Session/persistence；WorkDSH 探针只提供确定性模型、隔离配置与断言。不复制 provider、队友创建/续跑/等待实现。
- 候选差异：按官方团队成员身份选择已知角色配置，在子 Agent 作用域组合角色和固定技能资源；先验证创建时身份是否可查询，再验证并发、首请求、失败回滚、源内容变更与冷恢复。
- 验收：默认不同任务分工、A/B 实际 Persona 与 Skill 内容可区分；独立局部组合不污染父级或兄弟；初始化失败不发模型请求；持久历史恢复后仍使用对应角色。下列结果只覆盖测试配置，未迁移产品数据或切换生产实现。

### 可复现命令与结果

Node 22.23.2 下执行 `corepack pnpm probe:experts:official --prepare`：通过 npm pack 获取精确版本的两个官方实验性 Team 发布包，禁用安装脚本；随后构造隔离 Home，按发布包根导出加载。重复运行用 `corepack pnpm probe:experts:official`。代码为 [probe-official-expert-composition.mjs](../../scripts/probe-official-expert-composition.mjs)，没有导入 WorkDSH 专家服务、旧委派提供方或执行 Guard。

| 验证 | 实际结果 |
| --- | --- |
| 官方默认组合 | 两个真实队友可运行，不需要 WorkDSH binding；默认名称和分工来自任务，运行 preset 仍共享 |
| 两种专家角色与技能 | 使用公开 `tryMembership`、串行 `agent/created`、`agent.ctx.plugin()` 挂载官方 Persona/Skill Filesystem；两个原生 Agent 同时进入 running，各自首请求只有对应角色，调用真实 `skill` 工具读到 A/B 不同资源；兄弟及父级技能目录未污染 |
| fresh / fork | fresh 子任务正常；fork 的实际持久事件包含 Lead 已完成轮次，当前系统角色与技能使用目标队友配置 |
| 初始化失败 | 未配置成员在首次模型调用前被拒绝，官方 roster 记录 failed；没有新模型请求 |
| 中断与清理 | 官方 `interrupt` 使等待中的队友以 aborted 结束；根句柄和官方 runtime 关闭后进程退出。未据此声明长时间资源收敛或组合插件独立热卸载通过 |
| 跨进程续跑 | 关闭整个 runtime，新 Node 进程恢复原 Lead，官方 `sendMessage` 唤醒原 alpha 与 beta-fork Session；同一队友 ID、首请求角色和当前技能目录保持正确；是实际继续模型回合，不只是读历史 |
| 分叉历史查询 | `sessionQuery.readSession` 在默认无自有配置的 fork、局部专家 fork、冷恢复 fork 三处出现 `seeded session constructor seed must equal its inherited prefix`；换成官方实际 SQLite query 后端后仍复现。公开 `sessionPersistence.open/read` 能读取，探针用此路径继续其他断言，但明确保留原查询失败 |

主流程 9 项断言通过，冷进程 3 项断言通过；因为分叉查询异常仍未解决，**总结果为 partial，命令退出 2，不是升级通过**。原始报告 `result.json`、`cold-result.json`、冷进程日志在 `.artifacts/dsh-0.1.6-upgrade/official-expert-composition/`，入口日志为 `.artifacts/dsh-0.1.6-upgrade/official-expert-composition-run.log`。回执包含发布包 SHA512、实际会话 ID、初始化顺序和无敏感数据的模型请求摘要。

另复跑旧 `scripts/probe-expert-team.mjs` 在 0.1.6 的 baseline：9 项通过、3 项旧业务条件未满足、退出 2；其中目标专家 binding 缺失导致旧 Guard 在首请求前阻止队友。证据 `.artifacts/dsh-0.1.6-upgrade/expert-original-guard-baseline.json` 与同名 log。和独立原生探针对照后，可以区分旧绑定假设与官方执行能力，不能把旧 Guard 的拒绝认定为官方不能运行不同角色。

### 实现选择与剩余验证

- 角色组合应使用 `agent.ctx.plugin()` 的 Agent 局部生命周期；实跑 `agent.ctx.loader.create()` 会碰到全局 Persona 重复注册，修正为公开局部插件挂载后重跑通过。技能查询需传实际 Agent 作为 scope，不能拿 Context 代替 ScopeKey。
- 首模型请求可能发生在 Team roster 仍显示 provisioning 的时刻；并行断言核对官方 Agent 的实时 running 状态，不能把该瞬时 roster 字段误判为未执行。产品 UI 应遵守各官方字段的语义。
- 固定资源是隔离 fixture，角色映射也是测试配置。本轮不证明用户作品发布/修订迁移、二进制资源、文件权限、完整专业验收、真实模型质量或认证 Web UI 已通过；也没有强行移除生产 Guard。
- 分叉查询在精简官方组合中可复现，完整官方 Web Profile 与其他公开查询路径仍需进一步确认；当前只能证明该调用失败，不能扩大为分叉执行或整个 Team 不支持。公开原始读取仅用于继续独立断言，不能将失败抹去。
- 计划已按证据补齐现有代码替换清单。下一步先验证作品到官方角色/技能配置的持久关联、官方工具 Guard 与专业验收，同时继续分叉查询及旧数据回归，再接入产品。

日期：2026-09-15；分支 codex/dsh-0.1.6-upgrade。底座升级后的现有功能回归，不代表官方 Team 新执行方案已经验收。

## U16-1/U16-2 官方能力复用记录

- 锁定包：@deepseek-ai/dsh、dsh-skill、dsh-skill-filesystem 0.1.6-alpha.1；Cordis 4.0.2。
- 官方依据：本地镜像 `docs/dsh-v0.1.6-alpha.2/subsystems/skills.zh.md`；已安装精确版本 dsh-skill-filesystem 的 README.md 和 dsh-skill 的公开 types。新版公开说明：path 为解析后的指令文件真实路径；resourceBase 保留发现时的路径。未修改上游。
- 原生所有者：官方 SkillRegistry/provider 继续发现和加载技能。WorkDSH 仅做受管目录内的编辑、启停、冻结版本及依赖检查。
- 实际复现：macOS 配置根 /var/folders/...，官方 path 返回 /private/var/folders/...，指向同一文件；原 fromDefinition 使用纯字符串根路径比较，将技能误判只读。123 项 integration 中 11 项失败，涉及技能详情/启停/卸载及专家冻结技能；其余 112 项通过；其中 Agent Loop 场景使用确定性模型适配器，不是付费模型。
- 已修复：从受管根解析可操作文件，保留 symlink/真实路径边界检查，再用 realpath 比较与官方胜出定义是否为同一文件；不采用模糊前缀、去掉 /private 或按同名替换来源。
- 验收：真实官方 provider 的根目录别名与同名外部技能反例，原 11 项失败及全套回归；安装/原生 Web/PPT 单独登记。

原始日志与升级前差异保存于 `.artifacts/dsh-0.1.6-upgrade/20260915-154820/`。机器汇总见该目录 summary.json。

## 本轮结果

| 验证 | 结果与边界 |
| --- | --- |
| 精确安装、版本、类型与构建 | frozen-lockfile 安装、475 项 DSH 锁定、Cordis 4.0.2、全工程 typecheck/build 通过；修复后技能包 build/typecheck 通过 |
| 集成回归 | 首轮 112/123，11 项因路径身份判断失败；修复后 124/124，新用例覆盖根目录别名和同名外部技能不被替换 |
| 活动栏 | 9/9 通过 |
| 七层官方 Web Profile | 工程外 Home 安装身份、审计、授权、技能、专家、Office、bundle，通过真实 Host 鉴权、专家 Session 固定绑定及 DOCX/PPTX/XLSX 原生 Tab 打开，共 6 项；浏览器错误 0。此轮安装发生在路径修复之前，随后技能包单独重打验证 |
| 现有专家协作 | --team 探针 10/10、14 个原生子 Session；真实文件制作/评审/交付摘要、文件漂移拒绝、取消重试、单成员输出、独立进程历史读取通过。确定性模型和现有 one-shot 适配，不能写为已切换官方 Team |
| 修复后的技能安装包 | 8 项浏览器与冷生命周期通过：独立安装、目录安装、我的技能页、编辑/冲突/启停/卸载/恢复、冷移除、重装与目录异常；未调用模型 |
| 运行依赖核对 | 从两个隔离 Profile 解析 agent/session/skill/skill-filesystem/client-connection 的 package.json，均为 0.1.6-alpha.1 |

截图保存在同一产物目录的 native-profile-native-docx.png、native-profile-native-pptx.png、native-profile-native-xlsx.png；PPT 截图已人工查看，是官方 Web 中真实组件打开测试文件，不是客户模板保真或模型制稿验收。

U16-1 的基础安装/构建/启动已通过，U16-2 的上述现有功能回归已通过。未执行真实用户数据迁移与回退、付费模型完整任务、60 分钟资源收敛、全部官方新实验能力，以及 V1—V3 官方 Team 替换。原专家协作通过不代替新 Team 接点验证，也不代替 D04/TM-01 整体验收。

## U16-F01—F12 官方新能力接入清单核对

2026-09-15 按用户要求将新能力接入列为本次升级交付，不仅修复兼容。工作项与产品验收见[升级计划](../DSH-0.1.6-UPGRADE-PLAN.md)。本节是公开声明与工程装配检查，尚非新能力运行通过。

| 核对对象 | 已核实事实 | 仍需验证 |
| --- | --- | --- |
| `dsh-web-app@0.1.6-alpha.1/cordis.patch.yml` | 声明官方 terminal controller、右栏终端、归档恢复设置、文档预览和 agent presets | WorkDSH 新旧 Profile 的有效启用状态、真实入口、操作和刷新恢复 |
| `dsh-base@0.1.6-alpha.1/cordis.patch.yml` | 声明 MCP Resources、Node PTC、workflow-ptc、image offload；Web/preset 仍会调整运行作用域 | 普通会话、专家及团队中的有效组合与实际调用，不从 base 行存在推断都已启用 |
| `dsh-mcp-resources@0.1.6-alpha.1/README.md` | 三个共享工具按调用者作用域解析服务器；没有可见服务器时工具不出现；无工具服务器也可提供资源 | 配置真实资源服务后的调用、作用域隔离、断连与生命周期；资源订阅/原生图片投影不在公开支持范围 |
| `dsh-agent-presets@0.1.6-alpha.1/README.md` | 公开 `compositionInventory()` 查询组合，读取不激活 preset | 新旧专家保存 preset 的差异及兼容修订；不能将静态 inventory 当作成功运行 |
| WorkDSH bundle 与安装脚本 | bundle patch 仅贡献自身安装探针入口；`install-preview.mjs` 仅在 Profile 缺失时从官方 web 初始化，随后安装本地插件 | 旧 Profile 与持久 preset 不保证自动获得新的可选组合，须通过官方配置/创作入口迁移并复测 |

检查使用已发布包的公开 patch、README、package.json；CLI `--help` 核实提供 `--dump-config` 和 `--dump-default-config`，本轮未启动 Profile。四个公开来源的版本/声明校验与 SHA256、两处工程装配文件摘要位于 `.artifacts/dsh-0.1.6-upgrade/official-feature-inventory.json`。该回执明确 `runtimeFeatureChecks: not_run`，不包含凭据或用户配置。

F01—F12 全部保持待产品验收；不继承前一节基础启动结果。下一步按计划完成 U16-2 剩余回归，随后先跑 F01/F05/F11 的官方继承体验，再完成其他官方组合接入。缺外部环境需继续落实验证条件，不能当作已通过或直接取消功能。
