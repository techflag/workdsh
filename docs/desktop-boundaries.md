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

The former Cordis Host/Client and SSH sources have been removed from the
Desktop release branch along with their old DSH dependencies and build entry
points. The current carrier and packaged Profile use one DSH version.

The Desktop Profile selects and directly depends on exactly five WorkDSH
product bundles: experts, skills, connectors, library, and projects. Its
support packages are installed as optional runtime dependencies. The Profile's
own `cordis.patch.yml` activates their service entries and the WorkDSH client
composition, so they do not become separately manageable product plugins.
The release archives remain bundled for offline installation and updates.

The pinned DSH plugin manager derives its bundle inventory from the Profile's
selected bundles and direct dependencies, as well as installation dependencies.
Its client hides a small fixed set of official built-in bundle names; it does
not hide WorkDSH support packages because their manifests say `private`.
The Profile layout now keeps support packages out of those two inventory
inputs. Installed-app acceptance still requires checking the running plugin
manager's `listBundles()` output and exercising project, library, office,
browser, identity, access, and audit behavior. A source-level package count or
successful config dump alone does not prove that runtime outcome.
