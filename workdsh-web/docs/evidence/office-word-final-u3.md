# OFFICE-WORD-04 Word alpha.2 候选收口（2026-09-12）

用户要求文档理解交给模型，停止扩大跨文档专项后继续Word收口。本轮不增加编辑模块/子智能体/Agent loop；既有图片来源解析是内容工具的数据传递。保留所有八类后续范围，不宣称完整Word。

## 官方能力复用记录

复用已锁定 Harness0.1.5-rc.1 官方CLI/Profile、Tools、StorageDomain、Connection、原生右栏和MIT Tiptap3.31.0；无需改变所有权或新基础抽象。采用既有 scripts/pack-office-release.mjs 与 probe-office-live.mjs，headless验证及隔离Agents home沿用原探针。当前代码候选包含已有图像引用解析，未开发额外引用模块。

## 已完成检查

全仓 build、typecheck通过；test:integration 69项全部通过；check:plan（28模块/50文档）及test:planning 2项通过。原始日志.artifacts/office-release/full-build.log、full-typecheck.log、full-integration.log、plan-check.log、planning-tests.log。独立Word-only tgz卸载/重装探针6项通过，源码之外安装并保留保存内容、入口、工具；日志package-roundtrip.log。git diff --check通过。

README修复当前候选“暂不导入DOCX/未提供content_export”的过时说法、alpha.1候选安装路径及未闭合截图说明。明确公开alpha.1与本地alpha.2候选的能力和打包区别。CHANGELOG说明图片模型投影是原工具扩展；打包清单不再错误写“没有任何WPS验收”，改为WPS样本验证有限及Word/真实IME/完整分页未验。

候选676667字节，SHA-256 fff8149107fc2a1fef20027e703d63a7302d3278816f06cb08606014ca2a1073；实际许可文本齐全，Word-only范围，排除旧Excel/PPT适配器依赖。真实模型及浏览器最终复测结果待续记。

## 范围与未执行

Microsoft Word、真实操作系统IME、多端390px/1920px完整应用与完整OOXML保真未执行；完整分页、页眉页脚、嵌套表格、单元格图片和其他七类实时编辑未完成。来源删除后旧图片引用重试的边界保留。上轮WPS样本/真实模型通过是历史证据，不替代本轮结果。未提交/推送/打标签/npm发布；alpha.1公开发布保持不变。

## 最终复测结果与预览更新

完整16项独立制品浏览器检查通过（.artifacts/office-release/real-rich-final.log前16项），原生图表、跨源图片字节、跟随阅读、人工格式、下载、刷新与DOCX原件/工作副本均验证。两个探针光标问题先后出现表内插图拒绝/选中原图导致替换；改为原生查找定位已知段落、方向键折叠选择，并断言可插表且未选图、插图后原图仍存在；未修改产品编辑器，也未放宽断言。

随后真实模型验收未通过：任务idle，有文档及文件交付，修订0/1在8858/25499ms显示；模型只提交一批，并出现bash/write调用。未读取推理，仅工具名称检查；content_open/content_edit/content_export仍执行。多批且无文件工具绕行断言失败，未伪报为真实模型全部通过。结果.artifacts/office-live-real/real-result.json；前期真实模型通过仅历史证据。完整Word/公开alpha.2发布门槛因此不能宣称完成。

用户催促收口，不进一步扩展功能或重复模型探针。本候选通过官方CLI更新人工preview，保留其他插件及工作副本；不提交/推送/公开发布。下一项只解决原生工具写作策略稳定性，不新增编辑器/理解模块。

## alpha.2 已发布收据

用户授权后已发布 https://github.com/techflag/workdsh/releases/tag/office-v0.1.0-alpha.2 ，prerelease、非draft；源码/标签 e2d138b283c20f065bc0112abb1491583d3f9c1b。6附件（Office及沿用治理配套3包、SHA256SUMS、manifest）状态uploaded、远端大小及服务器SHA256 digest与本地逐一相等，发布tgz编译Host/Client与验收构建字节一致。Git HTTPS smart transport超时，改用GitHub Git Data公开API上传相同blob/tree/commit，逐级SHA核对后非force更新main和轻量标签，未改写历史。最终发布Office附件 676812字节、SHA f6c9d1d78824f80b34dfdc9ccccd6a3a326eb784da51b8269b714875d4e4ad87，manifest记录源提交及既有检查。未发npm。用户之后明确停止Word后续开发，Word待办暂停、下一阶段PPT优先，计划回填main，release标签保持发布源码。
