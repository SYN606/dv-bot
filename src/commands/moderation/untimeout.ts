import { PermissionFlagsBits, PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { ModerationService } from "../../services/index.js";
import { isBotAdmin } from "../../core/permissions.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("untimeout")
  .setDescription("Remove timeout/mute from a member")
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .setDMPermission(false)
  .addUserOption((opt) =>
    opt.setName("user").setDescription("The target member to remove timeout from").setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName("reason").setDescription("Reason for removing timeout").setRequired(false)
  );

export default createCommand({
  name: "untimeout",
  description: "Remove timeout/mute from a member",
  category: "Moderation",
  aliases: ["unmute", "unto"],
  usage: "<user> [reason]",
  examples: [
    "/untimeout user:@User reason:Appeal approved",
    "dvuntimeout @User Appeal accepted",
    "dvunmute @User Apologized in DMs",
    "dv unto @User",
  ],
  modOnly: true,
  requiredPermission: PermissionFlagsBits.ModerateMembers,
  slashBuilder,

  async execute(ctx) {
    const { guild, user } = ctx;
    if (!guild) return;

    const modPerms =
      ctx.member?.permissions instanceof PermissionsBitField
        ? ctx.member.permissions
        : new PermissionsBitField(BigInt(ctx.member?.permissions || 0));

    const canTimeout =
      guild.ownerId === user.id ||
      modPerms.has(PermissionFlagsBits.Administrator) ||
      modPerms.has(PermissionFlagsBits.ModerateMembers) ||
      (await isBotAdmin(ctx));

    if (!canTimeout) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Permission Denied",
            description: `${EMOJIS.get("fail") || "❌"} You require the **Moderate Members** (Timeout) or **Administrator** permission to use this command.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    // Resolve target from slash option, arguments, or message reply
    let rawTarget = ctx.options.user || ctx.options._args?.[0];
    if (!rawTarget && ctx.message?.reference?.messageId) {
      const refMsg = await ctx.message.channel.messages.fetch(ctx.message.reference.messageId).catch(() => null);
      if (refMsg?.author) rawTarget = refMsg.author.id;
    }

    const targetUserId = rawTarget ? String(rawTarget).match(/\d{17,20}/)?.[0] : null;

    if (!targetUserId) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Invalid Target",
            description: `${EMOJIS.get("fail") || "❌"} Please specify a valid member mention or 17-20 digit user ID to untimeout.\n\n**Usage:** \`${ctx.prefix}untimeout <user> [reason]\``,
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
            title: "Untimeout Failed",
            description: `${EMOJIS.get("fail") || "❌"} You cannot untimeout yourself.`,
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
            title: "Untimeout Failed",
            description: `${EMOJIS.get("fail") || "❌"} I cannot be timed out or untimed out.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    // Check bot permissions
    const botMember = guild.members.me || (await guild.members.fetchMe().catch(() => null));
    if (!botMember?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Missing Bot Permissions",
            description: `${EMOJIS.get("fail") || "❌"} I lack the required **Timeout Members** (Moderate Members) permission in this server.`,
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

    // Check if target is currently timed out
    if (!targetMember.isCommunicationDisabled()) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Not Timed Out",
            description: `${EMOJIS.get("info") || "ℹ️"} <@${targetUserId}> is not currently timed out.`,
            level: "INFO",
          }),
        ],
        ephemeral: true,
      });
    }

    // Hierarchy checks
    if (!targetMember.moderatable) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Untimeout Failed",
            description: `${EMOJIS.get("fail") || "❌"} I cannot remove timeout from this member. Their role is equal to or higher than my highest role.`,
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
            title: "Untimeout Failed",
            description: `${EMOJIS.get("fail") || "❌"} You cannot untimeout a member with an equal or higher role than yourself.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    let reason = "No reason provided";
    if (ctx.isInteraction) {
      if (ctx.options.reason) reason = ctx.options.reason;
    } else {
      const args = ctx.options._args || [];
      if (args.length > 1) {
        reason = args.slice(1).join(" ");
      }
    }

    try {
      await ModerationService.executeUntimeout({
        guild,
        moderator: user,
        targetMember,
        reason,
      });
    } catch (err: any) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Untimeout Failed",
            description: `${EMOJIS.get("fail") || "❌"} Failed to remove timeout from <@${targetUserId}>: ${err?.message || "Discord API error"}.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "Timeout Removed",
          description: `${EMOJIS.get("success") || "✅"} Successfully removed timeout from <@${targetUserId}>.\n\n• **Reason:** ${reason}`,
          level: "SUCCESS",
        }),
      ],
    });
  },
});
