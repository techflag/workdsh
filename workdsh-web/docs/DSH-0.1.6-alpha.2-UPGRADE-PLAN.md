# DSH 0.1.6-alpha.2 升级计划（已完成）

更新：2026-09-18。状态：已完成（P0–P5 全部收口）。本文件记录 alpha.1 → alpha.2 的官方变化核验、迁移设计、验证与回退方案；完成项以实际运行证据回填，未执行项如实保留。

## 1. 目标与范围

- 把 WorkDSH 运行基线与全局精确锁定从 `0.1.6-alpha.1` 升到 `0.1.6-alpha.2`：根 overrides/devDependencies、各插件 package.json、bundle、锁文件与脚本引用统一。
- 修复 alpha.2 破坏性变化（Client Session 多实例化）影响的 6 个插件 client 文件。
- 不改变业务功能范围；不动 contracts 领域模型；不新增业务模块；不改动已发布的既有验收结论。
- 官方文档镜像（`https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/`）仍为 alpha.1 语料；本批以 alpha.2 发布包类型与运行实测为准，镜像刷新单独记账（§7）。（2026-09-18 补记：镜像已于同日整批刷新为 alpha.2 快照（543 文件/337 md/规范对象 171）并完成全仓引用同步；`audit:harness-docs` PASS 127/171，证据 `.artifacts/dsh-0.1.6-alpha.2-upgrade/p5-doc-mirror-audit.{mjs,json}`。）

## 2. 官方 alpha.2 变化（逐包 diff 核验）

依据：官方 release notes（dsh-v0.1.6-alpha.2）、npm `0.1.6-alpha.2` 包与本地 alpha.1 逐文件对比（工作副本 `/tmp/dsh-diff`）。

### 2.1 破坏性（影响本仓库）

| # | 变化 | 官方依据（alpha.2 包内） |
| --- | --- | --- |
| B1 | `ISessions.open()` 移除；会话导航归 view owner：`ctx.uiWorkspace.openSession(target)`（`@deepseek-ai/dsh-client-ui-workspace/client`）。其内部 `replaceMain` 以 `retain(source:'mainView')` 实现选择，并自动 `selectPanel(null)`、刷新子代理目录 | api-session-controller/client 类型；client-ui-workspace `navigation.d.ts` 与 client.js `replaceMain` |
| B2 | `SessionListState.current` 移除；「当前会话」改为派生：`byId` 中 `retainedBy.mainView > 0` 的会话 | sessions `service.d.ts` `SessionSummary.retainedBy`；ui-session client.js `publishMain` 同款推导 |
| B3 | `binding()/scope()` 收紧为「借已 retain 的世代」，未 retain 返回 `undefined`；新增 `retain()/using()/retainInfo()`。`SessionReferenceSourceMap` 可声明合并扩展；`reference.ready` 为初始 open 的结算 Promise（成功给 binding、失败/释放 reject）；release 后访问 `binding` 抛错 | sessions.d.ts `ISessions`/`SessionReference`；client.js `retain/attachOpening/release/get binding` |
| B4 | 插件依赖改运行时解析、支持运行时卸载，要求插件检查加载/卸载逻辑 | release notes 原文；实际行为 P4 验证 |
| B5 | 文档预览 `DocumentContent` 新增第三变体 `{ kind:'renderer', revision, loaded, reload }`（渲染器自行加载的请求）；旧代码「非 bytes 即 text」的二分假设失效 | sidebar-documentpreview `document/contract.d.ts`；官方 OfficeBody/CodeBody 按 kind 显式收窄（CodeBody 对非 text 返回 null）。WorkDSH 影响：`office/src/csv/CsvDocument.tsx` 一处（P2 修复） |

### 2.2 兼容确认（无需改动）

- `conversation.session.header.actions` 槽、`ctx.layout.selectPanel`、`SessionStandardProps.sessionId`、`PropsRuntime`、`slots.inject/register`、`useSession/useSessions` 保留；D07 chip 不受影响。
- `sessions.create/refresh/refreshSubagents/subagentAddress` 保留；`SessionListState.byId/ids/subagentsByParent` 保留。
- `SubagentAddress = { parentSessionId, childSessionId, mode }`（dsh-subagent `control-types.d.ts`）。

