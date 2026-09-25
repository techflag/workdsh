/** Verify that the Electron carrier contains no second Harness runtime. */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { extractFile, listPackage } from '@electron/asar'
import { DSH_VERSION } from './runtime-version.mjs'

interface PackContext {
  appOutDir: string
  electronPlatformName: string
  packager: { appInfo: { productFilename: string } }
}

export function normalizeAsarEntry(entry: string): string {
  return entry.replaceAll('\\', '/').replace(/^\//u, '')
}

export async function afterPack(context: PackContext): Promise<void> {
  const resources = context.electronPlatformName === 'darwin'
    ? join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, 'Contents', 'Resources')
    : join(context.appOutDir, 'resources')
  const archive = join(resources, 'app.asar')
  if (!existsSync(archive)) throw new Error(`Missing Electron carrier: ${archive}`)
  const entries = listPackage(archive, { isPack: false }).map(normalizeAsarEntry)
  if (!entries.includes('lib/workdsh-main.js')) throw new Error('Electron carrier has no WorkDSH entry point')
  if (entries.some(entry => entry.startsWith('node_modules/'))) {
    throw new Error('Electron carrier contains duplicate node_modules; Harness must come only from the bundled Profile')
  }
  const manifest = JSON.parse(extractFile(archive, 'package.json').toString('utf8')) as {
    main?: string
    dependencies?: Record<string, string>
  }
  if (manifest.main !== 'lib/workdsh-main.js' || Object.keys(manifest.dependencies ?? {}).length > 0) {
    throw new Error('Electron carrier must declare only the WorkDSH entry point, without runtime dependencies')
  }

  const runtime = join(resources, 'workdsh-runtime')
  const primary = JSON.parse(readFileSync(join(runtime, 'primary-runtime', 'runtime.json'), 'utf8')) as {
    desktopVersion?: string
  }
  if (primary.desktopVersion !== DSH_VERSION) {
    throw new Error(`Bundled primary runtime is ${String(primary.desktopVersion)}, expected ${DSH_VERSION}`)
  }
  const profile = join(runtime, 'profiles', 'workdsh')
  const cache = join(runtime, 'package-cache')
  const release = JSON.parse(readFileSync(join(cache, 'release-manifest.json'), 'utf8')) as {
    packages: Array<{ name: string; filename: string }>
  }
  const profileManifest = JSON.parse(readFileSync(join(profile, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>
    optionalDependencies?: Record<string, string>
    dsh?: { profile?: { bundles?: string[] } }
  }
  const productPackages = new Set([
    'workdsh-plugin-experts', 'workdsh-plugin-skills', 'workdsh-plugin-connectors',
    'workdsh-plugin-library', 'workdsh-plugin-projects',
  ])
  const selected = profileManifest.dsh?.profile?.bundles ?? []
  const selectedWorkdsh = selected.filter(name => name.startsWith('workdsh-'))
  const directWorkdsh = Object.keys(profileManifest.dependencies ?? {}).filter(name => name.startsWith('workdsh-'))
  if (selectedWorkdsh.length !== productPackages.size || selectedWorkdsh.some(name => !productPackages.has(name))) {
    throw new Error(`Desktop must select exactly five WorkDSH product bundles, found ${selectedWorkdsh.join(', ')}`)
  }
  if (directWorkdsh.length !== productPackages.size || directWorkdsh.some(name => !productPackages.has(name))) {
    throw new Error(`Desktop must directly install exactly five WorkDSH product bundles, found ${directWorkdsh.join(', ')}`)
  }
  const lockfile = readFileSync(join(profile, 'pnpm-lock.yaml'), 'utf8')
  for (const item of release.packages) {
    if (!existsSync(join(cache, item.filename))) throw new Error(`Bundled plugin archive is missing: ${item.filename}`)
    if (!productPackages.has(item.name) && Object.hasOwn(profileManifest.dependencies ?? {}, item.name)) {
      throw new Error(`Internal WorkDSH service is a direct product dependency: ${item.name}`)
    }
    const dependencies = productPackages.has(item.name) ? profileManifest.dependencies : profileManifest.optionalDependencies
    if (dependencies?.[item.name]?.replaceAll('\\', '/') !== `file:../../package-cache/${item.filename}`) {
      throw new Error(`Bundled ${item.name} must use a portable archive path in its expected dependency section`)
    }
  }
  const patch = readFileSync(join(profile, 'cordis.patch.yml'), 'utf8')
  for (const name of release.packages.map(item => item.name).filter(name => !productPackages.has(name))) {
    if (name === 'workdsh-provider-browser-session') continue // inserted by the bundle patch
    if (!patch.includes(`name: ${name}`)) throw new Error(`Internal WorkDSH service is missing from Profile patch: ${name}`)
  }
  if (/file:(?:\/|[a-z]:)/iu.test(lockfile)) {
    throw new Error('Bundled plugin lockfile contains a build-machine path')
  }
  const packages = join(runtime, 'profiles', 'workdsh', 'node_modules', '@deepseek-ai')
  const names = readdirSync(packages).filter(name => name === 'dsh' || name.startsWith('dsh-'))
  if (names.length === 0) throw new Error('Bundled WorkDSH Profile has no Harness packages')
  for (const name of names) {
    const pkg = JSON.parse(readFileSync(join(packages, name, 'package.json'), 'utf8')) as { version?: string }
    if (pkg.version !== DSH_VERSION) {
      throw new Error(`Bundled ${name} is ${String(pkg.version)}, expected ${DSH_VERSION}`)
    }
  }
  console.log(`Verified thin Electron carrier and ${names.length} Harness ${DSH_VERSION} packages`)
}

export default afterPack
