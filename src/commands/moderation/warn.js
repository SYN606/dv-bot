import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { addWarning, getWarnings } from "../../db/helpers/warnings.js";
import { getWarningPunishmentConfig } from "../../db/helpers/warningPunishments.js";
import { executeTempban } from "../../services/tempbanService.js";
import { sendModLog } from "../../utils/modLog.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("warn")
  .setDescription("Issue a formal warning to a member")
  .addUserOption((opt) =>
    opt.setName("user").setDescription("The member to warn").setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName("reason").setDescription("Reason for the warning").setRequired(false)
  );

export default createCommand({
  name: "warn",
  description: "Issue a formal warning to a member",
  usage: "/warn <user> [reason] | {prefix}warn <@user|id> [reason]",
  category: "Moderation",
  aliases: ["strike"],
  modOnly: true,
  requiredPermission: PermissionFlagsBits.ModerateMembers,
  slashBuilder,

  async execute(ctx) {
    const { guild, user } = ctx;
    if (!guild) return;

    // Resolve target
    const targetUserId =
      ctx.options.user ||
      ctx.options._args?.[0]?.replace(/[<@!>]/g, "");
    const reason =
      ctx.options.reason ||
      ctx.options._args?.slice(1).join(" ") ||
      "No reason provided";

    if (!targetUserId) {
      return await ctx.reply({
        embeds: [makeEmbed({ title: "Missing User", description: "Please mention a user or provide their ID.", level: "ERROR" })],
        ephemeral: true,
      });
    }

    const targetMember = await guild.members.fetch(targetUserId).catch(() => null);
    if (!targetMember) {
      return await ctx.reply({
        embeds: [makeEmbed({ title: "Not Found", description: "Could not find that member in this server.", level: "ERROR" })],
        ephemeral: true,
      });
    }

    // --- Hierarchy checks ---
    if (targetMember.id === user.id) {
      return await ctx.reply({
        embeds: [makeEmbed({ title: "Error", description: "You cannot warn yourself.", level: "ERROR" })],
        ephemeral: true,
      });
    }
    if (targetMember.id === guild.ownerId) {
      return await ctx.reply({
        embeds: [makeEmbed({ title: "Permission Denied", description: "You cannot warn the server owner.", level: "ERROR" })],
        ephemeral: true,
      });
    }
    if (guild.ownerId !== user.id && targetMember.roles.highest.position >= ctx.member.roles.highest.position) {
      return await ctx.reply({
        embeds: [makeEmbed({ title: "Permission Denied", description: "You cannot warn a member with an equal or higher role than you.", level: "ERROR" })],
        ephemeral: true,
      });
    }

    if (ctx.isInteraction) await ctx.defer();

    // --- Issue the warning ---
    const record = await addWarning(guild.id, targetMember.id, user.id, reason);
    const allWarnings = await getWarnings(guild.id, targetMember.id);
    const warnCount = allWarnings.length;

    // --- Auto-punishment check ---
    let punishmentNote = "";
    const punishConfig = await getWarningPunishmentConfig(guild.id, warnCount);

    if (punishConfig) {
      const botMember = guild.members.me;
      const canPunish = targetMember.roles.highest.position < botMember.roles.highest.position;

      if (canPunish) {
        const action = punishConfig.action_type.toLowerCase();
        const duration = punishConfig.duration || null;
        const punishReason = `Auto-Punishment: Reached ${warnCount} warnings. Latest reason: ${reason}`;

        try {
          if (action === "kick") {
            await targetMember.kick(punishReason);
            punishmentNote = "\n\n🛡️ **Auto-Punishment Applied:** `Kick`";
          } else if (action === "ban") {
            await guild.bans.create(targetMember.id, { reason: punishReason });
            punishmentNote = "\n\n🛡️ **Auto-Punishment Applied:** `Permanent Ban`";
          } else if (action === "timeout") {
            if (duration) {
              await targetMember.timeout(duration * 1000, punishReason);
              punishmentNote = `\n\n🛡️ **Auto-Punishment Applied:** \`Timeout (${formatDuration(duration)})\``;
            }
          } else if (action === "tempban") {
            if (duration) {
              await executeTempban({
                guild,
                moderator: user,
                targetMember,
                durationSeconds: duration,
                reason: punishReason,
              });
              punishmentNote = `\n\n🛡️ **Auto-Punishment Applied:** \`Tempban (${formatDuration(duration)})\``;
            }
          }
        } catch (e) {
          punishmentNote = "\n\n❌ **Auto-Punishment Failed:** I lack the permissions to execute the action.";
        }
      } else {
        punishmentNote = "\n\n❌ **Auto-Punishment Skipped:** The member's role is higher than mine.";
      }
    }

    // --- Mod log ---
    await sendModLog({
      guild,
      category: "MODERATION",
      title: "⚠️ Member Warned",
      description: `<@${targetMember.id}> was warned by <@${user.id}>.\n\n📌 **Reason:** ${reason}${punishmentNote}`,
      level: "WARNING",
      actor: user,
      extraFields: {
        "Warning ID": `#${record.warn_id}`,
        "Total Warnings": `${warnCount}`,
      },
    });

    // --- Reply ---
    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "⚠️ Warning Issued",
          description: `${EMOJIS.get("warning") || "⚠️"} Successfully warned <@${targetMember.id}>.\n\n📌 **Reason:** ${reason}${punishmentNote}`,
          level: "WARNING",
          footer: `Warning #${record.warn_id} · Total: ${warnCount}`,
        }),
      ],
    });
  },
});

function formatDuration(seconds) {
  if (!seconds) return "?";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}
