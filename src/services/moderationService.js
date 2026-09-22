import { PermissionFlagsBits } from "discord.js";
import { makeEmbed, COLORS } from "../core/embeds.js";
import { sendModLog } from "../utils/modLog.js";
import { PunishmentRecord } from "../db/models/index.js";

/**
 * Execute a kick action
 */
export async function executeKick({ guild, moderator, targetMember, reason = "No reason provided" }) {
  // DM member
  const dmEmbed = makeEmbed({
    title: "👢 You Were Kicked",
    description: `You have been kicked from **${guild.name}**.\n\n• **Reason:** ${reason}\n• **Moderator:** ${moderator.tag || moderator.username || "Staff"}`,
    level: "WARNING",
    color: COLORS.DARK,
  });
  await targetMember.send({ embeds: [dmEmbed] }).catch(() => {});

  // Execute kick
  await targetMember.kick(reason);

  await PunishmentRecord.create({
    guild_id: String(guild.id),
    user_id: String(targetMember.id),
    moderator_id: String(moderator.id),
    action_type: "kick",
    reason,
  }).catch(() => {});

  // Modlog
  await sendModLog({
    guild,
    category: "MODERATION",
    title: "Member Kicked",
    description: `<@${targetMember.id}> was kicked by ${moderator.tag || moderator.username || "Staff"}.`,
    level: "WARNING",
    actor: moderator,
    extraFields: { Reason: reason },
  });

  return { success: true };
}

/**
 * Execute a permanent ban action
 */
export async function executeBan({
  guild,
  moderator,
  targetUser,
  reason = "No reason provided",
  deleteMessageSeconds = 0,
}) {
  const targetId = typeof targetUser === "string" ? targetUser : targetUser.id;

  // DM user if object with send is available
  if (targetUser && typeof targetUser.send === "function") {
    const dmEmbed = makeEmbed({
      title: "🔨 You Were Banned",
      description: `You have been banned from **${guild.name}**.\n\n• **Reason:** ${reason}\n• **Moderator:** ${moderator.tag || moderator.username || "Staff"}`,
      level: "ERROR",
      color: COLORS.DARK,
    });
    await targetUser.send({ embeds: [dmEmbed] }).catch(() => {});
  }

  // Execute ban
  await guild.bans.create(String(targetId), {
    reason: `${reason} | By ${moderator.tag || moderator.id}`,
    deleteMessageSeconds,
  });

  await PunishmentRecord.create({
    guild_id: String(guild.id),
    user_id: String(targetId),
    moderator_id: String(moderator.id),
    action_type: "ban",
    reason,
  }).catch(() => {});

  // Modlog
  await sendModLog({
    guild,
    category: "MODERATION",
    title: "Member Banned",
    description: `User <@${targetId}> was banned by ${moderator.tag || moderator.username || "Staff"}.\n\n• **Reason:** ${reason}`,
    level: "ERROR",
    actor: moderator,
    extraFields: { Target: `<@${targetId}> (\`${targetId}\`)`, Reason: reason },
  });

  return { success: true };
}

/**
 * Execute an unban action
 */
export async function executeUnban({ guild, moderator, targetUserId, reason = "Unbanned by staff" }) {
  await guild.bans.remove(String(targetUserId), reason);

  await sendModLog({
    guild,
    category: "MODERATION",
    title: "Member Unbanned",
    description: `User <@${targetUserId}> was unbanned by ${moderator?.tag || moderator?.username || "Staff"}.`,
    level: "SUCCESS",
    actor: moderator,
    extraFields: { Target: `<@${targetUserId}> (\`${targetUserId}\`)`, Reason: reason },
  });

  return { success: true };
}

/**
 * Execute a timeout action
 */
export async function executeTimeout({
  guild,
  moderator,
  targetMember,
  durationMs,
  reason = "No reason provided",
}) {
  const expiresAt = new Date(Date.now() + durationMs);

  // DM member
  const dmEmbed = makeEmbed({
    title: "⏳ You Were Timed Out",
    description:
      `You have been timed out in **${guild.name}**.\n\n` +
      `• **Expires:** <t:${Math.floor(expiresAt.getTime() / 1000)}:R>\n` +
      `• **Reason:** ${reason}\n` +
      `• **Moderator:** ${moderator.tag || moderator.username || "Staff"}`,
    level: "WARNING",
    color: COLORS.DARK,
  });
  await targetMember.send({ embeds: [dmEmbed] }).catch(() => {});

  // Apply timeout
  await targetMember.timeout(durationMs, reason);

  await PunishmentRecord.create({
    guild_id: String(guild.id),
    user_id: String(targetMember.id),
    moderator_id: String(moderator.id),
    action_type: "timeout",
    reason,
    duration_seconds: Math.floor(durationMs / 1000),
  }).catch(() => {});

  await sendModLog({
    guild,
    category: "MODERATION",
    title: "Member Timed Out",
    description: `<@${targetMember.id}> was timed out by ${moderator.tag || moderator.username || "Staff"}.`,
    level: "WARNING",
    actor: moderator,
    extraFields: {
      Expires: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`,
      Reason: reason,
    },
  });

  return { success: true, expiresAt };
}
