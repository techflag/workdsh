# DSH Community Market design draft

[中文](README.zh.md)

This directory currently holds product and technical design documents only. It has **no loadable Host, Client, or installer code** and is not part of the WorkDSH Desktop installer. Earlier experimental runtime code depended on old DSH versions and has been removed from the current product workspace. Any future Market implementation must be reviewed against the then-pinned official DSH version and its public interfaces and security boundaries.

The draft covers plugin discovery, catalog selection, install confirmation, and uninstall. A catalog listing is not a security review or endorsement. Installing a third-party npm package runs code with the user's permissions. A future Market must not depend on the removed `desktopPnpm` or `desktopProfiles` services; it should use public DSH or WorkDSH Profile contracts available at implementation time.

- [Catalog provider contract](docs/catalog-provider-contract.md)
- [Catalog adapter guide](docs/catalog-adapter-guide.md)
- [Install and uninstall design](docs/install-and-uninstall.md)
- [Interface design](docs/market-shell.md)
- [Security policy](SECURITY.md)
- [Desktop ownership boundaries](../docs/desktop-boundaries.md)

Documents and examples use the [MIT License](LICENSE). Catalog providers are independent projects responsible for their own data and service policies.
