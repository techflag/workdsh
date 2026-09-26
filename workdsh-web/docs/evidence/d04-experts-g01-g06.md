# D04 / P1-02 专家模块 0.1：G01～G06 公开接口验证证据

任务：EP-01（官方公开面与 G01～G06 验证；确认 transport ADR）。
核对日期：2026-09-12。源码基线：WorkDSH `5225e42`（含未提交设计文档）。
锁定版本：`@deepseek-ai/dsh@0.1.5-rc.1`、`@deepseek-ai/cordis@4.0.2`、Node 22.23.2、pnpm 10.34.5。

本文件只记录**已安装发布包的 exports / `.d.ts` 声明**与**可重复运行证据**。拟新增的 `workdshExperts`、修订存储、preset 编译器与运行绑定 guard 在实现前均为拟议能力；实现后在对应 EP 回填运行证据。物理路径仅用于核对声明，产品代码一律从包公开 exports 导入。

## 采用次序

锁定 npm 包 exports / `.d.ts` / 可重复运行证据 → 对应版本官方说明 → 最新在线说明。差异记录，不静默升级。

---

## G01 角色组合（persona + preset 编译）

| 项 | 证据 |
|---|---|
| 锁定包 | `@deepseek-ai/dsh-persona@0.1.5-rc.1`、`@deepseek-ai/dsh-agent-presets@0.1.5-rc.1` |
| persona 公开面 | `lib/types/index.d.ts`：`name='persona'`、`inject: string[]`、`Config{prefix:string; suffix?:string; complete?:boolean; includeRuntimeContext?:boolean}`、`Config: z<Config>`、`apply(ctx: Context, config: Config): void`；再导出 `PERSONA_PREFIX_SECTION`/`PERSONA_SUFFIX_SECTION` |
| persona 语义 | README：scope-only。挂在 preset composition 内为该 session 遮蔽部署 persona；全局挂载与 prompt registry 自身 `deployment:persona-prefix` 注册冲突并 fail loud。`complete:true` 使 prefix 成为唯一 system prompt；`includeRuntimeContext:false` 调用 `ctx.systemPrompt.suppressRuntimeContext()` |
| preset 服务公开面 | `AgentPresets extends TypertRemoteService`：`list()`、`resolve(id?)`、`read(id)`、`readDocument(agentPreset)`、`copy(from,id,name?)`、`remove(id)`、`mount(agentCtx,id?)`、`composeFrom(agentCtx,parentCtx)`、`composedPreset(agentCtx)`、`recompose(agentCtx,id)`、`select(agent,agentPreset)`、`serviceFor(agent,name)`、`standingKeyFor(id?)`、`compositionInventory()`、`remoteExportList/Copy/Delete`；getter `defaultId`/`roots`/`authorable` |
| preset authoring 公开面 | `copyComposition(roots, source, id, name?)`、`writableRoot(roots, presetId)`、`readComposition(preset)`、`deleteComposition(roots, preset)`、`presetExists(presetId)` |
| preset 发现公开面 | `discoverPresets(roots, harnessBase)`、`scanRoot(root, harnessBase)`、`COMPOSITION_FILE='agent.cordis.yml'`、`USER_PRESET_DIR='.agent-presets'`、`SHIPPED_PRESET_ROOT`、`entryListProblem(rows, at?)` |
| preset 词汇 | `AgentPreset{id, trust:'system'\|'user', path, name?, description?, order?, broken?}`、`PresetRoot{path, trust}`、`Config{default, roots, includeShippedRoot, includeUserRoot}`、`PRESET_ID: RegExp` |
| 组合文件格式 | 实测 shipped `presets/standard/agent.cordis.yml`、`presets/minimal/agent.cordis.yml`、`presets/cordis/agent.cordis.yml`：YAML 插件行列表 `- {id, name, config, disabled?, group?, isolate?}`；persona 行 `name:'@deepseek-ai/dsh-persona'` + `config.{prefix,suffix,complete,includeRuntimeContext}`；skill 行 `@deepseek-ai/dsh-skill-filesystem`（含 `customSkillDirs`、`includeDefaultRoots`）+ `@deepseek-ai/dsh-tool-skill`；metadata 文件 `preset.yml{name, description, order}` |

