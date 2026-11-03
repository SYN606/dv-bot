import { PermissionFlagsBits, PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed, COLORS } from "../../core/embeds.js";
import { PunishmentRecord, WarningRecord, TempbanRecord } from "../../db/models/index.js";
import { EMOJIS } from "../../core/emojis.js";
import { isBotAdmin } from "../../core/permissions.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("punishments")
  .setDescription("View all punishments and warnings for a user")
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .setDMPermission(false)
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
    "dvpunishments 123456789012345678",
  ],
  category: "Moderation",
  modOnly: true,
  requiredPermission: PermissionFlagsBits.ModerateMembers,
  aliases: ["history", "infractions"],
  slashBuilder,

  async execute(ctx) {
    const { guild, client, user } = ctx;
    if (!guild) return;

    const modPerms =
      ctx.member?.permissions instanceof PermissionsBitField
        ? ctx.member.permissions
        : new PermissionsBitField(BigInt(ctx.member?.permissions || 0));

    const canView =
      guild.ownerId === user.id ||
      modPerms.has(PermissionFlagsBits.Administrator) ||
      modPerms.has(PermissionFlagsBits.ModerateMembers) ||
      (await isBotAdmin(ctx));

    if (!canView) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Permission Denied",
            description: `${EMOJIS.get("fail") || "❌"} You require the **Moderate Members** or **Administrator** permission to view punishment records.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    const rawTarget = ctx.options.user || ctx.options._args?.[0];
    const targetUserId = rawTarget ? String(rawTarget).match(/\d{17,20}/)?.[0] : null;

    if (!targetUserId) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Invalid User",
            description: `${EMOJIS.get("fail") || "❌"} Please provide a valid user mention or 17-20 digit user ID to lookup.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    await ctx.defer({ ephemeral: false });

    const targetUser = await client.users.fetch(targetUserId).catch(() => null);
    const targetTag = targetUser?.tag || targetUser?.username || `User <@${targetUserId}>`;
    const avatarUrl = targetUser?.displayAvatarURL?.() || undefined;

    const [punishments, warnings, tempbans] = await Promise.all([
      PunishmentRecord.findAll({ where: { guild_id: String(guild.id), user_id: String(targetUserId) } }).catch(() => []),
      WarningRecord.findAll({ where: { guild_id: String(guild.id), user_id: String(targetUserId) } }).catch(() => []),
      TempbanRecord.findAll({ where: { guild_id: String(guild.id), user_id: String(targetUserId) } }).catch(() => []),
    ]);

    const allRecords = [
      ...punishments.map((p) => ({
        type: p.action_type.toUpperCase(),
        reason: p.reason,
        moderator_id: p.moderator_id,
        date: new Date(p.created_at),
        emoji: p.action_type === "ban" ? "🔨" : p.action_type === "kick" ? "👢" : p.action_type === "timeout" ? "⏳" : "📝",
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
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    if (allRecords.length === 0) {
      const emptyEmbed = makeEmbed({
        title: `Punishment History: ${targetTag}`,
        description: `${EMOJIS.get("success") || "✅"} This user has a clean record. No punishments found.`,
        color: COLORS.SUCCESS,
        thumbnail: avatarUrl,
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
      title: `Punishment History: ${targetTag}`,
      description: `Total Infractions: **${allRecords.length}**\n${allRecords.length > 25 ? "*Showing latest 25 records*" : ""}`,
      color: COLORS.WARNING,
      thumbnail: avatarUrl,
      fields,
    });

    await ctx.reply({ embeds: [embed] });
  },
});
