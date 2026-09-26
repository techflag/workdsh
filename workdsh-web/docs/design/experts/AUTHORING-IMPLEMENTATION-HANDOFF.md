# WorkDSH 专家与专家团制作：需求与技术实施交接

日期：2026-09-13。目标工程：/Users/techflag/project/workdsh。状态：可交给开发 AI 实施的设计，不是实现完成声明。

## 0. 接手要求

先读目标工程 AGENTS.md、docs/STATUS.md、docs/development-order.json、docs/design/experts/TEAM-IMPLEMENTATION-HANDOFF.md，核对工作树与其他 AI 的增量。不得覆盖当前未提交的团队运行代码，不改 deepseek-harness 或其他工程。实现前按本工程要求登记官方能力复用、设计与台账；本文不自动改变当前任务顺序。

本次需求：深度学习 WorkBuddy 的制作思路、文件组织和工具链，让用户通过一句自然语言制作可用的单专家或专家团。创建 Skill、references、角色模板以 MD 文件维护，TS 只负责资源读取、注册、数据操作和运行接口。首版不增加流程画布、多步骤配置向导或要求用户填写技术依赖。

用户体验示例：创建财务专家团，财务总监、会计、出纳共同处理预算、审计与付款 → AI 制作职责、成员和协作方法 → 保存并校验 → 返回可查看/修改/使用的团队卡片。具体业务权限与真实资金支付不因创建角色而自动授予。

## 1. 已核对事实与参考边界

WorkBuddy 来源：/Applications/WorkBuddy.app/Contents/Resources/app.asar.unpacked/resources/plugins/workbuddy-builtin/skills/expert-manager/，已读取主 Skill、四份 references，检查五个功能脚本及测试文件的相关逻辑。未运行它的脚本、未观察全部内部执行实现。参考其公开可见行为和设计，不复制其专有源码或标识。

学习重点：

- 一个 expert-manager 路由单专家/专家团、交互/资料转化/修改。
- 独立专业成员覆盖完整分析域；主理人有成员能力、典型问法及工作流路由，负责组织而非模拟成员发言。
- MD 角色模板与详细 references 指导内容制作，初始化/校验/注册/打包承担确定性操作。
- 创建成功后能被发现，修改原对象，形成使用和分享闭环。

不照搬：WorkBuddy 的 plugin.json/TeamCreate/SendMessage、marketplace 私有格式、固定标签数量、Python 语言选择、主理人与所有阶段统一回合上限。角色名称可以由 AI 起草，不强制谐音花名。

## 2. 当前代码与差异

现有创建提示词：packages/plugins/experts/src/authoring/guide.ts。
注册入口：packages/plugins/experts/src/index.ts 的 workdsh-expert-manager，resourceBase 指向 resources/expert-manager。
参考资源：resources/expert-manager/references/material-and-methods.md、trial-and-delivery.md。
resources/templates 当前仅占位，没有可用角色模板。
单专家定义在 contracts 的 ExpertDefinition 中，role/methodology/boundaries/deliverables 等文字由用户/AI 写入 Host 数据；不是全部写死在 TS。
用户定义、草稿、发布修订由现有 storage domain 管理。preset-compiler.ts 将已校验定义编译为官方 preset，不直接运行任意用户 MD 配置。
team-runs.ts/team-tools.ts/delegation-provider.ts 是其他 AI 正在开发的团队执行增量，需复用并单独验收。

核心差异：现有 TeamRun 是一次执行对象，没有完整的可复用团队制作、成员草稿关系和整团发布体验。不得把 open(run) 冒充 create(teamDefinition)。

## 3. 用户需求与范围

