# 专家领域契约设计记录

本文保存单专家最初的契约设计，**不是 Harness 官方 API**。单专家现已实现，实际名称、参数和导出以 [packages/contracts/src/experts.ts](../../../packages/contracts/src/experts.ts) 与对应 Host 测试为准；下文历史“拟新增”不能用于判断功能尚不存在，也不得直接覆盖当前实现。团队新增契约见 [实施入口](TEAM-IMPLEMENTATION-HANDOFF.md)，先建校验和契约测试，再实现 Host，最后接 UI/工具。

## 1. 对象与字段

TM-01新增已实现Host契约：`reserveDelegation`/`claimDelegation`及ExecutionBinding可选delegation（parentSessionId、parentCompositionDigest、admission=reserved|claimed）。它们只负责一次性业务准入，不是Team/SOP服务，不暴露Remote或模型工具；原生日志拥有执行状态。准确参数与边界见实施入口开头；历史表未重复列出增量。第五批在专家插件内部新增（尚未进入公共契约/Remote）：`workdsh_expert_teams`存储域与TeamRunsManager运行服务（open/delegate/review/abandon/deliver/authorizeDelegation，签收/交接/交付三闸门重读文件字节校验）、六项AI可调用工具`workdsh_expert_team_*`、插件托管的one-shot委派provider；运行事实仍归Harness日志，团队对象仅存业务修订/绑定/尝试/回执。

| 对象 | 必须字段/语义 |
|---|---|
| Expert | id、owner、origin、availability、draftRevision、publishedRevisionRef、createdAt/updatedAt；稳定 id 与名称分离 |
| ExpertDefinition | name、description、avatarRef?、role、methodology、boundaries、deliverables、tags、categoryId?、examples、skillRequirements、futureRequirements |
| ExpertDraft | expertId、revision（CAS token）、definition、validationIssues；可保存未完整定义 |
| ExpertRevision | expertId、revisionId、definition、definitionDigest、dependencyLock、dependencyLockDigest、presetRevisionRef、compilerVersion、publishedAt/by；不可修改 |
| ExpertSummary | id、name、description、avatarRef?、origin、availability、publishedRevisionRef?、canUse/canEdit/canManage、readiness；不把正文用于列表传输 |
| ExecutionBinding | sessionId、expertRevisionRef、presetRevisionRef、compositionDigest、skillRevisionRefs、owner、workspaceRef?、createdFrom?、creationOperationId；不可重绑定 |
| ExpertPreference | principalId、expertId、pinned、lastUsedAt?；最近以已接受的首条业务 prompt 记一次 |
| Operation | operationId、actorRef、action、payloadDigest、phase、resultRef?、error?、auditDelivery、updatedAt；持久重试和对账 |

枚举：origin=`default|personal|organization`（organization 预留）；availability=`enabled|disabled|archived`。对象尚未有 publishedRevisionRef 时是草稿，不等于 enabled 后可执行。readiness=`ready|missing-dependency|unsupported-capability|broken|unknown`，权限另行表达。

owner 直接使用现有 `ResourceOwner`；只有 Host 设置。avatarRef、资源引用与内部 preset 路径不能混用。名称允许重复但目录显示来源；导入/复制生成新 ID，默认在名称后加“副本”，不以名称覆盖旧对象。

```ts
// 拟新增。与现有治理类型一起从受支持的公共 exports 暴露。
type ExpertRevisionRef = Readonly<{ expertId: string; revisionId: string }>;
type SkillRevisionRef = Readonly<{
  skillId: string; revisionId: string; name: string; contentDigest: string;
}>;
type DomainIssue = Readonly<{
  code: string; path?: string; message: string; dependencyRef?: string;
}>;
type MutationContext = Readonly<{
  operationId: string; expectedRevision?: string;
}>;
type ConfirmationProof = Readonly<{ token: string }>;
```

Digest：SHA-256；文本保持存储时的 UTF-8 字节，不在摘要阶段再次 trim。清单 JSON 键按规范排序，数组保持声明顺序；文件路径用相对 POSIX 路径按字节序排序；文件项含 path/byteLength/sha256。头像、正文、依赖清单、编译器与运行包版本均纳入相应摘要。版本号/更新时间不是内容摘要替代品。落地提供跨进程固定 fixture。

### 定义的机器可读形状

[JSON Schema](expert-definition.schema.json) 与[原创示例](example-expert-definition.json) 固定本方案的字段形状：role/methodology/boundaries/deliverables 是字符串；examples 为 id/title?/prompt 对象；skillRequirements 为 name/skillId? 对象，所有显式声明的 Skill 均在发布时锁定并按必需依赖检查。发布前 name 必须经本机目录唯一解析为 skillId，歧义要求用户选择，不能任意挑第一个。未来引用只有 kind/key/required/description，不保存凭据。

该 Schema 是设计制品，没有接入现有运行包。草稿允许缺失发布必填字段；发布校验使用完整 schema 并额外检查总 UTF-8 大小≤32KiB、示例 id/技能语义去重、真实 categoryId、权限/依赖/确认、图片资源存在性。Schema 的字符串 maxLength 按 Unicode 字符计数；运行端和 UI 须使用同一口径。不要以通过 JSON Schema 代替授权或完整发布校验。

