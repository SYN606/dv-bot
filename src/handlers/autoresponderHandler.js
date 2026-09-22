import { parseEmoji } from "discord.js";
import { getGuildAutoresponders } from "../db/helpers/autoresponder.js";
import { makeEmbed } from "../core/embeds.js";

// Cooldown tracking: `${responderId}:${userId}` -> timestamp (seconds)
export const responderCooldowns = new Map();
const MAX_COOLDOWNS = 5000;

// Channel burst debounce to prevent 429 spam: `${responderId}:${channelId}` -> timestamp (seconds)
export const channelBurstCooldowns = new Map();

// ReDoS prevention & compiled RegExp cache
const regexCache = new Map();
const MAX_REGEX_CACHE = 500;

function getCompiledRegex(patternStr) {
  if (typeof patternStr !== "string" || patternStr.length > 250) return null;
  if (regexCache.has(patternStr)) return regexCache.get(patternStr);
  try {
    const compiled = new RegExp(patternStr, "i");
    if (regexCache.size >= MAX_REGEX_CACHE) {
      regexCache.clear();
    }
    regexCache.set(patternStr, compiled);
    return compiled;
  } catch {
    return null;
  }
}

/**
 * Replaces rich template variables within autoresponder response messages
 */
export function formatAutoresponderText(text, message) {
  if (!text || typeof text !== "string") return "";

  const guild = message.guild;
  const author = message.author;
  const channel = message.channel;

  const serverName = guild?.name || "Server";
  const serverId = guild?.id ? String(guild.id) : "";
  const memberCount = typeof guild?.memberCount === "number"
    ? guild.memberCount.toLocaleString()
    : "0";
  const ownerId = guild?.ownerId ? String(guild.ownerId) : "";
  const ownerMention = ownerId ? `<@${ownerId}>` : "@Owner";
  const boosts = guild?.premiumSubscriptionCount !== undefined ? String(guild.premiumSubscriptionCount) : "0";

  const userMention = author ? `<@${author.id}>` : "@user";
  const userName = author?.username || "User";
  const userTag = author?.tag || author?.username || "User";
  const userId = author?.id ? String(author.id) : "";
  const userAvatar = typeof author?.displayAvatarURL === "function" ? author.displayAvatarURL() : "";

  const channelMention = channel?.id ? `<#${channel.id}>` : (channel?.name ? `#${channel.name}` : "");
  const channelName = channel?.name ? `#${channel.name}` : "";

  const replacements = [
    // User variables
    [/\{user\.mention\}|\{user\}|\{mention\}/gi, userMention],
    [/\{user\.name\}|\{username\}/gi, userName],
    [/\{user\.tag\}/gi, userTag],
    [/\{user\.id\}/gi, userId],
    [/\{user\.avatar\}|\{avatar\}/gi, userAvatar],

    // Server variables
    [/\{server\.name\}|\{guild\.name\}|\{server\}|\{guild\}/gi, serverName],
    [/\{server\.id\}|\{guild\.id\}/gi, serverId],
    [/\{memberCount\}|\{member_count\}|\{server\.memberCount\}|\{members\}/gi, memberCount],
    [/\{owner\.mention\}|\{owner\.id\}|\{owner\}|\{server\.owner\}/gi, ownerMention],
    [/\{boosts\}|\{boost_count\}|\{server\.boosts\}/gi, boosts],

    // Channel variables
    [/\{channel\.mention\}|\{channel\}/gi, channelMention],
    [/\{channel\.name\}|\{channel\.plain\}/gi, channelName],
  ];

  let result = text;
  for (const [pattern, val] of replacements) {
    result = result.replace(pattern, val);
  }

  return result;
}

/**
 * Handles incoming messages for matching autoresponders
 * @param {import("discord.js").Message} message
 * @returns {Promise<boolean>} true if an autoresponder was executed
 */
