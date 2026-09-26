# Projects Alpha UI01 evidence

Date: 2026-09-17

## Automated responsive rendering

The project stylesheet was rendered in headless Chromium at 1280 px and 720 px using the same CSS template shipped by the Projects client.

- At 1280 px the configuration aside remains a 360 px static grid column.
- At 720 px the same aside becomes an absolute right-side drawer within the project container; it does not exceed the viewport.
- Applying the real `aside-collapsed` state hides the drawer.
- The four navigation labels remain `动态 / 计划 / 任务 / 资产`, and the textarea draft remains unchanged across viewport changes and aside collapse.
- The disabled primary action resolves to a themed dark background rather than a native white button.

The coverage is in `packages/plugins/projects/tests/responsive.test.mjs` and runs as part of the Projects package test command.

## Packaged-preview observations

- The project detail displayed all four main tabs, a collapsible configuration sidebar, and the persistent project composer.
- Switching all four tabs retained the composer draft and selected references; detailed evidence is also recorded under UI12.
- The invitation control is disabled with the explicit tooltip `团队邀请将在多人服务接入后开放`.
- No cloud-run selector or executable cloud action is rendered by the Projects panel.

This evidence covers UI01.
