# D04 专家审查修复与验证

日期：2026-09-12。范围：EP-07 的必要前置修复，不展开 D11 或企业后台。

## 官方能力复用记录

| 任务 | 官方说明 / 锁定公开入口 | 业务差异与验证 |
| --- | --- | --- |
| 治理装配 | `user/develop/basic/publish.zh.md`、`cookbook/adding-a-package.zh.md`；Harness 0.1.5-rc.1 的 Profile patch，Cordis 4.0.2 `ctx.plugin` | identity/audit/access 各贡献独立配置层；access 的公开 Session/Tool 子路径通过显式配置行注册已有桥；隔离安装检查 ACTIVE，禁止 bundle 隐藏 apply |
| 全路径执行校验 | `agent-lifecycle.zh.md`；`@deepseek-ai/dsh-agent` 0.1.5-rc.1 的 `agent/pre-step` waterfall、Agent.session.header | 校验专家绑定、实际 preset 文本摘要和固定 Skill；普通任务保留 next；未绑定专家 preset/fork 拒绝 |
| 原生草稿交接 | Conversation 的 `conversation.input.overlay`、公开 inputActions、ISessions | 交接绑定 Session 和期限，检查原生当前草稿；只填空输入，不自动发送，重复挂载不重放 |
| preset 不可变 | `@deepseek-ai/dsh-agent-presets` 0.1.5-rc.1 `copy/read/resolve` | 构件保存输入与 YAML 摘要清单，复用前核对；已有构件漂移拒绝改写 |

## 修复与验收结果

运行环境：Node 22.23.2、pnpm 10.34.5、Harness 0.1.5-rc.1、Cordis 4.0.2。当前修改是未发布候选。

| 检查 | 结果与证据层次 |
| --- | --- |
| `corepack pnpm build` | 全量通过；最后详情布局变更后再次构建 Experts 与共享 UI |
| `corepack pnpm typecheck` | 全量通过 |
| `corepack pnpm test:integration` | 44/44，通过；其中 Experts 11 项，治理/Storage 为真实 Cordis 服务，部分模型、身份、Session/preset 为替身 |
| `corepack pnpm check:versions` | 463 个 DSH 条目固定到基线，仅 Cordis 4.0.2 |
| `corepack pnpm check:plan`、`test:planning` | 26 modules / 50 documents，规划测试 2/2；只证明规划完整性 |
| `corepack pnpm probe:experts` | 官方 CLI 仓库外隔离安装六个 tarball；真实治理与 Experts Host 激活，创建并校验原生 Session；headless Chromium 界面与两次 Host 冷重启通过 |

浏览器验证默认专家列表与详情、示例召唤、正确 Workspace/专家 preset、示例提示词一次性填入原生输入框、制作专家加载指引、已有文本不被覆盖，以及不同 Session 的交接不会误填。未自动发送提示词。截图复核发现关闭按钮遮挡管理菜单，已为详情头部保留空间并增加几何断言。

探针入口：`scripts/probe-experts-package.mjs`。产物：`.artifacts/experts-package/report.json`、`experts-1440.png`、`expert-detail.png`、`expert-task-draft.png`、脱敏 `host.log` 与六个 tgz。临时隔离目录在报告中列明；未改用户正在使用的预览 Profile。

## 从真实运行发现并修正的问题

1. Service 直接构造未执行初始化；改用 `ctx.plugin`，集成消费者单独声明 `workdshExperts` 注入，避免读取未就绪或未声明服务。
2. Session 桥只识别测试异常 code；补充官方导出的 `ApiSessionNotFound`，测试改为真实异常类型。
3. 仅传路径不足以保持工作区关联；执行计划携带 Workspace ID，创建时遵守官方 workspaceId/cwd 二选一。测试目录使用规范 realpath。
4. 原草稿交接缺少目标；改为 Session + 到期时间，仅消费目标为空的原生输入，清除交接后再修改输入，避免重复挂载重放。
5. 旧 preset 复用比较不同格式的摘要；改为输入摘要 + 实际 YAML 摘要清单，执行时再次读取原生组合核对。
6. 操作重放校验原始主体；模型选择失败返回明确失败，不静默成功。

