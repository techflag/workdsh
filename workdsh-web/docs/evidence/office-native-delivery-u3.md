# Office 原生文件交付卡有限验收

日期：2026-09-12，OFFICE-AI-01/U2—U3 前置。用户要求复用 Harness 原生文件卡，删除自制成果卡。

## 官方能力复用

依据锁定 rc.1 ui-deliverables README.zh.md、公开入口/types，镜像 persistence-catalog 的 deliverables/presented 和 tool-catalog 的 present/bash。FileSystem 公开接口仅 writeText，没有二进制 writeBytes；最小桥接通过 tools.execute 嵌套官方 bash/present，复用 scope/沙箱审批/取消，二进制不走 Host 裸文件写入。没有私有导入 PresentedFileCard，也没有复制卡片代码。

content_export 读取授权下最新保存文档，使用与右侧下载共用的 DOCX codec。固定 Node 写入程序，标题清理后与 UUID 形成文件名，并经 base64 编码进入程序；正文仅作为 DOCX base64 数据。wx 独占创建，不覆盖文件。实际 agent 传入 tools.get(name, agent)，避免将全局工具表误认为会话可见表。返回成功需写入成功标记及官方 present 成功回执。官方工具结果通知拥有真实 deliverables/presented 事件，官方 turnTail 拥有文件卡片/图标/布局/菜单/刷新恢复。

## 验证

Office typecheck/build 通过；两份集成测试最终共7项通过，新增工具链委托、实际 DOCX 字节可读取、标题含引号/命令符安全、失败写入不交付与缺能力拒绝。删除自制投影及对应测试，不把过期投影测试当作原生卡验收。

隔离预构建 Profile 验证六工具可见、实时自动打开、分批更新、人工修改、跟随/暂停、下载最新修订、重载与富格式。真实模型调用 content_open/content_edit/content_export，无 officecli/字体研究绕行；实际文件 ZIP 的标题/分析目标/行动建议可读，官方日志有 deliverables/presented，原生文件卡出现并刷新恢复，自制卡不存在。截图位于 .artifacts/office-live-real/native-deliverable.png。卡片打开测试使用公开文档说明的卡面预览手势，不调用 Host 默认应用或文件管理器，不启动图形应用。

试验中首个样本查找全局 bash/present 导致误判缺能力，已修正为会话作用域查找。另一短文样本单次写入完成报告，未通过分批判据；明确多章节至少两次提交后样本通过。失败记录不视为成功验收。

## 实际边界

原生卡打开的是导出实际文件；实时工作副本继续独立可编辑/下载。导出文件为当时保存修订，后续修改不会静默同步文件。当前需要 Node/bash/present，最大1 MiB，无本地 Office/LibreOffice或服务器转换。普通写入策略拒绝时不提升权限。写入成功但 present 失败提供已有路径重试 present；未知写入结果、幂等导出收据、中断/卸载恢复仍待 U3 完整实现，不能宣称全量 U3 完成。

旧文档数据未删除；不自动为历史轮次伪造交付日志，已有文档可请求 AI 再导出。原生卡没有我们自制的独立下载按钮，浏览器下载沿用右侧工作副本/文件预览。表格/图片/DOCX 保真导入、Word/WPS 分页与其余七类未完成，全仓回归未执行。未提交/推送/发布。

最终真实模型预构建探针14项全部通过、浏览器异常为空：修订0约2.2秒、首批约4.4秒、后续约6.5/7.5/10.8秒；原生卡使用可访问的“Preview 路径 in sidebar”按钮打开，Word iframe 显示正文，导出副本下载成功，刷新卡片恢复。新版已通过官方 CLI 安装到项目 preview。

预览18989已重启，用户可刷新应用测试；未修改用户原件或其他 Profile。

实际 preview 重启揭示富格式读取 schema 遗漏：service 原有严格 run/block schema 拒绝 style；现改为共享 runInput/blockInput 的 safeExtend，保留校验与格式数据。新增真实存储→完整 Host 卸载/重建→富格式与修订还原测试通过。没有删除或清理用户文档来规避启动失败。
