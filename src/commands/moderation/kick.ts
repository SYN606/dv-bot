import { PermissionFlagsBits, PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { ModerationService } from "../../services/index.js";
import { isBotAdmin } from "../../core/permissions.js";

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

    const modPerms =
      ctx.member?.permissions instanceof PermissionsBitField
        ? ctx.member.permissions
        : new PermissionsBitField(BigInt(ctx.member?.permissions || 0));

    const canKick =
      guild.ownerId === user.id ||
      modPerms.has(PermissionFlagsBits.Administrator) ||
      modPerms.has(PermissionFlagsBits.KickMembers) ||
      (await isBotAdmin(ctx));

    if (!canKick) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Permission Denied",
            description: `${EMOJIS.get("fail") || "❌"} You require the **Kick Members** or **Administrator** permission to use this command.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

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

    // Fast-path: check cache first to avoid unnecessary Discord REST API latency
    const targetMember = guild.members.cache.get(targetUserId) || (await guild.members.fetch(targetUserId).catch(() => null));
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

    // Hierarchy checks run before deferral for instant, truly ephemeral rejection
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

    const modMember = ctx.member?.roles?.highest ? ctx.member : (guild.members.cache.get(user.id) || (await guild.members.fetch(user.id).catch(() => null)));
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

    // Safety timeout: only defer if Discord API takes longer than 2s to respond, preventing interaction expiration
    const deferTimer = setTimeout(() => {
      ctx.defer({ ephemeral: false }).catch(() => {});
    }, 2000);

    try {
      await ModerationService.executeKick({
        guild,
        moderator: user,
        targetMember,
        reason,
      });
    } catch (err: any) {
      clearTimeout(deferTimer);
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
    } finally {
      clearTimeout(deferTimer);
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
