import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const readPackage = path => JSON.parse(readFileSync(join(root, path), 'utf8'))
const upstreamVersion = readPackage('deepseek-harness/package.json').version
const variants = ['dsh-plugin-desktop', 'dsh-plugin-desktop-beta']
const problems = []

for (const variant of variants) {
  const manifest = readPackage(`${variant}/package.json`)
  const runtimePreparation = readFileSync(join(root, variant, 'scripts/prepare-workdsh-runtime.mjs'), 'utf8')
  const declaredRuntimeVersion = runtimePreparation.match(/const DSH_VERSION = '([^']+)'/)?.[1]
  if (declaredRuntimeVersion !== upstreamVersion) {
    problems.push(`${variant}: packaged Profile version ${declaredRuntimeVersion ?? '(missing)'} differs from ${upstreamVersion}`)
  }
  const dependencies = Object.entries({ ...manifest.dependencies, ...manifest.devDependencies })
    .filter(([name]) => name === '@deepseek-ai/dsh' || name.startsWith('@deepseek-ai/dsh-'))
  const mismatches = dependencies.filter(([, version]) => version !== upstreamVersion)
  if (mismatches.length) {
    problems.push(`${variant}: ${mismatches.length}/${dependencies.length} DSH dependencies differ from ${upstreamVersion}`)
    for (const [name, version] of mismatches) problems.push(`  ${name}: ${version}`)
  }
}

if (problems.length) {
  console.error(`Desktop DSH source versions are not aligned with the pinned upstream (${upstreamVersion}):\n${problems.join('\n')}`)
  process.exitCode = 1
} else {
  console.log(`Desktop DSH source versions are aligned with the pinned upstream (${upstreamVersion})`)
}
