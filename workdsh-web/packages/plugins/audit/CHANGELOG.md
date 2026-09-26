## 0.1.0-alpha.6 — 2026-09-25

- 将审计插件按官方 DSH 0.1.7-rc.2 的公开接口重新打包。

## 0.1.0-alpha.5 — Unreleased（2026-09-22）

- 适配 DeepSeek Harness 0.1.7-alpha.1、Cordis 4.0.3，更新精确依赖。

## 0.1.0-alpha.4 — 2026-09-15

- 将审计存储依赖升级至 DeepSeek Harness 0.1.6-alpha.1。
- 记录官方 Team 专家执行链路，不再依赖 WorkDSH 自建团队运行表。

# 0.1.0-alpha.2

## 0.1.0-alpha.3 — 2026-09-12

- 单个专家 alpha.1 配套：独立 Host 组合、共享 Skill 修订与受控任务入口。
- Companion for Experts alpha.1: standalone Host composition, shared Skill revisions and governed task entry points.


- 增加 `flush()`，并在 Cordis 卸载关闭 Storage Domain 前等待已接受追加全部结算。

# 0.1.0-alpha.1

- 增加持久化 `AuditService` Cordis Host 服务。
- 使用官方 Storage Domain 的 per-record 表保存不可变审计事件。
- 拒绝重复事件 ID、敏感引用键和超限引用值。
