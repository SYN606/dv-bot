import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed, COLORS } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { getTempbanConfig, isTempbanned } from "../../db/helpers/tempban.js";
import { liftTempban } from "../../services/tempbanService.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("untempban")
  .setDescription("Lifts an active tempban/jail isolation role from a user.")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .setDMPermission(false)
  .addUserOption((opt) => opt.setName("user").setDescription("The target member").setRequired(true))
  .addStringOption((opt) => opt.setName("reason").setDescription("Reason for the early lift").setRequired(false));

export default createCommand({
  name: "untempban",
  description: "Lifts an active tempban/jail isolation role from a user.",
  category: "Moderation",
  aliases: ["untb", "unjail"],
  usage: "<user> [reason]",
  examples: [
    "/untempban user:@User reason:Appeal granted",
    "dvuntempban @User",
  ],
  modOnly: true,
  requiredPermission: PermissionFlagsBits.ManageRoles,
  slashBuilder,

  async execute(ctx) {
    const { guild, user: moderator } = ctx;
    if (!guild) return;

    const rawUser = ctx.options.user || ctx.options._args?.[0];
    const targetUserId = rawUser?.match(/\d{17,20}/)?.[0];
    const reason = ctx.options.reason || ctx.options._args?.slice(1).join(" ") || "No reason provided";

    if (!targetUserId) {
      return await ctx.reply({
        embeds: [makeEmbed({ title: "Missing Argument", description: `${EMOJIS.get("fail") || "❌"} Please specify a valid user.\nUsage: \`/untempban <user> [reason]\``, level: "ERROR" })],
        ephemeral: true,
      });
    }

    const botMember = guild.members.me || (await guild.members.fetchMe().catch(() => null));
    if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Missing Permissions",
            description: `${EMOJIS.get("fail") || "❌"} I lack the \`Manage Roles\` permission to remove isolation roles.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    await ctx.defer({ ephemeral: false });

    const config = await getTempbanConfig(guild.id);
    if (!config?.role_id) {
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

    const isIsolated = await isTempbanned(guild.id, targetUserId);
    if (!isIsolated) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Not Tempbanned",
            description: `<@${targetUserId}> holds no active isolation lock records.`,
            level: "WARNING",
          })
        ],
        ephemeral: true
      });
    }

    const result = await liftTempban({
      guild,
      targetUserId,
      moderator,
      reason: reason.slice(0, 512),
    });

    if (result.success) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Tempban Removed",
            description: `${EMOJIS.get("success") || "✅"} Active tempban lifted cleanly from <@${targetUserId}>.\n\n📌 **Reason:** ${reason}`,
            level: "SUCCESS",
          })
        ]
      });
    } else {
      return await ctx.reply({
        embeds: [makeEmbed({ title: "Execution Error", description: (result as any)?.error || "Failed to lift tempban isolation.", level: "ERROR" })],
        ephemeral: true,
      });
    }
  },
});
