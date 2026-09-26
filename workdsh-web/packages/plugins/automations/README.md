# 自动化

状态：**规划中，尚未实现**。目录已建立，不代表功能完成。

- 实现阶段：P2
- 主任务：P2-03，详见 [开发计划](../../../docs/PLAN.md)
- 职责：多个周期任务、时区、去重、取消、运行历史。
- 边界：区别会话 Schedule；浏览器关闭不影响在线 Host，Host 停机不执行，重启按持久规则恢复。官方 Job 是进程内活跃运行表，Webhook 是无队列、重试、去重、完成状态和崩溃重放的 fire-and-forget runtime，二者都不替代本插件的 AutomationRule、Delivery、Occurrence 与 AutomationRun。

## 开发前阅读

[规则](../../../AGENTS.md)、[状态](../../../docs/STATUS.md)、[契约](../../../docs/CONTRACTS.md)、[团队设计](../../../docs/TEAM-DESIGN.md)。

所有业务操作遵守服务端主体和组织上下文；页面与 Agent 工具调用相同领域服务。可选功能接入通过公开契约与生命周期注入。

## 验收与下一步

完成对应 PLAN 任务及 [验收矩阵](../../../docs/ACCEPTANCE.md) 场景，记录真实测试证据后才更新状态。先验证公开接口，再实现；目前仅保留骨架，不声明加载入口、假工具或成功响应。

实现前必须阅读 [ADR-0007](../../../docs/adr/0007-execution-and-transfer-boundaries.md) 与 [ADR-0012](../../../docs/adr/0012-session-and-business-fact-boundaries.md)，完成相应 B/Q 边界用例；不可只用提示词或 UI 达成权限保障。Webhook 交付先持久化并以 source/delivery/rule 建立幂等键，再协调官方 Session 创建；HTTP 202 只表示接收，不表示自动化成功。
