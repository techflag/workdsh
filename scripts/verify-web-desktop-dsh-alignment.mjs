import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const expected = JSON.parse(readFileSync(join(root, 'upstream.json'), 'utf8')).version
const webRoot = join(root, 'workdsh-web')
const dependencyFields = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']
const mismatches = []
let checked = 0

function checkManifest(path) {
  const manifest = JSON.parse(readFileSync(path, 'utf8'))
  for (const field of dependencyFields) {
    for (const [name, version] of Object.entries(manifest[field] ?? {})) {
      if (!name.startsWith('@deepseek-ai/dsh')) continue
      checked++
      if (version !== expected) {
        mismatches.push(`${relative(root, path)} ${field}.${name}: ${version}`)
      }
    }
  }
}

function visit(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist') visit(path)
      continue
    }
    if (entry.name !== 'package.json') continue
    checkManifest(path)
  }
}

checkManifest(join(webRoot, 'package.json'))
visit(join(webRoot, 'packages'))
visit(join(webRoot, 'examples'))
if (checked === 0) throw new Error('No Web DSH dependencies found; alignment check is incomplete')
if (mismatches.length > 0) {
  throw new Error(`Web dependencies differ from Desktop DSH ${expected}:\n${mismatches.join('\n')}`)
}
console.log(`Web and Desktop use DSH ${expected}; checked ${checked} Web dependency declarations.`)
