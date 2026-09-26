# Projects Alpha UI03 evidence

Date: 2026-09-17

## Automated checks

- Project capability references are revisioned and isolated per project.
- Skill imports remain staged until the outer project capability dialog is saved.
- Project tests, Projects typecheck/build, root typecheck, plan integrity and diff checks passed.

## Runtime observations

- Uploaded a local Markdown skill in the nested Skill catalog. Saving the nested catalog exposed it only in the outer draft; cancelling the outer dialog left the installed catalog unchanged.
- Repeated the import and saved both dialogs. The project configuration showed exactly one linked Skill.
- Reopened the project Skill configuration, removed the link and saved. The project count returned to zero while the Skill remained available in the source catalog.
- Runtime screenshots were captured at `/tmp/workdsh-ui03-associated.png` and `/tmp/workdsh-ui03-source-remains.png` during the authenticated preview run.

This evidence covers UI03.
