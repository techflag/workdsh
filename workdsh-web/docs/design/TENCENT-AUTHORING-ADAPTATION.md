# 腾讯 / WorkBuddy 内容制作方法接入 WorkDSH

2026-09-13，用户授权检查网页、PPT、Word、Excel并增强系统。参考本机 /Users/techflag/project/workbuddy 的商业产品化方法，不复制专属执行引擎、转换代码或市场包装，不将它们自动称作开源依赖。

## 官方复用记录：AUTHORING-01

使用 docs/dsh-v0.1.6-alpha.2/subsystems/skills.md、锁定 @deepseek-ai/dsh-skill@0.1.5-rc.1 的公开 SkillRegistration/resourceBase 与 ctx.skills.register，及已验证 systemPrompt.section 注入。沿用官方 get/render、加载优先级和可撤销注册；不增加执行器、解析器、MCP或通用流水线。已有 skill-creator-host、office-content 集成测试作为回归基础。

## 来源、价值与适配

| 类别 | 实际来源与重点阅读 | 保留的方法 | 不照搬的宿主能力 |
| --- | --- | --- | --- |
| PPT | builtin-plugins/tencent-pptx/skills/tencent-pptx：入口、story/design-principle、component-chart；素材/渲染脚本依赖检查 | 受众与目标、逐页结论、节奏、视觉系统、数据含义与可编辑图表 | slidep、.slide/JSX、强制中间文件、LibreOffice渲染、机械字数/比例配额 |
| Word | builtin-plugins/tencent-docx：入口、tdoc-orchestrator、design-token、doc-typeset/base与business-report、结构/排版review、html-to-docx入口 | 体裁、创作/美化/编辑分工、具体样式、层级与资源检查、最终制品 | HTML→DOCX专属转换器、托管Python环境、角色声明流水线、未支持页码/分页 |
| Excel | builtin-plugins/sheetagent：excel-generation/handler、schema_principle、sheet-agent-prompt入口、audit-spreadsheet、骨架脚本依赖检查 | 场景原型、来源/单位/类型、实际行号先于公式、空/零保护、跨表验证与使用体验 | sheetagent MCP、强制子代理、自动pip、把空骨架称完整结果 |
| 网页 | ardot-ui-design、design-to-code 的landing/web-app、code与style-extraction重点段落 | 内容先于视觉、目标与CTA、令牌、真实功能、参考提炼与响应式 | Ardot工具、固定画布布局、强制每次多选章节、模拟访谈当真实背书 |

阅读范围是相关入口与上述重点参考/脚本依赖，不宣称审完全部子目录、所有专家、所有脚本或许可。方法由 WorkDSH 按当前架构重新编写为八份参考，没有原样复制转换代码。

## 接入

网页优先切片（2026-09-13）：再次对照 Ardot design-to-code workflow、landing-page 与 web-app guidelines，采用内容/视觉分离和任务状态设计；拒绝照搬固定画布、强制多轮确认与“不运行预览”的宿主限制。workdsh-web-design 新增 workflow-and-delivery 参考，覆盖现有工程修改、静态页、应用、设计稿转换四条路径，真实预览/源码/素材/运行说明/文件引用交付。继续复用官方 SkillRegistration/resourceBase 与原生文件/工程工具；没有新增HTML工具、服务器或发布服务。验收先检查注册、按需参考、独立包资源，再验证一个真实成品与视觉；模型成品未执行不能记通过。

Skills插件新增四个独立可发现的 bundled只读指南：workdsh-ppt-design、workdsh-word-design、workdsh-excel-design、workdsh-web-design。准确描述使用范围；包内 references 通过 directory resourceBase 按需读取。Office默认引导在打开Word/PPT后使用相应设计建议，普通短文不强制加载全部参考。专家可通过真实技能目录选择这些指南；它们是专业方法，不替代底层编辑/数据能力。

Word与PPT仍使用同一 content_* 权威服务和官方导出文件卡。统一 spreadsheet/html新建API未实现，指南明确不能猜分支或伪造成功；已有XLSX副本编辑、真实工程网页制作遵循当前工具。新指南不扩充编辑器格式保真或图表支持范围。不能把指南上线描述成Excel/HTML统一编辑器已完成。

## 验收范围

需验证官方get/render保留资源定位、全部引用文件存在、注册可卸载、独立包包含资源、两类Office工具链回归和preview实际目录。真实模型的四类成品、视觉效果、公式重算和最终文件仍需分别验证；静态与确定性测试不是这些专业效果的替代。

## 已执行证据

两包标准build/typecheck通过；skill-creator-host及office-content共10项、skill-plugin-lifecycle1项通过，参考路径与可撤销注册验证。preview两个候选包经官方CLI安装，Host/Client与八份参考逐字节一致；重启后已认证list HTTP200，四指南readonly。Office现有构建cwd问题已修复为脚本相对路径。不声称真实模型成品或视觉质量通过。

## 网页可靠性复审（2026-09-13）

本次进一步阅读本机 ardot-design-to-code/SKILL.md、workflows/design-to-code-workflow.md、references/guidelines-code.md，ardot-ui-design/SKILL.md、references/guidelines-web-app.md，以及 core/workflows/ardot-workflow.md 分级验证段。原版有组件逐个分析/验证、计算 CSS、实例与父容器分析、整页集成复验；core 要求区块边界和最终检查、限制无效修复，而转换工作流又写生成后不要运行代码/预览，且强制多轮确认和默认固定画布。不能把这些互相矛盾或专属宿主规则直接继承。

缺口判断：先前改写过于概括，入口未将实现与验收参考作为制作流程明确装配，缺少组件样式/父容器契约；HTML 全文替换会丢弃未携带的样式；打开预览不等于 AI 已检查画面。单个 .bar 冲突不能证明所有技能不可靠，但说明静态注册/路径测试未覆盖模型成品质量。

调整：入口明确制作前读取实现/交付参考，组件契约与样式作用域、完整更新保留内容、边界分级检查、桌面/真实侧栏/手机验收和真实文件一致性；Office 引导同步使用指南。未实现自动视觉验收工具，也未执行模型成品对比，不能声称可靠性已通过模型评测。腾讯方法参考不等于接入其 Ardot 引擎。
