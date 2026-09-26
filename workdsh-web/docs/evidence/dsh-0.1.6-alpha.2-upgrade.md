# DSH 0.1.6-alpha.2 升级证据（alpha.1 → alpha.2）

2026-09-18 执行，分支 `codex/dsh-0.1.6-upgrade`。设计与逐项依据见 [DSH-0.1.6-alpha.2-UPGRADE-PLAN.md](../DSH-0.1.6-alpha.2-UPGRADE-PLAN.md)；本文件记录实际命令、结果与未覆盖边界，不重复设计理由。事实依据为官方 release notes `dsh-v0.1.6-alpha.2` 与 npm `0.1.6-alpha.2` 发布包对本仓 alpha.1 的逐文件对比。

破坏性变化摘要（迁移设计依据，详见计划 §2）：B1 `ISessions.open()` 移除、会话导航归 `ctx.uiWorkspace.openSession()`；B2 `SessionListState.current` 移除、当前会话改由 `retainedBy.mainView` 推导；B3 `binding()/scope()` 收紧为「借已 retain 的世代」；B4 插件依赖运行时解析、支持运行时卸载；B5 文档预览 `DocumentContent` 新增第三变体 `renderer`。

## 依赖面（P1）

命令：P0 快照 23 个文件到 `.artifacts/dsh-0.1.6-alpha.2-upgrade/backup/`（根/13 包 package.json、8 个脚本与测试、pnpm-lock、preview profile manifest）→ 脚本 `.artifacts/dsh-0.1.6-alpha.2-upgrade/p1-bump.mjs` 全量替换 → `corepack pnpm install` → `check:versions`。

- 替换 480 处：根 package.json 273（devDependencies + 254 条 overrides）、12 个功能包 198、scripts/tests 9；`scripts/check-published-versions.mjs` expected 同步 `0.1.6-alpha.2`。
- 新增 override 9 条：预判 8 条（dsh-plugin-manager、dsh-hmr、dsh-experimental-agent-team-profile、dsh-experimental-agent-team-web-profile、dsh-workspace-changes、dsh-client-ui-plugin-manager、dsh-client-ui-sidebar-browser、dsh-office-to-pdf）+ install 暴露的 `@deepseek-ai/dsh-lazy-require`。`@deepseek-ai/cordis-plugin-hmr` 随 alpha.2 从 dsh 依赖移除（由 dsh-hmr 替代），不在锁文件条目内。
- 结果：`check:versions` PASS（513 条锁文件 DSH 条目全部 α2、Cordis 4.0.2）；`check:plan` PASS。
- 边界：pnpm 警告 `dsh-subprocess-local` postinstall 被忽略；经核 node-pty spawn-helper 权限 755 正常、与 α1 同行为，无影响。

## 编译面（P2）

命令：`corepack pnpm typecheck`（13 包）。

- 6 个 client 文件全部迁移：`projects/src/client.tsx`（startTask 改 `retain('workdshProjectTaskStart')`→`await ready`→轮询 `reference.binding.ctx`→send→`finally release`；openTask 改 `uiWorkspace.openSession` + 原重试）、`experts/src/client.tsx`（成员判定改 `subagentAddress(...)?.parentSessionId`；3 处打开改 `uiWorkspace.openSession`）、`skills/src/client.tsx`（current 推导 + 2 处 openSession）、`library/src/client.tsx`（current 推导 + openSession；当前会话处的 `binding` 借用保留）、`office/src/client.tsx`（current 模块级推导函数 ×3）、`activity/src/client.tsx`（成员观测重写为 `retain('workdshActivityMember')`→`ready`→订阅/refresh→cleanup 全部 `release`）。
- package.json 配套：skills/experts 加 `dsh-client-ui-session`+`dsh-client-ui-workspace`（dev+inject）；projects/library 加 peer+dev+inject；activity/office 的 ui-session 为既有依赖仅 bump；library 顺带修正 `sidebar-right` 0.1.5-rc.1→alpha.2 版本混搭。
- B5 修复：`office/src/csv/CsvDocument.tsx` 显式收窄三种 content 变体，`'renderer'` 变体返回 null（官方 CodeBody 同款语义）。
- 结果：全仓 `pnpm typecheck` 退出 0（13 包含 bundle/workbench/ui）。

## 运行面（P3）

命令：`corepack pnpm build` → 停 18989 → `corepack pnpm preview:install`（clean env）→ `corepack pnpm preview` → 各探针脚本。

