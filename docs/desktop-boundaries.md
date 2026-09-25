# Desktop and WorkDSH ownership

The released Desktop is one Electron application. Its packaged entry point is
`dsh-plugin-desktop/lib/workdsh-main.js`; it starts the DSH CLI from the
bundled `workdsh-runtime/profiles/workdsh` profile. The Desktop package must
not install or start a second DSH dependency tree from its own `node_modules`.

The pinned `deepseek-harness` submodule and the DSH version inside the bundled
Profile are one version boundary. Upgrade to the latest official stable DSH
release by default, only after the Profile and Desktop compatibility checks
pass. An explicit pre-release decision may temporarily pin a release candidate.
The current `0.1.7-rc.2` pin is such a transitional baseline; it is not a
stable-release policy. Do not publish an installer when the version-alignment
check fails.

WorkDSH's user-facing additions are projects, library, experts, skills, and
connectors. `activity` and `office` provide WorkDSH product behavior used by
those surfaces. `audit`, `access`, `identity-local`, and `browser-session` are
internal services for the same Profile. They are not separate Desktop editions
or downloads. The `workdsh-bundle` composes them into the single runtime.

The legacy Cordis Host/Client and SSH sources under `dsh-plugin-desktop/src`
are not copied into current installers. Their old DSH dependencies must be
removed together with their build and test entry points before the repository
can claim a single DSH source version. A source file being absent from the
installer does not by itself prove its development or test entry point is
unused.
