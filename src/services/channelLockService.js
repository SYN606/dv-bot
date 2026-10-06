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
 * Adds prefix (e.g. "locked-", "hidden-") to a channel name without duplicating
 */
export function addChannelPrefix(name, prefix, isVoice = false) {
  if (!name) return name;
  const regex = new RegExp(`(^|[-_\\s]+)${prefix}([-_\\s]+|$)`, "i");
  if (regex.test(name)) return name;

  const separator = isVoice ? " " : "-";
  return `${prefix}${separator}${name}`.slice(0, 100);
}

/**
 * Strips prefix (e.g. "locked", "(hidden|hidded)") from a channel name and cleans whitespace/hyphens
 */
export function stripChannelPrefix(name, prefixPattern) {
  if (!name) return "";
  let res = name.replace(new RegExp(`^${prefixPattern}[-_\\s]*`, "i"), "");
  res = res.replace(new RegExp(`[-_\\s]+${prefixPattern}(?=[-_\\s]|$)`, "i"), "");
  const cleaned = res.replace(/^[\s\-_]+|[\s\-_]+$/g, "").trim();
  return cleaned || name;
}

/**
 * Safely applies a prefix to a channel's name in Discord, catching rate limits or permission errors
 */
export async function applyChannelNamePrefix(channel, prefix, auditReason) {
  if (!channel || typeof channel.setName !== "function") return null;
  try {
    const currentName = channel.name;
    if (!currentName) return null;

    const isVoice = typeof channel.isVoiceBased === "function" && channel.isVoiceBased();
    const newName = addChannelPrefix(currentName, prefix, isVoice);

    if (newName && newName !== currentName) {
      await channel.setName(newName, auditReason);
      return newName;
    }
    return currentName;
  } catch (err) {
    console.warn(`[channelLockService] Could not update channel name for ${channel.id}: ${err?.message || err}`);
    return null;
  }
}

/**
 * Safely removes a prefix from a channel's name in Discord, catching rate limits or permission errors
 */
export async function removeChannelNamePrefix(channel, prefixPattern, auditReason) {
  if (!channel || typeof channel.setName !== "function") return null;
  try {
    const currentName = channel.name;
    if (!currentName) return null;

    const restoredName = stripChannelPrefix(currentName, prefixPattern);

    if (restoredName && restoredName !== currentName) {
      await channel.setName(restoredName, auditReason);
      return restoredName;
    }
    return currentName;
  } catch (err) {
    console.warn(`[channelLockService] Could not restore channel name for ${channel.id}: ${err?.message || err}`);
    return null;
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
      const roleId = String(vConfig.verified_role_id);
      const verifiedRole =
        guild.roles.cache.get(roleId) ||
        (await guild.roles.fetch(roleId).catch(() => null));
      if (verifiedRole) {
        return { role: verifiedRole, usingVerifiedRole: true, verifiedRoleName: verifiedRole.name };
      }
    }
  } catch (_) {}
  return { role: guild.roles.everyone, usingVerifiedRole: false, verifiedRoleName: null };
}

/**
 * Locks a channel for the target role (SendMessages, Threads, Reactions -> false)
 * Preserves existing permission states in ChannelPermissionSnapshot
 */
