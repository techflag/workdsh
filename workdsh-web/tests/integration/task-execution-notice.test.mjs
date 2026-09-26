import test from 'node:test';
import assert from 'node:assert/strict';
import { taskExecutionNotice } from '../../packages/plugins/workbench/dist/client/components/TaskExecutionNotice.js';

test('task notice distinguishes stopped execution from unfinished todo records', () => {
  assert.equal(taskExecutionNotice(true, 8, 'interrupted'), null, 'a resumed turn must hide the previous interruption');
  assert.match(taskExecutionNotice(false, 8, 'interrupted'), /^已中断 · 8 项/);
  assert.match(taskExecutionNotice(false, 8), /^已停止/);
  assert.match(taskExecutionNotice(false, 8, 'error', 'fixture error'), /执行失败.*fixture error/);
  assert.equal(taskExecutionNotice(false, 0, 'interrupted'), null, 'completed todos need no unfinished-task warning');
});
