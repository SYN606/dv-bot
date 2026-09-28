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
import { getWarningPunishmentConfig } from "../../db/helpers/warningPunishments.js";
import { executeTempban } from "../../services/tempbanService.js";
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
  usage: "/warnings <add|list|delete|clear> | {prefix}warnings <add|list|delete|clear>",
  category: "Moderation",
  aliases: ["delwarn", "clearwarnings", "modlogs"],
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

    // --- SUBCOMMAND: ADD ---
    if (sub === "add") {
      const targetUserId = ctx.options.user || ctx.options._args?.[0]?.replace(/[<@!>]/g, "");
      const reason = ctx.options.reason || ctx.options._args?.slice(1).join(" ") || "No reason provided";

      if (!targetUserId) return await ctx.reply("Please specify a user to warn.");

      const targetMember = await guild.members.fetch(targetUserId).catch(() => null);
      if (!targetMember) return await ctx.reply({ embeds: [makeEmbed({ title: "Error", description: "Target member not found in server.", level: "ERROR" })] });

      if (targetMember.id === user.id) {
        return await ctx.reply({ embeds: [makeEmbed({ title: "Error", description: "You cannot warn yourself.", level: "ERROR" })], ephemeral: true });
      }
      if (targetMember.id === guild.ownerId) {
        return await ctx.reply({ embeds: [makeEmbed({ title: "Permission Denied", description: "You cannot warn the server owner.", level: "ERROR" })], ephemeral: true });
      }
      if (guild.ownerId !== user.id && targetMember.roles.highest.position >= ctx.member.roles.highest.position) {
        return await ctx.reply({ embeds: [makeEmbed({ title: "Permission Denied", description: "You cannot warn a member with an equal or higher role.", level: "ERROR" })], ephemeral: true });
      }

      if (ctx.isInteraction) await ctx.defer();

      const record = await addWarning(guild.id, targetUserId, user.id, reason);
      const warnings = await getWarnings(guild.id, targetUserId);
      const warnCount = warnings.length;

      let punishmentApplied = "";

      const config = await getWarningPunishmentConfig(guild.id, warnCount);
      if (config) {
        const botMember = guild.members.me;
        const canPunish = targetMember.roles.highest.position < botMember.roles.highest.position;

        if (canPunish) {
          const action = config.action_type.toLowerCase();
          const duration = config.duration || null;
          const punishReason = `Auto-Punishment: Reached ${warnCount} warnings. Latest: ${reason}`;

          try {
            if (action === "kick") {
              await targetMember.kick(punishReason);
              punishmentApplied = "\n\n🛡️ **Auto-Punishment Applied:** `Kick`";
            } else if (action === "ban") {
              await guild.bans.create(targetMember.id, { reason: punishReason });
              punishmentApplied = "\n\n🛡️ **Auto-Punishment Applied:** `Ban`";
            } else if (action === "timeout") {
              if (duration) {
                await targetMember.timeout(duration * 1000, punishReason);
                punishmentApplied = `\n\n🛡️ **Auto-Punishment Applied:** \`Timeout (${duration}s)\``;
              }
            } else if (action === "tempban") {
              if (duration) {
                await executeTempban({ guild, moderator: user, targetMember, durationSeconds: duration, reason: punishReason });
                punishmentApplied = `\n\n🛡️ **Auto-Punishment Applied:** \`Tempban (${duration}s)\``;
              }
            }
          } catch (e) {
            punishmentApplied = "\n\n❌ **Auto-Punishment Failed:** Missing permissions.";
          }
        } else {
          punishmentApplied = "\n\n❌ **Auto-Punishment Failed:** Target member has a higher role than me.";
        }
      }

      await sendModLog({
        guild,
        category: "MODERATION",
        title: "⚠️ Member Warned",
        description: `User <@${targetUserId}> was warned by <@${user.id}>.\n\n📌 **Reason:** ${reason}${punishmentApplied}`,
        level: "WARNING",
        actor: user,
        extraFields: { "Warning ID": `#${record.warn_id}`, "Total Warnings": warnCount.toString() },
      });

      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "⚠️ Warning Issued",
            description: `${EMOJIS.get("warning") || "⚠️"} Successfully warned <@${targetUserId}> (ID: \`#${record.warn_id}\`).\n\n📌 **Reason:** ${reason}${punishmentApplied}`,
            level: "WARNING",
            footer: `Total Warnings: ${warnCount}`,
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
            `🔹 **ID \`#${w.warn_id}\`**: ${w.reason} *(by <@${w.moderator_id}> on <t:${Math.floor(new Date(w.created_at).getTime() / 1000)}:d>)*`
        )
        .join("\n");

      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: `Warnings for User`,
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
