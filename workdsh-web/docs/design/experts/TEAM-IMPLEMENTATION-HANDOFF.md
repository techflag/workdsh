# 专家团实施入口：从设计到可验证代码

**2026-09-13 验证更新：**[TM-01 第五批](../../evidence/expert-team-tm01.md)已完成运行接入并实测通过：one-shot 适配迁入专家插件正式生命周期（`ctx.effect` 托管注册/撤销/清理）、六项 AI 可调用受控委派工具、签收/交接/交付三闸门文件版本校验；`--team`退出0，7项检查全部通过（两位已有专家协作生成/审核/交付同一`15c02643…`，跳步/漂移/取消/重复调用均被拒，独立进程冷读`deliveryArtifactMatch=true`）。第四批（目标Profile组合、文件成果版本回执与中断对账，`--integration`退出0、`integrationReady=true`）、第二批公开one-shot + 自身专家绑定、第三批有限SOP保持通过。88项测试与根build/typecheck/check:plan通过。默认Agent Teams成员仍继承主持人preset，混装Teams钩子的one-shot也被拒绝，默认基线保留退出2。TM-01整体退出与TM-02～04准入等待用户验收；下方“均未执行/尚未启动”均指交接时基线，不能覆盖本条。

### 已实现的最小 Host 接口与接手顺序

1. `ExpertsService.reserveDelegation(actor, parentSessionId, targetExpertRevisionRef, MutationContext, signal?)`：只预留，不建根Session、不运行模型。Host传固定修订，校验父绑定/双方专家权限与可用性；同operation同payload返回相同子id，不同payload拒绝。首版只支持父binding已解析workspaceRef、一层委派。
2. `claimDelegation(actor, childSessionId, parentSessionId, signal?)`：从reserved领取为claimed，并发只成功一次，跨主体/组织/父任务拒绝。已领取包括创建失败/取消后不能再次调用模型；先核对日志，再由业务流程决定是否分配新尝试。这个标志是准入，不能呈现为running/completed。
3. 测试用one-shot provider已迁入插件：`packages/plugins/experts/src/runtime/delegation-provider.ts`的`registerExpertDelegationProvider`，由插件apply经`ctx.effect`托管注册、撤销与活动运行清理；`--adapter`/`--sop`/`--integration`/`--team`四模式引用插件dist的同一实现（原探针脚本`scripts/probe-expert-delegation-provider.mjs`已删除）。它只接受Host预留id，以真实parent解析actor，调用公开`resolveChildDepth`/`resolveChildAgentOptions`/`childSessionMeta`，在`AgentRegistry.create.setup`中mount成员preset并校验binding。保留官方policy seed helper，但真实审批/沙箱组合尚未在完整生产Profile验收。没有per-member npm包、factory覆盖、私有driver或第二个loop。
4. 当前guard逐步核对自身binding、父绑定、主体、工作区、深度、组合摘要、Skill锁与状态。测试provider不支持persona覆盖、outputSchema、任意agentOptions、toolFilter或continuable。完整产品Profile暂未注册此provider；不要直接把测试入口加入默认配置。
5. SOP核心在`packages/plugins/experts/src/domain/team-sop.ts`，内部纯策略、未声明生产API。`scripts/probe-expert-sop.mjs`提供隔离Host验证：预检业务规则、预留指定成员，再以业务CAS关联；冲突遗留的未关联预留无法执行。工具的`exec.agent`来自真实AgentLoop；原生completed文本输出生成版本摘要；模型只提交评审提议，Host核对正常结束后终结。provider在领取前及每次pre-step重新检查授权。`node scripts/probe-expert-team.mjs --sop`复现实测，`tests/integration/expert-sop-policy.test.mjs`覆盖领域拒绝分支。
6. 第五批已完成TM-01收口：`services/team-runs.ts`（TeamRunsManager）与`storage/team-domain.ts`、`tools/team-tools.ts`（六项AI工具）进入插件正式装配；签收/交接/交付三闸门在Host重读真实文件字节校验；`scripts/probe-expert-production.mjs`与主探针`--team`模式复现。第四批已验证：目标Profile组合（工具/写入路径/沙箱）、真实文件版本回执（`SopReceipt.artifacts`+`verifySopArtifacts`，复现脚本`scripts/probe-expert-integration.mjs`）及预留/领取/派发不确定的对账规则。下一步是TM-01整体验收（用户）与TM-02团队草稿/发布/UI，不在本批自行启动；不能将探针的正文摘要、fixture身份或单工具guard直接当完整生产Profile验收。不要求同时接Agent Teams和WorkflowEngine。

