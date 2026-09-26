# Harness 治理能力复用矩阵

状态：H06 文档审查完成；基于锁定文档镜像，发布包运行探针仍归 P0-04。

本矩阵规定 WorkDSH 如何使用 DeepSeek Harness 的 Settings、Credentials、Approval、Permission Presets、Sandbox 与 API Gateway。它们分别解决不同问题，不能互相替代，也不能合并成一个笼统的“权限系统”。

| 官方能力 | 可直接复用 | WorkDSH 必须补充 | 禁止误用 |
| --- | --- | --- | --- |
| Settings | 命名空间、schema/default/base/user 合并、修订冲突、脱敏描述、更新事件 | 插件偏好、部署参数和可编辑运行设置的页面；管理动作授权与审计 | 保存业务对象、组织策略真源或密钥；把 `applies` 当成实际热更新机制 |
| Credentials | CredentialRef 分层解析、CredentialKey 授权记录、按操作解析、轮换后下次操作生效、远端单向写入 | 连接实例与凭据引用绑定、外部主体指纹、使用范围、轮换/撤销审计 | 将明文写入 Settings、领域对象、Session、Remote 返回或模型上下文 |
| Approval | 对单次精确工具操作的询问、`ask/never` 会话策略、失败关闭、Session 事实 | 组织发布、共享、成员加入、资产修订等业务审批 Domain | 把运行审批当角色授权、资源 ACL 或业务审批；在 responder 缺失时默认放行 |
| Permission Presets | 将 sandbox mode 与 approval policy 组合成 UI 便捷选项；从实际旋钮投影当前值 | 面向任务的安全选项展示、组织允许范围校验 | 当作 RBAC、连接授权或执行隔离；把 `custom` 作为可设置目标 |
| Sandbox | 子进程文件系统约束、按 Session cwd 形成请求策略、`full/partial` 执行等级 | 网络外发策略、进程/容器隔离、租户文件边界、partial 拒绝或显著提示 | 宣称限制网络/进程可见性；在 confine 失败时静默无沙箱运行 |
| API Gateway | 生成的一元 Remote、严格 wire codec、lookup/scope 解析、取消、热卸载撤回 | ActorContext、组织/资源授权、领域并发与审计、流式状态协议 | 暴露未标记方法；用 Remote 模拟事件流/分页订阅；把 lookup 成功当授权成功 |

## Settings 与业务管理后台

Settings 只承载某个插件或部署组合允许用户编辑的运行偏好。schema default、组合 `base` 和用户 section 依次合并；`update` 修改用户覆盖，`replace` 会让缺失字段回落到 base/default。写入必须携带 descriptor 中的原始 section revision，冲突返回给界面，不静默覆盖。

每个外部 Settings 读取入口都使用 `describe({ redactSecrets: true })`。secret role 字段不会以普通配置值进入 descriptor；管理端只能显示 `{ path, set }` 这类槽位状态并发起单向写入。`applies: restart` 等元数据是 UI 提示，实际重启或重组仍由对应 owner 实现和验证。

OrganizationPolicy、AccessGrant、Membership、ConnectorInstance、ExpertRevision 等仍是 WorkDSH 领域对象。它们需要所有者、预期修订、授权和审计，不能装进用户配置文档。

## 凭据和连接实例

CredentialRef 适合按环境名解析部署密钥：进程环境、provider store 与 `.env` 按官方层级解析；进程环境来源不可由 UI 覆盖。CredentialKey 适合插件持有的第三方授权记录，通过唯一修改入口和锁更新。两种模式都只向调用者暴露已配置状态或引用，不返回密钥。

connectors 领域保存 ConnectionInstance、credential reference、target fingerprint、external principal 和 tool scope。每次外部操作重新解析凭据并校验连接/主体/权限，避免长期缓存导致轮换或撤权不生效。空字符串按未配置处理。授权过程同一 key 一次只能有一个活动尝试；所有终态均保留可审计的 settled 结果。

## 四层许可判断