## 仍未验收，不能声明 D04 完成

- 真实模型 persona/Skill 回合：未执行；pre-step 的公开 waterfall 测试不等于完整真实 Agent loop。
- Experts/Skill 移除、重装、热卸载后在途与遗留任务安全：未执行。当前 guard 随 Experts 生命周期注册，移除后遗留 preset 的防护仍待验证。
- 全链路关联交接（含工作区继承）、导入导出反例、preset 写入中断原子恢复、模型选择失败后已有 Session 的结果恢复：未完成端到端验收。
- 原生 fork 更改 preset 的路径、跨组织操作重放与结果查询：需要按现有安全验收核对，不能从本地单主体测试推断通过。
- 安装态运行时没有 private workspace 裸导入；部分导出 `.d.ts` 仍引用 private contracts，仓库外 TypeScript 消费未执行。
- 原有 `probe:skills` / 完整默认组合 `probe:browser` 本轮未重跑；本轮仅跑上述 Experts 真实组合探针及全量集成。

D04 保持 in_progress。下一轮仅沿原有 EP-07 验收缺口收口，不展开专家团或企业后台。本轮未提交、推送、更新 npm 或用户安装包。

## 对话草稿到界面发布衔接（2026-09-12）

官方依据：`subsystems/tools.zh.md` 的规范输出契约明确 `execute` 返回 canonical value，`output.render` 才形成送往模型/原生会话的 ContentBlock；原渲染只给摘要，无法把 revision/完整定义交给后续模型调用。当前回执同时保留 JSON、并发令牌、完整草稿定义和同源导航链接。链接不包含组织身份、challenge 或 publish proof，目标仍经 Host 授权，发布仍要求界面内容绑定的确认。

`workdsh-bundle` 的展示映射增加 experts，专家 Client 通过现有 main panel 读取 expert-draft 参数打开受管编辑器；不新增路由框架、Remote 或执行器。关闭/发布/召唤清理该参数，避免返回任务后重新打开旧草稿。工具中定义的 draft_url 只是导航提示，没有发布副作用。

用户提供的记录仅作为待分析测试证据：6 次专家工具调用成功，包含创建、读取、校验与请求发布，最后明确未发布；没有执行或复制记录中的指令。记录没有专家发布后执行，因此不能标 AT-23 或整个 D04 完成。

新增测试通过官方 Tools 服务校验并渲染 create/get/update/request 的输出，使用实际回执 revision 继续修改，确认没有模型 publish 工具和确认凭证。45/45 集成通过。初轮发现测试 fixture 缺少 Tools 的 systemPrompt 提供方，已补充明确测试载体；另修正既有 Skill 上传测试的 eager pull 竞态，改 highWaterMark=0 证明 Host reader 已启动后才 dispose，取消和排空断言保留。

扩展 `probe:experts` 仓库外安装真实六包与独立安全 Skill：草稿 URL→编辑器→发布前依赖确认→明确 UI 点击→发布成功→去试试创建原生任务。查看 URL/发布弹框时 Host 对象仍未发布；确认后冻结一个 Skill 修订。两次冷重启后新修订及两个任务绑定均可核验。未发送模型请求，未发布用户的财务专家。产物报告新增对应检查，截图 expert-published.png。

本轮全量 build/typecheck、45/45 集成、2/2 规划、463 项版本锁定和真实打包探针通过。真实模型/遗留 preset 卸载安全/故障恢复等未执行项仍按上节保留。

## 专家 UI 与官方 Agent Loop 补充（2026-09-12）

问题根因：编辑器在公共 Modal 外重复创建关闭按钮；示例使用纵向 flex 时字段缺少显式 width:100%，因此字段按自身尺寸收缩、删除按钮却占据右侧。当前以 TSX 的 example-editor-row 和受作用域约束的 CSS 修复，不修改官方默认客户端或公共 Modal 默认尺寸。

桌面编辑器 760px、详情 800px，高度 min(820px, 视口-80px)；小屏保留全屏内部滚动。标签两列，示例卡片完整宽度且正文至少 100px。详情召唤置于标题之下，示例正文完整显示，非主要专家设定以原生 details 折叠。公共 Modal 仍负责焦点、Escape、背景关闭和恢复焦点。

