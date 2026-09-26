# Harness 官方开发规范

状态：强制执行。适用基线：根目录 `upstream.json` 锁定的 DeepSeek Harness 版本。

本文把官方文档转成 WorkDSH 的开发准入规则。它不复制 Harness 上游仓库的内部构建流程；外部插件只使用发布包的公开 exports、类型、服务、Remote、Resource 和 Slot。

## 1. 依据优先级

1. 锁定版本发布包的 `exports`、类型声明和运行探针。
2. 官方仓库对应版本 tag 的文档；旧版本只作为历史依据，实际接口以锁定包为准。
3. 官方网站当前文档，用于发现新说明和交叉核对。

网站与锁定包不一致时记录差异并做最小探针，不读取私有实现、不修改 Harness、不静默升级。官方文档中的上游 workspace 路径、聚合 tsconfig、源码生成器和内部发布门禁只适用于 Harness 仓库；WorkDSH 采用其公开包职责、依赖、生命周期和验证原则。

## 2. Sidebar 与页面所有权

| 产品位置 | 官方扩展面 | WorkDSH 用途 | 禁止事项 |
| --- | --- | --- | --- |
| 左侧主栏 | `sidebar.panellist`、`sidebar.brand.*`、官方 settings 子 Slot | 品牌和业务页面入口 | 替换或复制 Workspace、Session、新会话、搜索、菜单、设置 owner |
| 主区 | `main`，会话为 `main.conversation` | 全局业务管理页；返回原生会话 | 自建 Conversation、Composer、Session 列表或执行状态 |
| 会话右栏 | `rightbar.session`、`sidebar.right.*`、`ctx.sidebarRight` | 当前 Session 的文件、目录、资料、成果与上下文业务页 | 全局导航、全局技能库、项目全局配置、跨 Session 状态 |
| 短时浮层 | `shell.overlay` 或所属页面局部层 | 公共弹框、选择器、临时提示 | 把持久业务事实只保存在组件状态 |

右侧 Sidebar 每个 Session 一份，tab 身份由 `(kind, address)` 决定。新增类型必须同时注册 `ctx.sidebarRightTabs.register(definition)` 与 keyed `sidebar.right.pane.tab` 正文；资源使用 `dsh-resource://<type>/...` 和公开 Resource provider。正文从 `useTabInfo()` 读取 sidebar、panel、tab、navigation、signal 和 actions，不能持久化 owner 借出的瞬时缓冲区。

左栏业务入口使用新的 list `id`，配对同 id 的 `main` keyed entry。普通增量贡献不得占用已有 single/keyed occupant。插件无导航入口是合法形态，安装状态、运行范围、授权与入口位置分别建模。

## 3. Slot 与 Client 组件

- 通过 `import type {}` 引入其他功能包声明，不导入其运行时组件。
- 使用 `ctx.slots.inject(key, callback)` 等待 owner 声明出现；owner 卸载时贡献自动撤销，重新挂载后自动恢复。
- 注册组件的 props 从 `PropsRuntime<K>`、`PropsRenderSlots`、`PropsStore` 或官方标准 props 推导。owner 已知值走 owner props，私有 callback/source 走 entry `inject`，共享视图状态走 Slot store。
- React 组件不接收 Cordis `ctx`、Remote 客户端、凭据或领域 service。apply closure 只向组件投影所需 callback 和稳定 observable。
- 业务页面和具有多层结构的组件使用 `.tsx` 表达 React 结构；`React.createElement` 只保留给极小的无状态装配点。TSX 只是编译期语法，仍由官方 renderer 提供唯一 React root，不得因此建立第二个前端入口。
- `session` Slot 的状态绑定到确定 Session；全局目录和管理页使用 root/global 事实，不能从当前 Session 反推所有权。

## 4. 包与能力职责

- 版本按 WorkDSH 模块规划，遵守 [模块版本规划](MODULE-VERSIONS.md)。一个模块内的 Host/Client/Remote/资源和 Harness 适配共同构成同一版本；官方 Harness 依赖版本另行锁定并记录兼容证据。
- 名称描述当前稳定职责。可独立替换的 Service Definition、Provider 和 Consumer 分包；单一用途保持单包。
- 分类目录没有 `package.json` 或加载入口。只有实现真实功能并通过验证的子包声明可加载入口。
- Cordis 与公开 Harness 运行依赖在 `peerDependencies` 表达兼容边界，并在 `devDependencies` 使用锁定版本镜像；纯类型或构建期依赖在 README 说明。Client bundle 的 `dsh.client.inject` 必须列出装配所需官方模块。
- 必需服务写入 `inject`；可选服务按操作解析。配置顺序不表示依赖顺序。
- README 记录职责、公开 API/配置/事件/扩展点、模型上下文影响、已知限制、版本兼容和验收方式。CHANGELOG 只描述真实交付。

## 5. 生命周期与清理

- registry、service、Remote、订阅、监听器、timer、watcher、连接、子进程与临时资源都属于当前 Cordis Fiber。
- 官方自动托管 API 按其契约使用；返回 disposer 的独立注册通过 `ctx.effect()` 管理，事件使用 `ctx.on()`。需要顺序的异步清理放在同一 disposer 中等待停稳。
- 服务卸载或替换时 consumer 会随 `inject` 重启。不得跨 Fiber 缓存 service handle、Session scope 或 AbortSignal。
- `tab.signal` 只代表右栏 tab occurrence；隐藏或切换 Session 不会中止，关闭记录或卸载插件才会中止。

## 6. 每次变更的准入检查

编码前在对应 evidence/设计文档填写：任务范围、官方版本文档链接、精确包版本、公开入口、原生 owner、复用方式、自有差异和待验假设。

