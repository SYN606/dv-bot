import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { addAfkMention, getAfkStatus, isUserAfkQuick, removeAfkStatus } from "../db/helpers/afk.js";
import { makeEmbed, COLORS } from "../core/embeds.js";
import { EMOJIS } from "../core/emojis.js";
import { CONFIG } from "../config.js";

// In-flight locks for returning users: `${guildId}:${userId}` -> expiresAt timestamp (ms)
const returningUserLocks = new Map();
const RETURN_LOCK_TTL_MS = 5000;

// Mention notification cooldowns per channel: `${guildId}:${targetUserId}:${channelId}` -> timestamp (ms)
const afkMentionCooldown = new Map();
const MENTION_COOLDOWN_MS = 30000; // 30s per target user per channel

// Direct Message cooldown per user: `${guildId}:${targetUserId}` -> timestamp (ms)
const afkDmCooldown = new Map();
const DM_COOLDOWN_MS = 60000; // 60s per target user to prevent Discord DM 429 rate limit errors

export function clearAfkHandlerState() {
  returningUserLocks.clear();
  afkMentionCooldown.clear();
  afkDmCooldown.clear();
}

function pruneOldLocks(now) {
  if (returningUserLocks.size > 500) {
    for (const [k, expires] of returningUserLocks.entries()) {
      if (now > expires) returningUserLocks.delete(k);
    }
  }
  if (afkMentionCooldown.size > 1000) {
    const cutoff = now - MENTION_COOLDOWN_MS;
    for (const [k, t] of afkMentionCooldown.entries()) {
      if (t < cutoff) afkMentionCooldown.delete(k);
    }
  }
  if (afkDmCooldown.size > 1000) {
    const cutoff = now - DM_COOLDOWN_MS;
    for (const [k, t] of afkDmCooldown.entries()) {
      if (t < cutoff) afkDmCooldown.delete(k);
    }
  }
}

function formatDuration(seconds) {
  const safeSec = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safeSec / 60);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${mins % 60}m`;
  if (mins > 0) return `${mins}m`;
  return `${safeSec}s`;
}

async function sendAfkDmNotification(user, targetAfk, message, now) {
  if (typeof user.send !== "function") return;
  const currentGuildName = message.guild?.name || "Server";
  const authorTag = message.author.tag || message.author.username || "User";
  const contentSnippet = message.content ? message.content.slice(0, 250).replace(/[`\r\n]+/g, " ") : "*No text content*";
  const safeReason = (targetAfk.afk_reason || "AFK").replace(/[`\r\n]+/g, " ").slice(0, 150);

  const dmEmbed = makeEmbed({
    author: {
      name: `${currentGuildName} • AFK Mention Notification`,
      iconURL: message.guild?.iconURL?.({ dynamic: true }) || undefined,
    },
    title: "You were mentioned while AFK!",
    description:
      `You were mentioned by <@${message.author.id}> in <#${message.channel.id}> on **${currentGuildName}**.\n\n` +
      `• **Author:** <@${message.author.id}> (${authorTag})\n` +
      `• **Channel:** <#${message.channel.id}>\n` +
      `• **Time:** <t:${Math.floor(now / 1000)}:R>\n\n` +
      `**Message Content:**\n> ${contentSnippet}`,
    thumbnail: message.author.displayAvatarURL?.({ dynamic: true, size: 256 }) || undefined,
    image: CONFIG.MENTION_GIF_URL || null,
    level: "INFO",
    color: COLORS.DARK,
    footer: {
      text: `AFK in ${currentGuildName}: ${safeReason}`,
    },
    headerDivider: false,
  });

  const dmComponents = [];
  if (message.url && (message.url.startsWith("https://") || message.url.startsWith("http://"))) {
    dmComponents.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Jump to Message")
          .setStyle(ButtonStyle.Link)
          .setURL(message.url)
      )
    );
  }

  await user.send({ embeds: [dmEmbed], components: dmComponents }).catch(() => {});
}

