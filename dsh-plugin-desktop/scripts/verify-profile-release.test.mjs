import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { verifyProfileRelease } from './verify-profile-release.mjs'

test('accepts a WorkDSH release aligned with the pinned DSH runtime', () => {
  assert.doesNotThrow(() => verifyProfileRelease({
    harness: '0.1.7-rc.2',
    runtimeOverrides: { '@deepseek-ai/dsh': '0.1.7-rc.2', 'other-package': '1.0.0' },
  }, '0.1.7-rc.2'))
})

test('rejects an older WorkDSH release instead of relabeling its compatibility', () => {
  assert.throws(() => verifyProfileRelease({ harness: '0.1.7-rc.1' }, '0.1.7-rc.2'), /targets DSH/)
  assert.throws(() => verifyProfileRelease({
    harness: '0.1.7-rc.2',
    runtimeOverrides: { '@deepseek-ai/dsh-agent': '0.1.7-rc.1' },
  }, '0.1.7-rc.2'), /overrides @deepseek-ai\/dsh-agent/)
})
