## 2026-09-13 实施范围更新

第五批已完成运行接入并通过隔离实测：one-shot 适配迁入专家插件正式生命周期（`ctx.effect` 托管注册/撤销/清理）、六项 AI 可调用受控委派工具、签收/交接/交付三闸门文件版本校验；生产路径 `--team` 退出0（7项检查全过，两位已有专家协作生成/审核/交付同一 sha256，反例均被拒）。四项 TM-01 隔离验证已全部落地为插件内实现（未发布/未安装 preview）；无第二执行器，运行事实仍归 Harness。TM-01 整体退出与 TM-02～04 准入等待用户验收；完整生产Profile、团队页面与付费模型未执行。下段为第三批历史。

第三批有限SOP已验证：专家域内部纯策略 + 测试Host装配，使用官方Tools实际调用者、StorageDomain CAS、one-shot provider与Session完成回执。评审提议不等于验收，Host在原生正常结束后核对当前正文摘要并终结；取消/撤销与预算由业务规则控制，不复制运行状态。目标Profile完整工具权限、真实文件字节版本和崩溃派发对账未验；当前仍不将测试provider安装到生产或标记TM-01整体退出。下段为第二批历史。

第二批最小one-shot适配已通过：专家域预留/一次性领取 + 公开Agent setup/mount，读取指定成员冻结Skill、原生取消隔离与历史验证成立。默认Agent Teams不能选择另一成员preset；与团队服务/工具混装的one-shot被成员检查拒绝。当前隔离验证采用独立one-shot组合，provider未装入生产；SOP准入和生产工具组合验证仍是TM-01退出条件。自有数据只保存业务准入，执行状态继续归Harness。运行路径最终签收不提前于该退出条件。

按当前用户方向由设计者执行 TM-01 隔离验证，activeSlice 已切换为 expert-team-tm01；原 Office 专项保留在 deferredSlices，未标完成。仅验证官方运行接点，D04主线与D11完整产品验收保持原状态，不据此推进TM-02～04。证据见[TM-01](../evidence/expert-team-tm01.md)。

# ADR-0020：专家团SOP复用原生协作能力，领域负责成员与验收

## 状态

Proposed，2026-09-12。依据用户本轮对专家团需求的反馈提出，供审阅；不是实现完成或D11启动记录。保留ADR-0017/0018的专家修订与功能插件交付原则。

2026-09-13再核对：官方experimental-agent-team及tool包均已发布0.1.5-rc.1。修订原先workflow唯一首选与Agent Teams固定后置的判断；TM-01优先评估官方团队公开装配，固定阶段workflow保留候选。SOP要求不变，运行方案仍未签收。

实施交接原定收敛到 TEAM-IMPLEMENTATION-HANDOFF（该文档未创建）：固定产品范围与领域方法，列明公开运行接点的探针和失败退出规则。TM-01通过后才补选定API的实际类型与生命周期，不再将历史one-shot/workflow候选当作已批准运行架构。当前仅设计，主线顺序未改变。

## 背景

专家团是多个真实专家与SOP：执行先后、并行、输入输出交接、评审、返工和完整交付。旧方案虽列出SOP字段，却主要强调主持人调用subagent，容易将执行约束退化为提示词约定，并把原生workflow误归入后续通用配置。

当前锁定Harness0.1.5-rc.1。安装的workflow与subagent能力不是现成专家团产品。phase只做呈现，原生spawn请求没有专家preset字段；composeFrom继承父组合。直接调用WorkflowEngine也不保证得到原生tool-workflow的持久呈现事件，不能用网页最新接口假定已支持。

## 决策提议

采用“固定TeamRevision与SOP → Host校验 → 官方原生协作能力 → 精确专家绑定 → 原生子Agent → 成果验收/评审 → 有界返工与汇总”。TM-01优先评估同版本官方Agent Teams，直接复用其名册、消息和任务依赖；workflow+subagent适用于固定执行段，按证据选择，不要求同时上两套调度。通用流程设计器与任意JS导入后置。

WorkDSH拥有专家/团队修订、业务授权、阶段契约和验收证据。原生底座拥有真实Agent执行、模型/工具调用、workflow运行与子Agent生命周期。业务阶段是否验收通过需要持久化；它不是第二套Agent运行状态，也不能由原生completed自动得出。

