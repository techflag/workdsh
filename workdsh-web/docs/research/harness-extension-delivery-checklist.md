# Harness 扩展交付规则与适用边界

状态：H08 Cookbook 审查结论，2026-09-10。适用基线：DeepSeek Harness `0.1.5-rc.1` 发布包与公开文档。

本文把官方 Cookbook 中可用于 WorkDSH 外部插件的规则，与只适用于 Harness 上游源码仓库的维护流程分开。它是 D01/P0-04 的待验证设计输入，不表示业务插件已经实现。

## 适用性矩阵

| 官方主题 | WorkDSH 采用方式 | 明确边界 |
| --- | --- | --- |
| Adding a package | 按 capability seam 拆分定义、提供方和消费方；父目录只分类，子插件独立版本 | 不复制上游 workspace generator、project reference 或内部包发布流程 |
| Adding a Remote API | Host 拥有 `TypertRemoteService`，Client 使用生成类型；稳定错误码，`AbortSignal` 最后 | 不手写镜像 wire DTO，不用 `instanceof` 判断跨边界错误，不用 Remote 承载流 |
| Adding a settings card | 同一功能包配对 Host/Client namespace，通过官方 settings slot 贡献卡片 | Settings 只管运行偏好；组织策略、凭据和领域对象仍有独立真源 |
| Adding a tool | schema 校验、规范 JSON 结果、纯展示元数据、取消与 effect 生命周期 | 工具结果卡片不代替领域回执；Client 不直接调用 Host presenter |
| Session format version | 只跟随官方发布包提供的格式与迁移 | WorkDSH 不修改官方 Session 格式；自有业务事件只在受支持扩展面内独立版本化 |
| Vendored package | 不采用 | 本项目只使用公开发布包，不 vendoring、fork 或修改 Harness 源码 |
| Code review / stacked PR | 借鉴“机器检查加人工判断”和本地完整门槛 | 属于上游贡献流程，不能据此推断产品能力或用户工作流 |

官方 package group 是纯容器，不能作为运行时包加载。这与 `packages/plugins`、`packages/providers` 当前结构一致：父目录没有 `package.json`，每个实际插件或提供方独立声明版本和入口。

## 外部插件交付清单

每个 WorkDSH 插件版本按下列顺序验收；不适用项必须写明原因，不能静默跳过。

1. **身份与依赖**：稳定包名、版本、Loader entry id、精确 Harness 依赖、必需 `inject` 和可选能力均已声明；不存在跨功能内部实现导入。
2. **Host 生命周期**：服务、事件、订阅、子进程、连接、watcher 和定时器都由 effect 拥有；卸载后 disposer 完全停稳，Fiber 的 ACTIVE/PENDING/FAILED 可诊断。
3. **Remote**：一元方法以 Host 定义为真源并生成 Client 代码；参数顶层为 lookup object 或可编码值；可取消方法把 `AbortSignal` 放在最后；签名变更后重新生成、构建并同时测试 Host/Client。
4. **错误协议**：可预期领域失败返回稳定 `<domain>/<reason>` code 和结构化 details；Client 按 `code` 分支并为未知错误提供通用诊断。异常文字不作为程序协议。
5. **Settings**：需要运行偏好时，同包提供匹配 namespace 的 Host descriptor 与 Client card；保存携带 section revision，处理冲突与生效提示，secret 只显示引用和设置状态。
6. **Agent 工具**：输入 schema 严格、输出为规范 JSON 值；持久执行事实与 UI presentation 分离；执行尊重 `exec.signal`，在发布后台 Job 后把取消所有权明确转给 Job 生命周期。
7. **工具展示**：Host presenter 只生成纯展示元数据。Web Client 通过 `tool.call.toolview` keyed contribution 校验 wire event/meta；无法识别或插件卸载时回退官方通用工具视图。
8. **PTC 一致性**：工具可见时 PTC 自动走同一工具流水线；业务 guard、approval、审计和回执不能只覆盖原生 tool-call 路径。
9. **UI 贡献**：页面、设置卡、右栏、对话卡和 overlay 只用公开 Client/Slot seam；视觉 primitive 来自官方 UI 或 `packages/ui`，不从另一个业务插件导入组件实现。
10. **验证与发布**：覆盖正例、校验失败、授权拒绝、取消、断线、卸载和恢复；开发 SRC fallback 不作发布证据，干净安装必须使用构建/生成产物；CHANGELOG、兼容矩阵和迁移说明同步。

## Remote 失败与取消约定

Remote 只承载严格生成的一元操作。领域失败示例为 `projects/conflict`、`connections/authorization-required`、`skills/revision-missing`；details 只包含可安全返回给当前 ActorContext 的字段。未知 code、解码失败和连接中断统一进入失败状态，不能显示保存成功。

`AbortSignal` 表示调用方不再等待或请求取消，不自动证明底层外部动作已停止。若工具已经发布 Job，Job 成为运行和最终回执的所有者；UI 根据 Job/领域事实展示 running、cancel-requested、completed、failed 或 outcome-unknown。

## UI 组件归属

官方 `ui-primitives` 优先承接按钮、输入、弹层等基础行为；`packages/ui` 承接 WorkDSH 视觉 token 和无业务状态的组合组件。功能插件的 Client model 负责把 Remote/Session 数据转成 props，纯组件不读取 Cordis ctx、Remote、凭据或组织状态。

