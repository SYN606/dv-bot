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
  const data = record ? record.get({ plain: true }) : null;
  configCache.set(gId, data);
  return data;
}

export async function setAutoRoleConfig(guildId, data) {
  const gId = String(guildId);
  await ensureGuild(gId);

  const defaults = {
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
    await record.update(defaults);
  }

  clearAutoRoleCache(gId);
  return record.get({ plain: true });
}

export async function getAutoRoleBlacklist(guildId) {
  const records = await RoleRestriction.findAll({
    where: {
      guild_id: String(guildId),
      feature: "AUTO_ROLE",
      restriction_type: "DENY",
    },
  });
  return records.map((r) => r.role_id);
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
