import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const readPackage = path => JSON.parse(readFileSync(join(root, path), 'utf8'))
const upstreamVersion = readPackage('deepseek-harness/package.json').version
const workspaces = ['dsh-plugin-desktop', 'dsh-community-market', 'dsh-plugin-ssh']
const problems = []

for (const workspace of workspaces) {
  const manifest = readPackage(`${workspace}/package.json`)
  if (workspace === 'dsh-plugin-desktop') {
    const runtimePreparation = readFileSync(join(root, workspace, 'scripts/prepare-workdsh-runtime.mjs'), 'utf8')
    const declaredRuntimeVersion = runtimePreparation.match(/const DSH_VERSION = '([^']+)'/)?.[1]
    if (declaredRuntimeVersion !== upstreamVersion) {
      problems.push(`${workspace}: packaged Profile version ${declaredRuntimeVersion ?? '(missing)'} differs from ${upstreamVersion}`)
    }
  }
  const dependencies = Object.entries({ ...manifest.dependencies, ...manifest.devDependencies })
    .filter(([name]) => name === '@deepseek-ai/dsh' || name.startsWith('@deepseek-ai/dsh-'))
  const mismatches = dependencies.filter(([, version]) => version !== upstreamVersion)
  if (mismatches.length) {
    problems.push(`${workspace}: ${mismatches.length}/${dependencies.length} DSH dependencies differ from ${upstreamVersion}`)
    for (const [name, version] of mismatches) problems.push(`  ${name}: ${version}`)
  }
}

const rootManifest = readPackage('package.json')
const oldResolutions = Object.entries(rootManifest.resolutions ?? {})
  .filter(([selector]) => selector.startsWith('@deepseek-ai/dsh'))
  .filter(([selector]) => !selector.includes(`@npm:${upstreamVersion}`) && !selector.includes(`@npm:^${upstreamVersion}`))
if (oldResolutions.length) {
  problems.push(`root: ${oldResolutions.length} DSH resolutions target versions other than ${upstreamVersion}`)
}

if (problems.length) {
  console.error(`Desktop DSH source versions are not aligned with the pinned upstream (${upstreamVersion}):\n${problems.join('\n')}`)
  process.exitCode = 1
} else {
  console.log(`Desktop DSH source versions are aligned with the pinned upstream (${upstreamVersion})`)
}