状态：2026-09-13 的历史交接记录；其中自有 SOP 运行方案已被官方 Agent Teams 决策取代，不再作为团队功能的实施入口。产品需求以 [PRD](PRD.md) 为准，当前执行归属见 [ADR-0033](../../adr/0033-official-agent-team.md)，历史分析过程见 [EXPERT-TEAMS](EXPERT-TEAMS.md)。

**当前状态：第五批运行接入已完成并通过隔离实测（`--team`退出0、7项检查全过，见第五批证据）。**TM-01整体退出与TM-02～04准入等待用户验收；下一实现内容为TM-02团队定义与发布（含创建页面）与TM-04界面，但不得在验收前自行启动。专家团优先切片已登记在PLAN、development-order和ADR；主线D04与D11前置D10保留，不假报其他模块完成。

## 0. 发给接手 AI 的指令

当前成果还在本地未提交工作区。接手目录是 `/Users/techflag/project/workdsh`，不是 `dsh-ssh-desktop`。同机接手可直接读取完整现状；换机器或只从GitHub克隆时，必须同时移交未提交修改和新增文件。其中本交接文件与 `docs/evidence/expert-team-tm01.md` 被仓库忽略规则覆盖，提交交接包时需显式纳入。不要将本机绝对路径当作跨机器可访问的链接。

可直接复制以下内容：

```text
请接手 /Users/techflag/project/workdsh 的专家团 TM-02 开发。先检查 git status，保留现有修改以及无关的 lefthook.yml、scripts/desktop/；按本仓库 AGENTS.md 工作。

依次阅读 docs/STATUS.md、docs/development-order.json、docs/design/experts/TEAM-IMPLEMENTATION-HANDOFF.md、docs/evidence/expert-team-tm01.md。以顶部最新实测为准。TM-01 五批验证均已通过：公开one-shot成员适配、有限SOP、目标Profile组合/文件版本回执/中断对账、运行接入（插件托管provider + 六项AI工具 + 签收/交接/交付三闸门，`--team`退出0）；先复跑最小回归核对证据，再按用户验收结论决定是否启动 TM-02。

TM-02 目标：团队定义与发布（成员选择、唯一主持人、职责、SOP阶段及输入输出/评审、草稿预览、校验与明确发布，含创建页面）；固定 TeamRevision 与 ExpertRevision、无环依赖、缺成员/依赖不可用拒绝发布、并发编辑与旧任务版本隔离。仍使用锁定 Harness 公开 API、现有专家服务和 Skill 修订，不修改 Harness、不另造 Agent loop，不操作人工 preview 或用户任务。

先检查本机前提（Node 22.19+/24+，本机shell默认可能是v21），再构建受影响包，运行 adapter/SOP/integration/team 四探针与相关测试。回填实际结果、未验证项和代码位置；TM-01 未经用户整体验收前不标完成，不启动 TM-03 执行链或声称团队已可用。本次不自动提交、推送、发布。
```

最小回归入口（在仓库根目录，Node 22.19+ / 24+、pnpm 10.34.5，其他被引用的工作区包需已构建）：

