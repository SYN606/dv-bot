import { incrementMessageCount, incrementVoiceTime } from "../db/helpers/analytics.js";

export class AnalyticsBatcher {
  constructor(flushIntervalMs = 15000, maxBufferSize = 50) {
    this.flushIntervalMs = flushIntervalMs;
    this.maxBufferSize = maxBufferSize;
    this.messageBuffer = new Map(); // `${guildId}:${userId}` -> count
    this.timer = null;
  }

  start() {
    if (!this.timer) {
      this.timer = setInterval(() => this.flush(), this.flushIntervalMs);
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    return this.flush();
  }

  async addMessage(guildId, userId, count = 1) {
    const key = `${guildId}:${userId}`;
    const current = this.messageBuffer.get(key) || 0;
    this.messageBuffer.set(key, current + count);

    if (this.messageBuffer.size >= this.maxBufferSize) {
      await this.flush();
    }
  }

  async flush() {
    if (this.messageBuffer.size === 0) return;

    const entries = Array.from(this.messageBuffer.entries());
    this.messageBuffer.clear();

    for (const [key, count] of entries) {
      const [guildId, userId] = key.split(":");
      try {
        await incrementMessageCount(guildId, userId, count);
      } catch (err) {
        console.error(`[ANALYTICS] Failed to flush messages for ${key}:`, err);
      }
    }
  }
}

export const ANALYTICS_BATCHER = new AnalyticsBatcher();
