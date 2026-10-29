import { recordBatchActivity } from "../db/helpers/analytics.js";
import { logger } from "../utils/logger.js";

export class AnalyticsBatcher {
  public flushIntervalMs: number;
  public maxBufferSize: number;
  public messageBuffer: Map<string, number>;
  public voiceBuffer: Map<string, number>;
  public timer: any;
  constructor(flushIntervalMs = 15000, maxBufferSize = 50) {
    this.flushIntervalMs = flushIntervalMs;
    this.maxBufferSize = maxBufferSize;
    this.messageBuffer = new Map<string, number>(); // `${guildId}:${userId}:${channelId}` -> count
    this.voiceBuffer = new Map<string, number>();   // `${guildId}:${userId}:${channelId}` -> seconds
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

    if (this.messageBuffer.size + this.voiceBuffer.size >= this.maxBufferSize) {
      await this.flush();
    }
  }

  async addVoice(guildId, userId, channelId = null, seconds = 0) {
    const numSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
    if (numSeconds <= 0) return;

    const safeChannel = channelId || "default";
    const key = `${guildId}:${userId}:${safeChannel}`;
    const current = this.voiceBuffer.get(key) || 0;
    this.voiceBuffer.set(key, current + numSeconds);

    if (this.messageBuffer.size + this.voiceBuffer.size >= this.maxBufferSize) {
      await this.flush();
    }
  }

  async flush() {
    if (this.messageBuffer.size === 0 && this.voiceBuffer.size === 0) return;

    const msgEntries = Array.from(this.messageBuffer.entries());
    const vcEntries = Array.from(this.voiceBuffer.entries());

    this.messageBuffer.clear();
    this.voiceBuffer.clear();

    // Consolidate into unified batch map: `${guildId}:${userId}:${channelId}` -> { messages, vcSeconds }
    const batchMap = new Map<string, { messages: number; vcSeconds: number }>();

    for (const [key, count] of msgEntries) {
      const item = batchMap.get(key) || { messages: 0, vcSeconds: 0 };
      item.messages += count;
      batchMap.set(key, item);
    }

    for (const [key, seconds] of vcEntries) {
      const item = batchMap.get(key) || { messages: 0, vcSeconds: 0 };
      item.vcSeconds += seconds;
      batchMap.set(key, item);
    }

    const payload = [];
    for (const [key, metrics] of batchMap.entries()) {
      const [guildId, userId, channelId] = key.split(":");
      payload.push({
        guildId,
        userId,
        channelId: channelId === "default" ? null : channelId,
        messages: metrics.messages,
        vcSeconds: metrics.vcSeconds,
      });
    }

    try {
      await recordBatchActivity(payload);
    } catch (err) {
      logger.error("[ANALYTICS] Failed to flush batch activity:", err);
    }
  }
}

export const ANALYTICS_BATCHER = new AnalyticsBatcher();
