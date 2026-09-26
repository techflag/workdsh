# WorkDSH Roadmap / 开发路线图

[English](#english) | [简体中文](#简体中文)

## English

WorkDSH is developed as a collection of independently versioned modules. Each module begins with its own `0.1` line when implementation starts. A new product area does not force an artificial version increase for an already delivered module.

### Current preview

The current public previews are Skills `0.1.0-alpha.28`, Experts `0.1.0-alpha.2`, Activity `0.1.0-alpha.1`, Office `0.1.0-alpha.4`, and the optional presentation bundle `0.1.0-alpha.41`. See [module releases and compatibility](RELEASES.md). The original `v0.1.0-alpha.1` remains a historical repository snapshot.

`v0.1.0-alpha.1` delivers the first local/default Skill management preview. It covers the global Skill library, full `SKILL.md` and resource reading, editing with conflict detection, enable/disable, recoverable uninstall, safe import, and native Conversation-based creation.

Clean installation, packaged Web cold-restart acceptance, failure recovery, and authenticated request cancellation are now verified for Skill `0.1`. The published Typert generator's external-workspace limitation remains an upstream compatibility item for later generated Remotes; it does not block the local Skill module, which uses the official Connection exact Fetch extension. Runtime package changes use the documented stopped-Host and restart lifecycle.

### Active Office track

Office `0.1` is developed and accepted as an independent plugin. The current source-development priority is PPT authoring with real template import, per-slide live updates, human editing, save/reopen, and PPTX export. Further Word feature work is paused. Other document types proceed only through scoped milestones; a roadmap entry does not claim complete fidelity or end-to-end model quality.

Exit evidence must use real files and cover editing, export/reopen, packaged installation, cold restart, removal, and reinstall. Historical sequencing and implementation notes remain in the [Office development record](design/office/NEXT-STAGE.md); current results and gaps are tracked in the [status ledger](STATUS.md).

### Module delivery order

| Order | Module | Planned `0.1` outcome |
| --- | --- | --- |
| 1 | Foundation and workbench | Stable public contracts, official Harness integration, identity/access/audit foundations, and native workspace/session composition |
| 2 | Skills | Complete the local Skill `0.1` production gates and lifecycle acceptance |
| 3 | Experts | Expert drafts, validation, immutable revisions, Skill/library/connector requirements, and task binding |
| 4 | Connectors | MCP stdio/HTTP instances, credentials, authorization, health checks, reconnect, and task capability binding |
| 5 | Library | Managed files, revisions, search, task references, deliverables, preview, and export |
| 6 | Projects | Project workspaces, tasks, work items, assets, members, activity, settings, and project-manager workflow |
| 7 | Industry applications | Application branding, scenarios, recommended entries, capability requirements, and new-task defaults |
| 8 | First integrated release | Cross-plugin task binding, dependency checks, examples, package installation, migration, and acceptance evidence |

### Later phases

- Expert teams, durable automations, and provider SDK examples.
- Team deployment, shared libraries, online tables, publishable pages, and business scenarios.
- Enterprise server and administration Web application for organizations, members, authorization, audit, organization Skills, immutable versions, categories, rollout policy, and execution-node synchronization.
- Enterprise work is recorded as E01-E05 in the [enterprise edition architecture note](ENTERPRISE-EDITION.md). It is not a completion gate for the current trusted-local-user release.
- A public Skill marketplace is not scheduled. If approved later, it will be implemented as an independent source rather than being mixed into the local Skill registry.

Detailed task IDs, prerequisites, and exit criteria remain authoritative in the [development plan](PLAN.md), [delivery ledger](development-order.json), [plugin delivery guide](PLUGIN-DELIVERY.md), [status ledger](STATUS.md), and [deferred ToDo](TODO.md).

## 简体中文

WorkDSH 按独立版本化的模块开发。每个模块开始实现时建立自己的 `0.1` 版本线；开始新模块不会迫使已经交付的模块进行没有实际变化的版本升级。

### 当前预览

当前公开预览包括技能 `0.1.0-alpha.28`、专家 `0.1.0-alpha.2`、活动 `0.1.0-alpha.1`、Office `0.1.0-alpha.4`，以及可选展示包 `0.1.0-alpha.41`。见[模块发布与兼容矩阵](RELEASES.md)。原 `v0.1.0-alpha.1` 保留为历史仓库快照。

`v0.1.0-alpha.1` 是首个默认/本地 Skill 管理预览，包含全局技能库、完整 `SKILL.md` 与资源读取、带冲突检测的编辑、启停、可恢复卸载、安全导入，以及基于 Harness 原生 Conversation 的创建流程。

Skill `0.1` 的干净安装、真实打包 Web 冷重启、失败恢复和认证请求取消验收已经完成。发布版 Typert 对外部 workspace 的限制保留为后续生成 Remote 的上游兼容事项；本地 Skill 模块使用官方 Connection exact Fetch 扩展面，不受其阻塞。运行包变更采用已记录的“停止 Host、变更、重启”生命周期。

### 当前 Office 开发线

Office `0.1` 作为独立插件开发和验收。当前源码开发重点是 PPT：真实模板导入、逐页实时更新、人工编辑、保存重开和 PPTX 导出。Word 后续功能扩展暂停；其他文档类型只按边界明确的阶段推进。写入路线图不代表格式保真或模型端到端质量已经完成。

退出验收必须使用真实文件，覆盖编辑、导出重开、安装包安装、冷重启、卸载和重装。历史阶段顺序与实现说明保留在 [Office 开发记录](design/office/NEXT-STAGE.md)，当前结果与缺口以[状态台账](STATUS.md)为准。

### 模块交付顺序

| 顺序 | 模块 | 计划中的 `0.1` 交付结果 |
| --- | --- | --- |
| 1 | 基础与工作台 | 稳定公开契约、Harness 官方集成、身份/授权/审计基础，以及原生工作区和会话组合 |
| 2 | 技能 | 完成本地 Skill `0.1` 的生产门槛和全生命周期验收 |
| 3 | 专家 | 专家草稿、校验、不可变修订、技能/资料/连接器要求和任务绑定 |
| 4 | 连接器 | MCP stdio/HTTP 实例、凭据、授权、健康检查、重连和任务能力绑定 |
| 5 | 资料库 | 文件管理、修订、检索、任务引用、成果、预览和导出 |
| 6 | 项目 | 项目空间、任务、工作项、资产、成员、活动、设置和 project-manager 流程 |
| 7 | 行业应用 | 应用品牌、场景、推荐入口、能力要求和新任务默认值 |
| 8 | 首期集成发布 | 跨插件任务绑定、依赖检查、示例、安装、迁移和验收证据 |

### 后期阶段

- 专家团、持久自动化和 Provider SDK 示例。
- 团队部署、共享资料库、在线表格、可发布页面和业务场景。
- 企业服务端与管理 Web：组织、成员、授权、审计、组织 Skill、不可变版本、分类、下发策略和执行节点同步。
- 企业工作已按 E01—E05 记录在[企业版架构说明](ENTERPRISE-EDITION.md)，不作为当前可信本机单用户版本的完成门槛。
- 公共 Skill 市场当前不排期；后续立项时作为独立来源接入，不与本地 Skill Registry 混合。

详细任务编号、前置条件和退出标准以[开发计划](PLAN.md)、[交付顺序台账](development-order.json)、[插件交付规范](PLUGIN-DELIVERY.md)、[状态台账](STATUS.md)和[后期 ToDo](TODO.md)为准。
