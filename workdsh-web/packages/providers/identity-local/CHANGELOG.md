## 0.1.0-alpha.7 — 2026-09-25

- 将本地身份提供方按官方 DSH 0.1.7-rc.2 的公开接口重新打包。

## 0.1.0-alpha.6 — Unreleased（2026-09-22）

- 适配 DeepSeek Harness 0.1.7-alpha.1、Cordis 4.0.3，更新精确依赖。

## 0.1.0-alpha.5 — 2026-09-15

- 将本地身份存储依赖升级至 DeepSeek Harness 0.1.6-alpha.1。
- 作为本批官方 Team 专家组合的配套身份包重新发布，避免复用旧制品版本。

# 0.1.0-alpha.3

## 0.1.0-alpha.4 — 2026-09-12

- 单个专家 alpha.1 配套：独立 Host 组合、共享 Skill 修订与受控任务入口。
- Companion for Experts alpha.1: standalone Host composition, shared Skill revisions and governed task entry points.


- 实现统一 `IdentityService.membership()` 查询，供 Access 服务检查本地成员资格。

# 0.1.0-alpha.2

- 注册 `ctx.workdshIdentity` Cordis Host 服务，并由 `Service.init` 管理启动顺序。
- 通过官方 `ctx.storageDomain` 原子保存本地主体、个人组织和 owner 成员关系。
- 冷启动保持身份稳定；Host 配置与持久身份冲突时明确拒绝启动。

# 0.1.0-alpha.1

- 增加可信本地 Profile 身份提供方，主体和个人组织由 Host 配置固定。
- 每次解析生成新的 requestId，并只接收可选的 Host session/run 关联。
- 忽略输入对象中的伪造 principalId、organizationId、requestId 和 resolvedBy 字段。
