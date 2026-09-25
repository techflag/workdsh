# 受管浏览器会话提供方

状态：0.1 开发中（任务 BROWSER-01）。目标是让官方 Playwright MCP 工具和 WorkDSH 当前会话右栏操作同一个受管 Chromium 页面。浏览器所有权和清理由官方 `SessionResources` 承担，工具接入使用官方 `McpClient`；本模块不实现第二套 Agent loop 或 MCP 传输。

目前已有可加载的 Host provider 入口。每个官方 Agent Session 分配独立临时 Chromium profile 和随机本机 CDP 端点，官方 `McpClient` 通过 `@playwright/mcp` 连接该浏览器；Session 关闭时清理进程和 profile。Host 内部的 `workdshBrowserSession` 服务可捕获 JPEG 画面并执行点击、输入和滚动，所有操作经同一 `SessionResources` 队列串行化。真实浏览器集成测试验证两个官方 Agent Session 的工具发现、分别导航、页面隔离，以及 Host 点击被 MCP 页面快照观察到。

原始 CDP 端点只保留在 Host。`/api/workdsh-browser-session` 通过官方 Connection 的已认证 Fetch 路由接收当前个人本机身份的请求，按 Session ID 再解析实时 Agent；失效 Session 和非个人身份被拒绝。真实浏览器测试证明 Remote 点击会被 Agent 的 MCP 快照看到。该规则只覆盖个人本机部署，团队身份还没有会话归属授权，不能启用同一路由。

模块已有基于官方 `sidebar.right.pane.tab` 的 Client 组件，按当前 Session 拉取同页 JPEG 并把点击、键盘和滚动送回 Host；仅在浏览器工具实际使用后尝试自动打开。组件已构建，但尚未装入默认 bundle，也未做浏览器实机视觉/交互验收。用户明确要求 Desktop 不额外打包浏览器。Desktop 已有隔离 worker 入口，可复用 Electron 自带 Chromium；本模块新增 `electronExecutable` 路径按 Session 启动该 worker，并保留 Web 的外部浏览器路径。开发态 Electron worker 与 Playwright 连通、导航和点击探针通过，安装包尚未验证。正式接入前还须验证取消/恢复、并发工具调用、真实 HTTP Connection 准入、不同视口与键盘输入，以及 Windows/macOS 安装包内的 worker 启动。现阶段不得将其描述为已完成的浏览器侧栏体验。

官方能力复用记录与探针结果见 [rc.2 升级记录](../../../docs/DSH-0.1.7-UPGRADE-PLAN.md)。