```sh
corepack pnpm --filter workdsh-plugin-experts build
node --test tests/integration/expert-manager.test.mjs tests/integration/expert-sop-policy.test.mjs
node scripts/probe-expert-team.mjs --adapter
node scripts/probe-expert-team.mjs --sop
node scripts/probe-expert-team.mjs --integration
node scripts/probe-expert-team.mjs --team
corepack pnpm typecheck
corepack pnpm check:plan
```

`--adapter` / `--sop` / `--integration` / `--team` 当前应退出0；不带参数的旧 Agent Teams 基线会以退出2报告已知集成缺口，不能将其改成假成功。本机shell默认Node可能是v21（缺`Promise.withResolvers`会导致部分测试挂起），须显式使用仓库要求的22.19+/24+（如`/Users/techflag/.nvm/versions/node/v22.23.2/bin`）。真实模型测试须另外说明模型、实际产物与结果；确定性协议测试不能代替专业效果验收。

## 1. 本版固定范围

用户路径：**说出目标与经验 → 生成成员及团队草稿 → 预览成员/技能/流程 → 发布 → 召唤原生任务 → 专家协作 → 在任务中收到可打开的成果。**

- 两种创建方式同时支持：引用已有专家；一句话创建团队并生成缺少的专家草稿。团队和专家由同一个专家插件管理，不为成员创建 npm 包。
- 发布时有 2～8 位真实成员、唯一主持人；每位成员固定到已发布 ExpertRevision，沿用该修订的 Skill 依赖锁。用户经验写入方法、判断尺度及交付要求，不能只放在简介。
- 单项问题可选择一位成员处理；综合任务使用已发布 SOP。路由在首次委派前记录，单成员结果不能显示为“全团审核通过”。
- SOP 只有阶段、依赖、输入、产出、评审、有限返工。首版不包含任意脚本上传、通用流程画布、团队套团队和自动跨重启续跑。
- 默认最多 3 位成员子 Agent 同时工作，另有 1 位主持人；所有成员是主持人的直接子 Agent。总阶段尝试上限 20，每阶段默认最多 2 次尝试（包含首次）。这些是本版产品限制，须由 Host 检查，不能冒充 Harness 默认值。
- 任务、文件和下载复用现有 Conversation、成果卡及 Office 链路。阶段交付可以是正文或真实文件；没有文件回执时不得展示虚假下载入口。

运行主线优先使用同版本官方 Agent Teams。仅当可复现证据证明其公开扩展面不能满足必要约束时，再评估 workflow + subagent 有限执行段；选定一条后只实现一条。**SOP 是业务协作规则，不等于必须调用 WorkflowEngine。**

## 2. 现有能力与唯一所有者

| 所有者 | 复用内容 | 不得另做的东西 |
|---|---|---|
| Harness 官方包 | Agent、Session、模型/工具调用、子 Agent、团队消息/原生任务、持久执行事实、原生取消/清理 | 第二套 loop、收件箱、运行注册表、执行日志或模型路由 |
| 专家插件 | Expert/Team 定义、不可变修订、发布、执行绑定、SOP 业务准入与验收记录 | 从 Agent 的一句“完成”推导成果已验收 |
| Skills 服务 | Skill 对象、版本、依赖解析；通过现有专家发布锁定资源 | 复制另一套技能目录管理器；默认为每个成员安装技能 |
| Identity / Access | Host 解析主体与组织、按操作重新授权 | 客户端提交 actor/owner；用成员角色或工具可见性代替权限 |
| Client | 通过官方 Remote 读取投影，呈现进度和用户操作 | 浏览器维护第二份权威运行状态或扫描会话文件 |

现有代码入口（以实际导出为准，不重建同名服务）：

- [packages/contracts/src/experts.ts](../../../packages/contracts/src/experts.ts) 的现有 `ExpertsService` 已包含草稿、发布、执行计划、执行创建与 `verifyBinding`。
- 专家服务：`packages/plugins/experts/src/services/experts-manager.ts`；存储：`src/storage/domain.ts`。
- 专家组合：`src/runtime/preset-compiler.ts`；首次执行与恢复校验：`src/runtime/execution-guard.ts`。
- 公开传输：`src/services/connection-api.ts`、`src/shared.ts`；工具：`src/tools/management-tools.ts`；制作指南：`resources/expert-manager/`。

