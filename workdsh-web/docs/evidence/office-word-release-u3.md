# Word 文本预览版与插件制品验收（2026-09-12）

## 交付范围

独立 `workdsh-plugin-office@0.1.0-alpha.1` 预览制品；保留已决定的八类路线，首条完成功能按 Word 文本工作副本评估。README 中明确分批生成实时展示、同文档接续编辑、自动保存/跟随、DOCX下载、原生文件交付和插件按需组合，不宣称完整Word替代。

## 修复及复用

发现六个 ctx.tools.register 的 disposer 未被Office生命周期拥有。改为 ctx.effect，卸载后工具消失。Host卸载服务再装保持原有记录和修订；Client的registerSource/预览/右栏注册用原有托管回调。旧输入标签属于用户草稿，保留并由缺失source的原生codec阻止发送；不静默降级普通文本。停止轮询、请求及Slot由已有生命周期撤销。

DOCX正文在独立文本副本编辑，文件预览背景的字体和white-space不再污染UI；紧凑工具栏固定44px，内容宽度限制在所属页内。编辑期间原文件变化不替换当前缓冲，提示完成编辑后加载新副本。源文件始终保留。

## 验证

- Office typecheck/build通过。
- 内容/输入/导入/下载四个集成文件12项通过，其中新增Host卸载工具与guide→服务卸载→重装→内容/修订保留测试。
- 确定性Word浏览器12项通过：创建自动右栏、分批写入、跟随/手动上滚、工具栏及样式下载、人工编辑/AI接续、保存、刷新、DOCX导入编辑/下载、原件逐字节不变及原始预览。
- 真实模型15项通过：首个文档约2274ms出现，4420/6577ms观察到后续修订；原生present卡、刷新、文件打开/下载通过。保留officecli技能环境，但普通写作通过content工具。
- 真实打包制品及卸载重装6项通过，`node scripts/probe-office-live.mjs --package-roundtrip`：外部临时home/独立官方Web Profile安装Office及显式治理依赖，不装专家/技能/工作台；Client热卸载后菜单/文档引用/预览/右栏注册撤销、旧标签发送失败；官方 `dsh plugin --profile office remove workdsh-plugin-office` 后冷启，工具与guide消失、接口404；再用实际tgz安装并冷启，六工具和原生/office恢复，卸载前真实写入的内容及修订保留。

各browser result.json无pageerror。源码仓库不是运行时工作目录，制品不包含用户凭据或运行数据。候选安装包、SHA256SUMS及release-manifest位于 `.artifacts/office-release/`；包中包含Host、Client、cordis.patch、README、CHANGELOG和第三方许可说明。

## 发布限制

这是Word文本工作副本预览。表格、图片、嵌入对象、页眉页脚及完整分页模型未完成；导入表格仅保留其段落文本并显式警告，原件可下载。其余七类实时适配继续U4；完整U3未知写入恢复、Word/WPS视觉验收、真实OS输入法、标签冷刷新及全仓check未执行。未建立Git标签、推送或对外发布；不修改其他模块版本。

## WORD-RELEASE-02 本次发布收口

独立 Word-only 制品由 scripts/pack-office-release.mjs 构建，源代码旧实验适配器与八类路线保留，分发仅注册 DOCX 文件预览。实际打包50个依赖，完整许可清单，isarray 1.0.0 的 MIT 文本来自其包内 README。无 Univer/ExcelJS/pptx-preview 打包代码及运行依赖；已知双许可选择 MIT，MIT AND Zlib 保留两者。未知许可或缺失文本阻止候选打包。

导出固定 ZIP 时间，文档/修订/内容摘要构成稳定路径。官方 bash 完整临时文件后通过独占链接建立最终文件，重试核对已有摘要，修改/冲突不覆盖。写入回执未知不 present，交付未知返回现有路径，取消后不继续交付。baseRevision 可选且 mismatch 拒绝。新增真实命令管线故障测试验证写入已成功但回执丢失、复用唯一文件、人工改文件保护、修订变化、present 回执丢失及取消。

本轮全仓 build/typecheck、65/65集成、check:plan、2/2规划测试通过。最终 Word-only tgz 明确通过12项真实浏览器及6项CLI卸载/重装检查，无pageerror。真实模型不重复执行，沿用此前15项证据；Word/WPS、OS IME、跨执行世界/跨 Host 导出恢复、掉电持久性未执行，不声明完整 U3/U5或Word整体完成。发布标签office-v0.1.0-alpha.1，为预览版。

## 实际发布回执

源码 2c18bd79746381d9febb54ae4ef3f9ac4187d145 已推送 main；office-v0.1.0-alpha.1 指向该提交，GitHub [预览发布](https://github.com/techflag/workdsh/releases/tag/office-v0.1.0-alpha.1) 已公开。6个附件（4个tgz、摘要、manifest）逐一核对上传摘要与本地文件，Office Word-only包558347字节。未发布npm/Desktop，未改用户当前Profile或打断用户应用。
