# D01 / P0-04 Access 与 Audit 验证

日期：2026-09-12。状态：本地 Host 基础服务及官方工具流水线通过；企业全路径接入后期另行验收。

## 官方复用

`workdsh-plugin-access` 与 `workdsh-plugin-audit` 均采用 Cordis class service 和生命周期注入，通过 Harness 官方 `@deepseek-ai/dsh-storage-domain` 建立各自 Domain。插件不直接选择或访问 Storage backend，不复制 Harness User、Permission Preset、Approval、Sandbox、Session 或 Credentials。Access 只调用 `IdentityService.membership()`，不会读取身份提供方内部存储。

## 当前语义

- 所有授权请求校验 Host 解析的 ActorContext、ResourceOwner 和 ResourceRef。
- 跨组织请求失败关闭；缺失或停用 membership 失败关闭。
- 资源 owner 拥有资源管理权；管理员角色本身不自动获得他人私有资源读取权。
- 其他成员必须取得同组织、同资源、同 action 的显式 AccessGrant。
- grant 新增、更新和撤销使用 expectedRevision 防止静默覆盖；撤销后下一次授权立即拒绝。
- 授权 decision 的 authorizationRevision 由成员修订与相关 grant 修订共同计算。
- allow 和 deny 均在返回前持久追加 AuditEvent；审计拒绝 secret、token、password、credential 和 prompt 等敏感引用键。
- Access 与 Audit 属于不同 Storage Domain，当前后端不提供跨 Domain 事务。grant/revoke 先记录 outcome=unknown 的操作意图，写入授权事实后再记录 succeeded，避免把部分成功伪装成原子成功。
- Session owner 使用独立 `workdsh_runtime_binding` Domain 持久化，已绑定 owner 不能被另一主体替换；当前 RuntimeBinding 在每次执行时根据最新 membership 与 grant 重新生成。
- 工具执行按官方扩展点接入：`tools/pre-execute` 完成异步身份解析和授权，`tools/result` 观察不可变最终结果，`session/flush` 与 Cordis disposer 等待排队审计落盘。
- `workdshSessionAccess` 在调用官方 `sessionController.create()` 前生成稳定 Session id 并持久绑定 owner；显式 id 首次绑定前通过官方 `inspect()` 拒绝已有但无 owner 的 Session，创建失败则保留同一 owner 的可重试预留。恢复 Agent 前先按当前 membership/grant 调用 `resolveRuntime()`，拒绝时不触达官方 Controller。

## 验证

- 真实 Cordis Context、Storage、JSON backend、StorageDomain、IdentityService、AuditJournal 和 AccessManager 共同启动。
- 两个组织、四个主体覆盖 owner、admin、member 和另一组织 owner。
- 已验证 owner 管理允许、admin 私有读取拒绝、跨组织拒绝、显式 read grant 生效、未授予 edit 拒绝、revision 冲突、撤权后拒绝。
- 审计覆盖授权允许/拒绝、grant/revoke 意图及成功结果；重复事件 ID 和敏感引用被拒绝。
- 冷启动新 Host 后，grant 与审计均从官方 Storage Domain 恢复，成员授权结果保持一致。
- 个人 Profile 的首次官方 Agent 工具调用可以自动绑定 Session；未授权成员的工具正文不会运行，显式取得 Session use grant 后可以运行。
- 工具成功、工具抛错和策略拒绝分别形成 succeeded、failed 和 denied 审计；最终结果审计携带本次 authorizationRevision。
- 关闭个人自动绑定时，未在受信入口登记 owner 的 Session 失败关闭；显式绑定经冷重启保持，替换 owner 被拒绝。
- 已验证未登记 owner 的历史 Session 采用失败、owner 记录先于官方 Session 创建、创建失败后的同 owner 重试、异主体接管拒绝、未授权恢复不激活 Agent，以及 grant 后恢复成功。

## 验收边界与后期项

该证据覆盖本地 Host 服务、受控 Session 创建/恢复入口及官方工具流水线，满足本地单用户 D01 基线。受控企业 Session Remote、企业组合中的裸入口收敛、文件/资产与其他 Remote 的多人授权、订阅和成员撤权后的在途取消尚未覆盖，连同服务器认证、管理 Web、组织目录和审计查询 UI 统一进入[企业版架构说明](../ENTERPRISE-EDITION.md)。这些后期项不阻塞本地 D01，也不能据此宣称企业版已经完成。
