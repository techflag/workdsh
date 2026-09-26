# DeepSeek Harness 官方文档能力审查

状态：已完成文档审查（127/127）；发布包运行验证仍在 D01
基线：2026-09-10 取得的上游文档快照；本地副本已清理，历史依据见上游对应 tag。
精确进度：[审查台账](deepseek-harness-review.json)

## 目的与完成标准

本审查用于决定 WorkDSH 如何通过 DeepSeek Harness 公开能力实现 WorkBuddy 类工作平台，避免重复实现已有运行时，也避免把截图表现误认成公开接口。审查完成前不进入 D02 业务插件实现。

语料库含 375 个文件，其中 Markdown 249 个；122 组中英双语文档以中文对侧为主，另有 5 个无中文对侧的英文 Markdown，共形成 127 份规范审查对象。i18n 配对元数据和图片作为完整性或界面证据，不重复计作语义文档。`https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/AGENTS.md` 是上游文档编写规则，不是 WorkDSH 产品 API。

完成必须同时满足：127 份规范文档均登记已审；关键结论有具体文档路径；WorkBuddy 能力映射到“直接复用、公开扩展、WorkDSH 自有领域、缺口/探针”之一；现有 ARCHITECTURE、PLAN、CONTRACTS、TEAM-DESIGN、UI-DESIGN 和 ADR 完成反查；新增假设进入可执行探针，不能只写推断。

逐文件台账保留当时的审查记录；旧镜像和只针对该镜像的审阅命令已清理。后续集成以当前锁定版本的发布包与探针为准。

## 固定审查顺序

| 波次 | 范围 | 重点产出 | 状态 |
| --- | --- | --- | --- |
| H01 | 根架构、术语、能力 seam、模块/事件图 | 应用边界、插件树、事件域、能力所有权 | 已完成 |
| H02 | Cordis API、教程、生命周期与防御模式 | 服务注入、作用域、effect、卸载/HMR 约束 | 已完成 |
| H03 | Web、Client modules、Slots、Conversation、Sidebar、样式 | WorkDSH 外壳、页面、公共 UI 与原生会话组合 | 已完成 |
| H04 | Session、投影、持久化、附件、工作区、查询 | 项目/任务/资料与执行事实的边界 | 已完成 |
| H05 | Skill、Tool、Command、Workflow、Job、Schedule、Webhook、MCP | 专家技能、连接器、自动化复用矩阵 | 已完成 |
| H06 | Settings、Credentials、Approval、Permission、Sandbox、Storage | 管理端、数据库、授权与隔离 | 已完成 |
| H07 | Agent preset、Subagent、Agent team、模型与压缩 | 专家、专家团、上下文和模型策略 | 已完成 |
| H08 | Cookbook、User、Testing、Postmortem、Development/i18n | 实施方式、发布体验、回归与已知故障 | 已完成 |
| H09 | 剩余子系统、全量反查与 ADR/计划修订 | 最终能力矩阵、风险表和 D02 准入结论 | 已完成 |

## 已确认的首批架构结论

1. Harness 是 Cordis 插件树；模型、工具、Session 日志和 Agent loop 都是可替换插件。WorkDSH 应以 bundle/Profile 组合官方和自有插件，不创建第二个启动器或 Agent loop。
2. 持久事实使用 Session 事件；运行中拦截使用 `agent/*`；可替换能力使用 service definition/provider/consumer seam。WorkDSH 业务数据库保存对象和绑定，模型实际看到的输入仍需通过公开 Session 事件或注入链留下可重建记录。
3. Web/桌面只是不同应用承载。当前产品目标是官方 Web Profile 中的 WorkDSH Client 模块与 Host 插件；设计原型不是另一套正式应用。
4. 一个业务能力必须同时说明声明、提供方和消费方。专家、技能、连接器、项目、资料库与自动化虽均由插件交付，但不会因此变成同一种对象或共享数据库。
5. 官方 storage 的 hub、JSON/SQLite backend 和类型化 domain facility 作为 WorkDSH 业务对象的默认持久化底座；领域插件声明并拥有 DomainSpec，不直接打开 SQLite，也不建立第二套通用存储抽象。见 [ADR-0011](../adr/0011-use-official-storage-domains.md)。
6. 官方 Skill 目录、按需调用和 Session/preset 作用域可直接复用；WorkDSH skills 插件负责创作、修订、授权和发布。不可变组合修订的运行风险及约束见 [ADR-0010](../adr/0010-immutable-preset-revisions.md)。
7. Harness scope 只有全局与单 Agent 两层；scope-local 注册不会因 subagent lineage 自动继承。专家团创建子任务时必须显式解析组合、工具、资料和账号授权，不能用父子关系代替能力绑定。
8. 人类命令由 `ctx.commands` 直接分派，不产生模型消息。WorkDSH 可以用命令打开专家/技能创作流程或执行确定性管理动作，但命令输出不是持久业务事实；实际变更仍走领域服务、存储和审计。
9. `agent/pre-step` 是技能、指令、压缩、目标、引用和 subagent 上下文共同进入请求前的关键 waterfall；任何监听器都必须委托 `next()`。WorkDSH 的项目/专家输入适配要避免吞掉其他官方上下文贡献，并通过 Session 事实保证模型可见输入可恢复。
10. 生成的模块图与事件矩阵用于识别直接依赖和生产/消费关系，不表达租户授权、数据所有权或安全等级。团队版鉴权仍由 WorkDSH 服务端执行。

## WorkBuddy 能力归属（全量反查后）

