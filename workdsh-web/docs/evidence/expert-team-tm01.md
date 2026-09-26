# TM-01 专家团公开接入验证

状态：第五批（TM-01 收口运行接入）已实施并实测通过：one-shot 适配迁入专家插件正式生命周期、AI 受控委派工具、签收/交接/交付三闸门文件版本校验、生产路径 `--team` 验证退出0（7 项检查全部通过）。第四批此前已通过（`--integration` 退出0、`integrationReady=true`）。**TM-01 整体退出仍待用户验收：完整生产 Profile 安装、团队创建页面与真实付费模型未执行**，2026-09-13。设计者直接执行隔离验证；不调用真实付费模型或修改人工 preview。

## 第五批（TM-01 收口）：实施前官方能力复用记录

按 PLUGIN-DELIVERY 要求，编码前记录（2026-09-13）。运行接入完成后在本节回填实测结果；未验收前不标记 TM-01 完成。

| 字段 | 内容 |
|---|---|
| 任务与范围 | TM-01 收口运行接入：a) 将探针 one-shot 适配迁入专家插件正式生命周期，由插件托管 provider 注册、取消与清理；b) 新增 AI 可调用受控委派工具，复用同一专家业务服务，按 SOP 选择成员、检查前置验收与尝试限额；c) 审核签收、阶段交接、最终文件交付三处自动校验文件版本，漂移即拒绝继续；d) 用实际应用配置验证两位已有专家协作生成/审核/交付，并覆盖跳步、文件漂移、取消、重复调用反例 |
| 官方能力 | 文档：`https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/subsystems/subagent.md`、`tool-catalog.md`、`persistence-catalog.md`；锁定包 `@deepseek-ai/dsh-subagent` / `dsh-agent` / `dsh-llm`（0.1.5-rc.1）；公开入口：`ctx.subagents.registerProvider`（返回 Cordis effect disposer）、`ctx.agents.create`、`resolveChildDepth` / `resolveChildAgentOptions` / `childSessionMeta` / `captureDelegatedPolicyOverrides` / `appendDelegatedPolicyOverrides` / `finalAssistantOutput`、`createMessage`、`ctx.tools.register`、`agent/pre-step`、既有 `ctx.workdshExperts` 与 `team-sop.ts` 纯策略 |
| 复用选择 | provider 注册与撤销经 `ctx.effect` 挂接插件生命周期（插件卸载即注销并清理活动运行）；AI 工具用官方 `defineTool` 注册，执行统一走既有 `ExpertsManager` 业务服务；SOP 准入/回执/校验直接调用既有纯策略 `team-sop.ts`，不新建流程引擎；文件版本校验只重读官方 fs 写入产生的路径记录（write/edit/present），不新增文件服务或字节存储；运行事实仍以 Harness 日志为准 |
| 自有边界 | 仅新增：专家团运行对象与其独立存储域（workdsh_expert_teams v1）、受控委派工具集、三处版本闸门服务方法；不新增执行器/调度循环/第二套运行状态；不修改 Harness 与上游包 |
| 证据与差异 | 既有 `--adapter` / `--sop` / `--integration` 三探针改为引用插件 dist 中迁移后的 provider，保持回归口径；新增 `--team` 模式经生产路径（插件 TeamRunsManager + provider + 工具 + 确定性模型）实际驱动；差异：身份解析与 Session 创建传输仍为 fixture，Agent Teams 创建页面不在本批范围 |
| 验收 | 正例：两位已有专家在应用配置下协作生成文件、评审并交付，最终交付文件与审核通过版本同一 sha256；反例：跳步、文件漂移（签收/交接/交付三处）、取消、重复调用均被拒绝且不产生假成功；命令：三探针回归 + `--team`；未覆盖范围在结果中列明 |

## 第五批结果：生产工具运行接入实测（2026-09-13）

运行 `node scripts/probe-expert-team.mjs --team`（Node 22.23.2）：退出0，`outcome=expert-team-verified`、`teamReady=true`、`teamNativeChildren=13`；7 项检查全部通过。机器证据在 `.artifacts/expert-team-probe/team-result.json`。

