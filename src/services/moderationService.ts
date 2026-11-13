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
  const dmPromise = Promise.resolve(targetMember?.send?.({ embeds: [dmEmbed] })).catch(() => {});

  // Execute kick immediately
  const auditReason = String(reason || "No reason provided").slice(0, 512);
  await targetMember.kick(auditReason);

  // Background logging & database persistence (non-blocking for speed)
  Promise.allSettled([
    dmPromise,
    PunishmentRecord.create({
      guild_id: String(guild.id),
      user_id: String(targetMember.id),
      moderator_id: String(moderator.id),
      action_type: "kick",
      reason,
    }),
    sendModLog({
      guild,
      category: "MODERATION",
      title: "Member Kicked",
      description: `<@${targetMember.id}> was kicked by ${moderator.tag || moderator.username || "Staff"}.`,
      level: "WARNING",
      actor: moderator,
      target: targetMember.user || targetMember,
      extraFields: { Reason: reason },
    }),
  ]).catch(() => {});

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

  // Dispatch DM concurrently without blocking ban execution
  let dmPromise: Promise<any> = Promise.resolve();
  if (targetUser && typeof targetUser.send === "function") {
    const dmEmbed = makeEmbed({
      title: "🔨 You Were Banned",
      description: `You have been banned from **${guild.name}**.\n\n• **Reason:** ${reason}\n• **Moderator:** ${moderator.tag || moderator.username || "Staff"}`,
      level: "ERROR",
      color: COLORS.DARK,
    });
    dmPromise = Promise.resolve(targetUser.send({ embeds: [dmEmbed] })).catch(() => {});
  }

  // Execute ban immediately
  await guild.bans.create(String(targetId), {
    reason: `${reason} | By ${moderator.tag || moderator.username || moderator.id}`.slice(0, 512),
    deleteMessageSeconds,
  });

  // Background logging & database persistence (non-blocking for speed)
  Promise.allSettled([
    dmPromise,
    PunishmentRecord.create({
      guild_id: String(guild.id),
      user_id: String(targetId),
      moderator_id: String(moderator.id),
      action_type: "ban",
      reason,
    }),
    sendModLog({
      guild,
      category: "BAN",
      title: "Member Banned",
      description: `User <@${targetId}> was banned by ${moderator.tag || moderator.username || "Staff"}.\n\n• **Reason:** ${reason}`,
      level: "ERROR",
      actor: moderator,
      target: targetUser,
      extraFields: { Reason: reason },
    }),
  ]).catch(() => {});

  return { success: true };
}

/**
 * Execute an unban action
 */
export async function executeUnban({ guild, moderator, targetUserId, reason = "Unbanned by staff" }) {
  const auditReason = String(reason || "Unbanned by staff").slice(0, 512);
  await guild.bans.remove(String(targetUserId), auditReason);

  // Background logging & database persistence (non-blocking for speed)
  Promise.allSettled([
    PunishmentRecord.create({
      guild_id: String(guild.id),
      user_id: String(targetUserId),
      moderator_id: String(moderator.id),
      action_type: "unban",
      reason,
    }),
    sendModLog({
      guild,
      category: "UNBAN",
      title: "Member Unbanned",
      description: `User <@${targetUserId}> was unbanned by ${moderator?.tag || moderator?.username || "Staff"}.`,
      level: "SUCCESS",
      actor: moderator,
      target: targetUserId,
      extraFields: { Reason: reason },
    }),
  ]).catch(() => {});

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

  // Dispatch DM concurrently without blocking timeout execution
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
  const dmPromise = Promise.resolve(targetMember?.send?.({ embeds: [dmEmbed] })).catch(() => {});

  // Apply timeout immediately
  const auditReason = String(reason || "No reason provided").slice(0, 512);
  await targetMember.timeout(durationMs, auditReason);

  // Background logging & database persistence (non-blocking for speed)
  Promise.allSettled([
    dmPromise,
    PunishmentRecord.create({
      guild_id: String(guild.id),
      user_id: String(targetMember.id),
      moderator_id: String(moderator.id),
      action_type: "timeout",
      reason,
      duration_seconds: Math.floor(durationMs / 1000),
    }),
    sendModLog({
      guild,
      category: "TIMEOUT",
      title: "Member Timed Out",
      description: `<@${targetMember.id}> was timed out by ${moderator.tag || moderator.username || "Staff"}.`,
      level: "WARNING",
      actor: moderator,
      target: targetMember.user || targetMember,
      extraFields: {
        Duration: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`,
        Reason: reason,
      },
    }),
  ]).catch(() => {});

  return { success: true, expiresAt };
}

/**
 * Execute an untimeout action (remove timeout)
 */
export async function executeUntimeout({
  guild,
  moderator,
  targetMember,
  reason = "Timeout removed by staff",
}: {
  guild: any;
  moderator: any;
  targetMember: any;
  reason?: string;
}) {
  const auditReason = String(reason || "Timeout removed by staff").slice(0, 512);

  // Dispatch DM concurrently without blocking untimeout execution
  const dmEmbed = makeEmbed({
    title: "🔊 Your Timeout Was Removed",
    description:
      `Your timeout in **${guild.name}** has been removed.\n\n` +
      `• **Reason:** ${reason}\n` +
      `• **Moderator:** ${moderator.tag || moderator.username || "Staff"}`,
    level: "SUCCESS",
    color: COLORS.DARK,
  });
  const dmPromise = Promise.resolve(targetMember?.send?.({ embeds: [dmEmbed] })).catch(() => {});

  // Remove timeout in Discord immediately
  await targetMember.timeout(null, auditReason);

  // Background logging & database persistence (non-blocking for speed)
  Promise.allSettled([
    dmPromise,
    PunishmentRecord.create({
      guild_id: String(guild.id),
      user_id: String(targetMember.id),
      moderator_id: String(moderator.id),
      action_type: "untimeout",
      reason,
    }),
    sendModLog({
      guild,
      category: "TIMEOUT",
      title: "Member Timeout Removed",
      description: `<@${targetMember.id}> was untimed out by ${moderator.tag || moderator.username || "Staff"}.`,
      level: "SUCCESS",
      actor: moderator,
      target: targetMember.user || targetMember,
      extraFields: {
        Reason: reason,
      },
    }),
  ]).catch(() => {});

  return { success: true };
}
