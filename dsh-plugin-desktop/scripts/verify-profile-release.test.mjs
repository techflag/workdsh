import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { verifyProfileRelease } from './verify-profile-release.mjs'
import { DSH_VERSION } from './runtime-version.mjs'

test('accepts a WorkDSH release aligned with the pinned DSH runtime', () => {
  assert.doesNotThrow(() => verifyProfileRelease({
    harness: DSH_VERSION,
    runtimeOverrides: { '@deepseek-ai/dsh': DSH_VERSION, 'other-package': '1.0.0' },
  }, DSH_VERSION))
})

test('rejects an older WorkDSH release instead of relabeling its compatibility', () => {
  assert.throws(() => verifyProfileRelease({ harness: 'obsolete-dsh-version' }, DSH_VERSION), /targets DSH/)
  assert.throws(() => verifyProfileRelease({
    harness: DSH_VERSION,
    runtimeOverrides: { '@deepseek-ai/dsh-agent': 'obsolete-dsh-version' },
  }, DSH_VERSION), /overrides @deepseek-ai\/dsh-agent/)
})
