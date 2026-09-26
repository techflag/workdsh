## 2026-09-15：官方 Team 替换自有专家团（用户明确授权）

用户要求直接废弃自有专家团执行实现。当前专项改为：移除 TeamRunsManager、SOP 运行状态机、workdsh_expert_team_* 工具和 workdsh-expert one-shot provider；以 0.1.6-alpha.1 官方 Agent Teams、九项工具及官方 Web 团队面板实现。角色/技能/WorkBuddy 导入和已发布专家内容保留为资产配置，协作场景作为工作指导，运行事实仅由官方 Session 日志和 Team 拥有。旧运行数据保留原地，不再续跑旧调度器；新任务使用官方 Team。公开查询缺陷单独实测和修复，不再作为保留旧执行器的理由。

复用：发布包 @deepseek-ai/dsh-experimental-agent-team、dsh-experimental-tool-agent-team、dsh-experimental-client-ui-agent-team；公开 agent/created、agentTeams.tryMembership 和 Agent 局部 persona/skill-filesystem 组合。已有 V1 证据包含并行、角色/技能隔离、fresh/fork、未知成员拒绝、中断和冷恢复；本次必须补生产插件测试，不能用独立探针替代。保持原有资产授权，禁止复制上游实现或增加团队运行表。未验收完整真实模型业务，不对其宣称完成。

# 专家与专家团：开发交接文档

## 2026-09-14 当前状态校正

专家与专家团运行及制作已有实现并公开alpha；8包官方Web Profile生命周期验证已通过。TM-01真实模型完整业务流程、旧任务恢复、最新长任务成员状态及整体验收仍有缺口。下方“创建页面本批不做/未安装/仍为设计”是早期批次范围，不表示后续专家制作与团队委派未实现。 当前有效台账见[STATUS](../../STATUS.md)。本次不恢复开发或推进验收。

## 历史批次记录

当前进度：[TM-01 第五批运行接入实测通过](../../evidence/expert-team-tm01.md)：one-shot 适配已迁入专家插件正式生命周期、六项 AI 可调用受控委派工具、签收/交接/交付三闸门文件版本校验；生产路径 `--team` 退出0（两位已有专家协作生成/审核/交付同一 sha256，跳步/漂移/取消/重复调用均被拒）。前三批（公开one-shot成员适配、有限SOP、目标Profile组合与文件版本回执）保持通过；团队创建页面、完整生产 Profile 安装与真实付费模型未执行，TM-01 整体退出与 TM-02～04 准入等待用户验收。

**团队开发从 [TEAM-IMPLEMENTATION-HANDOFF](TEAM-IMPLEMENTATION-HANDOFF.md) 开始。**它收敛本版范围、已有代码位置、拟新增契约、TM-01 探针、TM-02～04 顺序和验收用例；以下研究记录用于追溯，不再要求接手者从历史候选中自行拼装方案。当前按顶部实测及实施入口推进TM-01；台账已登记优先验证切片，不假报其他模块完成。

