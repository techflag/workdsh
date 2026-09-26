# Projects Alpha UI13 evidence

Date: 2026-09-17

## Automated checks

- `corepack pnpm --filter workdsh-plugin-projects typecheck`
- `corepack pnpm --filter workdsh-plugin-projects test`
- root `corepack pnpm typecheck`
- `node scripts/check-plan.mjs`
- `git diff --check`

All commands passed after the project client, Host integration lifecycle, and plan controls were rebuilt.

## Runtime observations

The packaged preview was installed with `corepack pnpm preview:install`, restarted with an isolated `WORKDSH_PREVIEW_HOME`, and opened in a fresh browser tab.

- The project center loaded the persisted empty project `Host持久化验证` from the Host service after restart. Browser-local fallback storage is no longer used.
- Opening that project showed four distinct project tabs and the persistent project composer/configuration frame.
- The Plan tab rendered table and board controls, real status and priority filters, title search, result count, and an Add action.
- Adding a row persisted a `新待办` ProjectWorkItem through the Host route and rendered the required title, status, assignee, priority, and tags cells.
- The Tasks tab remains backed only by ProjectTaskLink entries and does not render ProjectWorkItem rows, preserving the plan/task domain boundary.

This evidence covers UI13. UI12 remains pending because composer attachment and selected-reference persistence have not yet been implemented, even though text draft persistence across tab changes was observed.
