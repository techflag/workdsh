# Univer 纯浏览器 Excel 编辑探针

独立兼容性示例，尚不是 Harness 插件，不更改应用 Profile。

```sh
cd examples/univer-browser-edit
corepack pnpm --ignore-workspace install --frozen-lockfile --ignore-scripts
corepack pnpm --ignore-workspace build
cd ../..
node scripts/probe-univer-browser-edit.mjs
```

浏览器测试以 Playwright 拦截静态资源，不启动 HTTP 服务或 Office 转换进程。手工体验可将 dist 放在静态站点；静态分发与服务端 Office 转换是不同职责。文件转换在浏览器完成，无第三方上传。

Univer@0.25.1 编辑，ExcelJS@4.4.0 转换。当前只验证单元格值、普通公式与多表。原有基础格式通过保留 ExcelJS 模型带回，不等于格式已映射到界面。不支持的工作表结构和单元格格式修改会拒绝导出。浏览器公式重算未验收；导出清除缓存并标记重新计算。

含图表/绘图/pivot 等对象时拒绝导出，当前不显示这些对象。这只是已知对象检查，不保证覆盖未知 Office 扩展。真实复杂文件、撤销、取消、压缩包展开/单元格数量限制、恶意文档、Host 保存冲突均未验收，不可投产。Word、PPT 未实现。

HTML、CSS、浏览器逻辑、适配器分开。依赖在示例独立锁定，没有升级根 Harness。测试文件、JSON、截图位于 .artifacts/univer-browser-edit。