export async function handleAutoresponder(message) {
  if (!message.guild || !message.content) return false;

  // Prevent bot feedback loops & webhook triggering
  if (message.author.id === message.client?.user?.id) return false;
  if (message.webhookId || message.system) return false;

  const responders = await getGuildAutoresponders(message.guild.id);
  if (!responders || responders.length === 0) return false;

  const rawContent = message.content.trim();
  const lowerContent = rawContent.toLowerCase();

  for (const ar of responders) {
    if (!ar.enabled) continue;
    if (ar.ignore_bots && message.author.bot) continue;

    const cdKey = `${ar.responder_id}:${message.author.id}`;
    const now = Date.now() / 1000;

    // 1. Cooldown Gate
    if (ar.cooldown > 0) {
      const lastTriggered = responderCooldowns.get(cdKey) || 0;
      if (now - lastTriggered < ar.cooldown) {
        continue;
      }
    }

    // Channel burst protection (minimum 2s cooldown per rule per channel to prevent 429)
    const channelKey = `${ar.responder_id}:${message.channel.id}`;
    const lastChannelTrigger = channelBurstCooldowns.get(channelKey) || 0;
    if (process.env.NODE_ENV !== "test" && now - lastChannelTrigger < 2) {
      continue;
    }

    const triggerRaw = (ar.trigger_phrase || "").trim();
    const triggerLower = triggerRaw.toLowerCase();
    let matched = false;

    // 2. Pattern Matching Matrix
    switch (ar.match_type) {
      case "exact":
        matched = lowerContent === triggerLower;
        break;
      case "startswith":
        matched = lowerContent.startsWith(triggerLower);
        break;
      case "endswith":
        matched = lowerContent.endsWith(triggerLower);
        break;
      case "regex": {
        const regex = getCompiledRegex(triggerRaw);
        if (regex) {
          matched = regex.test(rawContent);
        }
        break;
      }
      case "contains":
      default:
        matched = lowerContent.includes(triggerLower);
        break;
    }

    if (!matched) continue;

    // 3. Consume Cooldowns Upon Confirmed Match
    channelBurstCooldowns.set(channelKey, now);

    if (ar.cooldown > 0) {
      responderCooldowns.set(cdKey, now);

      // Memory maintenance: prune aged entries if cache grows large
      if (responderCooldowns.size >= MAX_COOLDOWNS) {
        const cutoff = now - 300;
        for (const [k, t] of responderCooldowns.entries()) {
          if (t < cutoff) responderCooldowns.delete(k);
        }
      }
    }

    const formattedContent = formatAutoresponderText(ar.reply_content, message);
    const formattedTitle = ar.embed_title ? formatAutoresponderText(ar.embed_title, message) : null;
    const hasTextOrEmbed = Boolean(formattedContent || formattedTitle);

    // 4. Dispatch Response (Embed or Text)
    if (ar.is_embed && hasTextOrEmbed) {
      const embed = makeEmbed({
        title: formattedTitle || "Auto Response",
        description: formattedContent || undefined,
        image: ar.image_url || null,
        level: "INFO",
      });

      if (ar.delete_trigger) {
        await message.channel.send({ embeds: [embed] }).catch(() => {});
      } else {
        await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {
          return message.channel.send({ embeds: [embed] }).catch(() => {});
        });
      }
    } else if (formattedContent) {
      if (ar.delete_trigger) {
        await message.channel.send(formattedContent).catch(() => {});
      } else {
        await message.reply({ content: formattedContent, allowedMentions: { repliedUser: false } }).catch(() => {
          return message.channel.send(formattedContent).catch(() => {});
        });
      }
    }

    // 5. Dispatch Reactions (Throttled with 250ms spacing to prevent 429 rate limit)
    const reactions = (ar.reactions || []).slice(0, 3);
    if (reactions.length > 0 && !ar.delete_trigger) {
      for (let i = 0; i < reactions.length; i++) {
        const r = reactions[i];
        const rawEmoji = typeof r === "string" ? r : (r?.emoji || r?.dataValues?.emoji || "");
        if (!rawEmoji) continue;

        try {
          if (i > 0) {
            await new Promise((resolve) => setTimeout(resolve, 250));
          }

          const parsed = parseEmoji(rawEmoji);
          const reactTarget = parsed?.id || parsed?.name || rawEmoji;
          await message.react(reactTarget).catch((err) => {
            if (err?.status === 429) throw err;
          });
        } catch (err) {
          if (err?.status === 429) break; // Break from loop on rate limit
        }
      }
    }

    // 6. Delete Trigger Message If Configured
    if (ar.delete_trigger && message.deletable) {
      await message.delete().catch(() => {});
    }

    return true;
  }

  return false;
}