装配与实际组合：在隔离 home 加载与目标 Profile 相同的官方行（subprocess-local、sandbox-local 策略 `workspace-write`、shell-env、user-approval、fs-sandbox、fs-observation-policy、tool-fs、tool-present），再按生产入口装载专家插件：`TeamRunsManager` 子 Fiber + 六项团队工具 + 专家插件自有 one-shot 委派 provider。主持人会话与 13 个成员子会话全部是真实原生 Session/Agent/工具/存储，无第二执行器。

| 验证 | 实测结果 |
|---|---|
| 生产入口装载 | 10 项工具可见（六项 `workdsh_expert_team_*` + fs/present 等）；provider `workdsh-expert` 已注册；成员启动授权统一走 `ctx.workdshTeamRuns.admission`（`authorizeDelegation`），非探针私有路径 |
| 两位已有专家协作生成、审核并交付 | 主持人（真实 host 会话，确定性模型）经工具完成 6 次委派：`draft` 由专家 A 生成由 B 评审 accepted，`publish` 由 B 生成由 A 评审 accepted；三处 pin（draft 输出、publish 输出、delivery）sha256 全部等于盘上文件字节（`15c02643…`）；交付后重复 `deliver` 与重复 `delegate` 分别被 `already-delivered` / `sop/attempt-not-retryable` 拒绝；跳步（前置未验收先派 publish）在预留前被 `sop/predecessor-not-accepted` 拒绝且不留尝试 |
| 文件漂移三闸门 | 外部改写文件后：签收拒绝（`stale-artifact`，不附 decision）；交接拒绝且 `publish` 尝试数=0、无预留；交付拒绝且 `delivery` 保持未定义；每次回写同字节后复过。最终 `acceptedVersion === deliveredVersion`（`96cf23a8…`），盘上内容与验收字节一致 |
| 取消与重试 | 成员写入副作用已存在时用户取消主持人回合：host 与成员原生 `turn/end` 均为 `aborted`（reason user），尝试被弃置（`执行成员被取消`）且无输出记录；随后重试新尝试完成并评审 accepted（`retriedAttempts=2`） |
| 重复调用与幂等 | 重复交付、已验收尝试重复委派均被业务错误拒绝（不产生假成功）；`open` 输出 schema 曾缺 `delivered`/`max_total_attempts` 被官方工具层 `additionalProperties:false` 真实拒绝，已修复——探针暴露的真实产品缺陷 |
| 冷读对账 | 销毁后独立 Node 进程读取官方存储与日志：3 个团队运行、2 个已交付、2 个含弃置尝试；交付 pin 与磁盘重读一致（`deliveryArtifactMatch=true`）；`executionResumed=false` 不自动恢复；13 份成员子历史各含 1 条 one-shot descriptor，与在线观测一致 |

新增/修订代码（均为专家插件内部实现，未发布/未安装 preview）：

- `runtime/delegation-provider.ts`：one-shot 成员 provider 迁入插件生命周期，经 `ctx.effect` 托管注册与撤销，插件卸载即注销并清理活动运行；取消挂接原生 signal。
- `tools/team-tools.ts`：六项 AI 可调用受控工具（status/open/delegate/review/abandon/deliver），执行统一走 `TeamRunsManager` 业务服务，成员启动复用同一 provider。
- `services/team-runs.ts` + `storage/team-domain.ts`：团队运行对象与独立存储域（`workdsh_expert_teams` v1），签收/交接/交付三闸门版本校验在此汇聚；`domain/team-sop.ts` 继续作为唯一纯策略。
- `runtime/execution-guard.ts`、`services/experts-manager.ts`、`contracts/experts.ts`：既有预留/领取与 pre-step 校验扩展 delegation 绑定。
- 主探针 `--team` 模式与 `scripts/probe-expert-production.mjs`（本批核心交付物）。

