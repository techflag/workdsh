# 原生 Office 制作与来源

本技能由 WorkDSH 维护，参考用户提供的腾讯/WorkBuddy PPT 方法并按原生 Office 工具改写。原版资料保留在工程 docs/workbuddyskills/tencent-pptx 用于研究，不随此插件复制专属引擎、脚本、DSL 或素材。本目录是内置适配版的唯一维护源。

/office.ppt 是输出意图，实际调用 content_import_pptx（有客户模板）或 content_open(kind:presentation,source:new)（普通新建）、content_capabilities、content_read、content_edit 和 content_export；不调用名为 office.ppt 的 Agent 工具。先打开并保存第一张有用页面，再读取设计资料、逐页制作。能力、画布、字段及限制以当前工具返回为准。没有提供 slidep 或 WorkBuddy editor_sdk，也不转交 PPT Master。

真实页面数据和保存 revision 属于 Office 服务；调用技能不代表已经保存或导出。独立上传 PPTX 不自动成为实时编辑文档。保持所有操作的权限、材料来源和用户改动。无法渲染时说明视觉未验证，不报告虚构的检查结果。
