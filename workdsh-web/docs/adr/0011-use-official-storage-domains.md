# ADR-0011：业务对象优先使用官方 Storage Domain

状态：Accepted
日期：2026-09-10

## 背景

原计划要求 identity、access、experts、projects 等插件分别直接管理 SQLite 文件。这保证了领域所有权，却会重复实现连接生命周期、格式校验、写入排序、持久通知和后端切换。

DeepSeek Harness 官方 `dsh-storage` 提供存储 hub，`dsh-storage-json` 与 `dsh-storage-sqlite` 提供后端，`dsh-storage-domain` 提供其他产品插件唯一应使用的类型化数据形式。DomainSpec 定义领域名、格式版本、布局和 Zod schema；领域写入在逐领域队列上完成底层持久化后才更新内存并发出 `domain/changed`。Session 事件日志另由 `sessionPersistence` 管理，不属于 Storage Domain。

## 决策

1. WorkDSH 业务对象优先使用官方 `ctx.storageDomain`，不建立通用数据库抽象，也不让领域插件直接打开 SQLite。
2. 每个领域插件声明唯一的 `workdsh-*` DomainSpec，只由该插件打开并持有类型化 Domain 句柄。跨领域读取和写入经过 Cordis 服务契约，禁止取得其他领域句柄或直接查询底层介质。
3. Profile 配置 Storage 后端和按领域路由。本地首期默认使用官方 SQLite provider；测试和可读导出场景可使用官方 JSON provider。一个后端可承载多个 unit，因此不要求每个领域一个物理数据库文件。
4. 领域插件在自己的 effect 中打开 Domain，并在 disposer 中等待 `Domain.close()`。写入只通过 `put`、`update`、`delete` 和 global handle；读取到的记录不得就地修改。
5. 权威数据默认以无效记录即拒绝的方式打开。只有可丢弃的派生缓存可显式选择 `backup-and-skip`，且需要重建测试与告警。
6. DomainSpec 的 `version`、`compatibleVersions` 和 schemaVersion 是业务格式契约。破坏性变更必须先设计可恢复迁移和回退证据；不能仅提升 npm 包版本或把旧记录静默跳过。
7. `domain/changed` 是提交后的进程内通知，不是事务参与者，也不是跨进程同步。团队部署若采用多 Host，必须在 P3 选择并验证支持共享介质、写入协调和跨进程变更传播的 provider/服务拓扑。
8. 大型资料正文与二进制资产仍由 library 管理的文件/对象存储持有，Storage Domain 保存元数据、内容标识、修订和索引引用。凭据只保存专用凭据引用。
9. 对话、工具、审批及原生运行事实继续由官方 Session append-only 日志和 `sessionPersistence` 管理；WorkDSH Domain 只保存业务对象及其 Session 关联，不复制事件日志。

## 影响

- 领域所有权从“每插件一个原始 SQLite 连接”变为“每插件一个类型化官方 Domain”；底层介质可由部署 Profile 统一选择和路由。
- D02 的数据库工作主要是 DomainSpec、schema、领域服务、授权和迁移设计，不再先开发连接池与通用 repository 框架。
- 本地单进程可以直接使用官方提交后事件；团队多进程不能沿用该通知假设，P3 仍需独立 ADR。
- 若后续探针证明锁定版本的公开 Storage API 无法满足某一领域，先记录具体缺口与最小替代方案，再允许该领域例外；例外不得扩展成第二套通用存储层。

## 依据与待验证

依据为官方 `subsystems/storage.zh.md`、`subsystems/persistence.zh.md` 与 H04 审查记录。D01/P0-04 还需用发布包验证 SQLite/JSON 路由、重启恢复、无效记录、版本不匹配、并发更新、关闭停稳和变更事件顺序。