回归（Node 22.23.2）：根 build、typecheck、集成测试 88/88、规划测试 2/2、check:plan（28 模块/50 文档）全部通过；`--adapter`（6项）、`--sop`（11项）、`--integration`（10项+1受控缺口）回归退出0不变。此前一次 shell 默认 Node v21 导致 `Promise.withResolvers` 缺失、部分测试挂起；统一到仓库要求的 22.23.2 后全部复跑通过，属工具链问题而非产品缺陷。

本批未验证（剩余缺口）：团队创建/编辑页面（本批明确不做，运行只能经 AI 工具开启）；确定性 fixture 模型驱动的工具编排，付费模型的自主编排与专业判断未覆盖；身份解析与根 Session 创建传输仍为 fixture，「standard」为最小预设 fixture 而非完整生产 Profile；取消仅覆盖用户取消主持人回合（进程 kill 恢复由早期探针覆盖）；沙箱仅 macOS 本机；未安装人工 preview、未提交推送。**TM-01 整体退出与 TM-02～04 准入等待用户验收，不在本批自行标记完成。**

## 第四批结果：目标 Profile 组合、文件版本回执与中断对账

实施前复用记录（按 PLUGIN-DELIVERY 要求，先记录后编码）：

| 字段 | 内容 |
|---|---|
| 任务与范围 | TM-01 剩余集成验证：a) 在隔离 home 按实际目标 Profile 组合核对委派工具、审批/沙箱与文件写入路径；b) 真实文件成果的不可变版本回执与评审/交接/交付一致；c) 取消与不确定派发的对账规则，禁止重复执行 |
| 官方能力 | 文档：`https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/tool-catalog.md`（present/subagent）、`persistence-catalog.md`（deliverables/presented）、`subsystems/subagent.md`；锁定包 `@deepseek-ai/dsh@0.1.5-rc.1` 同版本组件；公开入口：`ctx.tools.register/guard`、`SubagentRuntime.start`、`AgentRegistry.create`、`Session.snapshotEvents`、`StorageDomain`、`agent/pre-step` 与现有 `ctx.workdshExperts` 契约 |
| 复用选择 | 直接复用官方工具与运行时（fs/bash/present 工具、sandbox/approval 策略栈、原生 subagent provider）；仅对专家插件内部 SOP 收据做最小扩展以绑定文件字节摘要，不新增执行器、文件服务或运行状态 |
| 自有边界 | 仅新增：`SopReceipt.artifacts`（路径/sha256/字节数）与 `verifySopArtifacts` 校验；文件读写仍归官方 fs/bash/present；运行事实仍归 Harness 日志 |
| 证据与差异 | 目标 Profile 以 `.test-runtime/preview`（bundle：dsh-base + dsh-web-app + workdsh-*）只读盘点；探针仅在隔离 home 镜像其相关行。差异：探针身份与 Session 创建传输为 fixture，preview 安装的 workdsh 包版本与仓库当前 dist 分别记录 |
| 验收 | 正例：两位成员的真实文件经评审→交接→交付保持同一 sha256；反例：改字节拒绝签收与交付、取消不产生验收、重复派发被拒并走新 operation；命令：`node scripts/probe-expert-team.mjs --integration`；未覆盖范围在结果中列明 |

以下为第四批实测结果（编码与运行完成后回填）——

运行 `node scripts/probe-expert-team.mjs --integration`：退出0，`outcome=expert-integration-verified`、`integrationReady=true`。10项检查9项通过、1项设计性缺口（见下）；机器证据在 `.artifacts/expert-team-probe/integration-result.json`，含各检查证据、四项业务快照、工具调用者与限制项。