- 构建与装入：`p3-build.log`、`p3-preview-install*.log`、`p3-preview-run*.log` PASS；store 不匹配修复后 clean env 重装通过（2026-09-18）；启动后数据完好（292 会话文件、项目 8 资产）。
- 探针回归全 PASS：D07 chip 正/反例、attribution（`p3-probe-attribution-alpha2.log`）、connectors（工具/资源/禁用还原/多实例/会话选择隔离）、library（打包安装/两次冷启动/卸载保留/重装恢复）、presets（原生 picker/非 blank 拒绝/双会话独立/重启重建）、office（docx+xlsx 预览/编辑/导出/零外部请求）、team web 14 项。B1 影响探针工具链：`probe-native-team-web.mjs` 的 `sessions.open`→`uiWorkspace.openSession` 已同步。
- `startTask` 专项：project-task-verify（打开任务→官方会话视图、返回恢复、composer 创建→原生 shell、消息在会话内）+ 重开历史完整。
- 重开复核 v2（强断言）：修正 v1 假阳性（旧探针匹配到 09-17 早期间歇任务）后，精确点击最新任务 + 会话内断言（消息文本、助手回合、`.wd-activity` strip、composer、非空态、project 参数），warm/warm2/cold 三次全过 `failures:[]`、0 pageerror。
- attribution 唯一一轮失败定性：根因是探针历史状态——同名交付累积 `(2)~(5).md` 占满 `NAME_ATTEMPTS=5` 重试槽位，非 alpha.2 回归；新文件名重跑全链通过（`source=task`、`sourceTaskId` 正确），探针已改动态文件名防复发。
- 边界：cordis logger 的 warn 在 preview stdout 不可见（exporter 仅内存）；临时 debug 已移除并重建部署。

## 新能力与默认值（P4）

- P4-3 运行时卸载：官方插件管理页的包级开关=写 `dsh.profile.bundles`；运行层变更需重启 server（不重启时 UI 静默无提示，hmr 存在时官方 `change()` 返回 applied）。禁用+重启后完全卸载（strip=0/style=0/bundle 清单移除/零错误），启用+重启后恰好一次恢复（strip=1/style=1），无重复监听 → `ctx.effect/provide/slot` 贡献可完整撤销。UI 静默记为官方行为/UX 缺口，不改官方代码。
- P4-1 新页面核对：右栏 Start 官方卡片（Workspace files/New terminal/Browser）与 WorkDSH「文档」卡片共存；Browser 页签可用；回合文件改动卡片实弹渲染并点击打开官方 `Review · turn 2` diff 页签；子代理 lineage 下拉 + Agent Team chip 正常；主视图 [Chat, Trajectory] 与右栏页签体系独立无冲突。
- preset 挂载失败定性：9 个含 `workflow-worker-thread` 行的旧 preset（Sep 12-13 编译、0.1.5 时代产物）在 alpha.2 无法解析该包（npm 最高 0.1.5-rc.2）→ 属过期 preset 遗留，**非 alpha.2 回归**。实弹对照：活跃专家会话（ptc preset）无横幅、4 subagents lineage 正常；worker-thread 旧会话错误横幅精确复现（探针有效性对照），WorkDSH 侧优雅降级、历史可读，符合「旧数据保留只读」决策。
- P4-2 默认值：官方 `dsh-subagent` 的 `maxDepth=1`、`maxActiveSubagents=8`（settings section `'subagent'`）；本仓无引用/覆盖，preview `settings.yaml` 无 `subagent` 段 → 使用官方默认。专家团 2-16 成员校验与官方 Team `DEFAULT_MAX_MEMBERS=16` 数值一致：16＝名册静态容量，8＝同一 root 链路的「同时活跃」上限，层次不同不冲突；深度 1 与「成员不做二级委派」语义兼容。
- 团队探针复跑 15 项 checks、4 场景全 completed、0 browser errors。

## 版本与收口（P5）