以上路径中的 `src/` 均相对 `packages/plugins/experts/`。现有 `createExecution` 创建普通专家任务，不能循环调用它并把多个独立根 Session 冒充原生成员。现有冻结依赖仍允许公共 Skill 根目录，**不是排他性的技能白名单**。

## 3. 团队领域契约（拟新增，不是官方 API）

扩展现有 `workdsh-contracts/experts` 公共契约与专家 Host 服务。以下字段是实现目标；TM-01 只负责证明原生映射，不提前发布假服务。

```ts
// 复用现有 ExpertRevisionRef、ResourceOwner、MutationContext、ActorContext。
type TeamDefinition = {
  name: string;
  description: string;
  members: Array<{
    memberId: string; // 团队内稳定身份，不用显示名称做 key
    expertRevisionRef: ExpertRevisionRef;
    responsibility: string;
  }>;
  leadMemberId: string;
  stages: Array<{
    stageId: string;
    title: string;
    memberId: string;
    dependsOn: string[];
    inputRequirements: string[];
    outputRequirements: string[];
    reviewerMemberId: string;
    maxAttempts: 1 | 2 | 3;
  }>;
  limits: { maxParallelMembers: number; maxTotalAttempts: number };
};
type TeamRoute =
  | { kind: 'single-member'; memberId: string; reason: string }
  | { kind: 'sop'; reason: string };
type StageVerdict = 'accepted' | 'changes-requested' | 'blocked';
```

约束：成员 id、阶段 id 各自唯一；每个引用均存在；发布后的 SOP 无环；禁止自己评审自己的产物；每阶段有输入/输出要求和有效评审人。成员可承担多个阶段。主持人可执行综合阶段，由另一位成员评审。SOP 有 1～20 个阶段，至少一个终点阶段，所有终点均纳入交付汇总；并发限制为整数 1～3，总尝试限制为整数 1～20 且不少于阶段数。`dependsOn` 表示**所引用尝试已验收**，不只是子 Agent 退出。

团队草稿可引用未发布的成员草稿；上述发布形状只允许固定发布引用。TeamRevision 在定义外保存版本 id、owner、依赖锁摘要、定义摘要、发布人/时间及编译版本，沿用现有摘要规范。额外展示字段复用已有专家详情组件约定，不进入执行身份。

| 拟新增业务方法 | 输入与结果 | 必须实现的边界 |
|---|---|---|
| `createTeamDraft` / `updateTeamDraft` | 草稿定义或 patch → 草稿 id/新 revision | update 使用 expectedRevision；允许不完整草稿，不能自动发布 |
| `getTeam` / `listTeams` | id/过滤 → 有权限的详情或摘要 | 列表按行授权，历史发布修订可读取 |
| `validateTeam` | teamId、draftRevision → issues、定义/成员依赖摘要 | 输出字段位置与修复动作；不能产生业务执行 |
| `requestTeamPublishConfirmation` / `confirmTeamPublish` / `publishTeam` | 固定预览 → 受信用户确认 → 发布回执 | 复用现有确认机制；模型不能调用受信确认；更改定义/成员使旧确认失效 |
| `prepareTeamExecution` / `createTeamExecution` | 固定 teamRevision、工作区、原生任务草稿 → plan → 主持人 Session/绑定/交接 | 重用原生任务输入，不自动发送；相同 operationId 不创建第二个任务 |
| `delegateTeamStage` | teamExecutionId、stageId、kind=`work|review`、预期业务 revision → 委派回执 | Host 根据 kind 解析执行成员或评审成员；review 必须有当前 attempt 的输出。核验路由/依赖/权限/限额，不接受模型传 preset 或原生 childId |
| `recordTeamStageReview` | delegationId、verdict、理由、结果证据引用 → 验收记录 | 仅指定评审成员的已绑定执行或获授权人工操作；原子核对 input/output 版本 |
| `getTeamExecution` / `cancelTeamExecution` | executionId → 业务记录与原生事实引用 / 清理回执 | 取消幂等；未确认停稳时显示“正在停止/待核对” |

