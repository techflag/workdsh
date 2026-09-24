## 0.1.0-alpha.7 — 2026-09-25

- 将访问控制插件按官方 DSH 0.1.7-rc.2 的公开接口重新打包。

## 0.1.0-alpha.6 — Unreleased（2026-09-22）

- 适配 DeepSeek Harness 0.1.7-alpha.1、Cordis 4.0.3，更新精确依赖。

## 0.1.0-alpha.5 — 2026-09-15

- 将 Session、Storage Domain 与工具授权边界适配到 DeepSeek Harness 0.1.6-alpha.1。
- 配套官方 Team 专家执行链路，保留既有主体、资源授权与审计边界。

# 0.1.0-alpha.3

## 0.1.0-alpha.4 — 2026-09-12

- 单个专家 alpha.1 配套：独立 Host 组合、共享 Skill 修订与受控任务入口。
- Companion for Experts alpha.1: standalone Host composition, shared Skill revisions and governed task entry points.


- 增加 `workdshSessionAccess` 受控 Host 入口，在调用官方 Session Controller 创建前持久绑定稳定 owner。
- Session 恢复在激活官方 Agent 前重新检查当前成员关系和 grant，拒绝请求不会触达 Controller。
- 创建失败保留不可替换的 owner 预留，允许同一主体安全重试并阻止其他主体接管 Session id。
- 显式 Session id 在首次绑定前使用官方冷读 `inspect()` 排除已存在但无 owner 的会话，阻止历史会话被补绑接管。

# 0.1.0-alpha.2

- 增加独立 Storage Domain 保存不可替换的 Session owner binding，冷重启后仍可解析当前 RuntimeBinding。
- 增加官方工具流水线桥接：`tools/pre-execute` 执行 Host 身份解析与授权，`tools/result` 观察最终结果，`session/flush` 排空审计。
- 个人 Profile 可在首次 Agent 工具调用时安全自动绑定；企业式组合可关闭自动绑定并要求创建入口显式登记。

# 0.1.0-alpha.1

- 增加持久化 `AccessService` Cordis Host 服务和操作级授权判定。
- 跨组织默认拒绝；资源 owner、成员资格和显式 grant 分别检查。
- 增加带预期修订的授权与撤权管理，并将判定和修改写入审计服务。
