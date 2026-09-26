# 审计

状态：**0.1 实现中**。`0.1.0-alpha.2` 提供 Host 侧持久审计追加与排空服务；查询授权和企业导出尚未实现。

- 实现阶段：P1
- 主任务：P1-09，详见 [开发计划](../../../docs/PLAN.md)
- 职责：身份化管理与执行审计、受限查询契约。
- 边界：不记录明文凭据和默认完整提示词；拒绝敏感引用键、重复事件 ID 和不符合 schema 的记录。

## 开发前阅读

[规则](../../../AGENTS.md)、[状态](../../../docs/STATUS.md)、[契约](../../../docs/CONTRACTS.md)、[团队设计](../../../docs/TEAM-DESIGN.md)。

所有业务操作遵守服务端主体和组织上下文；页面与 Agent 工具调用相同领域服务。可选功能接入通过公开契约与生命周期注入。

## 验收与下一步

`AuditJournal` 注入官方 `storageDomain`，使用 `workdsh_audit` per-record 领域保存不可变事件。追加操作在插件内串行，持久成功后才完成；事件保存组织、主体、requestId、动作、目标、结果与非敏感引用。`flush()` 供 Session durability checkpoint 和插件卸载等待此前追加结算。

下一步补受 Access 保护的组织审计查询、分页和导出。完成对应 PLAN 任务及 [验收矩阵](../../../docs/ACCEPTANCE.md) 场景后才结束 P1-09。
