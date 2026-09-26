# 连接器管理

状态：**0.1 alpha 可安装，已完成真实 MCP 连接、官方凭据存储与按对话选择**。

- 实现阶段：P1
- 主任务：P1-04，详见 [开发计划](../../../docs/PLAN.md)
- 已实现：多个 stdio/Streamable HTTP MCP 实例、官方工具/资源发现、实际健康检查、运行时启停、增删改配置、官方凭据引用、能力中心页面与按会话工具隔离。
- 已验证：腾讯文档令牌写入 DSH 官方凭据服务后建立真实连接，发现 224 个工具，并在仅选择该连接器的会话中完成账号文档查询。
- 后续职责：交互式 OAuth、多账号身份切换、公共授权、安装目录与完整审计。
- 边界：成员使用权限不允许读取密钥；禁止跨账号回退。

## 开发前阅读

[规则](../../../AGENTS.md)、[状态](../../../docs/STATUS.md)、[契约](../../../docs/CONTRACTS.md)、[团队设计](../../../docs/TEAM-DESIGN.md)。

所有业务操作遵守服务端主体和组织上下文；页面与 Agent 工具调用相同领域服务。可选功能接入通过公开契约与生命周期注入。

MCP client 是一种执行适配，复用官方 stdio/Streamable HTTP 生命周期、工具发现和重连。令牌只写入 DSH 官方凭据服务，连接器配置、列表和诊断接口仅返回凭据引用或“已配置”状态。stdio 仅传显式最小 env，HTTP `Authorization` 在服务端由凭据层解析；专用 API 与 Web provider 不强制转换成 MCP。

## 验收与下一步

当前源码的随包示例通过 `@deepseek-ai/dsh-mcp-client@0.1.7-rc.2` 连接本地子进程，模型可调用 `mcp__workdsh-example__connector_status` 与 `mcp__workdsh-example__search_catalog`；官方资源工具可列出并读取 `workdsh://connector/guide` 和 `workdsh://catalog/{id}`。远程连接器使用同一个官方 MCP Client。rc.2 的工具、资源、多实例和会话隔离探针已通过，详见 [升级记录](../../../docs/DSH-0.1.7-UPGRADE-PLAN.md)；页面状态来自实际子插件与工具发现，不凭配置存在显示“已连接”。

新会话默认不选择连接器。用户在输入框的链形图标中选择后，名称显示在输入框旁，Host 在官方 `agent/created` 生命周期中只开放对应 `mcp__<server>__*` 工具命名空间。连接器的全局启用状态与当前会话选择互相独立。

完整 D05 仍须完成对应 PLAN 任务及 [验收矩阵](../../../docs/ACCEPTANCE.md) 的交互式 OAuth、多账号、公共授权、写操作确认和审计场景。本 alpha 不代表完整连接器产品已验收。

## 项目界面联动

按 [项目设计第 7 节](../../../docs/PROJECT-DESIGN.md) 实现本领域相关交互，验收 UI01—UI08 适用项。领域对象与项目关联分离，取消不提交选择，个人连接按当前主体解析。新增目录仍为 planned。

实现前必须阅读 [ADR-0007](../../../docs/adr/0007-execution-and-transfer-boundaries.md)，完成相应 B/Q 边界用例；不可只用提示词或 UI 达成权限保障。

页面及配置弹窗随 Harness 原生主题变化；文件类型图标与文档原文保留自身颜色。
