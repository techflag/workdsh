# 资源授权

状态：**0.1 实现中**。`0.1.0-alpha.6` 提供 Host 侧资源授权、持久 grant、Session owner/runtime binding、受控 Session Host 入口、预期修订更新、撤权和官方工具流水线审计；尚未生成企业外部 Session Remote，也未接入文件与其他 Remote 入口。

- 实现阶段：P0/P1
- 主任务：P1-09，详见 [开发计划](../../../docs/PLAN.md)
- 职责：操作级资源授权与组织/项目/个人范围。
- 边界：跨组织默认拒绝；管理员不隐式读取个人内容；所有 allow/deny 均先写入 Audit，页面过滤不构成授权。

## 开发前阅读

[规则](../../../AGENTS.md)、[状态](../../../docs/STATUS.md)、[契约](../../../docs/CONTRACTS.md)、[团队设计](../../../docs/TEAM-DESIGN.md)。

所有业务操作遵守服务端主体和组织上下文；页面与 Agent 工具调用相同领域服务。可选功能接入通过公开契约与生命周期注入。

## 验收与下一步

`AccessManager` 注入 `storageDomain`、统一 `workdshIdentity` 和 `workdshAudit`，只从 IdentityService 查询成员资格。资源 owner 在有效成员关系下拥有操作权，其他成员必须命中同组织、同资源、同操作的显式 grant。grant 更新和撤销在插件内串行，并校验 expectedRevision；授权状态通过成员与相关 grant revision 的摘要返回。

`ToolAccessBridge` 使用官方 `tools/pre-execute` 做异步授权，并用最终 `tools/result` 形成结果审计；`session/flush` 和插件卸载会等待审计排空。个人 Profile 可在首次工具调用时绑定 Session，企业组合必须关闭该选项并在受信创建入口显式调用 `bindSession()`。

`SessionAccessBridge` 是 WorkDSH 内部 Host 入口：创建时先生成 Session id 并持久绑定 owner，再委托官方 `sessionController.create()`；显式 id 首次绑定前用官方 `inspect()` 拒绝采用已有但无 owner 的 Session。恢复时先按当前身份和 grant 授权，再委托 `resolveAgent()`。它不会修改或包装官方服务，也不会在本版本声明为生成式 Remote。企业组合后续必须只暴露 WorkDSH 受控 Remote，并撤下外部裸 Session Remote。

下一步生成受控 Session Remote，再将相同服务装配到文件、其他 Remote 与订阅入口，并验证成员撤权后的在途取消。完成对应 PLAN 任务及 [验收矩阵](../../../docs/ACCEPTANCE.md) 场景后才结束 P1-09。
