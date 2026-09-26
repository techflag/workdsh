import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const entry = new URL('../packages/plugins/activity/', import.meta.url);
const output = await build({ entryPoints: [fileURLToPath(new URL('src/client.tsx', entry))], bundle: true, write: false, format: 'cjs', platform: 'browser', target: 'es2022', external: ['@deepseek-ai/dsh-client-ui-primitives', 'react', 'react/jsx-runtime'] });
await writeFile(new URL('dist/client.browser.js', entry), `window.__ModuleLoader__.load({id: "workdsh-plugin-activity", factory: function(require) { const module = {exports:{}};\n${output.outputFiles[0].text}\nreturn module.exports; }});\n`);
await writeFile(new URL('dist/activity.d.ts', entry), (await readFile(new URL('../packages/contracts/dist/activity.d.ts', import.meta.url), 'utf8')) + "\ndeclare module '@deepseek-ai/cordis' { interface Context { activityPresentation: ActivityPresentation; } }\n");
for (const file of ['client.d.ts', 'registry.d.ts']) {
  const path = new URL(`dist/${file}`, entry);
  await writeFile(path, (await readFile(path, 'utf8')).replaceAll("'workdsh-contracts/activity'", "'./activity.js'"));
}

await writeFile(new URL('dist/presentation.js', entry), 'export {};\n');