Host 方法接收服务端建立的 actor；UI 和模型参数没有 actor/owner。变更沿用 `MutationContext`、CAS、授权、持久 operation 与同键重试规则；相同 operationId 不同 payload 拒绝。Team 扩展继续由同一个 Experts Host 服务拥有，不能各做 UI、工具两套实现。

整团发布采用一份可审阅计划，逐项列明新建成员及复用修订。因已有专家发布不承诺跨对象原子事务，团队发布回执必须保存每个成员的实际结果：某成员失败时不发布 TeamRevision，保留已创建/已发布成员及可继续的 operation；不偷偷回滚用户已发布专家。重试沿用原 operation 核对回执，禁止重新生成一批成员。聚合确认需在现有确认机制上明确绑定全部成员摘要，不能绕过原确认校验。

业务执行至少保存 `teamExecutionId`、固定 teamRevisionRef、leadSessionId、owner、operationId、route、累计尝试数。每次委派保存 `delegationId/stageId/memberId/attempt/inputRefs/outputRefs` 和原生执行引用。原生引用采用判别联合：Agent Teams 路线记录 leadSessionId/memberPath/childSessionId/消息或任务引用；workflow 路线记录 workflowRunId/childSessionId。具体类型以 TM-01 实际公开返回值冻结，**不以一个 runId 同时充当这三类身份**。

attempt 由 Host 分配：一次 work 加至多一次 review 为一个阶段尝试，重复请求复用回执；返工开启新尝试。评审失败/中断不能无限重派评审来绕过总限额。委派另存 kind，review 的结果关联原 work delegationId；主持人担任评审时在其现有 Session 中处理，不给自己创建子 Agent。单成员路由直接使用同样的绑定/授权和成果核验，单独记一次尝试，不伪造 SOP 评审记录。

## 4. TM-01：先证明最难的一条链路

### 已知事实与待证实问题

锁定 `@deepseek-ai/dsh@0.1.5-rc.1`、Cordis 4.0.2。已核对同版本发布的 `@deepseek-ai/dsh-experimental-agent-team` 与 `@deepseek-ai/dsh-experimental-tool-agent-team`；当前项目未安装。已检查服务包公开声明，`SpawnTeammateRequest` 没有 preset/setup 参数；`composeFrom` 继承父组合，不能切换成任意成员专家。公开 Agent 创建的 setup/mount 是候选接点，**尚未证明可接入原生团队及其恢复生命周期**。

现有专家 pre-step 守卫要求 Session 自身绑定与 `header.agentPreset` 匹配。因此“把成员身份写进 prompt”“关闭守卫”“读上游私有 driver 拼一个循环”都不是通过方案。

### 交付步骤与停止条件

1. 新增独立的 `examples/expert-team-probe/` 与 `scripts/probe-expert-team.mjs`（均为拟新增路径），使用临时 Harness home/Agents home/Profile 和空闲端口。先检查发布 exports/types/peer，再在隔离探针内精确安装；不操作 18989 或用户 `~/.agents`。
2. 创建两个测试专家及各自不同的固定 Skill 资源，另建主持人。只通过本产品公开服务生成专家修订；使用测试身份与现有授权方式，不手工改业务表。
3. 经官方服务启动两个真正的成员。两位成员在第一步前必须分别得到正确 preset、自己的 execution binding、正确 actor/workspace 及预期固定资源摘要；记录原生父子关系。用确定性模型适配测试区分“读取了正确资源”与模型复述角色名，普通 mock 调用计数不能代替官方 Loader/Agent 运行证据。
4. 检查 SOP 准入：前置输出未验收时，后继阶段不可委派；成员直接调用可见原生工具也不能绕开受控绑定/阶段准入。逐一列明工具提供方与公开策略接点。若只能在 prompt 中要求遵守，则本项失败；禁止先假定官方 task blockers 已承担专业验收。
5. 主持人接收结果、做一次评审，再继续下阶段；成员有一次返工，累计限额不重置。不得让一个尚未返回的工具等待同一个父 Agent 继续推理，也不生成主持人克隆来绕开等待。
6. 取消团队时只清理本次成员，保留同父另一个无关子 Agent。区分 interrupt、消息准入、结果与最终释放；确认停止后不再产生本次执行的新写入。外部写入回执未知须保留“待核对”。
7. 冷重启读取历史，不自动重派；若支持成员继续，再次验证修订/绑定/资源完整性。此版可以只提供“查看旧成果、明确创建新尝试”，不能假报自动恢复通过。

