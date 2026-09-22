# WorkDSH 公开契约草案

状态：本地 `0.1` 治理契约基线完成。`workdsh-contracts@0.1.0-alpha.8` 已实现 Host identity/access/audit 与 Session owner/runtime binding 契约；未进入该包的领域接口仍是拟定义草案，不是声称已存在的 Harness API。企业服务器与受控 Remote 见[后期企业版说明](ENTERPRISE-EDITION.md)。架构决策见 [ADR-0016](adr/0016-governance-contracts-first.md)。

## 已实现的本地 Skill 契约

`workdsh-contracts/skills` 导出 `SkillManagementService`（`contractVersion: 1`）、管理 DTO 与 `SkillDependencyInspector`。独立 Skill Host 提供 `ctx.workdshSkills`；消费者只导入公共类型，使用 `inject: ['workdshSkills']` 声明服务依赖，并以 `ctx.effect()` 托管依赖检查注册。用法见[Skill README](../packages/plugins/skills/README.md)。

它覆盖现有本地目录、完整正文/资源、冲突保存、导入/草稿发布、启停、卸载影响及恢复。官方 Connection 承载浏览器请求；同 Host 插件协作直接注入服务，不新增网络层。两个消费者共享、服务缺失/恢复和清理已有测试。

`ManagedSkillSummary`/`ManagedSkillDetail` 的 `origin` 区分 `directory`（受管目录，可编辑、可移动文件）与 `plugin`（插件随包提供，文件由插件维护）。后者 `manageable: true` 但 `update`/`uninstall` 返回 `skill/plugin-owned`；启停按 [ADR-0029](adr/0029-plugin-skill-registry-suppression.md) 走注册表级抑制（`workdsh-skill-suppression`，rank 240），只改变该名称的调用面，不改写包内文件。项目层（rank 100/200）技能不进入该路径。

此契约不接收客户端自报身份，也未实现全入口多用户治理；仅用于既有受信本地 Host 组合。它不提供专家所需的不可变 `SkillRevision` 或引用租约；这些仍是 D04 的明确依赖适配任务。以下尚未进入 contracts 包的领域接口仍为草案。

## 首期团队上下文

ActorContext 至少表达 server-resolved principalId、organizationId、requestId，Agent 路径另带 sessionId/runId 和发起主体绑定。身份来自本地可信提供方或经验证的远程身份，不接受模型自填身份。

SessionOwnerBinding 是 Session 的持久业务 owner 事实，创建后不能由另一主体覆盖；RuntimeBinding 是当前运行实例基于该 owner、当前 membership 和 access revision 重新解析出的短期结果。个人本地 Profile 可由 Host 在首次官方 Agent 工具调用时建立 owner；企业组合必须在受信 Session 创建入口显式绑定，不能把浏览器传入的 sessionId/actor 当作 owner 证明。

业务对象保存组织、所有者、作用域（personal/organization/project）、修订与创建者。授权由 access 服务判断 action 与 resource，跨插件保留调用主体，禁止降级为无身份的内部调用。

新增契约：identity（认证与成员关系）、access（资源授权）、audit（追加与受限查询）、runtime（执行归属与隔离能力）、model-policy（可用模型与策略）、usage（使用事实与聚合）。本地模式同样实现身份/授权路径。

## 共同约定

- 对象引用包含领域、稳定 ID、必要修订；跨插件只传引用或明确的输入/结果，不传内部数据库对象。
- 变更返回实际对象引用与修订；缺失、冲突、未授权、依赖未就绪、取消和结果不确定有可区分诊断。
- 支持取消的长操作显式接收 AbortSignal；异步操作不能在卸载后提交过期状态。
- 提供方注册拥有 disposer；同一个提供方可贡献多个对象。服务方法本身执行校验，不能只依赖 UI。
- 任务绑定保存解析后的修订与连接实例，模型不接收账号密钥。

## 分领域接口与消费方

