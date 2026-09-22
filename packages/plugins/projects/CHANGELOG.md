# Changelog

## 0.1.0-alpha.3 — 2026-09-22

- 侧栏「项目」行 `order` 由 20 调整为 5：按 2026-09-22 用户要求排在「新建任务（0）」之后、「助理（10）」之前。
- 与 `workdsh-bundle@0.1.0-alpha.51` 同批安装。

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