R01：创建入口支持单专家、专家团、已有材料转化和修改，沿用普通对话。
R02：AI 根据需求制作职业定位、专业方法、适用问题、输入、输出和边界；有足够信息就先起草。
R03：只有职责、能力、权限或关键事实无法确定时，集中提出必要问题。名称、一般版式、角色描述可起草供审阅，不让用户先填流程表。
R04：团队支持明确主持人、多个专业成员、能力路由及可复用工作流。复用已有专家；缺少则建立成员草稿，不自动编造已存在的能力。
R05：草稿保存后即在列表可发现，创建会话关联对应对象；完成回执给出真实卡片/详情入口和实际状态。
R06：自然语言修改更新原草稿，保留未要求修改内容。重复调用、中断和部分失败不重复创建团队或成员。
R07：生成规范文件、校验与登记由 Host 确定性服务完成。AI 不直接写数据库、marketplace 或用户安装目录。
R08：发布锁定团队及成员修订；未就绪依赖阻止可执行发布。沿用现有受信发布确认，仅一次清楚呈现整团情况，不新增重复确认。
R09：成员真正独立运行，专业结果必须来自实际任务，不由主持人模拟角色输出；完整成果供后续步骤读取，必要汇总保留原始引用。
R10：首版页面只补类型/状态展示、团队详情/卡片和现有发布预览。修改优先继续对话；不强制制作工作台或流程画布。
R11：头像可采用默认值/上传，具备生图能力时可选生成；不阻塞主要创建流程。
R12：MD 格式可阅读、可导入导出；导入不得执行文档中的指令、shell、工具权限或任意插件配置。

## 4. 制作资源：用 MD，不用 TS 长字符串

建议目录，实际文件名由工程资源访问约定确定：

packages/plugins/experts/resources/expert-manager/
  SKILL.md
  references/
    authoring-fields.md
    agent-authoring.md
    team-authoring.md
    workflow-authoring.md
    material-and-methods.md
    trial-and-delivery.md
    import-and-sharing.md
  templates/
    expert.md
    coordinator.md
    member.md
    team.md
  examples/
    financial-team.md
    research-team.md

SKILL.md 是短入口：用途、四种场景路由、基本步骤、读取哪些参考、哪些工具实际存在、完成状态。不要把所有领域事实核对和失败样本堆进入口。
agent-authoring 解释角色、能力、方法、工具/数据获取、成果和例外，并给完整示例。
team-authoring 解释成员选取、主理人能力路由、整团保存、修改与失败保留。
workflow-authoring 给真实输入输出依赖及并行/串行示例，不把阶段标签当成实际调度。
authoring-fields 列本工程真实契约和资源映射，不从 WorkBuddy 抄字段。
import-and-sharing 在没有真实接口时明确不可调用；不提前写假成功的操作指南。

模板正文以专业职责为核心，不能全是营销简介。建议角色正文：身份与适用问题、核心能力、分析/工作方法、可用资源、输出规范、边界。主理人额外包含成员能力路由、工作流和汇编职责。

入口 register 时从随包发布的 SKILL.md 读取正文；继续使用官方 skills.register 和 resourceBase。若保留 expertManagerSkillContent 兼容导出，它必须从 MD 派生，不能再有另一份独立文案。采用异步加载或构建生成薄模块均可，选择符合现有注册生命周期的一种。
迁移第一步不改文案语义：先把原内容搬进 MD，验证资源打包及注册，再拆分并改写。模板/示例仅在 AI 需要时读取，不全量注入每个普通任务。
构建、pack 必须包含 MD、references、templates、examples，安装版通过 import.meta.url 相对读取，不能依赖源码路径或 .test-runtime 的绝对路径。

## 5. 用户专家 MD 与唯一状态来源

区分两类：插件内置制作文档是代码仓库 MD；用户专家是受治理业务数据。用户专家不变成一个 npm 插件，不获得自定义 Cordis 配置权限。

首个兼容切片：保留现有 ExpertDefinition/草稿/修订作为唯一状态来源，提供确定性 MD 序列化、预览和导入；导出的 expert.md/team.md 是该明确修订的投影，不是另一份可被偷偷修改的运行真源。
MD 导入经 Host 解析到同一草稿与 expectedRevision；更新成功后重新生成展示投影。禁止轮询文件自动覆盖业务表。

如果后续采用 MD 为正文真源：新增版本化格式与迁移设计，发布修订保存精确 MD 字节及摘要，role/methodology 等只能从该正文派生，不能独立编辑。已有修订和运行 preset 保持原编译器结果，不批量重写。不能在这次资源迁移中顺带引入双真源。

