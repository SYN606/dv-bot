import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { ModerationService } from "../../services/index.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("kick")
  .setDescription("Kick a member from the server")
  .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
  .setDMPermission(false)
  .addUserOption((opt) => opt.setName("user").setDescription("The target member to kick").setRequired(true))
  .addStringOption((opt) => opt.setName("reason").setDescription("Reason for kicking").setRequired(false));

export default createCommand({
  name: "kick",
  description: "Kick a member from the server",
  category: "Moderation",
  aliases: ["k"],
  usage: "<user> [reason]",
  examples: [
    "/kick user:@User reason:Inactivity",
    "dvkick @User Disrespectful behavior",
  ],
  modOnly: true,
  requiredPermission: PermissionFlagsBits.KickMembers,
  slashBuilder,

  async execute(ctx) {
    const { guild, user } = ctx;
    if (!guild) return;

    const rawTarget = ctx.options.user || ctx.options._args?.[0];
    const targetUserId = rawTarget ? String(rawTarget).match(/\d{17,20}/)?.[0] : null;
    const reason = ctx.options.reason || (ctx.options._args && ctx.options._args.length > 1 ? ctx.options._args.slice(1).join(" ") : null) || "No reason provided";

    if (!targetUserId) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Invalid Target",
            description: `${EMOJIS.get("fail") || "❌"} Please specify a valid member mention or 17-20 digit user ID to kick.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
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

    if (targetUserId === ctx.client.user.id) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Kick Failed",
            description: `${EMOJIS.get("fail") || "❌"} You cannot kick me.`,
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

    // Check bot permissions
    const botMember = guild.members.me || (await guild.members.fetchMe().catch(() => null));
    if (!botMember?.permissions.has(PermissionFlagsBits.KickMembers)) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Missing Bot Permissions",
            description: `${EMOJIS.get("fail") || "❌"} I lack the required **Kick Members** permission in this server.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    await ctx.defer({ ephemeral: false });

    const targetMember = await guild.members.fetch(targetUserId).catch(() => null);
    if (!targetMember) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Member Not Found",
            description: `${EMOJIS.get("fail") || "❌"} Member <@${targetUserId}> was not found in this server.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    if (!targetMember.kickable) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Kick Failed",
            description: `${EMOJIS.get("fail") || "❌"} I cannot kick this member. Their role is equal to or higher than my highest role.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    const modMember = ctx.member?.roles?.highest ? ctx.member : (await guild.members.fetch(user.id).catch(() => null));
    const modHighest = modMember?.roles?.highest?.position ?? 0;

    if (guild.ownerId !== user.id && targetMember.roles.highest.position >= modHighest) {
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

    try {
      await ModerationService.executeKick({
        guild,
        moderator: user,
        targetMember,
        reason,
      });
    } catch (err: any) {
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
