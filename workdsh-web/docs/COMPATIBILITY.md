# 官方依据与兼容验证

## 固定版本

目标 `@deepseek-ai/dsh@0.1.5-rc.1`。2026-09-10 已核对 npm：dsh latest/next 为该版本；模型适配器 alpha 为 0.1.5-alpha.2、next 为 0.1.5-rc.1。不得凭单个包 latest 标签拼装版本族。

版本升级需更新锁文件、该表、集成测试证据与 ADR，保持与业务功能变更可区分。

## 官方文档

- [快速开始](https://deepseek-harness.github.io/deepseek-harness/guide/quickstart)
- [插件开发](https://deepseek-harness.github.io/deepseek-harness/develop/basic/)
- [打包安装](https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish)
- [能力的三种角色](https://deepseek-harness.github.io/deepseek-harness/develop/practice/)
- [Web Client](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/web-client)
- [Web Client Slots](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/slots)
- [右侧 Sidebar](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/sidebar-right)
- [新增 Package](https://deepseek-harness.github.io/deepseek-harness/reference/cookbook/adding-a-package)
- [技能](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/skills)
- [会话与输入](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/conversation)
- [会话投影](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/session-projection)
- [0.1.5-rc.1 发布说明](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.5-rc.1)

在线文档可能继续变化；以选定发布包的公开 exports/types 和可重复集成验证落实，不把其他版本或旧仓库的观察当作已验证行为。

## P0 验证矩阵

| 能力 | 设计用途 | 状态 |
| --- | --- | --- |
| bundle / plugin CLI | 独立安装与卸载 | tgz 安装、Host 激活、停服卸载后重启及重装通过；当前产品运维契约为停止 Host 后变更包并重启，运行中 CLI 热变更不作为用户路径 |
| Client Modules / Remote / Slots | 功能页面和 Host 通信 | 包根扫描、侧栏/页面注册、官方清单 Remote、页面刷新、WebSocket 关闭后自动重连及新 HTTP 查询、停服卸载后 Client 缺席通过；Skill exact Fetch 的认证、超时、中途取消、暂存清理和提交前重试通过；通用自有 Typert Remote 生成仍为上游兼容项，见 [Client 证据](evidence/d01-client.md) |
| Agent Preset 创作/挂载/恢复 | 专家发布与精确修订绑定 | 待验证 |
| scoped skills/tools | 按专家选择能力 | 待验证 |
| Session 注入与投影 | 持久执行事实与对象绑定 | 待验证 |
| MCP / credentials | 连接实例、账号与动态就绪 | 待验证 |
| Conversation / Sidebar | 真实轨迹与成果预览 | 待验证 |
| Subagent / Workflow | P2 专家团 | 待验证 |
| Schedule | 会话提醒，不能先假定等于独立调度 | 待验证 |

安装及生命周期证据见 [D01 安装验证](evidence/d01-installation.md)。Client/Remote 等未执行部分继续保持待验证；本机 HTTP 登录不是团队授权证据。

2026-09-10 自有 Remote 补充：rc.1 generator 只识别登记的 workspace protocol 符号或对应 ambient 声明，当前纯 npm 最小例无法生成 Remote 元数据。官方 runtime decorator/namespace 测试 4/4 通过，但不替代生成。该点阻塞未来通用自有 Remote 的发布链，作为 Harness 升级兼容项保留；它不阻塞 Skill 插件使用 Connection 官方 exact Fetch 扩展面。项目不修改依赖、不伪造 protocol。复现与边界见 [Remote 证据](evidence/d01-remote.md)。

团队产品依据与证据边界见 [TEAM-DESIGN](TEAM-DESIGN.md)，包括用户提供的企业版概述以及官方连接器、协作、企业智能体说明。

D00 新增探针 Q01—Q04，详见 ACCEPTANCE；全部待验证。关键边界见 ADR-0007。公开接口不满足时记录禁用/阻塞结论，不隐式降低保障。
