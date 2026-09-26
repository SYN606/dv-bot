import { SlashCommandBuilder } from "discord.js";
import { makeEmbed, COLORS } from "../../core/embeds.js";
import { PunishmentRecord, WarningRecord, TempbanRecord } from "../../db/models/index.js";
import { EMOJIS } from "../../core/emojis.js";

export default {
  data: new SlashCommandBuilder()
    .setName("punishments")
    .setDescription("View all punishments and warnings for a user")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The user to lookup").setRequired(true)
    ),
  name: "punishments",
  description: "View all punishments and warnings for a user",
  usage: "/punishments <user>",
  category: "moderation",
  permissions: ["ModerateMembers"],
  aliases: ["history", "modlogs", "infractions"],

  async execute({ interaction, message, args, guild }) {
    const targetUser = interaction ? interaction.options.getUser("user") : message.mentions.users.first() || (args[0] ? await guild.client.users.fetch(args[0]).catch(() => null) : null);

    if (!targetUser) {
      return (interaction || message).reply({
        content: "Please provide a valid user to lookup.",
        ephemeral: true,
      });
    }

    if (interaction) await interaction.deferReply();

    const [punishments, warnings, tempbans] = await Promise.all([
      PunishmentRecord.findAll({ where: { guild_id: String(guild.id), user_id: String(targetUser.id) } }),
      WarningRecord.findAll({ where: { guild_id: String(guild.id), user_id: String(targetUser.id) } }),
      TempbanRecord.findAll({ where: { guild_id: String(guild.id), user_id: String(targetUser.id) } }),
    ]);

    const allRecords = [
      ...punishments.map(p => ({
        type: p.action_type.toUpperCase(),
        reason: p.reason,
        moderator_id: p.moderator_id,
        date: new Date(p.created_at),
        emoji: p.action_type === 'ban' ? '🔨' : p.action_type === 'kick' ? '👢' : '⏳'
      })),
      ...warnings.map(w => ({
        type: 'WARNING',
        reason: w.reason,
        moderator_id: w.moderator_id,
        date: new Date(w.created_at),
        emoji: '⚠️'
      })),
      ...tempbans.map(t => ({
        type: 'TEMPBAN',
        reason: t.tempban_reason || "No reason provided",
        moderator_id: t.moderator_id,
        date: new Date(t.created_at),
        emoji: '⏲️'
      }))
    ].sort((a, b) => b.date - a.date);

    if (allRecords.length === 0) {
      const emptyEmbed = makeEmbed({
        title: `Punishment History: ${targetUser.username}`,
        description: `${EMOJIS.get("success") || "✅"} This user has a clean record. No punishments found.`,
        color: COLORS.SUCCESS,
        thumbnail: targetUser.displayAvatarURL()
      });
      return (interaction || message).reply({ embeds: [emptyEmbed] });
    }

    // Format the list
    const fields = [];
    
    // Group them or list them (limit to 25 fields for Discord embed limits)
    for (const record of allRecords.slice(0, 25)) {
      fields.push({
        name: `${record.emoji} ${record.type} - <t:${Math.floor(record.date.getTime() / 1000)}:d>`,
        value: `**Reason:** ${record.reason}\n**Mod:** <@${record.moderator_id}>`,
        inline: false
      });
    }

    const embed = makeEmbed({
      title: `Punishment History: ${targetUser.username}`,
      description: `Total Infractions: **${allRecords.length}**\n${allRecords.length > 25 ? '*Showing latest 25 records*' : ''}`,
      color: COLORS.WARNING,
      thumbnail: targetUser.displayAvatarURL(),
      fields
    });

    if (interaction) {
      await interaction.editReply({ embeds: [embed] });
    } else {
      await message.reply({ embeds: [embed] });
    }
  },
};