| WorkBuddy 类能力 | Harness 候选能力 | WorkDSH 责任 | 审查结论状态 |
| --- | --- | --- | --- |
| 首页、任务对话、左右栏 | Web Client、Client modules、Slots、Conversation、Sidebar | 品牌、导航、业务页面与绑定展示 | H03 已确认公开组合，完整产品页面待实现 |
| 专家与专家团 | Persona、Agent preset、Subagent、Agent team | 多专家对象、发布修订、授权、交接与团队策略 | H07 已确认运行映射，修订恢复与委派边界待探针 |
| 技能 | Skill registry/provider/tool、preset | 创建、校验、版本、授权、项目/专家引用 | H05/H06 已确认，正文隔离与授权待探针 |
| 连接器 | Tool seam、Credentials、Settings、MCP/扩展 | 连接定义、实例、账号授权、健康与审计 | H05/H06 已确认，实例身份与写入回执待实现 |
| 项目 | Workspace、Session metadata/reference、Storage domain | 项目业务对象、成员、配置、待办、资产关系 | H04 已确认：复用 Session 执行事实，Project 独立持有业务事实 |
| 资料库 | Attachment、Filesystem、Client resources、Storage | 资料元数据、修订、检索、成果和权限 | H04/H06/H09 已确认，Spill 不等于资产 |
| 自动化 | Schedule、Webhook、Jobs、Workflow | 规则、交付、发生、运行、执行主体、幂等与审计 | H05/H06/H09 已确认，Goal 不能代替调度 |
| 企业管理端 | Settings/Plugin UI、Storage、Credentials | 组织、成员、策略、对象治理和审计页面 | H06 已确认配置/凭据底座边界；组织治理仍由 WorkDSH 领域负责 |
| 行业应用 | Bundle/Profile/preset 组合能力 | 场景目录、推荐配置、版本与租户可见性 | H09 确认组合复用；行业对象和跨域回执由 WorkDSH 实现 |

## 当前影响

本审查是 D01 的前置校正，不改变“基于公开文档和发布包、不修改上游源码”的边界。P0-03 已有的真实探针继续作为运行证据；后续探针和 D02 契约必须引用本审查结论。随着 H01—H09 推进，每轮同步更新台账、设计差异和 STATUS，未审文件不能被概括为已支持。

## H01 审查记录

已审：`AGENTS.md`、`architecture.zh.md`、`capability-seams.zh.md`、`glossary.zh.md`、`graph-atlas.zh.md`、`module-graph.zh.md`、`event-producer-consumer.zh.md`、`subsystems/README.zh.md`。根目录中的生命周期、工具、持久化、配置等专题文档按其所属 H02—H08 波次审查，不因路径位于根目录而提前计数。

## H02 审查记录

已审 17 份：`cordis-primer.zh.md`，`cordis-api` 下 Context、Events、Fiber、Registry、Service 及仅有英文规范的 `inherited.md`，`cordis-tutorial` 的索引和 01—07，`defensive-patterns.zh.md`、`rescope.zh.md`。本波次形成以下强制实现规则：

1. Cordis 配置项并发挂载，文件顺序不是依赖顺序。WorkDSH 插件对必需能力使用 `inject`；可选能力才使用默认严格模式的 `ctx.get()`，并返回结构化“未就绪/未安装”诊断。
2. 服务名称位于扁平命名空间。WorkDSH 自有服务统一使用有辨识度的 `workdsh*` 名称；跨插件只依赖 contracts 声明的服务，不导入提供方实现。
3. 缺少必需服务会让 Fiber 合法地停在 `PENDING`，可能不报错且以状态码 0 退出。启动、安装、配置更新和管理端插件页必须检查 Fiber 状态、缺失依赖及 `FAILED` 错误，不能把进程存活或页面存在当成加载成功。
4. 服务提供方消失或被替换时，依赖方会卸载并在服务恢复后重启。业务插件不得缓存跨生命周期服务句柄；Remote、订阅、连接、定时器、watcher 和子插件都必须归属当前 Fiber。
5. Cordis API 注册天然属于 effect；框架外资源必须用带标签的 `ctx.effect()` 包装并返回 disposer。卸载要等待完全停稳。有关联顺序的异步清理必须放入同一个 disposer 依次等待，不能依赖多个异步 disposer 的执行顺序。
6. Loader 配置项必须有稳定 `id`；否则任何配置文件编辑都可能造成无关插件重新挂载。`disabled` 表示保留配置但卸载运行实例，不等于删除业务对象或历史修订。
7. 配置必须在启动前用 Schema 校验；引用的资源或提供方在可解析时也应立即拒绝无效值。`fiber.update()` 先经过 `internal/update` waterfall，再重启；观察型 waterfall 监听器必须调用 `next()`。
8. Harness 工具通过官方 `ctx.tools.register(defineTool(...))` 注册，参数与输出分别由 schema 定义，原生渲染结果单独形成可持久内容。工具还依赖 `systemPrompt` 提供方；只看到工具插件配置项并不能证明模型可调用。
9. 用户监听器异常必须被分发器隔离并记录，不能饿死后续监听器。自动化不得将 `agent/status` 或 `whenIdle()` 误当作某条 `followup()` 的结果，必须定义持久 inbox 回执到稳定状态的运行区间。
10. 子进程环境要清理凭据变量；临时与 spill 文件使用私有目录、随机名及所有者权限。可能为符号链接或 junction 的路径先判型并只 unlink 链接本身。
11. WorkDSH 依赖发布作用域下的 `@deepseek-ai/cordis` 与官方插件包名。上游 vendored 路径和改名脚本属于 Harness 仓库内部流程，不复制进 WorkDSH，也不引用其源码路径。

H02 对现有设计的修正已经写入 ARCHITECTURE、PLAN 与逐插件交付门槛。下一波 H03 将决定完整 WorkDSH 外壳究竟能通过哪些公开 Client module、Slot、Sidebar 与 Conversation seam 组成，并把原型组件映射到实际插件入口。

## H03 审查记录

已审 8 份：`subsystems/client-modules.zh.md`、`client-resources.zh.md`、`conversation.zh.md`、`sidebar-right.zh.md`、`slots.zh.md`、`web-client.zh.md`、`web-server.zh.md` 与根目录 `web-styling.zh.md`。`subsystems/web.zh.md` 是网络搜索/抓取能力，留到 H05；Webhook 留到自动化波次。

