# 八类编辑器的 Harness 集成决策

日期：2026-09-12。任务：OFFICE-AI-01。状态：架构决策与公开面核对，新增链路尚未运行验收。
配套：[统一API v0.4](UNIFIED-API.md)、[ADR-0024](../../adr/0024-ai-visible-browser-editing.md)、[AI协作需求](AI-EDITING.md)。

用户后续明确采用GenOffice使用的上游开源组件，编辑器选型以[开源组件采用方案](OPEN-SOURCE-STACK.md)为准：Tiptap/ProseMirror、Univer、Konva、PDF.js/pdf-lib/PDFium、CodeMirror与Mermaid/KaTeX。HTML与Markdown补入正式八类范围；Harness执行与统一提交决策继续有效。

复审约束：[Office插件架构](PLUGIN-ARCHITECTURE.md)明确独立安装包、Host服务/工具/Connection子插件、Client与SDK模块、公共契约、卸载停稳和干净制品门槛。Office操作是Harness插件提供的能力，不是外置编辑服务或工作台内部核心。组件SDK本身不等于Harness插件。

## 1. 技术方向

**Harness 可以承载 AI 操作八类编辑器；首选一个原生 Agent 调用统一内容工具，客户端显示同一工作副本。无需给八个编辑器各配一个子智能体。** 这是根据官方扩展面的架构判断，不代表八类编辑器及格式转换已经实现。

需要分开理解三个职责：

| 层 | 做什么 | 由谁负责 |
| --- | --- | --- |
| Agent | 理解要求、规划内容、选择动作、读取结果、修正 | 官方Agent/模型/会话；专家preset补领域经验，Skill补操作指导 |
| 内容工具/服务 | 定位对象、授权、校验、应用操作、持久化、返回修订 | WorkDSH Office领域，使用Harness工具与Storage能力 |
| 编辑器 | 展示正文/幻灯片/表格等，处理鼠标键盘和浏览器转换 | 八类SDK适配器，使用官方Client/Tab扩展 |

“AI会写PPT”需要模型知道幻灯片语义、工具能新增/修改元素、适配器能渲染并导出；增加一个Agent不会补出缺失的渲染器、DOCX转换或合法许可证。当前优先工作是统一服务和真实编辑器之间的闭环。

## 2. Native、PTC、子智能体如何选择

| 方式 | 适合 | 本次决定 |
| --- | --- | --- |
| 标准模式/Native工具调用 | 逐段写报告、修改表格、制作一份PPT | 首条验收基线；沿用已发布专家当前standard组合，不静默换模式 |
| PTC程序化工具调用 | 对多个范围/页面顺序批处理，复用返回ID，处理结构化结果 | 同一工具自动可见时使用；无需新建编辑执行器或专用PTC插件 |
| 子智能体 | 独立调研、审阅，或分别产出报告/演示等相对独立成果 | 可选增强，先不作为八类集成依赖 |
| 实验性Agent Teams | 需要共享任务DAG、持续成员与消息交互的团队工作 | 不作为编辑器基础层；专家团阶段单独验证成熟度与SOP映射 |

