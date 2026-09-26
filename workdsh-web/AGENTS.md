# WorkDSH 开发规则

## 项目目标与用户已确认决策

WorkDSH 是基于 DeepSeek Harness 公开插件接口的 Web 工作平台，参考 WorkBuddy 的应用能力。项目独立于 dsh-ssh-desktop。

1. 仅依赖官方开发文档和已发布 npm 包；禁止要求上游源码 checkout、引入上游子模块、复制上游私有实现或修改上游源码。
2. 基线为 `@deepseek-ai/dsh@0.1.7-rc.2`。DSH 直接依赖按该版本族精确锁定；Cordis 等遵守公开 peerDependencies。不得使用浮动 latest、alpha 混搭，升级必须单独记录兼容证据（见 [docs/DSH-0.1.7-UPGRADE-PLAN.md](docs/DSH-0.1.7-UPGRADE-PLAN.md) 中的 rc.2 Web 升级记录）。
3. 专家、技能、连接器、行业应用、项目、资料库、自动化、工作台是功能插件。每个插件管理多个业务对象。禁止将每个用户专家强制变为独立 npm 包。
4. 每个功能的页面操作和 Agent 工具使用同一业务服务；对话式创建专家和技能属于 P1 必做能力。
5. 插件必须互通：通过公开契约、服务注入和工具组合协作，禁止直接读写其他插件的数据表或导入其内部实现。
   - 遵循 Harness 自身的插件组合精神：官方底座和 WorkDSH 业务能力统一由官方 Loader/Profile/Cordis 装配，不另建业务大核心或插件框架。默认 bundle 只组合，不用直接调用 applyX(ctx) 隐藏初始化多个功能；各功能使用正式插件入口、独立生命周期与可安装制品。专家引用共享 Skill 对象与修订，不复制技能插件实现。详见 [ADR-0018](docs/adr/0018-composable-feature-plugins-and-shared-skills.md)。
6. 默认 Web 运行，使用官方 dsh / Profile / bundle 安装启动；禁止另建 Agent loop、插件加载器、模型路由或 Electron 壳。
7. 专家切换通过关联新任务交接。专家修订不能静默替换运行中任务的组合。
8. 所有规划模块目录首期即创建。规划中模块保留 README、职责、任务 ID 和验收条件，不得删除、遗漏或宣称完成。
9. 未实现模块不得声明 dsh.bundle、可加载 exports、假工具或假成功响应。脚手架不等于功能完成。
10. 首期可提供本地单用户体验，但组织、主体、资源归属、授权、审计和运行隔离从 P0/P1 起实现和测试；不能把团队兼容留到 P3 重构。完整路线保留专家团、自动化、团队协作、在线表格、业务页面和发布能力。

## 每次开始与结束

开始前确认工作区变更；实现任务从 `docs/STATUS.md` 和 `docs/development-order.json` 核对当前阶段。按任务读取文档：架构/所有权变化读 `docs/ARCHITECTURE.md`，范围或顺序变化读 `docs/PLAN.md`，功能实现读模块 README，公开契约变化读 `docs/CONTRACTS.md`，数据、执行、账号或共享变化读 `docs/TEAM-DESIGN.md`。文字、静态展示等局部修改不要求预读无关设计文档。

- 先确认实际代码和工作区变更，再从任务台账选工作；不要仅凭上轮聊天记忆判断状态。
- 范围变化先更新决策、计划和台账；用户新的明确指令优先于这些文件。
- 结束时更新 STATUS 的当前任务、证据、下一步、阻塞项；未做的检查必须写“未执行”。
- 不因时间不足删除后续任务，不把规划中、模拟通过或页面完成写成整体完成。
- 不自动提交、推送、发布 npm、配置外部账号或对外发送消息，除非用户已经授权。

## 专家模块交接规范

涉及 D04 专家或 D11 专家团时，先读 [专家开发交接包](docs/design/experts/README.md)，按 PRD、UX、HLD、契约草案和验收矩阵实施。拟新增接口不能当作现有 API；必须先完成 G01—G06 的官方公开面验证，并将实际证据回填。单专家 D04 与专家团 D11 分开验收，企业服务器/管理 Web 继续后置。一个专家插件管理多个专家对象；不新增每专家 npm 包或第二套执行器。详情弹框复用公共 UI，原生任务框保留 /、@、附件、模型与权限。完成 EP-07 后按已定义范围收口，不自行无限扩展下一步。

产品语义以 PRD 1.1 为准：Skill 是能力，专家是能力加领域经验/专业判断/完整交付职责，专家团是多专家加 SOP。使用详情与编辑分开；专家选择真实技能对象，不能以手填名称或技能数量装饰代替配备能力。验收包含实际业务成果与必要追问，不只检查 prompt/按钮/工具成功。D04 执行 [有限开发计划](docs/design/experts/DEVELOPMENT-PLAN.md) A～E、AT-01～27；D11 后续执行 TM-01～04、AT-T01～T07，首版必须有 SOP，不另造 Agent loop 或通用流程引擎，不自动起专家 0.2。

