# 资料库 0.1.0-alpha.1 验收证据

日期：2026-09-16。模块：`workdsh-plugin-library`。范围：D06 / P1-06。

## 已验证闭环

- 五类真实字节样本（Markdown、TXT、文本 PDF、DOCX、PPTX）可导入指定目录；原件、不可变派生 Markdown、SHA-256、`conversion.json` 和位置元数据可复核。
- 目录树支持新建、导入、展开、重命名、移动、删除、目录内创建；原始内容在右侧工作区打开。DOCX/PPTX 通过可选 Office 插件公共预览注册器打开原件，资料库没有导入 Office 内部实现。
- 标题/正文搜索支持类型、来源、日期过滤，结果返回目录、固定修订、来源、转换状态及页/段/幻灯片位置。
- 新对话默认不引用资料；显式文件/目录选择固定修订，有数量及字节上限；停用即时阻断读取，目录选择会排除不可读子项。
- 草稿保留基线，expected revision 防止静默覆盖；发布前展示当前修订和草稿；并发发布冲突；发布产生不可变新修订。
- operationId 相同且输入相同返回既有结果，输入不同报冲突；配额、伪类型、损坏归档、压缩炸弹、路径逃逸和取消不会产生半条资产。转换器意外失败时保留原件并标记不可搜索。
- `library_search` 和 `library_read` 只读取本次任务显式选择的固定修订。真实 DeepSeek 模型已经完成 search → read → answer，结果见 `library-alpha1-real-model.json`。
- 独立 `.tgz` 经两次冷启动、卸载保留 `$DSH_HOME/library`、重新安装和资料恢复验证。

## 验证命令

```text
corepack pnpm --filter workdsh-plugin-library test
corepack pnpm build
corepack pnpm typecheck
corepack pnpm check:plan
corepack pnpm probe:library
corepack pnpm release:library:pack
```

`corepack pnpm check:acceptance P1` 仍报告其他 P1 模块的既有待办；资料库对应的 B03 已单独通过并绑定本证据。开发顺序表仍保持 D04 为当前步骤，因为 D05 的全项目依赖尚未结束，不能据此虚报整个 P1 完成。

## 发布物

发布候选位于 `.artifacts/library-release/`，包含 `workdsh-plugin-library-0.1.0-alpha.1.tgz`、`SHA256SUMS.txt` 和 `release-manifest.json`。本地个人空间、无扫描 PDF OCR、Office 原件预览需要可选 `workdsh-plugin-office`，均在 manifest/README 中说明。

资料库 0.1 不创建派生搜索索引：当前搜索直接读取不可变 `content.md`。因此不存在不可恢复的独立索引状态；未来加入索引时必须把它保持为可从修订重建的缓存。
