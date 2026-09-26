# PRD：专家中心与专家团

编号：PRD-EXPERTS-001 · 版本：1.1 · 日期：2026-09-12 · 状态：设计基线，待实施验收。

## 1. 背景与目标

用户已完成本地 Skill 管理阶段，希望把多次重复描述的专业背景、工作方法和交付标准保存为专家，并在原生任务中直接使用。WorkBuddy 作为交互参照；WorkDSH 保持官方 Harness 的任务执行方式及自己的数据和治理边界。

单专家目标：用户可从默认专家开始、制作自己的专家、查阅和修改定义，并在明确的工作区内创建真实任务。团队目标：让主持人和专业成员按明确职责协作，用户能判断谁在做什么、哪些交付完成、哪里失败。

**概念边界：** Skill 是可复用能力；专家是配备真实能力、具备领域经验与专业判断的 AI 角色；专家团是多位专家加 SOP 编排形成的协作团队。Skill 本身也可含方法指导，专家不垄断“方法”；区别在于专家对专业问题承担整体判断、能力组合与交付职责。选择任何一个都不额外授予文件、连接器或业务权限。

本轮依据用户提供的[组成关系图](references/skill-expert-team-relationship.png)、[使用详情](references/expert-use-detail.png)和[配备技能](references/expert-equipped-skills.png)修订。图片属于产品参考材料，不执行其中示例任务或链接。既有需求编号保留；本轮补充不是宣称参考产品内部技术实现已经被验证。

## 2. 当前能力与业务变更

| 现有能力 | 匹配度 | 缺口及建议 | 来源 |
|---|---|---|---|
| 原生工作区、任务、输入框 | 部分 | 复用；增加专家绑定和草稿交接 | [工作台目录](../../../packages/plugins/workbench)、[会话规范](../../dsh-v0.1.6-alpha.2/subsystems/conversation.zh.md) |
| Skill 管理和自然语言创建 | 部分 | 复用能力目录与管理经验；新增专家定义，不混入 Skill 列表 | [Skill 目录](../../../packages/plugins/skills) |
| 本地主体、授权、审计 | 部分 | 专家管理消费这些服务；不能宣称企业多用户已经完成 | [治理契约](../../../packages/contracts/src/governance.ts) |
| 公共 Modal、Icon、导航 | 部分 | 复用外壳，新增专家内容组件 | [UI 出口](../../../packages/ui/src/index.ts) |
| 专家管理 | 部分 | 已有草稿、确认发布、固定修订、原生召唤与打包预览；专业体验、真实技能选择及完整交付尚待验收 | [专家目录](../../../packages/plugins/experts/README.md)、[当前证据](../../evidence/d04-experts-review-fixes.md) |
| 多成员执行 | 部分 | 官方能力可研究，业务团队和恢复待实现 | [专家团方案](EXPERT-TEAMS.md) |

变化：用户从“每次重新描述角色”进入“选择已发布专家版本”；从“仅有聊天内容”进入“能回查本次用的角色和依赖”。已有默认任务不强制选择专家，旧任务不自动迁移或绑定新专家。

## 3. 范围与版本

| 范围 | 当前专家 0.1 / D04 | 后续 |
|---|---|---|
| 专家目录、详情、搜索、个人管理、置顶/最近 | 必须 | 公共排序与运营推荐 |
| 对话制作、可编辑草稿、校验、发布、复制、停用、归档 | 必须 | 组织审批 |
| 关联已安装 Skill、锁定声明依赖、原生任务、关联交接 | 必须 | 项目/资料库/连接器完整领域协作 |
| 本地专家包导入/导出 | 必须 | 组织签名分发和市场安装 |
| 专家团详情、SOP 和真实执行 | 本包设计；当前不开放可点击假功能 | D11；先明确协作流程再启动执行 |
| 公共专家、企业服务器和管理 Web | 不开发；预留来源和 owner | 企业阶段 |

默认模板只读，复制后属于“我的专家”。没有公共服务时不出现“热门百万使用”“推荐安装”或虚构分类。分类设计保留：仅在数据确有分类时展示筛选，未分类不会被丢弃。