1. 最终产品形态是官方 Web Client 内的 WorkDSH Profile。Host 扫描声明 `dsh.client` 且导出 `./client` 的已安装包，将其加入同一个启动图；WorkDSH 不复制脚本加载器、不嵌 iframe，也不建立第二个 React root。
2. 正式左栏复用官方 `sidebar` owner：WorkDSH 占用品牌 mark/name，按插件贡献 `sidebar.panellist` 与必要的 `sidebar.footer.action`；官方 Workspace、Settings 和会话能力继续存在。插件可以有显式导航、仅在设置页出现，或完全没有 UI，入口位置与启用状态是两件事。
3. 业务主页面通过左栏项与配对的 `main` 贡献进入；`ctx.layout.selectPanel(id)` 在业务面板和原生 Conversation 之间切换。首页、能力中心、项目、资料库、自动化与管理端是 WorkDSH Client 贡献；对话执行仍用 `main.conversation`。
4. Slots 是唯一跨功能 UI 组合通道。功能包使用 `ctx.slots.inject()` 等待 owner 并注册贡献，不运行时导入其他功能组件。`single` 是明确替换位，常规扩展使用新的 list id 或未占用 keyed key；替换 `root`/`sidebar` 等 owner 会连带承担其完整子树，首期不采用。
5. React 组件不接收 Cordis `ctx`、Remote transport 或领域服务对象。Host 权威状态经生成 Remote → Client model → UI adapter → Slot props；用户操作以 callback 反向进入 Client service/Remote。可共享 UI 状态放 Slot store，业务状态仍留在 Host/Client model。
6. 原生 Conversation 是 Session 事件到 Chat/Trajectory 视图的组装层。WorkDSH 业务执行结果若要在重启、重连和分页后稳定呈现，必须有持久 Session event 与 Conversation Definition；临时 React 卡片或只写业务数据库不足以复现对话。
7. 右侧 Sidebar 是每个 Session 独立的停靠面，适合项目资料、成果与业务页面的预览，不适合项目全局配置栏。资源使用 `dsh-resource://<protocol>/...`，唯一 provider 输出 `none/loading/live/failed` 状态；流必须响应 AbortSignal。布局只在内存中，刷新后折叠，因此不能承载业务持久状态。
8. Client Resource 流只推元数据，正文通过对应 Remote 按需读取。资料库需要自有资源协议时，协议地址必须编码组织/对象/修订所需的稳定身份，Host 再做授权；不能从当前 Tab 或当前项目隐式借用权限。
9. 物理 WebSocket 恢复与领域逻辑恢复分离。可靠的项目、资料、任务和插件状态需要各自 baseline、cursor 或 query；普通 forwarded notification 不 replay。UI 不得把“已重连”误报为“业务状态已恢复”。
10. Web Server 只是 HTTP 载体，默认仅回环地址；绑定 `0.0.0.0` 时组合层必须提供 TLS、认证和 Origin 策略。路由与 fallback 各有唯一 owner并随插件注销，停服需强制关闭 SSE 等长连接后等待完全退出。
11. 正式样式复用官方 `ui-theme` 语义 `--dsw-*` token 与 `ui-primitives`，组件使用 CSS Modules 和 `clsx`，不引入 Tailwind 或第二套组件库。浮层用 elevation token，不叠加中性 border；平面分割线使用 0.5px；焦点、减少动态效果和图标语义进入公共组件验收。

这意味着 WorkDSH 可以在不修改 Harness 源码的前提下形成接近 WorkBuddy 的品牌、导航、业务页面、原生会话和会话右侧资料预览，但不会把官方外壳当作可随意覆盖的 DOM。详细页面映射已写入 UI-DESIGN；H04 开始核对 Session、持久化与工作区，决定项目、任务和资料对象哪些复用官方事实，哪些由 WorkDSH 数据库拥有。

## H04 审查记录（已完成）

已审 13 份：`session-format-status.zh.md`、`persistence-catalog.zh.md`、`subsystems/session.zh.md`、`subsystems/persistence.zh.md`、`subsystems/storage.zh.md`、`subsystems/attachment.zh.md`、`subsystems/filesystem.zh.md`、`subsystems/session-reference.zh.md`、`subsystems/session-title.zh.md`、`subsystems/session-projection.zh.md`、`subsystems/session-query.zh.md`、`subsystems/session-telemetry.zh.md` 与 `subsystems/workspace.zh.md`。

