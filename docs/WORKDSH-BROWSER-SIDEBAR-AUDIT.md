# WorkDSH Desktop 浏览器侧栏能力核对

## 用户期望

在 WorkDSH 内发起 Agent 浏览器操作时，页面及操作过程应显示在当前会话右侧栏的 Browser 中，而不是另开系统浏览器。验收必须覆盖 Agent 导航、点击、页面状态更新与会话切换，不能只验证手工输入 URL。

## 官方 rc.2 的两种浏览器

- `@deepseek-ai/dsh-client-ui-sidebar-browser`：用户侧的右栏 Browser。Web 用 iframe；Desktop 用 Electron `<webview>`。官方 README 的“Model Experience”明确为 **None**，没有 Agent 工具或 Session 事件。
- `@deepseek-ai/dsh-experimental-browser-use-playwright-mcp`：Agent 侧的 Playwright MCP。`launch` 模式为每个 live Session 启动独立 Chromium，`attach` 模式连接外部 CDP 浏览器。浏览器生命周期属于 provider 和 Session，并不接入右栏 Browser。
- `@deepseek-ai/dsh-browser-use`：只注册 provider 名称，不公开浏览器页面、操作或资源接口。

这些结论来自当前固定的 `deepseek-harness` 子模块中 `packages/client/ui-sidebar-browser/README.md`、`packages/experimental/browser-use-playwright-mcp/README.md` 和 `docs/subsystems/browser-use.md`。不能用右栏已经能打开网页来证明 Agent 操作闭环。

## 本分支实现及边界

WorkDSH 自有 Electron 壳原先没有官方 Desktop Browser 所需的 preload、guest 租约和 `<webview>` 承载，HTTP(S) 弹窗直接交给 `shell.openExternal`。本分支在 beta 和正式 Desktop 包中接入与官方 `DesktopBrowserBridge` 一致的窄接口，并按官方 guest policy 限制来源、导航、权限和下载。两包的构建、类型检查与完整 `check` 已通过。

该改动只让右栏 Browser 可以使用原生 webview；**没有**把 Playwright MCP 的 Agent 浏览器接到同一页面。未做安装包 UI 实测，不能宣称用户期望已完成。主进程仍会将应用自身的新窗口 HTTP(S) 请求交给系统浏览器。

## 达成用户期望还需验证

1. 找到或设计符合官方扩展契约的 Session 浏览器页面共享方式，不能直接改上游或建立第二套 Agent loop。若采用 CDP attach，须先证明安全边界、会话独占、动态端点、登录态隔离和 Electron guest 可被目标 MCP 可靠控制。
2. 在打包后的 Windows、macOS 上创建真实会话，让 Agent 在侧栏可见页面中导航、点击，并核对侧栏状态与 Agent 工具结果是同一页面。
3. 验证会话切换、关闭侧栏、重启、失败恢复、外部链接和拒绝站点时的行为。

当前结论：右栏原生承载有进展；Agent 浏览器与右栏 Browser 共享页面的闭环未完成。
