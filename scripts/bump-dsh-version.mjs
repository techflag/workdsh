import { readFile, writeFile, readdir } from 'node:fs/promises'
import { join, resolve, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { inspectUpgrade } from './preflight-dsh-upgrade.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const isDshPackage = name => name === '@deepseek-ai/dsh' || name.startsWith('@deepseek-ai/dsh-')
const dependencyFields = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']
// Binary/runtime companions are locked independently of the npm release and
// must be reviewed by hand; this tool never guesses them.
const runtimePackages = ['@deepseek-ai/cordis', '@deepseek-ai/schemastery', '@deepseek-ai/cordis-plugin-group', '@deepseek-ai/cordis-plugin-loader', '@deepseek-ai/cordis-plugin-timer', '@deepseek-ai/cordis-plugin-include']

/** Every owned manifest that may pin the official published release. */
export async function collectManifests(repositoryRoot) {
  const files = [join(repositoryRoot, 'apps/web/package.json')]
  async function visit(directory, maxDepth, depth = 0) {
    let entries
    try { entries = await readdir(directory, { withFileTypes: true }) } catch (error) { if (error.code === 'ENOENT') return; throw error }
    for (const entry of entries) {
      if (entry.name === 'package.json') files.push(join(directory, entry.name))
      else if (entry.isDirectory() && depth < maxDepth && !['node_modules', 'dist', 'lib', 'src', 'tests', 'assets', 'docs'].includes(entry.name)) await visit(join(directory, entry.name), maxDepth, depth + 1)
    }
  }
  await visit(join(repositoryRoot, 'packages'), 3)
  await visit(join(repositoryRoot, 'apps/web/examples'), 6)
  const manifests = []
  for (const path of files) manifests.push({ path, manifest: JSON.parse(await readFile(path, 'utf8')) })
  return manifests
}

export function pinnedDshVersions(manifests) {
  const versions = new Map()
  for (const { manifest } of manifests) {
    const fields = [...dependencyFields.map(field => [field, manifest[field]]), ['pnpm.overrides', manifest.pnpm?.overrides]]
    for (const [field, entries] of fields) {
      for (const [name, version] of Object.entries(entries ?? {})) {
        if (!isDshPackage(name)) continue
        const values = versions.get(name) ?? new Set()
        values.add(version)
        versions.set(name, values)
      }
    }
  }
  return versions
}

/** Only exact pins of the currently locked release are rewritten. */
export function planVersionChange(manifests, from, to, repositoryRoot = root) {
  const changes = [], unexpected = [], already = []
  for (const { path, manifest } of manifests) {
    const fields = [...dependencyFields.map(field => [field, manifest[field]]), ['pnpm.overrides', manifest.pnpm?.overrides]]
    for (const [field, entries] of fields) {
      for (const [name, version] of Object.entries(entries ?? {})) {
        if (!isDshPackage(name)) continue
        const file = relative(repositoryRoot, path).replaceAll('\\', '/')
        if (version === to) already.push({ file, field, name })
        else if (version === from) changes.push({ file, field, name, from: version, to })
        else unexpected.push({ file, field, name, version })
      }
    }
  }
  return { changes, unexpected, already }
}

const escapePattern = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Text substitution keeps the repository's existing JSON formatting intact. */
export async function applyVersionChange(repositoryRoot, from, to, changes) {
  const byFile = new Map()
  for (const change of changes) byFile.set(change.file, [...(byFile.get(change.file) ?? []), change])
  const written = []
  for (const [file, rows] of byFile) {
    const path = join(repositoryRoot, file)
    let text = await readFile(path, 'utf8')
    for (const row of rows) {
      const pattern = new RegExp(`"${escapePattern(row.name)}":\\s*"${escapePattern(from)}"`)
      if (!pattern.test(text)) throw new Error(`Refusing to rewrite ${file}: ${row.field}.${row.name} is not a literal ${from} pin`)
      text = text.replace(pattern, () => `"${row.name}": "${to}"`)
    }
    const confirm = pinnedDshVersions([{ path, manifest: JSON.parse(text) }])
    for (const row of rows) {
      const values = confirm.get(row.name) ?? new Set()
      if (values.has(from)) throw new Error(`Refusing to write ${file}: ${row.name} still pins ${from}`)
    }
    await writeFile(path, text)
    written.push(file)
  }
  return written
}

export async function bumpDshVersion(repositoryRoot, { version, apply = false, skipPreflight = false, request = fetch }) {
  if (!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(version)) throw new Error('Target must be one exact published version')
  const upstreamPath = join(repositoryRoot, 'upstream.json')
  const upstream = JSON.parse(await readFile(upstreamPath, 'utf8'))
  const from = upstream.version
  const manifests = await collectManifests(repositoryRoot)
  const plan = planVersionChange(manifests, from, version, repositoryRoot)
  const framePatch = JSON.parse(await readFile(join(repositoryRoot, 'scripts/native-workbench-frame-patch.json'), 'utf8'))
  const current = pinnedDshVersions(manifests)
  const report = {
    candidate: version,
    current: from,
    apply,
    changes: plan.changes,
    unexpectedPins: plan.unexpected,
    alreadyPinned: plan.already.length,
    blocking: [],
    review: [],
    written: [],
  }
  if (!skipPreflight) {
    const preflight = await inspectUpgrade(repositoryRoot, version, request)
    report.preflight = {
      publicationVerified: preflight.publicationVerified,
      missingDirectPackages: preflight.missingDirectPackages,
      obsoleteOverrideCandidates: preflight.obsoleteOverrideCandidates,
      failedRequests: preflight.packages.filter(item => item.status === 'request-failed').map(item => item.name),
      desktopFeeds: preflight.desktopFeeds.map(({ target, status, feedVersion }) => ({ target, status, feedVersion })),
      desktopCandidateAdvertised: preflight.desktopCandidateAdvertised,
    }
    if (!preflight.publicationVerified || report.preflight.failedRequests.length) {
      report.blocking.push('Registry preflight failed: every direct/peer DSH package must be published at ' + version)
      return report
    }
  }
  for (const [target, artifact] of Object.entries(upstream.desktopArtifacts ?? {})) {
    if (artifact.version !== version) report.blocking.push(`Desktop ${target} official archive is still ${artifact.version}; collect the published URL, size and SHA-512 before packaging`)
  }
  if (framePatch.version !== version) report.blocking.push(`native-workbench-frame-patch locks ${framePatch.package}@${framePatch.version}; re-derive originalSha256/patchedSha256/replacements for the two authorized outer-frame seams before launching`)
  if (upstream.primaryRuntime) report.review.push(`primaryRuntime stays node=${upstream.primaryRuntime.node} pnpm=${upstream.primaryRuntime.pnpm} python=${upstream.primaryRuntime.python}; verify against the new archive runtime.json`)
  const webOverrides = manifests.find(item => item.path === join(repositoryRoot, 'apps/web/package.json'))?.manifest.pnpm?.overrides ?? {}
  for (const name of runtimePackages) {
    if (webOverrides[name]) report.review.push(`${name} stays pinned at ${webOverrides[name]}; confirm the new release's own range before installing`)
  }
  report.pinnedPackageCount = current.size
  if (!apply) return report

  report.written = await applyVersionChange(repositoryRoot, from, version, plan.changes)
  if (from !== version) {
    const text = await readFile(upstreamPath, 'utf8')
    const next = text.replace(new RegExp(`"version":\\s*"${escapePattern(from)}"`), () => `"version": "${version}"`)
    if (JSON.parse(next).desktopArtifacts !== undefined && JSON.parse(next).version !== version) throw new Error('Refusing to write upstream.json: top-level version was not replaced')
    await writeFile(upstreamPath, next)
    report.written.push('upstream.json')
  }
  return report
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const version = process.argv.find(argument => argument.startsWith('--version='))?.slice(10)
  if (!version) throw new Error('Pass --version=<exact published DSH version>')
  const apply = process.argv.includes('--apply')
  const report = await bumpDshVersion(root, { version, apply, skipPreflight: process.argv.includes('--skip-preflight') })
  console.log(JSON.stringify(report, null, 2))
  console.log(apply ? 'Rewrite applied. Continue with the maintained gates.' : 'Dry run only. Re-run with --apply to rewrite the version pins.')
  if (report.blocking.length) {
    console.error('Outstanding manual steps:\n' + report.blocking.join('\n'))
    process.exitCode = 1
  }
}
