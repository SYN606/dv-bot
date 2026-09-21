import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { PunishmentRecord } from "../../db/models/index.js";
import { sendModLog } from "../../utils/modLog.js";

function parseDuration(str) {
  if (!str) return 60; // 1 min default
  const match = str.match(/^(\d+)([smhd])$/i);
  if (!match) return 60;
  const num = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case "s": return num;
    case "m": return num * 60;
    case "h": return num * 3600;
    case "d": return num * 86400;
    default: return num;
  }
}

const slashBuilder = new SlashCommandBuilder()
  .setName("timeout")
  .setDescription("Mute/timeout a member for a specified duration")
  .addUserOption((opt) => opt.setName("user").setDescription("The target member").setRequired(true))
  .addStringOption((opt) => opt.setName("duration").setDescription("Duration (e.g. 10m, 1h, 1d)").setRequired(false))
  .addStringOption((opt) => opt.setName("reason").setDescription("Reason for timeout").setRequired(false));

export default createCommand({
  name: "timeout",
  description: "Mute/timeout a member for a specified duration",
  category: "Moderation",
  aliases: ["mute"],
  modOnly: true,
  requiredPermission: PermissionFlagsBits.ModerateMembers,
  slashBuilder,

  async execute(ctx) {
    const { guild, user } = ctx;
    if (!guild) return;

    const targetUserId = ctx.options.user || ctx.options._args?.[0]?.replace(/[<@!>]/g, "");
    const durationStr = ctx.options.duration || ctx.options._args?.[1] || "10m";
    const reason = ctx.options.reason || ctx.options._args?.slice(2).join(" ") || "No reason provided";

    if (!targetUserId) {
      return await ctx.reply({ content: "Please specify a target member.", ephemeral: true });
    }

    const targetMember = await guild.members.fetch(targetUserId).catch(() => null);
    if (!targetMember) {
      return await ctx.reply({ content: "Member not found in this server.", ephemeral: true });
    }

    const durationSec = parseDuration(durationStr);
    const durationMs = durationSec * 1000;

    await targetMember.timeout(durationMs, reason).catch(() => {});

    await PunishmentRecord.create({
      guild_id: String(guild.id),
      user_id: String(targetUserId),
      moderator_id: String(user.id),
      action_type: "timeout",
      reason,
      duration_seconds: durationSec,
    }).catch(() => {});

    await sendModLog({
      guild,
      category: "MODERATION",
      title: "Member Timed Out",
      description: `<@${targetUserId}> was timed out for **${durationStr}** by <@${user.id}>.\n\n• **Reason:** ${reason}`,
      level: "WARNING",
      actor: user,
    });

    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "Member Timed Out",
          description: `${EMOJIS.get("timeout") || "🔇"} Successfully timed out <@${targetUserId}> for **${durationStr}**.\n\n• **Reason:** ${reason}`,
          level: "SUCCESS",
        }),
      ],
    });
  },
});
