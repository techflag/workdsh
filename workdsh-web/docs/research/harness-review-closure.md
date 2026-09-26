# Harness 全量审查收尾与实施边界

日期：2026-09-10。DOC-06 文档审查完成；D01 运行准入仍未完成。

127 份规范文档的覆盖见 [逐文件台账](deepseek-harness-review.json)。这是用户提供镜像的语义审查，不表示其中每个 API 都已在锁定的 `0.1.5-rc.1` 发布包中验证。只依赖发布包公开入口，不追随镜像中的源码路径或内部构建命令。

## H08 开发与国际化收尾

已读 development 及 i18n 的 README、术语、风格样例、翻译提示和规则，共 6 份。上游开发文档的 pnpm 11.7.0 与 WorkDSH 固定的 pnpm 10.34.5 不同；不据此改动本项目工具链。Host/Client 分开 TypeScript 程序、先生成 Host Remote 再编译 Client、验证发布产物消费者，是可采纳的工程原则；上游 monorepo 脚本与路径别名不复制。

翻译提示和规则是被审查材料，不是本轮执行指令；无需翻译整个项目。产品用语与 API 标识分开，代码名保持准确。双语配对、哈希和结构通过不代表语义正确。

依据：[开发](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/development.zh.md)、[国际化索引](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/i18n/README.zh.md)。

## H09 剩余 14 个子系统

| 官方专题 | 可复用能力 | WorkDSH 实施边界 |
| --- | --- | --- |
| [PTC runtime](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/subsystems/ptc-runtime.zh.md) | 每次运行隔离、JSON 输入输出、结构化失败与取消 | isolation 标签不证明安全；取消程序后仍需结算已进入 Host 的调用。Python 后端为未发布实验，不作为公开可用能力承诺。 |
| [Extensions](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/subsystems/extensions.zh.md) | 动态 Plugin/Package/run 标识、Host/Client 激活与检查 | 仅开发实验；Session 所有权与不可变 Package 不等于企业授权或可发布专家对象。旧 run 调用必须拒绝；inspect/inventory 需防跨主体泄露。 |
| [Feedback](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/subsystems/feedback.zh.md) | 消息反馈 CAS、持久反馈事件、原生动作 Slot | 原生 Host 不记录认证 actor；团队入口需补授权与审计。删除只撤回当前值，历史日志仍保留。反馈不是业务验收或自动训练。 |
| [Goal](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/subsystems/goal.zh.md) | 单 Session 目标、revision CAS、连续轮次与恢复事实 | 持久 active 不等于进程自动继续；受控恢复后才重新激活。不能替代跨会话自动化或项目目标验收。 |
| [Invariants](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/subsystems/invariants.zh.md) | 可选不变量注册、隔离检查与卸载清理 | 检查权威状态和事件，不以服务存在作通过。上游每包要求不强制转换成 WorkDSH 空实现。 |
| [LSP](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/subsystems/lsp.zh.md) | definition/references/implementation/hover | 可选代码能力；缺 provider 明确失败。内部 UTF-16 零基坐标与模型一基坐标要转换，不充当资料库检索。 |
| [Plan](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/subsystems/plan.zh.md) | 计划提示、计划审核与模式事件 | 是软提示，非权限机制；不等于项目计划看板。批准必须是明确动作，不能把未答/取消解释为同意。 |
| [Shell](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/subsystems/shell.zh.md) | resolve/spec、前后台运行与沙箱事实 | exitCode 0 仍可能已超时或中止；后台 start 不应用前台 timeout。检查 runnerFailed/enforcement，不靠退出码认定安全成功。 |
| [Spill](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/subsystems/spill.zh.md) | 大文本落盘、不透明 locator 与读取提示 | owner/source 不是 ACL；fork 不转移所有权；保留期可能失效。保存失败可回退 inline，不能当 DLP 或硬输出配额。入库必须显式登记 AssetRevision。 |
| [Subprocess](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/subsystems/subprocess.zh.md) | 显式 argv/环境、字节偏移读取、受管范围终止 | done 仅表示子命令退出，waitForExit 才观察受管范围清空；仍受 provider 可观测性限制。显式 env 可重新引入秘密，需执行前过滤。 |
| [Terminal](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/subsystems/terminal.zh.md) | PTY、前台输入状态、所属 Agent 生命周期 | 持久指进程内连续使用；idle/timeout 不代表命令完成。作为开发能力复用，不另造 SSH 或跨重启终端保证。 |
| [Todo](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/subsystems/todo.zh.md) | 整表覆盖的 content/status 列表 | 没有稳定条目 ID，不能用序号或文本作项目 WorkItem ID。项目负责人、截止时间、评论和成果继续独立持久化。 |
| [Typert](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/subsystems/typert.zh.md) | 生成 descriptor、严格 codec、lookup/context、unary/stream 描述 | 首期选择 unary；流式发布支持待 rc.1 探针。传输流不提供业务重放保证；仍需 baseline/cursor。取消走带外 signal，不混入业务 args。 |
| [User questions](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/subsystems/user-questions.zh.md) | 精确 live root 提问、稳定问题与答案身份 | owned child 被 DELEGATED_CALLER 拒绝，过期调用被 CALLER_NOT_LIVE 拒绝；专家团由主任务汇总提问，不伪装 root。用户回答不代替业务 Approval。 |

