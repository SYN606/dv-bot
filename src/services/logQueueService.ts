import { EmbedBuilder, TextChannel, NewsChannel, ThreadChannel } from "discord.js";
import { logger } from "../utils/logger.js";

interface QueuedEmbed {
  embed: EmbedBuilder;
  timestamp: number;
}

interface ChannelQueueState {
  queue: QueuedEmbed[];
  isProcessing: boolean;
  pauseUntil: number;
  lastSentAt: number;
}

// Bounded limits to prevent memory leaks
const MAX_QUEUE_PER_CHANNEL = 100;
const MAX_EMBEDS_PER_MESSAGE = 10;
const MAX_BATCH_CHARACTERS = 5000; // Stay comfortably under Discord's 6,000 total characters cap across embeds
const MIN_SEND_INTERVAL_MS = 1100; // Safe pacing to never exceed Discord's 5 msgs / 5 sec rate limit
const CHANNEL_ERROR_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes backoff for missing permissions

function getEmbedCharacterCount(embed: EmbedBuilder): number {
  const data = embed.data;
  let count = 0;
  if (data.title) count += data.title.length;
  if (data.description) count += data.description.length;
  if (data.author?.name) count += data.author.name.length;
  if (data.footer?.text) count += data.footer.text.length;
  if (data.fields) {
    for (const f of data.fields) {
      count += (f.name?.length || 0) + (f.value?.length || 0);
    }
  }
  return count;
}

class LogQueueService {
  private channelQueues = new Map<string, ChannelQueueState>();
  private channelCooldowns = new Map<string, number>();
  private cleanupTimer: NodeJS.Timeout;

  constructor() {
    // Background garbage collection every 5 minutes to prevent memory leaks from stale channels
    this.cleanupTimer = setInterval(() => this.pruneInactiveQueues(), 5 * 60 * 1000);
    if (this.cleanupTimer.unref) this.cleanupTimer.unref();
  }

  /**
   * Enqueue a log embed for rate-limited, coalesced delivery.
   */
  public enqueue(guild: any, channelId: string, embed: EmbedBuilder): void {
    if (!guild || !channelId || !embed) return;

    const cId = String(channelId);
    const now = Date.now();

    // Check circuit breaker cooldown for channels with missing permissions
    const cooldownUntil = this.channelCooldowns.get(cId);
    if (cooldownUntil && now < cooldownUntil) {
      return;
    }

    let state = this.channelQueues.get(cId);
    if (!state) {
      state = {
        queue: [],
        isProcessing: false,
        pauseUntil: 0,
        lastSentAt: 0,
      };
      this.channelQueues.set(cId, state);
    }

    // Guard against memory leaks: enforce maximum queue depth
    if (state.queue.length >= MAX_QUEUE_PER_CHANNEL) {
      state.queue.shift(); // Evict oldest log if saturated
    }

    state.queue.push({ embed, timestamp: now });

    // Trigger processing if not currently running
    if (!state.isProcessing) {
      this.processQueue(guild, cId);
    }
  }