### 2.3 随包能力与默认值（P4 核对）

- 随官方 web-app 新增：插件管理页、回合文件改动卡片、侧栏 Office 预览、侧栏浏览器模式、侧栏 Subagent 会话、计划预览；工作区目录分组、侧栏布局持久化等。
- 默认值：可继续对话的 Subagent 链默认 ≤8 live children、委派深度 1（可在设置调整）——需重验专家团既有配置；默认模型移除 V4 Flash / V4 Flash Vision Exp（本仓库未见引用）；Web 终端改系统用户权限；创造模式改 Plugin Manager。

## 3. 依赖面变更（P1）

### 3.1 版本 bump

- 根 `package.json`：devDependencies 与 `pnpm.overrides`（254 条）全量 → `0.1.6-alpha.2`。
- 12 个 package.json（bundle 与各插件）中的 DSH 依赖。
- `scripts/check-published-versions.mjs` expected → `0.1.6-alpha.2`；其余 7 个 scripts/tests 引用同步。
- 锁文件与 `.test-runtime/preview` 由 `pnpm install`/`preview:install` 重建。

### 3.2 新增包（必须补进 overrides；install 后以 `check:versions` 兜底）

`dsh-plugin-manager`、`dsh-hmr`、`dsh-experimental-agent-team-profile`、`dsh-experimental-agent-team-web-profile`、`dsh-workspace-changes`、`dsh-client-ui-plugin-manager`、`dsh-client-ui-sidebar-browser`、`dsh-office-to-pdf`，以及 install 暴露的其余新包。`@deepseek-ai/cordis-plugin-hmr` 从 dsh 依赖中移除（由 dsh-hmr 替代）。

## 4. Client 迁移设计（P2，6 文件）

### 4.1 通用替换

- **打开会话**：`sessions.open(id)` → `ctx.uiWorkspace.openSession(id)`；客户端 `inject` 数组加 `'uiWorkspace'`；package.json 增 `@deepseek-ai/dsh-client-ui-workspace`（devDependencies + peerDependencies + `dsh.client.inject`）。保留既有 try/catch 重试包装（`retain` 对未知 id 仍会抛错）。
- **当前会话**：`state.current` → 局部推导 `Object.values(state.byId).find(row => (row.retainedBy.mainView ?? 0) > 0)?.id`；程序需引入 `@deepseek-ai/dsh-client-ui-session/client` 类型以取得 `mainView` 声明合并（缺依赖的包补 dev/peer）。
- **成员/子代理根会话**：`sessions.binding(id)?.session...parentSessionId` → `sessions.subagentAddress(id)?.parentSessionId`（不依赖 retain）。
- **需保留的会话**：`sessions.retain(id, { source })`（在 `SessionReferenceSourceMap` 声明合并本插件 source 键）+ `await reference.ready` + `finally reference.release()`。

### 4.2 逐文件

| 文件 | 迁移点 | 设计 |
| --- | --- | --- |
| `projects/src/client.tsx` | L33-34 `current`；L46 `scope`；L62 `open` | current→推导；`startTask` 改 retain(`workdshProjectTaskStart`)→`await ready`（失败转「项目会话尚未就绪，请重试。」）→轮询 `reference.binding.ctx.get('conversation')`→send→`finally release`；openTask→`uiWorkspace.openSession` + 原重试 |
| `experts/src/client.tsx` | L55 `binding`；L76-80 `current`；L87/96/129 `open` | L55→`subagentAddress(...)?.parentSessionId ?? sessionId`；resolveWorkspace→推导；3 处 open→`uiWorkspace.openSession` |
| `skills/src/client.tsx` | L45-49/78-80 `current`；L55/85 `open`；L62 `scope` | current→推导；open→`uiWorkspace.openSession`；L62 轮询保留（openSession 已触发 mainView retain） |
| `library/src/client.tsx` | L43/139 `binding`；L56-60 `current`；L63 `open`；L126 `current` | binding 处均属当前会话（已 retain）保留；current→推导；open→`uiWorkspace.openSession` |
| `office/src/client.tsx` | L138/171/179 `current` | 模块级推导函数（入参 sessions）；轮询比较改 `currentSessionId() !== sessionId` |
| `activity/src/client.tsx` | L43 `binding`（当前会话，保留）；L100-104 `scope+binding` 成员会话 | 成员观测改 `sessions.retain(id,{source:'workdshActivityMember'})`（逐个 try/catch 容忍未知 id）；订阅/判相改走 `reference.binding`（访问 try/catch）；`ready.then` 后订阅并 refresh；cleanup 释放全部 reference |

