import { AutoRoleRewardConfig, RoleRestriction } from "../models/index.js";
import { ensureGuild } from "./common.js";

const configCache = new Map();

export function clearAutoRoleCache(guildId = null) {
  if (guildId) {
    configCache.delete(String(guildId));
  } else {
    configCache.clear();
  }
}

export async function getAutoRoleConfig(guildId) {
  const gId = String(guildId);
  if (configCache.has(gId)) {
    return configCache.get(gId);
  }

  const record = await AutoRoleRewardConfig.findOne({ where: { guild_id: gId } });
  const data = record
    ? (typeof record.get === "function" ? record.get({ plain: true }) : (record.toJSON ? record.toJSON() : record))
    : null;
  configCache.set(gId, data);
  return data;
}

export async function setAutoRoleConfig(guildId, data) {
  const gId = String(guildId);
  await ensureGuild(gId);

  const defaults = {
    enabled: data.enabled === 1 || data.enabled === true ? 1 : 0,
    announcement_channel_id: data.announcement_channel_id || null,
    top_chat_role_1: data.top_chat_role_1 || null,
    top_chat_role_2: data.top_chat_role_2 || null,
    top_chat_role_3: data.top_chat_role_3 || null,
    top_vc_role_1: data.top_vc_role_1 || null,
    top_vc_role_2: data.top_vc_role_2 || null,
    top_vc_role_3: data.top_vc_role_3 || null,
  };

  const [record, created] = await AutoRoleRewardConfig.findOrCreate({
    where: { guild_id: gId },
    defaults: { guild_id: gId, ...defaults },
  });

  if (!created) {
    if (typeof record.update === "function") {
      await record.update(defaults);
    } else {
      Object.assign(record, defaults);
      if (typeof record.save === "function") {
        await record.save();
      }
    }
  }

  clearAutoRoleCache(gId);
  return typeof record.get === "function" ? record.get({ plain: true }) : (record.toJSON ? record.toJSON() : record);
}

export async function getAutoRoleBlacklist(guildId) {
  const records = await RoleRestriction.findAll({
    where: {
      guild_id: String(guildId),
      feature: "AUTO_ROLE",
      restriction_type: "DENY",
    },
  });
  return Array.from(new Set(records.map((r) => r.role_id)));
}

export async function addAutoRoleBlacklist(guildId, roleId) {
  const gId = String(guildId);
  await ensureGuild(gId);
  const [record, created] = await RoleRestriction.findOrCreate({
    where: {
      guild_id: gId,
      role_id: String(roleId),
      feature: "AUTO_ROLE",
      restriction_type: "DENY",
    },
    defaults: {
      guild_id: gId,
      role_id: String(roleId),
      feature: "AUTO_ROLE",
      restriction_type: "DENY",
    },
  });
  return created;
}

export async function removeAutoRoleBlacklist(guildId, roleId) {
  const deleted = await RoleRestriction.destroy({
    where: {
      guild_id: String(guildId),
      role_id: String(roleId),
      feature: "AUTO_ROLE",
      restriction_type: "DENY",
    },
  });
  return deleted > 0;
}

export async function setAutoRoleBlacklist(guildId, roleIds) {
  const gId = String(guildId);
  await ensureGuild(gId);
  const targetIds = Array.from(new Set((roleIds || []).map(String).filter(Boolean)));
  
  const existing = await getAutoRoleBlacklist(gId);
  const toAdd = targetIds.filter(id => !existing.includes(id));
  const toRemove = existing.filter(id => !targetIds.includes(id));

  for (const roleId of toRemove) {
    await removeAutoRoleBlacklist(gId, roleId);
  }
  for (const roleId of toAdd) {
    await addAutoRoleBlacklist(gId, roleId);
  }

  return targetIds;
}

