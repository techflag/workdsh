# ADR-0024：八类编辑器的 AI 操作与实时页面

日期：2026-09-12。修订4，明确插件交付与领域边界。状态：设计采纳，运行实现待验收。

用户要求集成组件暴露 API/内部 MCP，使 AI 写文档时页面可见写作过程。现有 client-only Office 预览与下载不满足目标。

决定采用统一编辑工作副本服务：原生 Harness 工具和页面操作共用领域服务与修订；提交后通过官方传输更新页面。内部优先原生工具，不另造 MCP 服务器；外部 MCP 后续只作同服务适配。文档、PPT、表格、PDF、画布、多维表格、HTML、Markdown分别使用能力匹配的原生编辑器，统一权限/收据/修订协议，不统一渲染模型。

保留用户约束：允许商用、优先 MIT/Apache；浏览器直接编辑与转换，无本机 Office 或转换服务器，无第三方文件上传。Host 持久化操作并不等于 Office 转换服务。资产归属保留 library/官方文件所有权，Office 不创建第二套资料库。

拒绝仅输出文件后刷新、文本表单冒充文档编辑、执行模型任意JS、UI与AI独立维护两份内容及默认最后写入覆盖。

详细操作契约、并发策略、失败语义和 A—D 有限验收见 [AI-EDITING](../design/office/AI-EDITING.md)。首条纵向链路是文档三段实时写作与用户编辑交接；全部八类保持交付范围。当前不声称工具或实时同步已实现。

用户进一步确认八类须有便于AI理解的统一接口。采用 [统一内容操作API v0.4](../design/office/UNIFIED-API.md)：content_open/read/capabilities/edit/present/export，严格类型化操作联合；共享引用/修订/回执，各类型保留语义。未发布的content_create由open的new/resource/existing分支替代。禁止自由payload任意执行和强制万能数据模型。此为设计决策，尚未实现。

## 修订2的明确选择

1. 单个原生Agent即可完成八类内容操作，首条验收沿用standard；PTC复用同一工具。子智能体只用于独立调研/审阅/成果分工，创建与运行归官方subagent；不一编辑器一Agent，不把实验性Agent Teams设为编辑器依赖。
2. document首先采用规范化富文本块/runs模型；其他类型有各自版本化模型。UI与AI共用严格操作，无法往返的SDK控件不开放。复杂Office文件导入/导出是额外准入，不能从新建内容通过推导全格式保真。
3. 工作副本、revision与幂等receipt通过官方storageDomain单记录update提交，不假设跨表事务；创建有确定性身份与服务准入临界区，回执检查先于revision冲突。
4. 锁定rc.1的外部插件Typert生成链存在已有失败证据，故Office首版本地链路采用官方Connection认证exact Fetch领域例外与受控修订查询。它不形成通用RPC或第二套传输。公开流式通道在生成/装配/恢复验证后替换；不手写Typert描述符、不升级上游绕过。
5. 页面按可信Session路由，展示有独立appliedRevision回执；人工用短期lease接手，AI后续写入明确暂停。导出受理时固定输入与版本，真实产物持久化回执和浏览器下载分开。

## 取舍与后果

保留一条Host提交链使幂等、取消和人工交接可验证，但需要为每种编辑器实现严格双向适配。单记录方案有容量与写放大成本；首版限额公开，不承诺无限历史或多进程写入。500ms修订查询便于当前版本落地，有额外请求开销，后台退避；不能直接声称满足大规模协作。人工lease保证输入不被覆盖，代价是编辑期间暂停该文档AI提交，空闲Agent需用户继续而非自动唤醒。

不采用“先上六个Agent”的替代方案：它增加上下文、成本与写入竞争，不能解决UI显示、格式转换、授权和持久化。暂不引入CRDT/通用流程引擎；这些没有解决本次最先需要的可验证单文档闭环。

官方依据与锁定发布包核对见 [HARNESS-INTEGRATION](../design/office/HARNESS-INTEGRATION.md)。Review R01—R06已补设计处置，运行故障测试仍未执行。U1—U5保留全部八类范围；没有新增运行接口、发布插件或启动子智能体。

## 组件采用补充（用户后续明确决定）

采用GenOffice使用的上游开源基础组件：[OPEN-SOURCE-STACK](../design/office/OPEN-SOURCE-STACK.md)。文档选Tiptap/ProseMirror，表格保留Univer开源0.25.1基线，PPT与画布选Konva，PDF选PDF.js/pdf-lib/PDFium WASM。JSZip/XML/字体等按功能复用；不引入GenOffice Agent、Electron壳或Rust计算sidecar。

此选择结束广泛候选筛选，将工程投入集中到原生编辑、格式适配及统一AI提交。代价是这些基础库并非完整Office产品，需要实现格式往返和领域交互；不承诺安装库就具备GenOffice全部能力。文档原包/锚点/变更集合用于局部导出，Host仍拥有唯一工作副本；PDF真正内容编辑纳入目标但按能力验收后开放。

## 修订3：HTML与Markdown正式交付

用户追加HTML、Markdown，范围由六类扩展为八类。HTML采用CodeMirror与隔离页面预览；Markdown采用Tiptap/ProseMirror正文、CodeMirror源码与Mermaid/KaTeX。二者都接原来的六个content_*工具，各新增严格kind/operation分支；不另建AI入口。

源码为两类内容的权威模型，正文/预览是派生视图，同一修订下切换；工具使用修订及前置文本约束的源码补丁。Markdown未知语法保留，避免整个文件转换丢内容。HTML脚本只在无Host权限的隔离预览内运行。成本是源码范围映射、资源包和预览错误需要单独验收，不能直接套用Word富文本快照。

U1—U3文档闭环保持，U4先接Markdown/HTML再接其他类型，U5覆盖全部八类。这是开发范围调整，未安装新组件、注册工具或完成集成。

## 修订4：独立Office插件与生命周期

沿用ADR-0018/0019：`workdsh-plugin-office`是独立安装包，Host根只用官方ctx.plugin组合内容服务、工具与Connection消费者；Client进入官方模块图并共享renderer。公共服务拟定为workdshOfficeContent，contract类型与运行实现分开，默认WorkDSH组合不拥有Office实现。不新建PluginManager，不强制八个npm包，不让文档成为代码插件。

采用[插件架构与门槛](../design/office/PLUGIN-ARCHITECTURE.md)：写入与插件运行代绑定，卸载先关准入、结算在途提交、拒绝旧响应、清理工具/路由/SDK、保留用户数据；代码升级不能覆盖用户工作副本。代价是每个adapter/worker必须有严格生命周期与格式能力验证，收益是可以真实安装、停用和恢复，其他功能按依赖诊断。

Office多维表格限于独立内容文档；tables业务数据库、pages发布及library正式资产保留原有所有者，未来通过公共契约协作。U1增加最小可安装插件验证，U3加在途卸载，U4加类型codec矩阵，U5加完整制品门槛。已有activeSlice登记用户批准的Office专项，主线D04/D15不自动完成。本轮仅设计处置，运行验证未执行。

## 修订5：Office 插件拥有默认实时写作引导

真实会话第二轮显示工具可见却选择 officecli。采用官方 systemPrompt.section 增量贡献 `workdsh:office-authoring`，不替换 Agent persona、Skill 目录、模型路由或 Agent loop。普通文档写作先创建右栏，再提交首段和小批次；编辑器提供默认排版。收益是保留统一 Harness 执行同时减少文件生成绕行；局限是提示词不能保证所有模型、历史上下文和显式不同流程的选择，必须做真实模型验收。未实现表格/DOCX 时明确能力边界，不能用引导冒充交付。