probe:experts 新增三尺寸检查：1440/768/390px、8 标签、6 示例；确保弹框尺寸不越界、仅一个关闭按钮、输入宽度铺满卡片、无横向溢出。截图 expert-editor-1440.png、expert-editor-768.png、expert-editor-390.png 和 expert-detail.png 位于 .artifacts/experts-package/。继续执行真实独立打包、内容绑定确认发布、冻结依赖召唤及两次冷重启；测试数据均在临时 Profile，不修改用户专家。

新增集成测试使用真实发布配置，并通过官方 agents.create/setup 接入 persona、filesystem、skill tool 和 Agent Loop，固定适配器仅模拟模型 I/O：角色/交付哨兵进入请求；Skill 工具返回原冻结正文；发布后动态源变化没有替换冻结内容；隔离的普通任务不收到专家配置或快照。仅装配上述受测配置行，不执行整份 preset 的 Loader，不据此宣称远程模型/完整发布 preset 执行/卸载后防护已完成。真实 Host 安装路径由独立打包探针覆盖，运行回合由此集成单独覆盖。

最终验证：build/typecheck、46/46 集成、2/2 规划、463 项锁定、git diff --check 均通过。更新后的 probe:experts 完成三尺寸 UI 检查、发布/召唤、无浏览器错误和两次冷重启。本地预览通过官方六包内容寻址重装及入口核对后启动，18989 上只读核验用户已有专家保留、详情满足 800px/820px 上限；没有提交或发布。

## PRD 1.1 A+B：专业详情与真实配备技能（候选实现）

官方复用记录：D04/EP-05/REQ-EXP-014～015，锁定 Harness 0.1.5-rc.1、Cordis 4.0.2。依据 subsystems/skills.zh.md 的目录/消费所有权和 slots.zh.md 的领域展示组合；专家继续使用已有官方 Connection exact Fetch 例外，不另建传输或 Registry。公共 workdshSkills.list 和 SkillRevisionProvider 提供目录与冻结；当前本地目录稳定ID等于技能名称，并非全局任意同名来源。UI显示名称，保存skillId+name。未来企业目录必须由授权提供方解析，不能把本地Host目录接口当企业多用户授权API。

新增公开 ExpertSkillOption 和 listSkills(actor,expertId,available/equipped)。available先核对专家读/编辑权限；equipped仅返回可读专家显式配备项。响应不包含资源路径、正文或凭据，状态和简介取当前已安装目录，不冒充发布快照内容。现有发布校验仍使用 Skills 公共冻结能力，引用移除不卸载共享技能。

选择器嵌入编辑器，避免嵌套公共Modal的Escape/焦点冲突；读取请求由AbortController托管，取消选择不改草稿。可搜索名称简介、显示不可用原因、去重并限制数量；旧名称引用选中确认后升级为当前稳定ID，保存和重开保留。详情增加擅长领域、完整任务示例和真实配备技能简介/状态。实际功能与最终测试结果见STATUS，不能据此宣称AT-27或整个D04完成。

本轮最终自动化：build/typecheck、47/47集成、规划检查和2项规划测试通过；新目录测试覆盖编辑授权、无路径泄露、缺配备技能、停用不可选及发布校验失败。独立打包探针验证真实选择搜索/取消/移除引用/保存stable ID/重载、确认发布和两次冷重启。恢复一次误写测试文件时完整保留原始9项及后续4项，加新1项后总47通过；恢复过程中发现旧路径修复需重放，已复验。重载提示遮挡在fixture流程中正常关闭，没有force点击或跳过确认。

## 本轮官方能力复用记录：草稿与使用详情区分

D04 A+B 修正：沿用官方 `subsystems/slots.zh.md` 的类型化 React 组合、Harness 0.1.5-rc.1 已验证 Client 装配及公共 Modal；只修改业务 TSX 展示。使用既有 get 回执里的不可变 revision.definition 与 draft.definition 判断内容差异，不新增执行状态、传输或存储。扩展能力声明单列，并说明当前尚不支持接入校验；不将声明误报为实时连接检测。隔离独立包探针验证草稿保存不替换已发布技能，后续核验结果登记 STATUS。

