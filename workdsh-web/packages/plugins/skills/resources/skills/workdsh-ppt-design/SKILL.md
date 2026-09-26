---
name: workdsh-ppt-design
description: 通过需求对齐、逐页叙事和视觉设计，在 WorkDSH 原生 PPT 编辑器中实时创建、改写和美化演示文稿。支持红金政务、咨询与学术风格；通过 Office content_* 工具逐页保存并导出 PPTX。
metadata:
  display-name: PPT 制作
  version: workdsh-native-1
---

# PPT 制作

## 入口与执行
使用 WorkDSH `/office.ppt` 对应的原生 Office 流程制作演示文稿，不转交 PPT Master 或其他文件生成技能。设计资源提供叙事和视觉方法，实际制作使用 `content_open/content_capabilities/content_read/content_edit/content_export`。此内置版由工程维护，执行差异见 [原生适配](references/workdsh-execution.md)。

## 制作步骤
1. 提供客户标准 PPTX 时先调用 `content_import_pptx(path,title,operationId)`，保留原包作为实时工作副本；导入失败不得空白重绘。文字替换优先 `presentation.updateText(slideId,elementId,expectedText,text)`，保留模板位置和首段样式。普通新建时，先调用 `content_open`，input 使用 kind:"presentation"、source:"new"、title 和唯一 operationId，立即打开右侧编辑器；不要先写完整大纲或创建中间文件。已有实时 PPT 按真实 documentId 重新打开并读取，保留用户编辑。独立上传 PPTX 不自动成为实时文档，不猜 documentId。
2. 读取 `content_capabilities` 和 `content_read`，获取实际文档 ID、revision、原生页面及画布尺寸。立即使用 `presentation.updateSlide` 保存第一张有用页面，再按需展开设计。不得以回复文字代替页面提交。
3. 利用用户主题、材料、风格和场景，只问决定内容的缺失信息，一次最多三个问题。按需阅读 [需求对齐](references/human-alignment.md) 的优先级；未指定具体风格时，按需求对齐流程调用 `content_preview_styles` 展示四套封面，再用官方 `ask_user_question` 等待选择。只指定“红色”时展示四种红色方向，不自动套用红金；明确红金政务时才读取 [红金设计](references/designs/design-principle.redgold.md)。选定后重新打开步骤1的原生 presentation documentId，保留首张页面与用户编辑。
4. 阅读 [叙事方法](references/story-principle.md) 和 [视觉设计](references/design-principle.md)，提炼逐页主题、来源、重点、版式、配色与节奏。咨询或学术场景按需读取 designs 下对应资料。将这些方法应用到实时编辑器；不强制创建 STORY.md、DESIGN.md、.slide 或脚本。材料缺失的数据保留明确待补项，不添加虚构事实。
5. 按实际原生 schema 制作：`presentation.insertSlides/updateSlide` 每次 content_edit 只提交一页内容；使用返回的 revision、稳定 slideId、元素 ID。updateSlide 的 elements 替换整页元素，须保留用户未要求删除的内容。根据实际画布缩放设计参考的1280×720布局，不硬编码画布大小；不使用 CSS、JSX 或 SlideDSL 属性。
6. 原生图表使用 chartData 的 chartType、categories、series[{name,values}]，保持数据可编辑；不要以图片或形状拼装代替实际图表。图片只使用支持的真实素材，不构造图片字节。新建、替换、排序、删除均使用实际 content_capabilities 支持的操作。遇到 revision 冲突先重读，HUMAN_EDITING 时等待用户完成编辑，不循环重试。
7. 逐页检查边界、文字溢出、图表可读性、母版对齐、章节对应、配色和材料忠实度。完成后读取最新保存版本，调用 `content_export` 导出真实 PPTX 并显示文件交付卡；工具不可用时说明右侧下载方式和未验证项，不声称已经导出。

## 工具与边界
不加载 PPT Master，不使用 Python、Bash、PptxGenJS、officecli、slidep 或 WorkBuddy editor_sdk 来生成/修改这份实时 PPT。原版 create-from-*、component-* 和 scripts 仅保留用于来源比对，其专有命令和运行时不适用。四套封面由 `content_preview_styles` 保存为独立 HTML 规划预览，PPT 本身仍使用原生编辑器；预览卡不直接提交答案。不调用未注册的 show_widget 或 AskUserQuestion；官方提问工具名为 ask_user_question。

## 交付
右侧可编辑演示文稿及从最新保存版本导出的真实 .pptx。报告实际保存页数；渲染不可用时说明视觉未验证。Office 工具缺失或模型 API 余额不足时说明实际原因，不切换生成引擎、不伪造文件或完成状态。

图表与真实文件交付补充读取 [图表与交付](references/charts-and-delivery.md)；已有叙事与排版补充见 [叙事与设计](references/story-and-design.md)。这些资料共同服务同一原生 PPT 流程，不构成第二个技能。