async function processAuthorReturn(message, authorAfk, elapsed) {
  const guildId = message.guild.id;
  const authorId = message.author.id;

  let storedMentions = [];
  try {
    storedMentions = typeof authorAfk.mentions === "string"
      ? JSON.parse(authorAfk.mentions || "[]")
      : (Array.isArray(authorAfk.mentions) ? authorAfk.mentions : []);
  } catch (_) {
    storedMentions = [];
  }

  // Remove AFK status from DB and cache
  await removeAfkStatus(authorId, guildId);

  // Restore nickname safely with permission, hierarchy, and owner checks
  const botMember = message.guild.members?.me || message.guild.me;
  const canManageNick =
    message.member &&
    message.guild.ownerId !== authorId &&
    botMember?.permissions?.has("ManageNicknames") &&
    (!botMember.roles?.highest || !message.member.roles?.highest || botMember.roles.highest.position > message.member.roles.highest.position);

  if (canManageNick) {
    const currentNick = message.member.nickname || message.member.displayName;
    if (currentNick && currentNick.startsWith("[AFK]")) {
      // If original_nickname was null/empty (no custom nickname), setNickname(null) restores normal username
      const targetNick = authorAfk.original_nickname || null;
      await message.member.setNickname(targetNick).catch(() => {});
    }
  }

  const authorAvatar = typeof message.author?.displayAvatarURL === "function"
    ? message.author.displayAvatarURL({ dynamic: true, size: 256 })
    : undefined;
  const guildName = message.guild?.name || "this server";
  const authorName = message.author?.username || message.author?.tag || "User";
  const safeReason = (authorAfk.afk_reason || "AFK").replace(/[`\r\n]+/g, " ").slice(0, 200);

  let description =
    `<@${authorId}>, your AFK status in **${guildName}** has been removed.\n\n` +
    `• **Time Away:** \`${formatDuration(elapsed)}\`\n` +
    `• **Reason:** \`${safeReason}\``;

  const components = [];
  if (storedMentions.length > 0) {
    description += `\n\n**📬 Mentions Received (${storedMentions.length}):**\n`;
    description += storedMentions
      .slice(0, 5)
      .map((m, idx) => {
        const cleanContent = m.content ? m.content.replace(/\r?\n+/g, " ").trim() : "*Attachment*";
        const snippet = cleanContent.length > 50 ? `${cleanContent.slice(0, 47)}...` : cleanContent;
        const timeStr = m.timestamp ? `<t:${m.timestamp}:R>` : "";
        return `\`${idx + 1}.\` <@${m.author_id}> in <#${m.channel_id}>: *"${snippet}"* ${timeStr}`;
      })
      .join("\n");

    if (storedMentions.length > 5) {
      description += `\n*...and ${storedMentions.length - 5} more mention(s)*`;
    }

    // Generate Jump Buttons (up to 5 per action row, button label max 80 chars)
    const buttons = [];
    storedMentions.slice(0, 5).forEach((m, idx) => {
      if (m.message_url && (m.message_url.startsWith("https://") || m.message_url.startsWith("http://"))) {
        const rawChannelName = m.channel_name || `${idx + 1}`;
        const buttonLabel = `Jump: #${rawChannelName}`.slice(0, 80);
        buttons.push(
          new ButtonBuilder()
            .setLabel(buttonLabel)
            .setStyle(ButtonStyle.Link)
            .setURL(m.message_url)
        );
      }
    });

    if (buttons.length > 0) {
      components.push(new ActionRowBuilder().addComponents(buttons));
    }
  } else {
    description += `\n\n*You received no mentions while you were away.*`;
  }

  const embed = makeEmbed({
    author: {
      name: "Welcome Back!",
      iconURL: authorAvatar,
    },
    title: `${authorName} is no longer AFK`,
    description,
    thumbnail: authorAvatar,
    image: CONFIG.AFK_IMAGE_URL || null,
    level: "SUCCESS",
    color: COLORS.DARK,
    headerDivider: false,
  });

  const reply = await message.reply({
    embeds: [embed],
    components,
    allowedMentions: { repliedUser: false },
  }).catch(() => {});

  if (reply) {
    const timeout = storedMentions.length > 0 ? 45000 : 12000;
    setTimeout(() => reply.delete().catch(() => {}), timeout);
  }
}

export async function handleAfk(message, { skipAuthorReturn = false } = {}) {
  if (!message.guild || message.author.bot) return;

  const guildId = message.guild.id;
  const authorId = message.author.id;
  const now = Date.now();

  pruneOldLocks(now);

  // 1. Check if the message author was AFK -> welcome them back with mentions summary & jump buttons
  const returnLockKey = `${guildId}:${authorId}`;
  const lockExpires = returningUserLocks.get(returnLockKey) || 0;

  if (!skipAuthorReturn && now > lockExpires) {
    // Fast path: check in-memory cache first to avoid async DB delay
    if (isUserAfkQuick(authorId, guildId)) {
      // Acquire in-flight lock immediately to eliminate race conditions on rapid message bursts
      returningUserLocks.set(returnLockKey, now + RETURN_LOCK_TTL_MS);

      const authorAfk = await getAfkStatus(authorId, guildId);
      if (authorAfk) {
        const elapsed = Math.floor(now / 1000) - Number(authorAfk.since);

        // 5-second grace period: ignore messages sent right after going AFK
        if (elapsed < 5) {
          returningUserLocks.delete(returnLockKey);
        } else {
          await processAuthorReturn(message, authorAfk, elapsed);
        }
      } else {
        returningUserLocks.delete(returnLockKey);
      }
    }
  }

  // 2. Check if author mentioned any AFK users -> Record mention, send DM, and send public notice
  if (message.mentions.users && message.mentions.users.size > 0) {
    const afkMentions = [];
    const backgroundTasks = [];

    for (const [userId, user] of message.mentions.users) {
      if (user.bot || userId === authorId) continue;

      const cdKey = `${guildId}:${userId}:${message.channel.id}`;
      const lastMentioned = afkMentionCooldown.get(cdKey) || 0;
      if (now - lastMentioned < MENTION_COOLDOWN_MS) continue;

      const targetAfk = await getAfkStatus(userId, guildId);
      if (targetAfk) {
        afkMentionCooldown.set(cdKey, now);
        const elapsed = Math.floor(now / 1000) - Number(targetAfk.since);
        const safeReason = (targetAfk.afk_reason || "AFK").replace(/[`\r\n]+/g, " ").slice(0, 200);

        afkMentions.push({
          userId,
          reason: safeReason,
          duration: formatDuration(elapsed),
        });

        // Record mention object in the AFK user's record
        const mentionObj = {
          author_id: message.author.id,
          author_tag: message.author.tag || message.author.username,
          channel_id: message.channel.id,
          channel_name: message.channel.name || "channel",
          content: (message.content || "").slice(0, 300),
          message_url: message.url,
          timestamp: Math.floor(now / 1000),
        };

        // A. Queue DB mention write
        backgroundTasks.push(addAfkMention(userId, guildId, mentionObj));

        // B. Send DM with 60s per-user rate limit protection to prevent Discord 429 DM floods
        const dmCdKey = `${guildId}:${userId}`;
        const lastDmSent = afkDmCooldown.get(dmCdKey) || 0;
        if (now - lastDmSent >= DM_COOLDOWN_MS) {
          afkDmCooldown.set(dmCdKey, now);
          backgroundTasks.push(sendAfkDmNotification(user, targetAfk, message, now));
        }
      }
    }

    // Run background DB operations and DM requests concurrently without blocking the public channel reply
    if (backgroundTasks.length > 0) {
      Promise.allSettled(backgroundTasks).catch(() => {});
    }

    if (afkMentions.length > 0) {
      const description = afkMentions.length === 1
        ? `${EMOJIS.get("arrow_point") || "👉"} <@${afkMentions[0].userId}> is currently AFK: **${afkMentions[0].reason}**\n\n*Went AFK ${afkMentions[0].duration} ago.*`
        : afkMentions
            .map(
              (m) =>
                `• <@${m.userId}>: **${m.reason}** *(AFK for ${m.duration})*`
            )
            .join("\n");

      const embed = makeEmbed({
        title: afkMentions.length === 1 ? "User is AFK" : "AFK Members Mentioned",
        description,
        level: "WARNING",
        color: COLORS.DARK,
        headerDivider: false,
      });

      const reply = await message.reply({
        embeds: [embed],
        allowedMentions: { repliedUser: false },
      }).catch(() => {});

      if (reply) {
        setTimeout(() => reply.delete().catch(() => {}), 10000);
      }
    }
  }
}