**结论（可行）**：
1. 专家角色经官方 persona 的 **preset scope** 编译成立：发布组合在 `<writableRoot>/wd-exp-<id>-<digest>/agent.cordis.yml` 写入一行 `@deepseek-ai/dsh-persona`，`config.complete` 固定 `false`、`includeRuntimeContext` 固定 `true`，`prefix` 承载专家 role/methodology/boundaries/deliverables 编译文本。禁止全局注册 persona（README 明确 fail loud）。
2. 只读构件生成途径确定：`AgentPresets.roots` 中首个 `trust==='user'` 的 root 即官方解析出的可写根（等价 `writableRoot`），不硬编码 `.agent-presets` 或用户名路径。编译器在该根下创建**新的 kebab-case preset 目录**并写入 `agent.cordis.yml`（+ 可选 `preset.yml`），发现层 `discoverPresets` 每次重读根，无需重启即可见。
3. `copyComposition` 是官方唯一 authoring 写（整目录复制），**不接受任意 composition 文本**；因此专家编译器不依赖它写入角色文本，而是直接在官方解析出的可写根下创建受控目录与文件（HLD 5.1 受信模板生成，不允许用户/导入包指定 npm 包名、Cordis services、任意配置代码或绝对目录）。复制默认模板专家时使用业务层草稿复制，不触发 preset 复制。
4. 字面大括号转义：persona `prefix`/`suffix` 是模板，完整 `{{…}}` 组严格对注册变量插值。用户文本中的字面 `{{`/`}}` 必须在编译期检测并拒绝不受支持的模板表达式（给字段错误），未验证前不放行——EP-03 编译器实现该检查并补锁定版探针。

**A/B 不串与运行上下文保留**：persona 为 scope-only，两个专家 preset 各自 standing mount，互不遮蔽；`complete:false` + `includeRuntimeContext:true` 保留原生工具指导与 runtime context。运行期 A/B 证据在 EP-03/AT-23 以真实 Host 探针回填。

---

## G02 声明 Skill 依赖（快照隔离 + 不回退）

| 项 | 证据 |
|---|---|
| 锁定包 | `@deepseek-ai/dsh-skill-filesystem@0.1.5-rc.1`、`@deepseek-ai/dsh-skill@0.1.5-rc.1`、本仓库 `workdsh-plugin-skills@0.1.0-alpha.23` |
| skill-filesystem Config | `lib/types/index.d.ts`：`providerName?`、`includeDefaultRoots?`（project/user 根是否围绕 custom 根包含）、`dshHome?`、`agentsHome?`、`customSkillDirs?: string[]`（project 根之后、user 根之前扫描）、`watch?`、`bundledSkillDir?` 等 |
| 现有 Skill 受控根 | `SkillManager` 构造：`activeRoots=[<agentsHome>/skills, <dshHome>/skills]`、`disabledRoot=<agentsHome>/.workdsh-disabled/skills`、`trashRoot`、`stateRoot=<agentsHome>/.workdsh-state/skills`（含 locks/origins/receipts/drafts/imports） |
| 现有依赖影响 | `SkillManager.registerDependencyInspector(inspector)`、`dependencyImpact(name)`、`uninstall(name, expectedImpactRevision)` 已存在 |

