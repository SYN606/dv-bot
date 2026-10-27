import { PermissionFlagsBits } from "discord.js";

const WEBHOOK_NAME = "DV Sticky Manager";
const MAX_WEBHOOK_CACHE_SIZE = 500;
const webhookCache = new Map(); // channelId -> Webhook
const channelLocks = new Map(); // channelId -> Promise lock
const channelCooldowns = new Map(); // channelId -> timestamp
const pendingTrailingTimers = new Map(); // channelId -> Timeout

export function invalidateWebhookCache(channelId) {
  webhookCache.delete(String(channelId));
}

export function cancelStickyTrailingTimer(channelId) {
  const cId = String(channelId);
  if (pendingTrailingTimers.has(cId)) {
    clearTimeout(pendingTrailingTimers.get(cId));
    pendingTrailingTimers.delete(cId);
  }
}

/**
 * Retrieves an existing sticky webhook or creates a new one for the channel.
 * Gracefully returns null if bot lacks ManageWebhooks permission.
 */
export async function getOrCreateStickyWebhook(channel, name = WEBHOOK_NAME) {
  if (!channel || !channel.guild) return null;
  const channelId = String(channel.id);

  if (webhookCache.has(channelId)) {
    return webhookCache.get(channelId);
  }

  const botMember = channel.guild.members?.me || channel.guild.me;
  if (!botMember) return null;

  // Check ManageWebhooks permission
  const permissions = channel.permissionsFor(botMember);
  if (!permissions || !permissions.has(PermissionFlagsBits.ManageWebhooks)) {
    return null;
  }

  try {
    const webhooks = await channel.fetchWebhooks().catch(() => null);
    if (webhooks && webhooks.size > 0) {
      const existing = webhooks.find(
        (wh) => wh.name === name && wh.owner?.id === botMember.id
      );
      if (existing) {
        webhookCache.set(channelId, existing);
        return existing;
      }
    }

    // Create new webhook
    const botUser = botMember.user;
    const avatarUrl = typeof botUser?.displayAvatarURL === "function"
      ? botUser.displayAvatarURL({ extension: "png", size: 128 })
      : null;

    const created = await channel.createWebhook({
      name,
      avatar: avatarUrl || undefined,
      reason: "Automated sticky messages and system notifications manager",
    });

    if (webhookCache.size >= MAX_WEBHOOK_CACHE_SIZE) {
      const oldestKey = webhookCache.keys().next().value;
      if (oldestKey) webhookCache.delete(oldestKey);
    }

    webhookCache.set(channelId, created);
    return created;
  } catch (err) {
    if (err?.code !== 50013) {
      console.warn(`[WEBHOOK SETUP WARNING] Channel #${channel.name}:`, err?.message || err);
    }
    return null;
  }
}

/**
 * Cleanly deletes a previous sticky message via webhook or channel API.
 */
export async function deletePreviousSticky(webhook, channel, messageId) {
  if (!messageId) return;
  const msgId = String(messageId).trim();
  if (!msgId) return;

  // 1. Try deleting through Webhook if available
  if (webhook && typeof webhook.deleteMessage === "function") {
    try {
      await webhook.deleteMessage(msgId);
      return;
    } catch (err) {
      if (err?.status === 404) return; // Already deleted
      if (err?.status === 429) {
        console.warn(`[WEBHOOK 429] Rate limited deleting message in #${channel.name}`);
      }
      // Otherwise fall through to channel.messages
    }
  }

  // 2. Fallback to channel.messages.fetch -> delete
  if (channel && typeof channel.messages?.fetch === "function") {
    try {
      const msg = await channel.messages.fetch(msgId).catch(() => null);
      if (msg && typeof msg.delete === "function") {
        await msg.delete().catch(() => {});
      }
    } catch {}
  }
}

/**
 * Dispatches a sticky notice to the channel using Webhooks (bypassing bot global route 429s)
 * with robust fallback to standard channel.send.
 * Includes per-channel async mutex to guarantee zero race-condition duplicates,
 * and a trailing debounce timer to prevent sticky messages getting buried during rapid chat.
 *
 * @param {Object} options
 */