## 5. 验证（P3）

- `pnpm build`、全仓 `typecheck`、integration/活动测试、`check:plan`、`check:versions`。
- 停 18989 → `preview:install`（按 overrides 装 alpha.2，含 dsh-scope 单实例与产物一致性断言）→ `preview` 启动。
- 探针回归：D07 chip 正反例与归因探针、library、office、team、presets、connectors；pageerror/console error 0。
- 专项探针：`startTask` retain 语义（创建→发送→释放→重开任务历史完整、消息在会话内）；openSession 失败重试路径。

## 6. 新能力与默认值（P4）

- 官方新增页面（插件管理、文件改动卡片、Office/浏览器/Subagent 侧栏、计划预览）：确认 preview 可用、与 WorkDSH Slot/面板无冲突；冲突只记录，不改官方 owner。
- 专家团：核对 8 子代理/深度 1 默认与既有 16 配置的关系（设置入口），复跑团队探针。
- 运行时卸载：用官方插件管理禁用/启用本仓库插件，验证 `ctx.effect/ctx.on` 可撤销、无重复监听。

## 7. 收口（P5）

- 升级证据：`docs/evidence/dsh-0.1.6-alpha.2-upgrade.md`（命令、结果、未覆盖项）。
- `docs/STATUS.md` 顶部条目；升级验收后更新 `AGENTS.md` 基线版本表述。
- 受影响模块版本 bump（按 MODULE-VERSIONS）；`node scripts/check-plan.mjs`。
- 文档镜像 delta 记账：alpha.1 语料 vs alpha.2 运行面已核验差异，或列出镜像刷新计划。

## 8. 回退方案

- 版本面：变更前快照在 `.artifacts/dsh-0.1.6-alpha.2-upgrade/backup/`（23 文件含根 package.json、12 个包、8 个脚本/测试、pnpm-lock、preview profile manifest）。
- 运行面：恢复备份文件 → `pnpm install` → `preview:install` 回 alpha.1；用户数据（sessions/library/projects storage）保留。
- 代码面：迁移改动集中在 6 个 client 文件 + 依赖清单，回退边界清晰。

## 9. 风险

| 风险 | 缓解 |
| --- | --- |
| `binding/scope` 收紧导致运行期 undefined | 逐处设计（§4.2）+ P3 探针验证；activity 显式 retain |
| `startTask` 发送依赖 retain 语义 | retain→ready→send→release；P3 专项探针 |
| 新增包遗漏 override | `check:versions` 对锁文件断言 + install 输出核对 |
| 官方新能力与 WorkDSH 页面冲突 | P4 逐项核对；只记录不改官方 owner |
| alpha 期 API 再变 | 本批只做 alpha.2；后续单独升级，不混搭 |

## 10. 执行记录

