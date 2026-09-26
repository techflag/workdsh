# Univer 完整组件验证与交付范围

2026-09-12；用户明确要求截图全部类别，决策见 ADR-0023。此次进行了真实发布包安装、浏览器初始化探针，并未完成全套应用接入。

## 官方能力与版本

安装文档（文档版本1.0.0-rc.0）：
- https://docs.univer.ai/guides/sheets
- https://docs.univer.ai/guides/docs/getting-started/installation
- https://docs.univer.ai/guides/slides/getting-started/installation
- https://docs.univer.ai/guides/boards/getting-started/installation
- https://docs.univer.ai/guides/bases/getting-started/installation
- https://docs.univer.ai/guides/pdfs/getting-started/installation
- https://docs.univer.ai/guides/license

Registry逐包核对，Boards/Bases/PDFs/pro Slides/embed新族对应0.25.1不存在、1.0.0-rc.0存在。核对community0.25.1 Slides真实存在。不能使用registry浮动latest，因为多个pro包latest实际指向insiders旧日期包。

`scripts/univer-full-sdk-packages.json` 固定新族精确版本；`node scripts/install-univer-full-sdk-probe.mjs` 在.artifacts/univer-full-sdk隔离安装，不改变业务Profile或Harness依赖。完整安装包含新族Sheets/Docs/Slides/Boards/Bases/PDFs/Embed、Boards表格/思维导图/Ink/Shape技术依赖。没有获取、复制官网许可，没有启动Office转换服务。

## 探针与发现

`node scripts/probe-univer-native-editors.mjs`：旧族Docs原生选区键盘修改成功，Slides公开Operation修改snapshot成功。截图和JSON在.artifacts/univer-native-editors。实际Office文件导入导出未执行。

`node scripts/probe-univer-full-sdk.mjs`：新族组合构建可完成，在与当前应用相同的opaque srcdoc iframe中报IndexedDB拒绝；Bases还报history.replaceState在null origin不可用。公开ILocalStorageService临时内存adapter未消除此IndexedDB错误，不应将其宣称为已解决。原生存储访问可能涉及其他SDK服务，尚未定位。

`node scripts/probe-univer-full-sdk.mjs --origin-frame`：仅测试路由提供不同来源页面，parent和编辑器不共享origin。IndexedDB/history错误消失；初次Slides/Boards报redi未注册依赖（N5/X7）。公开导出定位为Pro公式外部引用服务；将公开preset中的普通UniverFormulaEnginePlugin替换为UniverProFormulaEnginePlugin并在组合首位注册license后，错误消失。该依赖属于SDK技术装配，没有自行开发额外公式计算模块；不因snapshot可生成而宣称UI完整完成。没有将allow-same-origin加到生产srcdoc，没有弱化当前应用隔离。

结果文件：.artifacts/univer-full-sdk/result.json、origin-frame-result.json。探针失败应返回非0；这些是兼容性反例，不能当作全组件通过。显示canvas不等于完整组件编辑、有效授权或Office转换完成。

## 有限退出矩阵

| 类别 | 交付内容 | 当前状态 |
| --- | --- | --- |
| Sheets | 原生工具栏/单元格编辑/表格图形与导出 | 0.25.1已有有限单元格闭环；新族初始化和A1原生Facade修改通过；应用迁移及高级对象待签收 |
| Modern Docs | 原生块文档/直接页面编辑 | 旧族文档键盘探针通过；新族MODERN布局原生选区键盘与Facade修改通过 |
| Traditional Docs | 原生分页文档/直接页面编辑 | 新族TRADITIONAL布局原生选区键盘与Facade修改通过；真实DOCX转换未完成 |
| Slides | 原生幻灯片/对象与文字编辑 | 旧族Operation通过；新族初始化及原生追加幻灯片通过；完整对象键盘编辑待验收 |
| Boards | 原生白板/图形/表格/思维导图 | 新族初始化及原生插入文字通过；表格/思维导图交互待验收 |
| Bases | 原生多维表/字段记录视图 | 新族初始化及原生新增表通过；记录/视图交互及重新打开未签收 |
| PDFs | 原生PDF页面/注释与支持的编辑 | 新族初始化及原生新增页面通过；实际PDF导入/编辑/输出未签收 |
| Compose & Embed | 多类型真实关联和嵌入 | Embed插件注册探针；真实嵌入及资源授权未执行 |
| Customization & Integration | 中文/主题/响应尺寸/官方Tab生命周期 | 现有Office Tab存在；新族完整生命周期及视觉未签收 |

所有类别都保留，未加入“假完成”菜单或空工具。次序：公开包组合与依赖修复 → 安全浏览器容器 → 原生snapshot编辑保存重开 → 官方Tab集成 → 真实文件导入导出。每一类独立验收，不能用字节文本提取覆盖复杂原文件。

授权问题已向用户询问；应用尚无新族授权配置入口。授权需求与授权成本只能由官方确定，本轮未购买、申请或对外传送资料。

检查：旧族原生编辑探针和Office类型检查通过；新族独立来源测试页面中8类初始化、canvas及原生Facade修改通过，两类Docs键盘修改通过；错误/外部请求0。实际UI视觉需另行逐类复核，授权水印保留。现有opaque应用容器兼容尚未通过。业务全量测试、真实文件转换、组件编辑撤销/保存重开和应用接入未执行。尚未重装应用、提交、推送或发布此迁移。

补充：探针临时测试的ILocalStorageService内存适配器没有解决opaque问题，已从最终探针移除。最终运行直接复用官方SDK，独立来源仅由Playwright路由在测试中提供；生产独立编辑器来源的安全资产交付与认证设计尚未实施。Embed项的修改仅是宿主文档文字，不能当作真实嵌入通过。