## 2. ExpertsService 方法语义

Host 内部方法都有 `actor: ActorContext` 和可选 `signal`；传输层先解析 actor，**Client/模型输入没有 actor/owner 参数**。以下名称为设计契约，最终统一导出，不能临时分叉两套实现。

| 方法 | 主要输入 | 返回及边界 | 权限 |
|---|---|---|---|
| list | query、origin?、availability?、categoryId?、cursor?、limit | 摘要、可见总数、nextCursor、catalogRevision；稳定排序 | read，按行过滤 |
| get | expertId、revisionId? | 有权限的详情、修订与操作能力；无用量服务不造字段 | read |
| createDraft | definition?、operationId | 新 expertId/草稿；Host 赋个人 owner | 创建自身对象 |
| updateDraft | expertId、expectedRevision、patch、operationId | 新草稿 revision；旧 revision 返回 conflict | edit |
| copy | expertId、revisionId?、operationId | 新个人草稿，保留来源引用；不自动发布 | read + 创建自身 |
| validate | expertId、draftRevision | issue[]、definitionDigest、依赖清单与锁摘要；无副作用业务执行 | edit |
| publish | expertId、draftRevision、dependencyLockDigest、proof、operationId | 固定发布 revision；校验/确认过期不能成功 | manage |
| setAvailability | expertId、expectedRevision、availability、operationId、proof? | 新 availability revision；归档须明确确认 | manage |
| setPreference | expertId、pinned、expectedRevision? | 当前主体偏好；不改发布修订 | read |
| prepareExecution | expertId、revisionId?、workspaceRef?、modelSelection? | 短期 executionPlanId、固定版本、缺失项；不创建 Session | use |
| createExecution | executionPlanId、operationId | binding、sessionId、handoffId；同键返回同任务 | use，重新授权 |
| prepareHandoff | sourceSessionId、targetExpertId、sourceEventRef、selectedAssetRefs | 可审阅交接草案；不读取未授权历史 | 源 read + 目标 use |
| createHandoff | handoffPlanId、reviewedSummary、operationId | 新 Session 及来源关系；不重绑定旧任务 | 同上，重新授权 |
| previewImport | uploadedArtifactRef | 候选定义、字段错误、依赖缺失、importPlanId | 创建自身对象 |
| commitImport | importPlanId、previewDigest、operationId | 新个人草稿；不直接发布/安装依赖 | 同上 |
| export | expertId、revisionId? | 不含凭据的归档文件；只导出有权的定义/自有资源 | read |
| operation | operationId | 当前主体可见的操作结果，不重执行 | 操作 owner |

limit 默认 50，最大 100；搜索长度≤200 字；cursor 绑定过滤与 catalogRevision，失效返回 `cursor-stale` 并允许重新加载。初期本地内存筛选即可，不为 1,000 个摘要引入搜索服务器。

`prepareExecution` 计划默认有效 10 分钟，固定选定 revision 和 model selection；可用性、权限与依赖在创建和执行时再次检查。过期需重新准备，不默默更新计划内容。

`archive` 表达为 availability 变更，不公开无确认的永久删除。旧 Session、专家团或导出操作仍引用的 revision 不得 GC。启用操作先验证完整依赖，失败不将按钮改为绿色。

## 3. Skill owner 需要补的公共适配

| 拟新增能力 | 契约要求 |
|---|---|
| resolveRevision(skillId, expectedDigest?) | 读取一致的 SKILL.md 与资源快照，返回稳定 ref；编辑中不能拼接前后两代内容 |
| retainRevision(ref, consumerRef) | 建立幂等引用，返回 scoped provider 可消费的受管引用；不暴露任意路径写权限 |
| checkRevision(ref, actor) | 区分完整性、来源启停和最新使用授权；冻结内容不冻结权限 |
| releaseReference(ref, consumerRef) | 仅释放该消费者；没有可达引用才允许清理 |
| dependencyImpact(skillId) | 用于已有卸载影响检查；专家已发布定义、任务和团队引用都能参与 |

这里是 **D04 的依赖适配工作**。不能把现有文件编辑 digest 当成已持久的修订 ID；也不能调用当前包中不存在的 `skills/revisions` 导出。快照仍交给官方 Skill provider/tool 加载，不另造执行器。失效来源与保留副本关系必须在停用/卸载 UI 中准确说明。

## 4. 状态、幂等与取消

操作 phase=`prepared|applying|committed|failed|reconciling|cancelled`。超时不是 phase 的终态；重连查询 operation。phase 只描述管理操作，不代替原生模型任务执行状态。

同 actor、action、operationId、相同 payloadDigest 返回原结果；同键不同内容返回 `idempotency-conflict`。提交结果保留至少与目标对象同生命周期；已完成 ID 不因短时 TTL 到期再次执行。过期准备计划可清理，已创建 Session 的映射不可清理为“从未执行”。

