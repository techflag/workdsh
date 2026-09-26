# D01 / P0-03 预设探针

> 2026-09-12 收口说明：后续同文证据已补齐 Skill 正文按需加载、Session 冷恢复和两个存活 Session 的同名 Skill 隔离。本文件中的阶段性“仍未验证”保留为当时记录；本地 P0-03 已完成，企业授权另行验收。


状态：部分验证；使用 @deepseek-ai/dsh-agent-presets@0.1.5-rc.1 根导出的公开函数，未读取私有实现、未修改上游。

## 第一组：发现与创作

命令：`node --test tests/integration/preset-authoring.test.mjs`。

实际调用 discoverPresets、copyComposition；临时系统根与用户根在测试结束删除，不访问业务预设。配置使用空插件列表，仅验证文件发现/创作，不作为可用 Agent。

已通过：合法预设发现；复制出两个不同 ID 和显示名；SKILL.md 资源完整复制；重复 ID 拒绝覆盖；../ 路径拒绝；修改 A 的资源不影响 B；无效组装保留 broken 原因。没有模拟这些函数。

## 尚未验证

Host 服务授权与 Remote 调用、技能运行注册/按需读取、真实 Session 创建、空/非空切换、原生工具执行、重启恢复、两会话运行状态隔离。文件副本独立不能算运行隔离通过。下一项为原生服务挂载与会话接口验证；真实模型执行单独记录，无密钥不伪造通过。

## 第二组：公开投影与调用边界

`tests/integration/preset-projection.test.mjs` 调用公开根导出的 agentPresetProjectionDefinition，以受控事件验证：创建时 A、选择事件 B，投影结果为 B；无关事件不改变结果，重复重放一致，创建头不变，无预设时为 null。`pnpm test:integration` 本轮 3/3 通过。这是投影函数测试，不是磁盘 Session 恢复或 Host 重启验证。

核对发布包 lib/types/index.d.ts 和 session.d.ts：

- AgentPresets 注入 loader、sessionProjections；真实挂载必须由原生 Agent 创建 setup 窗口完成，不能伪造 Context 宣称集成通过。
- recompose 只负责重挂载，调用者负责空会话检查。工作台的会话选择应通过受保护的 select/公开会话入口完成，不向 UI 直接暴露 recompose。
- select 声明按会话串行检查、挂载并记录；locked 等错误仍待真实服务负例测试。
- 恢复依据 agentPreset 投影，不只读取创建头；投影中的 ID 不构成不可变配置修订，重启后的精确修订恢复仍未验证。

下一步固定为隔离 Host 下真实 Session 创建和技能发现，再验证 select 的空/非空边界；当前没有新增业务入口。冻结安装通过；产品构建、浏览器和模型测试本轮未执行。

## 第三组：官方 Host、空会话切换与 Skill 目录

命令：`pnpm probe:presets`。探针使用隔离 DSH_HOME 和官方 Web Profile，通过发布包的 discoverPresets/copyComposition 创建两个用户预设：WorkDSH Skills 复制 Cordis，WorkDSH Minimal 复制 Minimal。测试只为无界面目录选择器预置一个临时 Workspace v2 存储夹具；启动后的预设选择、Session、Remote 和技能目录均由官方 Host/Client 实现，未注入模拟响应，未调用模型。

真实 Chromium 已验证：

- 原生预设选择器同时列出两个本地副本；选择 WorkDSH Skills 后创建真实空白 Session。
- `/api/agentPresets/select` 返回成功，切换由官方选择入口提交。
- `/api/skills/list` 在 Skills 组合下返回 15 项，其中包含随 preset 复制的 `cordis-plugin-development` 与 `editing-cordis-compositions`；官方 `/` 菜单显示这些条目。
- 同一空白 Session 切到 Minimal 后，新的 `skills/list` 返回 0 项，两项 Cordis 技能消失；切回 Skills 后目录重新返回 15 项，证明官方选择事件触发了技能目录失效与重读。
- 探针显式移除模型密钥；提交一条用户消息后，官方界面产生 `MISSING_CREDENTIAL` 本地错误并留下非空会话记录。随后对同一 Session 请求切到 Minimal，官方 Host 返回 `agent-preset/locked`，验证非空会话不能换组合。
- 停止并以同一隔离 DSH_HOME 重启官方 Host 后，直接对原 Session 调用官方 `skills/list` 仍返回 15 项并包含两项 Cordis 技能，验证选择事件投影和技能组合可以跨 Host 重启恢复。
- 停服后把同一 `workdsh-skills` ID 的组装文件替换为 Minimal，再次重启并查询原 Session，技能数变为 0；恢复原文件重启后又返回 15 项。这证明 Session 跨重启解析的是 ID 对应的当前文件，不是原组合的不可变快照。
- 在确认原文件恢复为 15 项后停服并删除该 preset，重启查询原 Session 时 `skills/list` 返回 `ok: true` 和空数组，而非明确的缺失错误。WorkDSH 不能依赖该响应保护历史任务。
- 截图：`.artifacts/preset-skills.png`。它是官方浅色会话界面中的运行探针，不是 WorkDSH 最终 UI 设计稿。