export async function lockChannel({ channel, guild, moderator = null, durationStr = null, reason = null }) {
  if (!channel || !guild) {
    return { error: "Invalid channel or guild." };
  }

  // Handle Thread channels
  if (channel.isThread?.()) {
    const botMember = guild.members.me || (await guild.members.fetchMe().catch(() => null));
    const botPerms = channel.permissionsFor?.(botMember);
    if (!botPerms?.has(PermissionFlagsBits.ManageThreads)) {
      return { error: "I need the **Manage Threads** permission to lock this thread." };
    }

    if (channel.locked) {
      return { alreadyLocked: true, isThread: true, channel };
    }

    const auditReason = `Thread locked by ${moderator?.tag || moderator?.username || "Staff"}${reason ? `: ${reason}` : ""}`;
    try {
      await channel.setLocked(true, auditReason);
      await applyChannelNamePrefix(channel, "locked", auditReason);
    } catch (err) {
      return { error: `Failed to lock thread: ${err?.message || "Discord API error"}` };
    }

    await sendModLog({
      guild,
      category: "CHANNELS",
      title: "Thread Locked",
      description: `Thread ${channel} locked by ${moderator?.tag || moderator?.username || "Staff"}.`,
      level: "WARNING",
      actor: moderator,
      extraFields: {
        Channel: `${channel.name} (\`${channel.id}\`)`,
        Reason: reason || "None",
      },
    });

    return {
      success: true,
      isThread: true,
      channel,
      targetRole: null,
      usingVerifiedRole: false,
      verifiedRoleName: null,
      durationSeconds: null,
      expiryUnix: null,
    };
  }

  // Non-thread channel: verify bot permissions
  const botMember = guild.members.me || (await guild.members.fetchMe().catch(() => null));
  const botPerms = channel.permissionsFor?.(botMember);
  if (!botPerms?.has(PermissionFlagsBits.ManageChannels) && !botPerms?.has(PermissionFlagsBits.ManageRoles)) {
    return { error: "I need the **Manage Channels** or **Manage Roles** permission in this channel to modify permissions." };
  }

  const { role: targetRole, usingVerifiedRole, verifiedRoleName } = await resolveTargetRole(guild);
  const durationSeconds = parseDuration(durationStr);

  const existingOverwrite = channel.permissionOverwrites.cache.get(targetRole.id);
  const isCurrentlyLocked = existingOverwrite?.deny.has(PermissionFlagsBits.SendMessages);

  const existingSnapshot = await ChannelPermissionSnapshot.findOne({
    where: {
      guild_id: String(guild.id),
      channel_id: String(channel.id),
      target_id: String(targetRole.id),
      permission_name: "SendMessages",
    },
  });

  // If already locked and no new timer is requested, notify user
  if (isCurrentlyLocked && existingSnapshot && !durationSeconds && !unlockTimers.has(channel.id)) {
    return {
      alreadyLocked: true,
      channel,
      targetRole,
      usingVerifiedRole,
      verifiedRoleName,
    };
  }

  // Snapshot previous state before editing if we don't already have an active lock snapshot
  if (!existingSnapshot) {
    const prevSendMessages =
      existingOverwrite?.allow.has(PermissionFlagsBits.SendMessages) ? true
        : existingOverwrite?.deny.has(PermissionFlagsBits.SendMessages) ? false
          : null;

    await ChannelPermissionSnapshot.create({
      guild_id: String(guild.id),
      channel_id: String(channel.id),
      target_id: String(targetRole.id),
      permission_name: "SendMessages",
      permission_value: prevSendMessages,
    });
  }

  const auditReason = `Channel locked by ${moderator?.tag || moderator?.username || "Staff"}${reason ? `: ${reason}` : ""}`;

  try {
    await channel.permissionOverwrites.edit(
      targetRole,
      {
        SendMessages: false,
        SendMessagesInThreads: false,
        CreatePublicThreads: false,
        CreatePrivateThreads: false,
        AddReactions: false,
      },
      { reason: auditReason }
    );
    await applyChannelNamePrefix(channel, "locked", auditReason);
  } catch (err) {
    return { error: `Failed to edit channel permissions: ${err?.message || "Discord API error"}` };
  }

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
        await unlockChannel({ channel, guild, moderator: null, reason: "Temporary lock duration expired" });
        await channel.send({ content: `🔓 **Channel Unlocked**: The temporary lock duration has expired.` }).catch(() => {});
      } catch (_) {}
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
      Channel: `${channel.name} (\`${channel.id}\`)`,
      Target: usingVerifiedRole ? `@${verifiedRoleName}` : "@everyone",
      Duration: durationStr || "Indefinite",
      Reason: reason || "None",
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
 * Unlocks a channel by restoring snapshot or neutralizing denies
 */
