import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { addAfkMention, getAfkStatus, removeAfkStatus } from "../db/helpers/afk.js";
import { makeEmbed, COLORS } from "../core/embeds.js";
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

  // 1. Check if the message author was AFK -> welcome them back with mentions summary & jump buttons
  if (!returningUsers.has(authorId)) {
    const authorAfk = await getAfkStatus(authorId, guildId);
    if (authorAfk) {
      returningUsers.add(authorId);
      try {
        const elapsed = Math.floor(now / 1000) - Number(authorAfk.since);
        
        let storedMentions = [];
        try {
          storedMentions = typeof authorAfk.mentions === "string"
            ? JSON.parse(authorAfk.mentions || "[]")
            : (Array.isArray(authorAfk.mentions) ? authorAfk.mentions : []);
        } catch (_) {
          storedMentions = [];
        }

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

        const authorAvatar = typeof message.author?.displayAvatarURL === "function"
          ? message.author.displayAvatarURL({ dynamic: true, size: 256 })
          : undefined;
        const guildName = message.guild?.name || "this server";
        const authorName = message.author?.username || message.author?.tag || "User";

        let description =
          `<@${authorId}>, your AFK status in **${guildName}** has been removed.\n\n` +
          `• **Time Away:** \`${formatDuration(elapsed)}\`\n` +
          `• **Reason:** \`${authorAfk.afk_reason || "AFK"}\``;

        const components = [];
        if (storedMentions.length > 0) {
          description += `\n\n**📬 Mentions Received (${storedMentions.length}):**\n`;
          description += storedMentions
            .slice(0, 5)
            .map((m, idx) => {
              const snippet = m.content ? (m.content.length > 50 ? `${m.content.slice(0, 47)}...` : m.content) : "*Attachment*";
              const timeStr = m.timestamp ? `<t:${m.timestamp}:R>` : "";
              return `\`${idx + 1}.\` <@${m.author_id}> in <#${m.channel_id}>: *"${snippet}"* ${timeStr}`;
            })
            .join("\n");

          if (storedMentions.length > 5) {
            description += `\n*...and ${storedMentions.length - 5} more mention(s)*`;
          }

          // Generate Jump Buttons (up to 5 per action row)
          const buttons = [];
          storedMentions.slice(0, 5).forEach((m, idx) => {
            if (m.message_url) {
              buttons.push(
                new ButtonBuilder()
                  .setLabel(`Jump: #${m.channel_name || idx + 1}`)
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
          level: "SUCCESS",
          color: COLORS.DARK,
          headerDivider: false,
        });

        const reply = await message.reply({
          embeds: [embed],
          components,
          allowedMentions: { repliedUser: false },
        }).catch(() => {});

        // If no mentions, auto-clean after 12 seconds; if mentions, keep longer (45s) so user can use jump buttons
        if (reply) {
          const timeout = storedMentions.length > 0 ? 45000 : 12000;
          setTimeout(() => reply.delete().catch(() => {}), timeout);
        }
      } finally {
        setTimeout(() => returningUsers.delete(authorId), 3000);
      }
    }
  }

  // 2. Check if author mentioned any AFK users -> Record mention, send DM, and send public notice
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

        // A. Record mention in the AFK user's record
        const mentionObj = {
          author_id: message.author.id,
          author_tag: message.author.tag || message.author.username,
          channel_id: message.channel.id,
          channel_name: message.channel.name || "channel",
          content: message.content || "",
          message_url: message.url,
          timestamp: Math.floor(now / 1000),
        };
        await addAfkMention(userId, guildId, mentionObj);

        // B. Send DM to the AFK user
        if (typeof user.send === "function") {
          const currentGuildName = message.guild?.name || "Server";
          const dmEmbed = makeEmbed({
            author: {
              name: `${currentGuildName} • AFK Mention Notification`,
              iconURL: message.guild?.iconURL?.({ dynamic: true }) || undefined,
            },
            title: "You were mentioned while AFK!",
            description:
              `You were mentioned by <@${message.author.id}> in <#${message.channel.id}> on **${currentGuildName}**.\n\n` +
              `• **Author:** <@${message.author.id}> (${message.author.tag || message.author.username || "User"})\n` +
              `• **Channel:** <#${message.channel.id}>\n` +
              `• **Time:** <t:${Math.floor(now / 1000)}:R>\n\n` +
              `**Message Content:**\n> ${message.content?.slice(0, 250) || "*No text content*"}`,
            thumbnail: message.author.displayAvatarURL?.({ dynamic: true, size: 256 }) || undefined,
            level: "INFO",
            color: COLORS.DARK,
            footer: {
              text: `AFK in ${currentGuildName}: ${targetAfk.afk_reason || "AFK"}`,
            },
            headerDivider: false,
          });

          const dmComponents = [];
          if (message.url) {
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