1. Storage 是后端 hub，产品插件使用 `ctx.storageDomain` 的类型化 Domain API；官方 SQLite/JSON provider 由 Profile 统一选择和路由。一个后端可以承载多个 unit，领域所有权不等于每插件直接管理一个 SQLite 文件。
2. DomainSpec 的 Zod schema、格式版本、布局和兼容版本属于业务数据契约。权威数据默认遇到无效记录即拒绝；只有可重建缓存才允许明确使用备份后跳过策略。
3. 同一 Domain 的写入按队列串行，底层持久化成功后才更新内存并发出 `domain/changed`。该事件是提交后的进程内通知，不能承担事务回滚、跨 Host 同步或可靠消息总线职责。
4. Domain 句柄由领域插件 effect 持有并在卸载时等待关闭。跨领域操作使用服务契约、操作标识与可恢复回执；不取得其他插件句柄，也不执行跨库 SQL。
5. Session 的 append-only 事件日志由 `sessionPersistence` 管理，和业务 Storage Domain 分离。Session handle 是单写者；`append()` 可批量落盘，`flush()` 才是需要明确崩溃耐久性的屏障。
6. Session header 独立记录 cwd、lineage、delegation 和 preset 等恢复信息；恢复时会为中断的运行补结束事实并继续追加日志。WorkDSH 不复制 Session 日志，只保存项目、对象修订和 Session ID 的业务关联。
7. 官方文档记录锁定发布线的最新 Session 格式为 3；WorkDSH 不自行解释或重写该格式，兼容性通过官方 provider 与发布包探针确认。
8. 官方 Attachment Store 在事件追加前持久化并校验二进制对象，事件只保存不可变、内容寻址的引用和元数据。浏览器 object URL、临时路径、provider URL 与 base64 不进入 Session；消费方不得解析 attachmentId 推导路径。
9. 通用文件上传凭证绑定到接收 Agent，并在消息入队/历史可见后退休。WorkDSH 输入区必须使用官方上传、receipt 绑定和准入链，不能让项目资产 ID 或任意宿主路径冒充上传凭证。
10. 跨 Session 引用是有预算、可截断、标记为不可信的时间点快照；它不会形成持续同步的项目关系，也不会授予源 Session 或文件权限。项目引用继续由 WorkDSH 领域保存，提交任务时才解析成已授权的结构化上下文。
11. 官方 Session title 是日志支持的后写覆盖投影，可记录 fallback/provider/user 来源；用户重命名会固定标题。它可直接用于会话列表，但项目任务名称、待办标题和业务对象名称仍由各自 WorkDSH Domain 拥有。
12. Session Projection 只承载由 Session 日志纯同步折叠得到的会话级全量状态。领域单元不订阅事件、不执行异步 IO，客户端不自行折叠；缓存快照可以陈旧但不能错误，重新打开会话后由更高水位线覆盖。项目全局状态和跨会话业务对象仍从 WorkDSH Domain 查询。
13. 官方 Workspace 是“规范化的现存目录 + 稳定 ID + 经过 header cwd 校验的有序 Session 账本”。它对模型不可见，一个 Session 最多归入一个 Workspace，删除注册不会删除目录或 Session。WorkDSH Project 支持成员、配置、资产、待办和非目录团队场景，因此保持独立业务对象，只可选择绑定一个 Workspace 作为本地执行位置。
14. Workspace 不是文件安全边界：公开 `workspaceFiles` 读取接口明确允许某些路径位于 workspace 外部，实际访问由所组合的 filesystem provider 判断。项目权限、运行隔离和资产授权不能用 cwd 相等替代。
15. Session Telemetry 是可选的外发副本：ledger 可能丢失或重复，ops 记录没有可去重的事件身份，默认 seam 不自带脱敏规则。它不能作为 WorkDSH 企业审计真源；启用前必须明确 sharing 模式、部署脱敏 waterfall 和接收端去重，权威审计仍由 audit Domain 保存。
16. Session Query 提供 live 优先的精确日志读取、surface、标题、谱系、事件关系与全文检索；全文查询被当作数据而非可执行 FTS 语法，游标绑定规范化请求。它适合任务历史与会话内搜索，不替代资料库的资产索引。
17. 官方 Session 查询过滤器没有 organizationId、projectId 或成员权限条件。用户端和管理端不能直接暴露全局 `ctx.sessionQuery`：必须先以 RuntimeBinding/ProjectTaskLink 得到已授权 Session 集合，再限定查询或由部署 provider 做物理分区，并对返回 header、标题、snippet 和谱系逐项重验。
18. `ctx.fs` 的 target key 与 version 都是不透明标识，消费方不能解析成本地路径；需要与子进程或附件互通时使用 provider 的显式映射。跨信任边界先用 `lstat` 识别 symlink，再 resolve，不能依赖字符串前缀判断目录包含。
19. 裸 Filesystem provider 的 write/edit 可以无条件覆盖；官方 observation policy 只增加“先读后写”和版本新鲜度，并不提供项目授权或目录沙箱。加载模型文件工具的 Profile 必须同时组合 observation policy、受验证的 sandbox/runtime provider 和 WorkDSH 授权，不能把 `FS_NOT_OBSERVED` 当成权限拒绝。
20. 文件写入和字面编辑是 provider 原子操作，可用不透明版本拒绝陈旧更新；文件 IO 没有可强制的超时，AbortSignal 只在系统调用边界尽力取消。自动化和管理界面需要显示不确定完成状态并在取消后核对实际文件版本。
21. Session 是追加式事件日志，也是 Agent 交互唯一执行事实来源；只有四类 surface 事件进入模型历史，其他原生或插件事件只进入日志。需要模型看到的项目、专家或资料输入必须通过受支持的 user/system 注入路径留下可恢复事实，不能只追加自定义日志事件。
22. `append()` 先完成内存提交，持久化在热路径外异步进行；`ctx.sessions.flush(session)` 才是导出、交接、依赖落盘读取或关停前的耐久性屏障。`session/event` 在提交后 fire-and-forget，监听器不能否决或回滚事件。
23. 产品任务必须通过官方 Session Controller/Agent 生命周期创建。裸 `ctx.sessions.create()` 不自动挂载持久化写入器；WorkDSH 不建立另一条会话创建路径。Controller 的 create、prompt、attachment、follow、cancel、fork 与页面能力应作为任务适配候选。
24. Session fork 只能从没有开放 turn 的稳定前缀创建新 Session，并继承 cwd/lineage 等执行信息；它不继承 WorkDSH 的成员、资产、连接或项目授权。fork、恢复和继续运行都重新解析业务绑定和权限。
25. Persistence Catalog 表明 Harness 已拥有消息、工具、命令、目标、审批、步骤、工作流、子 Agent、实验性 Team、待办、调度、成果声明和运行设置等执行事件。WorkDSH 复用这些事实，不把同一运行事实复制进业务 Domain。
26. 原生 `todo/write` 是 Session 内的整表执行状态，不是项目 WorkItem；`schedule/change` 是 Session 内调度状态，不是跨项目 AutomationRule；实验性 `team/*` 不是企业组织；`approval/*` 不是业务发布审批；`deliverables/presented` 也不代表 library 已登记 AssetRevision。
27. 自定义 WorkDSH Session event 只用于需要由 Conversation 或 Projection 重放的会话级节点，必须携带稳定业务 ID、保持 JSON 可序列化并声明未知版本迁移处置。未知且非 ignorable 的事件会阻止恢复，因此不能随意把业务表变化镜像成事件族。
28. 官方 Session Controller 的搜索说明带有可见/授权语义，优先于直接开放底层查询；但具体策略仍需 H06 锁定版本探针。验证前继续从 RuntimeBinding/ProjectTaskLink 取得授权 Session 集合，不能只依赖 UI 隐藏。

以上结论已形成 [ADR-0011](../adr/0011-use-official-storage-domains.md) 与 [ADR-0012](../adr/0012-session-and-business-fact-boundaries.md)，并同步修正 ARCHITECTURE、CONTRACTS、DEPLOYMENT-AND-STORAGE、PROJECT-DESIGN、TEAM-DESIGN 与 PLAN。H04 已完成；H05 开始审查 Skill、Tool、Command、Workflow、Job、Schedule、Webhook 与 MCP，形成专家、连接器和自动化的公开能力复用矩阵。

## H05 审查记录（已完成）

已审 13 份：`subsystems/commands.zh.md`、`subsystems/jobs.zh.md`、`subsystems/schedule.zh.md`、`subsystems/skills.zh.md`、`subsystems/tools.zh.md`、`subsystems/web.zh.md`、`subsystems/webhook.zh.md`、`subsystems/workflow.zh.md`、`tool-execution-pipeline.zh.md`、`tool-catalog.zh.md`、`user/develop/basic/tool.zh.md`、`user/guide/mcp-memory.zh.md` 与 `user/guide/schedule.zh.md`。

