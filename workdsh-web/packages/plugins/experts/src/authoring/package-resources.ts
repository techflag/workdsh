import type { ExpertDefinition } from 'workdsh-contracts';
import { ExpertsError } from '../domain/values.js';

export type PackageAssets = NonNullable<ExpertDefinition['packageAssets']>;
export function packagePath(path: string): void {
  if (!path || path.length > 512 || path.startsWith('/') || /[\\\0]/.test(path) || /^[a-z]:/i.test(path) || path.split('/').some(p => !p || p === '.' || p === '..') || path.split('/').length > 8
    || !/^(README\.md|team\.md|settings\.json|LICENSE(?:\.[^/]+)?|NOTICE(?:\.[^/]+)?|\.(?:workdsh-expert|codebuddy-plugin)\/plugin\.json|agents\/[a-z][a-z0-9-]{1,63}\.md|(?:avatars|assets|bin)\/.+|skills\/[a-z][a-z0-9-]+\/.+)$/.test(path)) throw new ExpertsError('experts/invalid-definition', `非法专家资源路径：${path}`);
}
export function assetBytes(path: string, asset: PackageAssets[string]): Buffer {
  packagePath(path);
  if (!asset || typeof asset.base64 !== 'string' || asset.base64.length > 2_800_000 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(asset.base64)) throw new ExpertsError('experts/invalid-definition', '二进制资源编码无效或过大。');
  const bytes = Buffer.from(asset.base64, 'base64');
  if (!bytes.length || bytes.length > 2 * 1024 * 1024 || bytes.toString('base64') !== asset.base64 || asset.executable && !path.startsWith('bin/')) throw new ExpertsError('experts/invalid-definition', '资源大小或可执行标记无效。');
  if (path.startsWith('avatars/')) {
    if (bytes.length > 500 * 1024 || !imageType(bytes)) throw new ExpertsError('experts/invalid-definition', '头像必须是PNG/JPEG/WebP且不超过500KiB。');
  }
  if (/^(agents\/|\.[^/]+\/|settings\.json$|README\.md$)/.test(path) || /\/SKILL\.md$/.test(path)) throw new ExpertsError('experts/invalid-definition', '制作文档必须使用UTF-8文本入口。');
  return bytes;
}
export function imageType(bytes: Uint8Array): string | undefined {
  const b = Buffer.from(bytes);
  if (b.length >= 24 && b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && b.toString('ascii', 12, 16) === 'IHDR' && b.readUInt32BE(16) > 0 && b.readUInt32BE(20) > 0) return 'image/png';
  if (b.length > 4 && b[0] === 255 && b[1] === 216 && b[2] === 255) return 'image/jpeg';
  if (b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
}
export function validateResources(files: Readonly<Record<string, string>>, assets: PackageAssets = {}): void {
  const paths = [...Object.keys(files), ...Object.keys(assets)];
  if (paths.length > 64 || new Set(paths.map(path => path.normalize('NFC').toLowerCase())).size !== paths.length) throw new ExpertsError('experts/invalid-definition', '资源数量超限或存在重名路径。');
  let total = 0;
  for (const [path, text] of Object.entries(files)) { packagePath(path); if (typeof text !== 'string') throw new ExpertsError('experts/invalid-definition', '文档必须为文本。'); total += Buffer.byteLength(text); }
  for (const [path, asset] of Object.entries(assets)) total += assetBytes(path, asset).length;
  if (total > 20 * 1024 * 1024) throw new ExpertsError('experts/invalid-definition', '专家资源总大小超过20MiB。');
}
export function packageAvatar(files: Readonly<Record<string, string>>, assets: PackageAssets = {}): string | undefined {
  const path = files['.workdsh-expert/plugin.json'] ?? files['.codebuddy-plugin/plugin.json'];
  if (!path) return;
  const avatar = JSON.parse(path).avatar;
  if (!avatar) return;
  const normalized = String(avatar).replace(/^\.\//, '');
  const asset = assets[normalized];
  if (!asset) throw new ExpertsError('experts/invalid-definition', '声明的头像资源缺失。');
  const bytes = assetBytes(normalized, asset), type = imageType(bytes);
  if (!type) throw new ExpertsError('experts/invalid-definition', '头像不是受支持的图片。');
  return `data:${type};base64,${asset.base64}`;
}