## 4. 角色与关键旅程

### 4.1 使用专家

浏览默认/个人可用专家 → 打开详情 → 点击“召唤专家”或任务示例 → 确认目标工作区 → 打开带专家标记的原生任务草稿 → 用户检查模型、权限、附件和正文 → 用户发送 → 查看原生执行和交付。

- 详情和示例点击均不产生模型费用或自动执行。
- 初次召唤使用最新可用发布版本；进入任务后绑定固定版本，后续修改不改变该任务。
- 任务已有内容时换专家创建关联新任务，原任务保留；用户选择可携带摘要和资料，不能默认复制全部历史与凭据。

### 4.2 制作专家

“制作专家” → 原生任务框加载 `expert-manager` 与引导草稿 → 用户补充 → 对话澄清 → 形成可审阅草稿 → 校验 → 用户确认发布 → 我的专家可见 → “去试试”准备新业务任务。

制作过程只管理专家定义，不执行专家所描述的业务。创建工具可以读写草稿，但不能仅凭模型自称“用户同意”发布。

### 4.3 编辑与历史

编辑我的专家 → 基于当前版本产生草稿 → 保存有冲突提示 → 校验和发布新版本 → 新任务用新版本，旧任务仍显示旧版本。停用阻止新任务和现有任务的下一次使用/恢复；不声称已经停止在途调用。归档从常用目录移除，保留审计与任务引用，仍按停用规则阻止继续使用；历史内容可读。

### 4.4 专家团（D11）

选团队 → 读成员职责、主持人、SOP 和交付示例 → 准备团队任务 → 用户发送 → 澄清目标和输入 → 依据 SOP 拆解并展示协作计划 → 在可并行阶段启动成员 → 按输入输出契约交接与评审 → 主持人验收、汇总可核对产物。部分成员失败应显示部分结果而不是“全部成功”。

## 5. 功能与验收要求

下表是需求主清单；编号用于实现和验收，优先级只在各自范围内比较。

| ID | 需求 | 可观察验收 |
|---|---|---|
| REQ-EXP-001 | 专家中心展示实际可用默认与个人专家，支持名称/描述/标签搜索 | 搜索可清除；无结果与服务异常不同；数量来自实际数据；当前无公共市场页签 |
| REQ-EXP-002 | 详情展示头像、名称、来源、描述、标签、示例和可用状态 | 长标题完整可读；示例准备对应草稿；没有真实用量不显示数字 |
| REQ-EXP-003 | 原生任务中召唤、置顶、最近与查找 | 置顶重启保留；最近以用户实际发送为准；未找到明确提示；草稿不丢失 |
| REQ-EXP-004 | 制作专家进入原生输入框并提供管理引导 | 精确加载参考引导；保留 /、@、附件、模型和权限；不自动发送 |
| REQ-EXP-005 | 草稿可保存、预览、编辑、校验并经确认发布 | 必填缺失/依赖不可用阻止发布；确认失效或内容变化不能复用；并发修改提示冲突 |
| REQ-EXP-006 | 支持复制、停用、重新启用和归档 | 默认模板只读可复制；操作真实持久；在用记录不被物理删除；不默认改其他专家 |
| REQ-EXP-007 | 专家声明依赖并在任务中保持可追溯版本 | 能查本次专家与显式 Skill 修订；依赖漂移不能回退默认；普通任务仍可用原有全局 Skill |
| REQ-EXP-008 | 专家任务可恢复并保留原生能力 | 重启后角色不变；原生历史、队列、取消、模型与权限可用；发现损坏明确阻断 |
| REQ-EXP-009 | 已有任务换专家使用关联交接 | 原任务不改角色；新任务有来源链接；摘要可编辑；失败不丢原任务也不重复建任务 |
| REQ-EXP-010 | 导入、导出本地专家定义 | 预检先于提交；同名不覆盖；不随包自动安装代码/技能或导入凭据；失败恢复无半成品 |
| REQ-EXP-011 | 页面与对话管理具有一致规则 | 相同无效草稿从两入口得到一致错误；主体由 Host 解析；关键变更有审计 |
| REQ-EXP-012 | 界面可访问、响应式、与现有工作台一致 | 键盘能完成关键流程；关闭弹框焦点回归；360/768/1440 宽度不截断主操作；暗/浅主题可读 |
| REQ-TEAM-001 | 专家团详情展示真实成员和主持人 | 唯一主持人；成员角色、绑定版本、状态真实；案例无数据则不展示 |
| REQ-TEAM-002 | 团队按分工真实运行并可核对结果 | 每成员有原生执行关联；状态与产物可回查；禁止单 Agent 角色扮演冒充多人 |
| REQ-TEAM-003 | 团队处理取消、失败、恢复与资源限制 | 拒绝越权/递归膨胀；部分失败可见；未知终止状态不标完成；恢复不重复外部副作用 |

