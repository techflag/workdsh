# D07 项目模块增量：会话顶栏项目路径 chip 与任务交付自动归属

任务：workdsh-plugin-projects 0.1 线增量（P1-11 范围内）——①项目任务会话标题右侧显示「项目 / 项目名」chip，点击打开并聚焦项目面板；②项目任务对话中模型按官方 present 语义交付的文件自动登记资料库（source=task）并幂等关联为项目资产。
核对日期：2026-09-17。Node 22.23.x、pnpm 10.34.5、`@deepseek-ai/dsh@0.1.6-alpha.1`、`@deepseek-ai/cordis@4.0.2`。

## 官方能力复用记录（编码前填写）

| 字段 | 内容 |
| --- | --- |
| 任务与范围 | D07/P1-11 项目模块增量，本次可验收行为：项目任务会话顶栏出现项目路径 chip 且点击聚焦项目；项目任务 present 交付出现在项目资产列表与资料库（source=task、记录来源会话）。 |
| 官方能力 | Slot：`docs/dsh-v0.1.6-alpha.2/subsystems/slots.md:25-41`（`conversation.session.header.actions` 注册示例）、:150（槽清单），原生所有者 ui-conversation。事件：`docs/dsh-v0.1.6-alpha.2/persistence-catalog.md:473-477`（`deliverables/presented`，log-only）、`docs/dsh-v0.1.6-alpha.2/tool-catalog.md:624-630`（present 语义：写入后的文件必须 present 才是用户交付）、:25（`@deepseek-ai/dsh-tool-present` 行）。发布包与公开入口：`@deepseek-ai/dsh-client-ui-session/client`（SessionStandardProps.sessionId）、`@deepseek-ai/dsh-tool-present/types`（`PresentedFile`）、`@deepseek-ai/dsh-session`（`session/event`、`SessionHeader.cwd`）、`@deepseek-ai/dsh-fs`（`ctx.fs.resolve/readBytes`）、`@deepseek-ai/dsh-client-ui-layout`（`selectPanel`）。 |
| 复用选择 | 直接复用官方 Slot 注册、官方交付事件、`ctx.fs` 路径解析、官方 client model（`ctx.slots.inject` + `register`）与既有业务服务注入（workdshIdentity/workdshProjects/workdshLibrary）。不新建 Agent loop、事件总线、存储或传输。RPC 仅新增一个只读端点 `task-context`（项目内部 Host-Client 协议）；contracts 同批补充只读 `ProjectService.taskContext` 契约（见「实现范围」）。 |
| 自有边界 | 仅新增：1 个 Host 归因 listener（订阅 `session/event` 过滤 `deliverables/presented`）、1 个 chip 组件 + 模块级 focus 通道、1 个 RPC 端点、1 个 client management 方法。交付文件正文归资料库唯一管理，项目只保存资产引用（既有 `addAsset` 幂等）；执行事实仍由 Harness 会话日志拥有，WorkDSH 不写第二状态。 |
| 证据与差异 | 既有探针：预览 18989 项目任务已改走官方会话导航（STATUS 2026-09-17）；官方 present 工具 emit 路径已核验（`tools/result` 成功后 `session.append('deliverables/presented')`，仅限调用方 Session，路径相对 `session.header.cwd`）。待验证假设：chip 在真实会话头的渲染位置与对齐（预览截图确认）；官方会话头在 present 后的事件时序。镜像与发布包当时均为 0.1.6-alpha.1，无差异（2026-09-18 补记：升级后同为 0.1.6-alpha.2，镜像已整批刷新为 alpha.2 快照；本表行号已按新语料重锚：:147→150、persistence-catalog.md:403-407→473-477、tool-catalog.md:222-228→624-630、:22→25）。 |
| 验收 | 正例：项目任务会话显示 chip 且点击聚焦；真实模型 present 后资产出现在项目资产列表与资料库（source=task、sourceTaskId=会话）。反例：非项目会话无 chip；子代理会话交付不进项目；不支持格式（.zip 等）跳过并 warn、无假成功；名称冲突自动后缀；无 cwd 事件忽略。命令：`corepack pnpm --filter workdsh-plugin-projects typecheck/build/test`、全仓 `corepack pnpm typecheck`、`node scripts/check-plan.mjs`、预览探针脚本。未覆盖：重启后历史不补归因（官方 constructor seeds do not emit）；HMR 窗口事件不重放；跨组织隔离复用既有 identity 解析，未新增多组织探针。 |