每项结果只有 `passed / failed / not-run`，附包版本、公开符号、命令、退出码、断言及清理记录；本地证据置于 `.artifacts/expert-team-probe/`，可审阅结论写入拟新增 `docs/evidence/expert-team-tm01.md`。真实模型试用另列：它衡量专业表现，不能替代确定性接口测试，也不作为无限修复所有领域样本的门槛。

**有限选型规则：**先评估 Agent Teams；发现缺口后只补有公开契约支持的最小适配。若精确成员绑定或 SOP 准入无法满足，写出具体失败接口，再评估 workflow + subagent 固定段是否同时满足要求。两条均不可行就交付明确的上游能力缺口/最小扩展建议，停止 TM-02～04 运行开发；不得静默升级、复制私有实现或拿假团队界面交差。可独立的团队草稿工作仍可按明确的新范围推进。

TM-01 完成后，把选定公开 API 的**实际 import、参数类型、返回类型、销毁方法和恢复限制**写入证据，并回填本文运行引用契约。没有这份代码级证据，文档不宣称全部接口已冻结。

## 5. TM-02～04：按竖向闭环交付

| 任务 | 实施位置及顺序 | 交付与退出条件 |
|---|---|---|
| TM-02 定义与创建 | contracts → 专家 domain/storage/service → 管理工具与 expert-manager references → 创建/详情 UI | 自然语言生成团队及缺失成员草稿；使用与编辑分开；发布预览列出成员、真实技能、阶段/依赖及交付；CAS/确认/部分发布可重试；AT-T01、T05、T06 |
| TM-03 真实运行 | 在专家 runtime 内新增团队业务适配，调用 TM-01 选定官方执行路径；Host 原生事件引用 → 业务验收 → 原生投影 | 单成员路由和完整 SOP；两位真实子 Agent 的并行、依赖、评审、一次返工；实际成果汇总；取消与历史诊断；AT-T02、T03、T04、T07 |
| TM-04 产品收口 | 复用专家中心/详情/原生任务；依据 UI-DESIGN 增加团队与阶段展示 | 可点开每位成员的真实任务及成果；加载、空、失败、待输入、待核对均有明确动作；发布/运行/取消/刷新重开实际验证，不以截图代替行为；复跑 AT-T01～T07 |

拟新增文件按职责放进现有包，例如 `src/domain/team-definition.ts`、`src/services/team-operations.ts`、`src/runtime/team-execution.ts`、`src/client/ExpertTeamDetail.tsx`；这些是拆分建议，不是新插件或另一套服务注册。通用发布/授权/摘要逻辑从现有实现抽取复用，禁止整份复制成 team 版本。

运行不变量：原生结果返回 → 校验必需输出存在/版本 → 指定评审给出结论 → 原子保存业务验收 → 后继阶段才准入。返工生成新 attempt，旧输入/结果保留；上游产物变化使依赖旧产物的验收失效。业务记录只管理这些判断，运行中的 Agent 状态仍读取 Harness 事实。