每个功能先完成“owner → 公开入口 → 交接数据 → 生命周期 → 验收证据”的逐项映射，再写界面或业务代码。参考产品截图只定义用户流程和视觉目标，不能用来推断 Harness 的内部接口。能由原生 owner 完成的输入、附件、权限、模型、Session、Workspace、Skill 发现与执行必须继续留在原生 owner 内；WorkDSH 只通过公开 Slot、Service、Remote、Resource 或输入 action 交接业务意图。

### 技能新增与导入的固定链路

1. 技能库是用户或组织级入口，不能用某个任务筛选或拥有技能；当前页面由 Host `SkillManager` 复用全局 `ctx.skills.list/get`，不再通过 Session 汇总目录。
2. “添加技能”只提供查找、上传、创建三个真实动作。查找过滤当前已安装目录；创建新建官方 Session，进入官方 Conversation，并通过 `conversation.input.overlay` 的 `inputActions.setDraft()` 交接一次性 `/skill-creator` 草稿。
3. 上传使用技能插件自己的公共 Modal 内容，通过 Connection 鉴权的 exact Fetch 流式路由把 `.zip`、`.md` 或浏览器选择的文件夹交给 Host。`ctx.fileUploads` 的 receipt 绑定 Agent 与提示词，不能用于全局管理导入。上传必须先预检，再显示名称、描述、文件清单和范围，最后由用户确认安装；不得复制 Conversation、命令解析或执行链。
4. `skill-creator` 由技能插件根入口通过官方 `ctx.skills.register()` 注册，并由 Cordis effect 管理释放。产物写入官方文件技能目录：项目 `.dsh/skills`、项目 `.agents/skills`、配置的自定义目录、`$DSH_HOME/skills` 或 `$DSH_AGENTS_HOME/skills`；不增加第二份注册表。用户要求所有 WorkDSH 任务或兼容 Agent 共用时默认使用共享 Agents root；Profile 私有根必须显式选择。
5. 导入文件先作为数据检查，禁止执行其中脚本；Host 限制上传与展开体积、文件数和深度，拒绝目录穿越、符号链接、缺失或多个 `SKILL.md`，确认名称、范围和资源清单后才原子复制。失败不得覆盖同名技能，并保留未过期暂存供用户修正范围或重试；取消、成功或过期后清理。最终发现、监听刷新、正文按需加载和 `/name` 调用均归 Harness Skill 子系统。
6. 当前只消费 Harness 默认/本地技能，不开发公共市场。后期企业组织技能、分类、版本、下发策略与安装状态由独立服务端和管理 Web 拥有，按 ADR 0015 实现；不得把这些目录字段写入 Harness skill frontmatter。可以保留明确禁用并说明开放条件的分类设计位，不得显示可点击却无结果的假筛选。

### 技能管理传输兼容规则

新的一元业务协议首选 Typert 生成 Remote。此前锁定的 rc.1 以及隔离验证的 rc.2 在外部 npm workspace 中均无法识别 Remote 装饰器，生成器会错误报告“没有 Remote methods”。Skill 管理使用公开的 `@deepseek-ai/dsh-client-connection` exact Fetch route：缓冲 JSON 操作使用一个精确路径，浏览器文件上传使用另一个 `requestBody: 'streaming'` 精确路径。Host 插件只声明 `connection` 注入；所有 payload 在 Host 做运行时校验；流式路由实施 50 MiB 上限、中止传播和暂存清理；Client 为查询、修改和上传设置有界超时并提供显式取消；错误只返回稳定 code 和公开消息；文件路径只由 Host 管理器从受控根解析，浏览器不得取得或拼接 Host 路径。请求继续经过 Connection 的 Host/Origin 栅栏和浏览器会话认证，业务插件不直接依赖 `webServer`，也不建立第二套 transport。取消必须在原子发布前生效；发布完成后按成功结算并重新读取 Host 事实。Typert 的外部 workspace 生成问题保留为上游兼容事项，不得为其他插件复制 Skill 的 endpoint 形成通用私有协议。

“打开文件夹”必须用官方 `ctx.remote.session.openWorkspacePath({ path, action: 'reveal' })`；Client 只能使用 Host 返回的已校验目录。“编辑”读取完整 `SKILL.md`，保存时携带内容摘要 revision，冲突必须重新加载。“停用”移动出官方活动根但保留在 WorkDSH 隔离目录；“卸载”先进入可恢复回收目录。上述操作成功后重新读取 Host 全局列表，不能仅修改浏览器状态伪造结果。

提交候选至少检查：

1. 未新增第二套 Agent loop、Skill registry、Session/Workspace 列表、Conversation renderer、Remote transport、模型路由或 MCP transport。
2. UI 使用正确 Slot scope/cardinality，增量 entry 有稳定 id/key，owner props 未被复制。
3. Host/Client 依赖、`inject`、bundle manifest 和 README 一致；无跨插件内部实现导入。
4. 所有注册可卸载，缺依赖为 PENDING、启动错误为 FAILED、正常运行才是 ACTIVE。
5. typecheck、build、相关无密钥行为测试和打包安装通过；视觉变更另按 `UI-DESIGN.md` 验证真实 Host。
6. 官网与当前锁定版本有差异时，把差异和探针结果写入 `COMPATIBILITY.md`，不能用文档截图代替运行证据。

## 官方来源

- [官方右侧 Sidebar](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/sidebar-right)
- [官方添加 Package](https://deepseek-harness.github.io/deepseek-harness/reference/cookbook/adding-a-package)
- [官方 Skills](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/skills)
- [官方 Conversation](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/conversation)