1. Command 是对确切 Agent 的人类直达操作，不创建模型消息。注册项可声明非结构化输入与附件；运行以 `command/run`/`command/done` 记入 Session，但结果直接呈现 UI。领域对象创建仍由领域服务提交，成功命令用 `sourceEventSeq` 关联更早的权威领域事件，避免从文字结果反推状态。
2. Command 注册可按 Agent scope 覆盖全局定义，发现视图不含 handler。未知命令不留日志；附件准入失败不会进入 handler。WorkDSH 的管理命令应保持确定性、可取消、可卸载，并让输入语法错误返回结构化错误而不是启动模型任务。
3. `ctx.jobs` 是通用进程内后台运行注册表，适合 bash、terminal、subagent 等生产方的统一读取、等待和停止。Job ID 可预测，授权依赖 owner Session；WorkDSH 生产方禁止创建无 owner job，因为无 owner 项对任意调用方可见且只受服务生命周期约束。
4. Job 只保留活跃进程内状态，不是持久自动化运行记录。每个流式 job 只有一个消费游标，不能直接作为多个浏览器或团队成员的可靠进度总线；WorkDSH AutomationRun 仍需 Domain 事实、可恢复状态和自己的订阅基线。
5. Job producer 拥有实际资源，runtime 拥有身份与状态；取消必须同步、幂等并最终让 `done` 在资源释放后结算。teardown 只能在取消抛出时强制失败注册记录，不能声称底层工作已停止。自动化和连接器提供方需保留“停止状态不确定”的诊断。
6. Workflow 是可选的模型编写 JavaScript 编排能力，每次运行由一个 worker 引擎执行并创建归属父 Agent 的 subagent；它适合一次 Session 内的大规模动态分解，不是可发布的行业流程定义、低代码自动化规则或长期调度器。
7. Workflow 的 meta/args 是独立 JSON，运行结果不拒绝并以封闭 stopReason 结算；调用方必须 dispose 等待脚本和子 Agent 停稳。工作流观察事件不暴露可取消句柄，只有顶层工具消费者会将连续前缀事件投影为可重放 Conversation 节点。
8. fatal 的工作流 API/策略错误必须终止运行，不能降级成普通子任务 `null`。WorkDSH 若允许专家使用动态 Workflow，应在组合解析时限制子 Agent 总量、provider、权限和可见资料，并把它视为高权限执行工具而非技能文档本身。
9. Webhook runtime 只接收已经由 provider 认证并规范化的交付，再按受信任规则选择是否创建普通根 Session。它没有队列、重试、去重、运行状态、崩溃重放或完成监听，dispatch 在回调结算前返回；重复交付可能创建重复 Session。
10. 因此 WorkDSH automations 插件必须拥有 WebhookRule/Delivery/Occurrence/AutomationRun 的持久状态、去重与恢复；官方 webhook 可作为认证适配和 Session 创建执行器。provider 立即返回 202 只表示内存分发，不等于规则执行或业务任务成功。
11. Webhook Session 会验证 permission/agent preset，解析 Workspace，并写入 `source.kind: webhook` 的持久 user message，但不会特殊 flush 或等待运行结束。WorkDSH 在交付提交前要先持久化 occurrence，并用 deliveryId + source + rule 的幂等键协调 Session 关联。
12. 工具执行固定经过 pre-execute waterfall、单调 guards、approval、execute wrapper、工具 body、post-execute、结果规范化、finalizeContent 和不可变 `tools/result`。WorkDSH 授权/项目/连接策略应放在不可被后续监听器重新放行的 guard；审批、超时和结果改写遵循官方阶段，不在连接器工具内部另建旁路。
13. `tool/call` 在执行前、唯一 `tool/result` 在最终内容冻结后进入 Session；批次全部结果记录后才注入 FIFO additionalContexts。业务回执需要进入规范化工具结果或权威领域事件，不能依赖临时 UI 卡片；PTC 子调用也经过同一流水线与拒绝规则。
14. Skill 注册表原生支持全局层、Agent scope 链、多提供方、cwd 敏感发现、异步取消和不完整目录。最近 scope 的同名项直接覆盖，rank 只在同一层裁决；专家/项目的技能授权不能依靠加载顺序或显示名。
15. 官方 Skill 已具备模型/用户调用策略、持久目录注入、正文按需加载、冷 Session 目录和 provider 资源基址，足以成为 WorkDSH 唯一执行底座。技能中心只补草稿、发布修订、组织授权和 provider 投影，不复制目录、解析器或 `skill` 工具。
16. Skill 正文不会缓存，每次 `get()` 都重新从胜出 provider 读取；正文变化不触发目录替换，也不改写旧工具结果。WorkDSH 已发布 SkillRevision 必须定位不可变内容，历史 Session 禁止解析到同名可变 latest。
17. `modelInvocable` 和 `userInvocable` 是调用面策略，不是租户授权；两者都关闭的条目仍可由受信代码读取。provider 和任务解析服务仍需按 ActorContext、组织、项目与精确修订过滤。
18. 工具 schema、规范 JSON 值、模型内容和 UI presentation 是分离层。成功 value 不作为持久执行值复制，关键外部回执必须同时进入对应业务 Domain；presentation 函数必须纯且可重放。
19. 只有 `isConcurrencySafe()` 明确返回 true 的调用可以并行；未知、异常或未声明均独占。连接器写入工具默认独占，除非提供方证明状态更新可并发、回执幂等且 recorder 竞态可交换或失败关闭。
20. Tool restriction 只过滤继承的全局工具，不过滤该 scope 自己注册的工具；PTC 的保留 transport 也在可见能力层之外。WorkDSH 权限必须由覆盖 native/PTC/MCP 子调用的单调 guard 和领域服务共同执行，不能只依赖 allow/deny 列表。
21. Schedule 是 Session 内持久提醒，只在原 Session live 且 Agent idle 时交付普通 follow-up；cold Session 不运行、fork 不继承，不支持 Cron、日历重复或外部通知。固定频率至少五分钟，错过区间合并，入队与 dispatch 之间仍有至少一次重复窗口。
22. MCP client 可直接复用 stdio/Streamable HTTP 生命周期、工具发现、命名和重连。DSH 不安装或初始化 server，也不拥有第三方账号、数据、模型、embedding、迁移和许可；这些状态由连接器定义、实例及 provider 管理。
23. MCP 工具目录是异步且可能暂时陈旧：断线时工具仍可列出，调用失败；重连预算耗尽后才注销。连接器健康必须区分 configured/discovering/ready/offline/unregistered，目录存在不能视为可用回执。
24. stdio MCP 会移除常见凭据变量与 `DSH_*`，仍会继承其他环境。正式 Profile 使用显式最小 env 与凭据引用；Streamable HTTP 的 URL、headers 与外部身份不进入模型或普通业务对象正文。
25. Web search/fetch 是 provider seam，不按注册或配置顺序猜测；多个可用 provider 且未指定会明确报歧义。HTTP 非 2xx 是描述性结果，不是自动异常，消费方必须检查 statusCode。
26. 官方 HTTP fetch 防止访问非公开地址与受限重定向，但不阻止向公开 URL 外发敏感数据；文件 sandbox 和交付的默认审批也不约束 Web fetch。团队 Profile 必须另加工具 guard/审批/组织外发策略与审计。

