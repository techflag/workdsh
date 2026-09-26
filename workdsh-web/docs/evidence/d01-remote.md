# D01 / P0-02 自有 Remote 与取消探针

> 2026-09-12 收口说明：发布版 Typert 的外部 workspace 生成限制保留为后期兼容项。本地产品已经在官方 Connection 认证 exact Fetch 扩展面完成所需链路，因此该限制不再阻塞本地 D01；企业受控 Remote 见 [企业版架构说明](../ENTERPRISE-EDITION.md)。


## 官方能力复用记录（2026-09-10）

- 任务：P0-02，验证自有 Host Remote 的生成、装配、调用与协作式取消；不启动 D02。
- 依据：`docs/dsh-v0.1.6-alpha.2/cookbook/adding-a-remote-api.zh.md`、`docs/dsh-v0.1.6-alpha.2/api-gateway.zh.md`，及锁定发布包的 README/公开声明。
- 复用：`@deepseek-ai/dsh-typert-generator@0.1.5-rc.1` 的 `WorkspaceTypertGenerator`；同版本 protocol 的 `TypertRemoteService`、`Remote`；官方 Loader、Registry、Gateway 与 Client Remote。生成器仅构建时运行。
- 已有证据：bundle 安装与官方 pluginInventory Remote 浏览器链路已通过；尚不证明自有 Remote 生成与取消。
- 自有差异：仅增加无业务数据的诊断端点、等待任务与结束状态；不实现新的传输、注册表或执行器。探针仅用于隔离的本地测试 Profile。
- 验收：生成产物可重复构建；严格输入校验；成功和失败；取消后 Host 清理；卸载清理。客户端取消结果与 Host 实际结束分别取证。
- 边界：不涉及组织数据或凭据，不证明团队鉴权、模型工具取消或完整 quiescence。缺口与运行结果在本页记录。

## 发布包复现结果

纯 npm 外部工程的最小用例放在 `examples/remote-probe/packages/probe`，不纳入产品 workspace，不安装到任何产品 Profile。运行 `corepack pnpm probe:remote:generate` 返回非零：

```text
TypertAnalysisError: typert(host): workdsh-remote-probe-fixture publishes Remote artifacts but has no Remote methods
```

公开 `WorkspaceAnalyzer.analyze()` 返回的模型包含 `workdshProbe` 服务、`state` / `wait` 方法及原始 decorator 文本，继承的 `TypertRemoteService` 是 npm external 引用，但方法没有 Remote 元数据。模型及错误分别保存到 `.artifacts/workdsh-typert-model.json` 和 `.artifacts/workdsh-typert-error.txt`。这是当前配置的可重复失败；尚未确认是生成器对外部包的限制还是仍缺少公开配置，不据此断言上游实现缺陷。

已排除的工程配置问题：类型出口从 `dist` 改为生成器可映射的 `lib/types`；`files` 显式列出各生成文件；Host aggregate 直接引用 package project；最小例采用 `packages/probe` 拓扑（放在 `tests/fixtures` 时未发现贡献包）。这些都只保留在隔离用例中，产品 bundle 的入口、版本和安装组合未变更。生成脚本在未发现 package 或 Remote 时必须失败，不降级到手写描述符或 SRC 运行时反射。

## Host 生命周期独立验证

`corepack pnpm test:remote:lifecycle` 使用真实 Cordis 与公开 TypertRemoteService，验证以下三项：

1. 正常等待完成、非法等待时长拒绝且计数不变。
2. carrier signal 取消后 active 回到 0，另一个并发调用仍可完成；已取消 signal 不启动工作。
3. 插件 dispose 取消未完成等待、释放服务；重新安装为干净实例。

这部分只证明自有协作式清理和官方服务生命周期的结合。网络 Gateway 校验、Client `RemoteResult`、网络取消与 Host 退出之间的关联仍未执行，不能用上述测试代替端到端 Remote 门槛。

## 下一步

### 2026-09-10：识别边界定位

本轮复用记录补充：仅调用 protocol 公开 `remoteMethods(service)` 和 `service.typertRemote` 验证 decorator 实际运行，不以运行时 marker 代替生成的严格 codec。读取已安装 npm 生成器的构建产物用于故障定位；没有修改、复制或执行其私有方法，没有使用上游 checkout。

rc.1 发布产物 `lib/index.js` 的 decorator 识别逻辑检查符号的所属声明：必须来自已登记为 `@deepseek-ai/dsh-typert-protocol` 的工程包，或位于该名称的 ambient module 中。包登记又仅扫描 aggregate 直接引用且真实路径位于 workspace `packages/` 下的工程。正常 npm protocol 的 `.d.ts` 位于 node_modules，是外部 ESM 声明，不满足这两个条件。公开 analyzer / generator 选项没有外部 protocol 身份映射项；公开 tsdown 入口调用相同生成体系，因此不能把更换打包器视为已知修复。

上述定位解释了最小例“类型检查通过、运行时 decorator 正常、生成器漏识别”的差异。当前选择：保留失败门槛与复现，禁止补造同名 protocol 包、伪造声明、修改 node_modules、复制生成器或直接手写描述符。只在公开接口解决或有独立升级兼容证据后继续自有 Remote 网络接入。既有官方 Remote 调用测试仍有效，自有 Remote 发布链未完成。

Remote 是 Client 调用 Host 领域服务的公开接口。当前测试验证 WorkDSH 的集成方式，不重测整个 Harness；后续页面和 Agent 工具调用同一领域服务，认证及资源授权仍需在服务端实现。Remote 取消可停止协作式本地工作，不能撤回已提交到外部系统的写入。

本次实际结果：runtime marker 与生命周期测试 4/4；生成命令继续报相同错误。marker 按公开可选 exportName 规则取 `exportName ?? method`，不要求 Cordis 代理与原服务对象引用相等。官方在线 [API Gateway](https://deepseek-harness.github.io/deepseek-harness/en/reference/api-gateway) 亦描述严格生成及 Host/Client 装配，但未提供本例所缺的外部符号识别配置。本轮不升级版本；先继续同一 D01 内独立的 C01 技能消费验证。

本轮回归：产品 build/typecheck、既有集成 4/4、新增生命周期 3/3、规划测试 2/2、冻结安装通过。版本检查确认 463 个 DSH 锁条目均 rc.1。新示例登记后 check:plan 通过（26 模块、34 必需文档）。生成探针保持失败；浏览器、真实模型、数据库和外部连接器未执行。

P0-02 保持 in_progress。先核对公开 generator/tsdown 的外部项目集成方式，解决最小例的 Remote 元数据缺失，再集成到 bundle 并跑认证、参数校验、取消及停服卸载/重装链。若确认当前发布包存在缺口，补兼容性决策后再选择公开扩展或单独版本升级；不改上游、不复制内部生成器、不跳到 D02。
