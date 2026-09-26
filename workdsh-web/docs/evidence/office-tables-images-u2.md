# Word 表格与图片 U2 验收（2026-09-12）

实现与官方复用记录：[TABLES-IMAGES](../design/office/TABLES-IMAGES.md)。实际 Tiptap TableKit/Image 扩展提供命令、选择与缩放，未实现另一套表格/图片编辑器。统一内容接口、权限、修订、幂等回执及人工租约保持。

验证：

- 全仓 `pnpm build`、`pnpm typecheck`、`pnpm test:integration`（68项）、`pnpm check:plan`、`pnpm test:planning`（2项）通过。
- `office-rich-editor.test.mjs` 在浏览器运行真实扩展/适配器/reducer：行列增删、合并拆分、鼠标列宽拖动、图片原生缩放、对齐、单元格列表、保存重开无多余操作；DOCX合并/列宽/图片/文字样式往返、外部图片关系不发网络请求。截图 `.artifacts/office-rich/native-editor.png`；往返文件 `roundtrip.docx`。
- `office-content.test.mjs` 实际 Cordis Host 注册工具写入表格/图片，AI和人工租约互斥，非法网格整批回滚，远程图片拒绝，冷启动恢复。
- `probe-office-live.mjs --office-tgz=<alpha.2.tgz>` 15项通过，`browserErrors=[]`。实际右栏 AI写入、原生菜单人工新建表格/图片上传/对齐、ID保存、AI读取、跟随滚动、工具栏、下载、重新打开DOCX、原文件字节保留。截图 `.artifacts/office-live/table-image-toolbar.png`、`toolbar.png` 等，详见同目录 `result.json`。
- `--package-roundtrip` 6项通过，包含隔离官方Profile独立tgz安装、Host/Client卸载撤销和再装恢复。结果 `.artifacts/office-input/result.json`。

探针一次图片插入失败：测试点击空段落未建立明确正文光标，仍在表格内，触发既有单元格图片限制。改为点击可见正文文本后插入，完整15项通过；未取消产品校验。另通过原生测试回归规范化字段顺序和新节点稳定ID，避免重复保存。

最后重打包仅 README 转换范围说明更新，Host/Client构建字节一致并在实际preview安装时核对。最终候选：`0.1.0-alpha.2`，`674787`字节，af7ceb7c56e84a4bfd9a4c8cf4f2bfab596d919527b2be0e90af4047a768885e-256 `af7ceb7c56e84a4bfd9a4c8cf4f2bfab596d919527b2be0e90af4047a768885e`，所有打包许可文本齐全。官方CLI安装至当前preview并重启18989，其余插件依赖/内容存储/原文件保留；尚未发布此候选。

已检查独立1440px及完整1500px应用截图与1100px窄窗回归；未执行390px/1920px完整应用、真实模型富文档、Word/WPS、OS IME与掉电/跨Host测试。导入仍有复杂样式继承/列表编号/页眉页脚/浮动对象/分页转换限制；仅顶层嵌入PNG/JPEG，单张512 KiB，不接受单元格图片和嵌套表格，不宣称无损Word。

## OFFICE-WORD-03：发布前真实模型与兼容性验收计划

官方能力复用记录（2026-09-12）：复用 `https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/` 的 Session/Tools/系统提示公开面和已锁定 `0.1.5-rc.1` 的 `probe-office-live.mjs --real-model` 链路；不新建 Agent loop、模型路由或写文件捷径。新增有图表资料的真实模型场景，观察 `content_open/edit/export` 回执、右栏结构与原生交付。图片采用测试生成的嵌入 PNG，不依赖联网素材。外部 Word/WPS 测试只打开隔离导出制品，不改变用户原件或系统默认程序。完成结果另写证据和 STATUS，不能把本次候选当作完整 Word。