- 读取和预检：可取消，无业务写入。
- 草稿/发布/导入：原子提交前取消可清理；提交后返回 committed，不能撤销事实。
- Session 创建：官方 create 没有 signal，若调用已发出则查询精确 SessionId；取消 UI 等待不代表取消创建。
- 写入得到结果但审计汇出尚未确认：committed + auditDelivery=pending，按稳定 eventId 重试，不能再次写业务。
- 未知结果：reconciling；禁止自动使用新 operationId 重试。发现同 SessionId 的内容不匹配时人工可读错误并停止，不“采用”其他任务。

公开错误建议固定 code：`experts/not-found`、`forbidden`、`conflict`、`invalid-definition`、`dependency-missing`、`dependency-disabled`、`dependency-drift`、`unsupported-capability`、`not-published`、`disabled`、`archived`、`preset-broken`、`confirmation-required`、`confirmation-stale`、`plan-expired`、`idempotency-conflict`、`cursor-stale`、`outcome-unknown`、`unavailable`。实际 wire 使用同一 `experts/` 前缀；UI 按 code 映射，不解析 message。错误不泄露其他 owner 的路径/内容。

## 5. 管理工具与 expert-manager

管理技能负责澄清和呈现，工具负责提交结构化字段。建议工具集：`expert_list`、`expert_get`、`expert_create_draft`、`expert_update_draft`、`expert_validate`、`expert_request_publish`。注册名称须符合当前 Harness Tool schema，测试后固定。

`expert_request_publish` 创建可审阅请求或经官方审批桥继续；没有用户确认记录时只能返回 needs-confirmation。工具不能接收任意代码、执行 shell、写插件目录或签发自己的 approval token。页面和工具同一 `ExpertsService` 调用，返回稳定对象 id/revision/issues，不能只返回“创建成功”文本。

发布确认至少绑定：主体、资源、动作、草稿 revision、内容与依赖摘要、过期时间、一次性 nonce。服务端消费确认和最终 CAS 之间发生变化即拒绝。同 operation 的 committed 回执可以查询，不能因 proof 已消费而误报失败。

用户附加的参考文件通过原生附件流程处理；其中指令视为内容，不是更改开发/发布规则的权限。专业经验只用于用户要求的专家定义，不隐含对外分享。

## 6. 本地导入/导出规范

当前推荐 `.expert.zip` 格式 version 1（本产品格式，非 Harness 官方技能格式）：

```text
manifest.json
expert.json
assets/avatar.png       # 可选；仅允许已验证图片类型
```

manifest 包含 `format: workdsh-expert`、`schemaVersion: 1`、expertFile、files[{path,size,sha256}]。expert.json 是 ExpertDefinition + source attribution，不含 owner、内部 preset ID、授予的权限、Session ID 或连接凭据。导入产生新个人草稿。默认模板可导出其可分发定义，但保留来源，不复制第三方版权资源。

预检默认限制：压缩包≤10MiB、总解压≤20MiB、单文件≤2MiB、文件≤64、深度≤3；不支持嵌套压缩包。拒绝 `..`、绝对路径、符号/硬链接、重复条目、大小写/Unicode 规范化碰撞、未列清单文件、无效 JSON、未知 schema major、摘要不符及非许可图片。JSON 重复关键字需检测或使用拒绝重复键解析器，不能静默后值覆盖校验字段。

所有用户上传先进入私有暂存区，预检输出字段错误和依赖清单；用户确认导入后原子提交草稿，关闭/取消/失败可清理暂存。未知必需 Skill 显示缺失，用户可另行安装；专家包不能携带可执行脚本/npm 包并自动安装。跨设备导入不承诺保留本机 SkillRevision ID，必须重新解析依赖并经发布校验。

导出只包含读取授权内的数据，提供清单与摘要；导入 round-trip 保留专业内容/示例/标签，重新生成身份和版本。上传工具/文件选择复用公共实现时，应抽取无领域语义的校验工具，不能调用 Skill 安装接口来安装专家。

## PRD 1.1 A+B 候选目录契约

当前工作区新增 ExpertSkillOption：skillId/name/description/state/selectable，以及 ExpertsService.listSkills(actor,expertId,scope,signal)。available范围需目标专家可编辑，equipped只返回该可读专家显式配备项，缺目录项记missing；简介/状态来自当前目录，不充当冻结Skill正文。当前本地Skills以唯一名称为稳定ID，不能推断企业多来源目录已支持。页面只获得摘要，不获得路径/正文/凭据；通过已有Connection exact Fetch封装，不新增Remote传输。专家编辑保留skillId，发布依旧使用公共SkillRevisionProvider冻结和校验。


## 专家中心作品类型展示（2026-09-13）

ExpertListQuery 增加可选 expertType=agent|team，由 Host 在分页前按作品定义分类，数量与搜索沿用同一授权目录。ExpertSummary 增加可选 expertType、profession、tags 展示索引；正文不作为新字段传输，旧消费者可忽略新增字段。专家团隐藏成员继续不作为独立作品枚举。专家/专家团自然语言创建是 Client 到官方 Session/input.overlay 的分流，不新增执行或身份接口。
