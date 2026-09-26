# D02 基础插件与工作台 0.1

日期：2026-09-12。状态：已完成。

## 已具备的前置基础

- P1-09 的本地单用户基线已完成：可信 local identity、个人组织、资源 owner/access、持久审计、Session owner/runtime binding 和官方工具 guard。
- D01 已验证官方 Host/Client、Storage Domain、Skill、Session、Conversation、Connection exact Fetch 与插件生命周期边界。
- 企业认证、多人 Remote、撤权取消、隔离 Worker、企业服务端和管理 Web 已移入[企业版架构说明](../ENTERPRISE-EDITION.md)，不进入 D02 本地验收。

## 当前工作

D02 只收口 P1-01 的工作台和共享 UI `0.1`：在 Harness 官方 Sidebar、Workspace、Session 与 Conversation 所有权下提供 WorkDSH 业务导航、真实状态和公共展示组件，并保持本地身份、授权与审计服务可由后续领域插件复用。

首个代码切片为 workbench `0.1.0-alpha.9` / bundle `0.1.0-alpha.36`：公开 `src/index.ts` 只导出 Harness 装配函数，Slot 注册移到 `src/harness/client.ts`，页面结构使用独立 `BusinessPanel.tsx`，样式使用独立模块。该重构不创建 React root，也不改变官方 Sidebar/Conversation 的所有权。Node 22.23.2 下 workbench/bundle build 与 typecheck、32/32 集成测试和完整打包浏览器探针通过；浏览器覆盖官方 Sidebar 所有权、业务面板、会话往返、重连、停服移除和重装。

bundle `0.1.0-alpha.37` 继续拆分默认 Client：公开入口只导出 Harness 装配，品牌、URL 状态和诊断页面使用独立 TSX，诊断样式独立维护。D01 接入验证只有显式 `diagnostics=1` 才注册；普通产品路径即使传入 `workdsh-view=diagnostics` 也归一化到原生 Conversation。

最终代码切片为 UI `0.1.0-alpha.4` / bundle `0.1.0-alpha.38`：`packages/ui/src/index.ts` 只保留兼容导出，Icon、导航、Modal、设计令牌及两类样式分别维护。共享组件不访问 Cordis、Remote、Host 或领域数据。完整构建、类型检查、32/32 集成、计划检查、版本锁定与正式打包 Chromium 探针通过。

## 退出条件

- 工作台不复制 Harness 的 Sidebar、Composer、Session 或 Workspace 行为。
- 页面入口、空状态、加载、失败、重试和卸载清理有真实行为及验证。
- 公共 UI 组件只负责展示与交互，不直接访问领域存储或 Host 服务。
- build、typecheck、相关集成与真实打包浏览器验收通过后，D02 才能完成。

以上退出条件均已满足。D02 不包含专家、连接器、行业应用或企业后台功能。