一次工具执行至少经过四层独立判断：

1. WorkDSH access：发起主体是否能对业务对象执行该动作。
2. 连接授权：该主体能否使用指定 ConnectionInstance 与外部账号。
3. Harness approval：这一次具体工具调用是否需要人类确认。
4. runtime/sandbox：执行环境能否满足文件、进程和租户隔离要求。

Permission Preset 只组合第 3、4 层的部分旋钮。默认中即使存在 `danger-full-access + never` 组合，也不能越过前两层或组织禁止策略。自动化没有在线人类 responder 时，不能把 `unavailable` 改成允许；规则发布时应提前判定所需审批策略是否可执行。

## Sandbox 与团队隔离

官方 Sandbox 约束子进程对文件系统的影响，不限制网络，也不保证进程可见性隔离。`danger-full-access` 会完全绕过；`read-only/workspace-write` 可能得到 `partial`。需要强保证的企业任务必须拒绝 partial，或路由到已验证的 container/microVM/remote runtime provider。

因此 P0-05/P3 的隔离 provider 仍是必需项。项目 cwd、Workspace、Cordis scope 和 Sandbox 都不能单独充当租户边界。外发 Web/MCP/API 另走工具 guard、连接范围和组织网络策略。

## Remote 与流协议

WorkDSH Host 服务仅把明确标记的一元方法生成到 Client。参数与返回值使用 Client-safe JSON 类型，复杂 Host 对象通过受控 lookup/context provider 解析；每次调用仍在业务方法入口恢复 ActorContext 并执行授权。业务组件只依赖自己调用的 `remote.<namespace>`，Client 组合显式选择允许挂载的 Remote contribution。

H09 校正：一元是 WorkDSH 首期选择，不是 Typert 全部能力限制。镜像 `subsystems/typert.zh.md` 还描述 stream descriptor/Gateway，需核对 rc.1 发布产物再采用。流式传输不能替代领域 baseline/cursor、授权、重放与去重，详见 [收尾 C03](harness-review-closure.md)。

新增或修改 Remote 签名后必须按 Host 生成、Client 编译顺序构建，不能只重编前端。开发时的 SRC fallback 校验较弱，不能作为发布验收。会话 follow、领域增量、分页列表和长任务进度使用各自 baseline/cursor/subscription 协议，不伪装成 Remote 一元调用。

## 待验证项

- 锁定发布包是否完整暴露上述 Settings/Credentials/Approval/Sandbox 服务与 Remote contribution。
- Credential provider 在本地与团队部署的存储位置、权限和备份恢复行为。
- `partial` sandbox 的平台探针及企业组合失败策略。
- ActorContext 如何进入每个 WorkDSH Remote、Fetch、工具、Session follow 与资源流入口。
- 配置目录、Loader/Profile 修改和 Settings 更新之间的真实重组边界。

## 配置目录带来的制品分类

官方配置目录按部署轴区分四类制品：声明配置的可加载插件、无配置的可加载插件、只能由具体 provider 实现的 seam 包、只能被代码导入的库包。WorkDSH 插件管理页必须按发布 manifest 与 Loader 实际状态识别类别，不能把 npm 包存在、Client UI 无配置或 seam 类型声明误报为可直接启停的业务插件。

`Requires` 只列 Harness 包通过 `inject` 声明的服务，不能据此推断 vendored Cordis 依赖或组织授权。每个 WorkDSH Profile 仍要显式组合具体 provider、稳定 Loader entry id 和依赖诊断。

配置目录还确认以下部署约束：preset 的 user root 与 shell 访问同等信任；sandbox-policy 默认 `read-only`；storage-domain 按 Domain 路由 backend；Settings 和 Credentials 使用不同文件/provider；Connection 的 trustedHosts 与浏览器认证是 Host 信任围栏。某些第三方适配器虽然允许在 YAML 中填写 literal key/header/env，WorkDSH 正式 Profile 仍优先 credential reference 和最小环境，不让管理页面把秘密写入普通配置。