| 验证 | 实测结果 |
|---|---|
| 实际Profile组合与写入路径 | 加载与preview一致的21项官方模块；工作区工具15个，核心10个（bash/write/read/edit/present/send_message/interrupt_agent/list_agents/subagent/subagent_fork）全在；静态盘点实际安装专家preset（31行，委派/文件行齐全）与dsh-base补丁行；`sandboxPolicy.defaultMode=workspace-write` 且 session 级 resolve 一致；工作区内 fs/bash 写入真实成功，工作区外 fs 以 `file access denied`（isError）拒绝、bash 以 seatbelt `Operation not permitted` 非零退出拒绝——两条路径均实际被拒 |
| 原生委派工具（设计性缺口） | 专家父任务下 stock `subagent` 工具被既有 guard 在子模型首个步骤前拦截：子任务真实创建、继承主持人preset、模型请求0、输出0；父任务3个请求（工具调用步、收尾文本步、官方 `subagent-settled` 通知唤醒步，第三条经断言确认）。拦截符合绕行防护设计；缺口为实际组合暂无可用的受控委派工具，本批不给可用性结论 |
| 文件版本生成→评审→交接→交付 | 真实文件 v1（`15c02643…`）经指定评审返工（意见文件 review-1.md 同被 pin）→v2（`c3f99a97…`）→publish 阶段经官方 `present` 真实交付（`deliverables/presented`）并 pin 同一 v2 字节→发布评审 accepted；两阶段全部 pin 由 Host 重读同字节；`appendFile` 漂移后 `stale-artifact` 拒绝、回写同字节复过 |
| 取消与不确定派发对账 | 取消：写入副作用已存在时 abort，原生 `aborted`+dispose+无输出记录；同 label 再次 start 拒绝（`experts/conflict`）；同 operation 重放返回同 binding、异载荷 `experts/idempotency-conflict`；`abandon` 后旧尝试补记拒绝（`output-immutable`）且模型请求数不变；新 operation 第2次尝试完成并复评审 accepted。不确定：completed 先经操作日志重放对账（不重派、请求数与 live agent 不变）再记录一次，二次记录拒绝（`output-immutable`） |
| 跨进程冷读 | 独立进程重开 storage domain `workdsh_integration_probe`：14份session、10份专家子历史与原生记录一致；`integrationRestored` 8项全 true（draft已验收、交接同字节、pinned字节重读、篡改拒绝、取消尝试已遗弃、新尝试已验收、对账只记录一次、`executionResumed=false` 不自动恢复） |

新增/修订代码：`packages/plugins/experts/src/domain/team-sop.ts` 增加 `SopReceipt.artifacts`（路径/sha256/字节数）与 `verifySopArtifacts` 重读校验（覆盖 output 与 decision.receipt 两侧 pin）；`scripts/probe-expert-integration.mjs` 第四批三节探针；`scripts/probe-expert-team.mjs` 增加 `--integration` 模式与独立进程冷读分支。文件读写、present、沙箱/审批与运行事实全部复用官方，未新增执行器、文件服务或第二套运行状态。

官方行为发现（运行实测，已修入探针）：修改已存在文件前必须先 `read`（官方 fs-observation-policy，否则 `cannot modify ... file has not been read`）；bash 沙箱拒绝以非零退出+stderr 呈现而非工具 `isError`（文件写入拒绝才是 isError）；后台 one-shot 子任务失败 settle 后官方投递 `subagent-settled` notice 并唤醒父任务一次模型回合（合法生命周期行为，不计为模型执行）；取终态正文用官方 `finalAssistantOutput`；业务错误断言用 `ExpertsError.code`（message 为中文，不做英文正则匹配）。

本批未验证：crash mid-write 的 `outcome-unknown` 分支未模拟（对账只验证已提交 operation 的重放）；沙箱仅 macOS 本机，Windows/Linux 运行器差异未覆盖；workflow/ralph 与 web/jobs/ask-user 行仅静态盘点，动态只验证委派/写/沙箱行；集成 Host/存储为测试专用，未安装生产端点或 Profile 行；身份与 Session 创建传输为 fixture；真实付费模型、团队 UI、完整 AT-T01～07 未执行。`integrationReady=true` 仅覆盖本隔离组合与确定性模型，不等于生产接入或 TM-01 整体退出。

## 第三批结果：SOP 由 Host 强制执行

运行 `node scripts/probe-expert-team.mjs --sop`：退出0，`outcome=sop-policy-verified`、`sopPolicyReady=true`、`integrationReady=false`。8组SOP检查，加专家/Skill前置、原生持久化与独立进程历史读取，共11组通过。机器证据在 `.artifacts/expert-team-probe/sop-result.json`，包含输出摘要、原生子id、工具真实调用者、业务快照及清理结果。

