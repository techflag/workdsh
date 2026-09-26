# Office 纯浏览器编辑探针

## 官方能力复用记录

用户授权的基础能力探针；不变更 D04/D15 状态。Harness 文件 Tab 所有权仍属官方 sidebar-right/documentPreviews；本次隔离示例不注册 Harness 插件、不更改 Profile、不声明安装制品。后续接入使用锁定 0.1.5-rc.1 的公开 Slot/文件资源契约，正式写入须另验权限、版本冲突和回执。

浏览器编辑选择 npm @univerjs/presets 与 preset-sheets-core@0.25.1（本轮 registry 查得版本，独立锁定，禁止据官网 v1.0 文档猜测发布包支持范围）。ExcelJS@4.4.0 只作为独立转换候选；与 Univer 的公开快照映射属于自有适配差异。官网 https://docs.univer.ai/guides/sheets/getting-started/quickstart 说明 Facade 编辑/保存，不能原地修改旧快照充当编辑。

范围：数值、文本、布尔、普通公式、多工作表、合并单元格及基础格式的候选验证；复杂 Office 保真、原生图表、Word、PPT、Host 保存均未验收。转换完全在浏览器，不使用 Gateway/转换后端。遇到不能保真的内容须阻止导出，不能删掉原始数据假成功。

## 本轮结果

独立依赖安装与构建通过。node scripts/probe-univer-browser-edit.mjs 实际 Chromium 测试通过：生成真实 XLSX，经浏览器内 ExcelJS 转换到 Univer；Facade 把 B2 从 10 改为 25，再真实双击单元格、键盘输入 35 并 Enter，Univer 当前快照与导出 XML 都确认 35。两个工作表、原数字格式与 B2*20 公式表达式保留。公式缓存清除并要求 Office 重算；截图显示浏览器原缓存值，浏览器实时公式重算未通过验收，不宣称计算闭环。

合成 chart part 检测反例确认禁用导出且绕过按钮调用也拒绝。这不是实际图表保真测试，更不是六图表文件验收。没有外部网络请求，没有转换服务，没有更改原件或 Profile。测试产物位于 .artifacts/univer-browser-edit（input.xlsx / edited.xlsx / editor.png / result.json）。

视觉复核：1440×1000、浏览器默认缩放截图已检查，原生 Univer 编辑界面完整显示，操作栏及状态文字可见。小屏、深色、正式应用右侧 Tab 尚未执行。复杂格式映射、图表、Word、PPT、Host 保存权限与冲突未实现，不能用于原件覆盖保存。

工程检查：已登记兼容探针模块；pnpm-workspace 排除该独立示例，使用示例自己的冻结依赖锁，根 Harness 锁未变。规划检查和2项规划测试通过，git diff --check 通过。正式插件全量构建/集成未执行，本次没有修改其运行代码。
