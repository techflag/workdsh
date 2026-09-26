# Univer 原生页面编辑复核（2026-09-12）

用户明确要求直接在页面编辑，额外文字片段表单不符合产品要求。当前Excel使用Univer，Word/PPT仍为docx-preview/pptx-preview加自制XML文字表单，不能称为Univer Docs/Slides原生编辑完成。继续美化该表单不是解决方案。

官方复用记录：
- https://docs.univer.ai/zh-CN/guides/sheets：嵌入式表格编辑器。
- https://docs.univer.ai/zh-CN/guides/docs/getting-started/installation：UniverDocsCorePreset/createDocument 原生页面编辑。
- https://docs.univer.ai/zh-CN/guides/slides/getting-started/installation：Slides模型/UI/授权插件，当前文档作用域@univerjs-pro。
- 三类features/import-export均明确需要配套转换后端，即使快照API也需要。不得将“不依赖协同服务”误读为“不需要转换服务”。

版本核对：当前项目0.25.1；本次官网标记1.0.0-rc.0，不能静默套用或升级。npm @univerjs/preset-docs-core@0.25.1存在、Apache-2.0；@univerjs-pro/slides@0.25.1返回404（不能据此认定其他版本不可用）。完整旧版Slides发布面/授权与Office浏览器转换路径仍待验证。

产品约束：Office功能插件只拥有宿主读取/导出与官方右侧Tab接入，文档渲染、选区、输入、工具栏、撤销重做由对应Univer编辑器拥有。移除独立文字表单和更新预览流程应与可用原生编辑路径一起交付，不把HTML contenteditable或简化纯文本转换冒充完整Word/PPT编辑，不静默丢弃原始表格/图片/图表。不启用用户已拒绝的服务器或上传第三方。

结论：原生页面编辑需求正确；当前实现未满足Word/PPT。必须分别验收Office文件转换、对应原生编辑器、编辑后导出，不能仅用空白createDocument演示或PPT预览签收。此次为文档/发布面核对，未修改运行代码、依赖、Profile或启动服务器；原生Docs/Slides编辑与导出测试未执行。

## 后续实测纠正

同版 community @univerjs/slides/slides-ui 实际存在，Apache-2.0；pro同版404不能推导为没有Slides编辑器。0.25.1 Docs公开Facade名称实际为createUniverDoc/getSnapshot，与新版createDocument/save不同。scripts/probe-univer-native-editors.mjs验证Docs原生选区和键盘输入后snapshot变化、Slides公开插入文字Operation后snapshot变化，错误/外部请求0；不是Office导入导出或Slides键盘签收。新增原生SDK包当前只用于开发探针，不进入运行依赖。用户追加全组件后开展1.0.0-rc.0隔离验证，见univer-complete-components.md。