export async function dispatchStickyNotice({
  channel,
  embed,
  content = "",
  lastMessageId = null,
  minCooldownMs = 3000,
  force = false,
  onDispatched = null,
}) {
  if (!channel || !channel.guild) return null;
  const channelId = String(channel.id);

  // Per-channel mutex lock to prevent concurrent race conditions
  let releaseLock;
  const lockPromise = new Promise((resolve) => {
    releaseLock = resolve;
  });

  const prevLock = channelLocks.get(channelId);
  channelLocks.set(channelId, lockPromise);

  if (prevLock) {
    try {
      await prevLock;
    } catch {}
  }

  try {
    // Cooldown check (unless forced)
    const now = Date.now();
    const lastExec = channelCooldowns.get(channelId) || 0;
    if (!force && now - lastExec < minCooldownMs) {
      // Cooldown active: ensure trailing re-post timer is running so sticky isn't left buried
      if (!pendingTrailingTimers.has(channelId)) {
        const remainingMs = Math.max(150, minCooldownMs - (now - lastExec) + 200);
        const timer = setTimeout(async () => {
          pendingTrailingTimers.delete(channelId);
          try {
            // Check if sticky message is still needed at bottom
            if (channel.lastMessageId && String(channel.lastMessageId) === String(lastMessageId)) {
              return;
            }
            const trailingNewId = await dispatchStickyNotice({
              channel,
              embed,
              content,
              lastMessageId,
              minCooldownMs,
              force: true,
              onDispatched,
            });
            if (onDispatched && trailingNewId && trailingNewId !== lastMessageId) {
              await onDispatched(trailingNewId);
            }
          } catch (err) {
            console.warn(`[STICKY TRAILING REPOST WARNING] #${channel.name}:`, err?.message || err);
          }
        }, remainingMs);

        if (timer.unref) timer.unref();
        pendingTrailingTimers.set(channelId, timer);
      }
      return lastMessageId;
    }

    if (pendingTrailingTimers.has(channelId)) {
      clearTimeout(pendingTrailingTimers.get(channelId));
      pendingTrailingTimers.delete(channelId);
    }

    channelCooldowns.set(channelId, Date.now());

    // Check if the last message in the channel is ALREADY the sticky message
    if (lastMessageId && channel.lastMessageId === String(lastMessageId)) {
      return lastMessageId;
    }

    const botMember = channel.guild.members?.me || channel.guild.me;
    const webhook = await getOrCreateStickyWebhook(channel);

    // 1. Delete previous sticky message
    if (lastMessageId) {
      await deletePreviousSticky(webhook, channel, lastMessageId);
    }

    // 2. Dispatch new notice via Webhook if available
    if (webhook) {
      try {
        const botUser = botMember?.user;
        const sent = await webhook.send({
          content: content || undefined,
          embeds: embed ? [embed] : undefined,
          username: botMember?.displayName || botUser?.username || "Sticky Notice",
          avatarURL: botUser?.displayAvatarURL
            ? botUser.displayAvatarURL({ extension: "png", size: 128 })
            : undefined,
          allowedMentions: { parse: [] },
          wait: true,
        });

        if (sent?.id) {
          const sentId = String(sent.id);
          if (onDispatched) {
            await onDispatched(sentId);
          }
          return sentId;
        }
      } catch (err) {
        if (err?.status === 404) {
          invalidateWebhookCache(channelId);
        } else if (err?.status === 429) {
          console.warn(`[WEBHOOK 429] Rate limit hit on webhook dispatch in #${channel.name}`);
        }
        // Fall through to channel.send
      }
    }

    // 3. Fallback to standard channel.send if webhook not possible
    if (typeof channel.send === "function") {
      try {
        const sent = await channel.send({
          content: content || undefined,
          embeds: embed ? [embed] : undefined,
          allowedMentions: { parse: [] },
        });
        if (sent?.id) {
          const sentId = String(sent.id);
          if (onDispatched) {
            await onDispatched(sentId);
          }
          return sentId;
        }
      } catch (err) {
        console.warn(`[STICKY DISPATCH FAILED] Channel #${channel.name}:`, err?.message || err);
      }
    }

    return lastMessageId;
  } finally {
    releaseLock();
    if (channelLocks.get(channelId) === lockPromise) {
      channelLocks.delete(channelId);
    }
  }
}