**结论（需补公共适配，属 D04 依赖工作）**：
1. 隔离机制确定：每个专家 preset 的 `@deepseek-ai/dsh-skill-filesystem` 行配置 `customSkillDirs:[<retained snapshot dirs>]`、`watch:false`。快照目录由 Skill owner 新增的 `retainRevision` 在 `<stateRoot>/retained-revisions/<skillRevisionId>/` 下创建，每个目录含一个 skill bundle（`<skillName>/SKILL.md` + 资源），恰好贡献一个冻结 skill。两个专家同名 skill 不同快照 → 不同 `skillRevisionId` 目录 → 内容/资源隔离（AT-07）。
2. 不回退全局同名：`includeDefaultRoots` 保留全局动态能力池（未声明 skill 仍可用）；声明 skill 的冻结快照位于 custom 根（user 根之前），且**运行绑定 guard 在每次执行前校验快照存在性与摘要**，缺失/停用/漂移即拒绝执行，不回落 user 根同名实现（AT-08/AT-09）。该 guard 是 G02 与 G03 的共同落点。
3. 须新增 Skill owner 公共契约：`resolveRevision(skillId, expectedDigest?)`、`retainRevision(ref, consumerRef)`、`checkRevision(ref, actor)`、`releaseReference(ref, consumerRef)`，并复用既有 `dependencyImpact`。不能把现有文件编辑 digest 当持久修订 ID，不调用不存在的 `skills/revisions` 导出。EP-03 在 `workdsh-plugin-skills` 实现并经 `workdsh-contracts/skill-revisions` 暴露，专家插件不遍历另一插件私有目录。

---

## G03 运行绑定全路径（关键关卡）

| 项 | 证据 |
|---|---|
| 锁定包 | `@deepseek-ai/dsh-api-session-controller@0.1.5-rc.1`、`@deepseek-ai/dsh-agent-presets@0.1.5-rc.1` |
| SessionCreateRequest | `types.d.ts`：`{workspaceId?, cwd?, sessionId?, agentPreset?}` —— **无 expertId、无 model 参数**（印证 E09） |
| create | `create(request: SessionCreateRequest): Promise<SessionCreateValue>` —— **无 signal 参数**；`SessionCreateValue{sessionId, agentPreset?}` |
| 相关方法 | `resolveAgent(sessionId)`、`inspect(sessionId, signal?)`、`selectModel(SessionSelectModelRequest extends ModelSelection{provider,model,reasoningEffort?} & {sessionId})`、`modelCatalog()`、`fork(SessionForkRequest{sessionId, atSeq?})`、`prompt(request, signal)`、`list/search/page/follow/control` |
| preset 选择约束 | `agentPresets.select(agent, agentPreset)` 仅对**空会话**；`recompose` 的空白检查由调用者负责（印证 E10）。`composedPreset(agentCtx)` 从 live scope chain 读取 |
| 受控入口 | 本仓库 `SessionAccessBridge.create(request, signal?)`：解析 actor → 绑定 owner → `sessionController.create` → 审计；拒绝接管无受信 owner 绑定的既有 Session。`resolveAgent(sessionId, signal?)`：解析 actor → `resolveRuntime` → `sessionController.resolveAgent` → 审计 |
| 冷读再解析 | E07 / ADR-0010：preset 冷启动按 ID 再读，同名文件改动导致组合变化 |