| REQ-EXP-013 | 专业经验与判断必须指导整个任务 | 明确领域、判断标准、必要追问、执行方法与交付质量；信息不足不编造结论，标签不代替经验 |
| REQ-EXP-014 | 从真实已安装技能选择并呈现专家配备能力 | 可搜索、选择、移除；展示真实名称/简介/可用性，保存稳定引用；无匹配或歧义明确处理；不凭空生成技能或自动安装 |
| REQ-EXP-015 | 使用详情与创建编辑分开，支持完整专业内容审阅 | 默认详情展示身份/简介/擅长领域/任务示例/真实配备技能/召唤；专业设定可审阅；编辑仅在明确管理操作后进入 |
| REQ-EXP-016 | 以完整业务场景验收专家交付 | 数据分析场景实际经历澄清、数据核验、技能调用、证据分析与成果检查；输出可打开且可核对的成果，缺数据时追问；固定适配器与真实模型证据分开 |
| REQ-TEAM-004 | 团队必须有可审阅和版本固定的 SOP | 明确阶段/负责成员/先后依赖/并行条件/输入输出/评审与汇总规则；主持人动态计划必须遵守已发布 SOP；空流程或循环依赖拒绝发布 |
| REQ-TEAM-005 | 创建、编辑和发布真实专家团 | 选择已发布专家与唯一主持人，配置职责及 SOP，预览校验并确认发布；新成员版本只影响新的团队修订，不静默修改运行任务 |
| REQ-TEAM-006 | 成员交接和团队最终交付可验收 | 交接携带必要资料、产物及结论，接收成员核验缺失与冲突；有修改反馈闭环，汇总追溯真实产物；团队完整场景出现依赖阶段和至少一次可并行分工 |

## 6. 内容模型与业务规则

专家由基本信息、角色目标、专业方法、工作边界、交付要求、任务示例及能力依赖组成。草稿可变，发布版本不可变；停用/归档是可用性状态，不改写历史发布内容。标签和类别用于查找，不自动推断技能或权限。

“我的专家”指当前主体拥有的专家；收藏默认专家不把它变成个人所有。最近/置顶属于用户偏好。用量若未来显示，必须说明统计范围和口径；当前不仿造参考图数字。

管理权限与使用权限分开。专家需要的资料或连接器尚未建设时，普通文本说明可以保存；将其声明为执行必需依赖则显示“尚不支持”，不能发布成可执行专家。不得用自由文本宣称连接已授权。


### 6.1 专家是什么，何时使用

用户只需要补充某项操作能力时安装 Skill；有明确专业问题、需要判断与完整成果时选择专家；问题需要多角色分工、交接与共同交付时选择专家团。三者可组合使用，不能仅按任务字数自动决定团队，也不宣称单专家无法完成复杂任务。

专家的核心由六方面组成：专业身份与任务目标；领域经验与判断标准；工作方法与必要追问；真实配备能力；成果质量要求；边界及何时交回用户。经验可以来自用户明确提供的背景、方法和实践总结，不能伪造学历、资历、认证或历史成功率。现有角色/方法/约束/交付内容承载这些要求，是否拆成新字段由 HLD 决定，不将界面标签当作能力证明。

