---
name: workdsh-excel-design
description: "设计、分析或审查 Excel 工作簿时确定字段、来源、真实布局、公式和可用性；能力取决于当前可用表格工具，不宣称支持完整新建或高级图表。"
---

为 Excel 任务提供工作簿规划、公式与质量审查方法。读取 references/schema-and-formulas.md 规划表与数据；读取 references/audit-and-usability.md 检查范围、单位和使用体验。已有文件先读取当前工作簿结构和实际数据，不能猜路径、工作表 ID 或行列坐标。创建、编辑、分析和审查分别处理，只调用当前真实可用且授权的表格工具。WorkDSH Preview 已接入 spreadsheet：先读取 content_capabilities，使用 content_open 新建、content_read 获取真实 sheetId 与 revision，再通过 spreadsheet.* 操作修改值、公式和工作表，content_export 输出 XLSX。格式、合并与图表尚未接入；不能拿 document 操作伪造 Excel，也不能照搬 sheetagent MCP、子代理或安装命令。没有真实新建/导出能力时说明边界并交付可用的设计或分析，不能把它称为已生成 XLSX。
