# Office 0.1.0-alpha.1

Word 文本工作副本预览版：对话里提出要求，AI 创建文档后自动打开右侧编辑器，分批写入时实时展示。

- 支持常用文字/段落样式、列表、查找替换、撤销重做、自动保存及跟随阅读。
- 人工编辑与 AI 使用同一文档服务；保留人工修改并接续写作。
- 右侧下载 DOCX，完成后通过 Harness 原生文件卡交付；DOCX 导入创建文本副本并保留原件。
- `/office` 输出选择与可选 `@` 文档参考/修改，新建无需引用。
- 独立 Host/Client 插件；卸载撤销入口和工具，保留已保存内容，重装恢复。
- Word-only 包剔除旧 Excel/PPT 适配器，实际依赖许可文本齐全；导出重试复用同修订文件并保护冲突文件。

此版本不是完整 Word 替代：不支持编辑表格、图片、页眉页脚及完整分页，其余七类实时适配仍待接入。Word/WPS、真实 OS 输入法及跨 Host/掉电恢复未验收。

验证：全仓 build/typecheck、65 项集成、2 项规划、12 项 Word 浏览器与 6 项真实 tgz 安装/卸载/重装检查通过；本次未重复真实模型请求，沿用此前 15 项证据。

附件包含 Office 和配套本地身份/授权/审计插件，以及 SHA256SUMS 与 release-manifest。已配置 WorkDSH Profile 的用户只需安装 Office；保持同一 DSH_HOME 与 Profile，安装前停止应用，安装后重新启动。

```bash
DSH_HOME="$PWD/.test-runtime/preview" \
  corepack pnpm exec dsh plugin --profile preview add \
  /绝对路径/workdsh-plugin-office-0.1.0-alpha.1.tgz
corepack pnpm preview
```

更多配置与截图见仓库中英文 README。仅 GitHub 预览发布，不发布 npm 或 Desktop 安装包。