- [x] P0 备份 + 本计划落盘（2026-09-18）
- [x] P1 依赖面 bump + install + check:versions（2026-09-18）：480 处替换（root 273 + 12 包 198 + scripts/tests 9）；新 override 9 条（预判 8 + install 暴露 `@deepseek-ai/dsh-lazy-require`）；`check:versions` PASS（513 条 lock 条目 α2、Cordis 4.0.2）；`check:plan` PASS。pnpm 警告 `dsh-subprocess-local` postinstall 被忽略：经核 node-pty spawn-helper 权限 755 正常，与 α1 同行为，无影响。
- [x] P2 6 文件迁移 + 全仓 typecheck（2026-09-18）：
  - 6 个 client 文件全部迁移完成：office（current 推导 ×3）、activity（成员观测 retain/ready/release 重写 + `workdshActivityMember` source）、skills（current 推导 + 2 处 openSession）、library（current 推导 + openSession + 保留 mainView 下 binding 借用）、experts（subagentAddress + 3 处 openSession）、projects（startTask retain(`workdshProjectTaskStart`)→ready→轮询 binding.ctx→send→finally release；openTask openSession + 重试）。
  - package.json：按各包既有模式补依赖——skills/experts 加 ui-session+ui-workspace 到 dev+inject；projects/library 加 peer+dev+inject；activity/office 的 ui-session 为既有依赖仅 bump（office 不调用 openSession，不新增 ui-workspace）。library 顺带修正 `sidebar-right` 0.1.5-rc.1→alpha.2 版本混搭。
  - 发现并修复 B5：`CsvDocument.tsx` 显式收窄三种 content 变体，`'renderer'`（渲染器自加载请求，CSV 无 loader）返回 null（官方 CodeBody 同款语义）。
  - `pnpm install` 增量链接（projects/experts 新依赖入 lock importer）；全仓 `pnpm typecheck` PASS（13 包含 bundle/workbench/ui）。
- [x] P3 build + preview 重装 + 探针回归（2026-09-18 完成）
  - [x] P3-a build / P3-b preview:install（clean env）与 run3→run4 启动 PASS；数据完好（292 会话文件、项目 8 资产）。
  - [x] P3-c-1 chip 正/反例 PASS；attribution PASS：根因=探针历史状态——同名交付已累积 `(2)~(5).md`，占满 `NAME_ATTEMPTS=5` 重试槽位后放弃（`library/name-conflict`），非 alpha.2 回归。新文件名重跑全链 identity→taskContext→read→import→addAsset 通过，library `source=task`、`sourceTaskId` 正确（failures: []）。探针已改动态文件名防复发。
  - [x] P3-c-2 探针全过：connectors（工具/资源/禁用还原/多实例/会话选择隔离）、library（打包安装/两次冷启动/卸载保留/重装恢复）、presets（原生 picker/非blank 拒绝/双会话独立/重启重建/文件变更解析）、office（docx+xlsx 预览/编辑/导出/零外部请求）、team web 14 项（含修复探针 client 的 `sessions.open`→`uiWorkspace.openSession`，B1 影响探针工具链）。
  - [x] P3-d startTask/openSession 专项 PASS：project-task-verify（打开任务→官方会话视图、返回恢复、composer 创建→原生 shell、消息在会话内）+ 重开历史完整。2026-09-18 复核修正：原重开探针 v1 存在假阳性——`hasText: 只回复` 的 `.first()` 匹配到 09-17 早期**空会话任务**（消息未送达时代的残留，会话文件解压仅 211B session 头、零消息），打开空会话显示 New Session hero（官方正常语义），而弱断言（`workdsh-view=conversation` 是主页默认参数、`body.includes('ok')` 命中侧栏文本）仍判 PASS。
  - [x] P3-d 复核 v2（强断言）PASS：精确点击最新 `只回复：ok` 任务（session-6f077069）+ 会话内断言（消息区「只回复：ok」、助手回合 `Ran for`、`.wd-activity` strip=1、composer、非空态、project 参数）；warm / warm2（同 context 重开）/ cold（全新 context 冷启动）三次全过 failures:[]，0 pageerror。逐行对照：task_5/13/36 与 sidebar 行打开均显示完整历史；task_1/2/4 为空会话（打开即 New Session，符合语义）。证据：p4/p3-reopen-v2.log、p3-reopen-dump*.log、p3-tasks-map.log、53-sessions-expanded.png、project-task/08-reopen-warm.png。
  - [x] 诊断副产物：cordis logger 的 warn 在 preview stdout 不可见（exporter 仅内存）；TEMP DEBUG 已移除并重建部署（run5 clean 启动，无 debug 输出）。
