# Projects Alpha UI02 evidence

Date: 2026-09-17

## Runtime observations

The packaged preview was opened against the Host-backed project `Host持久化验证`.

- Opening Project Configuration → Experts displayed the outer configuration dialog with `当前项目已添加 0 个` and a separate “＋ 添加” action.
- Opening the nested catalog loaded six real expert records from the Experts service, including names and descriptions.
- The catalog provided search plus `全部 / 我的 / 公共` category controls and checkbox multi-selection backed by a set, so repeated selection cannot create duplicate counts.
- Selecting one expert and confirming the inner catalog changed only the outer dialog draft. Cancelling the outer dialog and reopening it still displayed `当前项目已添加 0 个`.
- No Harness session or expert team was started by selecting or cancelling expert configuration; the Project stores capability references only when the outer dialog is saved.
- Primary actions render blue when available and dark gray when disabled; the former white disabled button is no longer present.

This evidence covers UI02, including the reported missing-expert and white-button regressions.