主持人负责问题澄清、专业评审和交付，在原生 workflow 段返回后的步骤选择下一分支；段内判断由受信规则或独立评审成员执行，不能让尚未返回的工具等待同一父 Agent 继续判断。不能跳必需阶段或自行扩大权限。每个成员绑定真实ExpertRevision及其固定技能，子任务使用最小必要输入。评审失败产生有限新attempt；输入变更后重新验收受影响下游，不覆盖历史失败。

首版实现路径由TM-01验证：公开Agent创建setup与agentPresets.mount能否挂精确成员组合并持久绑定；原生loop/句柄是否可完整复用；受信阶段调用授权与输出核验如何接入；Session持久事件及Conversation公开呈现如何复用。共享driver公开函数不提供preset/setup覆盖，不复制其内部逻辑。失败记录具体缺口，不能以父预设加persona冒充成员。未经验证的跨重启自动续跑不开放。

功能归属继续在专家插件团队功能内；一个TeamRevision或虚拟成员是业务对象，不各发一个代码插件。公共Skill仍由共享Skill服务管理。企业服务器/Web后台不为本地首版加入。

## 备选方案

| 方案 | 优点 | 不选择的原因 |
|---|---|---|
| 主持人prompt描述团队，直接自由委派 | 接入少、动态灵活 | 不强制依赖、真实成员身份、验收及返工，难保证完整交付 |
| WorkDSH自建通用调度器与Agent循环 | 全面自控 | 复制Harness底座，生命周期与取消/恢复成本大，违反项目原则 |
| 原生workflow加业务SOP适配（候选） | 固定阶段执行复用、业务约束清楚，可有限验收 | 需要编译/成员绑定与业务证据适配，先证明公开接口可行 |
| 官方Agent Teams（优先评估） | 原生多轮成员、持久消息、共享任务与依赖 | 同版本包已发布而尚未安装；成员preset绑定、专业验收和恢复边界需实证，实验性名称本身不是排除理由 |

## 后果与非功能约束

- 正面：顺序与评审可验证，真实专家组合不被角色名替代，不再维护第二套执行底座。
- 代价：SOP契约、受信编译、绑定和验收要维护兼容性；固定流程灵活性有限，需要明确受控变更。
- 有限资源：成员建议2～8、并发3、深度1；返工/总调用上限配置并验证。均为产品建议，不冒充官方默认值。
- 数据与安全：权限按发起主体最新状态检查，凭据不在成员间复制；共享写串行或经过真实隔离验收。可信本地插件与worker不是企业安全沙箱。
- 可观察与恢复：nativeChildRef与Session事实关联，不造假执行进度。取消持有真实run并dispose；外部写入状态未知不自动重试，重启先诊断。
- 范围：D04继续既定专业验收；D11仍todo/前置D10。团队仅TM-01～04四包，验收要求见方案第8.6节，不借架构修订启动新的产品版本。

## 依据

- [专家团技术方案第8节](../design/experts/EXPERT-TEAMS.md)：产品流程、能力复用核对与验收。
- [有限开发计划](../design/experts/DEVELOPMENT-PLAN.md)：既有TM-01～04范围。
- [官方Workflow](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/workflow)、[官方Subagent](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/subagent)。
- 锁定发布包公开声明：dsh-workflow的WorkflowEngine/WorkflowStartRequest；dsh-subagent的SubagentStartRequest；dsh-agent-presets的mount/composeFrom；dsh-subagent-in-process-driver的startInProcessRun。声明检查不是运行验收。


## 官方子系统复核后的限定

详见[专家团方案第9节](../design/experts/EXPERT-TEAMS.md)：固定SOP使用one-shot属于历史候选；多轮专家须评估原生continuable及冷恢复，不能自建Activation或inbox。实验性Agent Teams已有peer mailbox与任务blockers，不将它们视为框架缺失，但当前lock未包含，先核对兼容与装配。候选成员provider只有确认现有公开组合不能满足业务差异后才实施；continuable的prepareContinuable仅提供seed，不能沿用one-shot自定义创建假设。TM-01先输出三条路线能力矩阵和证据，再收敛最小适配。

2026-09-13 review 进一步限定见[方案第11节](../design/experts/EXPERT-TEAMS.md#11-设计复核专家子任务与原生执行的对应2026-09-13)：专家定义、SOP工作项和subagent实例分开；业务执行可关联多个有限workflow段，累计预算不重置。TM-01须在现有专家pre-step守卫下证明子Session独立绑定，并验证主持人评审返回边界；取消只清理本次关联成员，不能误伤同父无关子代理。本轮是设计修订，无运行验证，ADR仍Proposed。
