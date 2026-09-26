# 团队与企业版：首期架构设计

状态：设计约束已采纳；实现尚未开始。用户于 2026-09-10 明确要求初期即考虑团队版本。

## 1. 产品依据和证据边界

[企业版概述](https://www.workbuddy.cn/docs/enterprise/Overview) 提到统一身份、权限、企业模型、知识管理与专属插件，但正文包含 CodeBuddy 研发场景。这里只提取企业治理需求，不将该页当作 WorkBuddy 桌面全部实现证明，不复刻价格或微调服务。

[企业连接器](https://www.workbuddy.cn/docs/enterprise/adminguide/Connector%E7%AE%A1%E7%90%86) 提供组织级配置和工具范围；[资料库协作](https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Library/Collaboration) 描述空间权限与 Agent 沿用用户权限；[企业智能体](https://www.workbuddy.cn/docs/enterprise/adminguide/CloudAgent) 描述共享 Agent 与个人独立 Session。

WorkDSH 的决定：首期即有组织与权限模型；本地模式是该模型的一种部署。团队管理 UI、SSO、云存储和隔离 worker 可以后续交付，基础契约和双主体测试不能延后。

## 2. 主体、组织与资源

- Principal：真实用户或明确的服务主体。Agent 不是自动拥有全权的新用户，始终携带发起主体和委派关系。
- Organization：组织边界；本地默认创建 personal organization，仍使用同一类型。
- Membership：主体在组织内的成员资格与角色。首期角色 owner/admin/member；角色不隐含读取所有私有内容。
- ResourceOwner：对象所属组织、所有者、作用域及可选 projectId。
- AccessGrant：对对象或项目的 read/use/edit/manage 授权；private 默认仅所有者访问，组织共享必须显式发布或授权。
- RuntimeBinding：会话对应组织、发起主体、执行实例、工作区与能力修订；不允许仅凭客户端传入 Session ID 取得运行控制。
- AuditEvent：发起者、组织、操作、目标、结果、requestId、必要的任务与连接引用，禁止明文凭据和默认完整提示词。

对象包括专家、技能、应用、连接定义/实例、项目、资产和自动化。全都具有归属，不能先建无 owner 数据再补字段。

## 3. 授权矩阵

| 操作 | owner/admin | member | 额外限制 |
| --- | --- | --- | --- |
| 组织成员与策略管理 | 允许；最后 owner 不可移除 | 拒绝 | 管理行为审计 |
| 个人对象创建 | 允许 | 允许 | 仅创建到自身拥有范围 |
| 组织对象发布/连接分配 | 默认允许 | 需管理授权 | 连接密钥不可通过使用权限读取 |
| 使用共享专家/技能 | 按资源可用范围 | 按资源可用范围 | 不继承其他人的 Session |
| 读取个人对话/资产 | 不默认允许 | 仅自身或显式共享 | admin 与内容权限分开 |
| 项目编辑 | 按项目权限 | 按项目权限 | 项目 read/edit/manage |
| 外部系统写入 | 按调用授权与外部账号权限 | 同左 | 组织角色不能覆盖第三方限制 |
| 对外发布页面 | 组织策略允许且具备发布权限 | 同左 | 引用数据另行检查 |

跨组织访问默认拒绝。P3 如支持外部协作，必须通过显式 guest membership 或分享授权，不把已知链接当作访问凭证。

## 4. 所有入口统一检查

认证建立 ActorContext → 确认成员资格 → 判断操作与资源 → 解析能力/连接 → 执行前重查 → 记录结果。

页面 Remote、Agent 管理工具、资产下载/预览、会话跟随流、连接器工具、后台任务和子 Agent 必须走同样边界。Client 参数是待验证目标，不是可信身份。

撤权后拒绝后续操作，停止对应订阅并请求取消仍在本地控制内的工作。已经提交的远端写入可能无法撤销，保存回执并说明，不宣称原子回滚。

Session fork、恢复、继续运行和子 Agent 创建都重新解析 RuntimeBinding 与当前授权；cwd、lineage、preset 或父 Session 权限不能代替检查。原生实验性 `team/*` 仅描述 lead Session 内协作，不创建 Organization/Membership。原生 `approval/*` 仅保留运行工具审批，企业发布、成员加入和资源共享审批由业务 Domain 独立记录。

专家团的业务成员是角色与 ExpertRevision，不等于组织 Membership；一次运行中的原生 team member 则是子 SessionId。lead 创建成员前，为该成员单独计算组织主体、委派来源、允许模型、技能、工具、资产与连接。原生 mailbox 虽可持久重放，也只用于相邻 Agent 协作，不可成为跨项目通知或企业消息系统；原生 `writeScopes` 是协作提示，不能替代资产修订、数据库锁或外部写入幂等。

子代理消息进入 inbox 后，其执行不再由发送方取消信号拥有；撤权流程必须同时禁止后续操作、请求 interrupt、撤销连接句柄，并持续核对到实际停稳或标记状态未知。provider 卸载只阻止新启动，不能被当作已撤销全部在途工作。一次性子代理的非 completed 输出只能以部分结果保存，不能驱动业务任务自动完成。

复用父 Agent 的 standing preset generation 只允许在角色要求一致且 WorkDSH 已重新授权后显式 `composeFrom`；它不传播组织身份、项目范围或连接账号。Initiator 只用于同进程因果归属，不是可信主体。外部协议、浏览器 Remote、队列和 worker 都必须从受信边界恢复 ActorContext。

P0 必须验证官方原生 Remote/Session/文件能力在团队模式的所有访问路径；若公开扩展不能完整保护某入口，不对团队用户暴露该入口。

H09 补充：原生 feedback 不保存认证 actor，动态插件 inspect/inventory 可能涉及进程级信息，均纳入上述入口审查。子代理不能冒充 live root 发起用户问题，由主任务汇总提问；未回答不构成批准。Spill owner/source 不构成 ACL，删除反馈也不删除历史日志。Code runtime 隔离标签、环境凭据清理和进程退出均不单独证明团队隔离，显式 env 注入及在途 Host 操作仍需校验和结算。

## 5. 执行隔离与凭据

Cordis scope 是能力组织，不是多租户安全沙箱。允许 shell/代码执行的用户不能在一个不隔离 OS 身份下共享全部文件与环境。

本地模式只服务可信本机用户，不把它作为多用户服务器开放。团队模式由 runtime provider 提供按授权主体/任务划分的进程或容器环境、工作区和凭据注入；实现并通过验证后才开放远程执行。

共享专家定义不携带连接密钥。连接可以是成员个人连接或管理员分配的组织连接；组织共享账号由网关/服务代理使用，成员只获工具权限。审计同时记录成员主体和外部账号引用。

不把企业共享凭据放入能执行任意代码且被多个用户共用的全局环境。提供方无法守住该边界时，只允许隔离的个人连接。

## 6. 首期与后续部署

P0/P1：本地身份提供方、授权服务、审计服务、归属模型、隔离契约、两组织两主体集成用例。个人体验可不展示组织切换，但后端没有绕过授权的“个人版快捷路径”。

P3：企业后台、OIDC/SSO 提供方、团队资产提供方、隔离 runtime 提供方、组织模型策略、审计查询、用量看板、私有部署指南。

模型策略在官方模型路由之前判断成员可用范围；用量消费实际执行事实，不重建模型客户端。离线部署需模型与所有连接都在允许网络内，不能承诺只部署服务端就自动不出网。

本地到团队迁移：显式选择对象、重新映射组织/所有者、检查引用闭包、重新绑定连接、记录导入结果。个人 Session 不自动共享；Session 迁移仅在官方受支持机制验证后提供。

## 7. 数据和可运营性

本地 SQLite 提供方从首期使用组织归属、主体与预期修订；未来服务端实现保持领域契约，但具体数据库/对象存储在 P3 ADR 选定。禁止将不同组织数据缓存只按 resourceId 或显示名索引。

组织审计与用量存储独立于模型提示词。建立 schemaVersion 和迁移记录，显式备份与恢复流程。官方 Session Telemetry 是可能丢失或重复的外发观测副本，且默认不自带脱敏规则，不能作为企业审计真源；启用时必须配置 sharing、脱敏 waterfall、接收端去重和关闭排空。首期不许硬编码“全部用户都是管理员”。

官方 Session Query 的过滤词汇不包含租户和项目授权。任何会话列表、全文检索、标题、snippet、事件窗口或谱系接口都先通过 RuntimeBinding/ProjectTaskLink 限定可访问 Session 集合，并在返回时重验；团队部署不得向普通成员暴露全局逻辑语料库。

官方 Session Controller 声明可见/授权搜索语义，但在 H06 用锁定发布包验证策略覆盖前不作为唯一安全边界。直接 Session Query、follow 和资源预览继续经过 WorkDSH 服务端主体与绑定校验。

团队版准入条件是 ACCEPTANCE 中 T01—T12 对应阶段用例的证据和完整访问链审查，不是出现登录页。

企业后台功能划分、首期入口与权限边界详见 [ADMIN-DESIGN](ADMIN-DESIGN.md)。

## 项目团队边界补充

P1-11 即实现项目角色/资产引用/会话访问分离和双主体测试，实际邀请审批与多人协作入口归 P3-01。协作执行仅允许授权的公共连接；项目个人连接不向其他成员委派。自动化关联项目仍为个人所有。详见 [项目设计](PROJECT-DESIGN.md)。企业后台基础入口已前移至 P1-10，前文 P3 指完整企业部署与扩展功能。

设计审查后的边界以 [ADR-0007](adr/0007-execution-and-transfer-boundaries.md) 为准。首期跨主体测试与真实多人部署明确分开；P1 要验证远程入口默认关闭，P3 再验证实际进程隔离，分别使用独立用例。

## 8. 原生运行许可与企业权限的关系

企业访问链固定为：WorkDSH access → 连接实例授权 → Harness 单次 Approval → runtime/sandbox 准入。Permission Preset 只是后两项中审批策略与文件 sandbox 模式的 UI 组合，不是成员角色或对象授权。Session 配置为 `never`、用户选择全权限或工具审批一次通过，都不能越过组织策略和连接范围。

Sandbox 只约束子进程文件系统影响，不覆盖网络和进程可见性；`partial` 不满足多租户强隔离。P0-05 验证所有入口的主体绑定和失败关闭，P3 runtime provider 再证明物理隔离与网络边界。完整复用矩阵见 [Harness 治理能力复用矩阵](research/harness-governance-capability-matrix.md)。