| 验证 | 实测结果 |
|---|---|
| 未验收不得开始下游 | 前置未开始、工作原生completed、仅提交评审意见、评审要求返工时，均拒绝后继预留 |
| 指定评审 + 当前版本 | 主持人代签被拒；返工新版本不能使用旧评审Session；当前评审者提交旧摘要也被真实工具拒绝；合法评审通过后下游固定引用新版摘要 |
| 不可重复签收/改写 | 评审终结只能一次；已验收阶段不能暗中重开或覆盖产物，防止已启动下游引用失效 |
| 有限返工 | 阶段两次尝试后仍要求返工，第三次被拒，额外模型调用0 |
| 评审中止 | 真正的评审子模型已调用工具提交accepted，但在回合结束前取消；原生aborted，不能终结签收；不能在同次尝试无限换评审，也不能重置累计预算 |
| 并发准入 | 真实StorageDomain同业务revision并发变更只有1次成功，另一次revision-conflict |
| 授权撤销竞态 | 创建完成到首次pre-step之间持久撤销准入；真实pre-step拒绝，模型调用0，旧预留不可重放 |
| 工具/服务绕行 | 直接原生provider的无绑定子任务被专家guard拒绝；SOP外的原始预留和已完成评审预留不能通过受控provider；真实模型调用已加载的官方subagent工具被单调执行guard拒绝，未创建子任务 |

业务策略位于 `packages/plugins/experts/src/domain/team-sop.ts`：无环依赖、预期业务revision、尝试预算、固定输入输出回执、评审提议与Host终结分开。它是专家插件内部模块，**不是完整TeamService或新的执行引擎**。`scripts/probe-expert-sop.mjs`提供仅用于探针的Host组合：官方StorageDomain持久化、Host选择冻结成员修订、从原生Session已完成回合计算正文摘要、通过原生Tools的实际`exec.agent`确认评审者。provider在准入及每次pre-step复查业务授权；运行状态始终读取Harness。

本次共有11份带one-shot descriptor的真实子历史；另有首次模型请求前拒绝的子历史。释放所有句柄后，由独立Node进程读取官方存储与日志：已接受版本、下游输入摘要、花掉的预算和取消后的不可签收状态仍保留。**只读冷启动与策略重验，不自动恢复执行。**23项测试通过（既有专家18项 + SOP策略5项）；专家包build、根typecheck通过。共享provider回归`--adapter`仍通过。

范围边界与下一步：

- 冻结的是原生文本交付内容。真实文件需由正式成果服务保存不可变版本/字节摘要，评审和交付均重新核对；不能把路径存在当作相同产物。
- SOP Host/tool/storage装配和provider仍在测试脚本中，没有安装到生产/preview。正式实现继续归现有ExpertsManager，UI和模型入口调用同一业务服务，不另造团队框架。
- 已验证的绕行路径仅为本组合加载的原生subagent工具和provider；尚未盘点完整Profile的其他委派、文件、shell、HTTP和审批/沙箱路径，不宣称任意工具或代码都被隔离。
- JSON存储CAS仅验证单Host并发；跨进程仲裁、崩溃后的“预留/领取/派发”对账未执行。失去CAS的孤立预留不可运行；不自动重试未知结果。
- 确定性模型用于检验协议与生命周期，不能证明专业评审内容正确。真实模型、实际外部写入取消、团队页面和完整AT-T01～07未执行。

下一项收口TM-01：将选定one-shot适配迁入专家插件正式生命周期（实际目标Profile组合、真实文件版本回执与中断对账已由上方第四批完成）；TM-02～04不在本次实现。Agent Teams默认成员组合及混装限制仍保留失败证据。

## 第二批结果：精确专家子任务与原生生命周期

运行 `node scripts/probe-expert-team.mjs --adapter`：退出0，`outcome=one-shot-adapter-verified`、`minimalAdapterReady=true`、`integrationReady=false`。6组检查通过，记录在 `.artifacts/expert-team-probe/adapter-result.json`；最后的 false 明确区分最小适配与专家团产品验收。

