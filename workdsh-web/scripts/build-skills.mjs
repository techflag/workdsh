import { build } from 'esbuild';
import { copyFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const entry = new URL('../packages/plugins/skills/', import.meta.url);
const result = await build({
  entryPoints: [fileURLToPath(new URL('src/client.tsx', entry))],
  bundle: true, write: false, format: 'cjs', platform: 'browser', target: 'es2022',
  external: ['@deepseek-ai/dsh-client-ui-primitives', 'react', 'react/jsx-runtime'],
});
// Use the official registration facade; React remains the renderer's shared instance.
await writeFile(new URL('dist/client.browser.js', entry),
  `window.__ModuleLoader__.load({id: "workdsh-plugin-skills", factory: function(require) {
const module = { exports: {} };
${result.outputFiles[0].text}
return module.exports;
}});
`);
// The type-only public contract has a single source in contracts. Include its
// emitted declaration in this tarball so installed types need no workspace.
await copyFile(new URL('../packages/contracts/dist/skills.d.ts', import.meta.url), new URL('dist/shared.d.ts', entry));
