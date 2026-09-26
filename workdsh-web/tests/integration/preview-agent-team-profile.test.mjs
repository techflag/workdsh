import assert from 'node:assert/strict';
import { test } from 'node:test';
import { withoutRedundantAgentTeamProfile } from '../../scripts/preview-agent-team.mjs';

test('preview keeps only the WorkDSH-owned Agent Team bundle', () => {
  const input = { dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', 'workdsh-plugin-experts', '@deepseek-ai/dsh-experimental-agent-team-profile', 'workdsh-plugin-library'] } } };
  const output = withoutRedundantAgentTeamProfile(input);
  assert.deepEqual(output.dsh.profile.bundles, ['@deepseek-ai/dsh-base', 'workdsh-plugin-experts', 'workdsh-plugin-library']);
  assert.equal(input.dsh.profile.bundles.length, 4);
  assert.equal(withoutRedundantAgentTeamProfile(output), undefined);
});

test('preview leaves a standalone upstream Team profile alone without WorkDSH experts', () => {
  const input = { dsh: { profile: { bundles: ['@deepseek-ai/dsh-experimental-agent-team-profile'] } } };
  assert.equal(withoutRedundantAgentTeamProfile(input), undefined);
});
