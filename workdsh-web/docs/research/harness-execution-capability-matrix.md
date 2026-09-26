# Harness 执行能力复用矩阵

状态：H05 审查结论，D01；实现与发布包探针仍待 P0-04。
基线：DeepSeek Harness `0.1.5-rc.1` 官方文档与已发布包。

## 总体映射

| WorkDSH 能力 | Harness 直接复用 | WorkDSH 插件拥有 | 不能混同 |
| --- | --- | --- | --- |
| 专家执行 | Agent preset、Session、Skill/Tool scope、system prompt | Expert、ExpertRevision、组合解析与授权 | 专家不是 preset 目录或常驻 Agent |
| 技能执行 | `ctx.skills`、filesystem/runtime provider、`dsh-tool-skill`、Session Skill Catalog | Skill、SkillRevision、草稿、发布、授权与不可变内容定位 | Skill 文档不是可执行插件，也不拥有业务权限 |
| 连接器执行 | `ctx.tools`、MCP client、Web seam、专用 provider/consumer | ConnectorDefinition、ConnectionInstance、凭据引用、账号绑定、健康与审计 | MCP server 或 Tool schema 不是完整连接实例 |
| 项目任务 | Session Controller、Conversation、Attachment、Workspace、Query | Project、WorkItem、TaskLink、能力/资产关联 | Workspace、Session todo 不等于 Project/WorkItem |
| 自动化 | Schedule、Webhook、Job、Workflow、Session 创建 | AutomationRule、Delivery、Occurrence、Run、时区、幂等与恢复 | Session reminder、进程 Job、动态 Workflow 不等于自动化规则 |
| 行业应用 | bundle/Profile/preset、Skills、Tools | Application、ScenarioRevision、推荐组合与租户可见性 | Profile 不等于可发布行业场景 |

## 能力采用规则

### Skill

- 官方分层注册表是唯一运行目录。全局层与 Agent scope 链合并，最近 scope 的同名条目直接覆盖；rank 只解决同一层内冲突。
- 目录发现可以返回 `complete: false`。客户端和任务入口保留上一份完整目录并重试，不把暂时遗漏解释成技能被删除。
- 正文不缓存，每次 `get()` 都从胜出提供方重新读取；只修改正文不会产生目录变更消息。WorkDSH 已发布修订必须使用不可变 locator/目录或内容寻址 provider，历史 Session 不解析到可变 latest。
- `modelInvocable` 与 `userInvocable` 只控制官方调用面；两者都为 false 的技能仍可被受信代码读取。组织授权继续由 WorkDSH provider/解析服务强制执行。
- 模型只先看到名称和描述，正文由 `skill` 工具按需加载；这正是专家携带多个技能的默认方式，不把所有技能正文拼进专家提示词。
- 项目目录发现只支持根目录直属包或扁平 Markdown，不支持递归 `**/SKILL.md`。WorkDSH 的领域目录可有任意层级，但发布到官方 provider 时必须投影成可发现形态。

### Tool 与 Command

- Tool 使用规范 JSON 输入/输出和公开执行流水线；业务写入工具默认 exclusive，只有明确无父状态写入且共享状态支持并发时才返回 `isConcurrencySafe: true`。
- 工具的规范 `value` 是执行期值，持久结果依赖渲染 content/meta；关键外部回执同时提交到拥有它的 WorkDSH Domain，不能只依赖工具文字。
- scope restriction 过滤继承的全局工具，但不会过滤该 scope 自己注册的工具。所有项目、组织、连接和资产权限仍放入服务端检查与单调 guard。
- timeout 是协作式取消，无法硬杀同进程代码。连接器必须传递 AbortSignal，并在超时或断连后核对远端状态。
- Command 直接面向人类，不进入模型；适合 `/expert`、`/skill` 等确定性入口。领域变更成功后以 `sourceEventSeq` 或业务引用连接权威结果。

### MCP 与连接器

- 官方 MCP client 负责 stdio/Streamable HTTP 生命周期、工具发现、`mcp__<server>__<tool>` 注册及有限重连；WorkDSH 不复制 MCP 协议客户端。
- DSH 不负责安装第三方 server、初始化其数据库、账号、模型、embedding、数据迁移或许可。连接器插件必须展示这些前置条件和真实健康状态。
- stdio 启动会移除常见凭据名和 `DSH_*`，但仍继承其他环境变量。正式连接实例使用显式最小 env 与凭据引用，不继承整份宿主环境。
- HTTP server 必须独立运行。URL、headers、认证和账号身份属于 ConnectionInstance/凭据流程；模型只能看到工具能力和非敏感执行身份摘要。
- 初次发现异步，断线后工具可能暂时仍列出；重连预算耗尽才注销。任务提交要区分“已配置、发现中、可调用、暂时离线、已注销”，不能把目录存在当健康。
- MCP 是连接器的一种 provider 适配；原生 Web seam、专用 API provider、文件或数据库代理也可以实现连接器，不强制转换为 MCP。

### Schedule、Webhook、Job 与 Workflow

- Schedule 是 Session 内持久提醒，只在原 Session live 且 Agent idle 时排入普通 follow-up。它没有 Cron/日历规则、外部通知或 cold scheduler；固定周期至少五分钟，错过区间合并，窄崩溃窗口可能重复交付。
- Webhook runtime 接收已认证交付并可创建普通根 Session，但没有队列、重试、去重、运行状态、完成监听或崩溃重放。
- Job 是进程内活跃运行注册表，owner 以 Session 授权，流式输出只有一个消费游标；它适合控制后台 bash/subagent，不是团队可查询的持久运行历史。
- Workflow 是模型编写的前台 JavaScript subagent 编排。它适合一次任务的动态分解，不是长期保存、审批和定时执行的业务工作流定义。
- automations 插件先持久化 Rule/Delivery/Occurrence/Run，再调用这些官方能力。HTTP 202、Webhook dispatch、Schedule dispatch 或 Job terminal 都只是某一阶段事实，不能单独把 AutomationRun 标记成功。

### Web Search/Fetch

- 直接复用 `ctx.web` 的 search/fetch provider seam 和唯一工具 consumer；提供方必须显式选择，多个可用提供方时不按注册顺序猜测。
- Fetch 的非 2xx 响应仍是描述性结果；业务代码必须检查 statusCode。SSRF 防护只阻止非公开目的地址，不能阻止模型向公开 URL 发送数据。
- 文件 sandbox 和默认审批模式不约束 Web fetch。涉及项目敏感内容时，WorkDSH Profile 通过工具 guard/审批/组织策略限制外发，并保留审计。

## P0-04 必做探针

1. 以不可变 SkillRevision provider 验证同名多修订、冷 Session 目录、正文加载、目录不完整和撤权。
2. 验证 scope restriction 与 scope-local 工具的差异，确认 WorkDSH 单调 guard 覆盖 native、PTC 和 MCP 子调用。
3. 用测试 MCP stdio/HTTP server 验证异步发现、账号绑定、断线、重连耗尽、注销、凭据环境和回执。
4. 验证 Schedule cold/live、持久 barrier、逾期合并和重复窗口；证明它只用于个人会话提醒。
5. 以持久 AutomationRun 包裹测试 Webhook，验证重复 delivery、进程崩溃、Session 创建失败和恢复对账。
6. 验证 Job 单游标与多 Client baseline 分离，取消后底层资源真正停稳。
7. 验证 Web provider 歧义、非 2xx、私网阻断、公开地址数据外发策略和审计。

通过这些探针只证明公开能力可作为底座；专家、技能、连接器、项目和自动化插件仍需完成各自领域对象、Remote、页面与团队授权验收。