- [x] P4 新能力与默认值核对
  - [x] P4-3 运行时卸载（2026-09-18）：官方插件管理页的包级开关=修改 `dsh.profile.bundles`（写 package.json、保留 dependencies 安装；`cordis.patch.yml` 本场景未触发）。运行层变更**需要重启 server**：不重启时 bundle 清单 rev 不变、strip/style 仍在、UI 静默无提示（hmr 存在时官方 `change()` 返回 applied）。禁用+重启后完全卸载（strip=0、style=0、bundle 清单移除、零错误）；启用+重启后恰好一次恢复（strip=1/style=1），无重复监听。结论：ctx.effect/ctx.provide/slot 贡献可完整撤销。证据：`.artifacts/dsh-0.1.6-alpha.2-upgrade/p4/`（p4-runtime-unload-2、p4-toggle-isolate、p4-unload-mechanism、p4-disable-notice、p4-restart-check-disabled、p4-reenable-precheck、p4-restart-check-reenabled 日志与截图 10~40）。UI 静默记为官方行为/UX 缺口，不改官方代码。
  - [x] P4-1 新页面核对（2026-09-18）：
    - 官方新增页面均实弹核对通过：右栏 Start 启动页官方卡片（Workspace files / New terminal / Browser）与 WorkDSH「文档」卡片共存；Browser 页签可用（发送真实回合不影响）；回合文件改动卡片实弹（写文件回合尾渲染 `Edited 1 files | +1 -0 | alpha2-card-check.txt`）→ 点击卡片右栏自动打开官方 `Review · turn 2` diff 页签（diff 正确、0 页面错误）；子代理 lineage 实弹（会话头「N subagents ⌄」下拉 + Agent Team chip + 切换后只读标记）；插件管理页由 P4-3 覆盖。主视图 [Chat, Trajectory] 与右栏 [Start→Browser→Review] 页签体系相互独立、无冲突；不改官方 owner。证据：p4/p4-right-sidebar.log、p4-changes-card.log、p4-changes-review.log、p4-subagent-sidebar.log 与截图 62/64/65/67/68/69。
    - 未触发项记录：计划预览（dsh-client-ui-plan）注册面已核对（turnTail / plan-review.actions / sidebar.right.pane.tab / input.plan），preview 数据中无计划模式的会话，标记「未触发」；侧栏布局持久化属官方行为，未专项验证。
    - preset 挂载失败定性（子代理会话调查带出）：`wd-exp-expert-5c50f4ecf5c3-f500ea190ee7` 等 9 个 preset 含 `workflow-worker-thread` 行（Sep 12-13 编译，0.1.5 时代产物），alpha.2 无法解析 `@deepseek-ai/dsh-workflow-worker-thread`（npm 最高 0.1.5-rc.2；alpha.1/alpha.2 官方 dsh 均只依赖 workflow-ptc；alpha.2 官方 standard 与全部 7 个新 preset 均为 ptc 行）→ 属 0.1.5→alpha.1 迁移遗留的过期 preset，**非 alpha.2 回归**。实弹对照：活跃专家会话（session-e1a751973，ptc preset 40bb2c686ee4）打开无横幅、4 subagents lineage 正常、0 页面错误；worker-thread 旧会话（session-38af3e）错误横幅精确复现（探针有效性对照），WorkDSH 侧优雅降级仅提示、历史内容可读，符合「旧数据保留只读」决策。证据：p4/p4-ptc-preset-verify.log、截图 71（正常）/72（对照）。
    - 观察项（不阻塞升级）：根 package.json overrides 中 `dsh-code-runtime-worker-thread`、`dsh-workflow-worker-thread` 两条为 0.1.5 时代陈留、alpha.1 起无引用者（lock 仅 overrides 段列出、无解析条目），无害保留；若清理需单独记录。
  - [x] P4-2 子代理默认值与团队探针（2026-09-18）：
    - 默认值实现定位：`dsh-subagent` 的 `SubagentRuntime.Config`（alpha.2）为 `maxDepth: default(1)`、`maxActiveSubagents: default(8)`，经官方 settings section `'subagent'` 安装（`settingsSource` 可用户调整）。`maxActiveSubagents` 语义＝同一 root 链路「同时活跃的可继续对话子代理」上限（per-root `ActivationPool.reserve`），超限 materialize 抛 `ACTIVATION_LIMIT_REACHED`（提示等待现有子代理结束或在当前代理完成工作）。
    - WorkDSH 核对：全仓无引用/覆盖两项配置（`portability.ts` 的 MAX_DEPTH=8 为专家包 zip 目录层级、与本项无关；preset-compiler 只重写 persona/skill-filesystem 行，其余行随官方 standard 继承默认值）；preview `settings.yaml` 无 `subagent` 段 → 使用官方默认 8/1，非既有自定义被覆盖。
    - 「16 配置」核对：WorkDSH 专家团 2-16 位成员（`definition.ts` team/members 校验）与官方 Team `DEFAULT_MAX_MEMBERS=16`（`dsh-experimental-agent-team` roster 容量）数值一致、不冲突；层次差异记录：16＝名册静态容量， 8＝同时活跃上限，9-16 成员若被要求同时活跃运行会触及官方默认 8（当前 preview 实战 2-4 subagents 未触及；如未来需要可在官方设置调大，不改官方代码）。深度 1 核对：成员（depth 1）不可再派生（maxDepth=1 拒绝），与「成员不做二级委派、Lead 协调」语义兼容。
    - 团队探针复跑全 PASS（15 项 checks、4 场景全 completed、0 browser errors）：p4/p4-probe-team-web.log、`.artifacts/dsh-0.1.6-upgrade/native-team-web/result.json`。未触发：`ACTIVATION_LIMIT_REACHED` 边界（探针/真实会话均 ≤8 同时活跃）。
