import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const web = resolve(root, 'workdsh-web')

if (!existsSync(resolve(web, 'docs'))) {
  process.stdout.write('SKIP: local-only workdsh-web/docs is absent\n')
} else {
  const result = spawnSync(process.execPath, ['scripts/check-plan.mjs'], { cwd: web, stdio: 'inherit' })
  if (result.error) throw result.error
  process.exitCode = result.status ?? 1
}
