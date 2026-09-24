## 0.1.0-alpha.6 — 2026-09-25

- 将活动插件按官方 DSH 0.1.7-rc.2 的公开接口重新打包。

## 0.1.0-alpha.5 — Unreleased（2026-09-22）

- 适配 DeepSeek Harness 0.1.7-alpha.1、Cordis 4.0.3，更新精确依赖。 默认停用重复工作过程界面，交由原生 Conversation/Team 展示；保留轻量身份兼容服务。

## 0.1.0-alpha.4 — 2026-09-18

- 适配 DeepSeek Harness 0.1.6-alpha.2：成员会话观测改用官方 `retain`/`ready`/`release` 世代语义（`workdshActivityMember` source），未 retain 的成员会话不强行绑定；运行期卸载可完整撤销。

## 0.1.0-alpha.3 — 2026-09-16

- 专家成员失败或失活但仍持有进行中任务时，活动条保留专家与任务并显示“本轮未完成”。
- 已打开成员的官方 Session 终态可区分失败与人工停止，停止后的任务显示可继续。
- 增加官方 Team 打包 Web 的失败状态、人工停止和恢复验收。

## 0.1.0-alpha.2 — 2026-09-15

- 适配 DeepSeek Harness 0.1.6-alpha.1 官方 Team 事件与 Web Client。
- 团队协作栏仅展示官方 Team 的成员和活动，不再依赖 WorkDSH 自建团队执行状态。