本轮结果：Experts build/typecheck 和真实六包 probe:experts 通过。保存草稿移除技能后详情仍配备已发布技能，提示尚未发布，跳转编辑显示草稿数量；可选连接器声明单列，不阻止原生召唤。1440/1920/390px 无横向溢出、390px截图复核及两次冷重启通过。提示标题受旧样式隐藏及插入加载分支的问题已修正，保留断言。全量集成测试未重跑，上轮47/47不冒充本轮。原生对话创建增强/发布前使用预览仍为C待开发项。

## 官方能力复用记录：D04 C 对话创建与使用预览

复用 `subsystems/skills.zh.md` 的官方 skills.register 与生命周期、公开 dsh-tools@0.1.5-rc.1 defineTool/register/execute 和既有按 Session 的 resolveActor，新增只读目录工具调用已实现 Experts Host listSkills，不跨插件读取数据表。沿用既有 slots.zh.md Client 注册与公共 Modal，以验证回执和同草稿修订 get 得到的定义呈现完整使用预览，不额外生成任务或 Agent loop。确认请求摘要与用户所见摘要比对后才换取确认证明；发布仍由同 Host 校验。创建专业内容指南是模型指导，实际必要追问与专业成果仍需D场景实测，不能将文案或固定适配器当真实模型验收。

C结果：Experts构建/typecheck、47/47集成、规划/2项测试和真实六包安装探针通过。真实目录工具对同一Host的执行、跨主体拒绝及路径不泄露由现有authoring集成测试覆盖。完整已保存定义包含60字后的专业内容和第6示例；取消不发布，模拟确认摘要变化时confirm-publish请求为0且未发布，恢复后明确确认成功。三尺寸/固定按钮/冷重启通过，截图expert-use-preview-*.png及expert-professional-preview.png已复核；主按钮主题悬停对比修正后重跑通过。真实模型对话行为与专业成果未执行，仍待D场景。

C预览更新：六包内容寻址重装、入口摘要核对与18989重启通过。真实原「表格分析」草稿使用预览渲染已验证，未调用update/create/confirm/publish/create-execution，前后draft/expert完全一致。截图preview-expert-use-review.png。用户只需刷新，不代用户发布或试用。

## 官方能力复用记录：D04 D 基础模式与专业场景验收

使用公开 dsh-agent-presets@0.1.5-rc.1 的 resolve/copy/read/discoverPresets/SHIPPED_PRESET_ROOT核对安装态标准模式。专家0.1明确以standard为基础；缺失、损坏或读取失败不再默默回退到部署默认/PTC/创造/其他专家。沿用Host错误码experts/preset-broken与原生loop，预先/事后传播AbortSignal。不新建模式执行器；已发布修订保持不变。准备安全CSV正常/信息不足/质量异常样本和可复算基准，完整Preset的安装态执行、真实模型与业务成果分别登记，未配置模型时不声称通过。


### D真实模型执行结果及专业签收边界（2026-09-12）

新增可显式选择的 `scripts/probe-experts-professional.mjs`、测试CSV/方法技能、数值核对器和只读持久日志/冷启动复查。官方参考另包括 `subsystems/credentials.zh.md`、`subsystems/persistence.zh.md` 和发布包v3事件类型；真实请求仍由Harness处理，验收器只解码日志，未另建loop/transport/模型路由。凭据按用户已授权的预览DeepSeek引用临时供给，不复制浏览器认证或其他凭据；每次退出移除临时凭据，不输出值。日志读取需要系统zstd；探针非默认集成测试。