- [x] P4 完成（P4-1 / P4-2 / P4-3 全过，2026-09-18）
- [x] P5 证据与文档收口（2026-09-18）：
  - [x] P5-a 升级证据文档：`docs/evidence/dsh-0.1.6-alpha.2-upgrade.md`——依赖面/编译面/运行面/新能力引用、未覆盖项表、文档镜像 delta 记账、回退方案；命令、结果与边界齐备。
  - [x] P5-b STATUS + AGENTS.md：`docs/STATUS.md` 顶部 2026-09-18 升级条目（含未执行/边界）；`AGENTS.md` 基线更新为 `@deepseek-ai/dsh@0.1.6-alpha.2`（L8 基线条款 + L37 官方 Team 决定处版本引用）；README 面向已发布制品的 alpha.1 表述保持不变（属已发布验证批次，随下次发布更新）。
  - [x] P5-c 模块版本与检查：7 包 bump（bundle α.46、projects α.2、experts α.5、skills α.30、library α.2、office α.7、activity α.4）+ 7 个 CHANGELOG 适配条目 + MODULE-VERSIONS 当前版本表；`node scripts/check-plan.mjs` PASS（29 模块/50 文档）；镜像 delta 记账见证据文档「文档镜像 delta 记账」节（刷新为单独批次，未执行）。
