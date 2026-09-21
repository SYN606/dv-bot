export class GlobalCooldownManager {
  constructor(rate = 5, per = 5) {
    this.rate = rate;
    this.per = per;
    this.buckets = new Map(); // key -> { tokens, lastUpdate }
  }

  _getKey(userId, guildId = null) {
    return `${userId}:${guildId || "global"}`;
  }

  _getBucket(key) {
    const now = Date.now() / 1000;
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.rate, lastUpdate: now };
      this.buckets.set(key, bucket);
      return bucket;
    }

    // Replenish tokens based on elapsed time
    const elapsed = now - bucket.lastUpdate;
    const tokensToAdd = elapsed * (this.rate / this.per);
    bucket.tokens = Math.min(this.rate, bucket.tokens + tokensToAdd);
    bucket.lastUpdate = now;

    return bucket;
  }

  retryAfter(userId, guildId = null) {
    const key = this._getKey(userId, guildId);
    const bucket = this._getBucket(key);

    if (bucket.tokens >= 1) return 0;

    const needed = 1 - bucket.tokens;
    return (needed * this.per) / this.rate;
  }

  acquire(userId, guildId = null) {
    const key = this._getKey(userId, guildId);
    const bucket = this._getBucket(key);

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }
    return false;
  }

  async checkInteraction(interaction) {
    if (interaction.isAutocomplete?.()) return true;
    return this.acquire(interaction.user.id, interaction.guildId);
  }

  async checkMessage(message) {
    if (message.author.bot) return true;
    return this.acquire(message.author.id, message.guildId);
  }

  prune() {
    const now = Date.now() / 1000;
    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastUpdate > this.per * 2 && bucket.tokens >= this.rate) {
        this.buckets.delete(key);
      }
    }
  }
}

export const GLOBAL_COOLDOWN = new GlobalCooldownManager(5, 5);
