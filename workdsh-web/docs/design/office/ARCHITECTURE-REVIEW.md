# Office组件、统一接口与开发计划复审

日期：2026-09-12。审查基线：OPEN-SOURCE-STACK、UNIFIED-API设计v0.3与U1—U5。范围包括八类编辑、AI可见实时提交、官方插件交付；复核ADR-0018/0019、官方公开文档、当前Office包与tables/pages/library职责。

结论：组件路线可以保留，但原设计的插件装配、生命周期与业务所有权不足以直接指导完整交付。以下六项已补设计处置；这是静态修订，不是代码问题已修复或运行验收通过。

| ID | 等级 | 问题、触发与影响 | 本轮处置/运行门槛 |
| --- | --- | --- | --- |
| OP-R01 | P1 | UNIFIED-API第1节只描述Content Service/adapter，没有确定哪个插件提供服务、工具依赖谁、默认组合如何装配。容易把Office写成工作台内部大核心。当前index.ts为空，Client注册不能证明AI操作已经插件化 | 固定独立Office包、官方子插件组合、拟定公开服务契约；OP-T01/02 |
| OP-R02 | P1 | 第5/7/9节处理取消/断线，但没有插件卸载时的写入准入、在途持久提交和转换凭证失效。移除重装后旧worker可能回写或丢失成功回执 | 生命周期代、停稳顺序、已提交回执保留、旧响应拒绝；OP-T04/05 |
| OP-R03 | P1 | 组件方案将多维表格“字段/记录/关系”放Office领域，未与tables规划区分；HTML与pages发布也未显式划界。后续可能出现同一业务数据两条写链 | Office多维表格是独立内容文档；业务tables/发布pages/正式资产library各自唯一拥有，后续仅公开契约接入；OP-T06 |
| OP-R04 | P1 | 组件参考版本与当前iframe包不等于原生Client兼容；build脚本内嵌编辑器，Host构建将bundle:true应用于当前空入口。新增服务后若继续无边界打包，会重复框架/混入Node或漏WASM、字体资产 | 锁定peer/Client inject/external与资源清单，干净预构建包验证，contracts仅类型/运行值Office自有；OP-T03/07 |
| OP-R05 | P1 | U4将七类功能压成“接同接口”，没有每类codec/能力门槛；基础编辑库不能直接完成Office文件往返。Schema按能力缩减的描述也遗漏官方“注册后不可原地修改”约束 | 每类分别验导入/显示/编辑/保留/导出；已发布schema固定，capabilities按文档收窄，变更通过注销重注册；OP-T02/06 |
| OP-R06 | P2 | PLAN首部指向Office U1，PLUGIN-DELIVERY与顺序台账仍只把旧Skill切片记为activeSlice、主线为D04。后续工具可能遵循旧条目，跳过Office或误标D04/D15完成 | 使用已有activeSlice机制记录用户批准的OFFICE-AI-01，旧完成记录保留；主线步骤/状态不改，U1开始、U5退出与待验明确 |

证据定位：

- [Office包](../../../packages/plugins/office/package.json)、[Host空入口](../../../packages/plugins/office/src/index.ts)、[Client贡献](../../../packages/plugins/office/src/client.tsx)、[构建](../../../scripts/build-office.mjs)。private不妨碍本地打包，但不能宣称已发布npm。
- [tables职责](../../../packages/plugins/tables/README.md)、[pages职责](../../../packages/plugins/pages/README.md)、[library职责](../../../packages/plugins/library/README.md)。
- [官方工具注册与dispose](../../dsh-v0.1.6-alpha.2/cookbook/adding-a-tool.zh.md)、[服务依赖](../../dsh-v0.1.6-alpha.2/user/develop/framework/service.zh.md)、[Client模块图](../../dsh-v0.1.6-alpha.2/subsystems/client-modules.zh.md)、[打包配置层](../../dsh-v0.1.6-alpha.2/user/develop/basic/publish.zh.md)。源码checkout和上游内部实现未用于改造。

修订入口：[插件架构与交付约束](PLUGIN-ARCHITECTURE.md)、[统一接口](UNIFIED-API.md)、[组件方案](OPEN-SOURCE-STACK.md)、[PLAN](../../PLAN.md)、[ADR-0024](../../adr/0024-ai-visible-browser-editing.md)。前一轮[接口Review R01—R06](UNIFIED-API-REVIEW.md)的原子性/会话/并发用例继续保留，不能以本轮文档检查替代。

下一步：U1最小真实文档插件，验证服务/工具/原生Tab及预构建包，再U2完成AI三批写、人工修改、AI续写。八类全部保留；不在Review轮次安装组件或宣称交付完成。
