import { defineConfig } from 'tsdown'

// Installers ship this Electron carrier and the bundled WorkDSH Profile only.
export default defineConfig({
  entry: { 'workdsh-main': 'src/workdsh-main.ts' },
  outDir: 'lib',
  format: 'esm',
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
  sourcemap: true,
})
