## 0.1.0-alpha.4 — 2026-09-25

- 将项目插件按官方 DSH 0.1.7-rc.2 的公开接口重新打包。

## 0.1.0-alpha.3 — Unreleased（2026-09-22）

- 项目首页和项目会话共用＋级联菜单；保留原生编辑器、附件与发送，连接器选择限定当前任务，专家选择显式创建新任务。支持主题、键盘、窄屏与紧凑空态。
- 创建任务保存独立能力快照，显式空选择不继承默认；输入区选择不修改项目配置。
- 侧栏项目入口固定返回项目主页；项目卡片与会话归属进入独立详情路由，详情刷新保持当前项目。
- 项目主页采用无边框标题区、统一线性图标和紧凑卡片；改善文字层级与容器响应布局，适配明暗主题。
- 统一管理操作与表单：复用 Harness 原生 Button/Input，Select/Textarea 共用 workdsh-ui；声明原生 UI 依赖，保持主题与交互语义。

- 页面和配置弹窗跟随原生主题明暗变化，移除固定深色。
- 适配 DeepSeek Harness 0.1.7-alpha.1、Cordis 4.0.3，更新精确依赖。

# Changelog

## 0.1.0-alpha.2 — Unreleased（2026-09-18）

- Align with DeepSeek Harness 0.1.6-alpha.2 Client Session generations: retain the target Session (`sessions.retain` → `ready` → send → `release`) before sending a project task message, and open/switch Sessions through the official `uiWorkspace.openSession` navigation.
- Open project tasks through official Session navigation: the Session becomes current and the built-in conversation view owns messages, streaming, composer, model and permissions; remove the WorkDSH-side conversation feed, composer and run-state rendering.
- Add confirmed project archiving, archived-project filtering, and restoration while preserving project history.
- Show a project lineage chip beside the Session title for project task Sessions through the official `conversation.session.header.actions` slot; clicking it opens the project panel focused on that project, non-project Sessions render nothing.
- Cache the lineage verdict per Session in the client: header remounts reuse the first `task-context` answer instead of re-issuing the RPC on every render, misses included; lookup failures are not cached, so a transient error cannot hide the chip permanently.
- Attribute files the model delivers with the official `present` tool inside project task Sessions: import them into the Library (source=task, source session recorded) and link them idempotently as project asset references.
- Make deliverable attribution idempotent by a content digest (session + original name + bytes + attempt index) instead of tool call identity, so a repeated delivery of the same file resolves to the same Library entry; Library-side skips (unsupported format, name-conflict retries exhausted) are recorded as project activity gaps instead of log-only warnings.
- Link the project task right before the first message send: a failed Session open or an unsendable Session leaves no orphan task record, and a send failure states the created task explicitly. Selection sync now validates the service envelope before sending.
- Make project context injection fail open: a project lookup failure during `system-prompt/assemble` is logged and skipped instead of rejecting the shared assembly waterfall for unrelated Sessions.
- Remove the abort listener of the send-readiness wait on the normal path (previously one listener leaked per poll until the plugin scope aborted).
- Open the composer reference menu from a trailing `@` through keydown interception instead of comparing the previous draft's trailing character: rapid or repeated `@` keystrokes no longer leave literal characters in the draft, and a non-keyboard insertion that appends exactly one `@` still opens the menu.

## 0.1.0-alpha.1

- Add project center, project templates and persistent project workspaces.
- Add activity, planning, native task links and Library asset references.
- Add revisioned instructions and optional Skill, Expert and Connector configuration.
- Submit Project composer messages into native Sessions and reopen linked tasks from the task list.

- 未发布：项目详情以任务为默认页；阅读式计划表与公共编辑弹窗、紧凑命名配置、日期分组活动、轻量输入区；保留原生任务导航及主题。

- 未发布：任务创建时间降序；项目任务使用同名原生工作区与主体/项目独立目录，移除隐式继承全局工作区。