## 实现范围（含 contracts 只读补充）

- `packages/plugins/projects/src/runtime/deliverable-attribution.ts`（新增）：`attributePresentedFiles` 纯函数 + `registerDeliverableAttribution` 接线。
- `packages/plugins/projects/src/index.ts`：新增 `workdsh-projects-attribution` 子插件（静态 inject）。
- `packages/plugins/projects/src/remote/connection-api.ts`：`task-context` 只读端点。
- `packages/plugins/projects/src/client/management.ts`：`taskContext(sessionId)`。
- `packages/plugins/projects/src/client/components/project-lineage/ProjectLineageChip.tsx`（新增）。
- `packages/plugins/projects/src/client.tsx`：chip 槽注册 + `focusProject`。
- `packages/plugins/projects/src/client/ProjectsPanel.tsx`：模块级 focus 通道订阅。
- `packages/contracts/src/projects.ts`：新增 `ProjectTaskContext` 与只读 `ProjectService.taskContext`（兼容补全，2026-09-18 补记 bump `0.1.0-alpha.9`；原「不改 contracts」表述修正）。
- 不改 library / ui / bundle；包版本当时保持 0.1.0-alpha.1（Unreleased），09-18 升级批次移至 0.1.0-alpha.2。

## 验证结果（2026-09-17 执行，全部通过）

### 命令链

| 命令 | 结果 |
| --- | --- |
| `corepack pnpm --filter workdsh-plugin-projects typecheck` | 退出 0 |
| `corepack pnpm --filter workdsh-plugin-projects build` | 通过（含 ui 预构建） |
| `corepack pnpm --filter workdsh-plugin-projects test` | 9/9（7 项既有 + 归因纯函数用例组：非项目任务跳过、成功路径字段、冲突后缀重试、单文件失败隔离、事件内去重、operationId 幂等） |
| `corepack pnpm typecheck`（全仓） | 退出 0 |
| `node scripts/check-plan.mjs` | PASS: 29 modules; 50 documents |

### 探针一：chip 正反例（`.artifacts/project-lineage-verify.mjs` → `verify.json`，21/21）

真实预览 18989 + headless 浏览器，打开项目「Host持久化验证」的任务会话：

- 正例：`conversation.session.header.actions` 槽内 chip 为第一个子项（`order:-20`，紧跟标题）；文案「项目 / Host持久化验证」与项目名一致、`title`/`aria-label` 正确；RPC `task-context` 请求/响应 200；chip 实测样式 height 22px / font-size 12px / border-radius 6px / max-width 180px；键盘 Tab 可达（`chipFocusable`）。截图 `verify-01-chip.png`。
- 聚焦：点击 chip → URL 含 `?project=9aef80e2-…`、项目面板打开并选中该项目（`focus.urlHasProject`、`focus.shell`）。截图 `verify-03-chip-click.png`。
- 视口：1440×900 / 1920×1080 / 390×844 均无横向溢出且 chip 保持显示（6 项断言）；390 宽截图 `verify-02-mobile-390.png`。
- 反例：非项目会话（专家会话「采购单据录入专家处理送货单」、全新 blank 会话、draft 草稿）chip 计数 0 且会话头正常（`negative.*.noChip`/`blank.noChip`/`draft.noChip` 等 5 项）。截图 `verify-04-negative.png`。
- `errors.zero`：pageerror/console error 0。

### 探针二：真实模型 present 归因（`.artifacts/project-lineage-attribution.mjs` → `attribution.json`，11/11）

在项目「Host持久化验证」中经项目面板创建任务（`session-aab10863-c7e7-46ee-909a-710b2fc421d5`），要求真实模型生成并 present 一个 `.md`：