取消后的界面动作是“查看已完成成果 / 核对未决操作 / 创建新尝试”；无回执时不提供暗含盲重试的“继续全部”。专业评审只表示对产物的判断，不授予外部写入权限，用户审批继续走原生机制。

## 6. 接手者必须能写出的验收用例

| 输入/操作（Given / When） | 可断言结果（Then） | 验收映射 |
|---|---|---|
| 发布 2 人团队、唯一主持人、不同专家修订 | 固定引用及摘要可读；之后编辑原专家不改变已发布团队 | AT-T01、T06 |
| 重复 memberId、缺主持人、SOP 环或自评 | 按字段返回具体错误，零 Session 创建 | AT-T01、T05 |
| 一句话创建团队，第二个成员发布失败后重试 | 预览与回执保留；不产生重复专家；成员齐备前没有 TeamRevision | AT-T06 |
| 重复相同 operationId 创建执行；同键变更输入 | 前者返回同一 Session；后者 conflict，无第二个任务 | AT-T03、T06 |
| 指定成员只问一个问题 | 仅该成员执行，结果明确范围，不显示全团完成 | AT-T02 |
| 两个无依赖阶段开始 | 两个不同原生 childSessionId、各自正确绑定/资源；没有主持人代写的假成员结果 | AT-T02、T07 |
| 前置原生任务 completed 但业务评审 changes-requested | 下游被阻止；新 attempt 的结果通过后才继续 | AT-T05、T07 |
| 评审时输入或成果版本已变 | 旧 verdict 被拒绝；依赖关系重新核对 | AT-T04、T05 |
| 跨组织引用、撤权或绑定被篡改 | Host 拒绝新的委派/继续；不从其他账号或最新版回退 | AT-T03、T04 |
| 取消团队，旁边还有同父无关成员 | 本次工作实际停稳后才显示已停止；无关成员继续存在 | AT-T03 |
| 中断/重启，存在未知外部写入结果 | 历史仍可看；不自动重派；未决项和核对入口可见 | AT-T04 |
| 成员声称生成文件，但引用不存在或必要阶段失败 | 汇总列明缺失/失败，不能标完整成功或给假下载 | AT-T07 |

结构校验和领域单元测试使用合成数据。生命周期集成测试使用官方 Loader 和确定性模型适配；真实模型试用单列输出质量、成本及未解决项，不能混报三者的通过率。

## 7. 验证与可直接交给实现 AI 的任务

已有命令：`corepack pnpm build`、`corepack pnpm typecheck`、`corepack pnpm test:integration`、`corepack pnpm check:plan`、`corepack pnpm test:planning`。Node 使用仓库要求的 22.19+ / 24+，pnpm 10.34.5。本次只改文档，执行规划检查与 diff 检查即可；写运行代码后按受影响包检查，再做 TM-01 独立探针。不得填不存在的 `test:teams` 命令，新增命令须真的接入脚本。

实现交接任务：

> 在 WorkDSH 仓库按 TEAM-IMPLEMENTATION-HANDOFF.md 开展专家团优先切片，先同步 PLAN、ADR 和任务台账，保留 D04 未完成记录。当前只完成 TM-01：精确锁定 0.1.5-rc.1，优先验证官方 Agent Teams；使用隔离 Profile，通过公开接口使两位真实子 Agent 分别绑定固定专家修订与 Skill 资源，在现有守卫下验证第一次执行、SOP 准入、评审返回和取消。先核对公开类型，不猜 API、不改上游、不复制私有 driver、不重启用户预览。交付可运行探针、失败断言、公开接口用法和选型结论，更新 STATUS。通过后给出 TM-02 的文件级任务；失败则说明具体缺口，不用模拟界面冒充完成。不要自动推送或发布。

每个任务的交接结果都须包含：改动文件、实际命令与结果、剩余问题、下一任务的明确输入。不以“请自行研究如何接入”把核心设计重新交给实现者；唯有 TM-01 明确列出的官方接点需要以实测收敛。
