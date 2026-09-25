/** Verify that the Electron carrier contains no second Harness runtime. */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { extractFile, listPackage } from '@electron/asar'

const HARNESS_VERSION = '0.1.7-rc.2'

interface PackContext {
  appOutDir: string
  electronPlatformName: string
  packager: { appInfo: { productFilename: string } }
}

export async function afterPack(context: PackContext): Promise<void> {
  const resources = context.electronPlatformName === 'darwin'
    ? join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, 'Contents', 'Resources')
    : join(context.appOutDir, 'resources')
  const archive = join(resources, 'app.asar')
  if (!existsSync(archive)) throw new Error(`Missing Electron carrier: ${archive}`)
  const entries = listPackage(archive, { isPack: false }).map(entry => entry.replace(/^\//u, ''))
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
  if (primary.desktopVersion !== HARNESS_VERSION) {
    throw new Error(`Bundled primary runtime is ${String(primary.desktopVersion)}, expected ${HARNESS_VERSION}`)
  }
  const packages = join(runtime, 'profiles', 'workdsh', 'node_modules', '@deepseek-ai')
  const names = readdirSync(packages).filter(name => name === 'dsh' || name.startsWith('dsh-'))
  if (names.length === 0) throw new Error('Bundled WorkDSH Profile has no Harness packages')
  for (const name of names) {
    const pkg = JSON.parse(readFileSync(join(packages, name, 'package.json'), 'utf8')) as { version?: string }
    if (pkg.version !== HARNESS_VERSION) {
      throw new Error(`Bundled ${name} is ${String(pkg.version)}, expected ${HARNESS_VERSION}`)
    }
  }
  console.log(`Verified thin Electron carrier and ${names.length} Harness ${HARNESS_VERSION} packages`)
}

export default afterPack
