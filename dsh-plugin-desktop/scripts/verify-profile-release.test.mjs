import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { verifyPackageDshReferences, verifyProfileRelease } from './verify-profile-release.mjs'
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

test('rejects a WorkDSH package built against another DSH version', () => {
  assert.doesNotThrow(() => verifyPackageDshReferences({
    name: 'workdsh-plugin-experts',
    peerDependencies: { '@deepseek-ai/dsh-agent': DSH_VERSION },
  }, DSH_VERSION))
  assert.throws(() => verifyPackageDshReferences({
    name: 'workdsh-plugin-experts',
    peerDependencies: { '@deepseek-ai/dsh-agent': '0.1.6-alpha.1' },
  }, DSH_VERSION), /workdsh-plugin-experts references @deepseek-ai\/dsh-agent/)
})