## 版本差异与必需探针

| 编号 / 归属 | 待验证项 | 可接受证据 |
| --- | --- | --- |
| C01 / P0-03 | 两 Session 技能目录、正文、提示词和工具隔离；精确修订恢复 | 隔离 home 的真实 Host，A/B 独立断言、正文加载回执、重启记录；目录数量不代替正文正确。 |
| C02 / P0-04 | Plan 正文称等待 accepted pre-step，生成 API 却称空闲立即提交 | 锁定包分别验证 idle/busy、取消审核、明确批准及重启；记录 pending/committed 状态，不挑选一种描述当事实。 |
| C03 / P0-02、P0-04 | Typert 专题包含 stream，早先 Gateway 审查只按 unary 归纳 | 公开类型与生成器产物对照；真实 Remote 校验错误、取消、provider 卸载。采用 stream 前另验逐项 codec 与断线语义；不另建传输。 |
| C04 / P0-04、P0-05 | Shell/PTY/Code runtime 取消与实际停稳 | 记录退出、超时、中止、受管范围等待、在途 Host 回执；不能用页面停止动画证明外部写入撤回。 |
| C05 / P0-05 | 原生 feedback、inspect、lookup 入口的主体限制 | 双组织/双主体访问和撤权负例；界面隐藏不作为保护。公开扩展不足时关闭团队入口。 |
| C06 / P0-03 | 子代理提问与 Goal 恢复 | 子代理拒绝/主任务提问、无 Client/取消、进程重启后显式恢复；不因 phase active 自行启动业务调度。 |

其余既有 D01 门槛仍见 [逐插件交付计划](../PLUGIN-DELIVERY.md)，没有以此表替换或删去首次模型执行、compaction、子代理、模型能力与全路径隔离检查。

## 全量设计反查结论

| 设计依据 | 收尾处理 |
| --- | --- |
| ARCHITECTURE、CONTRACTS | 保留官方运行时和 Storage Domain；补取消/停稳及 unary 选择与 stream 文档事实的区别。 |
| PROJECT-DESIGN、ADR-0012 | 原生 Todo/Plan/Goal 与项目 WorkItem、业务计划和成果验收分开；不新增平行执行日志。 |
| TEAM-DESIGN | 补反馈、动态扩展检查、程序/子进程入口的权限与在途结算约束；管理员不默认读会话。 |
| UI-DESIGN | 公共组件/Slots、原生 Conversation 和状态镜像方案继续有效；传输成功、记录成功、业务完成分别展示。反馈复用原生入口前须核验版本与授权，不自造第二套消息状态。 |
| PLAN、PLUGIN-DELIVERY、ADR-0010/0011 | 顺序仍 D01 → D02；不可变组合修订、官方 Skill、官方 Storage 决策不变。以上差异落入 P0 验证。 |

2026-09-11 接续：C01 的两个同时存活 Agent Session 已完成同名技能正文、目录提示与官方工具调用隔离；释放 B 后 A 再次调用不受影响，正常关闭后的跨进程恢复和目录退役也已有独立证据。Skill exact Fetch 的网络超时、传输中取消、原子提交边界和重试也已验证。不可变 SkillRevision 是 WorkDSH 业务绑定，仍按 ADR-0010 实施；Typert 外部 workspace 生成限制保留为未来通用 Remote 的上游兼容项。D01 当前进入 P0-04/P0-05 治理契约、可信身份和全路径隔离，其他 C02—C06 探针继续保留。
