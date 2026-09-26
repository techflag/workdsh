import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { test } from 'node:test';
import { chromium } from 'playwright-core';
import { launchManagedChromium } from '../dist/managed-chromium.js';

test('two managed browsers isolate pages and clean their profiles', { skip: !process.env.DSH_BROWSER_EXECUTABLE }, async () => {
  const executable = process.env.DSH_BROWSER_EXECUTABLE;
  const first = await launchManagedChromium(executable);
  const second = await launchManagedChromium(executable);
  try {
    assert.notEqual(first.endpoint, second.endpoint);
    const page = await first.context.newPage();
    await page.goto('data:text/html,<title>session-one</title><button>ready</button>');
    const viewOne = await chromium.connectOverCDP(first.endpoint);
    const viewTwo = await chromium.connectOverCDP(second.endpoint);
    try {
      assert.equal(viewOne.contexts().flatMap(context => context.pages()).some(item => item.url().includes('session-one')), true);
      assert.equal(viewTwo.contexts().flatMap(context => context.pages()).some(item => item.url().includes('session-one')), false);
    } finally {
      await viewOne.close();
      await viewTwo.close();
    }
  } finally {
    await first.close();
    await second.close();
  }
  await assert.rejects(access(first.profileDir));
  await assert.rejects(access(second.profileDir));
});