Office已导出`workdsh-contracts/office`的 U1 文档类型，并注册`ctx.workdshOfficeContent`服务。六个工具及原生页面共用文档工作副本，content_export 已支持受限 DOCX 文件交付，其余七类接口仍为后续目标，见[运行证据](evidence/office-live-u1.md)。工作副本的open/read/capabilities/edit/present/export供原生工具与认证Client共同消费，详见[统一接口](design/office/UNIFIED-API.md)和[插件架构](design/office/PLUGIN-ARCHITECTURE.md)。契约不放运行服务或依赖其他插件内部类；Office自有运行校验/实现，Host不裸导入private contracts运行值。现有tables/pages/library领域保留唯一所有权。

| 领域 | 最小能力 | 消费方 |
| --- | --- | --- |
| experts | list/get/createDraft/updateDraft/validate/publish/archive/resolveExecution | 专家页面、管理工具、任务入口、应用 |
| skills | list/get/import/createDraft/update/validate/publish/archive | 技能页面、管理工具、专家依赖解析；执行目录适配原生 skills |
| connectors | registerProvider/listDefinitions/createConnection/updateConnection/check/status/disable | 配置页面、管理工具、任务依赖解析 |
| applications | list/get/create/update/validate/publish/archive/resolveScenario | 应用页面、工作台首页 |
| projects | create/list/get/update/linkTask/listAssets | 项目页面与任务管理 |
| assets | import/read/search/createRevision/registerDeliverable/listByTask | 资料页面、Agent 工具、成果面板 |
| automations | createRule/updateRule/enable/disable/acceptDelivery/listRuns/reconcileRun | 自动化页面、Schedule/Webhook 适配器、运行恢复 |
| workbench | registerNavigation/registerView/registerObjectLink | 功能 Client 插件 |

这些名称是意图级草案，不预先锁死 Remote wire 格式。正式 API 必须与选定 Harness Client/Remote 公开接口一致，避免自建传输。

### 后期企业 Skill 契约 ToDo

当前不发布公共目录或企业 Skill TypeScript 契约，只使用 Harness 默认/本地技能。后期企业版按 [ADR 0015](adr/0015-skill-control-plane-and-runtime-projection.md) 在独立服务端定义组织 Skill、不可变修订、分类、下发策略、成员上传策略、目录同步和执行节点物化契约；管理 Web 只消费该服务端，不建立第二套数据真源。

## 对话式管理入口

expert-manager 和 skill-creator 为功能插件自带技能，管理工具是各领域 API 的消费者。技能提示词指导需求补充和操作次序，不能绕过服务校验或直接修改 SQLite。

连接配置工具可创建非敏感草稿并返回授权动作引用；浏览器完成敏感信息输入。Agent 只获就绪状态与能力说明。创建对象并不自动授权业务写入。

## 必需依赖与可选能力

依赖解析需说明对象、所需能力、是否必需、不可用原因和修复入口。官方 registries 仍为技能/工具的运行权威，WorkDSH 不缓存成另一份可执行目录。可选功能缺失不阻止无关专家运行。

## 应用默认值与任务绑定

应用/场景提供默认专家和引用；用户本次明确选择优先。专家发布修订决定其内部方法和依赖。权限始终取执行边界允许的范围，默认值无法提升权限。任务建立后保存最终绑定，不依赖未来应用配置。

## 提交与回执

连接器提供方需声明是否支持幂等及结果查询。提交成功返回外部记录 ID、操作 ID 和可读摘要；部分成功返回逐项结果。未知结果进入待核对，不能当作失败立即全量重试。资产工具保存回执引用和报告，凭据除外。

ConnectorDefinition 声明 adapterKind（如 mcp-stdio、mcp-http、web-provider 或专用 API）、非敏感能力和安装前置；ConnectionInstance 保存主体/组织归属、凭据引用、目标指纹与状态。MCP 工具发现状态至少区分 configured、discovering、ready、offline、unregistered；工具名仍存在不能代替执行前健康和账号绑定校验。stdio 使用显式最小 env，HTTP headers 只由凭据层解析。

SkillRevision 的执行引用包含不可变内容 locator/digest、官方名称、provider 和调用策略。skills provider 按 ActorContext、项目和精确修订形成当前 scope 目录；`modelInvocable`/`userInvocable` 不作为 access grant。目录观测不完整时返回诊断并保留 last-good，不自动归档业务对象。

## 项目与资产扩展（P0-04 待验证草案）

