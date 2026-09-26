# WorkBuddy 专家包体系核对

2026-09-13。参考为仓库 docs/expert-manager 的完整 14 个文件，包括隐藏元数据、四份 references 和七个脚本。此次为静态源码分析，不宣称已经验证 WorkBuddy 运行时。

## 核心模型

expert-manager 是制造和维护专家包的工具，不是生成单份角色提示词的工具。产物是一个完整、自包含、可注册和分享的目录。创建器本身的 references 是制造规范；被创建专家自己的 skills/*/references 是该专家的领域材料，两者不能混为一谈。

```text
my-expert/
  .codebuddy-plugin/plugin.json  # 身份、展示、角色与资源声明
  agents/<business-id>.md        # 独立角色的完整专业内容
  agents/<team>-team-lead.md     # 团队入口、路由、能力清单、Workflow
  skills/<skill>/SKILL.md        # 按需附带的能力
  skills/<skill>/references/     # 长规范、API、领域资料
  skills/<skill>/scripts/        # 能力所需程序
  skills/<skill>/templates/      # 成果模板
  bin/                          # 可选 CLI
  avatars/                      # 角色与团队视觉资源
  settings.json                 # team 的默认主理人
  README.md                     # 使用、安装与分享
```

可选资源按需要出现，不要求每个专家都带脚本或 Skill。

## 三个分开的层次

1. 制造：SKILL.md 决定交互、材料转化、修改、批量运营；references 指导文件内容；init 创建骨架，AI 填充正文与资源。
2. 安装与交付：validate 检查文件关联与规范，register 更新 marketplace 索引并记录创建会话，package 打包完整目录。注册使系统可发现，打包不是专家成立的前提。
3. 运行：主理人按照 MD 中的能力清单、单成员路由和预设 Workflow 选择正式成员；产物通过真实成员回传，主理人中转、汇编。Python 制作脚本不是团队执行器。

## 原版的具体价值

- 身份与显示名称分开：稳定 name/agentName/文件名不随花名改动；profession 是职业定位；expertType 根据结构判断。
- 一份包声明所有角色和资源；teamInfo 指向主理人与成员，settings 指向同一入口；不是用户逐个发布成员。
- Agent MD 是专业正文，包含具体能力、分析框架、获取数据的方法和结构化成果模板；不是四栏表单的附属导出。
- 成员独立性标准是有没有用户会直接问它的问题，覆盖完整分析域。
- 主理人不仅有一个固定流程，还必须有成员能力与典型问法清单、多个高频 Workflow 和单成员直调。
- 材料转化保留有价值内容：角色入 agents，长参考入 skills/references，程序入 scripts/bin，报告模板入 templates，不将全部内容塞进 persona。
- 修改保留未要求变动的内容与稳定身份；校验后重新注册，使展示与运行入口更新。
- 头像由真实角色内容推导，统一团队画风；失败明确记录，不能声称已有头像。

## 当前 WorkDSH 实施的偏差

本轮未收口的代码仍以 ExpertDefinition 四段 prose 加 team 嵌套对象为制作主体，Markdown 是序列化投影，不能称为原版体系已经接入。

| 偏差 | 应修正为 |
|---|---|
| 专业 MD 必须拆成四个标记段 | 保存完整自由正文，元数据与运行索引另行解析 |
| 包只收 JSON、MD 和图片 | 明确管理专家附带 Skill、references、模板和可执行资源；安装不自动执行程序 |
| name 与职业/花名/显示混在一起 | 稳定角色标识与双语展示元数据分开 |
| 主理人靠固定 JSON 阶段表 | 以完整 MD 描述路由和多个场景，正式工具负责真实执行 |
| 每个任务阶段都强制找第二成员评审 | 协作和可选验收分开；不能为直调问题人为制造第二角色 |
| 没有单成员直调 | 接入真实指定成员任务，同样保留固定修订和回传 |
| 一次确认被当成整套交付 | 文件包、注册、内容预览、版本发布与文件输出分别具有真实回执 |

## WorkDSH 技术落点

学习的是文件包和生命周期，不机械复制 WorkBuddy 插件加载机制。一个 WorkDSH experts 功能插件管理多份专家包；每份包不是 npm/Cordis 插件。官方 Storage Domain 保存归属、索引、修订、操作与审计；官方 Agent Presets 从已验收包编译不可变执行快照；官方 Skill 服务管理附带能力和资源；已有 Session/受控委派承接成员执行。UI 与 AI 工具通过同一 Host 服务。

文件内容是创作源，已发布修订是任务运行源。编辑文件产生新草稿，不能静默更改已绑定任务。注册是可发现的产品对象，并不表示公开上架或自动授予权限。文件目录必须位于应用管理的数据根，不固化到 preview/test-runtime。

下一步先修订包契约和现有 ADR-0021，再补自由 Agent MD、资源目录、包校验/注册/导入导出和真实成员路由。已有未验证聚合代码不可作为完成证据；保留其他开发者修改，按明确差异迁移，不进行整树回滚。

## 静态核对的边界

规范强于这份脚本实现：register CLI 的完整性检查较浅，不等同全量 validate；package_expert.py 未实现测试所期待的 MAX_PACKAGE_BYTES；batch_create.py 明确只有流程示例，没有 AI 内容生成逻辑。因此复用内容和架构时，仍需 WorkDSH 自己验证资源路径、安装一致性与真实运行，不能照抄脚本后就宣称可靠。
