import { getAfkStatus, removeAfkStatus } from "../db/helpers/afk.js";
import { makeEmbed } from "../core/embeds.js";
import { EMOJIS } from "../core/emojis.js";

// Cache for mention notification cooldowns: `${guildId}:${targetUserId}:${channelId}` -> timestamp (ms)
const afkMentionCooldown = new Map();
const MENTION_COOLDOWN_MS = 30000; // 30s cooldown per target user per channel

// In-flight locks for returning users to prevent duplicate welcome embeds on rapid message bursts
const returningUsers = new Set();

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${mins % 60}m`;
  if (mins > 0) return `${mins}m`;
  return `${Math.floor(seconds)}s`;
}

export async function handleAfk(message) {
  if (!message.guild || message.author.bot) return;

  const guildId = message.guild.id;
  const authorId = message.author.id;
  const now = Date.now();

  // 1. Check if the message author was AFK -> welcome them back
  if (!returningUsers.has(authorId)) {
    const authorAfk = await getAfkStatus(authorId, guildId);
    if (authorAfk) {
      returningUsers.add(authorId);
      try {
        const elapsed = Math.floor(now / 1000) - Number(authorAfk.since);
        await removeAfkStatus(authorId, guildId);

        // Restore original nickname with permission & hierarchy checks
        const botMember = message.guild.members?.me || message.guild.me;
        if (
          authorAfk.original_nickname &&
          message.member &&
          message.guild.ownerId !== authorId &&
          botMember?.permissions?.has("ManageNicknames") &&
          botMember.roles?.highest?.position > message.member.roles?.highest?.position
        ) {
          await message.member.setNickname(authorAfk.original_nickname).catch(() => {});
        }

        const embed = makeEmbed({
          title: "Welcome Back!",
          description: `${EMOJIS.get("welcome") || "👋"} <@${authorId}>, your AFK status has been removed. You were away for **${formatDuration(elapsed)}**.`,
          level: "INFO",
        });

        const reply = await message.reply({
          embeds: [embed],
          allowedMentions: { repliedUser: false },
        }).catch(() => {});

        if (reply) {
          setTimeout(() => reply.delete().catch(() => {}), 8000);
        }
      } finally {
        setTimeout(() => returningUsers.delete(authorId), 3000);
      }
    }
  }

  // 2. Check if author mentioned any AFK users (Aggregated & Rate-Limit Protected)
  if (message.mentions.users && message.mentions.users.size > 0) {
    const afkMentions = [];

    for (const [userId, user] of message.mentions.users) {
      if (user.bot || userId === authorId) continue;

      const cdKey = `${guildId}:${userId}:${message.channel.id}`;
      const lastMentioned = afkMentionCooldown.get(cdKey) || 0;
      if (now - lastMentioned < MENTION_COOLDOWN_MS) continue;

      const targetAfk = await getAfkStatus(userId, guildId);
      if (targetAfk) {
        afkMentionCooldown.set(cdKey, now);
        const elapsed = Math.floor(now / 1000) - Number(targetAfk.since);
        afkMentions.push({
          userId,
          reason: targetAfk.afk_reason || "AFK",
          duration: formatDuration(elapsed),
        });
      }
    }

    // Clean up old mention cooldowns if map exceeds size
    if (afkMentionCooldown.size > 2000) {
      const cutoff = now - MENTION_COOLDOWN_MS;
      for (const [k, t] of afkMentionCooldown.entries()) {
        if (t < cutoff) afkMentionCooldown.delete(k);
      }
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