H05 的最终归属和 P0-04 探针见 [执行能力复用矩阵](harness-execution-capability-matrix.md)。H06 开始审查 Settings、Credentials、Approval、Permission、Sandbox、Storage 及相关配置目录，验证管理端、连接实例和团队隔离能否在所有原生入口执行。

## H06 审查记录（已完成）

本批已审 7 份：`api-gateway.zh.md`、`config-catalog.zh.md`、`subsystems/settings.zh.md`、`subsystems/credentials.zh.md`、`subsystems/approval.zh.md`、`subsystems/permission-presets.zh.md` 与 `subsystems/sandbox.zh.md`。Storage 已在 H04 完成并在配置目录中反查 provider/domain 路由。

1. Settings 是用户可编辑运行偏好的命名空间 seam，按 schema default、组合 `base`、用户 section 解析。它不是业务数据库或组织策略真源；OrganizationPolicy、AccessGrant、对象修订与连接实例仍进入各自 Storage Domain。
2. Settings 的 `update` 只补丁用户 section，`replace` 会令缺失字段回落到 base/default。外部写入携带 descriptor 的 section revision 并处理冲突；`applies` 只是界面提示，owner 未实现监听时不会自动热更新或重启。
3. 所有外部 Settings endpoint 必须使用 `describe({ redactSecrets: true })`。secret role 字段不应出现在 base/user/resolved；管理页只呈现路径和是否已设置，不能用普通配置表单读回凭据。
4. CredentialRef 与 CredentialKey 是两套不同 key space。前者按进程环境、provider store、`.env` 分层解析，后者保存插件持有的授权 grant record；两者都不允许 Remote 返回明文，也不把空字符串视为已配置。
5. 消费方按每次操作解析凭据，不跨操作缓存，因此轮换在下一次调用生效。进程环境来源不可由 provider 写回；连接领域保存凭据引用、目标指纹和外部主体，不保存密钥本身。
6. Harness Approval 只回答一次精确操作。闭集结果中仅 `allowed-once` 放行；拒绝、取消、unavailable 及 responder 缺失或异常全部失败关闭。Session 的 `never` 策略在 waterfall 前执行，监听器不能绕过。
7. 原生 approval 记录本次工具调用，不是组织发布、成员加入、资料接受或项目共享的业务审批。业务审批仍由 WorkDSH Domain 持久化；角色授权也不能由用户点击一次工具批准替代。
8. Permission Preset 只把 sandbox mode 与 approval policy 组合为 UI 便捷选项，本身不实施安全。当前值由实际旋钮投影，`custom` 只表示无法匹配已知组合；它不是 RBAC、连接授权、组织策略或资源 ACL。
9. Sandbox 只约束子进程文件系统影响，不限制网络或进程可见性；`danger-full-access` 完全绕过约束。受限模式可能报告 `partial`，要求强隔离的团队任务必须拒绝 partial 或路由到已验证的容器、microVM、远程 runtime。
10. 每个 Session 可基于不可变 cwd 形成不同文件策略，但 Workspace、cwd、Cordis scope 与 Sandbox 都不能单独成为租户边界。外部网络写入仍需工具 guard、连接授权、审批和组织外发策略。
11. API Gateway 适合严格生成的一元业务调用：只有显式 Remote 方法进入 Client，参数/返回值经过 codec，复杂 Host identity 经 lookup/context provider 解析，并支持 AbortSignal。lookup 成功不代表业务授权，服务入口仍须恢复可信 ActorContext 并检查组织、资源和动作。
12. Remote 不承载事件流、分页、增量 reduce、Session follow 或长任务订阅；这些协议可以复用 Connection，但需要自己的 baseline/cursor 和恢复语义。开发 SRC fallback 的校验较弱，发布验收必须使用生成的 Host/Client 严格产物。
13. Client 组合显式选择允许挂载的 Remote contribution，调用方声明 `remote.<namespace>` 依赖；热卸载撤回方法并取消在途调用。新增或修改 Remote 约定必须按 Host 生成再 Client 编译，不能只重编浏览器代码。
14. 配置目录是部署轴的完整目录，不是插件作者 API 或工具 schema。管理端按四类制品展示：有配置可加载插件、无配置可加载插件、不可直接加载的 seam、无插件入口的库；npm 包存在不能推断为可启停插件。
15. `Requires` 只列 Harness 层 `inject` 服务，不能据此推断 vendored Cordis 依赖、租户授权或运行健康。Profile 必须加载具体 provider，并用 Fiber ACTIVE/PENDING/FAILED 诊断实际组合。
16. user preset root 的信任等同 shell 访问；sandbox-policy 的安全默认是 `read-only`；storage-domain 可按 domain 路由 backend；settings-file 与 credentials-local 是不同文件和生命周期。WorkDSH 的默认 Profile 保留这些边界。
17. MCP、Web search、subagent 等部分配置类型允许 literal header/key/env 或绕过式 permission mode。类型可配置不代表产品应开放；正式团队 Profile 优先 credential reference、显式最小 env 和组织限制，高危 provider/mode 不向普通组织管理员暴露。