projects 增加 createFromTemplate/updateConfig/resolveTaskContext/linkAsset/createWorkItem/updateWorkItem/listActivities/prepareHandoff。请求均携带可信 ActorContext，配置更新有 expectedRevision；绑定结果返回每项来源、修订及缺失诊断。项目权限通过 access，资产通过 assets，执行通过 Harness 适配器。

assets 增加 proposeRevision/acceptRevision/rejectRevision/listRevisions/checkCapacity；建议修订含 baseRevision、作者、来源任务与差异。只有 accept 成功才切换当前正文，冲突拒绝静默覆盖。检索只返回当前主体有权使用的引用，读取时重查。

skills 增加 discover/setEnabled/uninstall；启停配置不改资源原文（插件随包技能只做注册表级抑制，见上文 `origin` 说明）；uninstall 返回依赖影响和逐项结果，保留被历史任务引用的修订。experts 增加用户最近使用/置顶偏好；偏好不属于专家公开修订。

项目默认优先于应用默认、低于用户明确选择；组织限制和授权始终单独约束。ProjectTaskLink 仅表示归属，不能作为会话共享授权。完整语义见 [项目设计](PROJECT-DESIGN.md)。

## 任务与 Session 适配（P0-04 待验证草案）

任务适配器通过官方 Session Controller/Agent 生命周期创建、提示、附加文件、跟随、取消和 fork，禁止以裸 `ctx.sessions.create()` 作为产品入口。TaskCreateResult 至少返回 WorkDSH taskRef、官方 sessionId、已解析组合指纹、ProjectTaskLink 状态和 requestId；业务关联失败必须是可对账状态，不能删除或伪造已提交的 Session 事实。

原生 Session 事件拥有消息、工具、步骤、运行审批、工作流与子 Agent 等执行事实。Project WorkItem、AutomationRule、Organization、业务审批和 AssetRevision 由各自领域拥有。`todo/write`、`schedule/change`、实验性 `team/*`、`approval/*` 与 `deliverables/presented` 不直接转换成这些业务对象。成果须经 assets/library 的 registerDeliverable 校验并返回修订引用后才能关联项目。

自定义 WorkDSH Session event 只承载 Conversation/Projection 需要重放的会话级节点，包含稳定 businessObjectRef、schemaVersion 与迁移处置。跨 Session/Domain 通过 requestId 和回执对账；读取持久化结果、导出和交接前执行官方 flush。fork、恢复与继续运行重新调用 access、runtime 和依赖解析，不继承 lineage 暗示的权限。

AutomationRule、WebhookDelivery、ScheduleOccurrence 与 AutomationRun 是 automations 领域对象。官方 Webhook provider/runtime 可验证并规范化输入，Schedule 可产生会话级触发，Job 可控制进程内活跃工作，但这些运行时不拥有业务去重、跨重启恢复或团队可见历史。acceptDelivery 先提交 source + deliveryId + ruleId 幂等事实，再请求创建 Session；202/dispatch 返回和 Job terminal snapshot 都不能单独完成 AutomationRun。

## 项目交互补充（修订 7，拟定义）

- ProjectCapabilityBinding：projectId、kind、objectRef、来源及项目配置修订；projects 拥有关联，源领域拥有对象。replaceBindings 接收完整选择草稿与 expectedRevision，调用源服务校验后提交。removeBinding 不调用 uninstall。
- 技能导入：skills 提供 stageImport/validateImport/finalizeImport/discardImport 意图接口；暂存绑定主体/项目和过期时间，项目确认用 operationId 关联，失败可对账，导入不执行脚本。
- ProjectConnectorBinding：definitionRef、personal/shared 授权模式及共享实例引用（如适用）。resolveForActor 只能使用服务端主体选择成员个人实例，不能接受客户端代填他人的凭据引用。
- ProjectPost、WorkItemComment：正文修订、作者、项目、目标、时间、访问范围；服务提供发布/查询/修改/删除语义。MentionRef 以主体 ID 表示，不等于通知已送达。
- ComposerReference：asset/workItem/skill、稳定 ID、修订；解析服务重查权限和存在性，返回可进入任务的结构化内容与出处。引用待办本身不修改待办。

这些是 WorkDSH 服务草案，不能假定为 Harness 原生接口；P0-04 决定实际公开适配。字段及权限检查必须覆盖页面和 Agent 工具两条路径。

