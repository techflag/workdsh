# OFFICE-WORD-03 发布前验收（2026-09-12）

使用既有独立 Word-only alpha.2 候选（674787字节，SHA-256 af7ceb7c56e84a4bfd9a4c8cf4f2bfab596d919527b2be0e90af4047a768885e），未修改产品模型/工具/codec。本轮扩大验收，不以通过测试宣称完整 Word。

## WPS 基础打开

通过 CUA 操作本地已安装 WPS Office。WPS 自定义文件窗口操作最初失败（noWindowsAvailable/剪贴板超时）；关闭该窗口后，经访达前往实际路径并打开文件成功。打开 `.artifacts/office-live/live-document.docx` 与 `docx-import-original.docx` 均无文件修复对话框。后者首页截图检查：中文标题、加粗/颜色/高亮文字、编号、三列表格和两列合并标题表格可见，文字可读。右对齐资料图片仅见页底边缘，因此不将本次截图当作完整图片显示验证。WPS 显示缺失字体提示，属测试环境字体兼容提醒，本轮未安装/修改系统字体。测试文件关闭时无保存提示，未编辑文件，也未改默认应用/自动上云配置。

此检查仅说明这两份实际导出制品可被 WPS 打开并显示已观察的内容。Microsoft Word 未安装，未执行 Word 兼容性；复杂分页/页眉页脚/目录与各类 OOXML 无损转换仍未完成。

## 真实模型富文档

新增 `probe-office-live.mjs --real-rich` 复用既有官方 Agent.send/Session/Tools/原生右栏诊断。输入自然语言报告请求以及探针生成的 PNG 资料，不指定工具名称，要求两列表格及图片并交付 Word。要求首工具 content_open、至少两次 content_edit、无 shell/Skill 绕行，页面表格/图片与 DOCX OOXML/media 均存在，原生文件交付可重开下载。

探针前置修复：真实状态诊断插件访问 Office 服务须声明 inject；仅真实模型模式添加该依赖，卸载重装探针保持无 Office 必需依赖。人工光标测试等待 Tiptap 原生 focus 的动画帧后点击可见正文，减少焦点调度竞争，不绕过单元格图片校验。诊断插件不进入发布物。

实际执行结果在下方续记。

首个实际富文档场景未通过：正文/表格修订在3461/5625/11053ms显示，180秒仍running，无交付。只解析官方压缩 Session 日志的工具调用与结果（不读取推理内容）：一次表格错误把rows放顶层并漏runs，随后按既有schema自行修复并提交；接着bash检查模型重抄的长PNG数据，CRC失败。不是页面漏显示，也不是分页字体问题。接下来补充插件既有写作引导，明确嵌入数据原样使用、不走shell修复，无法写入时说明边界并继续交付。紧凑PNG验证仅覆盖有限资料，长二进制资料应走可授权资产引用的后续设计，不能声称已解决。

第二次复测：真实模型已完成富文档并idle，修订0/1/2/3/4分别在4427/6586/26146/30528/36984ms；未调用bash/skill/write/edit，content_export产生官方交付。表格/图片出现在页面和导出DOCX。后置下载探针仍未通过：Word-only原始排版iframe的导出按钮已隐藏，旧探针错误点击该按钮并产生未处理的等待超时。修正为点击外层已有“下载原文件”，同时要求文件字节等于交付文件，并增加提供的图片字节逐一相等检查。此为探针错误，未新增或替代产品下载实现。最终复测结果另记。

## 最终结果

`--real-rich --office-tgz=<alpha.2.tgz>` 最终19项通过，browserErrors为空，真实任务idle。修订时间为[{'revision': 0, 'elapsedMs': 9716}, {'revision': 1, 'elapsedMs': 11895}, {'revision': 2, 'elapsedMs': 18369}, {'revision': 3, 'elapsedMs': 23778}]。实际工具顺序为['content_open', 'content_edit', 'content_edit', 'content_edit', 'content_edit', 'content_read', 'content_export']，无shell/文件Skill绕行；包括提供图片的data URL逐字相等与官方卡片下载字节逐一相等验证。原始结果 `.artifacts/office-live-real/result.json`/`real-result.json`，页面截图 `native-deliverable.png`/`real-document.png`，下载制品 `native-card-document.docx`。临时凭据已由探针finally删除。长PNG首次失败不能被紧凑PNG通过掩盖，授权资产引用仍是后续任务。

把最终真实AI卡片下载制品通过访达打开WPS，截图观察一页文档中的两列三行表格、正文/标题、完整居中蓝色PNG均正常显示，无修复弹框。本轮截图由CUA返回，未另存仓库截图文件。关闭测试文件无保存提示，未编辑原件。WPS仍有缺失字体提示，未改系统字体。Microsoft Word、复杂分页/页眉页脚/目录、OS IME、390px/1920px完整应用测试未执行。