- [x] P5 完成（2026-09-18）
- [x] V 五项未覆盖项复核实测（2026-09-18 后补，`codex/dsh-0.1.6-upgrade`）：
  - [x] V1 计划预览实测 PASS：官方 preview 实弹 `/plan`（slash 菜单）→ chip「Plan mode on — click to turn off (/plan off)」→ 模型调 `exit_plan_mode` → 评审面板（View full plan / Request changes / Approve）→ 点 Approve 后 chip 消失 → 右栏自动打开 plan tab（`dsh.sidebar-right.v1.<sessionId>`：`kind:"plan"`、contentId `dsh-resource://plan/<sessionId>/<callId>`、`expanded:true`）→ 刷新后计划卡片从会话历史恢复（0→1）→ 点卡片重开既有 tab。全程 0 pageerror。会话 `session-188b39e0-5c4c-4667-95e0-5f660cabba44`。证据：`p5-plan-sidebar-verify.mjs`、`p5-plan-sidebar-verify.json`、`p5/v1-01..v1-15.png`。
  - [x] V2 侧栏布局持久化专项 PASS：折叠（`expanded:false`+「Open right sidebar」）→ 刷新保持折叠；重开 → 刷新保持展开；**server 重启后**（新 token）加载旧 localStorage 重开会话 → 布局与 plan tab 保持、计划卡片恢复、0 pageerror。该行为相对 alpha.1 为官方变更（镜像 `sidebar-right.zh.md` L11 仍写「刷新页面后每个会话回到折叠的默认态」）。证据：`p5-plan-sidebar-verify.json`（sidebar 节）、`p5-restart-recovery-verify.mjs`、`p5-restart-recovery-verify.json`、`p5/v1-16..v1-18.png`。
  - [x] V3 ACTIVATION_LIMIT_REACHED 边界 PASS（隔离探针，无付费模型）：disposable home + 官方 CLI 离线装入 fixture → 确定性本地 LLM adapter → 8 个 continuable child 各自保持活跃回合（第 9 次 admitted 前 `stillLiveAtRefusal=8`）→ 第 9 次 `startContinuable` 同步抛 `ACTIVATION_LIMIT_REACHED`（message 含 "active child limit: 8"）→ `drainContinuableChildren` 释放 1 个 → 重试 admitted 并再次进入活跃回合。与 alpha.2 包 README（`dsh-subagent` L51-55：默认 8、reserve-before-reconstruct、cleanup 释放槽位、槽位继承规则）逐条吻合。副产物：child 继承 parent 模型配置在 `parent.session.requestHeader()` 就绪前回退 `parent.options`（官方行为，探针以显式 `agentOptions` 定桩）。证据：`scripts/probe-subagent-activation-limit.mjs`、`tests/fixtures/subagent-activation-limit/index.mjs`、`p5-activation-limit.log`、`p5-activation-limit/report.json`。
  - [x] V4 worker-thread 旧 preset 复核完成（不修复决定成立）：编译器 `preset-compiler.ts` 只做 `agentPresets.copy(base)` + 改写 persona/skill-filesystem 两行，不生成 workflow 行；`resolveBasePreset` 硬性 resolve 官方 `standard`（含 `workflow-ptc` 行），失败即抛 `experts/preset-broken`、不会静默切换 → 新发布必产 ptc preset。现状：磁盘 16 preset（12 被当前修订引用、4 孤儿=被替代的 worker-thread 旧修订、0 brokenRef）；5 个专家当前修订仍引用 worker-thread preset（需在 Experts 页重新发布才转 ptc，维持只读不批量修复）；delegation binding 引用孤儿属历史只读；session binding 已引用新 ptc。证据：`p5-preset-orphan-audit.mjs`、`p5-preset-orphan-audit.json`。
  - [x] V5 文档镜像定界完成：镜像 375 文件/249 md 全部 2026-09-10 时点（alpha.1 批次、无生成脚本）。抽检：`subagent*.md` 无 `maxActiveSubagents`/`ACTIVATION_LIMIT_REACHED`；`plugin-manager`/`sidebar-browser`/`workspace-changes` 关键词全镜像 0 命中（alpha.2 新增包零覆盖）；`sidebar-right.zh.md` L11 的「刷新后回到折叠默认态」已被 alpha.2 布局持久化推翻；`plan.zh.md` 仅 host 语义、缺 client-ui-plan 评审 UI。结论：存量语义页仍可参考，alpha.2 新面以发布包 README/types + 实测为准；刷新为独立批次（与本升级不合批），维持既定决策。（2026-09-18 补记：独立刷新批次已执行——整批替换为 alpha.2 快照，引用同步 + d07 行号重锚 + `audit:harness-docs` PASS 127/171；证据 `.artifacts/dsh-0.1.6-alpha.2-upgrade/p5-doc-mirror-audit.{mjs,json}`。）
- [x] V 复核完成（V1–V5 全过，2026-09-18）
