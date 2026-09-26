# Projects Alpha UI07 evidence

Date: 2026-09-17

## Automated checks

- Project task links now persist typed `ProjectInputRef` values for work items, assets, and skills.
- The Host validates project ownership and exact revisions before creating a Harness session, deduplicates references by kind and ID, and stores the validated snapshot on `ProjectTaskLink`.
- Project tests cover valid mixed references, duplicate-safe validation, stale work-item revision rejection, restart persistence, expected-revision work-item updates, and rejection after an asset reference is removed.
- Project tests, root typecheck, plan integrity, and diff checks passed.

## Runtime observations

- The project composer’s `@` menu listed the real `新待办` WorkItem and linked HTML asset with their stable revision identifiers.
- Selecting both rendered typed chips above the text draft rather than inserting display text into the prompt.
- After the linked asset was removed from the Project Asset tab, sending the unchanged draft was rejected before session creation with `引用已删除、更新或无权访问，请重新选择。`.
- The failed submission preserved both the draft text and selected references so the user could remove or replace the stale item.

This evidence covers UI07.
