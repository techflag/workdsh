import { describe, expect, it } from 'vitest'
import { normalizeAsarEntry } from '../scripts/verify-workdsh-carrier.ts'

describe('ASAR inventory paths', () => {
  it('recognizes the Electron entry point on Windows and macOS', () => {
    expect(normalizeAsarEntry('\\lib\\workdsh-main.js')).toBe('lib/workdsh-main.js')
    expect(normalizeAsarEntry('/lib/workdsh-main.js')).toBe('lib/workdsh-main.js')
    expect(normalizeAsarEntry('\\node_modules\\@deepseek-ai\\dsh\\package.json'))
      .toBe('node_modules/@deepseek-ai/dsh/package.json')
  })
})
