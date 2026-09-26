# ADR-0009：提供方目录分组

状态：已采纳，2026-09-10，用户明确要求。

将四个提供方迁入 packages/providers：identity-local、identity-oidc、library-team、runtime-isolated。父目录仅分类，不拥有统一 package.json、版本、数据或生命周期。子模块包身份与职责不变，未实现模块仍不声明可加载入口。

同步 pnpm workspace、modules.json、文档路径与 check-plan 的嵌套目录检查。examples 下示例继续保留。此决策补充 ADR-0008，当时未移动提供方的记录为历史范围；开发步骤仍为 D01。
