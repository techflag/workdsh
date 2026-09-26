# Projects Alpha UI06 单机活动记录证据

日期：2026-09-17

## 产品边界

WorkDSH 当前为单机版。项目详情将 WorkBuddy 的多人“动态”收敛为“活动记录”，不显示发布留言、成员筛选、邀请按钮或通知成功暗示。多人留言、评论、邀请和通知留到 P3 真实多人服务。

## 自动验证

- `corepack pnpm --filter workdsh-plugin-projects test`：通过。覆盖项目创建、配置修订、计划新增/更新、资产关联/移除和任务创建产生持久化活动事件；重启 Host 后记录仍存在。
- `corepack pnpm typecheck`：通过。
- `node scripts/check-plan.mjs`：通过。
- `git diff --check`：通过。

## 运行态验证

在本地预览 Profile 的真实 Projects 页面验证：

- 项目中心进入既有项目后，首标签名称为“活动记录”；
- 页面显示“本机项目操作记录”及配置、计划、资产和任务的真实事件；
- 顶栏没有邀请入口，活动页没有发布留言、与我相关或成员动态筛选；
- 新增计划后返回活动记录，可看到对应的“新增计划”事件。

运行态截图保存在本机忽略目录 `.artifacts/project-activity-runtime.png`，不作为产品源码发布。