2026-09-13 最新材料与选型补充见[方案第12节](EXPERT-TEAMS.md#12-workbuddy-整团创建与官方-agent-teams-再核对2026-09-13)：支持从需求生成整团及成员草稿；官方experimental Agent Teams同版本包已发布，优先评估其原生协作公开面，再与固定workflow路线取舍。当前仍为设计，无Profile安装或团队运行证据。

2026-09-13 专家团设计 review 见 [方案第11节](EXPERT-TEAMS.md#11-设计复核专家子任务与原生执行的对应2026-09-13)：明确专家/工作项/subagent/workflow关系，补主持人评审返回边界、子Session自身绑定与局部取消要求；无团队运行通过声明。

2026-09-13 补充：[WorkBuddy 专家需求与技术复核](WORKBUDDY-REASSESSMENT.md)。当前 D 已有真实模型场景证据，AT-27 仍有两处异常数据专业判断缺口；以下早期状态按历史记录阅读，最新顺序见开发计划末尾。复核强调场景分流、完整参考资源、实际交付和验证范围，不新增执行器。

本轮需求基线为 **PRD 1.1**：Skill＝能力，专家＝能力＋领域经验与专业判断，专家团＝多专家＋SOP。优先阅读 [需求修订与开发计划](DEVELOPMENT-PLAN.md)。本轮只更新文档；D04 0.1 继续 in_progress，D11 仍后置。新增验收未执行，不以 46 项集成通过宣称专业交付完成。

日期：2026-09-12 · 设计基线：1.1 · 状态：方案已整理，待实施验证。**不是功能已交付声明。**

本包面向接手 WorkDSH 的开发者及其他编程工具。用户要求参考 WorkBuddy 的专家详情、专家团详情和对话式制作专家，同时遵守 DeepSeek Harness 官方规范。本文档属于 **`workdsh` 仓库**，不属于 `dsh-ssh-desktop`；两者包管理器、上游接入方式不同，不能混用。

当前实施状态补充（2026-09-12）：D04 A+B的真实配备技能/使用详情和C的对话创建指南/完整已保存发布前预览已有候选实现；47/47集成、真实独立包浏览器与两次冷重启通过。D实际模型专业场景及E稳定性收尾仍未完成。见[当前状态](../../STATUS.md)与[修复证据](../../evidence/d04-experts-review-fixes.md)。下表及后文“本次不修改业务实现”等陈述属于原始设计交接时点，不覆盖当前实施状态。

## 1. 交付范围与结论

| 对象 | 本包交付 | 实施范围 |
|---|---|---|
| 单专家 | 需求、界面、领域契约、运行绑定、验收方案 | 当前 D04 / P1-02，专家模块 0.1 |
| 专家团 | 成员、主持人、协作、执行状态、失败恢复完整设计 | D11 / P2-01、P2-02，后续实现；仍归专家插件 |
| 公共专家/组织分发 | 接口边界和后续事项 | 企业服务器 + 管理 Web 阶段；当前不建市场 |
| 代码 | 当前实现审查与明确缺口 | 本次不修改业务实现、不升级依赖、不宣布专家已完成 |

专家是“专业角色、方法、能力依赖与交付要求”的可复用定义；专家团是由多个已发布专家加 SOP（阶段、依赖、并行、交接和评审）组成的真实协作配置。专家不是一个 npm 包，也不等于一段每次临时粘贴的提示词；专家团不能用单个 Agent 扮演多个名字冒充执行。

**本轮范围选择：单专家先形成能创建、发布、使用、编辑和恢复的闭环；专家团设计先齐备，代码按既有 D11 顺序实施。** 不因本次文档跨两个主题就新增一个插件或提前开展企业开发。

## 2. 阅读顺序

**先读 [插件真实性与交付边界复核](PLUGIN-DELIVERY-REVIEW.md)**：Skill 独立安装与共享本地服务已完成；其余规划功能不能由此推定已交付。专家实施仍须补标准入口、配置装配和自己的独立制品验收。

同时阅读 [ADR-0018：独立插件与共享技能](../../adr/0018-composable-feature-plugins-and-shared-skills.md)。专家包含技能表示引用共享对象；包安装依赖、运行服务依赖和对象修订引用分别校验，不能把独立插件理解成互无依赖或可任意卸载。

1. [需求 PRD](PRD.md)：用户目标、范围、稳定需求编号、成功指标。
2. [交互与视觉规范](UX.md)：逐一对应三张参考图，页面状态和原生任务框交接。
3. [技术方案 HLD](HLD.md)：所有权、依赖复用、持久化、不可变运行组合、恢复边界。
4. [拟新增领域契约](CONTRACTS.md)：数据对象、方法语义、错误、确认、幂等、导入格式。
5. [专家团方案](EXPERT-TEAMS.md)：后续真实协作机制与不同运行模式的边界。
6. [开发包与验收](IMPLEMENTATION-AND-ACCEPTANCE.md)：有限步骤、验证关卡、停止条件和完成标准。
7. [官方依据与现状核对](REFERENCES.md)：来源、已验证事实、尚未验证假设、审查结论。

机器可读交接：[专家定义 Schema](expert-definition.schema.json)、[原创默认专家示例](example-expert-definition.json)。两者是设计制品，未注册为运行能力。

决策依据：[ADR-0017](../../adr/0017-expert-definition-and-runtime-binding.md)；专家团SOP新增[ADR-0020提议](../../adr/0020-expert-team-sop-on-native-workflow.md)与[具体执行方案第8节](EXPERT-TEAMS.md#8-落地架构专家执行工作sop约束协作)。仓库约束以 [AGENTS](../../../AGENTS.md)、[官方开发规范](../../HARNESS-OFFICIAL-DEVELOPMENT.md)、[架构](../../ARCHITECTURE.md) 为前提。

## 3. 接手时的真实基线

本次核对源码基线为 `5225e42`。接手者需重新检查 `git status` 与 HEAD，不能假设后续没有变化。

- 专家目录只有规划 README，没有可加载 Host/Client 实现。
- `workdsh-contracts@0.1.0-alpha.5` 已导出治理契约和 `./skills` 本地管理契约；Skill alpha.24 已独立交付。当前工作区已声明 ./experts 与 ./skill-revisions 子路径，并有候选实现；contracts 仍是 private 包，仓库外声明消费尚待验收。本文件的候选接口、团队 SOP 和全部恢复语义不能当作已发布 API；以 package.json exports、类型和实际证据为准。
- 本地 identity/access/audit、Session 受控入口、原生工作台、Skill 管理和共享 Modal 已存在。
- Skill 管理具备正文/资源管理、冲突摘要、启停和可恢复卸载；**尚不能据此声称已具备业务不可变 SkillRevision、专家依赖快照租约或全入口多用户授权**。
- 当前锁定 `@deepseek-ai/dsh-*@0.1.5-rc.1`、Cordis `4.0.2`；新版本网页不能替代锁定版本的 exports、声明和探针。
- 专家团相关文档中出现的实验性 Agent Team 不在当前 lockfile 中；原生 subagent/workflow 的存在也不证明 WorkDSH 的团队适配已完成。

## 4. 可直接给开发工具的任务说明

> 请在 WorkDSH 仓库中实施 D04 专家模块 0.1。先读 AGENTS.md、docs/STATUS.md、docs/development-order.json 和 docs/design/experts/README.md，再按该目录 PRD、UX、HLD、CONTRACTS、IMPLEMENTATION-AND-ACCEPTANCE 实施。保持专家团 D11 和企业管理 Web 后置。
>
> 先对照 STATUS 和 evidence，复用已完成 EP-01 等公开接口验证，核对仍缺证据的项目；特别验证 persona 的作用域、不可变 preset、绑定 Session 的所有恢复入口、明确声明的 Skill 依赖快照、原生 draft 交接及外部包 Remote。失败时按文档给出有限替代或明确阻断，不改上游、不私自升级、不用假数据兜底。
>
> 按 PRD 1.1 与 DEVELOPMENT-PLAN 的 A+B→C→D→E 完成剩余 EP-02～EP-07，不重做已有证据，不新增专家 0.2。UI 用独立 TSX 组件，共享弹框来自 workdsh-ui；Host 领域服务是 UI 和 Agent 工具唯一写入口。专家管理工具不直接写文件，不接受客户端伪造主体，发布需要绑定精确内容的真实用户确认。复用原生 Session、模型、权限、附件、/ 与 @；点击示例、召唤或创建仅准备草稿，不自动发送业务请求。
>
> 保留原有 Skill 全局能力、工作区与会话功能。任何“已完成”声明必须对应验收编号、命令结果和真实打包界面证据。完成 EP-07 后停止 D04，不自行增加“下一步”。仅依据新需求或验收失败扩展范围。

## 5. 使用文档的规则

- “需求”表示目标；“已存在”必须有源码或证据链接；“建议/待验证”不是官方 API 承诺。
- 本包规定核心行为与默认决策。实现可以调整内部文件组织，但改变范围、运行语义、权限或版本边界必须更新 ADR/PRD 和验收映射。
- 用户截图仅作交互参考；不得将 WorkBuddy 头像、案例、用量数字和商标当 WorkDSH 自有内容。
- 文档采用 Markdown，便于仓库审查和编程工具读取；截图随包保存，避免依赖临时目录。

2026-09-13 下一步专家团规划见 [EXPERT-TEAMS 第10节](EXPERT-TEAMS.md#10-下一步专家团规划2026-09-13)：WorkBuddy 参考取舍、创建至交付旅程、TM-01～04有限实施及验收终点。仅规划，D11仍todo，未执行运行探针或改变主线顺序。
