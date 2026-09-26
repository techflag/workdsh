# Projects Alpha — UI11 project center evidence

Date: 2026-09-17

Validated against the installed Preview Profile at `/?workdsh-view=projects` after building and installing `workdsh-plugin-projects`.

Observed:

- Project center renders a dedicated welcome area, create action, project search, “我的项目”, and five template cards in the existing WorkDSH dark theme.
- An empty local project remains addressable from the project collection; active-project search covers name and description.
- Clicking “新建项目” opens the unified modal with project name, 15-character counter, instruction editor, template selector, connector/expert/skill selectors, Cancel, and disabled Confirm while the name is empty.
- Selecting template `product` changed the draft name to “产品需求全流程” and instruction to “围绕产品目标维护需求、计划、任务、资产和决策记录。” while the project-card count remained `0`.
- Opening the connector selector showed the installed connector catalogue. Cancelling the nested selector and then cancelling the outer modal left the project-card count at `0`; no project was submitted.
- Project cards expose their last update date and an archive action. Archiving removes the project from the active collection without deleting the stored snapshot.

Automated checks:

- `corepack pnpm --filter workdsh-contracts build`
- `corepack pnpm --filter workdsh-plugin-projects typecheck`
- `corepack pnpm --filter workdsh-plugin-projects test`
- `git diff --check`
