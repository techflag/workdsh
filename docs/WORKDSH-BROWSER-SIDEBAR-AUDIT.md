# WorkDSH Desktop 浏览器侧栏能力核对

> 历史实验记录，来自提交 `c726ebb490c2`。实验代码未并入 Desktop：它只提供原生右栏承载，未实现 Agent 与右栏同页操作，且存在设置/账号兼容与安装包验证的发布阻断。本文保留判断依据，不代表当前产品已启用该能力。下文“本分支”均指原实验分支。

## 用户期望

在 WorkDSH 内发起 Agent 浏览器操作时，页面及操作过程应显示在当前会话右侧栏的 Browser 中，而不是另开系统浏览器。验收必须覆盖 Agent 导航、点击、页面状态更新与会话切换，不能只验证手工输入 URL。

## 官方 rc.2 的两种浏览器

- `@deepseek-ai/dsh-client-ui-sidebar-browser`：用户侧的右栏 Browser。Web 用 iframe；Desktop 用 Electron `<webview>`。官方 README 的“Model Experience”明确为 **None**，没有 Agent 工具或 Session 事件。
- `ui-chat` 的普通 HTTP(S) 消息链接默认可按 `linkOpening: sidebar` 打开该右栏；这只处理用户点击聊天链接，不会接管 Agent 的导航、点击和页面状态。将链接偏好设成侧栏不能满足同页操作验收。
- `@deepseek-ai/dsh-experimental-browser-use-playwright-mcp`：Agent 侧的 Playwright MCP。`launch` 模式为每个 live Session 启动独立 Chromium，`attach` 模式连接外部 CDP 浏览器。浏览器生命周期属于 provider 和 Session，并不接入右栏 Browser。
- `@deepseek-ai/dsh-browser-use`：只注册 provider 名称，不公开浏览器页面、操作或资源接口。

这些结论来自当前固定的 `deepseek-harness` 子模块中 `packages/client/ui-sidebar-browser/README.md`、`packages/experimental/browser-use-playwright-mcp/README.md` 和 `docs/subsystems/browser-use.md`。不能用右栏已经能打开网页来证明 Agent 操作闭环。

## 本分支实现及边界

WorkDSH 自有 Electron 壳原先没有官方 Desktop Browser 所需的 preload、guest 租约和 `<webview>` 承载，HTTP(S) 弹窗直接交给 `shell.openExternal`。本分支在 beta 和正式 Desktop 包中接入与官方 `DesktopBrowserBridge` 一致的窄接口，并按官方 guest policy 限制来源、导航、权限和下载。两包的构建、类型检查与完整 `check` 已通过。

该改动只让右栏 Browser 可以使用原生 webview；**没有**把 Playwright MCP 的 Agent 浏览器接到同一页面。未做安装包 UI 实测，不能宣称用户期望已完成。主进程仍会将应用自身的新窗口 HTTP(S) 请求交给系统浏览器。

**发布阻断：**官方其他 Client 插件以 `dshDesktop` 是否存在来切换整个 Desktop 体验，而不只检查 `browser` 子接口。例如 `ui-settings-models` 会关闭 Web 凭据引导，`ui-settings-account` 会启用 Desktop onboarding。当前 WorkDSH 壳只暴露了 Browser lease，缺少完整官方 Desktop 契约；直接合并会有账号/设置回归风险。正式方案需采用官方完整 Desktop 宿主或经公开接口提供完整兼容桥，且做设置、账号、快捷键与浏览器回归。此分支应保持实验状态，不进入现有安装包发布线。

另一个宿主差异：当前发布入口 `dsh-plugin-desktop/src/workdsh-main.ts` 加载带 token 的 `http://127.0.0.1` 页面；官方 `apps/desktop/src/preload-app.ts` 只向 `dsh-app://app` 主文档暴露完整 `dshDesktop`，IPC 也按该来源校验。简单移植官方 preload 或只打开 `webviewTag` 无法让现有 Web 页面获得同等能力，必须先确定受信任的应用来源和完整宿主契约。当前发布入口的 `setWindowOpenHandler` 仍将 HTTP(S) 新窗口交给系统浏览器。

当前发布入口还显式使用 `BrowserWindow` 的默认 `webviewTag: false`，没有 preload，并在 `setWindowOpenHandler` 中对所有 HTTP(S) 新窗口调用 `shell.openExternal`。因此即使 Web Profile 已启用右栏 Browser，打包版只得到 Web iframe 承载；用户在聊天中的普通链接可进侧栏，但需要新窗口的网站及 Agent Playwright 浏览器仍会离开或独立于这个承载。下一次宿主改造必须以打包版验证，不能用 Web 预览结果代替。

## 达成用户期望还需验证

1. 官方公开的 `@deepseek-ai/dsh-experimental-browser-use-runtime` 可供自有 Browser provider 构造 `SessionResources`，复用官方的 live Agent 所有权、串行操作和清理；`browser-use` 服务仍只注册提供方名称。这是可继续验证的扩展点，但不自动提供 Electron guest 操作接口或侧栏事件。不能直接改上游或建立第二套 Agent loop。若采用 CDP attach，须先证明安全边界、会话独占、动态端点、登录态隔离和 Electron guest 可被目标 MCP 可靠控制。
2. 在打包后的 Windows、macOS 上创建真实会话，让 Agent 在侧栏可见页面中导航、点击，并核对侧栏状态与 Agent 工具结果是同一页面。
3. 验证会话切换、关闭侧栏、重启、失败恢复、外部链接和拒绝站点时的行为。

当前结论：右栏原生承载有进展；Agent 浏览器与右栏 Browser 共享页面的闭环未完成。
