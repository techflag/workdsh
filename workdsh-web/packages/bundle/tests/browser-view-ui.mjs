import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { once } from 'node:events';
import { join } from 'node:path';
import { test } from 'node:test';

const profile = process.env.WORKDSH_PREVIEW_HOME;
const executable = process.env.DSH_BROWSER_EXECUTABLE;
const onePixelPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlPLgAAAABJRU5ErkJggg==';

test('Web client opens the Agent browser tab and sends image clicks to its Session', { skip: !profile || !executable }, async () => {
  const requireProfile = createRequire(join(profile, 'profiles/preview/package.json'));
  const { chromium } = (await import(requireProfile.resolve('playwright'))).default;
  const root = new URL('../../../', import.meta.url).pathname;
  const port = String(19000 + Math.floor(Math.random() * 1000));
  const server = spawn(process.execPath, [join(root, 'scripts/start-preview.mjs')], {
    cwd: root, env: { ...process.env, WORKDSH_PREVIEW_PORT: port, WORKDSH_PREVIEW_HOME: profile },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let browser;
  try {
    const url = await new Promise((resolve, reject) => {
      let output = '';
      const timeout = setTimeout(() => reject(new Error('Preview did not start')), 20_000);
      server.stdout.on('data', chunk => {
        output += chunk.toString();
        const match = output.match(/dsh web: (http:\/\/127\.0\.0\.1:\d+\/\?token=[^\s]+)/);
        if (match) { clearTimeout(timeout); resolve(match[1]); }
      });
      server.once('exit', code => { clearTimeout(timeout); reject(new Error(`Preview exited ${code}`)); });
    });
    browser = await chromium.launch({ executablePath: executable, headless: true });
    const page = await browser.newPage();
    const actions = [];
    await page.route('**/api/workdsh-agent-browser', async route => {
      const body = route.request().postDataJSON();
      if (body.action) actions.push(body.action);
      const frame = { sessionId: body.sessionId, revision: 1, url: 'https://example.test/', image: `data:image/png;base64,${onePixelPng}` };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ frame, unchanged: false }) });
    });
    await page.goto(url);
    const continueButton = page.getByRole('button', { name: '继续', exact: true });
    if (await continueButton.waitFor({ timeout: 3000 }).then(() => true).catch(() => false)) await continueButton.click();
    const skipKey = page.getByRole('button', { name: '稍后配置' });
    if (await skipKey.waitFor({ timeout: 3000 }).then(() => true).catch(() => false)) await skipKey.click();
    const panel = page.getByRole('region', { name: '智能体浏览器' });
    await panel.waitFor({ timeout: 15_000 });
    assert.equal(await panel.getByRole('img', { name: '智能体当前浏览器画面' }).count(), 1);
    await panel.getByRole('img', { name: '智能体当前浏览器画面' }).click();
    assert.equal(actions.at(-1)?.kind, 'click');
    assert.ok(actions.at(-1)?.x >= 0);
    await panel.getByRole('textbox', { name: '网页地址' }).fill('https://example.org/');
    await panel.getByRole('button', { name: '前往' }).click();
    assert.deepEqual(actions.at(-1), { kind: 'navigate', url: 'https://example.org/' });
    await panel.getByRole('button', { name: '返回' }).click();
    assert.equal(actions.at(-1)?.kind, 'back');
    await panel.getByRole('button', { name: '刷新' }).click();
    assert.equal(actions.at(-1)?.kind, 'reload');
    await page.close();
  } finally {
    if (browser) await browser.close();
    if (server.exitCode === null) { server.kill('SIGTERM'); await once(server, 'exit').catch(() => undefined); }
  }
});
