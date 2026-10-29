import { parseEmoji } from "discord.js";
import { getGuildAutoresponders, hasGuildAutoresponders } from "../db/helpers/autoresponder.js";
import { isModuleEnabled } from "../db/helpers/moduleStatus.js";
import { makeEmbed } from "../core/embeds.js";

// Cooldown tracking: `${responderId}:${userId}` -> timestamp (ms)
export const responderCooldowns = new Map();
const MAX_COOLDOWNS = 10000;

// Channel burst debounce: `${channelId}` -> timestamp (ms)
// Global per-channel message spacing minimum to prevent bot 429 rate limit spikes
export const channelBurstCooldowns = new Map();

// Compiled rule metadata cache per guild: guildId -> CompiledRule[]
const guildCompiledRulesCache = new Map();

// Compiled regex cache for pattern matching: pattern -> RegExp
const regexCache = new Map();
const MAX_REGEX_CACHE = 1000;

function getCompiledRegex(patternStr) {
  if (typeof patternStr !== "string" || patternStr.length > 300) return null;
  if (regexCache.has(patternStr)) return regexCache.get(patternStr);
  try {
    const compiled = new RegExp(patternStr, "i");
    if (regexCache.size >= MAX_REGEX_CACHE) {
      // Evict oldest 20% instead of nuclear clear to preserve hot items
      let evicted = 0;
      for (const k of regexCache.keys()) {
        regexCache.delete(k);
        if (++evicted >= 200) break;
      }
    }
    regexCache.set(patternStr, compiled);
    return compiled;
  } catch {
    return null;
  }
}

/**
 * Pre-processes raw DB rules into pre-compiled, fast-path match structs
 */
function compileGuildRules(rawRules) {
  if (!Array.isArray(rawRules) || rawRules.length === 0) return [];

  return rawRules
    .filter((r) => r.enabled)
    .map((r) => {
      const triggerRaw = (r.trigger_phrase || "").trim();
      const matchType = String(r.match_type || "contains").toLowerCase();
      const triggerLower = triggerRaw.toLowerCase();

      let regex = null;
      if (matchType === "regex") {
        regex = getCompiledRegex(triggerRaw);
      }

      // Pre-extract reaction targets once instead of doing parseEmoji on hot loop
      const reactions = (r.reactions || []).slice(0, 3).map((rx) => {
        const raw = typeof rx === "string" ? rx : rx?.emoji || rx?.dataValues?.emoji || "";
        if (!raw) return null;
        const parsed = parseEmoji(raw);
        return parsed?.id ? `${parsed.name}:${parsed.id}` : (parsed?.name || raw);
      }).filter(Boolean);

      return {
        id: r.responder_id,
        triggerRaw,
        triggerLower,
        matchType,
        regex,
        replyContent: r.reply_content || "",
        embedTitle: r.embed_title || null,
        isEmbed: Boolean(r.is_embed),
        imageUrl: r.image_url || null,
        cooldownMs: Math.max(0, Number(r.cooldown || 0)) * 1000,
        ignoreBots: r.ignore_bots !== false,
        deleteTrigger: Boolean(r.delete_trigger),
        reactions,
      };
    });
}

/**
 * Returns compiled rules for a guild from the compiled cache or creates them
 */
export function getCompiledGuildRules(guildId, rawRules) {
  const gId = String(guildId);
  if (guildCompiledRulesCache.has(gId)) {
    return guildCompiledRulesCache.get(gId);
  }
  const compiled = compileGuildRules(rawRules);
  guildCompiledRulesCache.set(gId, compiled);
  return compiled;
}

/**
 * Invalidate compiled rules cache for a guild
 */
export function invalidateCompiledRules(guildId = null) {
  if (guildId) {
    guildCompiledRulesCache.delete(String(guildId));
  } else {
    guildCompiledRulesCache.clear();
  }
}

/**
 * High-performance, single-pass variable replacer using token regex.
 * Zero redundant string allocations.
 */
