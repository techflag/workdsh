import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { writeFileSync } from 'node:fs';
const clientResult = await build({
  entryPoints: [fileURLToPath(new URL('../packages/bundle/src/client/index.ts', import.meta.url))], bundle: true, write: false,
  format: 'cjs', platform: 'browser', target: 'es2022', external: ['@deepseek-ai/dsh-client-ui-primitives', 'react'],
});
// Product presentation and its explicitly registered Workbench child. Skill has
// its own package, Host row and browser artifact; it is never bundled here.
writeFileSync(new URL('../packages/bundle/dist/client.js', import.meta.url),
  `window.__ModuleLoader__.load({id: "workdsh-bundle", factory: function(require) {
const module = { exports: {} };
${clientResult.outputFiles[0].text}
return module.exports;
}});
`);

// Product diagnostics only; no feature implementation is included in this Host.
const hostResult = await build({
  entryPoints: [fileURLToPath(new URL('../packages/bundle/src/probe.ts', import.meta.url))],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  external: ['@deepseek-ai/cordis', '@deepseek-ai/dsh-skill', 'yaml'],
});
writeFileSync(new URL('../packages/bundle/dist/probe.js', import.meta.url), hostResult.outputFiles[0].text);
