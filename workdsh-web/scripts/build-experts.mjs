import { build } from 'esbuild';
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const entry = new URL('../packages/plugins/experts/', import.meta.url);
const result = await build({
  entryPoints: [fileURLToPath(new URL('src/client.tsx', entry))],
  bundle: true, write: false, format: 'cjs', platform: 'browser', target: 'es2022',
  external: ['@deepseek-ai/dsh-client-ui-primitives', 'react', 'react/jsx-runtime'],
});
// Use the official registration facade; React remains the renderer's shared instance.
await writeFile(new URL('dist/client.browser.js', entry),
  `window.__ModuleLoader__.load({id: "workdsh-plugin-experts", factory: function(require) {
const module = { exports: {} };
${result.outputFiles[0].text}
return module.exports;
}});
`);
// The public contract types have a single source in contracts. Inline the emitted
// declaration plus the governance types it references so installed types need no
// workspace, and re-export the locally-owned runtime values (ADR-0019) so the
// installed dist/shared.d.ts declares exactly what dist/shared.js provides.
const contractTypes = await readFile(new URL('../packages/contracts/dist/experts.d.ts', import.meta.url), 'utf8');
await writeFile(new URL('dist/shared.d.ts', entry),
  `${contractTypes}\nexport { EXPERT_LIMITS, ExpertsError, actionAccess } from './domain/values.js';\n`);
await copyFile(new URL('../packages/contracts/dist/governance.d.ts', import.meta.url), new URL('dist/governance.d.ts', entry));