- 同一主持人下两个真实子Session分别mount A/B冻结preset、校验自身binding并完成回合；共4次原生模型请求，分别经Skill工具收到 `RESOURCE_ALPHA_V1` / `RESOURCE_BETA_V1`。各成员请求不含另一位角色或动态源CHANGED正文；descriptor仅写入一次，持久为one-shot。
- 相同预留操作返回同一子id；错误父任务、重复领取、完成并释放后重放均拒绝。persona覆盖、continuable启动也被能力声明拒绝。
- 在原生创建通知时取消：provider交付前失败，Agent清理，无模型调用；已领取的预留不自动重用。
- 两个真实模型请求同时等待；取消一个后原生日志为aborted且registry释放，另一个仍running，最终分别清理。
- 销毁后独立Node进程通过官方SessionPersistence读取4份有descriptor的子任务历史。另有一次创建后立即取消、未启动回合的历史；没有自动恢复执行。
- ExpertsManager集成18/18通过（含新增2组）；覆盖并发领取仅一次成功、跨主体/组织拒绝、根任务不被重复创建、父/子专家停用、Skill停用、原生父关系/工作区/深度/preset不符拒绝、重开真实存储后仍不能重复领取。

构建专家包（同时构建contracts/ui）和根`pnpm typecheck`通过；原Teams基线复跑仍9组观测通过、3个缺口、退出2。未执行完整产品Profile安装、浏览器、付费模型、外部写入取消，以及实际审批/沙箱权限继承验收；provider调用官方policy helper不能冒充这些运行验证。

**额外发现：两条运行路线不能混用来证明成功。**在本测试组合同时加载experimental TeamService/工具时，one-shot B虽已读到正确Skill，后续被“not a member of an active Agent Team”拒绝。当前两种命令使用独立组合，未修改/卸载用户Profile。正式接入前必须验证生产Profile的工具组合；本结果不表示修好了原生continuable成员。

新增代码：专家Host的`reserveDelegation`/`claimDelegation`、ExecutionBinding可选delegation字段、原生pre-step守卫；[provider探针](../../scripts/probe-expert-delegation-provider.mjs)仅由测试脚本注册，没有加入插件apply、Remote或模型工具。binding的reserved/claimed仅表示一次性业务准入，运行完成/失败/中断只读Harness日志。首版只允许已绑定专家根任务的一层子任务，父binding必须有已解析workspaceRef；仅workspaceId的任务明确拒绝，待正式适配解析，不能猜目录。

第二批结束时的下一项为有限SOP准入/评审探针，现已由上方第三批完成限定范围验证。TeamRevision及正式SOP服务仍未接入。

## 官方能力复用记录

第三批（SOP，实施前记录）：继续复用锁定 rc.1 的 `SubagentRuntime.start`、`AgentRegistry`、`Session.snapshotEvents` / `SessionPersistence`、`Tools.register/guard` 及 `StorageDomain`。官方说明为 `subsystems/subagent.md`、`subsystems/workflow.md`，工具的实际调用者与单调拒绝语义以发布包 `dsh-tools` 的 `ToolExecutionInput.agent` / `ToolRuntime.guard` 类型为准。专家插件仅补有限 DAG 的业务准入、版本化输出回执、指定评审和累计尝试预算；不记录原生运行状态，不新增调度循环。先实现内部纯领域策略，用隔离 Host 探针接真实一次性成员和工具，再记录通过/缺口。生产服务、完整 Profile、跨进程写入仲裁、文件产物字节存证和冷恢复不在这批验收范围。

第二批实现边界：在专家 Host 增加 `reserveDelegation` / `claimDelegation`，仅保存固定父任务、专家修订与一次性准入绑定，不保存运行状态。预留幂等、领取一次有效，领取后的失败必须核对原生日志后使用新 operation，不自动重放模型动作。子绑定在首次模型请求前校验父绑定、主体、工作区、固定组合与 Skill。公开 one-shot provider 暂仅置于隔离探针，使用 `AgentRegistry.create.setup` + `AgentPresets.mount`，原生取消、结果与持久日志；不注册到 preview、不承诺 continuable/Agent Teams 已解决。没有新增模型可调用的委派工具；未来必须由 SOP Host 准入后发放预留。