**结论（部分可行，存在公开 seam 缺口，须如实记录）**：
1. 绑定记录可行：experts 领域 `bindings` 表保存 `sessionId → expertRevisionRef/presetRevisionRef/compositionDigest/skillRevisionRefs/owner/creationOperationId`，创建前保留、不可重绑定。
2. 创建路径可校验：`prepareExecution`/`createExecution` 经 `workdshSessionAccess.create({sessionId, workspaceId, agentPreset})`，创建前校验发布构件、快照、可用性、授权与依赖健康。
3. **缺口**：rc.1 未公开“拦截每个绑定 Session 首次提示词及每轮执行前”的官方 seam。`sessionController.prompt` 无插件前置钩子；`agentPresets.mount` 仅在 agent factory `setup` 调用；`select`/`recompose` 限空会话。因此“所有受管 Session 每轮执行前校验固定绑定”**不能仅靠公开 Remote 拦截保证**。
4. 处理（不改上游、不绕过原生权限）：
   - 在公开 seam 内最大化保护：preset 构件不可变 + 摘要记录；冷恢复/重新打开/`resolveAgent` 路径经绑定 guard 校验构件与快照完整性，篡改/删除即显式拒绝（AT-08 的“同 preset ID 篡改内容或删除文件时显式拒绝”在 guard 校验点成立）。
   - 原生 fork：`fork` 产生新 SessionId，guard 对新 Session 无绑定记录 → 拒绝将其当作受管专家任务执行（不产生无绑定可执行副本）；如需 fork 继承须走 `prepareHandoff` 显式创建新绑定。
   - 空会话换 preset：`select` 限空会话，换 preset 后 `composedPreset` 与绑定记录不一致 → guard 拒绝。
   - **如实标注**：AT-10“从原生 Remote/刷新/恢复/fork/换 preset 路径验证绑定；不可通过旁路移除角色保护”中，“每轮 prompt 前强制校验”一项在 rc.1 无公开 seam，记为**兼容性缺口**，按 ADR-0017 第 6 条与 HLD 6.2 处理：D04 不以“每轮执行前强制重校验”验收；提交可复现缺口与最小公开扩展建议（官方提供 prompt-admission 或 per-turn binding validator seam），不修改上游、不声称专用按钮路径等于保护。管理与界面、创建/恢复/fork/换 preset 的绑定校验照常实现并验收。

---

## G04 原生创建与草稿交接

| 项 | 证据 |
|---|---|
| 锁定包 | `@deepseek-ai/dsh-api-session-controller@0.1.5-rc.1`、`@deepseek-ai/dsh-client-ui-conversation@0.1.5-rc.1`、`@deepseek-ai/dsh-client-ui-slots@0.1.5-rc.1` |
| 创建参数 | `SessionCreateRequest{workspaceId?, cwd?, sessionId?, agentPreset?}`；`create` 无 signal |
| 模型选择 | `selectModel` 在显式 resume 后选择 Session-local 模型；`modelCatalog()` 描述可路由模型与默认；不支持的显式模型/推理强度返回 `session/model-unavailable`，不私自回退 |
| 草稿交接 | E05：`conversation.input.overlay` Slot + `inputActions.setDraft(draft)` 已用于 Skill 草稿（`packages/plugins/skills/src/client/drafts.tsx`，`PropsRuntime<'conversation.input.overlay'>` + `useEffect` 从 sessionStorage 应用一次） |

**结论（可行）**：
1. 召唤/示例/制作专家只准备目标任务草稿：`prepareExecution` 解析固定版本/工作区/模型可用性/权限/依赖健康并创建短期计划；用户确认后 `createExecution` 用独立 operationId，先保留随机唯一 SessionId + 绑定 + owner，再 `workdshSessionAccess.create({sessionId, workspaceId, agentPreset})`。
2. 创建无 signal：超时/取消只标结果待确认，用 `inspect(sessionId)` 对账；不承诺已撤销创建（AT-17）。
3. 模型选择走原生 `selectModel`，保留用户当前明确设置；不支持返回错误不回退（AT-13）。
4. 草稿一次性交接：保存 `handoffId+sessionId+expectedDraftVersion+text+expiry`，Client 在正确 Session 且原草稿未变化时经 `inputActions.setDraft` 应用一次；导航失败/组件未就绪可重试同一 handoff；不覆盖用户已有草稿、不自动发送（AT-03/AT-12）。多任务草稿用 session-targeted 键，复制 E05 单键机制时升级为按 SessionId 命名空间。

---

## G05 传输（Typert Remote vs Connection exact Fetch）

