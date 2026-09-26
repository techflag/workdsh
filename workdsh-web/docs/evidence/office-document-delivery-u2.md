# U2 文档成果卡片、跟随阅读与下载

日期：2026-09-12；Harness 0.1.5-rc.1，Cordis 4.0.2；Office 独立插件。

## 官方能力复用与实现

- Conversation 镜像 `subsystems/conversation.zh.md` 与已发布 `@deepseek-ai/dsh-client-ui-conversation/client` 的 ConversationNodeDefinition、Location Data、uiConversation.events.register。独立聚合每轮成功的 content_open/edit 工具结果，以 toolCallId 关联调用；读取、失败结果和普通回复不会生成产物卡。
- 已发布 `@deepseek-ai/dsh-client-ui-chat/client` 的 ChatNodeDataMap、ChatConversationViewNode 及 `conversation.chat.node` keyed Slot。在 turn/end 后贡献独立卡片，按事件重放恢复，保留官方文件产物与动作入口。没有替换 turnTail chain 或读取私有实现。ui-deliverables 的类型导出不等于可直接 ESM 导入其浏览器模块；构建验证发现这一限制后改用以上公开 Slot 扩展。
- Client model 持有人工编辑事务，右侧和成果卡片下载共享同一个活跃文档 model；先保存并释放编辑租约，组合输入未完成或保存失败时拒绝下载旧内容。
- 下载复用授权 Connection read，冻结返回的修订，在浏览器由现有 JSZip 3.10.1 生成 DOCX。包含段落、标题、四种文字标记、换行、中文及 emoji；无本地 Office、服务器转换或上传。
- ResizeObserver 观察纸张增长，默认滚到末尾；用户上滚后暂停，滚回底部或点击“跟随最新内容”恢复。人工编辑由原生编辑器控制选区，不强制跟随。

## 验证

执行：Office typecheck/build；`node --test tests/integration/office-content.test.mjs tests/integration/office-download.test.mjs`；`node scripts/probe-office-live.mjs --real-model`。

结果：4 个集成用例通过，独立预构建 Profile 的 11 项检查通过，浏览器异常为空。浏览器验证长内容两批追加、上滚暂停/恢复；下载前刚输入的文字保存并进入 DOCX，校验 XML 转义、中文、emoji 和加粗。真实模型普通报告请求首个工具为 content_open，连续 content_edit；完成后卡片打开和下载通过，刷新仍保留卡片。只读和失败结果不生成成果，同轮同文档去重。

制品：`.artifacts/office-live-real/result.json`、`real-result.json`、`real-document.png`、`live-document.docx`、`card-document.docx`。模型凭据仅使用已配置 preview 的引用，在隔离临时 Home 使用后清理，不写入制品。

已通过官方 CLI 安装新版 Host/Client 到项目 preview，并重启 18989。未改用户原件，未提交/推送/发布。

## 有限范围

卡片保留可继续编辑的持久文档，下载使用当前已保存修订；下载出的 DOCX 是独立文件，不随之后修改改变。本轮没有实现既有 DOCX 保真导入、表格、AI content_export 工具及其他七类的实时工具链。没有在 Word/WPS 中验收最终分页；完整 U3 保真交付、全仓回归和完整专家/PTC 矩阵未执行。