| 项目 | 本轮范围 |
|---|---|
| 官方文档 | https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/subsystems/agent-team.md、subagent.md；锁定发布包公开 exports/types |
| 版本 | Harness 0.1.5-rc.1；Cordis 4.0.2；experimental-agent-team / experimental-tool-agent-team 0.1.5-rc.1 |
| 原生 owner | AgentRegistry/AgentLoop、SubagentRuntime、TeamService、SessionPersistence、AgentPresets |
| 自有差异 | 指定 ExpertRevision 与其 Skill 依赖锁、子 Session 业务绑定、SOP专业准入；不新增运行循环/消息队列 |
| 首要假设 | spawn 请求无 preset；原生子组合继承父组合，能否通过公开创建接点更换并保持原生所有权需实测 |
| 成功证据 | 实际成员、公开返回值、固定组合/绑定、依赖准入、局部取消、持久历史；分别记录，不以模型输出冒充 |
| 未执行 | 团队产品UI、真实模型专业表现、完整AT-T01～07 |

## 可复现方式

实现：[scripts/probe-expert-team.mjs](../../scripts/probe-expert-team.mjs)。Node 22.23.2，既有 WorkDSH dist 为前提。两份官方同版本 tarball 通过 `npm pack --ignore-scripts` 下载，解压到每次独立的临时目录；依赖只链接到已安装的锁定发布包，运行时逐一检查 Harness 版本。随后由官方 Cordis Loader 加载服务/工具，AgentLoop 实际执行确定性模型适配器；不模拟子 Agent、TeamService、专家业务服务或 Skill 工具。

```sh
node scripts/probe-expert-team.mjs --prepare  # 首次获取精确版本归档
node scripts/probe-expert-team.mjs           # 使用已下载归档重复验证
node scripts/probe-expert-team.mjs --adapter # 独立one-shot组合，不需下载Teams归档
node scripts/probe-expert-team.mjs --sop     # 同一公开适配上的SOP与真实工具验证
node scripts/probe-expert-team.mjs --integration # 目标Profile组合、文件版本回执与中断对账
node scripts/probe-expert-team.mjs --team    # 生产入口：插件托管provider+六项AI工具+三闸门
```

这不是生产 Profile 安装测试：未改根依赖/锁文件，未安装到18989；`standard` 是包含官方 persona/filesystem/skill 工具的最小预设 fixture。测试身份解析与根 Session 创建传输为 fixture 接口，内部仍调用真实 AgentRegistry/AgentPresets 与现有 ExpertsManager。不能据此签收完整生产 Profile、真实用户鉴权或跨组织 E2E。

最后一次回归（Node 22.23.2）：`--adapter`／`--sop`／`--integration`／`--team` 四个专用模式退出0（`one-shot-adapter-verified`／`sop-policy-verified`／`expert-integration-verified`／`expert-team-verified`）；不带参数的旧 Agent Teams 默认基线仍退出2（9 项观测断言通过、3 项集成缺口被复现），保留为已知缺口对照，不能改成假成功。退出码1表示探针自身故障。机器可读记录在 `.artifacts/expert-team-probe/`：默认基线 `result.json`（归档 SHA-512、原生 Session id、preset id 与清理结果）、`adapter-result.json`、`sop-result.json`、`integration-result.json`、`team-result.json`。

## 第一批实测结果（保留失败对照，复跑仍成立）

