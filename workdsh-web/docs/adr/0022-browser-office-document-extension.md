# ADR-0022：Office 浏览器编辑扩展接入原生文件 Tab

状态：按用户明确授权实施，范围为基础接入；完整 Office 编辑未签收。日期：2026-09-12。

用户禁止服务端 Office 转换、停止额外公式计算开发，并要求 Word/PPT/Excel 全部接入。因此拒绝 ADR-0021 的服务器转换路线，新增独立 Office 功能插件，通过公开 DocumentPreviewRegistry/Slot 扩展已有文件 Tab。原生资源地址、权限读取、刷新与 Tab 导航保持官方所有权。

浏览器 iframe 承载 Office 解析/展示及基础编辑，隔离应用凭据与样式，不拥有第二套资源或会话状态真源。Word/PPT 采用发布的浏览器预览库＋原包 XML 文字片段修改；Excel 使用 Univer 与已验证转换适配器。现有 Univer 无可直接复用的纯浏览器完整 Office 导入导出契约，因此不能将基础 Word/PPT 文字编辑描述成完整 Univer Office 编辑。

只下载副本，不自动覆盖 Host 文件。后续覆盖保存必须沿用受授权 Host 写入与内容版本冲突检测；不借 UI 选择替代授权。当前 .doc/.ppt/.xls 不支持；图表/高级格式、压缩展开与复杂文档保护尚不完整。模块0.1只是开发版本，不等于正式生产验收。

收益：三类原始 Office 文件可沿原生 Tab 打开，无 Office 转换进程或外部上传。代价：不同浏览器引擎维护与保真测试；Word/PPT 支持范围有限，Excel 原生图表尚缺。详见[复用与证据](../evidence/office-integration.md)。