### 2026-09-15 官方 Team 替换决定

用户已明确要求退役自建专家团执行器。本决定覆盖上述旧 TM-01 执行器/SOP 状态机要求：专家和成员修订保留为资产配置，场景是工作指导；执行、消息、共享任务和团队面板使用 0.1.6-alpha.2 官方 Agent Teams（版本随基线规则第 2 条推进，本决定只限定归属官方）。禁止恢复 TeamRunsManager、workdsh_expert_team_*、workdsh-expert provider 或新建等价运行表。旧数据保留只读，旧委派任务不能续跑旧调度器；官方缺陷单独验证和处理，不作为保留旧实现的理由。

## Harness 优先复用硬约束

- 所有 Harness 集成开发必须先查阅官方 rc.2 发布说明及已发布 npm 包的 exports/types，并按 [Harness 官方开发规范](docs/HARNESS-OFFICIAL-DEVELOPMENT.md) 完成扩展面、依赖、生命周期和验收核对。`docs/dsh-v0.1.7-alpha.1/` 仅保留为历史参考；锁定版本的实测决定可用接口。
- 左侧主导航只通过官方 `sidebar.panellist` 等已声明 Slot 增量贡献，并与 `main` 的同 key 页面配对；不得替换或复制官方 Workspace/Session/New Session/Settings owner。`sidebar-right` 只用于当前 Session 的文件、目录、成果或上下文页面，不承担全局主导航和全局管理页面。
- 普通 Slot 贡献使用 `ctx.slots.inject(key, callback)` 等待 owner 生命周期；独立 registry/service/listener/timer/watcher/subprocess 等注册必须由 `ctx.effect()`、`ctx.on()` 或官方自动托管 API 拥有并可完整撤销。组件 props 从官方 `PropsRuntime<K>`/标准 owner props 推导，不复制框架 props，也不把 `ctx` 传入 React 组件。

- 每项功能编码前，在对应设计或证据文档填写“官方能力复用记录”：任务 ID、官方文档路径、锁定发布包/公开入口、已有探针、WorkDSH 需补的业务差异、验收与缺口。模板见 docs/PLUGIN-DELIVERY.md；缺记录先补记录再编码。
- 选择顺序为：直接复用官方能力 → 通过公开 service/provider/tool/Remote/Slot 扩展 → 仅实现官方不拥有的业务领域。不得以 UI 不同、接口不熟或赶进度为由另造同类底座。
- Session/Agent loop、preset 组装、Skill 解析与运行、模型路由、MCP 传输、Storage backend、Remote transport、Conversation renderer 均使用官方底座。自有代码负责业务对象、修订、授权、关联与差异 UI；禁止复制上游内部实现。
- 文档说明、发布包类型、真实运行证据分开登记。镜像与锁定版本不一致时先做最小探针，不猜接口，也不静默升级。复用不能省略组织授权、运行隔离与外部写入回执。
- 官方能力确有缺口时记录候选接口、失败证据和最小扩展方案；涉及改变既定所有权或新建基础抽象时先补 ADR 与计划，再实现。常规公开扩展可在已授权范围内继续，无需额外确认。
- review 必查是否出现第二套状态真源、同职责 registry/loader/transport、跨插件内部依赖或将原生运行对象冒充业务对象。检查脚本不能替代这项语义审查。

## 工程与依赖细则

- 版本单位是模块。每个开始开发的模块在 `docs/modules.json` 声明独立 `moduleVersion`，并遵守 [模块版本规划](docs/MODULE-VERSIONS.md)；页面、任务和切片不单独建立产品版本。当前技能模块版本线为 `0.1`。
- 模块内 Host、Client、Remote、资源和内置管理 Skill 共用一条版本线；不同模块不锁步。bundle 仅有独立的集成版本，不能代替功能模块版本或带动未变化模块升级。
- pnpm workspace，TypeScript + ESM；开发与 CI 目标 Node 22 LTS，最低 22.19，允许 Node 24。
- 管理器固定 `pnpm@10.34.5`。根 package.json 与 `.node-version` 是工程配置源。
- `packages/contracts` 提供领域子路径契约，不放业务实现或一个万能管理服务。
- 功能插件可依赖 contracts、ui、官方包；禁止横向导入其他功能插件。可选协作使用注入，必需依赖明确诊断。
- ui 仅包含展示组件，不引入 Host、数据库、凭据或执行器。
- 使用官方 Remote / Client model / Slots / Conversation / Sidebar 扩展；组件不持有第二套执行状态。
- 默认开发数据必须使用隔离的测试 Harness home / Profile，不改用户其他 Profile。
- 人工交互预览与自动化探针分开：`corepack pnpm preview` 使用项目预览 Profile，但默认读取当前用户 `~/.agents` 的官方技能目录；自动化探针使用临时 Agents home。禁止用空的探针目录启动 18989 人工预览并据此判断用户技能已丢失。

## 数据与执行