这组证据支持“官方 Skill 子系统是 WorkDSH 唯一技能执行底座”，也否定“相同 preset ID 可安全原地升级”的假设。修订和保留策略已固化到 [ADR-0010](../adr/0010-immutable-preset-revisions.md)。本轮没有模型调用成功，也不把缺少密钥产生的错误算作模型验证。仍未验证：技能正文实际加载和模型消费、两会话运行状态隔离、团队授权，以及 ADR-0010 的 WorkDSH 层实现。P0-03 继续保持 in_progress。
## C01 官方能力复用记录（2026-09-10）

- 任务：D01 / P0-03，两 Session 目录隔离、技能正文按需加载。
- 官方依据：[Skills](../dsh-v0.1.6-alpha.2/subsystems/skills.zh.md) 与 [Core/preset](../dsh-v0.1.6-alpha.2/subsystems/core.zh.md)；发布包 `dsh-agent-presets`、`dsh-skill`、`dsh-skill-filesystem` 均为 `0.1.5-rc.1`。使用包根公开导出、原生选择 UI、已观察到的 `agentPresets/select` 与 `skills/list` Remote。
- 选择：直接复用官方 registry/provider/preset；自有代码只增加测试断言，不实现技能解析器、目录服务或 Agent loop。新增两个精确 devDependencies 供测试消费。
- 自有业务差异：正式 skills 插件仍需不可变 SkillRevision、组织授权及任务绑定；本轮不实现这些业务服务。
- 验收范围：真实 Host 双 Session 查询与 B 切换不影响 A；独立发布包测试读取正文、修改后再次读取、旧结果不变、取消拒绝、provider 卸载不可再用。独立注册表测试不是 Session 内模型工具调用或团队隔离证据。

结果：`corepack pnpm test:integration` 4/4 通过；`corepack pnpm probe:presets` 完整通过，日志为 `.artifacts/preset-probe.log`。A/B 使用不同 Session ID 并在同一 Host 查询，A 可见 Cordis 技能，B 初始目录为空；B 切换到 Skills 后可见 Cordis 技能，A 前后目录逐项相等。现有非空锁定、重启、原地改写与删除行为回归通过。

正文测试使用官方包根导出与真实临时 SKILL.md，关闭默认根和 watcher；目录不含正文，正文修改后目录未变但 get 返回新正文，首次结果不变。取消拒绝、提供方 disposer 后目录为空且正文不可加载。该测试不包含模型调用、运行中 Session 的 tool-skill 消费、业务 SkillRevision 或团队授权。

测试基础设施修复：使用显式 browser context 支持两个页面，新页面与新会话分别处理原生“Configure later”引导；未使用 force click 或隐藏官方 DOM。首次失败属于测试交互错误，最终完整重跑通过。
# C01 补充复用记录：同名技能正文 scope 隔离（2026-09-10）

P0-02 外部 Remote 生成遇到已复现的发布包识别边界，仍保留失败门槛。本轮在同一 D01 内继续独立的 C01，不开始 D02。

- 官方依据：本仓库 `docs/dsh-v0.1.6-alpha.2/subsystems/skills.zh.md`；发布包 scope 与 skill 的公开声明。
- 复用：rc.1 `dsh-scope.createScope`、`dsh-skill`、`dsh-skill-filesystem`；直接注册官方文件提供方，不自造 registry 或解析器。
- 自有差异：仅测试 fixture，两个无身份含义的 scope 与不同临时目录；同名技能由 scope 选择。
- 验收：两个 scope 并发读取同名技能得到各自正文；全局视图无该私有技能；卸载 B 不影响 A，B 无同名全局回退时不可读取。
- 限制：不证明 Session 内工具消费、模型提示词、组织权限或任意文件访问隔离；这些门槛保留。

执行结果：`corepack pnpm test:integration` 5/5 通过。新增用例确认上述两个 scope 的正文及卸载隔离；未启动模型或 Session。下一步验证官方 skill 工具在实际 Session 中的消费与持久目录，避免把 registry 测试扩称为完整专家隔离。
# C01 复用记录：真实 Agent loop 中消费 skill（2026-09-10）

本次使用锁定 rc.1 的 agent、agent-loop、session、session-projection、system-prompt、tools、tool-skill 和 llm 公开入口，按官方 Agent `create/setup/followup/whenIdle` 驱动。官方依据为上述发布包 README/公开类型及本地 skills/core 文档。自有代码仅是固定响应的测试 LlmAdapter 与断言，不新增执行循环、工具实现或会话存储。

