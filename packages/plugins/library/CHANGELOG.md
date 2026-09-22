# 0.1.0-alpha.3

- 合并上游 `0.1.6-alpha.2` 线：适配 DeepSeek Harness 0.1.6-alpha.2——当前会话改由 `SessionSummary.retainedBy.mainView` 推导；打开会话与资料引用跳转改用官方 `uiWorkspace.openSession`；右栏资料预览继续以官方 `sidebar.right.pane.tab` 注册。
- 版本号撞号修复：本线与上游线都发布过 `0.1.0-alpha.2`（内容不同），合并后重新定版为 `0.1.0-alpha.3`，下方两条 `alpha.2` 记录即合并前的两条线。
- 与 `workdsh-bundle@0.1.0-alpha.50` 需同批安装：组合包自 `0.1.0-alpha.48` 起不再登记「资料库」侧栏行。

# 0.1.0-alpha.2

- 资料库自持侧栏入口：客户端注册 `sidebar.panellist` 行（`id: workdsh-library`、`label: 资料库`、`order: 50`），与它自己的 `main` 面板同属一个插件。
- 修复「有入口、无页面」隐患：入口此前由组合包的工作台登记，只装组合包不装资料库时点击会抛 `layout.selectPanel: main panel "workdsh-library" is not registered`；现在插件缺席就没有入口。
- 与 `workdsh-bundle@0.1.0-alpha.48` 需同批安装：组合包已不再登记该行。

# 0.1.0-alpha.2（上游线同日版本）

- 适配 DeepSeek Harness 0.1.6-alpha.2：当前会话改由 `SessionSummary.retainedBy.mainView` 推导；打开会话与资料引用跳转改用官方 `uiWorkspace.openSession`；右栏资料预览继续以官方 `sidebar.right.pane.tab` 注册。

# 0.1.0-alpha.1

- 建立个人本地资料空间和持久目录树。
- 支持 MD、TXT、HTML、PDF、DOCX、PPTX 原件入库及确定性 Markdown 检索视图。
- 支持列表、关键词检索、读取原件、移动、重命名、递归删除与幂等导入。
- 增加对话资料选择器；新会话默认不选择资料，模型只可搜索和读取本次对话固定的修订。
- 增加 Markdown/TXT 草稿保存、并发冲突检查和用户明确发布新修订。
- 增加搜索过滤、最近资料与任务产物入口、目录移动和页面内“添加到当前任务”。
- 增加 PDF 原件预览、资料停用/恢复及停用后即时拒绝检索和读取。
- 增加真实 `.tgz` 安装、两次冷启动、卸载保留及重装恢复探针。

- 页面改为“一级导航 + 完整目录树 + 原内容工作区”，新建/导入收进目录菜单，文件操作收进行菜单。
- Office 插件通过公开预览注册表贡献 DOCX/PPTX 原件预览；Library 保持可独立安装。
- 搜索结果补充目录、类型、来源、修订、转换状态及命中位置。
- 转换元数据记录页、段落和幻灯片位置；DOCX 保留标题、列表、表格，PPTX 提取备注。
- 增加 5 GiB 聚合修订配额、冲突 operationId 拒绝和转换失败保留原件。
- 目录任务引用仅展开仍可读资料，并强制数量及总字节边界。

- 统一资料库的新建、重命名、删除、停用和移动弹框；Markdown 使用阅读排版，HTML 在隔离 iframe 中保留原始视觉和内联交互。
- 调整 Word 页面宽度、表格换行和 Office 工作区尺寸，减少窄列竖排与无效留白。