设置卡、项目配置弹框、列表卡片、工具调用卡可以共享视觉 primitive，但不能共享领域提交逻辑。跨插件协作通过 contracts/Host service 和稳定引用完成，不通过 React 组件彼此调用。

## P0-04 验证项

- 用锁定发布包生成一个最小自有 Remote，验证稳定错误码、lookup、取消、刷新和卸载。
- 创建一个同包 Host/Client settings namespace，验证 revision 冲突、脱敏和 `applies` 提示。
- 创建一个带 schema、规范结果和 Client toolview 的最小工具，验证原生与 PTC 都经过 guard，并在 renderer 缺席时回退。
- 用打包后的 tgz 在干净 Profile 中完成生成产物、依赖缺失、热卸载和重装检查。
- 记录 rc.1 实际 API 与 Cookbook 的差异；若公开接口不足，报告边界，不读取或复制上游实现补洞。

## 已审来源

以下为 Cookbook 来源；User、Testing 与 Postmortem 的补充规则见本文后续章节及总审查台账。

- `cookbook/adding-a-package.zh.md`
- `cookbook/adding-a-remote-api.zh.md`
- `cookbook/adding-a-session-format-version.zh.md`
- `cookbook/adding-a-settings-card.zh.md`
- `cookbook/adding-a-tool.zh.md`
- `cookbook/adding-a-vendored-package.zh.md`
- `cookbook/maintaining-dsh-code-review.zh.md`
- `cookbook/responding-to-pr-review-on-a-stack.zh.md`

## 用户安装与模型配置补充

- bundle 是可分发的配置层，Profile 是可启动组合；二者 manifest 职责不同。普通依赖安装成功不代表贡献已激活。WorkDSH 继续交付预构建 tgz，避免要求用户安装时构建源码。
- patch 层顺序为 bundle 列表 → Profile → home → 命令行 overlay；后层覆盖整行 config，不是逐键深度合并。验证最终组合时必须检查整份配置及必需服务，防止覆盖时丢失键。
- 源码教程中的 checkout、默认地址、源码别名与生成脚本只解释上游开发环境。WorkDSH 用实际发布 CLI 启动输出及认证流程打开页面，记录确切 origin、Profile、产物和服务实例。
- 模型配置优先复用官方设置与只写凭据入口。Provider ID 是持久路由身份，显示名、URL、协议等可编辑；WorkDSH 执行绑定还须记录配置修订，不能只锁 provider ID 就宣称端点不可变。
- 模型列表探测仅是便利查询，不保证模态、推理等级或协议真实可用。内置目录与自定义端点探测来源不同；表单声明和兼容开关是端点断言，实际能力仍需探针。
- 动态 Cordis 工具可以在进程内挂载模型编写的临时插件，并影响其他会话；它不属于业务专家创建/技能发布服务。只允许明确隔离的开发者实验组合，不加入普通团队业务默认。
- 代理在启动时从受信环境或 Harness home 读取；不接受项目仓库控制代理。代理密码可能被子进程读取，worker、遥测和部分流量另有路径；企业部署必须验证实际网络边界，不能用“已配代理”推断全部流量受控。
- GitHub Webhook 的签名只验证入站身份；202 不证明规则匹配、Session 创建或任务成功。出站连接授权及持久去重仍由 WorkDSH 独立处理。

## 测试与事故回归门槛

以下是 WorkDSH 采用的验证原则，不照搬上游测试脚本、100% 覆盖率要求或内部 fixture 格式。

| 回归机制 | WorkDSH 验收要求 |
| --- | --- |
| 命名导出被裸 default apply 遮蔽 | 命名空间插件不附加裸 default；测试打包产物经过真实 Loader 的依赖注入和核心操作，而非只手动 ctx.plugin |
| 可选服务在真实 Fiber/shadow 中解析失败 | 可选能力按操作 ctx.get；验证提供方缺席、存在和卸载后的真实调用拓扑 |
| 缺失工具被刷新为正确快照 | 独立断言必需工具存在、无意外 UNKNOWN_TOOL、目标文件/远端状态符合预期；快照刷新不能自动接受错误 |
| GUI 验证了错误的服务 | 关联构建产物、服务实例、Profile 与确切 origin；在该地址观察 DOM、交互和刷新结果，认证成功与页面渲染分别验证 |
| launcher 通知误判子进程失败 | 保留底层结构化错误，区分无匹配、应用失败、取消、沙箱不可用；平台确定性边界测试加真实组合路径，跳过的平台项单独记录 |
| 并行测试互相污染 | 独立临时 home/Profile/端口，失败和超时也等待资源释放；不能只靠进程隔离推断文件系统或端口隔离 |

事故 0002 的历史根因称 disabled 不求值，现行 Cordis primer 明确 config 与 disabled 有各自求值上下文。这是文档时间层次差异：锁定 rc.1 的具体行为留给 P0-04 验证；当前部署仍优先显式 overlay，不从历史事故推断现版本支持矩阵。

无密钥测试覆盖安装、Loader、工具流水线与恢复；真实模型测试单列，检查实际文件、业务回执和外部状态，不以 Agent 文本说“完成”判定成功。构建入口用普通 Node 与发布产物验证，避免源码工具链或陈旧 lib 掩盖错误。新增守卫须能被对应回归触发失败。
