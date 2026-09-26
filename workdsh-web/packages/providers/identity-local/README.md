# 本地身份提供方

状态：**0.1 实现中**。`0.1.0-alpha.6` 已提供可信单用户 Profile 的 Cordis Host 服务，并通过 Harness 官方 Storage Domain 持久化身份、个人组织和 owner 成员关系；统一成员查询供 Access 消费。

- 实现阶段：P0/P1
- 主任务：P0-05，详见 [开发计划](../../../docs/PLAN.md)
- 职责：默认个人组织与可信本地主体，多主体测试。
- 边界：主体和个人组织来自 Host 配置，输入只能附加 Host 已验证的 session/run 关联；Client、Remote、模型和工具均不能选择主体或组织；无免鉴权远程部署模式。

## 开发前阅读

[规则](../../../AGENTS.md)、[状态](../../../docs/STATUS.md)、[契约](../../../docs/CONTRACTS.md)、[团队设计](../../../docs/TEAM-DESIGN.md)。

所有业务操作遵守服务端主体和组织上下文；页面与 Agent 工具调用相同领域服务。可选功能接入通过公开契约与生命周期注入。

## 验收与下一步

插件声明 `storageDomain` 为必需依赖，在 `Service.init` 打开 `workdsh_identity_local` 领域，并把三个相互关联的对象放入同一原子 global 记录。首次启动以 Host 配置建立记录；后续启动要求配置与持久记录一致，防止同一数据目录被静默切换为另一主体或组织。Harness 的匿名安装 ID 只用于遥测关联，官方明确不能作为用户身份，本包不会复用它充当 principalId。

下一步实现 access/audit 服务并完成双主体、双组织与撤权负例；团队远程入口在这些证据完成前保持关闭。