- 回合结束后项目「资产」标签出现 `project-deliverable-check.md`（kind=markdown），与手动资产并列（`assetsTab.rowCount` 5）。截图 `attribution-02-assets-tab.png`。
- 资料库同一文件：node `64329fc3-f238-41e9-be4e-7db700f6ad3a`；asset `77ba93d0-2435-4edd-bb87-6a86542c254f`，`source:'task'`、`sourceTaskId:'session-aab10863-…'` 精确匹配；revision `d1fbdaa1-…`，`byteLength:234`、`mediaType:text/markdown`、`conversionStatus:ready`。
- 项目资产引用与资料库 node/asset/revision 三 id 对应一致，`activity` 记录 asset 事件。
- 回归（同探针）：任务行新增（21→22）、活动记录 23 行、资料库选择器加载 6 项、chip 在新会话可见；`errors.zero`。截图 `attribution-01-new-task.png`。

### 探针三：反例与边界（`.artifacts/project-lineage-negatives.mjs` → `negatives.json`，12/12，`failures: []`）

- 手工资产回归：面板「从资料库添加」`HTML原件验收.html` 计数 6→7（`manual.addLands`），移除后复原 6（`manual.removeRestores`）。
- 名称冲突后缀（确定化）：预置库节点 `conflict-seed-mu5stjb9.md` 后，真实模型在同一任务中交付同名文件，归因自动改试 ` (2)` 后缀落库——项目资产 `conflict-seed-mu5stjb9 (2).md`（nodeId `44c6032d-…` / assetId `f85a2a48-…` / revisionId `15a9fb6f-…`，createdAt 2026-09-17T17:23:46.435Z）。截图 `negative-02-conflict.png`。
- 不支持格式跳过：真实模型生成并 present `.zip`（`zip.presented`，session `session-efd8bc81-…`，cwd `/Users/techflag/project/vipshop`，approvals 0，zip 落盘 zipExists）后，项目零新资产（`zip.noFakeAsset`）、资料库零新节点（`zip.noLibraryNode`）、确为确定性跳过（`zip.cleanSkip`）——扩展名白名单在 `library.importAsset` 转换前拒绝，归因侧 catch 后仅 warn 不产生假成功。
- 子代理交付不进（边界实证）：含子代理委派的项目任务（`session-4144af7c-…`，cwd basic_lims，approvals 0）中捕获到 `delegationDepth>0` 子会话 `a4f03889-…` 且该子会话确实 emit 了 `deliverables/presented`（`subagent.childPresented`），项目侧零泄漏（`subagent.noLeak`）——官方语义边界（子代理交付不计入项目任务归因）被真实触发验证。截图 `negative-03-subagent.png`。
- `errors.zero`：全程 pageerror/console error 0。

### 日志 sink 边界（如实记录）

归因侧失败仅经 `ctx.logger('workdsh-projects').warn` 上报。实测本仓预览 profile 的 cordis `LoggerService` 内置 exporter 只推入内存环形 buffer（`node_modules/@deepseek-ai/cordis/src/logger.ts:194-224`，bufferSize 1000），profile 无 logger-console 落盘插件，因此 warn 不写任何文件、无法从日志文件 grep。反例探针以行为链断言替代日志 grep：present 事件已 emit + 源文件在盘 + 资料库无节点 + 项目无新资产，证明「跳过且无假成功」；warn 文案本身由单测（`maxNameAttempts` 触顶路径）覆盖。

### 已知行为（计划内上限，非缺陷）

- 重复交付同名文件：归因按 `报告.md`→`报告 (2).md`→…→`报告 (5).md` 最多尝试 5 次；库中 saturate 后（本次回归中 `project-deliverable-check.md` 已有基线 5 份）第 6 次交付触顶跳过并 warn。跨回合重复交付产生带后缀新资产；「同资产新修订」需 library 新公开方法，另立项。
- present 之外的文件（中间产物、未 present 的写入）不进归因，符合官方「写入后的文件必须 present 才是用户交付」语义。

### 未覆盖（如实记录）

- 重启/HMR 后历史不补归因（官方 constructor seeds do not emit，语义边界）；
- 跨组织隔离仅复用既有 identity 解析，未做新增多组织探针；
- warn 落盘依赖未来 logger exporter 装配，本轮以单测 + 行为链替代。
