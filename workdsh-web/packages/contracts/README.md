# 领域公开契约

状态：**0.1 契约实现中**。当前 `0.1.0-alpha.9` 提供身份 Profile/Service、成员查询、组织、资源归属、授权、Session owner、运行绑定和审计的纯 TypeScript 契约及受信边界校验。

新增 `workdsh-contracts/skills`：`SkillManagementService`（`contractVersion: 1`）、现有本地管理 DTO 和 `SkillDependencyInspector`。Skill Host、页面和其他插件共享这一类型源，不横向导入功能内部实现。此子路径仅定义受信本地 Host 契约，不增加 Cordis/React/数据库依赖；业务不可变 SkillRevision、专家执行快照和企业授权仍待相应模块实现。

- 实现阶段：P0
- 主任务：P0-04，详见 [开发计划](../../docs/PLAN.md)
- 职责：按领域导出服务类型、对象引用和诊断；包含身份/授权上下文。
- 边界：无 UI/数据库实现；无万能 CRUD 服务；ActorContext 必须由 Host 身份提供方解析，不能接收客户端或模型自报身份。

## 开发前阅读

[规则](../../AGENTS.md)、[状态](../../docs/STATUS.md)、[契约](../../docs/CONTRACTS.md)、[团队设计](../../docs/TEAM-DESIGN.md)。

所有业务操作遵守服务端主体和组织上下文；页面与 Agent 工具调用相同领域服务。可选功能接入通过公开契约与生命周期注入。

## 验收与下一步

本地 identity、access 和 audit 已消费本包接口，并完成受控 Session Host 入口和官方工具流水线的首个治理接入；下一步生成受控 Session Remote，再接文件和其他 Remote。完成对应 PLAN 任务及 [验收矩阵](../../docs/ACCEPTANCE.md) 场景后才完成 P0-04/P0-05。企业 Skill 架构见 [ADR 0015](../../docs/adr/0015-skill-control-plane-and-runtime-projection.md)。