官方明确：可见且注册的工具在PTC里可用 `await tools.<name>(args)`，仍走原有执行策略；不需要为PTC重写工具。[本地工具参考](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/cookbook/adding-a-tool.zh.md)、[官网工具参考](https://deepseek-harness.github.io/deepseek-harness/reference/cookbook/adding-a-tool)。

PTC只处理内容工具允许的严格参数，不能把模型程序送到浏览器任意执行。同文档按回执revision串行await；不要对同一版本Promise.all写入。每次工具提交后页面独立刷新，即使外层run_code尚未结束也可见；这是提交批次流，不是模型每个token直通编辑器。

插件安装不等于当前Agent看得到工具。U1须核对Profile装配、preset作用域和工具过滤，分别确认标准会话/专家会话实际可见的content_*及参数schema；不改写运行中专家的冻结组合，不绕过工具策略。PTC与subagent所需提供方也必须实际装配，不能从node_modules有包推导已启用。

错误分支要适配官方约定：预期冲突/人工接手等通过规范JSON的status/code表达，PTC可判断；基础设施错误仍失败。ToolCallError只保证name/toolName/message，不能假设带内部code。工具卡片与内容页面不同，presentResult渲染了卡片不证明文档已显示。

## 3. 官方能力复用记录

核对范围是相关公开文档与本地发布包，不声称读完镜像全目录。未读取/修改上游checkout，不使用包的internal/src入口实现集成。

| 需求 | 官方证据 | 锁定版本核对/已有证据 | Office要补的差异与门槛 |
| --- | --- | --- | --- |
| 模型调用工具 | [adding-a-tool](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/cookbook/adding-a-tool.zh.md)、[tools](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/subsystems/tools.zh.md) | dsh-tools@0.1.5-rc.1根exports含defineTool，类型含ToolRuntime/exec.signal/规范output；experts已有工具实现 | content_*严格schema、授权、业务状态与真实模型探针 |
| 程序调用工具 | 同上PTC节、[ptc-runtime](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/subsystems/ptc-runtime.zh.md) | 安装树含 ptc-runtime 系列（`--dump-config` 实测含 `dsh-ptc-runtime-node`，版本随锁定基线；旧名 code-runtime/worker-thread 为 0.1.5 陈留）；工具发布声明含PTC类型 | 不新增执行器；验证Native与PTC返回相同修订/失败语义 |
| 持久原子提交 | [storage](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/subsystems/storage.zh.md) | dsh-storage-domain@0.1.5-rc.1公开KvTable.update同步纯变换；单写链，无跨表事务承诺 | state+revision+receipt一次记录提交；崩溃/重试/容量测试 |
| Client通信 | [adding-a-remote-api](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/cookbook/adding-a-remote-api.zh.md)、[api-gateway](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/api-gateway.zh.md) | protocol/generator同版本；[D01生成失败记录](../../evidence/d01-remote.md)；[专家G05已验证Connection路径](../../evidence/d04-experts-g01-g06.md) | 本地版本采用Office专属认证exact Fetch、严格DTO和取消，不复制专家内部协议 |
| 镜像/恢复 | [web-client](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/subsystems/web-client.zh.md) | 官方定义Host→传输→Client model→UI；具体Office流式扩展未验证 | 首版500ms非重叠修订查询/快照、延迟响应防倒退、撤权与重连；不假设官方自动同步任意领域 |
| 右侧展示 | [sidebar-right](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/subsystems/sidebar-right.zh.md)、[client-resources](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/subsystems/client-resources.zh.md) | 当前Office已用documentPreviews/Slot打开三类文件；工作副本Tab/展示ACK未实现 | 可信Session绑定、原生Tab kind、显示回执、A/B会话及双浏览器不串页 |
| 子智能体 | [subagent](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/subsystems/subagent.zh.md)、[官网](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/subagent) | 安装树有subagent、spawn/fork-in-process、tool-subagent/control@0.1.5-rc.1；根公开声明有start及能力描述 | 子任务授权/父会话展示/成果汇总待测；包存在不证明当前preset装配了能力 |
| 团队 | [agent-team](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/subsystems/agent-team.zh.md) | 文档明确实验性；描述task DAG与mailbox，writeScopes只是提示性前缀，不是锁 | 专家团SOP仍需领域规则；不以DAG/路径提示替代编辑写锁与资源权限 |

官方文档有版本层次差异：web-client描述RemoteStream及恢复，而镜像api-gateway部分仍写流式/浏览器响应使用精确Fetch。不能把这些段落拼成“rc.1已支持任意自有Remote流”。发布包公开types和隔离运行探针决定是否能用，官网只作交叉核对，不静默升级版本。

本轮只复核上述声明和既有证据，未重跑之前的Remote失败探针，也未把它描述为本轮新复现。源码/方法存在性、已有测试和本次未执行的端到端测试分开记录。

## 4. 为什么首版采用受控修订查询

原生Typert是长期首选，但rc.1外部插件生成链已有失败记录。当前先用官方Connection认证exact Fetch的领域例外，复用信任检查/取消/生命周期，建立一个Office Client model；不造通用transport、手写Typert描述符、新开WebSocket或全局window RPC。

查询只检查活跃文档revision与请求状态，变化才取内容；无需模型反复调用。快照后立即核对水位并持续查询，解决“快照之后只发生一次更新就漏掉”的问题。500ms默认间隔适用于首个本机闭环，有实际渲染p95和文件体积验收；团队规模不能直接沿用这套性能承诺。

未来切换官方流式扩展只替换传输适配，不改变工具、领域提交与编辑器语义。必须先证明外部包生成/装配、认证、先订阅后baseline、取消/重连/卸载全链；失败保留旧通道，不两套并行各自写入。企业受控Remote仍按原企业路线单独准入。

## 5. 子智能体的正确位置

官方将subagent定义为可选能力，提供方按capabilities拒绝不支持的persona、toolFilter、outputSchema等请求；继承上下文不表示继承全部权限。子Agent的创建、消息、取消、继续和持久会话交给官方服务，不另建执行队列。[官方subagent说明](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/subagent)。

复杂例：“分析经营数据，交付报告、PPT和复核清单。”

1. 主Agent读取需求和数据，确定成果与依赖；简单任务自己完成。
2. 如需分工，用已验证的官方spawn-in-process组合派研究/审阅子Agent，给最小必要上下文和受管文档引用；独立子任务优先fresh上下文，fork仅在确需历史时使用。
3. 初期同一文档只由主Agent提交；子Agent返回结构化建议或独立工作副本。确要子Agent写入时，Host显式授予目标/动作/期限/父任务绑定，不能把传入documentId或toolFilter当授权。
4. 主Agent读取子成果的实际revision/回执后合并交付；写入仍经过ContentService。读写同一文件的多人/多Agent协调不能靠team.writeScopes解决。
5. 子任务结束/取消后撤回临时写授权；已提交成果保留。父任务展示仅通过已授权的父子绑定路由，不直接操作当前全局sidebarRight。

这些是后续专家团的集成规则，当前没有启动子Agent或为Office新增team依赖。八类编辑器是能力；专家是能力加经验；专家团是多专家加SOP。它们可以组合，但不是同一模块。

## 6. 八类的可实现范围与当前差距

| 类型 | Harness可承载的AI动作 | 仍需解决的编辑器/文件门槛 |
| --- | --- | --- |
| 文档 | 按大纲逐段写、改指定文本/格式、填表 | 真正原生富文本编辑、手动/AI模型往返、DOCX浏览器导入导出；现有文字片段表单不达标 |
| Excel | 按sheet/range填数据与格式 | 现有Univer可编辑；统一持久化未接，原生图表/复杂导出仍有限制；不扩展公式引擎 |
| PPT | 新建页、更新文字/形状/位置、引用图表 | 选定Konva；原生UI、PPTX格式适配/逐页视觉/导出尚需完成，历史候选探针不能代替 |
| PDF | 注释、表单、页序及通过验证的文本/图片编辑 | 选定PDF.js/pdf-lib/PDFium；浏览器字体/内容对象编辑与文件往返待验收 |
| 画布 | 图形/文字/连接/布局操作 | 稳定ID、UI事务/撤销、持久化/导出、许可；静态图像不达标 |
| 多维表格 | 字段、记录、关系、视图 | 真正关系/字段模型及浏览器持久化；仅能展示的static demo不达标 |
| HTML | 按源码文件/范围写HTML、CSS、JS并绑定资源 | CodeMirror与隔离预览、资源包保存、预览错误回执；HTML不获得Host工具/凭据 |
| Markdown | 逐段写作、增改章节/表格/任务列表/代码/图示/公式 | Tiptap/CodeMirror同源码映射、未知语法保留、.md往返；只读渲染不达标 |

许可沿用用户要求：优先MIT/Apache-2.0，允许商用；MPL等依赖单列分发义务。后续用户已明确采用GenOffice的上游开源基础组件，见[采用方案](OPEN-SOURCE-STACK.md)；[旧候选与探针](../../evidence/browser-editors-permissive-selection.md)保留历史，不再作为默认选型方向。PDFium真正内容编辑列入目标，未通过浏览器/字体/文件往返前不宣称可用。

## 7. 下一次开发的明确范围

按统一API的U1—U5执行：先让**一份文档**完成“原生工具写三段→正确右侧实时显示→用户直接改第二段→AI读最新值继续→保存刷新→导出重开”。随后复用同服务接其余七类；子智能体单独留给复杂SOP协作。

首个代码切片必须有真实Host服务、严格模型、持久化、认证连接、Client model与原生编辑器；不只创建接口文件。新增工具只按通过的操作注册。故障用例、双主体负例、无第三方请求和真实模型验收分别记录；没有模型凭据也不能用模拟通过代替真实模型结果。
