# DSH 安装与单文件草稿适配

For multi-stage work, use the available native todo_write tool to track the actual phases. Update it when a phase completes or becomes blocked, before starting the next phase; do not leave reconnaissance in progress while implementing or testing. Mark completed only after checking its result. If execution resumes after an interruption, first inspect existing drafts, files, tool receipts and tests; reconcile the plan and continue from verified work rather than restarting or claiming completion. If todo_write is unavailable, report progress in concise text without inventing tool calls.

## 安装与更新边界

制作完整资源目录和 ZIP 后，通过 WorkDSH 导入界面预检并确认安装。不要用通用文件工具直接写正式技能目录。完整资源树不走单文件草稿发布工具。

无附加资源的技能可使用 workdsh_save_skill_draft 保存，workdsh_validate_skill_draft 校验，workdsh_publish_skill_draft 发布；发布使用确切校验 revision 和 user_confirmed:true，遵从已有用户授权，不重复索取已经给出的确认。默认 shared-agents，只有明确要求时选择 profile；workspace-only 不在当前草稿工具支持范围内。

If the target already exists, read it and report the conflict. Never overwrite an unrelated skill. Installed edits use the existing management service and revision checks. Preserve the old bundle before a user-authorized replacement. Do not create another registry or edit Harness internals. The filesystem skill provider and watcher own discovery; verify the receipt before giving the exact /<name> command. Producing a ZIP is not installation or successful real-task trial.
