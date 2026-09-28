import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { ModerationService } from "../../services/index.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("ban")
  .setDescription("Permanently ban a member from the server")
  .addUserOption((opt) => opt.setName("user").setDescription("The target user to ban").setRequired(true))
  .addStringOption((opt) => opt.setName("reason").setDescription("Reason for the ban").setRequired(false));

export default createCommand({
  name: "ban",
  description: "Permanently ban a member from the server",
  category: "Moderation",
  modOnly: true,
  requiredPermission: PermissionFlagsBits.BanMembers,
  slashBuilder,

  async execute(ctx) {
    const { guild, user } = ctx;
    if (!guild) return;

    const targetUserId = ctx.options.user || ctx.options._args?.[0]?.replace(/[<@!>]/g, "");
    const reason = ctx.options.reason || ctx.options._args?.slice(1).join(" ") || "No reason provided";

    if (!targetUserId) {
      return await ctx.reply({ content: "Please specify a valid user to ban.", ephemeral: true });
    }

    if (targetUserId === user.id) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Ban Failed",
            description: `${EMOJIS.get("fail") || "❌"} You cannot ban yourself.`,
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
            title: "Ban Failed",
            description: `${EMOJIS.get("fail") || "❌"} You cannot ban the server owner.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    const targetMember = await guild.members.fetch(targetUserId).catch(() => null);

    // Hierarchy check
    if (targetMember) {
      if (!targetMember.bannable) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Ban Failed",
              description: `${EMOJIS.get("fail") || "❌"} I cannot ban this member. Their role is higher than mine.`,
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
              title: "Ban Failed",
              description: `${EMOJIS.get("fail") || "❌"} You cannot ban a member with an equal or higher role than yourself.`,
              level: "ERROR",
            }),
          ],
          ephemeral: true,
        });
      }
    }

    try {
      await ModerationService.executeBan({
        guild,
        moderator: user,
        targetUser: targetMember || targetUserId,
        reason,
      });
    } catch (err) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Ban Failed",
            description: `${EMOJIS.get("fail") || "❌"} Failed to ban <@${targetUserId}>: ${err?.message || "Discord API error"}.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "Member Banned",
          description: `${EMOJIS.get("ban") || "🔨"} Successfully banned <@${targetUserId}>.\n\n• **Reason:** ${reason}`,
          level: "SUCCESS",
        }),
      ],
    });
  },
});
