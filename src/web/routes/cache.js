/**
 * High-performance In-Memory TTL Cache for Web API routes.
 * Supports pattern and guild-scoped invalidation to ensure zero-latency reads
 * with immediate consistency on writes.
 */
export class ApiCache {
  constructor(defaultTtlMs = 30000) {
    this.store = new Map();
    this.defaultTtlMs = defaultTtlMs;

    // Background sweeper to prevent memory leaks from one-off requested keys
    setInterval(() => this.prune(), 60000);
  }

  prune() {
    const now = Date.now();
    for (const [key, item] of this.store.entries()) {
      if (now > item.expiresAt) {
        this.store.delete(key);
      }
    }
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
