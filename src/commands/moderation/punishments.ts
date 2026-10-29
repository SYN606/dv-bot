import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed, COLORS } from "../../core/embeds.js";
import { PunishmentRecord, WarningRecord, TempbanRecord } from "../../db/models/index.js";
import { EMOJIS } from "../../core/emojis.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("punishments")
  .setDescription("View all punishments and warnings for a user")
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addUserOption((opt) =>
    opt.setName("user").setDescription("The user to lookup").setRequired(true)
  );

export default createCommand({
  name: "punishments",
  description: "View all punishments and warnings for a user",
  usage: "<user>",
  examples: [
    "/punishments user:@User",
    "dvpunishments @User",
  ],
  category: "Moderation",
  modOnly: true,
  requiredPermission: PermissionFlagsBits.ModerateMembers,
  aliases: ["history", "infractions"],
  slashBuilder,

  async execute(ctx) {
    const { interaction, message, guild, client } = ctx;
    if (!guild) return;

    let targetUser = ctx.options.user;

    if (!targetUser && !ctx.isInteraction) {
      targetUser = message?.mentions?.users?.first();
      if (!targetUser && ctx.options._args?.[0]) {
        const rawId = ctx.options._args[0].replace(/[<@!>]/g, "");
        targetUser = await client.users.fetch(rawId).catch(() => null);
      }
    }

    if (!targetUser) {
      return await ctx.reply({
        content: "Please provide a valid user to lookup.",
        ephemeral: true,
      });
    }

    await ctx.defer({ ephemeral: false });

    const [punishments, warnings, tempbans] = await Promise.all([
      PunishmentRecord.findAll({ where: { guild_id: String(guild.id), user_id: String(targetUser.id) } }).catch(() => []),
      WarningRecord.findAll({ where: { guild_id: String(guild.id), user_id: String(targetUser.id) } }).catch(() => []),
      TempbanRecord.findAll({ where: { guild_id: String(guild.id), user_id: String(targetUser.id) } }).catch(() => []),
    ]);

    const allRecords = [
      ...punishments.map((p) => ({
        type: p.action_type.toUpperCase(),
        reason: p.reason,
        moderator_id: p.moderator_id,
        date: new Date(p.created_at),
        emoji: p.action_type === "ban" ? "🔨" : p.action_type === "kick" ? "👢" : "⏳",
      })),
      ...warnings.map((w) => ({
        type: "WARNING",
        reason: w.reason,
        moderator_id: w.moderator_id,
        date: new Date(w.created_at),
        emoji: "⚠️",
      })),
      ...tempbans.map((t) => ({
        type: "TEMPBAN",
        reason: t.tempban_reason || "No reason provided",
        moderator_id: t.moderator_id,
        date: new Date(t.created_at),
        emoji: "⏲️",
      })),
    ].sort((a, b) => b.date - a.date);

    if (allRecords.length === 0) {
      const emptyEmbed = makeEmbed({
        title: `Punishment History: ${targetUser.username}`,
        description: `${EMOJIS.get("success") || "✅"} This user has a clean record. No punishments found.`,
        color: COLORS.SUCCESS,
        thumbnail: targetUser.displayAvatarURL(),
      });
      return await ctx.reply({ embeds: [emptyEmbed] });
    }

    // Format the list (limit to 25 fields for Discord embed limits)
    const fields = [];
    for (const record of allRecords.slice(0, 25)) {
      fields.push({
        name: `${record.emoji} ${record.type} - <t:${Math.floor(record.date.getTime() / 1000)}:d>`,
        value: `**Reason:** ${record.reason || "No reason provided"}\n**Mod:** <@${record.moderator_id}>`,
        inline: false,
      });
    }

    const embed = makeEmbed({
      title: `Punishment History: ${targetUser.username}`,
      description: `Total Infractions: **${allRecords.length}**\n${allRecords.length > 25 ? "*Showing latest 25 records*" : ""}`,
      color: COLORS.WARNING,
      thumbnail: targetUser.displayAvatarURL(),
      fields,
    });

    await ctx.reply({ embeds: [embed] });
  },
});
