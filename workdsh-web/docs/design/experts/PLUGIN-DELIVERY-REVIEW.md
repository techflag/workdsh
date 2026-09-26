# 插件真实性与交付边界复核

日期：2026-09-12；触发：用户质疑当前 packages/plugins 目录是否符合官方插件模型。

## 后续实施结果

Skill alpha.24 / bundle alpha.39 已完成本复核要求的 Skill 改造，见[验收记录](../../evidence/skills-standalone-package.md)。现在 Skill 有独立 Host/Client、dsh.bundle/patch、浏览器产物及公共本地服务契约；总包不再导入或调用 Skill helper，工作台改用 ctx.plugin。独立 tarball、官方 Web、移除/重装与组合回归均通过。

**下文第 1—3 节为改造前基线证据，不能继续作为当前源码描述。** Workbench 尚未独立分发；专家和其余规划模块仍须各自完成入口与制品验收。专家不可变技能依赖能力并未由本轮代为实现。

## 1. 原始结论

当前 WorkDSH 使用官方 Cordis/Harness 插件机制，但尚未兑现“每个功能都是独立可安装、可管理插件”的完整交付形态。目录组织可以保留；问题在入口、装配、生命周期和分发，不在文件夹叫不叫 plugins。

此前将“独立源码目录/包版本”与“独立运行、安装、卸载”并列描述不够准确。专家交接实施必须先补这项边界，不能延续直接调用初始化函数的集成方式。

用户随后明确要求遵循 Harness 自身由插件组合的架构精神，已采纳为 [ADR-0018](../../adr/0018-composable-feature-plugins-and-shared-skills.md)。当前直接调用 helper 的装配方式属于必须修正的交付差距；不可把它固化为一个承载全部业务的 WorkDSH 核心。

## 2. 官方概念

- 插件是可由框架加载的函数/对象/Service 类模块，使用 apply、inject 与托管生命周期。[第一个插件](https://deepseek-harness.github.io/deepseek-harness/develop/basic/)
- 官方 ctx.plugin 创建有独立 Fiber 的子插件；普通函数调用不会自动创造该边界。[插件生命周期](https://deepseek-harness.github.io/deepseek-harness/develop/framework/)
- 可安装 bundle 通过 dsh.bundle 声明配置 patch，Profile 决定组合顺序。没有 dsh.bundle 不代表模块不能作为插件加载，但普通安装不会自动激活配置层。[打包与安装](https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish)

因此，“可加载插件模块”“可安装组合包”“普通共享库”“规划目录”是四种不同状态。官方并未要求每个内部模块都声明 dsh.bundle，不能为了看起来一致给 contracts/ui 或空目录加假入口。

## 3. 当前代码证据

| 对象 | 实际状态 |
|---|---|
| packages/bundle | 有 dsh.bundle、patch 与 apply，是实际官方机制组合包；当前安装/移除证据主要覆盖整个 bundle |
| skills Host | 有 apply/inject，可作为插件模块；现有产品由 bundle/probe.ts 直接调用 applySkillsHost(ctx)，其注册随调用方 scope，不形成独立的 Skill 顶层 Fiber |
| skills Client / workbench | 目前暴露初始化 helper，由 bundle Client 直接调用；不能把这称作各自独立加载的 Client 插件 |
| access / audit / identity-local provider | 有真实 Service 类插件入口；独立自动安装组合和产品接入是另一项证据，不能由类存在推导 |
| experts / connectors / projects 等 | 当前只有规划文档，无可加载实现 |
| contracts / ui | 共享库，本来不应强制变成运行插件 |

精确位置：[Host 装配](../../../packages/bundle/src/probe.ts)、[Client 装配](../../../packages/bundle/src/client/harness/client.ts)、[构建脚本](../../../scripts/build-client-probe.mjs)、[Skill manifest](../../../packages/plugins/skills/package.json)、[Workbench 入口](../../../packages/plugins/workbench/src/index.ts)。

构建时将多个模块合并到同一文件本身不违反 Cordis。这里的问题是运行时直接调用 helper，共用父入口生命周期；没有证明功能模块的独立加载、依赖就绪、卸载和重新装配。现有父级清理仍可生效，不应反过来说这些注册完全没有生命周期。

补充实测：[原有 Skill 独立打包安装](../../evidence/skills-standalone-package.md) 已执行。构建/打包及普通依赖安装通过，官方 CLI 明确告警没有 dsh.bundle，未激活配置层。

## 4. 专家实施的补充硬约束

1. Experts Host/Client 各提供当前锁定版 Loader 能识别的插件入口，独立声明 inject、服务和 disposer。业务方法仍可内部使用普通函数，但不能将调用 applyX(ctx) 当注册子插件。
2. 优先通过官方配置 patch 的独立行装配；适合嵌套时使用 ctx.plugin。ctx.plugin 解决 Fiber，不单独解决安装分发；两者分别验收。
3. 按“每功能可独立安装”的产品目标，为专家提供可安装的 dsh.bundle/patch 或明确的安装包装包，发布预构建产物。运行依赖须在制品中完整解析，不依赖开发 checkout 或未发布 workspace 路径。
4. 默认 workdsh-bundle 只承担组合/品牌职责。组合多个功能是允许的，但不能成为专家功能唯一的隐藏初始化入口；独立加载与默认组合不能重复注册同一实例。
5. Client 发现、编译和入口声明按锁定版官方客户端规范验证；不假定仅有 ./client export 就会自动加载。UI 需要的服务属于它自己的 inject，不从一个越来越大的 bundle inject 隐式继承。
6. 验证安装专家制品、配置层可见、Host/Client 各自激活、必需服务消失时卸载、服务恢复后重载，以及移除专家后 Skill/工作台仍工作。停服移除再重启与运行中 dispose 分开记录，不能混称热卸载。
7. 若已有 Skill/Workbench 装配阻碍专家独立性，修正最小共享装配边界并回归，不借此一次实现全部规划目录，也不迁移企业功能。

## 5. 纳入既有有限交付范围

不新增阶段：EP-01 / G05 增加独立插件入口和安装制品探针；EP-02 建立标准入口；EP-05 实现独立 Client 注册；EP-07 / AT-20 增加独立生命周期、安装/移除及不影响其他功能的证据。Skill 前置修改已完成；专家本身的这些修改尚未实施。

接手模型应先阅读本复核，再实施原交接包。原方案中的领域模型、UI、业务修订和企业后置边界继续有效，但不能把父 bundle 的运行证据当单功能插件已独立交付。