完整边界与 P0-04 待验证项见 [治理能力复用矩阵](harness-governance-capability-matrix.md)。H06 完成；H07 转入 Agent lifecycle、Agent team、Subagent、模型、压缩与上下文能力，决定专家和专家团的实际运行映射。

## H07 审查记录（已完成）

本波次已审 14 份：`agent-lifecycle.zh.md`、`deepseek-llm-api-wire-extensions.zh.md`、`subsystems/agent-team.zh.md`、`subsystems/core.zh.md`、`subsystems/scope.zh.md`、`subsystems/subagent.zh.md`、`subsystems/compaction.zh.md`、`subsystems/llm-streaming.zh.md`、`subsystems/system-prompt.zh.md`、`subsystems/token-meter.zh.md`、`cookbook/adding-an-llm-adapter.zh.md`、`cookbook/extension-cookbook.zh.md`、`user/develop/practice/llm-adapter.zh.md` 与 `user/guide/python-sdk.zh.md`。

1. Session 事件是耐久、可回放事实，`agent/*` 是实时协调；产品恢复从 Session baseline/cursor 出发，不回放 live 事件猜测结果。pre-step 拒绝、空值或失败不花费 step，LLM 重试在同一已打开 step 内完成，不能重复执行用户准入。
2. 专家解析结果必须锁定 ExpertRevision、preset 修订/指纹、精确模型路由、技能修订、工具目录和已授权工作范围。专家档案、preset 配方与 Session 实例是三类对象，任何一项都不能代替另两项。
3. 系统提示词段、动态上下文与工具 schema 在统一作用域内组装。scope 内同名项覆盖全局项，`complete` 段会独占提示词；WorkDSH 使用稳定段名和中央顺序，不在组装后拼接隐藏提示词。模型实际看到的系统提示词以 `system/message` surface 节点持久化。
4. Scope 是进程内可见性和生命周期原语，不是 Cordis 服务或安全域。每个子 Agent 获得新的 flat scope，父 lineage 不自动传递工具、资料、凭据或权限；专家团每次委派都重新解析 RuntimeBinding。
5. 一次性 Subagent 与可继续子 Session 是不同协议。一次性运行必须消费唯一结果并 dispose 到停稳；非 completed 是部分结果。可继续子代理的 inbox 是唯一队列，消息接受后独立执行，interrupt 的确认也不代表已经停稳。
6. 原生 Agent Team 是根 Session 内的实验性协作状态：TeamId 即 root SessionId，成员由 SessionId 标识，mailbox 和 task DAG 持久化在 lead 日志。它不创建组织、成员关系、业务专家团或项目待办；task revision 使用 CAS，`writeScopes` 只是建议而不是锁。
7. 子代理 provider 卸载只阻止新启动，不撤销已接受运行；fork 中继承的旧 team 事件也不成为新根 team 状态。管理页和恢复流程必须区分可启动、运行中、已中断、不可恢复和持久状态可能陈旧。
8. 模型目录只供展示和发现，精确路由 adapter 才拥有上下文、reasoning effort、输出上限和系统提示词更新能力。显式但不支持的 effort 在网络请求前拒绝；一次 prepared call 锁定同一 adapter 注册代次直至分派。
9. Adapter 一次调用等于一次 provider attempt，不允许库内部隐藏重试；空完成、未知终止原因和协议错误失败关闭。replay 状态只有在历史与目标路由仍由同一 adapter 实例持有时才能继续使用。
10. Compaction 只改变模型 surface，不删除项目、资料、成果或业务回执。中断、部分提交和 flush 失败有独立诊断；区间按 surface 位置而非事件 seq，且必须保持工具调用/结果平衡。
11. TokenMeter 是请求压力与 surface 定价的不可变回放快照，不是组织账单。`usage` 与 `estimated` 基线必须分开呈现，WorkDSH usage 领域只消费带主体和组织绑定的实际调用事实。
12. 原生 Agent handle 的 `followup` 只返回持久入队语义，MessageId 不能关联到某次 assistant 结果或 turn end；`idle/running` 描述整个 driver 排空区间。WorkDSH 任务结果必须从 Session 持久事件和自己拥有的运行区间解析，不能用 `whenIdle()` 猜任意消息的结果。
13. Agent 创建的 setup/commit 在 ID 发布前事务化完成；失败会回滚。浏览器或外部协议若需读取 preset 隔离服务，应通过 `serviceFor(agent, name)` 精确寻址，不能让 Host 全局 inject 一个会话内服务。
14. `composeFrom` 可以显式让子 Agent 加入父 Agent 当前正在运行的同一 standing preset generation；这是组合绑定，不是 flat scope 或权限自动继承。需要不同专家时挂载目标不可变 preset；需要完全同组合时才复用父代次，并仍单独解析业务授权。
15. preset roster 每次重新读取文件，但已经 standing mount 的组合清单以当前 live generation 为准；`recompose` 只提供重链接能力，调用方必须保证 Session 尚无内容。产品入口使用受保护的 `select`，不直接调用 `recompose` 绕过空会话检查。
16. `agent/session-start` 只能通知并用 `inject()` 提供启动上下文，不能否决启动；initiator 只表达同进程因果归属，既不证明 Agent 存活也不授权。所有 wire/worker/queue 边界仍恢复明确主体。
17. DeepSeek 专属 `dsh_plugin_packages` 会向配置端点暴露所有 live Loader 包名和版本；可选 `dsh_session_log` 会无脱敏地发送连续会话后缀，包含 cwd、提示词、用户内容、工具参数/结果、压缩摘要和插件事件。HTTP 2xx 接受水位不是 SSE 完成或远端持久化证明，交付至少一次并可能重复。
18. 团队 Profile 默认关闭 `dsh_session_log`；如需启用，必须将 baseURL/网关、数据范围、接收方连续性校验、保留/删除、重复处理和用户告知纳入组织外发策略。包清单也作为部署元数据外发单独展示，不因字段位于模型消息外就视为无敏感性。
19. Python SDK 是启动独立 `sdk-minimal` Profile 的协议客户端，不是 Web UI 或第二个运行时。其极简组合缺少 settings、托管凭据、subagent、compaction 等能力且固定 danger-full-access，只适合隔离 workspace；WorkDSH 最终页面仍组合官方 Web Profile。
20. 自有 LLM adapter 必须尊重 AbortSignal、attribution headers、unsupported option、单次 provider attempt 和完整 StreamChunk 约定。WorkDSH 首期优先使用官方 DeepSeek adapter；新增 provider 作为独立 provider 包验证，不能把模型策略塞进 adapter。

