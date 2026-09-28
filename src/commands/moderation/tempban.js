import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed, COLORS } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { getTempbanConfig } from "../../db/helpers/tempban.js";
import { executeTempban, parseDuration, formatDuration } from "../../services/tempbanService.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("tempban")
  .setDescription("Temporarily restrict a member using an isolation role.")
  .addUserOption((opt) => opt.setName("user").setDescription("The target member").setRequired(true))
  .addStringOption((opt) => opt.setName("duration").setDescription("Duration (e.g. 10m, 1h, 1d)").setRequired(false))
  .addStringOption((opt) => opt.setName("reason").setDescription("Reason for the tempban").setRequired(false));

export default createCommand({
  name: "tempban",
  description: "Temporarily restrict a member using an isolation role.",
  category: "Moderation",
  aliases: ["tb", "jail"],
  modOnly: true,
  requiredPermission: PermissionFlagsBits.ManageRoles,
  slashBuilder,

  async execute(ctx) {
    const { guild, user: moderator, member: modMember } = ctx;
    if (!guild) return;

    const config = await getTempbanConfig(guild.id);
    const isolationRoleId = config?.role_id ? String(config.role_id) : null;
    const isolationRole = isolationRoleId ? guild.roles.cache.get(isolationRoleId) : null;

    if (!isolationRole) {
      const dashboardUrl = process.env.DASHBOARD_URL || "https://digitalvigital.com/dashboard";
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Configuration Missing",
            description: `${EMOJIS.get("fail") || "❌"} The Tempban Isolation Role has not been configured.\n\n` +
                         `Administrators must configure this module from the **[Web Dashboard](${dashboardUrl}/${guild.id})** before it can be used.`,
            level: "ERROR",
            color: COLORS.ERROR,
          }),
        ],
        ephemeral: true,
      });
    }

    let targetUserId = ctx.options.user;
    if (!targetUserId && !ctx.isInteraction) {
      const rawUser = ctx.options._args?.[0];
      if (rawUser) targetUserId = rawUser.replace(/[<@!>]/g, "");
    }

    if (!targetUserId) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Missing Argument",
            description: "Please specify a valid user.\nUsage: `/tempban <user> [duration] [reason]`",
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    const targetMember = await guild.members.fetch(targetUserId).catch(() => null);
    if (!targetMember) {
      return await ctx.reply({
        embeds: [makeEmbed({ title: "Not Found", description: "Member not found in this server.", level: "ERROR" })],
        ephemeral: true,
      });
    }

    const botMember = guild.members.me;
    if (targetMember.id === moderator.id) return await ctx.reply({ embeds: [makeEmbed({ title: "Error", description: "You cannot tempban yourself.", level: "ERROR" })], ephemeral: true });
    if (targetMember.user.bot) return await ctx.reply({ embeds: [makeEmbed({ title: "Error", description: "You cannot tempban bots.", level: "ERROR" })], ephemeral: true });
    if (targetMember.id === guild.ownerId) return await ctx.reply({ embeds: [makeEmbed({ title: "Error", description: "You cannot tempban the server owner.", level: "ERROR" })], ephemeral: true });
    
    if (guild.ownerId !== moderator.id && targetMember.roles.highest.position >= modMember.roles.highest.position) {
      return await ctx.reply({ embeds: [makeEmbed({ title: "Permission Denied", description: "Target has an equal or higher role than you.", level: "ERROR" })], ephemeral: true });
    }
    if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
      return await ctx.reply({ embeds: [makeEmbed({ title: "Hierarchy Error", description: "I cannot manage this user due to role hierarchy.", level: "ERROR" })], ephemeral: true });
    }
    if (isolationRole.position >= botMember.roles.highest.position) {
      return await ctx.reply({ embeds: [makeEmbed({ title: "Configuration Error", description: "The isolation role is higher than my highest role. I cannot assign it.", level: "ERROR" })], ephemeral: true });
    }

    let rawDuration = ctx.options.duration;
    let reason = ctx.options.reason;

    if (!ctx.isInteraction) {
      rawDuration = ctx.options._args?.[1];
      reason = ctx.options._args?.slice(2).join(" ");
    }

    rawDuration = rawDuration || "10m";
    const durationSeconds = parseDuration(rawDuration) || parseDuration("10m");
    const reasonStr = reason || "No reason provided";

    await ctx.defer({ ephemeral: false });

    const result = await executeTempban({
      guild,
      moderator,
      targetMember,
      durationSeconds,
      reason: reasonStr,
    });

    if (result.success) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "User Tempbanned",
            description: `${EMOJIS.get("ban") || "🔨"} ${targetMember} isolated successfully.\n\n` +
                         `${EMOJIS.get("arrow_point") || "➡️"} **Duration:** ${result.formattedTime}\n` +
                         `${EMOJIS.get("arrow_point") || "➡️"} **Reason:** ${reasonStr}`,
            level: "SUCCESS",
          })
        ]
      });
    } else {
      return await ctx.reply({
        embeds: [makeEmbed({ title: "Execution Error", description: "Failed to apply tempban isolation.", level: "ERROR" })]
      });
    }
  },
});
