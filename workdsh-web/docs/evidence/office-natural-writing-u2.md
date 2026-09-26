# Office U2 普通自然语言写作验收

2026-09-12，workdsh-plugin-office 0.1.0-alpha.1，Harness rc.1。

用户日志第一轮工具缺失、第二轮工具已可见但加载 officecli，因此补 Office 自身的公开 systemPrompt.section 增量写作规则（非 persona 替换）。对应决策 ADR-0024 修订5，复用记录 U1-IMPLEMENTATION 的 U2 段。无新 Agent loop、模型路由或 MCP。

## 验证

- Office typecheck/build、服务集成2项通过；卸载同时清理写作规则。
- `node scripts/probe-office-live.mjs --real-model`：7项原生工具/UI场景 + 1项真实模型通过；临时官方web Profile，独立Office+治理预构建包+仅测试诊断插件。
- 真实场景复制既有 officecli Skill 到隔离技能目录，发送“请写一份门店经营分析报告，约200字，包含分析目标、问题分析和行动建议。没有实际数据的地方标明待确认。”没有指定工具名称。使用公开 Agent.send 提交普通 user message、Session.snapshotEvents 检查工具调用元数据，不读/导出模型推理。
- 排除本场景开始前其他文档的 ID，验证新工作副本。最新样本：修订0 3273ms、修订1 5521ms、修订2 7634ms、修订3 10810ms；结束 status=idle。工具调用顺序 content_open 后4次 content_edit；无 bash/skill/write/edit 文件绕行。修订与调用次数不同，不把调用当作提交。
- 截图已人工查看，右侧原生正文显示章节与段落，无额外片段编辑表单。

原始结果 `.artifacts/office-live-real/result.json` / `real-result.json`，截图 `real-document.png`；临时凭据已删除且不进入工作区、命令参数或制品。非真实模型模式不读取凭据，既有用法不变。测试诊断 send/state 端点不进入产品插件。

## 限制与下一步

此次仅标准模式短报告及已有确定性人工编辑/续写验证。不是全部模型、长报告、专家/PTC、系统IME或Word文件保真验收。当前每批提交刷新，非逐token写入。报告事实与业务专业性需要单独验收，不能凭内容显示断言分析正确。表格、DOCX导出/重开与失败恢复留在后续任务，不以 Markdown 文件代替 Word 交付。没有提交/推送/发布。
