import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { PunishmentRecord } from "../../db/models/index.js";
import { sendModLog } from "../../utils/modLog.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("kick")
  .setDescription("Kick a member from the server")
  .addUserOption((opt) => opt.setName("user").setDescription("The target member to kick").setRequired(true))
  .addStringOption((opt) => opt.setName("reason").setDescription("Reason for kicking").setRequired(false));

export default createCommand({
  name: "kick",
  description: "Kick a member from the server",
  category: "Moderation",
  modOnly: true,
  requiredPermission: PermissionFlagsBits.KickMembers,
  slashBuilder,

  async execute(ctx) {
    const { guild, user } = ctx;
    if (!guild) return;

    const targetUserId = ctx.options.user || ctx.options._args?.[0]?.replace(/[<@!>]/g, "");
    const reason = ctx.options.reason || ctx.options._args?.slice(1).join(" ") || "No reason provided";

    if (!targetUserId) {
      return await ctx.reply({ content: "Please specify a valid member to kick.", ephemeral: true });
    }

    if (targetUserId === user.id) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Kick Failed",
            description: `${EMOJIS.get("fail") || "❌"} You cannot kick yourself.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    if (targetUserId === guild.ownerId) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Kick Failed",
            description: `${EMOJIS.get("fail") || "❌"} You cannot kick the server owner.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    const targetMember = await guild.members.fetch(targetUserId).catch(() => null);
    if (!targetMember) {
      return await ctx.reply({ content: "Member not found in this server.", ephemeral: true });
    }

    if (!targetMember.kickable) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Kick Failed",
            description: `${EMOJIS.get("fail") || "❌"} I cannot kick this member. Their role is higher than mine.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    if (ctx.member && targetMember.roles.highest.position >= ctx.member.roles.highest.position && guild.ownerId !== user.id) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Kick Failed",
            description: `${EMOJIS.get("fail") || "❌"} You cannot kick a member with an equal or higher role than yourself.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    // Try sending DM notice prior to kicking
    await targetMember.send({
      embeds: [
        makeEmbed({
          title: "You Were Kicked",
          description: `You have been kicked from **${guild.name}**.\n\n• **Moderator:** <@${user.id}>\n• **Reason:** ${reason}`,
          level: "WARNING",
        }),
      ],
    }).catch(() => {});

    try {
      await targetMember.kick(reason);
    } catch (err) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Kick Failed",
            description: `${EMOJIS.get("fail") || "❌"} Failed to kick <@${targetUserId}>: ${err?.message || "Discord API error"}.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    await PunishmentRecord.create({
      guild_id: String(guild.id),
      user_id: String(targetUserId),
      moderator_id: String(user.id),
      action_type: "kick",
      reason,
    }).catch(() => {});

    await sendModLog({
      guild,
      category: "MODERATION",
      title: "Member Kicked",
      description: `User <@${targetUserId}> was kicked by <@${user.id}>.\n\n• **Reason:** ${reason}`,
      level: "WARNING",
      actor: user,
    });

    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "Member Kicked",
          description: `${EMOJIS.get("kick") || "👢"} Successfully kicked <@${targetUserId}>.\n\n• **Reason:** ${reason}`,
          level: "SUCCESS",
        }),
      ],
    });
  },
});
