import { PermissionFlagsBits, PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { ModerationService } from "../../services/index.js";
import { isBotAdmin } from "../../core/permissions.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("ban")
  .setDescription("Permanently ban a member from the server")
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
  .setDMPermission(false)
  .addUserOption((opt) => opt.setName("user").setDescription("The target user to ban").setRequired(true))
  .addStringOption((opt) => opt.setName("reason").setDescription("Reason for the ban").setRequired(false))
  .addStringOption((opt) =>
    opt
      .setName("delete_messages")
      .setDescription("Delete message history from this user")
      .setRequired(false)
      .addChoices(
        { name: "Don't Delete Any", value: "0" },
        { name: "Previous 1 Hour", value: "3600" },
        { name: "Previous 6 Hours", value: "21600" },
        { name: "Previous 24 Hours", value: "86400" },
        { name: "Previous 7 Days", value: "604800" }
      )
  );

export default createCommand({
  name: "ban",
  description: "Permanently ban a member from the server",
  category: "Moderation",
  usage: "<user> [reason]",
  examples: [
    "/ban user:@User reason:Rule violation",
    "/ban user:@Spammer delete_messages:Previous 24 Hours reason:Raiding",
    "dvban @User Spamming in chat",
  ],
  modOnly: true,
  requiredPermission: PermissionFlagsBits.BanMembers,
  slashBuilder,

  async execute(ctx) {
    const { guild, user } = ctx;
    if (!guild) return;

    const modPerms =
      ctx.member?.permissions instanceof PermissionsBitField
        ? ctx.member.permissions
        : new PermissionsBitField(BigInt(ctx.member?.permissions || 0));

    const canBan =
      guild.ownerId === user.id ||
      modPerms.has(PermissionFlagsBits.Administrator) ||
      modPerms.has(PermissionFlagsBits.BanMembers) ||
      (await isBotAdmin(ctx));

    if (!canBan) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Permission Denied",
            description: `${EMOJIS.get("fail") || "❌"} You require the **Ban Members** or **Administrator** permission to use this command.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    const rawTarget = ctx.options.user || ctx.options._args?.[0];
    const targetUserId = rawTarget ? String(rawTarget).match(/\d{17,20}/)?.[0] : null;
    const reason = ctx.options.reason || (ctx.options._args && ctx.options._args.length > 1 ? ctx.options._args.slice(1).join(" ") : null) || "No reason provided";
    const deleteMessageSeconds = parseInt(ctx.options.delete_messages || "0", 10) || 0;

    if (!targetUserId) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Invalid Target",
            description: `${EMOJIS.get("fail") || "❌"} Please specify a valid user mention or 17-20 digit user ID to ban.`,
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
            title: "Ban Failed",
            description: `${EMOJIS.get("fail") || "❌"} You cannot ban yourself.`,
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
            title: "Ban Failed",
            description: `${EMOJIS.get("fail") || "❌"} You cannot ban me.`,
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

    // Check bot permissions
    const botMember = guild.members.me || (await guild.members.fetchMe().catch(() => null));
    if (!botMember?.permissions.has(PermissionFlagsBits.BanMembers)) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Missing Bot Permissions",
            description: `${EMOJIS.get("fail") || "❌"} I lack the required **Ban Members** permission in this server.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    // Fast-path: check cache first to avoid unnecessary Discord REST API latency
    const targetMember = guild.members.cache.get(targetUserId) || (await guild.members.fetch(targetUserId).catch(() => null));

    // Hierarchy check if user is a member of this guild (runs before deferral for instant, truly ephemeral rejection)
    if (targetMember) {
      if (!targetMember.bannable) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Ban Failed",
              description: `${EMOJIS.get("fail") || "❌"} I cannot ban this member. Their role is equal to or higher than my highest role.`,
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
              title: "Ban Failed",
              description: `${EMOJIS.get("fail") || "❌"} You cannot ban a member with an equal or higher role than yourself.`,
              level: "ERROR",
            }),
          ],
          ephemeral: true,
        });
      }
    }

    // Safety timeout: only defer if Discord API takes longer than 2s to respond, preventing interaction expiration
    const deferTimer = setTimeout(() => {
      ctx.defer({ ephemeral: false }).catch(() => {});
    }, 2000);

    try {
      await ModerationService.executeBan({
        guild,
        moderator: user,
        targetUser: targetMember || targetUserId,
        reason,
        deleteMessageSeconds,
      });
    } catch (err: any) {
      clearTimeout(deferTimer);
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
    } finally {
      clearTimeout(deferTimer);
    }

    let purgeNotice = "";
    if (deleteMessageSeconds > 0) {
      const hours = Math.round(deleteMessageSeconds / 3600);
      purgeNotice = `\n• **Purged Messages:** Past ${hours >= 24 ? `${Math.round(hours / 24)} day(s)` : `${hours} hour(s)`}`;
    }

    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "Member Banned",
          description: `${EMOJIS.get("ban") || "🔨"} Successfully banned <@${targetUserId}>.\n\n• **Reason:** ${reason}${purgeNotice}`,
          level: "SUCCESS",
        }),
      ],
    });
  },
});
