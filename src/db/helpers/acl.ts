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

export function normalizeFeature(feature) {
  const s = String(feature || "").trim().toLowerCase();
  if (s.startsWith("category:")) return s;
  return s.replace(/^\//, "");
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
  const feat = normalizeFeature(feature);
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

export async function removeChannelRestrictionByTarget(guildId, channelId, feature, restrictionType = null) {
  const gId = String(guildId);
  const cId = String(channelId);
  const feat = normalizeFeature(feature);

  const where = {
    guild_id: gId,
    channel_id: cId,
    feature: feat,
  };
  if (restrictionType) {
    where.restriction_type = String(restrictionType).toLowerCase().trim();
  }

  const deleted = await ChannelRestriction.destroy({ where });
  invalidateAclCache(gId);
  return deleted > 0;
}

export async function getGuildChannelRules(guildId) {
  const acl = await getGuildAcl(guildId);
  const rulesByFeature = {};

  for (const c of acl.channels) {
    const feat = normalizeFeature(c.feature);
    if (!rulesByFeature[feat]) {
      rulesByFeature[feat] = {
        feature: feat,
        isCategory: feat.startsWith("category:"),
        allowChannels: [],
        denyChannels: [],
      };
    }

    if (c.type === "allow") {
      if (!rulesByFeature[feat].allowChannels.includes(c.channelId)) {
        rulesByFeature[feat].allowChannels.push(c.channelId);
      }
    } else if (c.type === "deny") {
      if (!rulesByFeature[feat].denyChannels.includes(c.channelId)) {
        rulesByFeature[feat].denyChannels.push(c.channelId);
      }
    }
  }

  // Format into clean mode + channels
  const formatted = {};
  for (const [feat, data] of Object.entries(rulesByFeature)) {
    const hasAllow = data.allowChannels.length > 0;
    const hasDeny = data.denyChannels.length > 0;
    const mode = hasAllow ? "enable_only" : hasDeny ? "disable_only" : "everywhere";
    const channels = hasAllow ? data.allowChannels : data.denyChannels;

    formatted[feat] = {
      feature: feat,
      isCategory: data.isCategory,
      mode,
      channels,
      allowChannels: data.allowChannels,
      denyChannels: data.denyChannels,
    };
  }

  return formatted;
}

export async function setChannelRulesForTarget(guildId, feature, mode = "everywhere", channelIds = []) {
  const gId = String(guildId);
  const feat = normalizeFeature(feature);
  await ensureGuild(gId);

  // 1. Delete existing channel restriction records for this feature
  await ChannelRestriction.destroy({
    where: {
      guild_id: gId,
      feature: feat,
    },
  });

  const normalizedMode = String(mode).toLowerCase().trim();
  const cleanIds = Array.from(
    new Set((Array.isArray(channelIds) ? channelIds : [channelIds]).filter(Boolean).map(String))
  );

  if (normalizedMode === "enable_only" || normalizedMode === "allow") {
    for (const cId of cleanIds) {
      await ChannelRestriction.create({
        guild_id: gId,
        channel_id: cId,
        feature: feat,
        restriction_type: "allow",
      });
    }
  } else if (normalizedMode === "disable_only" || normalizedMode === "deny") {
    for (const cId of cleanIds) {
      await ChannelRestriction.create({
        guild_id: gId,
        channel_id: cId,
        feature: feat,
        restriction_type: "deny",
      });
    }
  }

  invalidateAclCache(gId);
  return await getGuildChannelRules(gId);
}

export async function clearChannelRulesForTarget(guildId, feature) {
  const gId = String(guildId);
  const feat = normalizeFeature(feature);
  await ChannelRestriction.destroy({
    where: {
      guild_id: gId,
      feature: feat,
    },
  });
  invalidateAclCache(gId);
  return true;
}

/**
 * Unified ACL policy evaluation engine
 * Checks Role & Channel Whitelists/Blacklists against the invoking member & channel.
 */
export async function isExecutionAllowed(guildId, channelId, member, commandName, categoryName = null) {
  if (!guildId) return { allowed: true };

  const gId = String(guildId);
  const cId = String(channelId);
  const cmd = normalizeFeature(commandName);
  const cat = categoryName ? normalizeFeature(categoryName).replace(/^category:/, "") : null;

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
    const f = normalizeFeature(feat);
    if (f === "all" || f === "*") return true;
    if (f === cmd || f === `command:${cmd}`) return true;
    if (cat && (f === cat || f === `category:${cat}`)) return true;
    return false;
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

  // 3. Channel Blacklists ("disable only in" / deny)
  // Check command-specific blacklist
  const isCmdBlacklisted = acl.channels.some(
    (c) =>
      c.type === "deny" &&
      c.channelId === cId &&
      (normalizeFeature(c.feature) === cmd || normalizeFeature(c.feature) === `command:${cmd}`)
  );
  if (isCmdBlacklisted) {
    return {
      allowed: false,
      reason: `The command \`/${cmd}\` is disabled in this channel.`,
    };
  }

  // Check category-specific blacklist
  const isCatBlacklisted =
    cat &&
    acl.channels.some(
      (c) =>
        c.type === "deny" &&
        c.channelId === cId &&
        (normalizeFeature(c.feature) === cat || normalizeFeature(c.feature) === `category:${cat}`)
    );
  if (isCatBlacklisted) {
    const formattedCat = cat.charAt(0).toUpperCase() + cat.slice(1);
    return {
      allowed: false,
      reason: `Commands in category **${formattedCat}** are disabled in this channel.`,
    };
  }

  // Check global channel blacklist
  const isGlobalBlacklisted = acl.channels.some(
    (c) =>
      c.type === "deny" &&
      c.channelId === cId &&
      (normalizeFeature(c.feature) === "all" || normalizeFeature(c.feature) === "*")
  );
  if (isGlobalBlacklisted) {
    return {
      allowed: false,
      reason: "Bot commands are disabled in this channel.",
    };
  }

  // 4. Channel Whitelists ("enable only in" / allow)
  // Check command-level whitelist first:
  const cmdWhitelists = acl.channels.filter(
    (c) =>
      c.type === "allow" &&
      (normalizeFeature(c.feature) === cmd || normalizeFeature(c.feature) === `command:${cmd}`)
  );
  if (cmdWhitelists.length > 0) {
    const isWhitelisted = cmdWhitelists.some((c) => c.channelId === cId);
    if (!isWhitelisted) {
      return {
        allowed: false,
        reason: `The command \`/${cmd}\` can only be used in designated channels.`,
      };
    }
  } else if (cat) {
    // If no command-level whitelist, check category-level whitelist:
    const catWhitelists = acl.channels.filter(
      (c) =>
        c.type === "allow" &&
        (normalizeFeature(c.feature) === cat || normalizeFeature(c.feature) === `category:${cat}`)
    );
    if (catWhitelists.length > 0) {
      const isWhitelisted = catWhitelists.some((c) => c.channelId === cId);
      if (!isWhitelisted) {
        const formattedCat = cat.charAt(0).toUpperCase() + cat.slice(1);
        return {
          allowed: false,
          reason: `Category **${formattedCat}** commands can only be used in designated channels.`,
        };
      }
    }
  } else {
    // Global whitelist
    const globalWhitelists = acl.channels.filter(
      (c) =>
        c.type === "allow" &&
        (normalizeFeature(c.feature) === "all" || normalizeFeature(c.feature) === "*")
    );
    if (globalWhitelists.length > 0) {
      const isWhitelisted = globalWhitelists.some((c) => c.channelId === cId);
      if (!isWhitelisted) {
        return {
          allowed: false,
          reason: "Bot commands can only be used in designated channels.",
        };
      }
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
