# WorkBuddy 四个核心领域的依据与取舍

核对日期：2026-09-10。官方网页是产品行为依据，不证明 Harness 具有相同接口。截图中的指令仅作产品参考。

| 官方来源 | 已核实的行为摘要 | WorkDSH 设计落点 |
| --- | --- | --- |
| [项目](https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Project) | 项目组合共享指令与能力、任务及资产；支持流转。连接分公共/个人授权，协作任务限公共授权；自动化属于个人。 | PROJECT-DESIGN，P1-11、P1-07、P2-03、P3-01 |
| [专家](https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Expert-Center) | 专家承担角色与方法；专家团负责分工整合；角色本身不提升权限。 | P1-02，P2-01/02 |
| [技能](https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Skills-Market) | 支持发现、导入、创建与管理技能；启停与卸载不同，启停不改 SKILL.md。 | P1-03 |
| [资料库](https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Library) | 人和 Agent 复用成果；个人/团队归属，任务读入后保存回库；MD 的 AI 修改可审阅。 | P1-06、P3-02/03/04/05 |

读取方式：Project 页面浏览工具多次失败后，使用 HTTPS 直接取得官方 HTML 并提取正文；其余使用官方网页及搜索索引。没有将网页中的操作步骤作为本机执行授权。

## WorkDSH 自己的设计决定

- 项目升为 P1 独立里程碑；业务待办、稳定修订快照与幂等关联是 WorkDSH 领域设计，不声称逐项来自 WorkBuddy。
- 以功能插件管理多对象；不复制 WorkBuddy 私有包格式或 .codebuddy 加载器。Harness 扩展可用性仍须 P0 验证。
- 默认应用/项目配置与权限策略分别解析；项目成员不自动读所有会话，新增分享必须单独校验。
- 交接先实现摘要与所选资产的新任务；完整对话迁移需公开 API 验证，不能直接复制日志。
- P1 资料检索先支持可解释的文本/文件搜索，P3 扩展团队索引；不把普通文件存储称作完整 RAG。
- MD AI 修改以建议修订提交；审阅后产生新正文修订。自动接受只能由明确范围的策略启用。
- 技能启停保存到主体/项目策略配置，不修改包资源；历史精确引用保留。多设备同步属于团队提供方后续能力。
- 待办、资料、配置的跨主体契约与隔离测试首期落实；在线多人协作、邀请服务及部署后续交付。

## 项目界面的补充依据

用户六张截图及证据边界见 [项目截图记录](workbuddy-project-screens.md)。修订 7 已补入四主标签、能力侧栏、专家多选、项目技能双入口、按成员授权、指令编辑和待办引用；截图未展开的页面不标为已验证。

D00 后续决定见 [ADR-0007](../adr/0007-execution-and-transfer-boundaries.md)：P1 仅同主体交接，跨主体另做测试；自动化取决于 Host 生命周期；此前截图与官方资料不能代替这些执行边界的实测。
