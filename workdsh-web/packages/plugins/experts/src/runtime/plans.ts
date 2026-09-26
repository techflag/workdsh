/**
 * Short-lived, process-local stores for execution plans, draft handoffs and
 * import previews. These are intentionally NOT durable: they expire, and a lost
 * plan simply requires the user to prepare again. Durable idempotency and crash
 * recovery live in the `operations` table, not here.
 */
export class TtlStore<T> {
  private readonly entries = new Map<string, { value: T; expiresAt: number }>();

  constructor(private readonly ttlMs: number) {}

  set(key: string, value: T, ttlMs = this.ttlMs): void {
    this.sweep();
    this.entries.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  /** Return the value when present and unexpired; otherwise undefined (and evict). */
  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /** Peek without expiry eviction, for diagnosing an expired plan. */
  peek(key: string): { value: T; expired: boolean } | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    return { value: entry.value, expired: entry.expiresAt < Date.now() };
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  private sweep(): void {
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt < now) this.entries.delete(key);
    }
  }
}
