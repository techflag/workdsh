# OFFICE-EXCEL-01：统一 Excel 工作副本

2026-09-13，用户确认继续 Excel 闭环。主线 D04 保持不变，Word/PPT 既有实现保留。

## 官方能力复用记录（编码前）

- 公开文档：https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/cookbook/adding-a-tool.md；现有 Office U1/U2 的 Connection、Storage Domain、sidebar.right.pane.tab 生命周期证据。
- 锁定包：Harness 0.1.5-rc.1，公开 defineTool/tools.execute、Storage Domain、Connection Fetch 与标准 PropsRuntime；不新增工具注册框架或传输。
- 复用：ContentService 的可信 ActorContext、workspace/owner 授权、CAS 修订、幂等收据、人工租约、审计 outbox、展示请求及官方 bash/present 文件交付。
- 编辑组件：已安装 Univer 0.25.1，公开 createWorkbook/save/setEditable/disposeUnit；ExcelJS 4.4.0 导出。已查阅锁定发布包 facade 类型，不扩展公式引擎。
- 业务差异：新增 spreadsheet 严格状态、工作表操作、范围赋值/清除、原生 Univer 实时工作副本，XLSX 导出。既有导入文件编辑不自动变成统一工作副本。
- 验收：多批提交、人工保存后读取、CAS/租约/跨主体拒绝、重开、XLSX 公式与值、既有 Word/PPT 回归。真实模型、外部 Excel/WPS 与完整视觉矩阵单独记录，未执行不得宣称通过。
