# Office 开源组件采用方案

日期：2026-09-13。PPT 已按用户确认切换为当前中文原生编辑器，其他 PPT 实现全部退出；八类长期范围保留。

复审已补[Office插件架构](PLUGIN-ARCHITECTURE.md)与[问题处置](ARCHITECTURE-REVIEW.md)。选定的基础库由独立`workdsh-plugin-office`封装为Harness能力；默认组合只装配插件，不能接管其工具/数据实现。

## 1. 用户决定

采用GenOffice使用的上游开源基础组件，收敛既有选型；工程参考用于确定组件职责与集成方式。继续保留Harness的Agent、工具、模型路由、会话、插件生命周期和统一内容API。GenOffice的商业产品使用经验是选型依据；具体落地使用各组件的开源发行物，版本与许可证随依赖锁定记录，不反复扩大候选搜索。

来源：[GenOffice](https://github.com/genspark-ai/genoffice)，本轮静态核对提交 `de139a061537bea40f0cc81ef8f09a95f77ac52a`。核对了组件清单、package.json和有关编辑/读写源文件，没有运行其应用或把代码复制进产品。目标是采用相同基础库，不以安装GenOffice桌面应用替代WorkDSH集成。

**PPT选型校正（2026-09-12）：** 对方生产Slides使用自研pptx-engine和pptx-render，Konva承担画布交互；PptxGenJS仅在引擎开发依赖中，不能据此将其称为生产导出核心。我们的PPT-01组合仅是新建文字/图片导出探针。复用范围与后续顺序见[源码复核](GENOFFICE-SLIDES-REVIEW.md)，不将对方private源码包当已发布SDK直接安装。

## 2. 采用的组件与分工

| WorkDSH能力 | 采用路线 | 我们需要完成的集成 |
| --- | --- | --- |
| 文档/Word | Tiptap开源核心 + ProseMirror；React UI | 原生正文/段落/表格编辑，稳定ID与统一模型映射，DOCX导入导出、分页与格式保留 |
| Excel | 继续Univer开源Sheets；按需启用对应开源功能插件 | 接入统一修订/持久化/AI范围工具，完善浏览器文件读写和图表；不扩展公式引擎 |
| PPT | pptx-react-viewer 3.16.5 / pptx-viewer-core 3.14.3 | 唯一编辑器；中文工具栏、原生图表数据、同 Office 服务权限/CAS 保存，Harness 文件 Tab 直接挂载 |
| PDF | PDF.js渲染 + pdf-lib组装/表单/页操作 + PDFium WASM（@embedpdf/pdfium）内容编辑 | 浏览器worker/字体/图片转换，真正文本与图片修改的能力验收，接统一操作/保存回执 |
| 画布 | 复用Konva对象渲染与交互基础 | 图形/文字/连接、分组/选区、撤销、序列化；画布模型独立于PPT |
| 多维表格 | 复用Univer网格；Office独立内容文档提供内部多表/字段/记录/关系/视图 | 强类型字段、记录ID、关系、视图及持久化；不冒充tables业务数据库，不建立业务数据第二条写链 |
| HTML | CodeMirror源码编辑 + 浏览器隔离页面预览 | HTML/CSS/JS受管源码、资源引用、分批更新预览、保存/重开及HTML/资源包导出 |
| Markdown | Tiptap/ProseMirror正文编辑 + CodeMirror源码视图；Mermaid/KaTeX | CommonMark/GFM、表格/任务列表/代码块/图示/公式，正文与源码同修订，原始语法保留及.md导出 |

Tiptap与Konva是编辑基础，不自行完成DOCX/PPTX格式读写。使用相同基础库不自动获得GenOffice自己编写的解析、分页、字体、文件补丁和完整交互；这些是集成实现的一部分。HTML和Markdown均为正式编辑类型，与原六类一起交付，不仅是附件预览或文档的导出选项。

共享组件按实际功能引入：

| 组件 | 用途 | 采用范围 |
| --- | --- | --- |
| JSZip + fast-xml-parser | OOXML ZIP/XML处理 | 浏览器导入导出适配；保留未修改资源和关系，不将整个包转成简化正文后重建 |
| opentype.js + HarfBuzz WASM | 字体度量、复杂文字整形 | 文档/PPT/PDF排版需要时引入；字体与WASM随包提供 |
| Mermaid + KaTeX | 图示、数学公式 | Markdown必做能力，文档按能力复用；随包提供，不依赖远程脚本 |
| CodeMirror | HTML/Markdown源码编辑 | 两类正式编辑器的组成部分，不另建AI聊天 |
| Fluent UI System Icons | 编辑工具图标 | 复用图标库，仍遵循WorkDSH公共UI规范 |
| React | UI | 继续复用Harness提供的React组合，不启动另一React根应用 |

Electron/electron-updater属于GenOffice桌面壳，不加入当前Web编辑器。其calamine/IronCalc用于Rust xlsx sidecar；在用户“浏览器内运行、不要增加公式计算”约束下，当前不引入该本地进程。libeot/MTX仅在需要处理对应嵌入字体时采用，保留其独立许可记录。

## 3. 开源发行物与版本记录

Tiptap核心的[MIT许可证](https://github.com/ueberdosis/tiptap/blob/main/LICENSE.md)、Konva的[MIT许可证](https://github.com/konvajs/konva/blob/master/LICENSE)、Univer开源仓库的[Apache-2.0许可证](https://github.com/dream-num/univer/blob/dev/LICENSE)已核对。PDF.js/pdf-lib/PDFium分别沿用其Apache-2.0/MIT/BSD许可，封装包及字体保留各自声明；使用开源核心，不默认安装同品牌收费服务或扩展。

以下是GenOffice在固定提交的**声明版本**，范围表达式不等于lockfile实际解析版本，也不表示WorkDSH已安装：

| 组件 | 参考声明 | WorkDSH决定 |
| --- | --- | --- |
| @tiptap/core、extensions、pm、react | 3.31.0 | U1采用同族进行文档探针，锁定实际兼容版本，不混用主版本 |
| @univerjs开源Sheets | ^0.25.1 | 保留现有精确0.25.1基线，新增开源插件保持同族；不切入需要授权的新商业组件 |
| konva / react-konva | ^9.3.20 / ^19.0.10 | PPT与画布共用适配基础，入库前确定精确兼容版本 |
| @embedpdf/pdfium / pdfjs-dist / pdf-lib | ^2.15.0 / ^6.2.108 / ^1.17.1 | PDF切片固定WASM/JS/worker对应版本；不能混用不同版本worker |

声明来源：[Docs package](https://github.com/genspark-ai/genoffice/blob/de139a061537bea40f0cc81ef8f09a95f77ac52a/apps/docs/package.json)、[Sheets package](https://github.com/genspark-ai/genoffice/blob/de139a061537bea40f0cc81ef8f09a95f77ac52a/apps/sheets/package.json)、[Slides package](https://github.com/genspark-ai/genoffice/blob/de139a061537bea40f0cc81ef8f09a95f77ac52a/apps/slides/package.json)、[PDF package](https://github.com/genspark-ai/genoffice/blob/de139a061537bea40f0cc81ef8f09a95f77ac52a/apps/pdf/package.json)。

依赖清单、LICENSE/NOTICE和字体声明随精确版本与实际分发内容核对；它们属于正常交付检查，不等于免除其他许可条款。GenOffice自己的ee目录不属于本方案依赖；其vendored libeot为MPL-2.0，不归为MIT。此次没有完整分发审计，也不因公司规模推断所有附属代码都具有相同许可。

## 4. 对统一架构的具体补充

1. 文档adapter明确使用Tiptap/ProseMirror事务映射到document v1；保持Host权威提交。编辑器富文本结构、选区和原始OOXML锚点分别管理，模型不接触任意XML或厂商对象。
2. 导入文件保留不可变源包，工作模型记录受控原始锚点与变更集合；导出只改受支持内容，未改资源按原条目保留。它们是同一工作副本的来源/派生信息，不成为另一份可独立写入的真源。
3. Tiptap事务、Konva交互与Univer命令都进入同一content_edit业务提交链；GenOffice的apply_ops思路可参考，具体协议继续使用我们的稳定ID、revision、幂等和人工lease。其数组索引或全快照回滚不能直接代替跨客户端契约。
4. PDF目标增加真正文本/图片编辑，不长期限定为覆盖注释。PDFium内容对象编辑先用浏览器样本验证，过关后再开放pdf.replaceText/updateImage操作；对象定位需pageId、源hash、对象签名/前置文本，不暴露WASM指针。中文字体、字形缺失、旋转页与重开必须验收。
5. GenOffice PDF实现使用Electron主进程的字体查找、文件读取及nativeImage，PPT引擎也存在Buffer/Node写文件接口；不能把WASM/TypeScript字样当作浏览器直接可用的证据。我们采用这些基础库的浏览器入口，保留无Office进程/无第三方上传约束。
6. HTML与Markdown各有严格ContentState分支，源码是权威内容，预览/语法树/富文本视图是派生映射。共用content_*工具、人工lease和幂等提交；HTML预览不拥有Host权限。Markdown正文编辑只对有明确源码映射的范围生成补丁，未知语法保留，不能每次序列化整篇而丢失原格式。

Markdown实现参考[Tiptap Markdown官方说明](https://tiptap.dev/docs/editor/markdown)：支持解析与序列化，但当前标记为Beta，有语法表达限制。采用此组件，仍要验证正文/源码切换、注释与自定义语法保留；不能从双向转换API推导无损往返。CodeMirror沿用GenOffice的上游组件选型。

具体参考：[Docs统一操作](https://github.com/genspark-ai/genoffice/blob/de139a061537bea40f0cc81ef8f09a95f77ac52a/apps/docs/src/renderer/ai/ops.ts)、[DOCX局部保存](https://github.com/genspark-ai/genoffice/blob/de139a061537bea40f0cc81ef8f09a95f77ac52a/packages/docx-engine/src/patch.ts)、[PDF内容编辑](https://github.com/genspark-ai/genoffice/blob/de139a061537bea40f0cc81ef8f09a95f77ac52a/apps/pdf/src/main/text-edit.ts)。这是工程思路来源，不引入它的agent-core、模型provider或Electron IPC。

## 5. 执行顺序

沿用[统一API](UNIFIED-API.md) U1—U5，立即收敛U1的文档选型为Tiptap/ProseMirror。先完成原生富文本→Host提交→AI三批写→实时显示→人工改→AI续写→保存重开；DOCX文件往返同时设独立样本门槛。U4扩展另外七类：Markdown→HTML→Excel→PPT→PDF→画布→多维表格；先复用富文本/源码基础，随后完成其余适配器。U5逐类验收八类，不能用一种类型的成功替代其他类型。

旧Canvas Editor、FortuneSheet、pptx-viewer等候选与探针保留历史证据，停止作为默认路线继续扩展；只有已采用组件出现具体阻塞时才重新评估对应局部。包安装、浏览器/真实文件/真实模型测试在各切片执行，不能用本轮选型完成代替集成完成。

## 6. 组件接入必须满足的插件门槛

- 基础库不作为新的Harness内核；服务/工具/Connection/Client适配在Office包内通过官方Cordis组合。SDK扩展与npm依赖不等于已激活的Harness插件。
- 原生编辑UI共享官方renderer的React与生命周期；HTML用户脚本留在隔离预览。静态类型映射/SDK懒加载不发展成自制插件注册框架。
- 每类分别记录创建、导入、显示、直接编辑、未支持对象保留和导出重开；U4不得用“库支持”签收实际文件能力。DOCX/PPTX codec是明确实现工作，Tiptap/Konva自身不承担它。
- 预构建包包括CSS/字体/WASM/worker，干净Profile可加载，缺失组件有诊断。卸载释放工具/服务/编辑器资源并保留用户文档，见OP-T01—07。
- HTML预览/导出不包含pages发布；多维表格是Office文档，不与tables共享可写副本；真实资产仍由资源owner/library管理。