验收：模型请求目录包含技能名称但没有正文；官方 skill 工具执行后，下一请求获得规范正文；Session 公共事件记录保留目录、调用及结果。测试使用临时目录、固定本地响应、不进行网络请求。此项不代表真实模型质量或磁盘重启恢复；后续分别验证。

结果：`tests/integration/skill-session.test.mjs` 正反例 2/2，通过完整 `test:integration` 7/7。允许分支校验首个请求的 tool schema、目录不含正文、官方工具结果与 `skill-probe-call` 关联，下一请求及 Session 公开 `snapshotEvents()` 包含正文。拒绝分支设置官方 `disable-model-invocation: true`，模型目录无该技能；测试适配器仍请求它时，工具返回 isError，正文不进入任何请求或事件。没有手工执行工具实现或写入 Session 结果。

使用公开 `ctx.agents.create({ sessionId, agentOptions, setup })`，在 setup 挂载官方文件提供方及 tool-skill；用 followup/whenIdle 驱动，并在 finally dispose。SessionStore 未挂磁盘提供方，因此“事件保留”仅指当前内存日志，不宣称已经证明落盘或进程重启恢复。初次运行因缺少 sessionId 失败，按公开契约提供 UUID 后通过。

下一项为官方 Session persistence 的保存/冷恢复和目录退役；Remote 生成仍有独立兼容阻塞。产品 build/typecheck、版本检查、冻结安装通过；真实模型、浏览器及外部服务未执行。

# C01 复用记录：两个 live Agent Session 的同名技能调用隔离（2026-09-11）

继续复用 rc.1 的 `dsh-agent`、`dsh-agent-loop`、`dsh-skill-filesystem`、`dsh-tool-skill`、`dsh-session`、`dsh-tools` 和 scope 生命周期。自有代码只增加固定本地 LLM adapter 与测试断言；没有实现第二套 Agent loop、技能 registry、工具执行器或 Session 状态。

测试同时创建 A/B 两个官方 Agent Session，各自在自身 setup scope 挂载名称同为 `sample` 的文件技能，正文分别包含 `SESSION_SCOPE_A` 和 `SESSION_SCOPE_B`。两个 Session 并发通过官方 skill 工具调用后，各自事件只包含自己的正文。随后 dispose B，A 再次发起完整模型—工具—模型回合，仍只读取 A 正文；A 共完成两次调用，B 只完成一次，释放 B 没有撤销 A 的 provider 或污染 A 的历史。

`tests/integration/skill-session.test.mjs` 专项 3/3 通过，完整集成回归 19/19 通过。该证据完成 C01 的 live Session 同名正文、提示词目录与工具调用隔离部分；正常关闭后的跨进程恢复和目录退役已有上一节证据。WorkDSH 业务层的不可变 SkillRevision 绑定与团队主体授权仍属于后续契约，不能由本测试代替。模型 I/O 为固定本地 adapter，不代表真实模型效果。
# C01 复用记录：落盘冷恢复与目录退役（2026-09-10）

使用 rc.1 `dsh-session-persistence-jsonl` 官方根入口，配置隔离临时 root 与 compression=none；复用 `sessionPersistence.open/flush` 和 `agents.resume`，不解析或写入物理日志。依据为发布包 README、handle 公开类型及本地 Session 文档。本轮测试将第一次运行与恢复放在独立 Node 进程，模型继续使用固定测试适配器。

自有差异仅测试进程编排和断言。验收：首次工具调用结果由官方组件落盘；退出进程后通过官方读取恢复一致的事件前缀；删除临时技能目录后继续运行，官方工具产生错误并记录空目录；历史结果保留。撤销技能不能抹掉已经进入历史的正文，此点不得误写为权限撤销或秘密擦除保障。


结果：集成全集 8/8。新增冷恢复测试通过四个独立进程验证创建→读取→恢复执行→再次读取；两次持久化读取与对应内存事件数组完全一致，恢复前缀保留。退役后的 skill-catalog entries 为空，surfaceOp 实测为 append，历史正文仍在，新的 skill-resume 结果为 isError 且不含正文。未手工构造事件或操作日志文件。

首轮冷读取暴露测试 followup 对象缺少 id/role，按公开 UserMessage 契约使用 dsh-llm.createMessage 修复两个测试入口；这不是官方持久化缺陷。初稿误将目录退役 surfaceOp 预期为 replace，实测为追加事件，已修正断言。测试依赖 dsh-session-persistence-jsonl 精确 rc.1；公共模型适配器与装配导入抽取到 tests/helpers/skill-runtime.mjs。

边界：仅正常 flush/dispose 后进程重启，不模拟崩溃或证明 fsync 极端故障；固定模型不证明真实模型效果、授权或团队数据隔离。build/typecheck/版本检查通过。下一项验证两个存活 Agent Session 的同名技能调用与卸载隔离，D01 不整体完成。
