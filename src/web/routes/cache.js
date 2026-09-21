/**
 * High-performance In-Memory TTL Cache for Web API routes.
 * Supports pattern and guild-scoped invalidation to ensure zero-latency reads
 * with immediate consistency on writes.
 */
export class ApiCache {
  constructor(defaultTtlMs = 30000) {
    this.store = new Map();
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  set(key, value, ttlMs = this.defaultTtlMs) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  delete(key) {
    this.store.delete(key);
  }

  invalidateGuild(guildId) {
    const prefix = `guild:${guildId}:`;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  clear() {
    this.store.clear();
  }
}

export const apiCache = new ApiCache(30000);
