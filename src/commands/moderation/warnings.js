import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import {
  addWarning,
  clearWarnings,
  deleteWarning,
  getWarnings,
} from "../../db/helpers/warnings.js";
import { sendModLog } from "../../utils/modLog.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("warnings")
  .setDescription("Manage and view member warnings")
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Issue a formal warning to a member")
      .addUserOption((opt) => opt.setName("user").setDescription("The target member").setRequired(true))
      .addStringOption((opt) => opt.setName("reason").setDescription("Reason for warning").setRequired(false))
  )
  .addSubcommand((sub) =>
    sub
      .setName("list")
      .setDescription("View all warnings for a member")
      .addUserOption((opt) => opt.setName("user").setDescription("The target member").setRequired(true))
  )
  .addSubcommand((sub) =>
    sub
      .setName("delete")
      .setDescription("Remove a specific warning by its ID")
      .addIntegerOption((opt) => opt.setName("id").setDescription("Warning ID to delete").setRequired(true))
  )
  .addSubcommand((sub) =>
    sub
      .setName("clear")
      .setDescription("Clear all warnings for a member")
      .addUserOption((opt) => opt.setName("user").setDescription("The target member").setRequired(true))
  );

export default createCommand({
  name: "warnings",
  description: "Manage and view member warnings",
  category: "Moderation",
  aliases: ["warn", "delwarn", "clearwarnings"],
  modOnly: true,
  requiredPermission: PermissionFlagsBits.ModerateMembers,
  slashBuilder,

  async execute(ctx) {
    const { guild, user } = ctx;
    if (!guild) return;

    let sub = ctx.subcommand || "list";
    if (ctx.options._args && !ctx.interaction) {
      const firstArg = ctx.options._args[0]?.toLowerCase();
      if (firstArg === "add" || firstArg === "warn") {
        sub = "add";
        ctx.options._args.shift();
      } else if (firstArg === "delete" || firstArg === "delwarn") {
        sub = "delete";
        ctx.options._args.shift();
      } else if (firstArg === "clear" || firstArg === "clearwarnings") {
        sub = "clear";
        ctx.options._args.shift();
      }
    }

    // --- SUBCOMMAND: ADD / WARN ---
    if (sub === "add") {
      const targetUserId = ctx.options.user || ctx.options._args?.[0]?.replace(/[<@!>]/g, "");
      const reason = ctx.options.reason || ctx.options._args?.slice(1).join(" ") || "No reason provided";

      if (!targetUserId) return await ctx.reply("Please specify a user to warn.");

      const record = await addWarning(guild.id, targetUserId, user.id, reason);

      await sendModLog({
        guild,
        category: "MODERATION",
        title: "Member Warned",
        description: `User <@${targetUserId}> was warned by <@${user.id}>.\n\n• **Reason:** ${reason}`,
        level: "WARNING",
        actor: user,
        extraFields: { "Warning ID": `#${record.warn_id}` },
      });

      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Warning Issued",
            description: `${EMOJIS.get("warning") || "⚠️"} Successfully warned <@${targetUserId}> (ID: \`#${record.warn_id}\`).\n\n• **Reason:** ${reason}`,
            level: "WARNING",
          }),
        ],
      });
    }

    // --- SUBCOMMAND: LIST ---
    if (sub === "list") {
      const targetUserId = ctx.options.user || ctx.options._args?.[0]?.replace(/[<@!>]/g, "");
      if (!targetUserId) return await ctx.reply("Please specify a user to check.");

      const warnings = await getWarnings(guild.id, targetUserId);

      if (warnings.length === 0) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "No Warnings",
              description: `${EMOJIS.get("success") || "✅"} <@${targetUserId}> has a clean record with **0 warnings**.`,
              level: "SUCCESS",
            }),
          ],
        });
      }

      const list = warnings
        .slice(0, 10)
        .map(
          (w) =>
            `• **ID \`#${w.warn_id}\`**: ${w.reason} *(by <@${w.moderator_id}> on <t:${Math.floor(new Date(w.created_at).getTime() / 1000)}:d>)*`
        )
        .join("\n");

      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: `Warnings for user`,
            description: `Total warnings: **${warnings.length}**\n\n${list}`,
            level: "INFO",
            footer: `Showing up to 10 latest warnings`,
          }),
        ],
      });
    }

    // --- SUBCOMMAND: DELETE ---
    if (sub === "delete") {
      const warnId = ctx.options.id || ctx.options._args?.[0];
      if (!warnId) return await ctx.reply("Please specify a warning ID to delete.");

      const deleted = await deleteWarning(guild.id, warnId);
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: deleted ? "Warning Deleted" : "Not Found",
            description: deleted
              ? `${EMOJIS.get("success") || "✅"} Warning \`#${warnId}\` has been removed.`
              : `${EMOJIS.get("fail") || "❌"} Warning \`#${warnId}\` was not found.`,
            level: deleted ? "SUCCESS" : "ERROR",
          }),
        ],
      });
    }

    // --- SUBCOMMAND: CLEAR ---
    if (sub === "clear") {
      const targetUserId = ctx.options.user || ctx.options._args?.[0]?.replace(/[<@!>]/g, "");
      if (!targetUserId) return await ctx.reply("Please specify a user to clear.");

      const count = await clearWarnings(guild.id, targetUserId);
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Warnings Cleared",
            description: `${EMOJIS.get("success") || "✅"} Cleared **${count}** warnings for <@${targetUserId}>.`,
            level: "SUCCESS",
          }),
        ],
      });
    }
  },
});
