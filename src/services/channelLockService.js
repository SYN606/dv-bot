import { PermissionFlagsBits } from "discord.js";
import { ChannelPermissionSnapshot, VerificationConfig } from "../db/models/index.js";
import { sendModLog } from "../utils/modLog.js";

const unlockTimers = new Map(); // channelId -> Timeout

/**
 * Parses user duration string (e.g. 10m, 1h, 1d) to seconds
 */
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

/**
 * Resolves target role for channel lockdown:
 * - Uses verified_role_id if verification system is enabled and configured
 * - Falls back to @everyone otherwise
 */
export async function resolveTargetRole(guild) {
  try {
    const vConfig = await VerificationConfig.findByPk(String(guild.id));
    if (vConfig && vConfig.enabled && vConfig.verified_role_id) {
      const verifiedRole = guild.roles.cache.get(String(vConfig.verified_role_id));
      if (verifiedRole) {
        return { role: verifiedRole, usingVerifiedRole: true, verifiedRoleName: verifiedRole.name };
      }
    }
  } catch (_) { }
  return { role: guild.roles.everyone, usingVerifiedRole: false, verifiedRoleName: null };
}

/**
 * Locks a channel for the target role (SendMessages & AddReactions -> false)
 * Preserves existing permission states in ChannelPermissionSnapshot
 */
export async function lockChannel({ channel, guild, moderator = null, durationStr = null }) {
  const { role: targetRole, usingVerifiedRole, verifiedRoleName } = await resolveTargetRole(guild);
  const durationSeconds = parseDuration(durationStr);

  const existingOverwrite = channel.permissionOverwrites.cache.get(targetRole.id);
  const prevSendMessages =
    existingOverwrite?.allow.has(PermissionFlagsBits.SendMessages) ? true
      : existingOverwrite?.deny.has(PermissionFlagsBits.SendMessages) ? false
        : null;
  const prevAddReactions =
    existingOverwrite?.allow.has(PermissionFlagsBits.AddReactions) ? true
      : existingOverwrite?.deny.has(PermissionFlagsBits.AddReactions) ? false
        : null;

  // Snapshot previous state before editing
  await ChannelPermissionSnapshot.findOrCreate({
    where: {
      guild_id: String(guild.id),
      channel_id: String(channel.id),
      target_id: String(targetRole.id),
      permission_name: "SendMessages",
    },
    defaults: {
      guild_id: String(guild.id),
      channel_id: String(channel.id),
      target_id: String(targetRole.id),
      permission_name: "SendMessages",
      permission_value: prevSendMessages,
    },
  });

  await channel.permissionOverwrites.edit(targetRole, {
    SendMessages: false,
    AddReactions: false,
  });

  // Clear existing timer if any
  if (unlockTimers.has(channel.id)) {
    clearTimeout(unlockTimers.get(channel.id));
    unlockTimers.delete(channel.id);
  }

  let expiryUnix = null;
  if (durationSeconds) {
    expiryUnix = Math.floor(Date.now() / 1000) + durationSeconds;
    const timer = setTimeout(async () => {
      unlockTimers.delete(channel.id);
      try {
        await unlockChannel({ channel, guild, moderator: null });
        await channel.send({ content: `🔓 **Channel Unlocked**: The temporary lock duration has expired.` }).catch(() => { });
      } catch (_) { }
    }, durationSeconds * 1000);
    unlockTimers.set(channel.id, timer);
  }

  await sendModLog({
    guild,
    category: "CHANNELS",
    title: "Channel Locked",
    description: `Channel ${channel} locked by ${moderator?.tag || moderator?.username || "Staff"}.`,
    level: "WARNING",
    actor: moderator,
    extraFields: {
      Target: usingVerifiedRole ? `@${verifiedRoleName}` : "@everyone",
      Duration: durationStr || "Indefinite",
    },
  });

  return {
    success: true,
    channel,
    targetRole,
    usingVerifiedRole,
    verifiedRoleName,
    durationSeconds,
    expiryUnix,
  };
}

/**
 * Unlocks a channel by restoring snapshot or deleting denies
 */