Office typecheck/build、16项Office集成与6项实际安装/卸载重装通过；node --check和git diff --check通过。本轮未重跑全仓build/typecheck/68集成与planning门槛，上一轮结果保留。未提交、推送、打标签或公开发布。最新候选674950字节，SHA-256 `dbd4679819c3c2202f26cfdc84148a44536f0e279c17a2077fcd8bb80f4e6636`，打包许可文本齐全；通过官方CLI更新preview，只替换Office包，应用18989重启并保留其他插件/内容。

## OFFICE-IMAGE-REF-01 官方能力复用记录（实施前）

官方文档：https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/development.zh.md、capability-seams.zh.md；锁定发布包 @deepseek-ai/dsh-tools@0.1.5-rc.1 的公开 defineTool/register，以及既有官方 StorageDomain/Connection。沿用六工具、ContentService 授权及提交，不增加资源注册表、上传服务或文件路径读取。已有 office-content / office-rich-editor 探针覆盖真实 Cordis 服务和原生图片保存。

最小业务差异：AI 工具快照将已存图片 src 投影为 office-image:<blockId>:<SHA-256>；仅允许引用本次编辑目标文档已有图片，Host 授权读取后核对哈希，解析为原始嵌入字节再走原提交。页面快照、持久模型和 DOCX 导出不变。跨文档/任意文件/网络资源接入仍后置，不能把该引用冒充官方文件资源。源图片已移除/改变的引用明确失败；已提交后源被移除的重试仍可能失败，此阶段要求重新读取，不声称通用资产幂等已完成。验收：工具不返回图片 Base64、引用字节保持一致、篡改/跨目标/跨组织拒绝、正常提交与导出回归。

### IMAGE-REF-01 实施与验证

已在 ContentService 添加模型投影/授权引用解析，并由既有六工具调用。页面/存储 DTO 没有改变；工具模型 src 返回短引用，复制到同目标编辑请求后还原原图。17项Office集成通过：新增真实Tools调用检查引用/原图相等、正常幂等重试、篡改哈希/另一目标/跨组织/已移除源拒绝，以及失败不改变目标修订；既有原生图片/表格/导出回归保持通过。第一次集成失败是测试仍拿AI投影与页面原始DTO直接比较，以及新测试cleanup误用ctx.dispose；改为各自投影比较和Cordis fiber.dispose后全17项通过。Office类型检查、Word-onlybuild/许可证打包与git diff --check通过。独立tgz浏览器15项通过，结果.artifacts/office-live/result.json；该浏览器基线覆盖现有实时/人工图表/下载/重开，引用专用断言在Host Tools集成中，本次没有真实模型/WPS复测或全仓门槛。

最终包含README新增引用说明：676118字节，SHA-256 d45b08597028e51e13811f892c52e5681c30274ae22867879b3f453adc75b51a。通过官方CLI更新preview，保留其他插件/工作副本；尚未提交或公开发布。下一步：在真实模型流程使用人工已保存图片引用验收，并设计新资料图片/跨文档资源的官方授权接入；保留源删除后的重试边界，不能宣称完整资产方案。

## OFFICE-IMAGE-REF-02 跨工作副本文档（实施前复用记录）

用户继续授权接通跨Word工作副本图片。复用锁定 @deepseek-ai/dsh-tools@0.1.5-rc.1 README.zh.md 的 defineTool/register、既有 ContentService.read/edit 和官方存储、身份、Access、人工租约/CAS。业务差异是模型短引用增加源documentId；解析时分别检查源读取与目标编辑，核对SHA-256后把已有嵌入字节复制到目标。原文档不写入，目标独立保存，后续原图变动不联动。临时请求内缓存只保存已授权快照，不增加资产表/registry/传输/文件API；旧短引用保持同目标兼容。

来源范围仍是可读取的Office工作副本，禁止把字符串当宿主文件路径或绕过组织/工作区检查。源缺失/图片已改拒绝，目标CAS失败不提交；源删除后的旧引用重试边界仍保留。验收包括真实工具跨文档复制、字节/源修订不变、来源更新不影响目标、撤权/跨组织/工作区拒绝、下载图像与浏览器回归。八类编辑器状态不因此改变。

### IMAGE-REF-02 验证及暂停范围

最终17项Office集成、类型检查、Word-only打包、16项独立制品浏览器检查通过。新增浏览器检查跨文档图片实际展示、DOCX图片字节相等、来源修订不变；Host覆盖哈希失效/跨组织/工作区拒绝/源删除后目标独立保留/旧引用兼容。测试最初遇到图片错误消息断言及工作区fixture试图重绑既有Session，分别改为明确消息和新可信Session；浏览器探针的officeRequire声明位置错误修正后通过。完整Word/真实模型/来源单独撤权复测/全仓门槛未执行。候选676562字节、SHA bddf048d3bda4f3a3f02ba60d8eb849551f3d469ed3c02401e7d247e8cc3e1ad。用户随后提出跨文档理解应由AI完成，暂停扩大该专项；代码候选保留、未安装人工preview、未提交/发布，18989原同文档版本保持运行。