export async function unlockChannel({ channel, guild, moderator = null, reason = null }) {
  if (!channel || !guild) {
    return { error: "Invalid channel or guild." };
  }

  // Handle Thread channels
  if (channel.isThread?.()) {
    const botMember = guild.members.me || (await guild.members.fetchMe().catch(() => null));
    const botPerms = channel.permissionsFor?.(botMember);
    if (!botPerms?.has(PermissionFlagsBits.ManageThreads)) {
      return { error: "I need the **Manage Threads** permission to unlock this thread." };
    }

    if (!channel.locked) {
      return { notLocked: true, isThread: true, channel };
    }

    const auditReason = `Thread unlocked by ${moderator?.tag || moderator?.username || "Staff"}${reason ? `: ${reason}` : ""}`;
    try {
      await channel.setLocked(false, auditReason);
      await removeChannelNamePrefix(channel, "locked", auditReason);
    } catch (err) {
      return { error: `Failed to unlock thread: ${err?.message || "Discord API error"}` };
    }

    await sendModLog({
      guild,
      category: "CHANNELS",
      title: "Thread Unlocked",
      description: `Thread ${channel} unlocked by ${moderator?.tag || moderator?.username || "Staff"}.`,
      level: "SUCCESS",
      actor: moderator,
      extraFields: {
        Channel: `${channel.name} (\`${channel.id}\`)`,
        Reason: reason || "None",
      },
    });

    return {
      success: true,
      isThread: true,
      channel,
      targetRole: null,
      usingVerifiedRole: false,
      verifiedRoleName: null,
    };
  }

  // Non-thread channel: verify bot permissions
  const botMember = guild.members.me || (await guild.members.fetchMe().catch(() => null));
  const botPerms = channel.permissionsFor?.(botMember);
  if (!botPerms?.has(PermissionFlagsBits.ManageChannels) && !botPerms?.has(PermissionFlagsBits.ManageRoles)) {
    return { error: "I need the **Manage Channels** or **Manage Roles** permission in this channel to modify permissions." };
  }

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
  const isCurrentlyDenied = existingOverwrite?.deny.has(PermissionFlagsBits.SendMessages);

  if (!snapshot && !isCurrentlyDenied) {
    return { notLocked: true, channel, targetRole, usingVerifiedRole, verifiedRoleName };
  }

  const auditReason = `Channel unlocked by ${moderator?.tag || moderator?.username || "Staff"}${reason ? `: ${reason}` : ""}`;

  // When restoring:
  // If snapshot was explicitly true, restore true.
  // Otherwise restore null (neutral / inherit).
  // CRITICAL: NEVER restore false on an unlock command!
  const restoredSendMessages = snapshot?.permission_value === true ? true : null;

  try {
    await channel.permissionOverwrites.edit(
      targetRole,
      {
        SendMessages: restoredSendMessages,
        SendMessagesInThreads: null,
        CreatePublicThreads: null,
        CreatePrivateThreads: null,
        AddReactions: null,
      },
      { reason: auditReason }
    );
    await removeChannelNamePrefix(channel, "locked", auditReason);
  } catch (err) {
    return { error: `Failed to restore channel permissions: ${err?.message || "Discord API error"}` };
  }

  if (snapshot) {
    await snapshot.destroy();
  }

  await sendModLog({
    guild,
    category: "CHANNELS",
    title: "Channel Unlocked",
    description: `Channel ${channel} unlocked by ${moderator?.tag || moderator?.username || "Staff"}.`,
    level: "SUCCESS",
    actor: moderator,
    extraFields: {
      Channel: `${channel.name} (\`${channel.id}\`)`,
      Target: usingVerifiedRole ? `@${verifiedRoleName}` : "@everyone",
      Reason: reason || "None",
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
export async function hideChannel({ channel, guild, moderator = null, reason = null }) {
  if (!channel || !guild) {
    return { error: "Invalid channel or guild." };
  }

  if (channel.isThread?.()) {
    return { error: "Threads cannot be hidden individually. Hide the parent channel instead." };
  }

  const botMember = guild.members.me || (await guild.members.fetchMe().catch(() => null));
  const botPerms = channel.permissionsFor?.(botMember);
  if (!botPerms?.has(PermissionFlagsBits.ManageChannels) && !botPerms?.has(PermissionFlagsBits.ManageRoles)) {
    return { error: "I need the **Manage Channels** or **Manage Roles** permission in this channel to modify visibility." };
  }

  const { role: targetRole, usingVerifiedRole, verifiedRoleName } = await resolveTargetRole(guild);

  const existingSnapshot = await ChannelPermissionSnapshot.findOne({
    where: {
      guild_id: String(guild.id),
      channel_id: String(channel.id),
      target_id: String(targetRole.id),
      permission_name: "ViewChannel",
    },
  });

  const existingOverwrite = channel.permissionOverwrites.cache.get(targetRole.id);
  const isCurrentlyHidden = existingOverwrite?.deny.has(PermissionFlagsBits.ViewChannel);

  if (existingSnapshot && isCurrentlyHidden) {
    return { alreadyHidden: true, channel, targetRole, usingVerifiedRole, verifiedRoleName };
  }

  if (!existingSnapshot) {
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
  }

  const auditReason = `Channel hidden by ${moderator?.tag || moderator?.username || "Staff"}${reason ? `: ${reason}` : ""}`;

  try {
    await channel.permissionOverwrites.edit(
      targetRole,
      {
        ViewChannel: false,
      },
      { reason: auditReason }
    );
    await applyChannelNamePrefix(channel, "hidden", auditReason);
  } catch (err) {
    return { error: `Failed to edit channel visibility: ${err?.message || "Discord API error"}` };
  }

  await sendModLog({
    guild,
    category: "CHANNELS",
    title: "Channel Hidden",
    description: `Channel ${channel} hidden by ${moderator?.tag || moderator?.username || "Staff"}.`,
    level: "WARNING",
    actor: moderator,
    extraFields: {
      Channel: `${channel.name} (\`${channel.id}\`)`,
      Target: usingVerifiedRole ? `@${verifiedRoleName}` : "@everyone",
      Reason: reason || "None",
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
 * Unhides a channel by restoring snapshot or neutralizing denies
 */
export async function unhideChannel({ channel, guild, moderator = null, reason = null }) {
  if (!channel || !guild) {
    return { error: "Invalid channel or guild." };
  }

  if (channel.isThread?.()) {
    return { error: "Threads do not have individual visibility settings. Unhide the parent channel instead." };
  }

  const botMember = guild.members.me || (await guild.members.fetchMe().catch(() => null));
  const botPerms = channel.permissionsFor?.(botMember);
  if (!botPerms?.has(PermissionFlagsBits.ManageChannels) && !botPerms?.has(PermissionFlagsBits.ManageRoles)) {
    return { error: "I need the **Manage Channels** or **Manage Roles** permission in this channel to modify visibility." };
  }

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

  const auditReason = `Channel unhidden by ${moderator?.tag || moderator?.username || "Staff"}${reason ? `: ${reason}` : ""}`;

  // When restoring:
  // If snapshot was explicitly true, restore true.
  // Otherwise restore null (neutral / inherit).
  // CRITICAL: NEVER restore false on an unhide command!
  const restoredViewChannel = snapshot?.permission_value === true ? true : null;

  try {
    await channel.permissionOverwrites.edit(
      targetRole,
      {
        ViewChannel: restoredViewChannel,
      },
      { reason: auditReason }
    );
    await removeChannelNamePrefix(channel, "(hidden|hidded)", auditReason);
  } catch (err) {
    return { error: `Failed to restore channel visibility: ${err?.message || "Discord API error"}` };
  }

  if (snapshot) {
    await snapshot.destroy();
  }

  await sendModLog({
    guild,
    category: "CHANNELS",
    title: "Channel Unhidden",
    description: `Channel ${channel} made visible by ${moderator?.tag || moderator?.username || "Staff"}.`,
    level: "SUCCESS",
    actor: moderator,
    extraFields: {
      Channel: `${channel.name} (\`${channel.id}\`)`,
      Target: usingVerifiedRole ? `@${verifiedRoleName}` : "@everyone",
      Reason: reason || "None",
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