| 项 | 证据 |
|---|---|
| Typert 生成探针 | `corepack pnpm probe:remote:generate` 复现非零：`TypertAnalysisError: typert(host): workdsh-remote-probe-fixture publishes Remote artifacts but has no Remote methods`（`.artifacts/workdsh-typert-error.txt`、`docs/evidence/d01-remote.md`） |
| 根因定位 | rc.1 生成器 decorator 识别要求符号所属声明来自已登记为 `@deepseek-ai/dsh-typert-protocol` 的 **workspace 工程包**（真实路径位于 `packages/` 下）或该名称的 ambient module；npm 安装的 protocol `.d.ts` 位于 node_modules，是外部 ESM 声明，不满足条件。公开 analyzer/generator 无外部 protocol 身份映射项 |
| Typert 服务公开面 | `TypertRemoteService`、`@Remote(name)` 装饰器、`RemoteError(code,message,details)` 运行时可用；`tests/remote/lifecycle.test.mjs` 验证协作式取消与 dispose（Host 生命周期 3/3），但**网络 Gateway/Client 端到端未完成** |
| Connection exact Fetch | 本仓库 `workdsh-plugin-skills` 已验证：`connection.fetch.register({path, methods:['POST'], requestBody:'buffered'|'streaming', fetch})`，响应 `ConnectionRpcResult<T>={ok:true,value}|{ok:false,error:{code,message,details}}`；客户端 `fetch(path,{method:'POST',credentials:'same-origin',body:JSON.stringify({endpoint,payload})})` |

**结论（transport ADR 确认）**：
- 首选官方 Typert Remote 在 rc.1 对**外部 npm 包**存在可复现生成缺口（非本工程配置问题，已排除 dist/lib、files、拓扑等）。按 ADR-0017 第 7 条与 HLD 第 7 节，**专家插件采用官方 Connection 认证 exact Fetch 路由作为审定的本地例外**，新增专家专属路由 `/api/workdsh-experts`（buffered JSON）与 `/api/workdsh-experts/import`（streaming 上传），与 Skill 兼容路径同构但独立命名空间，不共用私有 wire、不新造 WebSocket/全局 window RPC/未认证端口、不升级 DSH。
- 两种实现共享同一 DTO/service；最终只启用 Connection exact Fetch。Typert 生成缺口保留为后期兼容项，待公开接口解决或有独立升级兼容证据后再评估自有 Remote 网络接入。
- 取消语义：读取可中止（fetch signal）；草稿提交前可取消；发布提交点后返回已提交事实；Session 创建无 signal → 查询结果对账。requestId 追踪、operationId 持久幂等，二者不混用。

---

## G06 持久与恢复（Storage Domain CAS + 操作对账）

| 项 | 证据 |
|---|---|
| 锁定包 | `@deepseek-ai/dsh-storage-domain@0.1.5-rc.1` |
| 公开面 | `defineDomain(spec)`、`domainTable<K,V>(zodSchema)`、`DomainSpec{name, version, layout?:'single'|'per-record', compatibleVersions?, invalidRecords?:'backup-and-skip', global?, tables}`、`ctx.storageDomain.open(spec)` → `Domain{name, global, table(name), close()}` |
| KvTable | `get(key):V|undefined`（同步内存）、`entries()`/`keys()`（快照迭代）、`size`、`put(key,value):Promise<void>`、`delete(key):Promise<boolean>`、`update(key, fn:(current:V)=>V):Promise<V>`（域写链上原子 read-modify-write，缺失键 reject `missing-key`） |
| 写序 | 每写排队于域写链，先 backend 持久→再改内存→再发 `domain/changed`；backend 写被拒则内存不变。`close()` 拒新写、排空已排队写、释放 unit、幂等 |
| 既有用法 | `workdsh_access`/`workdsh_runtime_binding`/`workdsh_identity_local`/`workdsh_audit` 均用 `defineDomain`+`Service.init` 开域+`ctx.effect(()=>()=>domain.close())`；AccessManager 用 `mutationTail` 串行化跨记录序列 |