  /**
   * Process pending queue for a specific channel with rate-limit pacing and multi-embed coalescing.
   */
  private async processQueue(guild: any, channelId: string): Promise<void> {
    const state = this.channelQueues.get(channelId);
    if (!state || state.isProcessing) return;

    state.isProcessing = true;

    try {
      while (state.queue.length > 0) {
        const now = Date.now();

        // 1. Respect 429 rate limit pause if active
        if (state.pauseUntil > now) {
          const waitTime = state.pauseUntil - now;
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }

        // 2. Respect safe pacing between consecutive messages to this channel
        const elapsedSinceLastSend = Date.now() - state.lastSentAt;
        if (elapsedSinceLastSend < MIN_SEND_INTERVAL_MS) {
          await new Promise((resolve) => setTimeout(resolve, MIN_SEND_INTERVAL_MS - elapsedSinceLastSend));
        }

        // 3. Batch embeds respecting both message counts and Discord's 6,000 character limit
        const batch: EmbedBuilder[] = [];
        let totalChars = 0;
        let imagesCount = 0;

        while (state.queue.length > 0 && batch.length < MAX_EMBEDS_PER_MESSAGE) {
          const nextItem = state.queue[0];
          if (!nextItem) break;

          const embedLen = getEmbedCharacterCount(nextItem.embed);
          const hasImage = Boolean(nextItem.embed.data?.image?.url);

          // Stop batching if adding this embed would exceed safe limits
          if (batch.length > 0 && (totalChars + embedLen > MAX_BATCH_CHARACTERS || (hasImage && imagesCount >= 2))) {
            break;
          }

          state.queue.shift();
          batch.push(nextItem.embed);
          totalChars += embedLen;
          if (hasImage) imagesCount++;
        }

        if (batch.length === 0) break;

        // 4. Resolve Discord channel
        let channel = guild.channels?.cache?.get(channelId);
        if (!channel && guild.channels?.fetch) {
          channel = await guild.channels.fetch(channelId).catch(() => null);
        }

        if (!channel || typeof (channel as any).send !== "function") {
          // Channel is unreachable or deleted
          this.channelCooldowns.set(channelId, Date.now() + CHANNEL_ERROR_COOLDOWN_MS);
          state.queue = [];
          break;
        }

        // 5. Deliver coalesced embeds
        try {
          await (channel as TextChannel | NewsChannel | ThreadChannel).send({ embeds: batch });
          state.lastSentAt = Date.now();
        } catch (err: any) {
          const status = err.status || err.code;

          // A. Handle 429 Too Many Requests cleanly with exponential backoff
          if (status === 429 || err.message?.toLowerCase().includes("rate limit")) {
            const retryAfterMs = typeof err.retryAfter === "number"
              ? err.retryAfter * 1000
              : (err.rawError?.retry_after ? err.rawError.retry_after * 1000 : 3000);

            const backoff = Math.max(retryAfterMs, 2000) + 500;
            logger.warn(`[LOG QUEUE] 429 Rate limit on channel #${channel.name || channelId}. Pausing for ${backoff}ms.`);
            state.pauseUntil = Date.now() + backoff;

            // Re-insert un-sent embeds at the front of the queue with boundary enforcement
            state.queue.unshift(...batch.map((embed) => ({ embed, timestamp: Date.now() })));
            if (state.queue.length > MAX_QUEUE_PER_CHANNEL) {
              state.queue.length = MAX_QUEUE_PER_CHANNEL;
            }
            continue;
          }

          // B. Handle missing access or permissions (50001, 50013, 10003)
          if ([50001, 50013, 10003, 50007].includes(Number(status))) {
            logger.warn(`[LOG QUEUE] Bot lacks access/perms for channel ${channelId} (${err.message}). Cooling down for 5 mins.`);
            this.channelCooldowns.set(channelId, Date.now() + CHANNEL_ERROR_COOLDOWN_MS);
            state.queue = [];
            break;
          }

          // Generic error: log once and continue
          logger.error(`[LOG QUEUE] Failed to dispatch log embeds to #${channel.name || channelId}:`, err.message);
          state.lastSentAt = Date.now();
        }
      }
    } finally {
      state.isProcessing = false;
      if (state.queue.length === 0) {
        // Clean up empty queue state after inactivity
        setTimeout(() => {
          const current = this.channelQueues.get(channelId);
          if (current && current.queue.length === 0 && !current.isProcessing) {
            this.channelQueues.delete(channelId);
          }
        }, 30000);
      }
    }
  }

  /**
   * Sweeper to prevent memory leaks from abandoned queues or dead channels.
   */
  private pruneInactiveQueues(): void {
    const now = Date.now();
    for (const [cId, state] of this.channelQueues.entries()) {
      if (state.queue.length === 0 && !state.isProcessing) {
        this.channelQueues.delete(cId);
      }
    }
    for (const [cId, expireAt] of this.channelCooldowns.entries()) {
      if (now > expireAt) {
        this.channelCooldowns.delete(cId);
      }
    }
  }
}

export const LOG_QUEUE = new LogQueueService();
