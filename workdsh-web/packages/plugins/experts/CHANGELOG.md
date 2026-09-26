## 0.1.0-alpha.9 — 2026-09-25

- 将专家与官方 Team 接入按 DSH 0.1.7-rc.2 的公开接口重新打包。

## 0.1.0-alpha.8 — Unreleased（2026-09-22）

- 统一管理操作与表单：复用 Harness 原生 Button/Input，Select/Textarea 共用 workdsh-ui；声明原生 UI 依赖，保持主题与交互语义。

- 页面、卡片、按钮及详情/编辑弹窗改用原生主题语义颜色，支持明暗即时切换。
- 适配 DeepSeek Harness 0.1.7-alpha.1、Cordis 4.0.3，更新精确依赖。 专家使用官方声明式预设注册表，冻结配置并在重启时恢复；旧目录修订需重新发布。

## 0.1.0-alpha.7 — Unreleased（2026-09-20）

- 按用户决定删除能力中心「行业应用」标签入口（行业应用暂时用不到，暂无领域实现）；能力页工具栏保留专家/技能/连接器三个标签。

## 0.1.0-alpha.6 — Unreleased（2026-09-20）

- 修复设置面板出现两个「Agent 预设」页：`settings.section` 是增量 list 槽（每次注册各自成页，无替换语义），PresetMenu 对它的包装注册只会在官方页旁再生成一个同名页。现移除该包装注册，仅保留 `conversation.hero.agentPreset` 单座槽的接管（专家预设过滤与设为默认/复制守卫继续生效）；设置页列表回到官方 Host 行为。
- 测试同步：`expert-native-presets` 断言单一注册并新增防回归检查（注册项不得包含 `settings.section`）。

## 0.1.0-alpha.5 — 2026-09-18

- 适配 DeepSeek Harness 0.1.6-alpha.2：成员与子代理根会话改用官方 `sessions.subagentAddress` 解析；打开专家会话改用官方 `uiWorkspace.openSession` 导航。

## 0.1.0-alpha.4 — 2026-09-16

- 增加专家团长任务、浏览器重连、人工停止后原成员继续、任务与消息交接、失败及 Host 冷恢复验收。
- 增加显式真实模型验收，真实 lead、analyst 与 reviewer 完成两阶段官方 Team 任务交接。
- 验收凭据只进入一次性 DSH Home，退出时清理并对日志脱敏。

## 0.1.0-alpha.3 — 2026-09-15

## Unreleased — DSH 0.1.6 official Team migration

- Replace the custom team executor, SOP runtime, delegation tools and provider with official Agent Teams, its nine tools and its Web panel.
- Compose published member personas and pinned skills through official Agent-scoped plugins; preserve asset authorization, old revisions and history.
- Remove the duplicate team activity bar and clean obsolete runtime output before packing.
- Add real Loader/AgentLoop cold-resume probes and independent Web Profile verification. Paid-model professional acceptance remains separate.


- 专家管理内置技能迁入统一 `resources/skills/workdsh-expert-manager` 目录。
- 调整创建菜单、草稿审阅和详情折叠区，并更新隔离安装与冷启动探针。
- 统一专家弹框外观；TM-01 真实模型整体验收仍未完成。

## 当前 preview 候选（未发布）

- 专家管理内置技能迁入 resources/skills/workdsh-expert-manager，正文及运行资源保留，统一工程目录。

# Changelog

## 0.1.0-alpha.1 — Unreleased candidate

- Strengthen reusable public expert creation: derive methods and actual capabilities from needs, preserve source metadata and distinguish supported facts from future promises.
- Document bounded real-model trials, actual outputs and open findings; model self-review does not guarantee professional correctness. No automatic publication or case-specific financial Skill is added.

- Select real installed Skills with search, availability, cancellation and stable references; removing an expert reference never uninstalls the shared Skill.
- Present expertise, task examples and real equipped Skill descriptions separately from the editor.
- Authorize catalog selection per expert and omit filesystem paths from catalog responses.

- Compact expert dialogs, remove duplicate close controls, and fix example fields and responsive tag layout.
- Verify published persona and frozen Skill consumption in the official Agent Loop using deterministic model I/O; keep full Loader and remote-provider acceptance pending.

- Preserve full model-facing authoring results and CAS tokens; link directly to a draft without granting publish authority.
- Verify explicit browser publish confirmation, frozen Skill revision summon, and cold restart persistence.
- Add local expert management, immutable revisions, native task binding, and shared Host management tools.
- Assemble independent governance Profile layers and initialize services through Cordis plugin lifecycle.
- Validate bound presets and Skill dependencies at the public agent pre-step hook.
- Address native draft handoff to one Session, preserving existing input and clearing consumed handoff.
- Reuse verified frozen preset artifacts and reject unexpected composition changes.
- Verify packaged Web UI and two cold restarts; real model and complete failure/uninstall acceptance remain pending.

- C候选：专业经验及必要追问创建指南，真实Host目录管理工具，完整已保存草稿使用预览与摘要变化阻断；原生任务/受信UI明确发布继续保留。

- D candidate: require healthy official standard mode rather than silently falling back; reject tasks after equipped Skill disablement.
- Add explicit synthetic real-model acceptance, independent numeric/artifact checks, documented v3 tool receipts and completed-turn checks. Three completed scenario logs and cold-restart bindings verified; professional report review still has open findings.