| 路径 | 原生与成果证据 | 专业边界 |
|---|---|---|
| 正常9行/3店/3月 | 完整安装态preset；固定Skill成功回执；read/Python；completed；两文件与数值独立对账；输入hash不变；冷启动绑定通过 | 55,000→46,000；-9,000/-16.3636%；门店贡献闭合；但“保护客单价成果”忽略订单权重结构，专业建议未签收 |
| 信息不足2行收入 | 同上；收入下降可核验；visitors/orders均null、stores空；必要追问和不归因说明 | 此场景专业复核通过；没有推测门店贡献或转换率 |
| 脏数据10行 | 同上；重复行/缺客流/fen单位说明；归一化收入对账；缺失targetVisitors保持null | 报告保留口径待确认；一处行公式误抄、客单价稳定不等于店内结构稳定，专业复核待关闭 |
| 停用配备Skill | 确定性同Host：新创建被阻断且Session数量不增；现有原生pre-step报dependency-disabled | 没有远程模型请求，不能混记真实模型路径 |

原生请求实际使用deepseek-official/deepseek-flash/high。每场景report.json记录完整preset标识、原生turn/end、工具callId列表、模型路由、输入hash和冷启动结果，不输出request/header全文或任何凭据。成果和人工复核分离，professionalReview=required保留。首次探索正常任务在文件出现后就停止Host，不能据此证明完成回合；后续三条使用完整完成事件独立复查。完成后的Skill卡片自动折叠导致可见性断言失败，修正探针使用持久日志作权威依据；只读复查三条通过，不再发送任务。修正版主探针整条重跑未执行。

验收核对器不是业务推理实现：oracle不进入工作区/技能，检查金额、相对百分比、门店唯一/闭合、真实文件和未知项。正常模型把成功检查写为severity=info不是伪造异常，已允许结构化info，同时测试继续拒绝错误比例、重复门店、伪造字符串异常和缺文件。info正文及自然语言建议准确性不靠机械匹配证明。

标准模式修正：创建/发布只接受健康standard，原有已发布修订不迁移；缺失时明确preset-broken，不切换部署默认/PTC/创造。新增测试仅向resolve查询standard，即使PTC健康也拒绝；取消信号沿用。Experts构建/类型检查和52/52集成通过。新增方法技能已约束细粒度事实/聚合指标、订单权重结构及逐式对账，更新后模型行为未验收，不能宣称修复自动生效。D04保持in_progress，下一工作是关闭D专业报告缺口，再执行既定E签收。


### D严格方法复验及最终边界

在保留初轮源报告后，补充方法技能的订单权重分解、粒度边界及逐式对账要求，重新执行normal/dirty两条真实任务；新定义通过受信UI明确发布，固定新Skill修订，不改原用户专家。正常报告现正确说明整体客单价增加完全来自门店订单权重，门店内效应0，并要求纠正“保护客单价成果”的表述。脏数据现使用50×30,000=1,500,000，明确稳定平均订单金额不证明单品价或店内结构稳定。这些改进有新模型输出证据，原始错误报告仍在旧制品目录及dirty-initial目录，不覆盖伪装。

最新dirty主探针完整通过安装/原生UI完成/持久日志/文件数值/冷启动。最新normal的原生任务完成，但当轮数值核对器错误额外限制inputIssues只能空或info对象；实际字符串内容是数据检查与局限说明，原Skill契约只要求数组，不能以格式判语义伪造。已纠正为允许非空字符串/detail对象，仍校验所有核心金额/比例、唯一门店/闭合和实际文件；自然语言真假需人工核对。保留错误百分比、重复门店、缺文件、非法质量说明格式等反例测试，并覆盖两种合法说明格式。最新normal经独立日志/数值与冷启动复查通过，未为核对器纠错再次调用模型；纠正格式限制后的normal主探针整条重跑未执行。

专业签收仍保留两项dirty缺口：① 反向假设“C行数值本来是CNY”同样满足orders×AOV恒等式，不能声称其乘法自洽性不成立；只可说与标签/历史不一致，需要单位确认。② A+C转化率持平不能证明整体没有真实转化变化，B缺失时整体仍未知。最新JSON保留null正确，报告的这两句需修订方法后独立重验。正常/信息不足基本专业目标已核对，异常场景语义仍待关闭，AT-27未整体签收；不宣传无人复核的专业保证，不自行开0.2。

当前制品：normal/incomplete/dirty三目录对应`.artifacts/experts-professional-<scenario>`，包含report.json、原生对话截图、analysis-results.json、analysis-report.md。核心检查及冷启动绑定通过，professionalReview保持required，不将自动数值检查当文字评审。模块仍in_progress；52/52集成、Experts构建/typecheck、check:plan及规划测试2/2通过。未重装人工预览、未提交/推送/发布。

