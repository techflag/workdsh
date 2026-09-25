import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DSH_VERSION } from '../dsh-plugin-desktop/scripts/runtime-version.mjs'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const readJson = path => JSON.parse(readFileSync(join(root, path), 'utf8'))
const upstream = readJson('upstream.json')
const checkout = readJson('deepseek-harness/package.json')
const problems = []

if (upstream.version !== checkout.version || DSH_VERSION !== checkout.version) {
  problems.push(`upstream.json=${upstream.version}, Desktop=${DSH_VERSION}, checkout=${checkout.version}`)
}
for (const workspace of ['dsh-plugin-desktop', 'dsh-community-market']) {
  const manifest = readJson(`${workspace}/package.json`)
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const name of Object.keys(manifest[field] ?? {})) {
      if (name === '@deepseek-ai/dsh' || name.startsWith('@deepseek-ai/dsh-')) {
        problems.push(`${workspace} declares an extra DSH package in ${field}: ${name}`)
      }
    }
  }
}
for (const name of Object.keys(readJson('package.json').resolutions ?? {})) {
  if (name.startsWith('@deepseek-ai/dsh')) problems.push(`root resolution retains old DSH package: ${name}`)
}

if (problems.length) {
  console.error(`Desktop DSH version alignment failed:\n${problems.join('\n')}`)
  process.exitCode = 1
} else {
  console.log(`Desktop has one DSH source version: ${DSH_VERSION}`)
}
