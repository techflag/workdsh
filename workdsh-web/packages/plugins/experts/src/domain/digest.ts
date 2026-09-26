import { createHash } from 'node:crypto';

/**
 * Canonical JSON: object keys sorted lexicographically, arrays ordered, no
 * insignificant whitespace, `undefined` omitted. Two structurally equal values
 * always produce the same string, so digests are stable across revisions and
 * processes. Used for definition / dependency-lock / payload digests.
 */
export function canonicalJson(value: unknown): string {
  return stringify(value);
}

function stringify(value: unknown): string {
  if (value === null) return 'null';
  const type = typeof value;
  if (type === 'number') return Number.isFinite(value) ? JSON.stringify(value) : 'null';
  if (type === 'boolean') return value ? 'true' : 'false';
  if (type === 'string') return JSON.stringify(value);
  if (type === 'undefined') return 'null';
  if (Array.isArray(value)) return `[${value.map(stringify).join(',')}]`;
  if (type === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).filter((key) => record[key] !== undefined).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stringify(record[key])}`).join(',')}}`;
  }
  throw new TypeError(`Unsupported value type for canonical JSON: ${type}`);
}

/** SHA-256 hex digest of a UTF-8 string. */
export function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** SHA-256 hex digest of raw bytes. */
export function sha256Bytes(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/** Stable digest of any JSON-serializable value. */
export function digestOf(value: unknown): string {
  return sha256(canonicalJson(value));
}

/** Short (12 hex char) digest used inside kebab-case preset ids. */
export function shortDigest(value: unknown): string {
  return digestOf(value).slice(0, 12);
}

/** UTF-8 byte length of a string. */
export function byteLength(text: string): number {
  return Buffer.byteLength(text, 'utf8');
}

/** Unicode code-point length (matches JSON Schema `maxLength`). */
export function codePointLength(text: string): number {
  let count = 0;
  for (const _ of text) count += 1;
  return count;
}
