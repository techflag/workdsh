import {execFileSync} from "node:child_process";
import {cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile} from "node:fs/promises";
import {resolve, join} from "node:path";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const plugin = join(root, "packages/plugins/office");
const destination = join(root, ".artifacts/office-release");
await rm(destination, {recursive: true, force: true});
await mkdir(destination, {recursive: true});
// Package the complete current Office plugin. Word-only archives are historical.
execFileSync(process.execPath, [join(root, "scripts/build-office.mjs")], {cwd: root, stdio: "inherit"});
const review = JSON.parse(await readFile(join(plugin, "dist/license-review.json"), "utf8"));
const bundled = JSON.parse(await readFile(join(plugin, "dist/bundled-dependencies.json"), "utf8"));
if (!Array.isArray(review.missingLicenseTexts) || !Array.isArray(bundled)) throw Error("Invalid Office license inventory");
const undeclaredLicenses = bundled.filter(packageInfo => !packageInfo.license);
const stage = await mkdtemp(join(destination, "package-"));
const manifest = JSON.parse(await readFile(join(plugin, "package.json"), "utf8"));
delete manifest.devDependencies;
delete manifest.scripts;
manifest.description = "Independent Harness plugin: browser Office working copies and native PPTX templates (alpha preview)";
manifest.workdshRelease = {scope: "office-browser-preview", wordOnly: false, formats: ["docx", "pptx", "xlsx", "pdf", "html"]};
await writeFile(join(stage, "package.json"), JSON.stringify(manifest, null, 2) + "\n");
for (const file of manifest.files) await cp(join(plugin, file), join(stage, file), {recursive: true});
execFileSync("corepack", ["pnpm", "pack", "--pack-destination", destination], {cwd: stage, stdio: "inherit"});
const filename = `${manifest.name}-${manifest.version}.tgz`;
const bytes = await readFile(join(destination, filename));
const sha256 = createHash("sha256").update(bytes).digest("hex");
await writeFile(join(destination, "SHA256SUMS.txt"), `${sha256}  ${filename}\n`);
await writeFile(join(destination, "release-manifest.json"), JSON.stringify({
  name: manifest.name,
  version: manifest.version,
  scope: manifest.workdshRelease.scope,
  harness: "0.1.7-rc.2",
  filename,
  sha256,
  bytes: bytes.length,
  licenseTextsComplete: review.missingLicenseTexts.length === 0,
  missingLicenseTexts: review.missingLicenseTexts,
  dependenciesWithoutDeclaredLicense: undeclaredLicenses.map(({name, version}) => ({name, version})),
  bundledDependencyCount: bundled.length,
  bundledLicenses: [...new Set(bundled.map(packageInfo => packageInfo.license ?? "UNDECLARED"))].sort(),
  limitations: [
    "Alpha preview: format-specific fidelity and editing limits remain documented in packages/plugins/office/README.md",
    "PPTX template import preserves supported master/layout/theme/media structures, but arbitrary complex-object fidelity is not fully accepted",
    `${review.missingLicenseTexts.length} bundled dependency versions currently lack collected license text; declared metadata and repository references remain recorded for review`,
    "Real-model end-to-end generation and multi-platform acceptance remain incomplete",
  ],
}, null, 2) + "\n");
await rm(stage, {recursive: true, force: true});
const producedFiles = (await readdir(destination)).sort();
console.log(`Office release candidate: ${filename}; ${bytes.length} bytes; ${bundled.length} bundled dependencies; ${review.missingLicenseTexts.length} license-text gaps; files: ${producedFiles.join(", ")}`);