## D00 边界补全

ConnectionExecutionBinding 增加 configRevision/targetFingerprint/externalPrincipalId/toolScope，调用使用经验证的同修订客户端句柄；凭据轮换不改变执行身份。HandoffManifest 记录源修订、授权依据、目标、到期时间和领取状态；prepare/claim 都重查，摘要构建隔离于原会话。AssetWorkingCopy 指向受控副本，acceptRevision 只经服务访问权威内容。ScheduleOccurrence 使用持久 occurrenceId 和单一 Host 所有者。完整失败规则见 [ADR-0007](adr/0007-execution-and-transfer-boundaries.md)。

用户端与管理端的首期拓扑、数据所有权及数据库实施顺序见 [部署与存储](DEPLOYMENT-AND-STORAGE.md)。首期同 Host、独立界面与服务端权限；各领域使用官方 Storage Domain，Profile 选择后端，资产正文使用受控文件存储，不为两个前端复制业务数据。


## 跨功能执行组合引用（拟定义，P0-04 验证）

任务创建输入分别包含可选专家修订引用、执行组合引用、项目/资料引用和连接实例引用；组合引用至少能定位 preset id 与已验证修订或指纹。不得把可执行配置正文或客户端传入的 actor 当作可信授权。

服务端解析结果包含实际组合来源、已解析角色/技能修订、允许的资源与账号绑定、不可用原因；此处是 WorkDSH 拟定义契约，不是新增 Harness 原生 API。组合解析通过已有 workbench 适配与原生 preset 服务完成，领域数据由各自服务提供。持久化的修订引用必须能重建实际配置，否则恢复拒绝继续而非回退最新版本。凭据不进入解析结果或对话。

`ResolvedExecutionBinding` 至少返回 expertRevisionRef（可空）、presetRevisionRef、compositionDigest、provider/model/reasoningEffort、skillRevisionRefs、toolNames、projectRef、assetRevisionRefs、connectionExecutionBindings、runtimePolicyRef 与 authorizationRevision。模型目录条目不能代替精确模型解析；未支持的显式 reasoning effort 返回可区分错误。绑定形成后在该 Session 生命周期内不可静默改换 provider、preset 或专家修订。

`ExpertTeamRevision` 是 WorkDSH 业务对象，包含稳定成员角色、允许的 ExpertRevision、委派/汇总规则和资源约束。一次运行可创建 `ExpertTeamRunBinding`，把成员映射到原生子 Session 与 Team member；原生 TeamId、taskId、mailbox revision 只作为运行引用。创建每个成员时重新解析 ActorContext、RuntimeBinding、scope、工具、资产和连接，不从父 Agent 自动继承。

子代理结算至少区分 completed、partial、cancelled、failed、unavailable 和 quiescenceUnknown；一次性运行只有 completed 才可作为完整结果。`interrupt`、inbox accepted 或 provider removal 都不能单独宣告子任务已停稳。项目 WorkItem 的完成状态仅由 projects 服务根据显式业务回执更新，不从原生 team task 状态自动复制。

任务输入返回 `PromptReceipt` 只说明消息已持久入队，不把 MessageId 设计为结果 ID。结果订阅以 sessionId + durable cursor 读取 Assistant settlement、turn/step 和工具事实；需要一次性运行语义的适配器必须显式拥有从入队到 quiescence 的区间，并返回该区间内的最终/部分结算。

同组合子代理可记录 `compositionInheritance: { kind: 'same-generation', parentSessionId }` 并通过原生 `composeFrom` 绑定；不同专家使用 `{ kind: 'preset-revision', presetRevisionRef }`。两者都必须携带独立 authorizationRevision，不能从父 Session 生成访问授权。

## 设置、凭据与执行许可（P0-04 待验证草案）

`PluginSettingDescriptor` 只表达脱敏 schema、resolved value、来源、生效提示与 section revision。更新接受 expectedRevision 并返回实际修订或冲突；secret role 字段只能返回引用路径与已设置状态。组织策略和业务对象不得通过此接口读写。

`CredentialBinding` 表达 credential reference/key、ConnectionInstance、目标指纹和外部主体，不包含明文。连接执行在每次操作时解析秘密、重验 access/tool scope，并记录使用的非敏感绑定修订。轮换、撤销、空值和只读进程环境来源必须产生可区分结果。

