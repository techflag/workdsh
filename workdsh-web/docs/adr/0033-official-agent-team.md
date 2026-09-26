# ADR-0033：官方 Agent Teams 拥有专家团执行

状态：已决定（用户 2026-09-15 明确要求）。

## 2026-09-15：官方 Team 替换自有专家团（用户明确授权）

用户要求直接废弃自有专家团执行实现。当前专项改为：移除 TeamRunsManager、SOP 运行状态机、workdsh_expert_team_* 工具和 workdsh-expert one-shot provider；以 0.1.6-alpha.1 官方 Agent Teams、九项工具及官方 Web 团队面板实现。角色/技能/WorkBuddy 导入和已发布专家内容保留为资产配置，协作场景作为工作指导，运行事实仅由官方 Session 日志和 Team 拥有。旧运行数据保留原地，不再续跑旧调度器；新任务使用官方 Team。公开查询缺陷单独实测和修复，不再作为保留旧执行器的理由。

复用：发布包 @deepseek-ai/dsh-experimental-agent-team、dsh-experimental-tool-agent-team、dsh-experimental-client-ui-agent-team；公开 agent/created、agentTeams.tryMembership 和 Agent 局部 persona/skill-filesystem 组合。已有 V1 证据包含并行、角色/技能隔离、fresh/fork、未知成员拒绝、中断和冷恢复；本次必须补生产插件测试，不能用独立探针替代。保持原有资产授权，禁止复制上游实现或增加团队运行表。未验收完整真实模型业务，不对其宣称完成。


旧 ADR-0020 的自有 SOP 执行/验收状态机不再用于运行；专业成果检查由专家技能指导并使用官方任务与文件工具。此变更不清除用户资产、旧日志或既有数据。旧持久化业务运行不冒充官方 Team，也不静默重放。
