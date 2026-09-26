import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const providerManifest = require.resolve('@deepseek-ai/dsh-experimental-computer-use-cua-driver-native/package.json', {
  paths: [fileURLToPath(new URL('../packages/bundle', import.meta.url))],
});
const sdkPath = resolve(dirname(providerManifest), '../../@trycua/cua-driver/dist/index.js');
const { CuaDriver } = await import(pathToFileURL(sdkPath).href);
const driver = CuaDriver.create(undefined);
try {
  const catalog = JSON.parse(await driver.listToolsJson());
  const names = catalog.tools?.map((tool) => tool.name) ?? [];
  if (!names.includes('check_permissions')) throw new Error('Cua Driver did not publish check_permissions.');
  const result = await driver.callTool('check_permissions', JSON.stringify({ prompt: false }));
  const permission = JSON.parse(result.rawJson);
  const state = permission.structuredContent;
  if (!state || typeof state.accessibility !== 'boolean' || typeof state.screen_recording !== 'boolean') {
    throw new Error('Cua Driver returned an invalid permission result.');
  }
  console.log(JSON.stringify({
    provider: 'cua-driver-native',
    toolCount: names.length,
    accessibility: state.accessibility,
    screenRecording: state.screen_recording,
    directCaptureStatus: state.direct_capture_status ?? null,
  }, null, 2));
} finally {
  await driver.shutdown();
  driver.uniffiDestroy();
}