收尾检查：扫描91个本轮制品文件，未发现预览模型凭据的明文值；所有professional临时Home的凭据文件均已移除，预览模型配置仍存在。最后52/52集成与check:plan复验通过。对dirty残留语义问题进一步补充方法技能：算术自洽不能辨别单位、已观测子集稳定不能推断缺失部分或整体；此最后补充未调用模型重验，D专业签收保持待关闭。

## 2026-09-13：异常场景两轮真实模型复测

使用临时Home、合成CSV和已配置预览模型，未改人工预览或用户专家。探针增加可选受限run label，分别保存到 `.artifacts/experts-professional-dirty-review-20260913` 与 `...-review2-20260913`，旧制品不覆盖。第一轮原生任务结束但自动校验拒绝targetVisitors=1300；报告仍由A+C稳定排除B/整体改善。失败成果和professional-review.json已保留。

补充方法技能的整体字段覆盖与摘要边界后，第二轮原生completed、冻结Skill读取、真实CSV/Python、金额对账、原件不变和冷启动绑定通过。报告正确承认单位恒等式不能排除反向单位解释，且不再从A+C断言B或整体转化率变化。但专业复核失败：完整基期客流2500被错误置null；敏感性场景错误称为“按fen标签直读、不归一化”，并声称C贡献方向不变，实际其变化为+1485000、总体方向反转。自动探针未覆盖这些额外语义，不能以PASS代替专业签收。

已再次补充按期间独立保留完整基期、单位反事实准确命名及逐店重算要求，并同步专家创建参考；最后补充未模型复测。两轮均完成凭据清理；成果仅合成数据。成果校验3项测试、规划检查和diff whitespace通过。AT-27仍未整体签收；下一步限于两处剩余问题复验，不自动持续调用模型。

## 2026-09-13：PDF 后续异常场景有限复验

独立运行 dirty/pdf-followup-20260913，固定最新方法 Skill，原生模型任务结束并生成 JSON/Markdown，原件哈希及浏览器检查通过。强化的验收核对器拒绝 baseVisitors=null（正确应为2500）；目标订单也被误写为300（逐店80+150+50应为280），报告使用错误订单合计和正确AOV164.29并列。摘要还称A同时受客流与转化下降影响，后文却正确报告转化持平。故 AT-27仍未签收，不将原生任务完成称为专业成果通过。

单位反事实本次改善：准确命名 fen标签错误且原始值为CNY，C变化+1485000、总体+1476000，明确方向反转。这一子项通过不掩盖其他错误。实际 JSON/Markdown、professional-review.json及原生截图保留在 .artifacts/experts-professional-dirty-pdf-followup-20260913；凭据已清理。失败后冷恢复未执行，没有自动继续重复模型调用。

后续修改应落到领域方法 Skill 的可执行计算与成果校验，而非再次仅扩充提示词：按期间独立建立完整性，金额/订单/客流生成同一可核对结果对象，报告数字由该对象引用并校验逐店闭合，专业解释单独复核。该执行增强尚未实现/安装，不能据本轮新增开发验收门槛声称生产专家自动拦截上述问题。

### 公共制作指南跨领域有限验证（2026-09-13，执行中）

用户授权真实模型验证。使用现有独立包/Profile、官方原生任务、已注册 workdsh-expert-manager、公开专家工具与受信 UI 发布。写作、资料研究、代码三类各创建一位真实专家，再分别试用；财务 dirty 另复测一次。隔离 AgentsHome/合成资料，不改用户对象，不联网或自动重试。新探针只编排公开接口和检查持久日志/真实成果，不新增产品执行器或评分服务。签收与失败逐案记录，未完成不得写通过。

### 2026-09-13：公共专家制作跨领域真实模型有限验收

