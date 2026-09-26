# Projects Alpha UI14 evidence

Date: 2026-09-17

## Automated checks

- `corepack pnpm --filter workdsh-plugin-projects typecheck`
- `corepack pnpm --filter workdsh-plugin-projects test`
- root `corepack pnpm typecheck`
- `node scripts/check-plan.mjs`
- `git diff --check`

The project service test persists only `nodeId`, `assetId`, `revisionId`, display name, and kind in `ProjectAssetRef`. It restores the stable content revision after restart, deduplicates repeated links, and removes only the project reference.

## Runtime observations

The packaged preview was installed with `corepack pnpm preview:install` and opened in a fresh browser tab against the Host service.

- The Project Asset tab showed linked asset count, type filter, name search, content revision, and link time.
- “从资料库添加” opened the real Library tree rather than a copied project file list.
- The picker showed Library folders, file types, byte sizes, revision numbers, dates, current capacity, type filtering, search, folder creation, and upload controls.
- Selecting `deepseek_html_20260915_b1db6d.html` created one project reference displaying revision `845d3a4a-c72…`.
- Removing that reference changed the Project Asset count to zero. Reopening the Library picker still showed the same HTML asset with its original size and revision, proving that removing a project link does not delete or duplicate the Library body.

This evidence covers UI14: Library remains the sole content owner, while Projects stores and renders stable revision references.
