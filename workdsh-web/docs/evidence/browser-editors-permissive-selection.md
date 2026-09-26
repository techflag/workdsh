# 浏览器编辑器宽松许可证选型

日期：2026-09-12。状态：候选筛选完成，运行验收未执行。

后续决策：用户明确采用GenOffice使用的上游开源组件，当前实施以[OPEN-SOURCE-STACK](../design/office/OPEN-SOURCE-STACK.md)为准。以下候选筛选与实测为历史证据；Canvas Editor、FortuneSheet、pptx-viewer等不再作为默认路线继续推进。已选Tiptap/ProseMirror、Univer、Konva、PDF.js/pdf-lib/PDFium的产品集成尚未完成。

## 用户约束

覆盖 Word、PPT、Excel、PDF、画布、多维表格。优先 MIT / Apache-2.0 等允许商业及闭源集成的许可证，保留相应版权和许可声明。浏览器内直接编辑，不采用文字片段表单替代原生编辑，不依赖安装 Office/LibreOffice 或文档转换服务，不上传文件到第三方。按实际安装版本与依赖逐项核对，仓库根许可证不自动涵盖商业扩展。

## 候选与证据

| 类型 | 候选 | 许可证 | 当前结论 |
| --- | --- | --- | --- |
| 文档 | Canvas Editor | MIT | 原生分页、文字、表格、图片编辑；DOCX 复杂版式与导出需要独立验证，核心编辑器能力不等同于完整 Office 转换 |
| 表格 | 现有 Univer 开源组件 / FortuneSheet | Apache-2.0 / MIT | 不因商业扩展需要许可而替换所有开源组件；FortuneSheet 的格式适配与图表能力仍需验证 |
| 演示 | ChristopherVR/pptx-viewer | Apache-2.0 | 提供 pptx-react-viewer 等 UI 包，项目声明客户端打开、所见即所得编辑与保存；优先进入样本探针，不能将 README 保真声明作为通过证据 |
| 演示备选 | ErickWendel/localstudio | MIT | 浏览器演示应用候选；插件化成本、依赖许可证和 PPTX 保真未验证 |
| PDF | PDF.js + pdf-lib | Apache-2.0 + MIT | 阅读、注释/表单与页面操作方向；不是任意原有正文的完整排版编辑器 |
| 画布 | Excalidraw | MIT | 白板候选；仍需实际嵌入、修改、保存重开验证 |
| 多维表格 | Grist static | Apache-2.0 | 官方明确修改不保存、导入导出未完成；不作为即装即用方案，继续筛选 |

PPTist 当前为 AGPL-3.0，旧 Apache 版本已停止维护，不进入本轮宽松许可方案。ZetaJS 包装层为 MIT，但底层 LibreOffice/WASM 及依赖须单独核对，不能称整套 MIT。

## 官方来源

- https://github.com/Hufe921/canvas-editor
- https://github.com/Hufe921/canvas-editor-plugin
- https://github.com/dream-num/univer/blob/dev/LICENSE
- https://github.com/ruilisi/fortune-sheet
- https://github.com/ChristopherVR/pptx-viewer （README、LICENSE 与公开包列表）
- https://github.com/ErickWendel/localstudio
- https://github.com/mozilla/pdf.js
- https://github.com/Hopding/pdf-lib
- https://github.com/excalidraw/excalidraw/blob/master/LICENSE
- https://github.com/gristlabs/grist-static （Differences with regular Grist：修改不保存，导入导出缺失）
- https://github.com/pipipi-pikachu/PPTist#-license
- https://github.com/allotropia/zetajs

## 有限验证计划

1. 优先验证 PPT 候选：检查发布包版本、完整依赖许可，隔离安装；用户真实 PPT 原件只读，验证 10 页与图表/表格显示、直接编辑、撤销、导出副本并重开、外部请求为零、原件哈希不变。全部通过才决定迁移。
2. Word 同样验证真实含表格/图表文档的直接编辑与保存，不接受仅封面或 DOM 页数作为完整显示证据。
3. PDF 与画布各完成直接操作及保存重开；多维表格需具备字段类型、关联、视图和持久保存，普通网格不能冒充完成。
4. 通过的组件沿用 Harness 公开 documentPreviews/Slot 与 Office 功能插件装配，保留明确能力边界；不新增第二套插件框架，不将所有库一次性塞入首屏包。

本轮仅研究与记录，没有替换应用组件、安装候选包或修改用户文件。浏览器编辑、构建、业务测试、真实文件回归均未执行。

## PPT 浏览器引擎实测（2026-09-12）

独立安装 `pptx-viewer-core@3.14.3`，锁文件在 `.artifacts/pptx-candidate/package-lock.json`；没有加入应用运行依赖。浏览器打包使用公开 PptxHandler.load/save，真实用户 PPT 原件只读。脚本 `scripts/probe-pptx-candidate.mjs <fixture>`，结果 `.artifacts/pptx-candidate/result.json`。

通过：导入/导出重开均10页；38个shape、134个text、6个chart对象数不变；标题文字修改在重开后保留；页面错误0、外部网络请求0、原件SHA256不变。导出副本仅存隔离产物目录。对象数量不代表图表、样式或关系完整保真。

未执行：原生UI直接键盘编辑、撤销重做、逐页视觉对照、应用接入、正式构建与发布。当前探针只验收浏览器引擎读写。依赖包许可证元数据清单保存于 licenses.json，尚不能替代发布前每个依赖许可证文件审查。

许可证发现：直接依赖 mtx-decompressor@1.6.0 声明 MPL-2.0，因此整条依赖链不是纯 MIT/Apache。是否符合最终分发要求须核对该包许可证文件和使用方式；当前候选尚未通过完整许可准入，不可标记为全部宽松许可。

## MPL 与编辑器 UI 复核（2026-09-12）

Mozilla 官方 FAQ Q5/Q8/Q11/Q16 确认 MPL 允许商业使用、与专有代码组合；分发压缩 JS 时需要提供 MPL 部分源码获取方式，修改覆盖文件时履行对应源码义务，不要求单独编写且不含 MPL 代码的应用文件全部公开。来源 https://www.mozilla.org/en-US/MPL/2.0/FAQ/ 。mtx-decompressor 发布包 LICENSE 实际为 MPL-2.0，与元数据一致。因此不因付费授权原因排除，但正式分发需附许可证、准确版本源码及获取说明，不称整链 MIT。

独立安装 pptx-vanilla-viewer@2.16.4，构建时补充其可选 Three.js 依赖 three@0.180.0。新增 scripts/probe-pptx-candidate-ui.mjs，真实 PPT 只读。发现：

- 无来源页面初始化因 localStorage SecurityError 失败；有来源的 Playwright 内存路由测试可加载10页。未修改应用 iframe 权限。
- 默认触发5次 Google Fonts Carlito 样式请求，均被路由拦截；文件未上传。正式接入须关闭远程字体或随包提供字体并核对字体许可。
- 截图显示默认文件首页覆盖文档。点击返回后，工具栏内页面仍拦截标题双击；30秒超时。没有使用 force 点击或人为删除遮挡来伪造用户操作成功。
- 原生直接编辑、撤销/重做、UI导出重开未通过；不能由前轮引擎测试推导编辑器可用。

结果 .artifacts/pptx-candidate/ui-result.json、ui-first.png；npm隔离锁文件保留。当前保留候选，尚不迁移生产。下一项针对公开启动/工具栏配置排查遮挡，并处理远程字体，之后重跑直接编辑验收。正式应用构建、业务全量、发布未执行。