export async function unlockChannel({ channel, guild, moderator = null }) {
  const { role: targetRole, usingVerifiedRole, verifiedRoleName } = await resolveTargetRole(guild);

  if (unlockTimers.has(channel.id)) {
    clearTimeout(unlockTimers.get(channel.id));
    unlockTimers.delete(channel.id);
  }

  const snapshot = await ChannelPermissionSnapshot.findOne({
    where: {
      guild_id: String(guild.id),
      channel_id: String(channel.id),
      target_id: String(targetRole.id),
      permission_name: "SendMessages",
    },
  });

  const existingOverwrite = channel.permissionOverwrites.cache.get(targetRole.id);

  if (snapshot) {
    if (snapshot.permission_value !== null) {
      await channel.permissionOverwrites.edit(targetRole, {
        SendMessages: Boolean(snapshot.permission_value),
        AddReactions: null,
      });
    } else {
      await channel.permissionOverwrites.edit(targetRole, {
        SendMessages: null,
        AddReactions: null,
      });
    }
    await snapshot.destroy();
  } else if (existingOverwrite) {
    await channel.permissionOverwrites.edit(targetRole, {
      SendMessages: null,
      AddReactions: null,
    });
  }

  await sendModLog({
    guild,
    category: "CHANNELS",
    title: "Channel Unlocked",
    description: `Channel ${channel} unlocked by ${moderator?.tag || moderator?.username || "Staff"}.`,
    level: "SUCCESS",
    actor: moderator,
    extraFields: {
      Target: usingVerifiedRole ? `@${verifiedRoleName}` : "@everyone",
    },
  });

  return {
    success: true,
    channel,
    targetRole,
    usingVerifiedRole,
    verifiedRoleName,
  };
}

/**
 * Hides a channel from target role (ViewChannel -> false)
 */
export async function hideChannel({ channel, guild, moderator = null }) {
  const { role: targetRole, usingVerifiedRole, verifiedRoleName } = await resolveTargetRole(guild);

  const existingSnapshot = await ChannelPermissionSnapshot.findOne({
    where: {
      guild_id: String(guild.id),
      channel_id: String(channel.id),
      target_id: String(targetRole.id),
      permission_name: "ViewChannel",
    },
  });

  if (existingSnapshot) {
    return { alreadyHidden: true, channel, targetRole, usingVerifiedRole, verifiedRoleName };
  }

  const existingOverwrite = channel.permissionOverwrites.cache.get(targetRole.id);
  const prevViewChannel =
    existingOverwrite?.allow.has(PermissionFlagsBits.ViewChannel) ? true
      : existingOverwrite?.deny.has(PermissionFlagsBits.ViewChannel) ? false
        : null;

  await ChannelPermissionSnapshot.create({
    guild_id: String(guild.id),
    channel_id: String(channel.id),
    target_id: String(targetRole.id),
    permission_name: "ViewChannel",
    permission_value: prevViewChannel,
  });

  await channel.permissionOverwrites.edit(targetRole, {
    ViewChannel: false,
  });

  await sendModLog({
    guild,
    category: "CHANNELS",
    title: "Channel Hidden",
    description: `Channel ${channel} hidden by ${moderator?.tag || moderator?.username || "Staff"}.`,
    level: "WARNING",
    actor: moderator,
    extraFields: {
      Target: usingVerifiedRole ? `@${verifiedRoleName}` : "@everyone",
    },
  });

  return {
    success: true,
    channel,
    targetRole,
    usingVerifiedRole,
    verifiedRoleName,
  };
}

/**
 * Unhides a channel by restoring snapshot
 */
export async function unhideChannel({ channel, guild, moderator = null }) {
  const { role: targetRole, usingVerifiedRole, verifiedRoleName } = await resolveTargetRole(guild);

  const snapshot = await ChannelPermissionSnapshot.findOne({
    where: {
      guild_id: String(guild.id),
      channel_id: String(channel.id),
      target_id: String(targetRole.id),
      permission_name: "ViewChannel",
    },
  });

  const existingOverwrite = channel.permissionOverwrites.cache.get(targetRole.id);
  const isCurrentlyHidden = existingOverwrite?.deny.has(PermissionFlagsBits.ViewChannel);

  if (!snapshot && !isCurrentlyHidden) {
    return { notHidden: true, channel, targetRole, usingVerifiedRole, verifiedRoleName };
  }

  if (snapshot) {
    if (snapshot.permission_value !== null) {
      await channel.permissionOverwrites.edit(targetRole, {
        ViewChannel: Boolean(snapshot.permission_value),
      });
    } else {
      await channel.permissionOverwrites.edit(targetRole, {
        ViewChannel: null,
      });
    }
    await snapshot.destroy();
  } else if (existingOverwrite) {
    await channel.permissionOverwrites.edit(targetRole, {
      ViewChannel: null,
    });
  }

  await sendModLog({
    guild,
    category: "CHANNELS",
    title: "Channel Unhidden",
    description: `Channel ${channel} made visible by ${moderator?.tag || moderator?.username || "Staff"}.`,
    level: "SUCCESS",
    actor: moderator,
    extraFields: {
      Target: usingVerifiedRole ? `@${verifiedRoleName}` : "@everyone",
    },
  });

  return {
    success: true,
    channel,
    targetRole,
    usingVerifiedRole,
    verifiedRoleName,
  };
}
