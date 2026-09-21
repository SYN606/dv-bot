import { getAfkStatus, removeAfkStatus } from "../db/helpers/afk.js";
import { makeEmbed } from "../core/embeds.js";
import { EMOJIS } from "../core/emojis.js";

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

  // 1. Check if the message author was AFK -> welcome them back
  const authorAfk = await getAfkStatus(authorId, guildId);
  if (authorAfk) {
    const elapsed = Math.floor(Date.now() / 1000) - Number(authorAfk.since);
    await removeAfkStatus(authorId, guildId);

    // Restore original nickname if possible
    if (authorAfk.original_nickname && message.member && message.guild.members.me?.permissions.has("ManageNicknames")) {
      await message.member.setNickname(authorAfk.original_nickname).catch(() => {});
    }

    const embed = makeEmbed({
      title: "Welcome Back!",
      description: `${EMOJIS.get("welcome") || "👋"} <@${authorId}>, your AFK status has been removed. You were away for **${formatDuration(elapsed)}**.`,
      level: "INFO",
    });

    const reply = await message.reply({ embeds: [embed] }).catch(() => {});
    if (reply) {
      setTimeout(() => reply.delete().catch(() => {}), 8000);
    }
  }

  // 2. Check if author mentioned any AFK users
  if (message.mentions.users.size > 0) {
    for (const [userId, user] of message.mentions.users) {
      if (user.bot || userId === authorId) continue;

      const targetAfk = await getAfkStatus(userId, guildId);
      if (targetAfk) {
        const elapsed = Math.floor(Date.now() / 1000) - Number(targetAfk.since);
        const embed = makeEmbed({
          title: "User is AFK",
          description: `${EMOJIS.get("arrow_point") || "👉"} <@${userId}> is currently AFK: **${targetAfk.afk_reason}**\n\n*Went AFK ${formatDuration(elapsed)} ago.*`,
          level: "WARNING",
        });

        const reply = await message.reply({ embeds: [embed] }).catch(() => {});
        if (reply) {
          setTimeout(() => reply.delete().catch(() => {}), 10000);
        }
      }
    }
  }
}