- Harness 日志拥有执行事实；WorkDSH 数据只拥有对象、修订、绑定、项目和资产关系。
- 模型可见输入走公开注入与持久日志机制；按官方契约扩展事件与投影，不直接改日志文件。
- 连接定义、连接实例和账号凭据分离。实例选择必须明确；禁止跨账号回退。
- 插件 scope 和工具可见性不是权限隔离。实际操作仍需服务端检查并遵守 Harness 审批/沙箱。
- 凭据不进入对话、前端、导出包和日志。用户授权走专用界面或外部登录流程。
- 写入不确定时先核对远端结果，不盲目重试。Agent 说完成不能代替工具回执和成果检查。
- 已发布对象修订不可原地改写。删除使用归档；历史引用保留，卸载默认保留用户数据。

## 验证

当前可运行 `node scripts/check-plan.mjs`（或 `pnpm check:plan`），仅校验计划和脚手架完整性。

后续 build/typecheck/test/e2e/pack 验证随真实实现增加，禁止空命令充当通过。P1 必须验证跨插件链路，详见 `docs/ACCEPTANCE.md`。不依赖 API Key 的测试默认可运行，真实模型与外部服务测试显式选择并记录。

## 团队版首期硬约束

- 本地单用户是 identity provider 的一种模式，不允许各业务服务假定一个全局当前用户。
- 业务查询和变更必须接收服务端建立的主体与组织上下文；拒绝客户端或模型伪造 actor/organization。
- 对象、资产、连接、会话绑定和审计均记录组织与所有权，授权按操作检查；跨组织引用默认拒绝。
- 组织管理员不默认取得成员私有对话正文或凭据；管理员权限与内容读取权限分开。
- 共享专家不共享 Session、个人凭据或任意文件路径。Scope/工具过滤不足以隔离任意 shell 或代码执行。
- P0/P1 必须验证两个主体、两个组织、撤权和跨账号场景；没有端到端鉴权时禁止团队远程入口。
- 云/私有化只替换提供方与部署组合，不维护第二套业务插件；不得宣称离线运行或私有部署自动保证数据不出网。

- 企业管理后台由 plugin-admin 提供独立管理入口，首期 P1-10 实现基础布局与管理行为；详见 ADMIN-DESIGN。后台不拥有第二套领域数据，组织 admin 不自动获得宿主插件安装权。

- 项目不是简单会话分组。涉及项目必须阅读 docs/PROJECT-DESIGN.md；P1-11 是 P1 发布前置。资料库内容由 library 唯一拥有，业务待办不等于 Harness 执行状态。

## 逐插件执行硬约束

每次开发必须先读 docs/PLUGIN-DELIVERY.md 与 docs/development-order.json，核对 currentStep、dependsOn 和退出证据。只推进当前步骤；必要前置修复记录原因，不自行跳步或同时展开后续业务插件。步骤完成须填写证据并同步 STATUS；文档和占位不算插件版本完成。顺序变更先更新计划、台账与 ADR，用户明确新指令优先。当前步骤以 docs/development-order.json 为准，已完成步骤的历史限制不重新阻止后续实现。

## 插件目录规则

功能插件位于 packages/plugins/<domain>，父目录仅分类，不创建统一 npm 包或版本。每个子插件仍独立版本化；目录路径与包名分开管理。workspace 与 docs/modules.json 必须同步登记新增模块。

提供方位于 packages/providers/<name>；providers 与 plugins 一样仅分类，子提供方独立包和版本，不在父目录创建 package.json。

## UI 开发硬约束

任何页面、图标或样式变更前必须阅读 docs/UI-DESIGN.md。所有插件共用该规范，不自行另起视觉风格。现有原型仅是参考，不覆盖规范；正式实现不得复制累积 CSS 覆盖。结束时按规范第 8 节记录视觉对照、交互验证与未完成项，原型通过不代表产品完成。

## 指令与技能质量

涉及内置技能、技能创建器、专家或专家团的技能指令及资源时，必须遵循 [Skill 开发规范](docs/SKILL-DEVELOPMENT-STANDARD.md)。指令以 `SKILL.md` 和按需引用的 Markdown 资源为可维护来源，TypeScript 负责注册和实际能力实现；允许由 Markdown 单向生成内容模块，禁止维护第二份提示词。写明场景、输入、步骤、实际工具、输出与验收，不写死当前专家或测试答案。不得依赖 preview/开发者路径或假定用户已安装 Python；必要资源随正式包交付。权限、保存和发布由 Host/运行时执行，最终交付真实产物。按改动影响执行实际任务、渲染和隔离安装验证，明确未验证范围；不强制所有技能添加脚本或复杂流程。

项目级审查参考 [指令与技能审查](docs/design/PROJECT-INSTRUCTION-AUDIT.md)。技能描述准确限定使用场景；多流程技能通过短入口按需引用资源。保留技术契约、授权和真实交付约束，避免重复角色口号与无条件固定步骤。任务完成标准随成果明确；验证只运行与变更和未解决风险有关的真实检查。不同模型分别评估，不将 Astra 行为建议当成所有模型的保证。