隔离官方 Profile 完成写作、资料研究、Node.js 代码三类：模型实际读取 workdsh-expert-manager 和两份参考，经公开工具创建同名唯一草稿、校验；测试通过受信 UI 发布后在每位真实专家的独立原生任务执行，持久日志证明正常完成与真实产物，原始输入哈希未变。每类创建/试用各一次，无模型循环重试；早期探针装配错误发生于模型发送前，已修正并保留为 setup-failure 证据，不冒计为模型失败。

专业评审：公告 116 英文词，现有功能/preview/未知价格日期正确，但“功能在路上”和后续发布承诺无材料支持，部分通过；研究引用、未实测 B、未知价格与驻留边界正确，但虚构 S1/S3 内部来源属性，严格事实验收失败；代码交付与实际运行完成，生成的20测试复跑及45项更换数据/原型键/异常输入独立检查通过，保留浮点与无原型输出对象限制。三类草稿方法并非财务模板，未增加特制 Skill。

财务 dirty 复测 JSON 当前正确记录 55000→46000、基期客流2500/目标null、订单350→280；实际询问重复/单位等口径后暂停，六分钟未交付 Markdown，主探针退出1。状态是待业务澄清和交付超时，不是完整专业通过；AT-27仍未签收，冷恢复未执行，不自动替用户确认业务事实。所有临时测试凭据删除已复核。

证据：.artifacts/experts-crossdomain-{writing,research,code}-20260913 的 model-created-expert.json、creation/trial-trace.json、产物及 report.json；代码 independent-check.json 与 test-rerun.txt；财务 experts-professional-dirty-public-verify-20260913/partial-review.json。只适用于当前配置 DeepSeek 与合成样本，不证明其他模型/领域普遍效果。下一步若修复，针对来源属性与承诺约束作公共方法改进并另行有限验证，不把样本答案写入模板。

### 公共事实保真修订与保留样本复验（2026-09-13，执行中）

复用已验证官方 SkillRegistration/resourceBase、专家草稿/校验工具、受信 UI 发布及原生 Agent 任务。仅在现有 role/methodology/boundaries/deliverables 中传递来源元数据、承诺主张与逐项核对方法，不新增自动验收服务，不改 Harness。公告/研究使用独立 holdout 材料，需求与检查尺度保持一致；财务确认去重、fen单位与缺失口径只写验收提示，不进入公共指南。各案例有限一次，不自动模型重试。

### 2026-09-13：公共事实保真修订与不同材料复验结果

指南/参考增加来源属性、未来承诺逐条核对，并要求进入生成专家的 methodology/boundaries/deliverables；不强制短成果展示冗长台账。复用官方 https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/subsystems/skills.md、@deepseek-ai/dsh-skill@0.1.5-rc.1 ctx.skills.register/resourceBase 与已有公开专家工具、原生Agent/受信UI，不新增自动评分或Harness执行器。构建/类型检查、16项Host与3项oracle回归、计划/差异检查通过。官方CLI --offline正常更新Preview，Host/Client/参考字节匹配，重启HTTP200，用户冻结专家不变。

不同holdout材料各一次真实创建/发布/执行/交付：公告不再补路线图或通知承诺，但仍附五个审查小节，部分通过；研究仍添加“内部评测记录”，且把没有独立测试证据写成否，失败。新增边界确实进入生成定义，执行仍有矛盾，不宣称提示词已保证事实保真。模型信息见对应report.json，仅代表当前DeepSeek有限样本。

财务仅在测试提示确认去重/fen/缺失口径，完整JSON/MD与基础数字、冷恢复通过；人工发现A+C子集2500应为1500、8%应为10%，已确认单位又称待确认，以及可比范围/整体方向文字矛盾。只读核对器从原始CSV去重后按声明子集/期间推导，实际拒绝该次产物（2500 !== 1500）。保留最初较窄脚本成功与独立专业失败记录，AT-27仍未签收，不新增特制领域Skill，无自动模型重试。

证据：.artifacts/experts-crossdomain-{writing,research}-holdout-20260913 与 experts-professional-dirty-confirmed-20260913 的定义/持久日志/真实产物/report.json/professional-review.json；subset-recheck.txt记录拒绝。临时测试凭据删除逐案核对。当前仅为带限制开发候选；专业收口不能依赖模型自检宣称可靠。未推送发布。