| 检查 | 结果 | 实际证据/边界 |
|---|---|---|
| 两个 experimental 发布包装配 | 通过 | 官方 Loader 实际装载 TeamService 和团队工具，原生 provider 可发现 |
| 两个真实成员 | 通过 | 不同原生子 Session、正确 parentSession、确定性模型被调用；立即完成后变 inactive 不等于未执行 |
| 原生任务依赖与 CAS | 通过 | 前置未完成时 claim 拒绝；前置完成后 ready；旧 revision 变更拒绝 |
| 原生 completed 等于专业评审通过 | **不成立** | 未提交任何专业评审，原生后继任务已经 ready；原生任务板只承诺其文档语义 |
| 现有两位专家发布与技能快照 | 通过 | 经 createDraft/validate/confirmPublish/publish/createExecution；分别实际 mount 两个不同专家 preset；发布后修改源 Skill，模型仍收到原快照正文 |
| 从专家 A 创建并指定专家 B 成员 | **不通过** | 子 Session 实际 preset 仍为 A；自身 binding 缺失；guard 在子模型调用前拒绝，调用数0；Team初始消息可能报告未持久接纳 |
| 用另一 factory 插入创建拦截 | 拒绝，符合契约 | setFactory 已被官方 AgentLoop 占用，第二次注册抛错；不是可叠加中间件 |
| 默认 one-shot 加 B 的 persona | **不通过** | 仍继承 A preset，结果 stopReason=error；不能绕过缺失的专家业务绑定 |
| 显式公开 Agent setup → mount(B) | 局部通过 | 创建窗口可选择 B、保留原生 AgentLoop；仍因缺自身绑定被guard拒绝，未冒充workflow/provider全链路通过 |
| 运行中局部取消 | 通过 | 被取消成员从原生 registry 释放；同父无关的活动子 Agent 仍存在，随后单独清理 |
| 持久化与独立进程读历史 | 通过 | flush并销毁后，新Node进程通过官方SessionPersistence读出成员/任务事件；没有自动继续执行 |

## 第一批对设计的修正（适配进展以上方第二批为准）

1. **Agent Teams 能力存在，默认接法不够。**不是把 spawn 参数补上角色名就完成精确专家绑定，也不应关闭当前守卫。
2. **需要专家域自己的子任务绑定接口。**现有 createExecution 仅创建根任务；下一步应在现有 ExpertsService 内补受控“准备委派/绑定已授权原生子 Session”契约，固定 actor、父任务、专家修订、工作区、operationId 和原生子身份，执行前验证，失败不留下可运行的半绑定任务。不能由模型提交任意 preset、childId 或 owner。
3. **原生 Teams 精确组合仍有公开接点缺口。**当前 spawn 与 continuable prepare 不能直接传 setup；全局 factory 替换不可用。暂不确定采用它作为首版执行路线，不修改上游、不复制 driver。需记录是否有满足语义的公开扩展；不能把补一个业务绑定接口当成已解决 preset 选择。
4. **固定段备选具有较小的可验证接点。**SubagentProvider.start 可以在公开 AgentRegistry.create 的 setup 中选择成员 preset；本轮只验证了 setup，尚未实现 provider 的完整交付/取消与专家绑定事务。下一项仍属于 TM-01：验证这一最小公开 provider + 专家域绑定适配，再决定是否采用 workflow 固定段。它继续使用原生 AgentLoop，不是新执行引擎。
5. **SOP验收独立于原生task completed。**WorkDSH阶段准入必须检查真实评审与产物版本；受控业务工具与直接原生工具路径一起验证。未通过前不能声称依赖图已经强制全部业务规则。

## 第一批结束时的未执行与状态（历史）

- 未实现子专家绑定服务及自有 provider，未签收完整两成员专业执行链。
- 未执行带专家修订的成员冷恢复、workflow段运行、跨组织/撤权E2E、外部写入中断与未知结果对账。
- 未执行团队产品UI、真实模型效果和AT-T01～07整体验收。独立进程只读历史不能当成恢复执行通过。
- 本轮只新增探针与证据，未改产品runtime、用户任务、Profile或上游；未提交推送。activeSlice 为 TM-01，D04/D11主线状态保留。

验证过程中的 fixture 修正：先前只查在线 registry 会漏掉已立即休眠的真实成员，改用官方 agent/created 观测与持久记录；固定 Skill 读取判断改为实际正文标识；补齐公开 SessionQuery 依赖。最终探针完整跑到清理和独立进程历史读取，不把调试中的部分输出当最终结论。
