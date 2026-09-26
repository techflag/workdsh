import { build } from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
await build({ entryPoints: ['main.js'], bundle: true, format: 'esm', outdir: 'dist', loader: { '.woff': 'file', '.woff2': 'file', '.ttf': 'file' }, define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'warning' });
await copyFile('index.html', 'dist/index.html');
await copyFile('shell.css', 'dist/shell.css');