建议 authoring MD frontmatter 只允许格式版本、对象类型、名称/介绍及明确的逻辑引用；角色正文用固定章节解析到现有字段。团队机器字段由严格结构承载，正文承载专业说明。禁止接受 tools、服务名、包名、JS、任意 Cordis YAML 等配置。文本含 persona 模板敏感标记时按现有校验处理，不悄悄改变变量语义。
解析格式有规范、确定性往返与错误定位，不能靠正则猜任意标题后称导入成功。

## 6. 可复用团队领域对象与创建事务

在专家插件所有权内补 TeamDefinition、TeamDraft、PublishedTeamRevision，TeamRun 引用 PublishedTeamRevision。无需另外做业务大核心或第二套团队执行器。
团队定义最小内容：稳定 ID/名称/用途、最终成果、主持人、成员逻辑 key/职责/专家引用、能力路由、工作流/示例、资源归属、来源关联。
草稿允许引用未发布成员，展示待补齐状态；发布修订必须解析每位成员到有权使用的精确专家修订和现有 Skill 依赖锁。

同一 Host 服务向 UI/Agent 提供：list/get/createDraft/updateDraft/validate/requestPublish/confirmPublish/clone 以及后续 import/export。这里是建议行为，不是现有工具名称。
先实现这些能力并明确 contracts，再在 SKILL.md 写实际名称和调用规则。
创建输入带 mutation context 与幂等 operationId；同 operation/同载荷返回原结果，异载荷冲突。每个待建成员有稳定关联，成功成员草稿保留，失败重试不复制已有成员。
初期无需为创建团队同时发布所有成员做跨插件大事务；用明确 preparation 状态与受信确认流程处理。发布前一次展示待发布成员与冻结引用，业务写入结果可核对，部分结果如实回执。
成员可在同一团队承担多个职责，但是否独立评审依任务风险及当前 SOP 支持决定。不得要求用户为每步选择评审者；若当前运行模型只支持严格 worker/reviewer，由 AI 按实际能力生成可执行配置，不能文案宣称可选而服务拒绝。

## 7. 运行技术路线与已知缺口

复用现有公开 Agent/Loop/Session/Skill/Preset/Storage、专家修订与受控 one-shot provider。业务执行绑定每位成员自己的专家修订，TeamRuns 管 SOP/成果/评审。
官方实验 Agent Teams 的默认 fresh/fork 成员继承主专家；目前独立探针没有证明不同已有专家能加入同一官方名册。不得虚构 preset 参数、adopt 接口或更换官方 factory。
当前选择产品专家团编排与官方 subagent 执行时，准确说明技术身份，不冒充官方 continuable Team。该路线仍要核对现有 ADR 与正式实现，不能用本文替换现行所有权设计。
工具执行测试发现全局 Team tools 与非成员 one-shot 的工具后步骤存在冲突。不要盲目把实验 Team tools 混进产品 preset；现有独立证据在 /tmp/workdsh-team-verify.OlMk3U/REPORT.md。
工作流模板与可执行计划不同：输入/成果规范、主持人说明先经严格转换为运行服务支持的 plan，运行事实仍以官方日志为准。恢复读取绑定/回执/既有成果，不自动重启所有任务。

## 8. 实施批次与文件责任

S1：MD 资源迁移。修改 authoring/guide.ts、index.ts 与必要的 build/pack；新增 SKILL.md。保持全部业务接口及旧定义行为。证据是安装包资源可读、Skill 内容与文件一致、普通任务不被额外注入。
S2：创建指引与模板。补上述 references/templates/examples；入口以正向制作步骤为主，跨域公共原则只保留必要部分；把异常案例规则放相关参考，不灌入每个角色。清楚标明此批只能制作方案或单专家草稿，不能提前宣称团队存储已完成。
S3：团队定义/草稿/发布 contracts + domain + Host 服务 + Agent 管理工具。复用现有单专家服务和团队运行增量，给出一份字段映射及状态图；运行工具不承担创建定义职责。
S4：最小页面闭环。专家中心类型/状态筛选、整团卡片/详情、现有预览确认扩展、创建会话关联。改 UI 前读 UI-DESIGN；不新增多步向导。
S5：运行与恢复集成。将发布定义转入现有 TeamRuns，分别验证正确成员配置/Skill、顺序依赖、成果交付、取消和冷恢复。
S6：MD 导入导出与分享。先做同一对象的可读投影及 round trip，不把私人 Session/凭据/绝对路径放入包。依赖缺失提供预览与修复入口。

