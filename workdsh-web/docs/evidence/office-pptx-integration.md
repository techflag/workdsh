# 当前 PPT 编辑器集成

官方能力复用记录：Office PPT 集成；文档 `https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/subsystems/client-modules.zh.md`、`client-resources.zh.md`、`slots.zh.md`；锁定 Harness 0.1.5-rc.1，公开 documentPreviews + sidebar.right.tab.document；资源字节与文件授权由原生 Owner 提供。插件 Client 按官方模块图加载，Slot/registry 由现有 ctx.effect/slots.inject 托管。不引入 iframe、Agent loop 或模型服务。

用户确认 19093 当前中文原生体验作为集成基线。唯一提供方 pptx-react-viewer 3.16.5 / pptx-viewer-core 3.14.3；旧 PPT 代码、构建依赖与专用实验探针退出。固定版本的工具栏/Inspector 适配在 esbuild 读取时完成；依赖发布文件未修改。CSS 通过 AST 限定在编辑器容器，locale 使用独立 i18next 实例。

现有 Office 内容服务继续拥有权限、审计、修订、幂等与冷存储。稳定业务页 ID 与导出部件 nativeId 分开。AI 逐页 elements 操作使用 core 原生数据，常见图表不用图片拼接；二进制与 rawXml 不应成为模型手抄内容。用户编辑通过原生 onDirtyChange 与公开 getSlide/getContent 检测/序列化；编辑缓冲只属于编辑器，提交后服务为持久真源。PPTX 文件 Tab 支持直接打开、编辑和下载副本；不自动覆盖源文件。服务新建工作副本支持自动保存和重开。

验证：Office typecheck、内容服务 8/8（权限、CAS、幂等、人工编辑、冷启动）；probe-office-pptx-native（原生饼图7→8、稳定页ID、CSS隔离、无iframe、卸载、pageerror为空）；probe-office-live --ppt（隔离官方 Profile 干净安装，原生工具新建和页更新，真实侧栏修改图表，通过同一 Host 保存，下载，应用刷新重开8/3）。未执行真实模型新契约验收与 npm 发布；复杂 PPTX 和 Office 内嵌工作簿往返仍须后续复核，不宣称完整 Office 保真。

安装回执：仅通过官方 dsh plugin --profile preview add 更新 Office 制品，已比对安装后的 Host/Client 与当前 dist 字节完全一致。18989 预览恢复运行，dsh-cost-meter 保留。实际文件资源 Tab 打开导出的 PPTX，修改图表 8→9，原文件字节不变，应用探针通过。未自动提交、推送或发布 npm。

## PPT 最终文件交付（2026-09-13）

复用已有 Office `content_export` 与官方 `ctx.tools.execute` 的 bash/present 策略链路，不新增文件写入服务、生成引擎或独立 Agent loop。读取仍通过内容服务的组织/主体授权；baseRevision 不符拒绝导出。PPT 分支直接交付已提交 NativeDeck 的 PPTX bytes，文件名含文档身份、修订与 SHA-256；原子临时写入与同内容重试逻辑复用 Word，拒绝覆盖已变化的目标。PPT 文件上限 8 MiB；人工未提交的编辑需先完成保存。最终使用官方 present 文件卡，不把右侧草稿或下载按钮等同于已交付文件。

本机腾讯 PPT 技能的完整主流程、叙事与通用设计规则已查阅。适配的是观点组织、视觉层级、非对称封面、图表与结论、页面节奏及最终交付要求，不执行其 slidep/.slide 流程、不要求中间设计文件、不复制其运行时。用户页数和事实边界优先，不照搬字数下限以填充内容。真实模型的视觉品质尚未验收。