配备技能和运行中可发现的全局技能必须区分。详情中的“配备技能”来自显式配置；数量来自实际引用，不把目录中全部技能算入专家。领域技能只在实际需要时调用，无需每任务调用所有配备技能。全局技能仍受原有发现与权限规则约束，专家配备能力不意味着扩大权限。缺少技能时显示影响并引导用户自行修复，不能用“稍后会安装”伪装当前可用。

### 6.2 创建与使用体验

创建过程优先自然语言引导：目标问题 → 专业背景/经验 → 分析方法/判断标准 → 所需能力与成果 → 生成可审阅草稿 → 校验 → 明确发布 → 用一个示例试用。已有信息足够就直接起草，只对影响正确性的缺口追问；表单用于精细编辑，不要求用户从零填写长篇技术配置。

使用详情优先回答“谁能帮我、能做什么、如何交付”：头像或诚实的默认标记、姓名/专业身份、简介、擅长领域、具体任务示例、真实技能列表、召唤。版本与技术信息次级显示，不将技能 ID、修订摘要、配置输入框作为主要用户内容。未授权支持的外部产品不能写成当前专家能力；参考中的飞书只代表未来可选数据来源。

### 6.3 数据分析师的完整验收场景

测试使用安全合成数据：三个月门店销量、客流、转化与客单价，包含可核对的质量问题；固定正确基准及允许的诊断结论。用户提出“销量下降，请判断原因并给管理层报告”。专家应先核对周期、指标公式及数据来源；缺少必要数据时追问；调用真实已配备技能读取/整理表格、计算指标与生成可打开成果；区分事实、相关性与因果假设；输出证据、限制和行动建议；交付前检查成果与源数据一致。

场景至少覆盖正常数据、缺少关键指标、脏数据、技能不可用四条路径。不得仅凭销量下降就编造原因，不将单条模型回答或工具调用成功当作场景交付通过。具体指标和测试基准由验收文档规定；远程模型并非固定文本输出，按正确性与成果要求评价。

### 6.4 专家团组成与协作

成员必须是可引用的已发布专家，主持人负责目标澄清、计划、交接控制和最终汇总。SOP 定义谁负责、先后关系、何时并行、输入输出与质量检查；不是一段“请多人协作”的提示词。动态分工仅在流程允许范围内调整，不允许模型替换成员或绕过评审阶段。

使用软件交付团队作为原创场景：需求澄清 → 架构与验收设计（符合输入条件时并行）→ 实现 → 测试与修改反馈 → 主持人汇总交付。成员收到的是必要输入与已核验产物，不能默认复制全部会话和凭据；出现冲突应注明并反馈处理。主持人不能替用户批准外部写入或发布。

## 7. 成功指标和非功能要求

以下是验收目标，不是已测数据；测试报告须记录机器、Host、数据规模、网络与实测值。

| 指标 | 目标 | 测量方式 |
|---|---|---|
| 主流程完成 | 创建→发布→发送→恢复、编辑新版本→旧任务保持版本两条路径均通过 | 打包 Web 操作记录 + Host/Session 证据 |
| 数据正确 | 版本冲突、提交失败和重启测试不丢已确认发布内容；不出现重复任务 | 故障注入 + 重启集成 |
| 目录响应 | 本地 1,000 个摘要下搜索 p95 ≤ 300ms；详情 p95 ≤ 500ms（不含模型） | 30 次暖请求；冷启动另记 |
| UI 响应 | 点击后 100ms 内出现选择、加载或错误状态 | 浏览器性能记录，不能用假成功替代 |
| 兼容 | 原生 /、@、附件、权限、模型、工作区菜单回归全部通过 | 既有回归 + 新场景 |
| 生命周期 | 插件卸载/重装无残留导航、工具、订阅和重复服务 | Loader/打包浏览器验证 |
| 真实性 | 所有可见主操作有成功与失败验收；无仅 toast 的假操作 | UI 操作矩阵 |

## 8. 范围收口

