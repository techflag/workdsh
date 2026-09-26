import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const entry = new URL('../packages/providers/browser-session/', import.meta.url);
const result = await build({
  entryPoints: [fileURLToPath(new URL('src/client.tsx', entry))],
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  external: ['react', 'react/jsx-runtime'],
});
await writeFile(new URL('dist/client.browser.js', entry),
  `window.__ModuleLoader__.load({id: "workdsh-provider-browser-session", factory: function(require) { const module = {exports:{}};\n${result.outputFiles[0].text}\nreturn module.exports; }});\n`);
