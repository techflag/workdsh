import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const upstream = JSON.parse(readFileSync(resolve(fileURLToPath(new URL('../..', import.meta.url)), 'upstream.json'), 'utf8'))
if (typeof upstream.version !== 'string' || !upstream.version) {
  throw new Error('upstream.json must record one DSH version')
}

export const DSH_VERSION = upstream.version