每批结束写 actual evidence / 未执行 / 下一批，提交或安装人工 preview 需遵守用户授权与工程约定。不得把六批合并写成整体完成。

## 9. 验收：功能、专业内容、安装分别检查

A01 安装 tgz 后，无源码目录也能读 SKILL.md 及全部引用，版本和资源匹配。
A02 创建单专家不回归：真实 list/get/skill catalog/draft/validate/requestPublish 路径可用，修改不丢失旧方法。
A03 一句话财务团队生成主持人+会计+出纳，职责完整、避免重复注册，有真实可审阅草稿；不声称已获得付款权限。
A04 复用专家+缺成员混合，保留每个真实 ID/状态；一个成员失败后补齐不重建成功成员。
A05 普通研究团队有明确资料来源、分析方法、产出和能力路由，不套财务字段/计算规则。
A06 创建意图充足时不问填写技术字段，必要缺口集中问；名称/展示可直接起草。
A07 发布锁真实成员与 Skill，运行中修改团队不影响已有绑定；跨组织引用/撤权仍正确拒绝。
A08 对话修改一位成员或职责，其他方法/工作流保留；并发 revision 冲突不会盲目覆盖。
A09 团队定义刷新/重启仍存在；TeamRun 与可复用定义不同，不自动恢复执行。
A10 专业成员通过真实子任务产生不同成果，主持人不能仅输出模拟三角色报告；工具执行无实验 Team 非成员报错。
A11 依赖成果传入下一成员，最终文件存在、可打开/下载，文件版本验收沿用已有 Host 规则。
A12 MD 投影与对象一致，导入回同一严格格式，未知字段/命令不执行，不引入第二状态真源。

确定性模型验证结构与工具事实；真实模型验证创作质量和合理分工，至少两个跨域案例并记录已用模型/输入/输出。不以数量过多的异常探针替代创建体验，也不以截图或 JSON 正确代替专业内容。
运行相应模块 build/typecheck/integration 与安装资源 smoke，具体命令以 package.json 和当前交接为准。不要执行假命令或扩大无关测试。此文档编写未执行这些验收。

## 10. 开发 AI 可直接使用的任务说明

“按本交接先实施 S1，创建提示词移入随插件发布的 SKILL.md，保持旧行为及唯一来源， 完成安装包资源可读验证。再完成 S2 的 references/模板，沿用普通对话，能力为未实现时不能写假调用。每批核对其他 AI 当前改动，更新设计台账与证据。未完成 S3 前不得宣称可保存专家团；S3～S6 依次推进，复用现有正式团队运行服务与官方执行底座，不改上 游、不创建第二执行器、不新增复杂创建 UI。完成汇报必须区分实现、确定性测试、真实 模型、preview 安装和发布。”

## 11. 实施进度（工程内回填）

- 2026-09-13 S1 完成：创建提示词迁入随包 `packages/plugins/experts/resources/expert-manager/SKILL.md`（frontmatter name/description/when-to-use + 正文 3439 字符逐字节迁移），`src/authoring/guide.ts` 只读取、解析与校验该文件，`src/index.ts` 经 `registerExpertManagerSkill` 注册；tgz 含 SKILL.md 与两份 references、解包 dist 可读、真实 SkillRegistry 内容一致且 catalog 摘要不含正文；专家包 build/typecheck 通过、全量集成 90/90（新增 2 项）。证据：[expert-authoring-s1.md](../../evidence/expert-authoring-s1.md)。
- 未执行：preview 安装态重装与 18989、真实模型回归（安排在 S2 改写后）、S2～S6 全部。本批与 TM-01 相互独立：不改团队运行代码、不切 TM-01 状态；TM-01 验收仍在用户侧。
- 下一批 S2：补 references、角色模板与完整示例；引用资源见本文档第 4 节建议目录。S3 的团队定义/草稿/发布与 [TEAM-IMPLEMENTATION-HANDOFF](TEAM-IMPLEMENTATION-HANDOFF.md) 中 TM-02 目标合流，执行时合并为同一切片，不重复实现。
