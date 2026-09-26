# U1 实施记录

任务 OFFICE-AI-01，Office 0.1，2026-09-12。当前实现中，运行证据在验收后补齐。

## 官方能力复用记录

| 能力 | 锁定公开入口 | 业务差异 |
| --- | --- | --- |
| 服务/依赖/生命周期 | `@deepseek-ai/cordis@4.0.2` Service、ctx.plugin、ctx.effect | Office 内容工作副本；治理服务强制注入 |
| 原子存储 | `@deepseek-ai/dsh-storage-domain@0.1.5-rc.1` defineDomain、KvTable.update | 状态、修订、幂等收据在一个记录中提交 |
| AI 工具 | `@deepseek-ai/dsh-tools@0.1.5-rc.1` defineTool、ToolRunContext.agent/signal | 五个 content_* 工具；export 未实现前不注册 |
| 认证通信 | `@deepseek-ai/dsh-client-connection@0.1.5-rc.1` HostConnectionHandle.fetch.register | `/api/workdsh-office`，复用既有 rc.1 exact Fetch 例外 |
| 右侧原生页 | `@deepseek-ai/dsh-client-ui-sidebar-right/client@0.1.5-rc.1` sidebarRightTabs、openTabIn、useTabInfo | 每个 Session 一个 Office 工作副本页，通过 params 切换文档；不伪造 file Resource |
| 编辑器 | Tiptap core/pm/starter-kit 3.31.0（MIT） | 官方 React owner 下的原生编辑 DOM；无第二个 React root |

