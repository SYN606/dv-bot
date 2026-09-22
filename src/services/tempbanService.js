import {
  createTempban,
  deactivateTempban,
  getExpiredTempbans,
  getTempbanConfig,
  setTempbanConfig,
  removeTempbanConfig,
} from "../db/helpers/tempban.js";
import { TempbanRecord, VerificationConfig } from "../db/models/index.js";
import { sendModLog } from "../utils/modLog.js";
import { makeEmbed, COLORS } from "../core/embeds.js";
import { logger } from "../utils/logger.js";

export function parseDuration(str) {
  if (!str) return null;
  const match = String(str).trim().match(/^(\d+)\s*([smhdw])$/i);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  if (isNaN(num) || num <= 0) return null;
  switch (unit) {
    case "s": return num;
    case "m": return num * 60;
    case "h": return num * 3600;
    case "d": return num * 86400;
    case "w": return num * 604800;
    default: return null;
  }
}

export function formatDuration(seconds) {
  if (seconds >= 86400) {
    const days = Math.floor(seconds / 86400);
    return `${days} day${days > 1 ? "s" : ""}`;
  }
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} hour${hours > 1 ? "s" : ""}`;
  }
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  }
  return `${seconds} second${seconds > 1 ? "s" : ""}`;
}

/**
 * Execute a temporary ban or role isolation
 */
export async function executeTempban({
  guild,
  moderator,
  targetMember,
  durationSeconds,
  reason = "Temporary ban",
}) {
  const expiresAt = new Date(Date.now() + durationSeconds * 1000);
  const formattedTime = formatDuration(durationSeconds);

  // Check for custom isolation role
  const config = await getTempbanConfig(guild.id);
  const isolationRoleId = config?.role_id ? String(config.role_id) : null;
  const isolationRole = isolationRoleId ? guild.roles.cache.get(isolationRoleId) : null;
  const isRoleIsolation = Boolean(isolationRole);

  // Send DM warning to user
  const dmEmbed = makeEmbed({
    title: isRoleIsolation ? "🔒 You Have Been Isolated (Tempban)" : "🔨 You Were Temporarily Banned",
    description:
      `You received a temporary penalty in **${guild.name}**.\n\n` +
      `• **Action:** ${isRoleIsolation ? `Assigned Isolation Role (@${isolationRole.name})` : "Temporary Server Ban"}\n` +
      `• **Duration:** ${formattedTime}\n` +
      `• **Expires:** <t:${Math.floor(expiresAt.getTime() / 1000)}:R>\n` +
      `• **Reason:** ${reason}`,
    level: "ERROR",
    color: COLORS.DARK,
  });
  await targetMember.send({ embeds: [dmEmbed] }).catch(() => {});

  if (isRoleIsolation) {
    // 1. Assign isolation role
    await targetMember.roles.add(isolationRole, `Tempban by ${moderator.tag || moderator.id}: ${reason}`);

    // 2. Temporarily strip verified role if server has verification enabled
    try {
      const verifConfig = await VerificationConfig.findByPk(guild.id);
      if (verifConfig && verifConfig.enabled && verifConfig.verified_role_id) {
        const verifiedRole = guild.roles.cache.get(String(verifConfig.verified_role_id));
        if (verifiedRole && targetMember.roles.cache.has(verifiedRole.id)) {
          await targetMember.roles.remove(verifiedRole, "Stripping verified status during tempban isolation").catch(() => {});
        }
      }
    } catch (err) {
      logger.warn("[TEMPBAN SERVICE] Failed to strip verified role:", err?.message);
    }
  } else {
    // Native Discord ban
    await guild.bans.create(targetMember.id, {
      reason: `Tempban (${formattedTime}) by ${moderator.tag || moderator.id}: ${reason}`,
    });
  }

  // Record in database
  const record = await createTempban(
    guild.id,
    targetMember.id,
    moderator.id,
    reason,
    expiresAt
  );

  // Audit log
  await sendModLog({
    guild,
    category: "MODERATION",
    title: isRoleIsolation ? "Member Isolated (Tempban)" : "Member Tempbanned",
    description: `<@${targetMember.id}> was tempbanned for **${formattedTime}** by ${moderator.tag || moderator.username || "Staff"}.`,
    level: "WARNING",
    actor: moderator,
    extraFields: {
      Method: isRoleIsolation ? `@${isolationRole.name}` : "Native Ban",
      Duration: formattedTime,
      Reason: reason,
      Expires: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`,
    },
  });

  return {
    success: true,
    record,
    isRoleIsolation,
    isolationRole,
    formattedTime,
    expiresAt,
  };
}

/**
 * Lift an active tempban early
 */
export async function liftTempban({
  guild,
  targetUserId,
  moderator = null,
  reason = "Early lift by staff",
}) {
  const config = await getTempbanConfig(guild.id);
  const isolationRoleId = config?.role_id ? String(config.role_id) : null;
  const isRoleIsolation = Boolean(isolationRoleId);

  if (isRoleIsolation) {
    const member = await guild.members.fetch(String(targetUserId)).catch(() => null);
    if (member) {
      await member.roles.remove(isolationRoleId, `Tempban lifted: ${reason}`).catch(() => {});

      // Restore verified role if verification is configured
      try {
        const verifConfig = await VerificationConfig.findByPk(guild.id);
        if (verifConfig && verifConfig.enabled && verifConfig.verified_role_id) {
          const verifiedRole = guild.roles.cache.get(String(verifConfig.verified_role_id));
          const botMember = guild.members.me;
          if (
            verifiedRole &&
            botMember &&
            verifiedRole.position < botMember.roles.highest.position &&
            !member.roles.cache.has(verifiedRole.id)
          ) {
            await member.roles.add(verifiedRole, "Restoring verified status (Tempban lifted)").catch(() => {});
          }
        }
      } catch (err) {
        logger.warn("[TEMPBAN SERVICE] Failed to restore verified role:", err?.message);
      }
    }
  } else {
    await guild.bans.remove(String(targetUserId), `Tempban lifted: ${reason}`).catch(() => {});
  }

  // Deactivate record in DB
  await deactivateTempban(guild.id, targetUserId);

  await sendModLog({
    guild,
    category: "MODERATION",
    title: "Tempban Lifted",
    description: `Temporary ban lifted early for <@${targetUserId}> by ${moderator?.tag || moderator?.username || "Staff"}.`,
    level: "SUCCESS",
    actor: moderator,
    extraFields: { Reason: reason },
  });

  return { success: true };
}

/**
 * Process all expired tempbans across guilds
 */
export async function processExpiredTempbans(client) {
  const expired = await getExpiredTempbans();
  if (!expired || expired.length === 0) return 0;

  let count = 0;
  for (const record of expired) {
    const guild = client.guilds.cache.get(String(record.guild_id));
    if (!guild) {
      record.active = false;
      await record.save();
      continue;
    }

    try {
      await liftTempban({
        guild,
        targetUserId: record.user_id,
        moderator: null,
        reason: "Temporary ban duration expired",
      });
      count++;
    } catch (err) {
      logger.error(`[TEMPBAN SERVICE] Error lifting expired tempban for ${record.user_id}:`, err);
    }
  }
  return count;
}
