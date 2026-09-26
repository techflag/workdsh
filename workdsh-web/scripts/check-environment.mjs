import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const manifest = JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'));
const [major, minor] = process.versions.node.split('.').map(Number);
if (!((major === 22 && minor >= 19) || major >= 24)) {
  console.error(`Unsupported Node ${process.versions.node}; required ${manifest.engines.node}`);
  process.exitCode = 1;
} else {
  console.log(`Node ${process.versions.node}; package manager ${manifest.packageManager}`);
}
