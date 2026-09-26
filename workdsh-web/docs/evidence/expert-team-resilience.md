# 专家团长任务、交接、重连与失败恢复验收

## 结论

`corepack pnpm probe:experts:team:resilience` 在一次仓库外、可丢弃的 Web Profile 中完成运行中长任务、人工停止后继续、成员交接、浏览器重连、失败状态展示与 Host 冷重启恢复。`corepack pnpm probe:experts:team:real` 在同一套正式运行链路上额外执行真实 DeepSeek lead 与两名真实成员的两阶段任务交接。两种验收都不写入用户 preview，也不读取用户会话。

## 实际组件与测试替身

| 部分 | 验收实现 |
| --- | --- |
| 安装 | 七个 WorkDSH 正式包先打成 tgz，再通过官方 `dsh plugin add` 安装 |
| 团队运行 | DeepSeek Harness 官方 Agent Teams 服务和九项团队工具 |
| 持久化与恢复 | 正式 Session、Team 名册、邮箱和共享任务存储 |
| 页面 | 正式 WorkDSH Host、官方 Team Client、WorkDSH 活动条 |
| 浏览器 | Playwright Chromium，执行完整页面导航、认证 cookie 重建和成员历史打开 |
| 模型 I/O | resilience 使用本地确定性适配器固定等待、中断和一次失败；real 模式另建独立执行并使用 `deepseek-official/deepseek-flash` |

real 模式只把已配置密钥复制到一次性 DSH Home 的凭据引用，运行结束删除；命令参数、结构化报告和脱敏 Host 日志不记录密钥。因此，本记录能证明团队状态、持久消息、任务归属、人工停止后继续、Host 冷恢复、浏览器投影和有界真实模型交接；不能替代专业内容质量或小时级稳定性验收。

## 场景判定

1. **长任务与浏览器重连**：任务明确归属 `analyst` 并保持 `in_progress`。成员处理 20 秒期间执行两次完整浏览器连接，活动条和官方任务面板都继续显示相同任务；回合结束后由 lead 只签收仍归属于 `analyst` 的任务。
2. **人工停止后继续**：lead 用官方 Team 中断同一 `analyst`；成员回合以 `aborted` 结束，任务继续保持 `in_progress` 和原所有者。恢复消息只唤醒原成员，最终没有重复成员。
3. **专家交接**：lead 先把任务分配给 `analyst`，再用官方任务 `reassign` 转给 `reviewer`，同时通过官方 Team 邮箱发送交接摘要。`reviewer` 被唤醒，任务完成后所有权仍是 `reviewer`。
4. **成员失败与可见状态**：确定性模型适配器只在最新消息包含失败标记时抛错。失败回合终态不得为 `completed`，对应共享任务继续保持 `in_progress`；活动条显示“失败恢复验收 · 本轮未完成”，而不是“本轮已结束”。
5. **冷重启恢复**：停止并重启正式 Host。恢复后 `reviewer` 的成员 ID、任务 ID、所有者和状态保持不变；新恢复消息唤醒同一成员完成后续回合，名册中 `reviewer` 仍只有一个。
6. **真实模型两阶段交接**：独立真实执行中的 lead 创建 `REAL-ANALYZE` 与依赖它的 `REAL-REVIEW`，分别交给 `analyst` 与 `reviewer`，通过官方消息和状态观察完成交接。两名成员 Session 均新增完成回合，两项任务保留各自所有者并最终为 `completed`。

官方 Team 会在成员回合结束后释放该成员的激活实例。最终任务签收由 lead 执行，但签收前必须读取官方任务并核对任务仍归属于预期成员。这一处理遵循官方生命周期，没有创建 WorkDSH 自有的团队运行表。

## 证据

- `.artifacts/dsh-0.1.6-upgrade/native-team-web/result.json`：环境、六类场景回执、16 项检查及未运行项。
- `.artifacts/dsh-0.1.6-upgrade/native-team-web/official-team-active-member.png`：长任务运行中的活动条和官方团队面板。
- `.artifacts/dsh-0.1.6-upgrade/native-team-web/official-team-cold.png`：冷重启后的名册与任务。
- `.artifacts/dsh-0.1.6-upgrade/native-team-web/host.log`：已移除认证 token 的 Host 日志。

## 未包含

- 真实专业成果质量和小时级资源稳定性；真实模型验收是有界的两阶段协调任务。
- 官方 fork 成员的浏览器历史查询；该路径仍有独立上游问题记录。
- 用户 preview 部署和既有用户数据迁移。
