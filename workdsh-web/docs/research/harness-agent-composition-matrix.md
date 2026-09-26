# Harness Agent 与 WorkDSH 专家编排矩阵

状态：H07 已审，发布包行为仍需 P0-03/P0-04 探针确认。
依据：H07 的 14 份生命周期、Core/preset、Agent Team/Subagent、LLM、提示词、压缩、计量与适配器文档，精确清单见 [审查总表](deepseek-harness-capability-review.md#h07-审查记录已完成)。

## 1. 对象归属

| 概念 | Harness 直接拥有 | WorkDSH 直接拥有 | 组合规则 |
| --- | --- | --- | --- |
| Agent / Session | 当前执行实例、追加式日志、步骤、实时状态 | TaskRef、RuntimeBinding、项目归属、访问授权 | 一个 WorkDSH 任务绑定一个根 Session；恢复前重验绑定 |
| Agent preset | 插件与运行能力组合 | 被专家/应用/自动化引用的不可变组合引用 | preset 是执行配方，不是专家档案 |
| 专家 | Persona/提示词、技能和工具的运行投影 | Expert、ExpertRevision、可见范围、依赖、发布状态 | 发布时解析成不可变修订和组合指纹 |
| 子代理 | 一次性运行或可继续子 Session、相邻消息、深度 | 委派策略、允许的专家修订、资料和账号范围 | 每次创建显式重新解析能力与授权 |
| Agent Team | 根 Session 内实验性成员、邮箱、任务 DAG | ExpertTeamRevision、业务分工、项目 WorkItem、组织成员 | 只作为一次运行的协作机制，不作为组织或项目数据库 |
| 模型调用 | 路由、适配器、流、失败、用量、精确模型元数据 | 组织模型策略、允许范围、审计与聚合 | 先过模型策略，再准备并锁定一次适配器代次 |
| 上下文与压缩 | 系统提示词组装、动态上下文快照、surface 压缩 | 项目/资料/专家事实及其修订 | 授权后投影到官方提示词/消息；压缩不删除业务事实 |

## 2. 专家运行解析

`resolveExecution` 应产生不可变、可审计的 `ResolvedExecutionBinding`，至少包含：

- `expertRevisionRef`：可空；普通任务不强制选择专家。
- `presetRevisionRef` 与 `compositionDigest`：定位实际插件组合，禁止恢复时漂移到 latest。
- `provider`、`model`、可选 `reasoningEffort`：来自组织策略和精确模型解析后的生效值。
- `skillRevisionRefs`、`toolNames`：分别记录业务修订与本次组装后模型可见的工具名。
- `projectRef`、`assetRevisionRefs`、`connectionExecutionBindings`：只包含已授权引用，不含凭据。
- `runtimePolicyRef`、`authorizationRevision`：说明运行隔离要求和准入判定版本。

系统提示词的 `PromptSection`、动态 `PromptContext` 与工具 schema 在每步统一组装。作用域内同名项可覆盖全局项，`complete` 段会独占提示词。因此专家投影必须使用稳定段名、中央顺序和官方组装入口；不在 `agent/pre-step` 后拼接隐藏提示词，也不让多个专家同时注册互相冲突的 complete 段。

模型可见的系统提示词由 Agent loop 作为 `system/message` surface 节点持久化。动态项目/资料上下文以耐久 user-role snapshot 进入历史。业务对象仍由领域数据库拥有，Session 只保存本次已授权、已解析的模型输入和执行事实。

## 3. 多专家与子代理

### 一次性委派

适合检索、审阅、独立分析等只有一个最终结果的工作。调用方必须等待结果并 `dispose()` 到资源停稳；非 completed stop reason 视为部分输出，不能包装为完整成功。

### 可继续委派

适合需要后续追问或交接的成员。它拥有持久子 Session，但任一时刻最多一个 live Activation。Inbox 是唯一队列；消息被接受后，调用方取消不等于子任务取消。`interrupt` 只表示已请求中断，不表示资源已经停稳。

### 专家团

WorkDSH 的 `ExpertTeamRevision` 描述稳定角色、允许的专家修订、分工和汇总要求。运行时可投影到原生 Agent Team：

1. 根 Session 作为 lead，创建每个成员前解析精确专家修订。
2. 为每个成员建立新的 RuntimeBinding、flat scope、工具过滤、资料范围和连接账号绑定。
3. 原生任务 DAG/CAS revision 用于本次运行协调；项目 WorkItem 仍通过 projects 服务显式创建或更新。
4. 原生 mailbox 是耐久的 queued-minus-delivered 协作事实；业务通知和跨项目消息仍走 WorkDSH 服务。
5. `writeScopes` 只作协作提示，不是锁。对同一资产或外部记录的写入仍使用领域 expectedRevision、幂等键或提供方事务。
6. provider 被卸载后禁止新启动，已经接受的运行不会自动撤销；管理端需区分“禁止新建”和“已在运行”。

原生 TeamId 等于根 SessionId，成员标识是 SessionId，成员名不可变。它不创建 Organization、Membership、AccessGrant 或共享专家对象。Fork 继承到的旧 team 事件不形成新根 Team。

同角色、同执行组合的子 Agent 可以由 WorkDSH 在完成业务授权解析后显式调用 `composeFrom`，加入父 Agent 当前的同一 standing preset generation；不同角色则挂载自己的不可变 preset 修订。`composeFrom` 只复用插件组合对象，不传递 RuntimeBinding、资产或账号授权。

## 4. 生命周期与失败语义

- `session/event` 是可重放事实，`agent/*` 是实时协调信号；重连界面从 Session baseline/cursor 恢复，不能回放 live 事件猜状态。
- pre-step 拒绝、空结果或失败不会花费 step，已 claim 的用户批次仍已移出队列；产品需展示可恢复诊断，不能偷偷重复提交用户输入。
- LLM 重试发生在一个已打开 step 内，不重复运行用户准入或 pre-step。适配器自身不得再叠加隐藏重试。
- 工具结果按模型调用顺序提交；只有明确声明并发安全的工具才能并行。
- 取消发生在准备或请求准入阶段时，不提交系统/用户消息；外部写入已发出时仍按连接器不确定结果规则对账。
- 一次模型调用捕获同一适配器注册代次贯穿模型能力解析、request header 记录和分派，避免热更新混用两代配置。
- `followup()` 的 MessageId 只是入队事实，不对应 assistant 结果或 turn end；`whenIdle()` 只在调用方明确拥有完整运行区间时才可用于结算。
- preset `recompose()` 自身不检查 Session 是否为空；产品入口只调用带锁定检查的 `select`。浏览器读取隔离服务使用 `serviceFor(agent, name)`，不把会话内服务提升到 Host 全局。

## 5. 模型、流与计量

- Provider/model catalog 用于发现与展示，不是请求白名单。精确路由的 adapter 对 context、输出上限、reasoning effort、模态和 system prompt update 才是权威。
- 明确指定但不支持的 reasoning effort 必须在 provider I/O 前拒绝，不做别名或静默降级。
- `StreamChunk` 是封闭流协议；usage 必须早于 finish，finish 后不能再发分片。未知 stop reason 与空完成失败关闭。
- `LlmFailure` 保持 provider-neutral。提供方返回的 retry delay 是事实，实际是否重试由 Agent loop 策略决定。
- provider request 的 AppIdentity 只能是静态公开信息，不携带用户、Session、路径、提示词或秘密。
- replay cursor 只在历史和目标路由仍由同一个 adapter 实例持有时复用，否则退回 provider-neutral 历史并给出诊断。
- TokenMeter 是请求压力和 surface 定价快照，不是账单或组织用量数据库。WorkDSH usage 领域消费已完成调用事实并保存租户归属；界面把 estimated 与 provider usage 分开显示。
- DeepSeek `dsh_plugin_packages` 会外发 live 包名与版本；可选 `dsh_session_log` 会无脱敏外发连续 Session 后缀。团队 Profile 默认关闭后者，启用需组织外发策略、接收端连续性/去重和保留规则。

## 6. 压缩与业务资料

Compaction 只改变模型当前 surface。开始/摘要/结束是日志事实，真正的可见变化是 checkpoint 替换；工具裁剪甚至可以在没有摘要时推进 surface。

- 压缩不归档或删除项目、资料、成果、专家修订和连接回执。
- unmatched compaction start 表示可检测的中断；恢复不能直接声称压缩完成。
- commit/persistence 错误可能代表内存已经关闭但 flush 失败，必须显示不确定状态并在继续前核对。
- 区间按 surface 位置选择，不能把事件 seq 当数组位置；必须保持 tool call/result 平衡。
- 压缩摘要可能包含敏感内容，按 Session 内容权限和遥测脱敏策略管理。

## 7. P0 探针要求

1. 验证 ExpertRevision → preset 修订 → Session header/系统提示词的可重建链。
2. 验证两个并发专家的 scope、动态 PromptContext、工具和技能互不污染。
3. 验证一次性/可继续子代理的能力声明、结果、取消、dispose、冷恢复和诊断。
4. 验证子代理不会继承父 scope-local 工具、资料或账号；WorkDSH 显式绑定后才可见。
5. 验证 Team task CAS、循环依赖拒绝、mailbox ack、fork 隔离和 provider 卸载行为。
6. 验证精确模型解析、unsupported effort 拒绝、adapter HMR 代次、流终态和 retry ownership。
7. 验证提示词与动态上下文通过官方 surface 持久化，compaction 后仍可说明来源。
8. 验证 TokenMeter 的 usage/estimated 区分，组织用量聚合不读取瞬时 live 流充当账单。

这些探针通过前，本矩阵是设计约束，不是发布线功能证明。
