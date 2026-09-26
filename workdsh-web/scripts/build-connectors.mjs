import { build } from 'esbuild';
import { copyFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const entry = new URL('../packages/plugins/connectors/', import.meta.url);
const result = await build({
  entryPoints: [fileURLToPath(new URL('src/client.tsx', entry))],
  bundle: true, write: false, format: 'cjs', platform: 'browser', target: 'es2022',
  external: ['@deepseek-ai/dsh-client-ui-primitives', 'react', 'react/jsx-runtime'],
});
await writeFile(new URL('dist/client.browser.js', entry), `window.__ModuleLoader__.load({id: "workdsh-plugin-connectors", factory: function(require) {\nconst module = { exports: {} };\n${result.outputFiles[0].text}\nreturn module.exports;\n}});\n`);
await copyFile(new URL('src/example-server.mjs', entry), new URL('dist/example-server.mjs', entry));
