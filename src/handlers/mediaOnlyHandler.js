import { getMediaOnlyChannel, updateMediaStickyMessageId } from "../db/helpers/mediaOnly.js";
import { makeEmbed } from "../core/embeds.js";
import { EMOJIS } from "../core/emojis.js";
import { sendModLog } from "../utils/modLog.js";
import { dispatchStickyNotice } from "../utils/webhookManager.js";

// Prefix commands bypass media deletion
const COMMAND_PREFIXES = ["!", ".", "/", "dv "];

const STICKY_FOOTER_TAG = "MEDIA_ONLY_STICKY_NOTICE";

// Regex for media URLs and hosted providers (Tenor, Giphy, Imgur, Streamable)
const IMAGE_LINK_REGEX = /https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp)\b|https?:\/\/(?:www\.)?(?:tenor|giphy|imgur)\.com\/\S+/i;
const MEDIA_LINK_REGEX = /https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp|mp4|mov|webm)\b|https?:\/\/(?:www\.)?(?:tenor|giphy|imgur)\.com\/\S+/i;
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp"];

// In-memory violation tracking: key "${guildId}:${userId}" -> count
export const mediaViolationCounter = new Map();

// Mod log throttle cache: key "${guildId}:${userId}" -> timestamp (ms)
const modLogThrottle = new Map();
const MOD_LOG_COOLDOWN_MS = 30000;

// Warning message throttle to prevent 429 on spam: key "${guildId}:${userId}:${channelId}" -> timestamp (ms)
const warningThrottle = new Map();
const WARNING_COOLDOWN_MS = 8000;

/**
 * Decays user violations after 5 minutes (300 seconds)
 */
function scheduleViolationDecay(guildId, userId) {
  const key = `${guildId}:${userId}`;
  setTimeout(() => {
    const current = mediaViolationCounter.get(key) || 0;
    if (current <= 1) {
      mediaViolationCounter.delete(key);
      modLogThrottle.delete(key);
    } else {
      mediaViolationCounter.set(key, current - 1);
    }
  }, 300000);
}

/**
 * Checks if a message contains valid media according to channel config
 */
export function isValidMedia(message, imageOnly = false) {
  // 1. Native attachments check
  const attachments = message.attachments;
  const count = attachments
    ? typeof attachments.size === "number"
      ? attachments.size
      : attachments.length || 0
    : 0;

  if (count > 0) {
    const list = Array.isArray(attachments)
      ? attachments
      : Array.from(attachments.values ? attachments.values() : []);

    if (imageOnly) {
      return list.some((att) => {
        const ct = (att.contentType || "").toLowerCase();
        const name = (att.name || "").toLowerCase();
        return ct.startsWith("image/") || IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext));
      });
    }
    return true;
  }

  // 2. Link check in message text
  const targetRegex = imageOnly ? IMAGE_LINK_REGEX : MEDIA_LINK_REGEX;
  if (message.content && targetRegex.test(message.content)) {
    return true;
  }

  // 3. Rendered Discord embeds check (e.g. image/video embeds)
  if (message.embeds && message.embeds.length > 0) {
    return message.embeds.some((emb) => {
      if (emb.type === "image" || emb.image || emb.thumbnail) return true;
      if (!imageOnly && (emb.type === "video" || emb.type === "gifv" || emb.video)) return true;
      return false;
    });
  }

  return false;
}

export function buildMediaStickyEmbed(config) {
  return makeEmbed({
    title: "Media-Only Channel",
    description: config.image_only
      ? `${EMOJIS.get("announcement") || "📢"} This channel is configured for **images only**.\n\n• Text messages without media attachments will be removed automatically.`
      : `${EMOJIS.get("announcement") || "📢"} This channel is configured for **media only**.\n\n• Images, videos, GIFs, and media links are allowed.\n• Non-media messages will be removed automatically.`,
    level: "SYSTEM",
    footer: STICKY_FOOTER_TAG,
  });
}

/**
 * Refreshes sticky notice via Webhooks (bypassing bot rate limits).
 * Deletes the previous notice and posts a fresh copy at the bottom of the channel.
 */
async function refreshMediaSticky(channel, config) {
  if (!config.sticky_message_id) return;

  const embed = buildMediaStickyEmbed(config);
  const newId = await dispatchStickyNotice({
    channel,
    embed,
    lastMessageId: config.sticky_message_id,
    minCooldownMs: 2000,
  });

  if (newId && newId !== String(config.sticky_message_id)) {
    config.sticky_message_id = String(newId);
    await updateMediaStickyMessageId(channel.guild.id, channel.id, newId).catch(() => {});
  }
}

