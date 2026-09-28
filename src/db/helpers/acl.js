import { PermissionFlagsBits } from "discord.js";
import { RoleRestriction, ChannelRestriction } from "../models/index.js";
import { ensureGuild } from "./common.js";
import { isBotAdmin } from "../../core/permissions.js";

// Fast in-memory cache of ACL rules per guild
const aclCache = new Map();

export function invalidateAclCache(guildId = null) {
  if (guildId) {
    aclCache.delete(String(guildId));
  } else {
    aclCache.clear();
  }
}

export async function getGuildAcl(guildId) {
  const gId = String(guildId);
  if (aclCache.has(gId)) {
    return aclCache.get(gId);
  }

  const [roles, channels] = await Promise.all([
    RoleRestriction.findAll({ where: { guild_id: gId } }),
    ChannelRestriction.findAll({ where: { guild_id: gId } }),
  ]);

  const data = {
    roles: roles.map((r) => ({
      id: r.id,
      roleId: String(r.role_id),
      feature: r.feature.toLowerCase(),
      type: r.restriction_type.toLowerCase(),
    })),
    channels: channels.map((c) => ({
      id: c.id,
      channelId: String(c.channel_id),
      feature: c.feature.toLowerCase(),
      type: c.restriction_type.toLowerCase(),
    })),
  };

  aclCache.set(gId, data);
  return data;
}

export async function addRoleRestriction(guildId, roleId, feature = "all", restrictionType = "deny") {
  const gId = String(guildId);
  const rId = String(roleId);
  const feat = feature.toLowerCase().trim();
  const type = restrictionType.toLowerCase().trim();

  await ensureGuild(gId);

  const [record, created] = await RoleRestriction.findOrCreate({
    where: {
      guild_id: gId,
      role_id: rId,
      feature: feat,
      restriction_type: type,
    },
    defaults: {
      guild_id: gId,
      role_id: rId,
      feature: feat,
      restriction_type: type,
    },
  });

  invalidateAclCache(gId);
  return { record, created };
}

export async function removeRoleRestriction(guildId, restrictionId) {
  const gId = String(guildId);
  const deleted = await RoleRestriction.destroy({
    where: {
      id: restrictionId,
      guild_id: gId,
    },
  });
  invalidateAclCache(gId);
  return deleted > 0;
}

export async function addChannelRestriction(guildId, channelId, feature = "all", restrictionType = "deny") {
  const gId = String(guildId);
  const cId = String(channelId);
  const feat = feature.toLowerCase().trim();
  const type = restrictionType.toLowerCase().trim();

  await ensureGuild(gId);

  const [record, created] = await ChannelRestriction.findOrCreate({
    where: {
      guild_id: gId,
      channel_id: cId,
      feature: feat,
      restriction_type: type,
    },
    defaults: {
      guild_id: gId,
      channel_id: cId,
      feature: feat,
      restriction_type: type,
    },
  });

  invalidateAclCache(gId);
  return { record, created };
}

export async function removeChannelRestriction(guildId, restrictionId) {
  const gId = String(guildId);
  const deleted = await ChannelRestriction.destroy({
    where: {
      id: restrictionId,
      guild_id: gId,
    },
  });
  invalidateAclCache(gId);
  return deleted > 0;
}

/**
 * Unified ACL policy evaluation engine
 * Checks Role & Channel Whitelists/Blacklists against the invoking member & channel.
 */
export async function isExecutionAllowed(guildId, channelId, member, commandName) {
  if (!guildId) return { allowed: true };

  const gId = String(guildId);
  const cId = String(channelId);
  const cmd = String(commandName).toLowerCase().trim();

  // 1. Admin & Bot Admin authority always bypasses restrictions
  if (
    member?.permissions?.has?.(PermissionFlagsBits.Administrator) ||
    (member?.permissions?.has && member.permissions.has("Administrator")) ||
    (await isBotAdmin({ member, guild: member?.guild || { id: gId, ownerId: null }, user: member?.user }))
  ) {
    return { allowed: true };
  }

  const acl = await getGuildAcl(gId);
  const memberRoles = member?.roles?.cache ? new Set(member.roles.cache.keys()) : new Set();

  function matchesFeature(feat) {
    return feat === "all" || feat === "*" || feat === cmd || feat === `command:${cmd}`;
  }

  // 2. Role Blacklists (deny)
  const blacklistedRoles = acl.roles.filter((r) => r.type === "deny" && matchesFeature(r.feature));
  for (const rule of blacklistedRoles) {
    if (memberRoles.has(rule.roleId)) {
      return {
        allowed: false,
        reason: "You have a role that is blacklisted from executing this command.",
      };
    }
  }

  // 3. Channel Blacklists (deny)
  const isChannelBlacklisted = acl.channels.some(
    (c) => c.type === "deny" && c.channelId === cId && matchesFeature(c.feature)
  );
  if (isChannelBlacklisted) {
    return {
      allowed: false,
      reason: "This command cannot be used in this channel.",
    };
  }

  // 4. Channel Whitelists (allow)
  const channelWhitelists = acl.channels.filter((c) => c.type === "allow" && matchesFeature(c.feature));
  if (channelWhitelists.length > 0) {
    const isWhitelisted = channelWhitelists.some((c) => c.channelId === cId);
    if (!isWhitelisted) {
      return {
        allowed: false,
        reason: "This command can only be used in designated bot channels.",
      };
    }
  }

  // 5. Role Whitelists (allow)
  const roleWhitelists = acl.roles.filter((r) => r.type === "allow" && matchesFeature(r.feature));
  if (roleWhitelists.length > 0) {
    const hasAllowedRole = roleWhitelists.some((r) => memberRoles.has(r.roleId));
    if (!hasAllowedRole) {
      return {
        allowed: false,
        reason: "You do not have the required role to use this command.",
      };
    }
  }

  return { allowed: true };
}
