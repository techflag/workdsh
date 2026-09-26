# 0.1.0-alpha.9 — 2026-09-18

- 新增 `ProjectTaskContext` 与只读 `ProjectService.taskContext(actor, sessionId)`：按 Session 反查所属项目任务及其固定的项目与配置修订；兼容补全（同时用于项目路径 chip、present 交付归属与项目任务上下文注入），既有方法签名不变。
- 新增 `ProjectService.noteDeliveryGap(actor, projectId, text)`：把交付归属环节的资料库侧跳过（不支持格式、名称冲突重试触顶等）记为项目活动记录，避免只落在内存 warn 中不可见。

# 0.1.0-alpha.8 — 2026-09-15

- 扩展原生 PPTX 模板工作副本契约，支持保留模板包、稳定页面标识和受控文本更新。

# 0.1.0-alpha.5

## 0.1.0-alpha.6 — 2026-09-12

- 单个专家 alpha.1 配套：独立 Host 组合、共享 Skill 修订与受控任务入口。
- Companion for Experts alpha.1: standalone Host composition, shared Skill revisions and governed task entry points.


- 新增领域子路径 ./skills，定义本地 SkillManagementService v1、管理 DTO 和依赖影响检查契约。
- 类型源与技能运行实现分离，不引入 Cordis、UI 或数据库依赖；不将本地服务宣称为企业鉴权或不可变修订 API。

# 0.1.0-alpha.4

- 增加持久 `SessionOwnerBinding`、运行期 `RuntimeBindingRequest` 与 `RuntimeBindingService`，让 Session 恢复和工具执行使用同一 Host 授权边界。
- `AuditService.flush()` 明确持久排空契约，供 Session flush 和插件卸载等待最终审计。

# 0.1.0-alpha.3

- `IdentityService` 增加统一成员资格查询，Access 不读取具体身份 Provider 的内部存储。

# 0.1.0-alpha.2

- 增加 `IdentityProfile` 与 `IdentityService`，让 Host 身份提供方同时暴露可信主体、组织和成员快照。

# 0.1.0-alpha.1

- 定义服务端解析的 ActorContext、组织、成员、资源归属、授权、运行绑定和审计契约。
- 提供受信边界运行时校验与稳定治理错误，不接受浏览器或模型自报身份。
- 定义 identity、access 与 audit 提供方接口，不绑定数据库、认证协议或 Harness 私有实现。