`ExecutionAuthorization` 分别记录业务 access 判定、连接授权、官方 approval outcome 和 runtime enforcement level。仅当所有必需层允许时执行；`unavailable`、sandbox `partial` 不满足强保证、连接撤权或组织拒绝都失败关闭。Permission Preset 只作为 approval/sandbox 选择输入，不生成 AccessGrant。

一元 Client 操作由 Typert Remote 暴露，wire 参数仅使用严格生成的 Client-safe 类型或受控 identity lookup。lookup/context resolver 不授予资源权限，Host service 仍接收服务端解析的 ActorContext。列表分页、领域增量和运行流单独声明 snapshot/cursor/subscription 契约及断线恢复，不塞入一元 Remote。

Remote 以 Host 的 `TypertRemoteService` 定义为唯一签名来源，Client 只消费生成代码。顶层身份参数使用 lookup object；支持取消时 `AbortSignal` 位于最后。可预期失败使用稳定 `<domain>/<reason>` code 与经 ActorContext 过滤的 details，Client 按 code 分支，不能依赖错误消息或跨边界 `instanceof`。签名变化必须重新生成并同时验证 Host 与 Client；开发 SRC fallback 不能作为发布证据。

H09 补充：首期使用 unary 是本项目选择，不表示 Typert 无 stream 能力；镜像中的 stream 描述须经 rc.1 生成器和发布产物验证后使用。无论 transport，领域 baseline/cursor 与授权不省略。取消回执只说明取消请求被处理；外部提交和 Host binding 另行核对。lookup provider 卸载后须明确失败，不把其 wire identity 当普通 JSON 对象放行。

Agent 工具分别定义严格输入 schema、规范 JSON 输出、模型内容与纯 UI presentation。外部写入的权威回执同时进入所属业务 Domain，工具卡片只投影持久事实。工具尊重 `exec.signal`；一旦创建并发布后台 Job，取消和最终结算归 Job 生命周期。原生调用与 PTC 子调用都必须经过同一 guard、approval、审计和结果规范化链。

Office 原生 document 的 run.style 可选字体、点字号、颜色和背景色；block.style 可选对齐、行距与缩进，block.list 表示 bullet/ordered、depth、起始编号及同一条目的后续段落。Host 严格验证范围与层级，旧 modelVersion 1 无可选属性仍可读取。replaceBlock 需要保留完整样式与列表信息，避免丢失人工格式。AI 工具 schema 与 UI 事务使用相同模型；浏览器 DOCX 下载独立于受限 DOCX 文件交付的 content_export。

content_export({documentId}) 读取授权下最新已保存修订，返回 documentId/revision/path/status:presented。共享 DOCX codec 与右侧下载；实际文件写入和交付组合官方 tools.execute(bash/present)，继承调用方 scope/token/signal，不创建第二套文件操作传输。返回成功以官方 present 回执为准。导出文件与工作副本修订分开，当前有限导出不是完整 U3 冻结任务/幂等收据/恢复协议。

WORD-RELEASE-02：content_export 新增可选 baseRevision，授权读取的最新修订不匹配时返回 REVISION_CONFLICT。相同 docId/revision/DOCX 摘要生成稳定路径，已有同字节文件复用，冲突不覆盖；写入回执未知不交付，重试同一修订核对文件。取消信号在写入前与 present 前重验，交付未知返回路径供核对。不是全量导出 Job/跨执行世界协议。

## PDF 新建工作副本增量（2026-09-13）

Office 契约新增 kind=pdf 的分页/文本/矩形状态及 pdf.insertPage/updatePage/removePage，复用 CAS/回执/授权/人工租约与展示请求。新建工作副本不表示已有 PDF 导入或任意内容对象编辑。PDF 字节由当前修订通过同一编码器派生；Connection pdfBytes 需要授权与明确 baseRevision，文件交付仍走官方 bash/present。

### 活动展示身份（2026-09-14）

workdsh-contracts/activity的ActivityIdentity新增可选teamName及members，只表示绑定固定修订的团队名称和组成，不授予权限、不表示成员执行；活动插件用原生子任务状态单独确定高亮。旧提供方无需实现新字段。