/**
 * Enforces media-only restrictions on incoming messages
 * @param {import("discord.js").Message} message
 * @returns {Promise<boolean>} true if message was deleted/handled as non-media violation
 */
export async function handleMediaOnly(message) {
  if (!message.guild) return false;

  // Ignore DV-BOT's own messages
  if (message.author.id === message.client?.user?.id) return false;

  const channelConfig = await getMediaOnlyChannel(message.guild.id, message.channel.id);
  if (!channelConfig) return false;

  // 1. Dynamic Bypasses
  // NSFW bypass
  if (channelConfig.nsfw_bypass && message.channel.nsfw) {
    return false;
  }

  // Whitelist role bypass
  if (channelConfig.whitelist_role_id) {
    const member = message.member || await message.guild.members?.fetch(message.author.id).catch(() => null);
    if (member?.roles?.cache?.has(String(channelConfig.whitelist_role_id))) {
      return false;
    }
  }

  // Prefix commands bypass so commands aren't deleted in media channels
  if (message.content && COMMAND_PREFIXES.some((prefix) => message.content.startsWith(prefix))) {
    return false;
  }

  const imageOnly = Boolean(channelConfig.image_only);
  const mediaValid = isValidMedia(message, imageOnly);

  // 2. Bot handling
  if (message.author.bot) {
    if (!mediaValid && message.deletable) {
      await message.delete().catch(() => {});
    }
    return false;
  }

  // 3. Valid Media Passthrough
  if (mediaValid) {
    if (channelConfig.sticky_message_id) {
      refreshMediaSticky(message.channel, channelConfig).catch(() => {});
    }
    return false;
  }

  // 4. Violation Removal Processing
  if (message.deletable) {
    await message.delete().catch(() => {});
  }

  // 5. Track Infraction Aggregation
  const key = `${message.guild.id}:${message.author.id}`;
  const violations = (mediaViolationCounter.get(key) || 0) + 1;
  mediaViolationCounter.set(key, violations);
  scheduleViolationDecay(message.guild.id, message.author.id);

  // 6. 3-Strike Disciplinary Timeout
  let timeoutApplied = false;
  if (channelConfig.auto_mute && violations >= 3) {
    const member = message.member || await message.guild.members?.fetch(message.author.id).catch(() => null);
    if (member?.timeout && typeof member.timeout === "function") {
      try {
        await member.timeout(60 * 1000, "Media-only channel layout violations");
        timeoutApplied = true;
      } catch {
        // Higher role or missing permission
      }
    }
  }

  // 7. Throttled Mod Logging
  const now = Date.now();
  const lastLogged = modLogThrottle.get(key) || 0;
  const shouldLog = (now - lastLogged >= MOD_LOG_COOLDOWN_MS) || (violations === 3);

  if (shouldLog) {
    modLogThrottle.set(key, now);
    sendModLog({
      guild: message.guild,
      category: "MEDIA",
      title: "Media-Only Violation",
      description: `**User:** <@${message.author.id}>\n**Channel:** ${message.channel}\n**Violations:** ${violations}${timeoutApplied ? " *(Timed out 60s)*" : ""}`,
      level: "WARNING",
      actor: message.author,
    }).catch(() => {});
  }

  // 8. Ephemeral User Warning (throttled to avoid 429 when user spams multiple lines)
  const warnKey = `${message.guild.id}:${message.author.id}:${message.channel.id}`;
  const lastWarn = warningThrottle.get(warnKey) || 0;
  if (now - lastWarn >= WARNING_COOLDOWN_MS) {
    warningThrottle.set(warnKey, now);

    const warning = makeEmbed({
      title: "Media-Only Channel",
      description: `${EMOJIS.get("warning") || "⚠️"} <@${message.author.id}>, ${
        imageOnly ? "only images" : "only media (images, videos, GIFs)"
      } are allowed in ${message.channel}.\n\n• Violations: **${violations}/3**${
        timeoutApplied ? "\n• **Action:** You have been temporarily muted for 60 seconds." : ""
      }`,
      level: "WARNING",
    });

    const reply = await message.channel.send({ embeds: [warning] }).catch(() => null);
    if (reply) {
      setTimeout(() => reply.delete().catch(() => {}), 5000);
    }
  }

  return true;
}