- 受影响模块 bump（按 P2 实际改代码的模块 + bundle，与 alpha.1 先例一致）：projects `0.1.0-alpha.2`、experts `0.1.0-alpha.5`、skills `0.1.0-alpha.30`、library `0.1.0-alpha.2`、office `0.1.0-alpha.7`、activity `0.1.0-alpha.4`、bundle `0.1.0-alpha.46`、contracts `0.1.0-alpha.9`（补记 2026-09-17 项目任务上下文只读契约 `ProjectTaskContext`/`taskContext`，diff 随本批一并携带）；8 个 CHANGELOG 添加条目；`docs/MODULE-VERSIONS.md` 当前版本表同步。
- 纯依赖 bump 的模块（access、audit、connectors、workbench、identity-local、ui）不 bump：无行为变化，避免锁步。
- 收口检查：`node scripts/check-plan.mjs` PASS；`docs/STATUS.md` 顶部升级条目；`AGENTS.md` 基线更新为 `0.1.6-alpha.2`（L8 基线条款 + L37 官方 Team 决定处版本引用）。
- README.md / README.zh-CN.md 中面向已发布制品的 `0.1.6-alpha.1` 表述（L32 已用 Web Profile、L94 预览验证环境、L166 CLI 版本、L344 发行记录）保持不变：它们描述的是已发布 alpha.1 验证批次（已发布模块按 alpha.1 客户端面构建），待下次发布随发布批次更新，不在本批改写。同类保留的引用（经全仓扫描判定）：PLAN.md 2026-09-15 条目、docs/design/experts/README.md 决定段、ADR-0033、RELEASES.md 与 docs/releases/ 已发布记录、STATUS 历史条目——均为历史记录或已发布事实，非当前基线表述；operative 基线表述只在 AGENTS.md（已更新），scripts/tests/packages 源码面已零残留。

## 未覆盖项与边界

| 项 | 状态与说明 |
| --- | --- |
| 计划预览（dsh-client-ui-plan） | **V1 实测 PASS**（2026-09-18 后补）：`/plan` → chip → `exit_plan_mode` → 评审面板（Approve/Request changes）→ 批准后 chip 消失 → 右栏自动打开 plan tab → 刷新后计划卡片从历史恢复 → 点卡片重开既有 tab；0 pageerror。证据：`p5-plan-sidebar-verify.{mjs,json}`、`p5/v1-*.png` |
| 侧栏布局持久化 | **V2 专项 PASS**：折叠/展开状态逐同刷新保持（localStorage `dsh.sidebar-right.v1.<sessionId>`）；**server 重启后**加载旧状态重开会话，布局/plan tab/卡片全恢复；0 pageerror。证据：`p5-plan-sidebar-verify.json`、`p5-restart-recovery-verify.{mjs,json}` |
| `ACTIVATION_LIMIT_REACHED` | **V3 隔离探针 PASS**：8 个 continuable child 保持活跃回合 → 第 9 次同步抛 `ACTIVATION_LIMIT_REACHED`（"active child limit: 8"）→ `drainContinuableChildren` 释放 1 槽 → 重试 admitted。与包 README 逐条吻合。证据：`p5-activation-limit.log`、`p5-activation-limit/report.json` |
| worker-thread 旧 preset | **V4 复核完成，保留只读不迁移决定成立**：编译器不生成 workflow 行 + `resolveBasePreset` 硬性 standard（失败即 `experts/preset-broken`）→ 新发布必产 ptc；磁盘 16 preset 中 4 孤儿/0 brokenRef；5 个专家当前修订仍引用 worker-thread（重新发布即转 ptc，属后续独立任务）。证据：`p5-preset-orphan-audit.{mjs,json}` |
| 悬空 override | 根 overrides `dsh-code-runtime-worker-thread`、`dsh-workflow-worker-thread` 为 0.1.5 时代陈留、无引用者，无害保留；若清理单独记录 |
| 付费模型全量验收 | 探针混合使用真实模型与确定性断言；未逐一覆盖全部业务场景 |
| 文档镜像 | **V5 定界完成**：镜像 375 文件/249 md 全部 2026-09-10 时点（alpha.1 批次）；抽检确认 stale 边界（见下节 delta 记账）；刷新维持独立批次（2026-09-18 补记：已执行，见下节「刷新执行」） |

## 文档镜像 delta 记账

本批以 alpha.2 发布包类型与运行实测为准，镜像未刷新（未执行）。（2026-09-18 补记：镜像已整批刷新为 alpha.2 快照，见本节「刷新执行」。）V5 定界核验（2026-09-18 后补）：镜像 375 文件（249 md + i18n yaml + 6 子目录）全部 2026-09-10 时点，为 alpha.1 批次快照（无生成脚本）。抽检对照确认三类 stale：① `subagent*.md` 无 `maxActiveSubagents`/`ACTIVATION_LIMIT_REACHED` 描述（alpha.2 `dsh-subagent` 包 README L51-55 有完整语义）；② alpha.2 新增包关键词 `plugin-manager`/`sidebar-browser`/`workspace-changes` 全镜像 0 命中；③ `sidebar-right.zh.md` L11「刷新页面后每个会话回到折叠的默认态」已被 alpha.2 布局持久化（V2 实测）推翻；`plan.zh.md` 仅覆盖 host 语义、缺 client-ui-plan 评审 UI 行为。存量基础语义页（plan host 状态/恢复、subagent 深度与枚举、sidebar-right 架构与槽位）仍与 alpha.2 结构一致，可继续参考。已核验差异清单（对应计划 §2，镜像刷新时逐条同步）：

