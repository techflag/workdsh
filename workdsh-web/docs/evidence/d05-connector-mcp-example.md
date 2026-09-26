# D05 连接器：真实 MCP 示例

## 官方能力复用记录（编码前）

- 任务：在 WorkDSH 能力中心提供第一个可运行的连接器示例，显示真实状态，并能在会话中调用。
- 官方依据：`https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/user/guide/mcp-memory.md`、`node_modules/@deepseek-ai/dsh-mcp-client/README.md`、`node_modules/@deepseek-ai/dsh-mcp-resources/README.md`，锁定版本 `0.1.6-alpha.1`。
- 复用入口：每个 MCP Server 由一个 `@deepseek-ai/dsh-mcp-client` Cordis 子插件连接；官方插件拥有 stdio/Streamable HTTP、工具发现、`mcp__<server>__<tool>` 命名、调用、重连和卸载清理；`@deepseek-ai/dsh-mcp-resources` 继续拥有资源发现与读取工具。
- WorkDSH 边界：`workdsh-plugin-connectors` 只拥有连接器定义、展示元数据、启停请求、状态投影和能力中心页面。示例 MCP 子进程提供确定性的业务目录数据，不复制 MCP Client、ToolRuntime、Agent loop 或资源运行时。
- 状态口径：只有官方 MCP Client 初次连接与工具同步完成，且 ToolRuntime 中存在该实例的限定工具名，页面才显示“已连接”。配置中存在或工具曾经出现都不算 ready。
- 安全边界：示例不需要凭据；stdio 使用 `process.execPath` 和随包脚本的绝对路径，`env` 为空，保持官方凭据清理。后续 HTTP/账号连接器必须接凭据引用，不能把 header 或 token 送到 Client。
- 验收：正例启动后发现并执行示例工具，列出并读取固定资源和 URI 模板；反例停用后工具消失、调用失败；重新启用后恢复；插件卸载后子进程和工具清理。浏览器页面必须显示与 Host 一致的状态、工具数和资源能力。
- 本轮范围：这是用户明确要求的 D05 前置真实样例，不代表多账号、个人/公共授权、密钥、市场安装和完整 D05 已验收。

## 实现结果

待编码与验证后填写。
