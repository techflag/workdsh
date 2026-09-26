# Projects Alpha J04 证据

日期：2026-09-17。

领域测试验证：

- 同一业务待办可以关联两个不同的原生 Session 任务；
- 创建和关联执行任务后，业务待办仍保持 `todo`，执行成功或关联行为不会伪造业务完成；
- 待办更新必须携带当前 `revision`，错误预期修订返回 `projects/revision-conflict`，不会覆盖现值。

验证命令：`corepack pnpm --filter workdsh-plugin-projects test`。
