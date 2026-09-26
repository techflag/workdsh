# WorkDSH 模块版本规划

状态：强制执行。版本单位是模块，不是页面、开发任务或临时切片。

## 版本模型

- 每个可独立交付的功能模块维护自己的 SemVer 版本线。当前技能模块版本线为 **0.1**，对应包 `workdsh-plugin-skills` 的开发制品 `0.1.0-alpha.N`。
- `主版本.次版本` 表示模块能力基线；补丁位表示同一基线内兼容修复，`alpha.N`、`beta.N`、`rc.N` 表示该模块的预发布迭代。
- 同一模块内的 Host、Client、Remote、资源、内置管理 Skill 和迁移文件属于一个模块版本，不能分别宣称互不相干的产品版本。
- 不同模块独立推进，不要求技能、专家、连接器、工作台和资料库锁步升级。只有实际发生变化的模块增加版本。
- 默认组合包维护自己的集成版本，并记录所组合模块的精确制品版本。组合包版本不能替代功能模块版本，也不能把未变化模块一起算作升级。
- 用户创建的 Skill、Expert、Project 等业务对象使用各自的 revision/schemaVersion；它们不跟随 npm 模块版本增长，模块升级也不能覆盖用户对象。

## 版本递增规则

| 变化 | 0.x 阶段规则 | 示例 |
| --- | --- | --- |
| 首个可评审模块切片 | 建立 `0.1` 版本线，开发包使用 `0.1.0-alpha.1` 起步 | 技能模块 `0.1` |
| 同一能力基线内的兼容修复或补全 | 增加 patch 或预发布序号 | `0.1.0-alpha.8` → `0.1.0-alpha.9` |
| 新增一组对外能力或公开契约发生不兼容变化 | 增加 minor，并给出迁移与消费者验证 | `0.1` → `0.2` |
| 稳定公开契约后的不兼容变化 | 增加 major | `1.x` → `2.0` |

开始模块开发时，必须在 `docs/modules.json` 写入 `moduleVersion`；模块 README、package.json、CHANGELOG、证据和 STATUS 使用同一版本线。`check:plan` 会验证模块版本格式、当前活动切片的版本声明，以及 package.json 的 major/minor 是否匹配。

## 当前版本线（2026-09-22）

当前安装包版本与模块实现状态分别列出；公开发行范围以[发行回执](releases/2026-09-14-development-candidate.md)为准，当前待验收项见[STATUS](STATUS.md)。每周排期见[周计划](WEEKLY-RELEASE-PLAN.md)，不要求模块锁步升级。

| 模块 | 版本线 | 当前包版本 | 实现状态 |
| --- | --- | --- | --- |
| 领域公开契约 | 0.1 | `workdsh-contracts@0.1.0-alpha.9` | implemented |
| 共享展示组件 | 0.1 | `workdsh-ui@0.1.0-alpha.6` | implemented |
| 默认组合包 | 0.1 | `workdsh-bundle@0.1.0-alpha.48` | in_progress |
| 工作台 | 0.1 | `workdsh-plugin-workbench@0.1.0-alpha.12` | implemented |
| 专家管理 | 0.1 | `workdsh-plugin-experts@0.1.0-alpha.8` | in_progress |
| 技能管理 | 0.1 | `workdsh-plugin-skills@0.1.0-alpha.32` | implemented |
| 资源授权 | 0.1 | `workdsh-plugin-access@0.1.0-alpha.6` | implemented |
| 审计 | 0.1 | `workdsh-plugin-audit@0.1.0-alpha.5` | implemented |
| 本地身份提供方 | 0.1 | `workdsh-provider-identity-local@0.1.0-alpha.6` | implemented |
| Office 浏览器编辑插件 | 0.1 | `workdsh-plugin-office@0.1.0-alpha.8` | in_progress |
| 协作与活动展示 | 0.1 | `workdsh-plugin-activity@0.1.0-alpha.5` | in_progress |
| 项目管理 | 0.1 | `workdsh-plugin-projects@0.1.0-alpha.3` | in_progress |
| 资料库 | 0.1 | `workdsh-plugin-library@0.1.0-alpha.3` | implemented |
| 连接器管理 | 0.1 | `workdsh-plugin-connectors@0.1.0-alpha.3` | in_progress |

