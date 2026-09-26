# 资料库

状态：**实施中**。Alpha.1 已建立本地资料领域服务、WorkBuddy 式目录树与原内容工作区、对话固定修订引用和 Markdown/TXT 草稿发布流程。

- 实现阶段：P1
- 主任务：P1-06，详见 [开发计划](../../../docs/PLAN.md)
- 职责：本地资产与修订、目录树、确定性文本转换与检索、工具读写、成果关联；团队提供方可替换。
- 边界：不复制 Harness 会话日志，HTML 不获 Host 权限。

## 开发前阅读

[规则](../../../AGENTS.md)、[状态](../../../docs/STATUS.md)、[契约](../../../docs/CONTRACTS.md)、[团队设计](../../../docs/TEAM-DESIGN.md)。

所有业务操作遵守服务端主体和组织上下文；页面与 Agent 工具调用相同领域服务。可选功能接入通过公开契约与生命周期注入。

对话右侧资料引用预览使用 Harness 官方语义颜色，跟随浅色、深色和系统主题；HTML 原件在沙箱中保留自己的页面样式。

## 验收与下一步

完成对应 PLAN 任务及 [验收矩阵](../../../docs/ACCEPTANCE.md) 场景，记录真实测试证据后才更新为完成。当前 Host 与 Client 入口可加载，数据保存到 `$DSH_HOME/library`。支持 MD、TXT、HTML、PDF、DOCX、PPTX；所有格式保留原件并生成独立检索文本。HTML 在无 Host 权限、无网络访问的沙箱中按原始样式和内联交互展示；PDF 可直接预览；安装 Office 插件时，Word 使用 `docx-preview`、PowerPoint 使用 `pptx-react-viewer` 打开原件，未安装时回退为派生检索文本和原件下载。Library 与 Office 通过公开可选预览注册表协作，不互相导入运行时内部实现。

发布包可通过 `corepack pnpm probe:library` 验证独立安装、两次冷启动、卸载保留 `$DSH_HOME/library`、重新安装和资料恢复。页面支持搜索、最近、本地产物、完整目录树、目录内新建与导入、移动、添加到当前任务、停用与重新启用；停用会立即阻断历史任务引用的正文读取。搜索结果显示目录、类型、来源、修订、转换状态和页/段/幻灯片位置。

单文件上限为 50 MiB，本地不可变原件修订合计上限为 5 GiB。转换器意外失败时保留原件并标记“转换失败/不可搜索”；伪类型、损坏文件、压缩炸弹、路径逃逸和取消不会创建资产。

## 修订 6 的必做补充

详见 [项目设计](../../../docs/PROJECT-DESIGN.md) 和 [官方依据](../../../docs/research/workbuddy-core-domains.md)。新增目录仍为规划占位；各自实现 PLAN 的 P1 补充项并验证 J01—J10 适用项。

实现前必须阅读 [ADR-0007](../../../docs/adr/0007-execution-and-transfer-boundaries.md)，完成相应 B/Q 边界用例；不可只用提示词或 UI 达成权限保障。

页面及配置弹窗随 Harness 原生主题变化；文件类型图标与文档原文保留自身颜色。