D04 完成以 [EP-07](IMPLEMENTATION-AND-ACCEPTANCE.md) 签收为准；不得以团队或企业需求无限延长单专家阶段。尚未通过的核心验收须具体列出编号，不用“基本完成”掩盖。用户提供截图的布局意图优先于臆造的市场功能。

本轮有限开发顺序见 [需求修订与开发计划](DEVELOPMENT-PLAN.md)。新增要求纳入既有 EP-05/EP-07 和 TM-01～04，不另起专家 0.2、不提前实施 D11。

元数据内需求均是目标，`proposed` 不表示已实现。机器追溯块由主清单生成；具体测试编号见验收文档。

<!-- TRACEABILITY-METADATA:BEGIN -->
```yaml
schema:
  name: testany-traceability
  version: "1.0.0"
  profile: prd-profile-v1
artifact:
  id: PRD-EXPERTS-001
  type: PRD
  title: "专家中心与专家团"
  status: draft
  owners: ["WorkDSH"]
  created_at: "2026-09-12"
  updated_at: "2026-09-12"
  source_documents:
    - id: SRC-USER
      uri: "REFERENCES.md"
    - id: SRC-SCREENSHOTS
      uri: "references/README.md"
    - id: SRC-WB
      uri: "https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Expert-Center"
    - id: SRC-USER-RELATIONSHIP
      uri: "references/skill-expert-team-relationship.png"
    - id: SRC-USER-USE
      uri: "references/expert-use-detail.png"
    - id: SRC-USER-SKILLS
      uri: "references/expert-equipped-skills.png"
    - id: SRC-PLAN
      uri: "../../PLAN.md"
entities:
  requirements:
    - id: REQ-EXP-001
      class: functional
      title: "专家中心展示实际可用默认与个人专家，支持名称/描述/标签搜索"
      statement: "专家中心展示实际可用默认与个人专家，支持名称/描述/标签搜索"
      priority: P0
      status: proposed
      scope: D04
      acceptance_criteria:
        - "搜索可清除；无结果与服务异常不同；数量来自实际数据；当前无公共市场页签"
    - id: REQ-EXP-002
      class: functional
      title: "详情展示头像、名称、来源、描述、标签、示例和可用状态"
      statement: "详情展示头像、名称、来源、描述、标签、示例和可用状态"
      priority: P0
      status: proposed
      scope: D04
      acceptance_criteria:
        - "长标题完整可读；示例准备对应草稿；没有真实用量不显示数字"
    - id: REQ-EXP-003
      class: functional
      title: "原生任务中召唤、置顶、最近与查找"
      statement: "原生任务中召唤、置顶、最近与查找"
      priority: P0
      status: proposed
      scope: D04
      acceptance_criteria:
        - "置顶重启保留；最近以用户实际发送为准；未找到明确提示；草稿不丢失"
    - id: REQ-EXP-004
      class: functional
      title: "制作专家进入原生输入框并提供管理引导"
      statement: "制作专家进入原生输入框并提供管理引导"
      priority: P0
      status: proposed
      scope: D04
      acceptance_criteria:
        - "精确加载参考引导；保留 /、@、附件、模型和权限；不自动发送"
    - id: REQ-EXP-005
      class: functional
      title: "草稿可保存、预览、编辑、校验并经确认发布"
      statement: "草稿可保存、预览、编辑、校验并经确认发布"
      priority: P0
      status: proposed
      scope: D04
      acceptance_criteria:
        - "必填缺失/依赖不可用阻止发布；确认失效或内容变化不能复用；并发修改提示冲突"
    - id: REQ-EXP-006
      class: functional
      title: "支持复制、停用、重新启用和归档"
      statement: "支持复制、停用、重新启用和归档"
      priority: P0
      status: proposed
      scope: D04
      acceptance_criteria:
        - "默认模板只读可复制；操作真实持久；在用记录不被物理删除；不默认改其他专家"
    - id: REQ-EXP-007
      class: functional
      title: "专家声明依赖并在任务中保持可追溯版本"
      statement: "专家声明依赖并在任务中保持可追溯版本"
      priority: P0
      status: proposed
      scope: D04
      acceptance_criteria:
        - "能查本次专家与显式 Skill 修订；依赖漂移不能回退默认；普通任务仍可用原有全局 Skill"
    - id: REQ-EXP-008
      class: functional
      title: "专家任务可恢复并保留原生能力"
      statement: "专家任务可恢复并保留原生能力"
      priority: P0
      status: proposed
      scope: D04
      acceptance_criteria:
        - "重启后角色不变；原生历史、队列、取消、模型与权限可用；发现损坏明确阻断"
    - id: REQ-EXP-009
      class: functional
      title: "已有任务换专家使用关联交接"
      statement: "已有任务换专家使用关联交接"
      priority: P0
      status: proposed
      scope: D04
      acceptance_criteria:
        - "原任务不改角色；新任务有来源链接；摘要可编辑；失败不丢原任务也不重复建任务"
    - id: REQ-EXP-010
      class: functional
      title: "导入、导出本地专家定义"
      statement: "导入、导出本地专家定义"
      priority: P0
      status: proposed
      scope: D04
      acceptance_criteria:
        - "预检先于提交；同名不覆盖；不随包自动安装代码/技能或导入凭据；失败恢复无半成品"
    - id: REQ-EXP-011
      class: functional
      title: "页面与对话管理具有一致规则"
      statement: "页面与对话管理具有一致规则"
      priority: P0
      status: proposed
      scope: D04
      acceptance_criteria:
        - "相同无效草稿从两入口得到一致错误；主体由 Host 解析；关键变更有审计"
    - id: REQ-EXP-012
      class: non_functional
      title: "界面可访问、响应式、与现有工作台一致"
      statement: "界面可访问、响应式、与现有工作台一致"
      priority: P0
      status: proposed
      scope: D04
      acceptance_criteria:
        - "键盘能完成关键流程；关闭弹框焦点回归；360/768/1440 宽度不截断主操作；暗/浅主题可读"
    - id: REQ-TEAM-001
      class: functional
      title: "专家团详情展示真实成员和主持人"
      statement: "专家团详情展示真实成员和主持人"
      priority: P0
      status: proposed
      scope: D11
      acceptance_criteria:
        - "唯一主持人；成员角色、绑定版本、状态真实；案例无数据则不展示"
    - id: REQ-TEAM-002
      class: functional
      title: "团队按分工真实运行并可核对结果"
      statement: "团队按分工真实运行并可核对结果"
      priority: P0
      status: proposed
      scope: D11
      acceptance_criteria:
        - "每成员有原生执行关联；状态与产物可回查；禁止单 Agent 角色扮演冒充多人"
    - id: REQ-TEAM-003
      class: functional
      title: "团队处理取消、失败、恢复与资源限制"
      statement: "团队处理取消、失败、恢复与资源限制"
      priority: P0
      status: proposed
      scope: D11
      acceptance_criteria:
        - "拒绝越权/递归膨胀；部分失败可见；未知终止状态不标完成；恢复不重复外部副作用"
    - id: REQ-EXP-013
      class: functional
      title: "专业经验与判断必须指导整个任务"
      statement: "专业经验与判断必须指导整个任务"
      priority: P0
      status: proposed
      scope: D04
      acceptance_criteria:
        - "明确领域、判断标准、必要追问、执行方法与交付质量；信息不足不编造结论，标签不代替经验"
    - id: REQ-EXP-014
      class: functional
      title: "从真实已安装技能选择并呈现专家配备能力"
      statement: "从真实已安装技能选择并呈现专家配备能力"
      priority: P0
      status: proposed
      scope: D04
      acceptance_criteria:
        - "可搜索、选择、移除；展示真实名称/简介/可用性，保存稳定引用；无匹配或歧义明确处理；不凭空生成技能或自动安装"
    - id: REQ-EXP-015
      class: functional
      title: "使用详情与创建编辑分开，支持完整专业内容审阅"
      statement: "使用详情与创建编辑分开，支持完整专业内容审阅"
      priority: P0
      status: proposed
      scope: D04
      acceptance_criteria:
        - "默认详情展示身份/简介/擅长领域/任务示例/真实配备技能/召唤；专业设定可审阅；编辑仅在明确管理操作后进入"
    - id: REQ-EXP-016
      class: functional
      title: "以完整业务场景验收专家交付"
      statement: "以完整业务场景验收专家交付"
      priority: P0
      status: proposed
      scope: D04
      acceptance_criteria:
        - "数据分析场景实际经历澄清、数据核验、技能调用、证据分析与成果检查；输出可打开且可核对的成果，缺数据时追问；固定适配器与真实模型证据分开"
    - id: REQ-TEAM-004
      class: functional
      title: "团队必须有可审阅和版本固定的 SOP"
      statement: "团队必须有可审阅和版本固定的 SOP"
      priority: P0
      status: proposed
      scope: D11
      acceptance_criteria:
        - "明确阶段/负责成员/先后依赖/并行条件/输入输出/评审与汇总规则；主持人动态计划必须遵守已发布 SOP；空流程或循环依赖拒绝发布"
    - id: REQ-TEAM-005
      class: functional
      title: "创建、编辑和发布真实专家团"
      statement: "创建、编辑和发布真实专家团"
      priority: P0
      status: proposed
      scope: D11
      acceptance_criteria:
        - "选择已发布专家与唯一主持人，配置职责及 SOP，预览校验并确认发布；新成员版本只影响新的团队修订，不静默修改运行任务"
    - id: REQ-TEAM-006
      class: functional
      title: "成员交接和团队最终交付可验收"
      statement: "成员交接和团队最终交付可验收"
      priority: P0
      status: proposed
      scope: D11
      acceptance_criteria:
        - "交接携带必要资料、产物及结论，接收成员核验缺失与冲突；有修改反馈闭环，汇总追溯真实产物；团队完整场景出现依赖阶段和至少一次可并行分工"
  risks: []
  must_not_regress: []
  external_behaviors: []
  decisions: []
  flows: []
  test_cases: []
relations:
  - type: derived_from
    from: REQ-EXP-001
    to: SRC-PLAN
  - type: derived_from
    from: REQ-EXP-002
    to: SRC-SCREENSHOTS
  - type: derived_from
    from: REQ-EXP-003
    to: SRC-PLAN
  - type: derived_from
    from: REQ-EXP-004
    to: SRC-SCREENSHOTS
  - type: derived_from
    from: REQ-EXP-005
    to: SRC-PLAN
  - type: derived_from
    from: REQ-EXP-006
    to: SRC-PLAN
  - type: derived_from
    from: REQ-EXP-007
    to: SRC-PLAN
  - type: derived_from
    from: REQ-EXP-008
    to: SRC-PLAN
  - type: derived_from
    from: REQ-EXP-009
    to: SRC-PLAN
  - type: derived_from
    from: REQ-EXP-010
    to: SRC-PLAN
  - type: derived_from
    from: REQ-EXP-011
    to: SRC-PLAN
  - type: derived_from
    from: REQ-EXP-012
    to: SRC-PLAN
  - type: derived_from
    from: REQ-TEAM-001
    to: SRC-SCREENSHOTS
  - type: derived_from
    from: REQ-TEAM-002
    to: SRC-PLAN
  - type: derived_from
    from: REQ-TEAM-003
    to: SRC-PLAN
  - type: derived_from
    from: REQ-EXP-013
    to: SRC-USER-RELATIONSHIP
  - type: derived_from
    from: REQ-EXP-014
    to: SRC-USER-RELATIONSHIP
  - type: derived_from
    from: REQ-EXP-015
    to: SRC-USER-RELATIONSHIP
  - type: derived_from
    from: REQ-EXP-016
    to: SRC-USER-RELATIONSHIP
  - type: derived_from
    from: REQ-TEAM-004
    to: SRC-USER-RELATIONSHIP
  - type: derived_from
    from: REQ-TEAM-005
    to: SRC-USER-RELATIONSHIP
  - type: derived_from
    from: REQ-TEAM-006
    to: SRC-USER-RELATIONSHIP
waivers: []
```
<!-- TRACEABILITY-METADATA:END -->