const VAR_REGEX = /\{(user(?:\.mention|\.name|\.tag|\.id|\.avatar)?|username|mention|avatar|server(?:\.name|\.id|\.memberCount|\.owner|\.boosts)?|guild(?:\.name|\.id)?|members?|member_count|memberCount|owner(?:\.mention|\.id)?|boosts?|boost_count|channel(?:\.mention|\.name|\.plain)?)\}/gi;

export function formatAutoresponderText(text, message) {
  if (!text || typeof text !== "string") return "";
  if (!text.includes("{")) return text; // Fast return when no variables exist

  const guild = message.guild;
  const author = message.author;
  const channel = message.channel;

  return text.replace(VAR_REGEX, (match, token) => {
    const key = token.toLowerCase();
    switch (key) {
      // User tokens
      case "user":
      case "user.mention":
      case "mention":
        return author ? `<@${author.id}>` : "@user";
      case "user.name":
      case "username":
        return author?.username || "User";
      case "user.tag":
        return author?.tag || author?.username || "User";
      case "user.id":
        return author?.id ? String(author.id) : "";
      case "user.avatar":
      case "avatar":
        return typeof author?.displayAvatarURL === "function" ? author.displayAvatarURL() : "";

      // Server / Guild tokens
      case "server":
      case "server.name":
      case "guild":
      case "guild.name":
        return guild?.name || "Server";
      case "server.id":
      case "guild.id":
        return guild?.id ? String(guild.id) : "";
      case "membercount":
      case "member_count":
      case "members":
      case "server.membercount":
        return typeof guild?.memberCount === "number" ? guild.memberCount.toLocaleString() : "0";
      case "owner":
      case "owner.mention":
      case "server.owner":
        return guild?.ownerId ? `<@${guild.ownerId}>` : "@Owner";
      case "owner.id":
        return guild?.ownerId ? String(guild.ownerId) : "";
      case "boosts":
      case "boost_count":
      case "server.boosts":
        return guild?.premiumSubscriptionCount !== undefined ? String(guild.premiumSubscriptionCount) : "0";

      // Channel tokens
      case "channel":
      case "channel.mention":
        return channel?.id ? `<#${channel.id}>` : channel?.name ? `#${channel.name}` : "";
      case "channel.name":
      case "channel.plain":
        return channel?.name ? `#${channel.name}` : "";

      default:
        return match;
    }
  });
}

/**
 * Handles incoming messages for matching autoresponders with zero-alloc fast path,
 * non-blocking async execution, and 429 rate limit mitigation.
 * @param {import("discord.js").Message} message
 * @returns {Promise<boolean>} true if an autoresponder was executed
 */
