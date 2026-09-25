// Review this inventory when the WorkDSH release adds or removes a package.
// Only product packages may appear as manageable DSH plugins.
export const PRODUCT_PACKAGES = Object.freeze([
  'workdsh-plugin-connectors',
  'workdsh-plugin-experts',
  'workdsh-plugin-library',
  'workdsh-plugin-projects',
  'workdsh-plugin-skills',
])

export const RELEASE_PACKAGES = Object.freeze([
  'workdsh-provider-identity-local',
  'workdsh-provider-browser-session',
  'workdsh-plugin-audit',
  'workdsh-plugin-access',
  'workdsh-plugin-skills',
  'workdsh-plugin-experts',
  'workdsh-plugin-connectors',
  'workdsh-plugin-activity',
  'workdsh-plugin-office',
  'workdsh-plugin-library',
  'workdsh-plugin-projects',
  'workdsh-bundle',
])
