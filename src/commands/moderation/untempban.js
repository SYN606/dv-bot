import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed, COLORS } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { getTempbanConfig, isTempbanned } from "../../db/helpers/tempban.js";
import { liftTempban } from "../../services/tempbanService.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("untempban")
  .setDescription("Lifts an active tempban/jail isolation role from a user.")
  .addUserOption((opt) => opt.setName("user").setDescription("The target member").setRequired(true))
  .addStringOption((opt) => opt.setName("reason").setDescription("Reason for the early lift").setRequired(false));

export default createCommand({
  name: "untempban",
  description: "Lifts an active tempban/jail isolation role from a user.",
  category: "Moderation",
  aliases: ["untb", "unjail"],
  modOnly: true,
  requiredPermission: PermissionFlagsBits.ManageRoles,
  slashBuilder,

  async execute(ctx) {
    const { guild, user: moderator } = ctx;
    if (!guild) return;

    let targetUserId = ctx.options.user;
    let reason = ctx.options.reason;

    if (!ctx.isInteraction) {
      const rawUser = ctx.options._args?.[0];
      if (rawUser) targetUserId = rawUser.replace(/[<@!>]/g, "");
      reason = ctx.options._args?.slice(1).join(" ");
    }

    if (!targetUserId) {
      return await ctx.reply({
        embeds: [makeEmbed({ title: "Missing Argument", description: "Please specify a valid user.\nUsage: `/untempban <user> [reason]`", level: "ERROR" })],
        ephemeral: true,
      });
    }

    const reasonStr = reason || "No reason provided";

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

    await ctx.defer({ ephemeral: false });

    const result = await liftTempban({
      guild,
      targetUserId,
      moderator,
      reason: reasonStr,
    });

    if (result.success) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Tempban Removed",
            description: `${EMOJIS.get("success") || "✅"} Active tempban lifted cleanly from <@${targetUserId}>.`,
            level: "SUCCESS",
          })
        ]
      });
    } else {
      return await ctx.reply({
        embeds: [makeEmbed({ title: "Execution Error", description: "Failed to lift tempban isolation.", level: "ERROR" })]
      });
    }
  },
});
