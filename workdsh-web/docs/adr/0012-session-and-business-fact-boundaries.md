# ADR-0012：Session 执行事实与 WorkDSH 业务事实分界

状态：Accepted
日期：2026-09-10

## 背景

DeepSeek Harness 的 Session 是追加式事件日志，也是 Agent 交互的唯一执行事实来源。官方 Persistence Catalog 已覆盖消息、工具调用与结果、命令、目标、审批、计划模式、待办列表、调度状态、工作流、子 Agent、实验性 Team、成果声明等事件。若 WorkDSH 为这些执行事实再建立一套日志，会产生恢复顺序、重放结果和审计证据不一致的问题。

这些原生事件仍不等于 WorkDSH 的项目、业务待办、企业团队、自动化规则、资料资产或业务审批。它们通常只在一个 Session 或一次运行中成立，也不携带 WorkDSH 的组织归属和资源授权语义。

## 决策

1. Agent 任务必须通过官方 Session Controller/Agent 生命周期创建和运行。禁止使用裸 `ctx.sessions.create()` 建立产品任务，因为脱离该生命周期创建的 Session 不保证挂载持久化写入器。
2. Harness Session 拥有执行事实：模型可见消息、工具调用与结果、运行步骤、原生审批、目标、工作流、子 Agent、会话标题和运行期调度等。WorkDSH 不复制这些事件为第二套执行日志。
3. WorkDSH Storage Domain 拥有业务事实：Project、WorkItem、AutomationRule、Organization、ExpertRevision、AssetRevision、业务发布/成员审批及其授权和关联。领域对象通过稳定 ID 关联 Session，不以事件序号充当业务 ID。
4. 原生 `todo/write` 是 Session 内整表式执行待办，不是项目 `WorkItem`；`schedule/change` 是 Session 内调度状态，不是跨项目自动化规则；实验性 `team/*` 是 lead Session 的协作状态，不是企业组织；`approval/*` 是工具/会话审批，不是业务发布或成员审批；`deliverables/presented` 是文件成果声明，不是资料库资产提交。
5. 成果只有在 library 校验、登记 AssetRevision 并返回业务回执后，才成为 WorkDSH 资料资产。项目再以幂等关联引用该资产；不得根据 `deliverables/presented` 自动声称资产已入库。
6. 只有需要在原生 Conversation 或 Session Projection 中重放的 WorkDSH 会话级状态才新增自定义 Session event。事件必须是 JSON、携带稳定业务对象 ID，并为未知版本明确迁移处置；仅在确认丢弃不影响恢复时使用 `ignorable: true`。
7. `session/event` 是提交后的 fire-and-forget 通知，监听器不能回滚 Session。跨 Session 与业务 Domain 的操作使用 requestId、操作记录和对账恢复，不伪造原子事务。
8. 需要读取持久化结果、导出、交接或关停前，调用官方 `flush()` 作为耐久性屏障；普通 append 成功只表示内存提交完成。
9. Session fork 只复制合法稳定前缀和执行谱系，不继承 WorkDSH 项目成员关系、资产授权或连接实例权限。fork、恢复和继续运行都重新校验主体、项目、组合与账号绑定。
10. 用户端优先通过官方 Session Controller 的可见性语义访问会话。原始 `ctx.sessionQuery` 不直接暴露给前端；在 H06 验证官方可见性策略前，WorkDSH 仍先从 RuntimeBinding/ProjectTaskLink 计算授权 Session 集合并逐项复核。

## 影响

- 项目任务可以直接复用原生 Conversation、Session Query、标题、工具结果和运行轨迹，同时保留独立的业务状态与权限。
- 自动化、专家团、项目待办、业务审批和资料库不能因存在同名或近似原生事件而省略自己的领域模型。
- 自定义事件数量应保持最小；大多数跨插件关系只保存在各自 Domain，并在任务创建时解析成模型可见输入或执行绑定。
- 业务写入失败不能撤销已提交的 Session 事件，系统必须展示待对账状态并提供幂等修复。

## 依据与待验证

依据为官方 `subsystems/session.zh.md`、`persistence-catalog.zh.md`，以及 H04 已审的 Session Projection、Session Query、Persistence、Attachment、Workspace 与 Storage 文档。P0-04/H06 仍需用锁定发布包验证 Session Controller 的授权可见性、`flush()` 时序、自定义事件兼容策略、fork 后绑定重验和成果入库对账。
