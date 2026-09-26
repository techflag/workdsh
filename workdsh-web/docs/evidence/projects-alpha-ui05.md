# Projects Alpha UI05 evidence

Date: 2026-09-17

## Automated checks

- `ProjectManager.updateConfig` uses the current configuration ID as `expectedRevisionId`; a stale save returns `projects/revision-conflict` and does not overwrite the newer revision.
- Saving creates a new immutable `ProjectConfigRevision`. An already linked task keeps its previous `configRevisionId` after a later project configuration update.
- Project instructions now share a contract-level 8,000-token reserved budget estimator. The Host rejects an 8,001-token CJK instruction with `projects/instruction-budget-exceeded`; it no longer truncates instruction text at 10,000 characters.
- The project test verifies over-budget rejection leaves the current revision unchanged, stale revision rejection, new revision creation, and old-task revision retention across restart.
- Project tests and the root typecheck passed.

## Runtime observations

The packaged preview was opened against the Host-backed project `Host持久化验证`.

- Editing the instruction to `取消不应保存`, cancelling, and reopening restored the prior empty instruction and still showed configuration revision 2.
- Saving `运行态保存验证` closed the dialog, updated the configuration card, and reopening showed configuration revision 3.
- Entering 8,001 CJK characters displayed `预计 8,001 / 8,000 tokens` and the actionable guidance to remove repeated background or store long material as a project asset.
- Pressing Save kept the dialog and draft open, returned the budget error, and left the saved card value as `运行态保存验证`.

This evidence covers UI05.