对应镜像：`subsystems/sidebar-right.zh.md`、Storage/Tools/Connection 文档；最终以以上发布包的 exports/types 及隔离 Profile 实测为准。Tiptap [安装说明](https://tiptap.dev/docs/editor/getting-started/install/vanilla-javascript)、[许可证](https://github.com/ueberdosis/tiptap/blob/main/LICENSE.md) 已核对；分发包保留实际依赖许可证。

## 本次有限能力

先实现新建/读取原生 document 工作副本、段落/标题、bold/italic/underline/strike、分批 AI 写入、同内容原生编辑、持久修订和会话定向展示。不把既有 DOCX/PPTX 预览当作这条工作副本链路的导入。八类规划不变。

U1 操作集收窄为 `document.insertBlocks`、`document.replaceBlock`、`document.removeBlock`。replaceBlock 是带 blockId、expectedText、完整受限 runs/段落类型的块级原子替换，批次仍需 baseRevision；不是任意 SDK 快照。原生分段/合并/粘贴归一为上述差异；未改变块保留 ID，未改变的相同 runs 保留 ID，改变/拆分 runs 由 Host 分配新 ID。新块使用 clientRef，Host 返回真实 ID 映射。精细范围操作、表格和其它格式按钮后置，未暴露不支持按钮。

人工编辑获取 30 秒、10 秒续期、本服务运行代绑定的租约，保存成功后才释放。编辑期间新 AI 写入返回 HUMAN_EDITING；提交使用同一编辑服务。失联/冲突保留当前编辑缓冲并暂停写入，不能将 UI 文本显示为“已保存”。Ctrl/Cmd-Z 只在当前人工编辑事务内作用，重新读取服务器版本时清空本地历史。

新文档必须有既有可信 Session 所有权绑定；工具调用复用既有 ToolAccessBridge 的绑定，Office 不收养未知会话。页面也检查同一绑定及工作区。Host 新建/读取/编辑不依赖打开的浏览器；present 表示请求展示，直到 Client 确认 appliedRevision 才记录已显示。

U1 开始阶段只注册五个工具：content_open/read/capabilities/edit/present。content_export 在 U3 可冻结导出后接入，capabilities 明确 export=false。DOCX 保真导出、真实模型验收和完整卸载故障矩阵不以 U1 模拟测试代替。

## U2 用户反馈修正：创建即展示

2026-09-12：用户实测模型未见 content_*，退回文件工具，右栏需手动打开/重载。该路径不满足验收。新建原生文档必须原子保存会话定向 presentation 请求，创建成功即可由官方 sidebarRight.openTabIn 自动打开；content_present 只承担再次展示，不是新建前置。重开现有文档也自动请求展示。每批已提交修订在可见页面自动同步。工具描述引导普通自然语言写作，无需用户指定工具名。

复用记录：沿用上表 Tools/Connection/Sidebar 公开接口与 existing pending/ack 协议，不新增执行器、传输或第二状态真源；补齐 Loader 根对 tools/connection 的载体依赖声明。隔离预构建探针须不调用 content_present 验证自动打开，并在首批写入前看见空文档；工具可调用探针不能代替真实模型工具可见性。

## U2 自然语言默认写作流程

用户日志第二轮显示 content_* 已在真实模型请求中，模型却加载 officecli。Office 插件新增 lifecycle-managed `systemPrompt.section` 工作流引导（`workdsh:office-authoring`，使用公开 TOOL_REPORT placement，不覆盖 persona）。新建/首段提交先于长规划及字体研究，小批次写入；界面提供默认样式。仍尊重未实现的表格/DOCX 边界，禁止将工作副本宣称为 Word 文件。标准模式真实模型验收显式选择，沿用公开 Agent.send/Session/原生 Client 页面；无第二 loop。完整 Word 交付的表格/导出仍需后续 U3 实现。

## U2 成果入口、跟随阅读与浏览器下载

2026-09-12：沿用公开 Conversation Definition/Turn 数据及 Chat 自有 keyed node Slot，把成功 content_open/edit 的文档身份保留在完成轮次；独立贡献 Chat 文档卡片，不替换官方同轮文件入口，不伪造本地文件路径。右侧追加内容默认跟随最新位置，用户上滚时暂停。下载通过同一授权 read 取得冻结修订，在浏览器使用已配备的 JSZip 生成段落/标题/文字标记 DOCX；人工编辑先保存并释放，失败禁止下载旧版。此下载不等于既有 DOCX 保真导入，也不新增 content_export 工具或第二服务真源。

## U2 常用文档编辑能力（实施前复用记录）

2026-09-12 用户反馈实时文档工具栏只有 B/I/U/S，无法承担常用 Word 编辑。本轮沿用 Tiptap 3.31.0 StarterKit 原生列表/历史，新增同版 MIT TextStyleKit/TextAlign 扩展；Host 段落/文字语义 DTO 增加可选样式及受限列表层级，不传编辑器 HTML/JSON，旧无样式记录保持可读。官方 Harness 仍复用 sidebar-right.zh.md、Conversation/Tools/Storage/Connection 已验证公开面，插件生命周期及授权不变。UI 扩展需要同步保存、AI schema/capabilities 与 DOCX 下载，禁止添加只能显示、保存就丢失的按钮。常用排版、列表、历史、查找替换/缩放本轮验收；表格/图片/页眉页脚/分页等完整 Word 能力仍后置，八类规划及主线不变。

## U2 原生交付卡片纠正：官方能力复用记录（2026-09-12）

用户明确要求完成成果复用 Harness 原生文件卡，不保留 Office 自绘卡片。任务属于 OFFICE-AI-01/U2—U3 前置；右侧实时工作副本/跟随/下载需求保留。

官方依据：镜像 persistence-catalog.zh.md 的 deliverables/presented、config-catalog.zh.md 的 ui-deliverables；锁定发布包 @deepseek-ai/dsh-client-ui-deliverables@0.1.5-rc.1 README.zh.md、公开 ./client 和类型声明。原生交付卡由该插件的 turnTail 贡献拥有，依赖真正的文件路径及成功 present 声明；不是通用任意资源卡。./client 导出 ProducedFiles（本轮文件改动标签），未导出 PresentedFileCard，不导入私有 types 路径或复制卡片实现。

当前 Office 自绘卡片不等同原生文件交付，过去“原生文档成果卡”表述仅表示接入原生 Conversation 扩展，不表示复用原生文件卡。纠正目标：工作副本完成后通过统一导出服务生成真实 DOCX 文件，走官方受控文件写入与 present 声明，再由官方卡片显示；人工后续编辑与导出文件的修订关系需明确。禁止把 documentId/虚拟 URI 冒充文件路径、伪造成功交付或覆盖用户原件。

缺口与验收：当前 DOCX 仅浏览器即时下载，Host 还没有受控文件导出实现；需核对 fs 的字节写入能力、审批与文件所有权，落地后验证真实文件存在、原生卡片打开、右侧实时文档关联、下载、刷新恢复和去重，随后移除自绘渲染。此轮仅公开面核对，未修改运行代码；新链路业务/浏览器/真实模型测试未执行。

U3 原生卡片桥接公开面补充：rc.1 FileSystem 只提供 writeText、无 writeBytes，不能把二进制 DOCX 冒充文本；当前最小桥接复用官方 tools.execute 的嵌套 bash 与 present，继承 agent/rootCallId/parent token/signal，不直接调用 Host node:fs、不自行判断或提升审批权限。固定 Node 写入程序，用户文字仅进入 DOCX base64 数据，输出文件名经过清理且编码，独立 UUID 与 wx 防止覆盖。Node/bash 不可用、写入拒绝或失败时不给成功交付；保留右侧浏览器下载作为替代。此为现有工具公开组合适配，不新增第二套执行器。需真实模型验证嵌套 present 结果落日志并触发官方 turnTail 卡片。

### OFFICE-AI-01 / U2：复用 Tiptap 官方 Toolbar（2026-09-12）

官方公开 UI 文档：https://tiptap.dev/docs/ui-components/primitives/toolbar 与 templates/simple-editor。来源 `ueberdosis/tiptap-ui-components`，锁定提交 `799929bea4804c73767562b69f8acc2acdb8ac86`，MIT 文本随插件保留。复用 Toolbar/ToolbarGroup、Button 的无 tooltip 分支和官方 SVG；样式转为现有 scoped CSS，避免新建编辑器根或引入全局 SCSS。官方源码导航与现行文档有差异（Tab 捕获、动态 disabled 未监听），适配为 Tab 离开、箭头跳过不可用按钮，原生 select/input 保留键盘语义。字号/字体等控制继续走既有 model/CAS。验收：紧凑单行、窄栏横向浏览所有控制、键盘、已有实时/保存/下载回归；不声称集成收费 DOCX 模板或尚未支持的图片/链接内容模型。

### OFFICE-AI-01/U2：后续AI提交重新揭示右栏（2026-09-12）

复用现有 pending/acknowledge 与官方 sidebarRight.openTabIn，不新增布局/事件传输。当前代码首次 ACK 后后续 edit 未刷新 presentation；客户端先 seen 后 open 会吞掉打开失败。修订方案：新的 agent commit 原子更新 presentation（同 Session/新 requestId/当前 revision/5分钟有效）；human commit 与幂等重放不制造打开请求；客户端仅成功 open 返回后标 seen。验收：ACK→新AI提交→新pending，重放不重复请求，人类保存不重新揭示；现有分批/租约/授权/下载浏览器回归。文件 present 单独生成的产物不等于已接通自动工作副本展示，仍需通过统一工具入口。

### OFFICE-AI-01/U3：DOCX 文件卡与统一正文编辑入口（2026-09-12）

复用现有 DocumentPreviewProps 完整字节、JSZip MIT、浏览器 DOMParser、Office 授权服务/原子记录及同一个 LiveDocument/Tiptap Toolbar。文件字节不进入布局；Client 解析受限 DOCX 正文为严格 OfficeBlockInput，Host 再校验并一次创建持久工作副本，以来源地址+字节摘要作为幂等ID。原文件不覆盖，保留原样下载与原始预览；文字副本下载复用现有统一 DOCX codec。多表、图片、页眉页脚/域等不受支持元素必须醒目说明，不能把简化正文副本冒充完整保真DOCX。客户端解析不能代替Host授权；卸载/文件切换中止请求。验收：文件卡→Toolbar→人工修改保存→DOCX下载→刷新恢复；非法XML、大小/正文限额、并发幂等、复杂文件提示和原件下载。完整表格/图片模型仍是后续U3，不能宣称已完成。

## OFFICE-INPUT-01 官方能力复用记录（2026-09-12）

用户授权 `/office` 八类输出选择、可移除输入标签、可选 `@` 文档引用。复用锁定 rc.1 发布包 `dsh-client-ui-input-trigger/client` 的 registerSource/candidates/onPick/ReferenceCodec，及 ui-conversation 的原生 Lexical reference chips、提交序列化、附件与输入 dock；参考发布包 README 与公开类型、镜像 slots 文档。不替换 composer、不新建发送器。Office 只贡献输出意图和授权下工作副本文档候选。参考/修改分别显式选择，使用真实 documentId 和 sessionId；新建无引用。八类类型选择不是八类编辑器完成，未就绪类型需明确显示状态。验收原生菜单、标签删除、默认新建、参考与修改序列化及 Session 隔离。

### OFFICE-INPUT-01 UI 修复复用记录（2026-09-12）

用户截图显示 input.dock 说明不在原生居中 composer 范围内。移除自有 dock 汇总行和组件，直接使用官方原生 reference chip 展示类型/用途、删除与撤销；不覆写 owner CSS。保留类型与引用 codec。验收标准/窄视口标签位于输入框内、说明行不存在、参考/修改标签可选择删除。

## OFFICE-WORD-RELEASE-01 官方复用及发布收口（2026-09-12）

用户要求验证插件卸载并先完善Word准备版本。复用 Cordis 4.0.2 public registry.values/delete、Fiber dispose；input-trigger registerSource disposer、Sidebar tab registry.get、DocumentPreviewRegistry.getSnapshot；Host Tools registry 与已保存内容服务。浏览器探针通过独立测试插件调用公开API卸载Office Client，验证菜单及右栏注册撤销，原生输入继续工作；Host单独卸载tools/服务并重装验证内容保留。用户草稿引用归composer，卸载不删除用户内容，缺source引用必须拒绝发送。Word收口修复DOCX副本继承monospace/white-space、编辑期间外部原文件更新不得替换当前缓冲；重新跑文本编辑/下载/刷新/真实模型链路，记录表格图片及页面保真未完成。准备预览版，不自动发布或捆绑升级其它模块。

## WORD-RELEASE-02 发布收口复用记录

复用现有官方 Tools defineTool/execute、ToolRunContext signal/token/agent（锁定 rc.1）、原生 present 与公开 Profile tgz 安装，参考镜像 subsystems/tools.zh.md。业务差异：Word-only 制品按实际 esbuild 依赖生成许可清单并失败关闭，独立 staged package，不删除旧实验适配器源码或八类路线；Word 文件写入采用固定 ZIP 元数据、内容摘要命名及同字节已有文件核对，未知写入/交付失败重试使用同一修订，禁止覆盖冲突文件。验收：构建许可无缺项、包无旧 Univer/PPT 依赖、类型/集成/浏览器/实际 tgz 生命周期，执行故障后重试无重复文件及取消不交付。完整表格/图片/分页仍未实现，仅发布 Word 文本预览。