完整对象归属、失败语义和 P0 探针见 [Agent 与专家编排矩阵](harness-agent-composition-matrix.md)。H07 完成；H08 转入 Cookbook、User、Testing 与 Postmortem，提取正式插件开发、发布体验、测试门槛和已知故障。

## H08 审查记录（进行中）

Cookbook 第一批已审 8 份：`cookbook/adding-a-package.zh.md`、`cookbook/adding-a-remote-api.zh.md`、`cookbook/adding-a-session-format-version.zh.md`、`cookbook/adding-a-settings-card.zh.md`、`cookbook/adding-a-tool.zh.md`、`cookbook/adding-a-vendored-package.zh.md`、`cookbook/maintaining-dsh-code-review.zh.md` 与 `cookbook/responding-to-pr-review-on-a-stack.zh.md`。

1. 官方 package group 是纯目录容器，capability seam 只在定义、提供方、消费方需要独立演进时拆包。这支持 WorkDSH 的 `packages/plugins` 与 `packages/providers` 父目录，但父目录不能声明为可加载包。
2. 上游新增 workspace 包、project reference、Session format migration 和 vendoring 流程面向 Harness 源码贡献者。WorkDSH 是外部发布包项目，不采用这些内部流程，也不借此修改 Session 格式或复制上游源码。
3. 自有 Remote 以 Host `TypertRemoteService` 为签名真源，Client 使用生成代码；顶层复杂身份由 lookup/context 恢复，可取消调用把 `AbortSignal` 放在最后。签名变化必须重新生成并测试两端。
4. Remote 领域失败使用稳定 `<domain>/<reason>` code 与结构化 details；Client 按 code 处理并为未知错误降级，不能依赖字符串或跨 wire `instanceof`。Remote 仍只用于一元方法，不承载事件流。
5. 设置卡由同一功能包的 Host/Client halves 以相同 namespace 配对，并通过官方 keyed slot 注册；revision guard 防止覆盖并发编辑。Settings 仍不是业务数据库、组织策略或凭据真源。
6. Client bundle purity 禁止从另一个功能插件导入运行时实现。公共视觉组件来自官方 primitive 或 `packages/ui`，领域数据由各插件 Client model 经 Remote/Session 投影为 props。
7. 工具严格区分 schema、规范 JSON 结果、模型内容和 UI presentation，并尊重 `exec.signal`。后台 Job 发布后，取消与结算所有权转给 Job；关键外部回执必须写入所属 Domain，不能只存在于展示卡。
8. PTC 对可见工具重入同一执行流水线，因此 guard/approval/审计必须覆盖原生与 PTC。Web Client 使用 `tool.call.toolview` keyed contribution 校验 wire event/meta，renderer 缺席时保留通用回退，不直接复用 Host presenter。
9. 上游代码审查与 stacked PR 文档只提供维护纪律：机器检查不能替代人工判断，完整本地门槛必须通过。它们不构成 WorkDSH 产品能力或用户工作流依据。

完整适用矩阵和交付检查见 [Harness 扩展交付清单](harness-extension-delivery-checklist.md)。H08 下一批继续 User、Testing 与 Postmortem；当前结论仍需 P0-04 在锁定发布包上验证。

H08 第二批完成 User 剩余 13 份、Testing 1 份和 Postmortem 5 份，逐文件路径已登记在 JSON 台账，累计 107/127。

10. bundle 与 Profile 分别拥有配置贡献与启动组合；普通 npm 依赖不会自动激活。配置层后写覆盖整行 config，覆盖时必须保留必需键。外部交付采用预构建 tarball，源码安装的 prepare 授权不属于普通运行权限。
11. 模型设置复用官方凭据和路由 UI；Provider ID 永久但端点/协议可编辑，因此 WorkDSH 需绑定配置修订。模型发现、模态声明和 reasoning/compat 配置均不证明端点实际支持；能力探针保留。
12. 动态 Cordis 插件是临时进程级实验，可影响其他会话，不能作为专家或技能对象的保存机制。团队业务默认组合不开放该能力，开发者实验在隔离环境单独验证。
13. 代理配置有受信来源与直连例外，代理秘密还可能进入子进程环境。入站 Webhook 签名不授予出站账号权限，202 不代表匹配或创建任务；部署需分别验证外发与接纳/执行事实。
14. 上游测试策略强调真实入口、实际构建产物、独立资源与外部状态断言。WorkDSH 采用这些原则，不继承上游内部命令、fixture 格式和覆盖率指标；模型测试与无密钥集成分别记录。
15. 事故 0001 要求验证 Loader 真正使用的导出形态及 Fiber 调用拓扑：命名空间插件不能再导出裸 apply；可选服务使用 ctx.get。手动构造插件和根上下文测试不足以覆盖交付路径。
16. 事故 0002 表明快照更新可能把工具缺失固化为预期；必须独立断言工具存在、结果语义和外部成果。其 disabled 历史描述与当前 primer 的求值契约存在时间层次差异，rc.1 行为保留待测，不当作当前缺陷。
17. 事故 0003 要求在用户实际 origin 验证 GUI，关联产物、Profile、进程与浏览器。HTTP 200、认证、boot manifest 和页面可用分别取证；替代端口成功不能证明既有页面更新。
18. 事故 0004 要求适配器保留下层结构化错误，并区分子进程返回与 launcher 故障；平台跳过不能视为通过，需确定性边界测试和至少一条真实组合路径。

H08/H09 收尾：development/i18n 6 份与剩余子系统 14 份已审，累计 127/127。逐专题结论、设计反查、文档差异及 C01—C06 验证项见 [全量审查收尾](harness-review-closure.md)。返回 D01 两 Session 与技能正文探针；D02 尚未准入。