**结论（可行）**：
1. 专家领域 `workdsh_experts`（schema version 1，`layout:'per-record'`，权威表默认 `invalidRecords` 拒绝坏记录不静默跳过）：表 `experts`/`revisions`/`bindings`/`preferences`/`operations`。
2. CAS：`KvTable.update(key, fn)` 在 `fn` 内比较 `expectedRevision` 后整体替换，不先读再无条件 put；同对象 CAS 与发布头原子更新在单次 `update` 内完成。
3. 跨构件/发布头/Session 非单一事务：先写可恢复 `operation`（phase=prepared/applying/committed/failed/reconciling/cancelled），失败暂存不被目录发现，未被发布头引用的构件按操作记录回收；已提交发布头后不因响应丢失报告“未发布”。发布头更新与提交回执/outbox 放在同一原子 `update`；独立 operations 索引可重建。
4. 审计：稳定 eventId，重试不重复追加；汇出失败显示 audit pending（committed + auditDelivery=pending），不回滚已提交业务事实；变更前授权/审计服务不可用则拒绝开始。
5. crash recovery：提交前后 kill、丢响应、断线重试在 EP-03/AT-16 以真实 Host 探针回填；同键不重复发布/建任务由 operationId + payloadDigest 幂等保证。

---

## 复用矩阵增量（REFERENCES 第 4 节）

| 能力 | 已有证据复用 | 本次新增 |
|---|---|---|
| preset 持久化 | E07、ADR-0010 | 专家编译构件（persona+skill 快照行）+ 冷恢复/重新打开/fork/换 preset 入口健康校验（G03 guard） |
| Skill 同名隔离 | 既有 C01 探针 | 业务快照 `resolveRevision/retainRevision/checkRevision/releaseReference`、customSkillDirs 冻结、停用/卸载与全局回退边界 |
| Session 创建 | E03/E09 | operation 持久映射、模型选择失败、丢响应 `inspect` 对账 |
| UI draft | E05 | session-targeted 一次交接、已有草稿保留、重复挂载只消费一次 |
| domain storage | identity/access/audit 用法 | 专家发布 CAS、操作/outbox、构件跨提交点恢复 |
| external Remote | Skill 兼容记录、d01-remote | 专家独立 Connection exact Fetch 路由（Typert 外部包缺口审定例外） |

## 未执行 / 待回填

- 本轮 EP-01 仅完成发布包声明核对、shipped preset 组合格式实测、既有 Typert/Connection/Storage 证据复用与 transport ADR 确认。
- **未执行**：真实 Host 运行期 persona A/B 不串探针（AT-23）、skill 快照隔离运行探针（AT-07）、绑定 guard 冷恢复/fork/换 preset 运行探针（AT-08/AT-10）、crash recovery 探针（AT-16）、真实打包 Web 浏览器探针、真实模型调用。以上在 EP-03/EP-04/EP-07 实现后回填，并区分模拟/真实 Host/真实浏览器/真实模型证据。
- G03 “每轮 prompt 前强制重校验”公开 seam 缺口已如实记录，按 ADR-0017 第 6 条处理，不以专用按钮路径冒充保护，不修改上游。

---

## EP-07 更新（2026-09-12）

- 上文 EP-01 列为“未执行”的 AT-07/AT-08/AT-16 等，现已在**真实 Host 集成层**（真实 Cordis Context + 官方 Storage Domain + 真实 AccessManager/AuditJournal，identity/session 为替身）通过：AT-01/04/05/06/07/08/14/15/16/17/22 见 `expert-manager.test.mjs` 9/9、全量集成 42/42。分层矩阵见 [EP-07 验证](d04-experts-ep07-verification.md)。
- **真实打包 Web 浏览器探针（AT-18/19/20）仍阻塞**，根因经经验确认：experts/治理 Host 的 tsc `dist` 运行时裸导入 private 的 `workdsh-contracts`（`install-preview.mjs` 不 pack contracts），且治理三包从未在打包 Profile 装配。已录入 [ADR-0019](../adr/0019-installable-host-self-containment-and-governance-assembly.md)，待批准后按 ADR 收口。
- **未执行**：AT-13/AT-23 真实模型与真实 Host persona 运行探针；AT-09/AT-21 跨插件停用/卸载影响与导入导出反例的端到端验证。