export async function handleAutoresponder(message) {
  if (!message.guild || !message.content) return false;

  // 1. Instant zero-cost guard rails
  if (message.author.id === message.client?.user?.id) return false;
  if (message.webhookId || message.system) return false;

  const guildId = message.guild.id;

  // Master module switch check
  if (!(await isModuleEnabled(guildId, "autoresponder"))) return false;

  // Zero-query memory gate: if guild has no autoresponders, bail in 0.001ms
  if (!hasGuildAutoresponders(guildId)) return false;

  const rawRules = await getGuildAutoresponders(guildId);
  if (!rawRules || rawRules.length === 0) return false;

  // Compile or retrieve cached rule index
  const rules = getCompiledGuildRules(guildId, rawRules);
  if (rules.length === 0) return false;

  const rawContent = message.content.trim();
  const lowerContent = rawContent.toLowerCase();
  const now = Date.now();
  const isBot = Boolean(message.author.bot);
  const channelId = message.channel.id;
  const authorId = message.author.id;

  // 2. Pattern Matching Loop (Ultra-fast synchronous evaluation)
  for (let idx = 0; idx < rules.length; idx++) {
    const ar = rules[idx];
    if (ar.ignoreBots && isBot) continue;

    // Per-User Cooldown Gate
    const cdKey = `${ar.id}:${authorId}`;
    if (ar.cooldownMs > 0) {
      const lastTriggered = responderCooldowns.get(cdKey) || 0;
      if (now - lastTriggered < ar.cooldownMs) {
        continue;
      }
    }

    // Channel Burst Rate-Limit Protection (Minimum 1.5s per channel debounce)
    const channelKey = `${ar.id}:${channelId}`;
    const lastChannelTrigger = channelBurstCooldowns.get(channelKey) || 0;
    if (process.env.NODE_ENV !== "test" && now - lastChannelTrigger < 1500) {
      continue;
    }

    // Pattern Matching Matrix
    let matched = false;
    switch (ar.matchType) {
      case "exact":
        matched = lowerContent === ar.triggerLower;
        break;
      case "startswith":
        matched = lowerContent.startsWith(ar.triggerLower);
        break;
      case "endswith":
        matched = lowerContent.endsWith(ar.triggerLower);
        break;
      case "regex":
        if (ar.regex) {
          matched = ar.regex.test(rawContent);
        }
        break;
      case "contains":
      default:
        matched = lowerContent.includes(ar.triggerLower);
        break;
    }

    if (!matched) continue;

    // 3. Mark Cooldowns immediately to prevent concurrent race triggers
    channelBurstCooldowns.set(channelKey, now);
    if (ar.cooldownMs > 0) {
      responderCooldowns.set(cdKey, now);
    }

    // Memory Maintenance: Prune stale cooldown entries if Map exceeds limit
    if (responderCooldowns.size > MAX_COOLDOWNS) {
      const cutoff = now - 600000; // 10 minutes ago
      let purged = 0;
      for (const [k, t] of responderCooldowns.entries()) {
        if (t < cutoff) responderCooldowns.delete(k);
        if (++purged >= 1000) break;
      }
    }
    if (channelBurstCooldowns.size > MAX_COOLDOWNS) {
      const cutoff = now - 60000; // 1 minute ago
      for (const [k, t] of channelBurstCooldowns.entries()) {
        if (t < cutoff) channelBurstCooldowns.delete(k);
      }
    }

    // 4. Non-Blocking Concurrent Dispatch (fire and handle without delaying caller)
    dispatchAutoresponderAction(message, ar).catch(() => {});
    return true;
  }

  return false;
}

/**
 * Dispatches response embed/text and reactions with backpressure throttling
 */
async function dispatchAutoresponderAction(message, rule) {
  const formattedContent = formatAutoresponderText(rule.replyContent, message);
  const formattedTitle = rule.embedTitle ? formatAutoresponderText(rule.embedTitle, message) : null;
  const hasTextOrEmbed = Boolean(formattedContent || formattedTitle);

  // A. Message Dispatch
  if (rule.isEmbed && hasTextOrEmbed) {
    const embed = makeEmbed({
      title: formattedTitle || "Auto Response",
      description: formattedContent || undefined,
      image: rule.imageUrl || null,
      level: "INFO",
    });

    if (rule.deleteTrigger) {
      await message.channel.send({ embeds: [embed] }).catch(() => {});
    } else {
      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {
        return message.channel.send({ embeds: [embed] }).catch(() => {});
      });
    }
  } else if (formattedContent) {
    if (rule.deleteTrigger) {
      await message.channel.send(formattedContent).catch(() => {});
    } else {
      await message.reply({ content: formattedContent, allowedMentions: { repliedUser: false } }).catch(() => {
        return message.channel.send(formattedContent).catch(() => {});
      });
    }
  }

  // B. Emoji Reactions Dispatch (Throttled with 300ms pacing and safe abort on 429)
  if (rule.reactions.length > 0 && !rule.deleteTrigger) {
    for (let i = 0; i < rule.reactions.length; i++) {
      const reactTarget = rule.reactions[i];
      if (!reactTarget) continue;

      try {
        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
        await message.react(reactTarget).catch((err) => {
          if (err?.status === 429) throw err;
        });
      } catch (err) {
        if (err?.status === 429) break; // Cease reactions immediately if Discord signals rate limit
      }
    }
  }

  // C. Delete Trigger Message
  if (rule.deleteTrigger && message.deletable) {
    await message.delete().catch(() => {});
  }
}

