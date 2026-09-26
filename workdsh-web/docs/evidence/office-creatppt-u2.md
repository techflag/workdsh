# CreatPPT 原生应用接入验收 U2

2026-09-12。前序独立适配见 office-creatppt-u1.md；本证据覆盖正式应用集成。

原生 DeckSpec 存入既有 Office StorageDomain，复用可信 Session、组织/工作区授权、审计、CAS、幂等、租约和显示请求 ACK。AI 使用原六个 content_* 工具按类型分派；人工原生页面 PUT 通过同一 Host commit 保存。AI 禁止全量替换 deck，人工保存必须持租约；卸载入口遵循既有 Cordis effect。

发布包浏览器页面由标准 esbuild 内联装配进受限 iframe；未读取 Vue 私有状态或复制第三方源码。MessageChannel 只适配原生公开 deck GET/PUT与下载动作；凭证不进入 iframe，临时本地缓存按文档隔离。自包含资源解决真实 Harness 带身份静态资源与 sandbox 的兼容失败。文本新建使用原生 statement/planSlide，未关闭导出质量检查。

## 已执行

- Office build/typecheck；12/12 内容及原生页面集成测试通过。
- node scripts/probe-office-live.mjs --ppt：8项通过，无browserErrors。确定性官方Session/Tools执行，不调用LLM。自动打开官方右Tab、两批提交自动更新/跟随新页、原生人工编辑保存、真实PPTX下载、刷新重开保留内容。
- node scripts/probe-office-live.mjs：Word16项应用回归通过。
- 18989 原人工profile，仅通过官方CLI安装Office alpha.3 content-addressed本地tgz，Host/Client字节核对。候选摘要 d76474fc8cdd3f39db1616da2340e5799998cca6189240320af4ede0323671cf。保留其余profile层与19091用户试用页面。

工件 .artifacts/office-ppt-live/result.json、native-ppt-right.png、native-live.pptx。原生独立测试另核验PPTX ZIP中包含可编辑中文文字。

## 尚未完成

真实模型新任务自然语言验收通过：node scripts/probe-office-live.mjs --ppt --real-model。请求仅为“将工作日报重新生成PPT”及显式参考资料ID（模拟文档引用，不含/office或工具指令）。真实DeepSeek模型调用顺序 content_read → content_open → content_edit → content_read，原Word快照完全一致，PPT6页、revision1、任务idle，无bash/skill/write/edit。首个PPT约5.46秒出现、约9.81秒提交正文；实际模型单批提交，不声称多批或逐字流式。截图 real-native-ppt.png 已查看，右侧原生页面与六页成稿可见。工件 .artifacts/office-ppt-live-real/real-result.json。--ppt --real-model --with-ppt-skills 同样通过：将用户全局pptx和elite-powerpoint-designer技能目录复制到隔离DSH_AGENTS_HOME后执行同一自然语言测试，未修改技能原件。实际读取/创建/编辑原生PPT，无脚本或技能加载调用；记录 .artifacts/office-ppt-live-real-skills/real-result.json。这属于带技能可用的新任务测试，不是已加载技能的旧会话回放，后者未执行。18989正常客户端/office菜单已通过独立浏览器读取，office.ppt显示支持实时写作；未向用户任务发送消息。本轮只增加验收脚本/文档，没有新增“日报转PPT”场景提示或修改用户技能。PPTX文件导入、受控文件交付卡、传递依赖完整许可审查与公开PPT发布未执行；当前只支持右侧浏览器下载。未宣称完整PPT/八类完成。用户截图旧意图 liveEditingAvailable:false 与文件技能流程是诊断证据，不能直接推断模型收到新版接口后仍失败。

## U3 用户反馈修正

session.v32（仅读取作为日志，未执行其嵌入命令）确认模型语义提交成功到revision4、成稿9页。官方后台bash测试exit0已完成；未调用content_export，原生PPT文件卡未实现。中文rail.openSlide发布包文本实际是“打开第 {number} 页”，此前错误匹配“打开幻灯片”使ready/follow失效。GET返回工作副本后才允许ready，防止原生初始示例页抢先匹配；整帧inert移除。按用户要求PPT默认直接编辑，页面不获取租约，取消编辑/完成按钮；人工全Deck保存保持可信Connection/授权/审计/幂等/CAS。输入dirty期间不重载，旧轮询响应不能使修订倒退。中文窄栏和1600px原生导航/真实下载测试4项通过；默认编辑应用8项回归通过（实际Tools/官方右Tab/直接编辑无租约/真实PPTX下载/刷新重开）。初始化原生PUT在没有人工输入时不写Host，避免自动保存旧快照与AI提交争用；真实交互才启动保存。测试tarball按内容摘要地址安装并固定Profile pnpm版本，解决旧包缓存与过长文件名；最近回归确认编辑按钮已移除。Word租约与原测试保留。

18989已安装默认编辑修复候选，Host/Client编译字节核验，重启官方preview。PPT正式文件卡尚未实现；本轮未执行旧任务LLM回放/默认编辑真实模型复测/完整传递许可与公开发布。

## U4 跟随变更页

用户7页反馈：页数已更新，原策略每次固定选最后页没有体现修改位置。页面比较前后提交快照，选择首个新增/内容变化页；排序/删除选择受影响索引。原生按钮以公开DOM点击完成导航，不读取Vue私有状态。新增实际工具修改中间页用例，要求右侧展示该页。制作展示粒度仍是内容工具提交，不伪造模型思考或拆分原子批次，单批制作逐字效果未实现。

U4：Office typecheck/build、git diff --check及实际应用9项回归通过；18989通过官方CLI安装内容摘要候选、核对Host/Client编译字节并重启。本轮未执行真实模型7页任务复现/逐字流式制作/文件交付卡。

## U5：真实逐页制作（2026-09-12）

- Host 限制 AI 一次内容操作最多涉及一页；新稿一页起步，人工 replaceDeck 不受限制。结构操作仍原子批处理。
- 契约与存储增加可选 focusSlideId，兼容旧记录；客户端优先使用明确 ID，删页时取邻页。
- 官方工具 schema DSL 不支持 maxItems；未扩展/修改底座，以插件服务校验和能力描述实现。
- 8项内容集成、Office类型检查/构建、实际Harness应用9项回归通过。
- 真实模型请求“将工作日报重新生成5页PPT”：6次 content_edit，5页，读取并保留原件，画布最终匹配明确焦点；无 bash/skill/write/edit 绕行。快照出现时间：初始化5481ms，五次内容提交7636/8733/9864/12036/13117ms，收尾修订19630ms。
- 首次真实试验列表放入 statement.bullets，模型读取本地实现确认不可见字段；依据发布包原生版式行为补充 statement+body / agenda+bullets 的通用 API 描述，复测通过。
- 候选 archive SHA256 b82fe791560932c28dab7a405891986e81219521ceb5b53d9aa3088cdef67648，通过官方 CLI 安装18989并重启。安装Host SHA256 bd5db6f20a42342df76143869ef6c354ed8205109a34fc33a94d2ab26f9a0c13；Client b959fe45110cea2639c7b63dad49f802d0b62f59c6be7539bdce8d41e8e92c1d。浏览器需刷新。
- 边界：轮询可能合并极短间隔提交；旧用户会话7→5页压缩复测、受控文件卡/完整许可发布门禁未执行。PPT未发布。