- 破坏性：B1—B5（见文首摘要）。
- 新增官方包 9 个（dsh-plugin-manager、dsh-hmr、两个 agent-team profile、dsh-workspace-changes、dsh-client-ui-plugin-manager、dsh-client-ui-sidebar-browser、dsh-office-to-pdf、dsh-lazy-require）；`@deepseek-ai/cordis-plugin-hmr` 移除。
- 随包能力：插件管理页、回合文件改动卡片、侧栏 Office 预览/浏览器模式/Subagent 会话、计划预览、工作区目录分组、侧栏布局持久化。
- 默认值：子代理 `maxDepth=1`/`maxActiveSubagents=8`；默认模型移除 V4 Flash/V4 Flash Vision Exp（本仓无引用）；Web 终端改系统用户权限；创造模式改 Plugin Manager。
- 镜像刷新为单独批次任务，不与本升级混做；刷新时以 alpha.2 对应官方 docs 快照整批替换（无逐文件补丁机制）。

### 刷新执行（2026-09-18 补记，独立批次）

- 整批替换：`docs/deepseek-harness-docs/`（375 文件 alpha.1 快照，2026-09-10 时点）→ `https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/`（543 文件 / 337 md / 171 规范对象；新增 persistence-changes、postmortem、i18n 等章节；`subsystems/code-runtime.*` 更名重写为 `subsystems/ptc-runtime.*`，`ctx.codeRuntime`→`ctx.ptcRuntime`）。
- 引用同步：全仓 44 文件 117 处旧路径 token 更新；`subsystems/code-runtime`→`subsystems/ptc-runtime`（含 3 个文档的链接标签与 prose 修订）；`.idea` IDE 状态与 `.artifacts` 历史证据不改写。
- 行号重锚（新语料）：d07 证据 5 处引用——slots.md:147→:150、persistence-catalog.md:403-407→:473-477、tool-catalog.md:222-228→:624-630、:22→:25（slots.md:25-41 不变）。
- 审计：专项 `p5-doc-mirror-audit` 15/15 PASS——替换完整（543 文件/337 md）、旧路径与 `subsystems/code-runtime` token 全仓扫描归零（允许残留=升级证据/STATUS/依赖清单等更名历史文件，`code-runtime` 包名限定 package.json/pnpm-lock 等 8 处）、台账 127⊆171 且 44 pending；实跑 `audit:harness-docs` PASS（127/171）；产物 `.artifacts/dsh-0.1.6-alpha.2-upgrade/p5-doc-mirror-audit.{mjs,json}`。语料内部唯一 `code-runtime` 残留为上游 `dependency-catalog.json` 快照条目（不修改镜像）。
- delta 复核（新语料 vs 本升级运行面）：① `maxActiveSubagents` 已入 config-catalog（部分收口；`ACTIVATION_LIMIT_REACHED` 术语仍未入镜像，以 `dsh-subagent` 包 README + V3 探针为准）；② `plugin-manager`/`sidebar-browser`/`workspace-changes` 关键词已覆盖（完全收口）；③ `sidebar-right.zh.md` L11「刷新后回到折叠默认态」仍与 V2 实测矛盾（保持差异记录，以发布包实测为准）；④ `plan.zh.md` 仍缺 client-ui-plan 评审 UI 覆盖（V1 实测为准）；⑤ `code-runtime`→`ptc-runtime` 更名（引用已同步）。
- 未重测项：Typert Remote 生成器外部 workspace 兼容（沿用既有结论，Skill 管理继续使用公开 Connection exact Fetch 路线）。

## 回退

- 版本面：`backup/` 23 文件（根 package.json、13 包 package.json、8 个脚本/测试、pnpm-lock、preview profile manifest）。
- 运行面：恢复备份 → `pnpm install` → `preview:install` 回 alpha.1；用户数据（sessions/library/projects storage）保留。
- 代码面：迁移改动集中在 6 个 client 文件 + 依赖清单，回退边界清晰。

日期：2026-09-18（V1–V5 复核实测同日追加）。本升级完成依赖面、编译面、运行面回归与新能力核对；原「未覆盖项」已由 V1–V5 实测收口（V3 以隔离确定性探针验证、V1/V2 为官方 preview 实弹、V4/V5 为代码/磁盘与镜像核验），剩余边界以表内说明为准。
