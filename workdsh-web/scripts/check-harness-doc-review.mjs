import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ledgerPath = resolve(root, 'docs/research/deepseek-harness-review.json');
const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'));
const corpus = resolve(root, ledger.corpusRoot);

function filesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(dir, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

const markdown = filesUnder(corpus).filter(path => path.endsWith('.md'));
const names = new Set(markdown.map(path => relative(corpus, path)));
const canonical = markdown
  .filter(path => {
    const name = relative(corpus, path);
    if (name.endsWith('.zh.md')) return true;
    return !names.has(name.replace(/\.md$/, '.zh.md'));
  })
  .map(path => relative(corpus, path))
  .sort();
const reviewed = [...new Set(ledger.reviewed)].sort();

for (const name of reviewed) assert.ok(canonical.includes(name), `review ledger contains a non-canonical or missing document: ${name}`);
const pending = canonical.filter(name => !reviewed.includes(name));
console.log(`Harness documentation review: ${reviewed.length}/${canonical.length} canonical documents reviewed; ${pending.length} pending.`);
if (pending.length) console.log(`Next pending: ${pending.slice(0, 12).join(', ')}`);
