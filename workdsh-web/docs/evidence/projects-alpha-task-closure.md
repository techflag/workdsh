# Projects Alpha native task closure evidence

Date: 2026-09-17

The Project composer now submits through the official Session Controller instead of leaving text in a new-session draft. The Host must accept the prompt before the Project task link is persisted. Successful submission opens that exact Session; prompt failures stay on the Project page with the real diagnostic.

Authenticated preview verification created a Project task with the prompt `项目闭环测试：只回复“测试通过”。`. The browser moved from `workdsh-view=projects` to `workdsh-view=conversation`, rendered the submitted user turn, ran one native model turn and displayed `测试通过`. The Project Tasks tab then listed the linked task; clicking its row reopened the same conversation and retained the completed result. Runtime screenshots are `/tmp/project-flow-after.png` and `/tmp/project-task-reopen.png`.

Projects package tests and typecheck passed. No separate task engine or duplicate conversation store was introduced.
