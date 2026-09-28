import { recordMessageActivity } from "../db/helpers/analytics.js";
import { logger } from "../utils/logger.js";

export class AnalyticsBatcher {
  constructor(flushIntervalMs = 15000, maxBufferSize = 50) {
    this.flushIntervalMs = flushIntervalMs;
    this.maxBufferSize = maxBufferSize;
    this.messageBuffer = new Map(); // `${guildId}:${userId}:${channelId}` -> count
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

  async addMessage(guildId, userId, channelId = null, count = 1) {
    const safeChannel = channelId || "default";
    const key = `${guildId}:${userId}:${safeChannel}`;
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

    // High-concurrency non-blocking batch execution
    await Promise.all(
      entries.map(async ([key, count]) => {
        const [guildId, userId, channelId] = key.split(":");
        try {
          await recordMessageActivity(
            guildId,
            userId,
            channelId === "default" ? null : channelId,
            count
          );
        } catch (err) {
          logger.error(`[ANALYTICS] Failed to flush messages for ${key}:`, err);
        }
      })
    );
  }
}

export const ANALYTICS_BATCHER = new AnalyticsBatcher();