2026-09-18 更新：bundle、experts、skills、office、activity、projects、library 跟随 DSH 0.1.6-alpha.2 升级 bump；contracts 补 bump α.9（补记 2026-09-17 项目任务上下文只读契约 `ProjectTaskContext`/`taskContext`，属兼容补全）；experts/office/activity 同时携带其未发布批次；公开发行仍以上次 prerelease 为准。

2026-09-20 更新：experts bump α.5→α.6（Unreleased）——修复设置面板重复「Agent 预设」页：移除对官方增量 list 槽 `settings.section` 的包装注册，保留 `conversation.hero.agentPreset` 单座槽接管；公开 prerelease 仍为 α.5，待下次发行携带。

2026-09-20 更新（二）：skills α.30→α.31、experts α.6→α.7、connectors α.1→α.2（均 Unreleased）——按用户决定删除能力中心「行业应用」标签入口（行业应用暂时用不到，暂无领域实现，能力页保留专家/技能/连接器三标签）；公开 prerelease 仍为 skills α.30、experts α.5、connectors α.1，待下次发行携带。

2026-09-20 更新（三）：bundle α.46→α.47（Unreleased）——修复设置页「外观」切换不生效：工作台客户端不再注册并强制 `workdsh` 深色主题、不再拦截 `theme/change`，外观改由官方 ThemeRuntime 与用户偏好驱动（浅色/深色/跟随系统即时生效，选中态恢复）；bundle 的 `dsh.client.inject` 与开发依赖同步移除 `@deepseek-ai/dsh-client-ui-theme`。公开 prerelease 仍为 bundle α.46，待下次发行携带。

以下旧快照仅供追溯，旧“专家planned”不覆盖当前实现。

## 历史版本线快照（被2026-09-14表覆盖）

| 模块 | 模块版本线 | 当前开发制品 | 说明 |
| --- | --- | --- | --- |
| 领域公开契约 | **0.1** | `workdsh-contracts@0.1.0-alpha.5` | 本地基线完成；新增 ./skills 管理服务契约，包含 Host identity/access/audit、Session owner/runtime binding 与排空契约，企业扩展后期独立验收 |
| 本地身份提供方 | **0.1** | `workdsh-provider-identity-local@0.1.0-alpha.3` | 本地基线完成；官方 Storage Domain 持久化可信单用户 Profile，不用于远程认证 |
| 资源授权 | **0.1** | `workdsh-plugin-access@0.1.0-alpha.3` | 本地基线完成；持久 Session owner、受控 Session Host 入口、RuntimeBinding 与官方工具授权/审计 |
| 审计 | **0.1** | `workdsh-plugin-audit@0.1.0-alpha.2` | 本地基线完成；官方 Storage Domain 持久审计、排空和敏感引用拒绝 |
| 技能管理 | **0.1** | `workdsh-plugin-skills@0.1.0-alpha.24` | 默认/本地管理闭环及独立 Host/Client 安装交付完成；公共市场不在当前范围，企业服务端与管理 Web 列入后期 ToDo |
| 工作台 | 0.1 | `workdsh-plugin-workbench@0.1.0-alpha.10` | D02 已完成；官方 Sidebar/Conversation 组合与 TSX 页面边界 |
| 共享 UI | 0.1 | `workdsh-ui@0.1.0-alpha.4` | D02 已完成；纯导出入口、独立组件、令牌与样式模块 |
| 默认组合包 | 0.1 | `workdsh-bundle@0.1.0-alpha.39` | 集成版本；工作台以子插件组合，Skill 为显式独立 Profile 层 |

专家、连接器、资料库等 planned 模块在开始实际开发时再建立各自版本线，不为占位目录虚构版本。

2026-09-22：上述底座依赖发生变化的模块递增 alpha；属于本地未发布升级，验证范围见 DSH-0.1.7-UPGRADE-PLAN.md。
