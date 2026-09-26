import { SupporterConfig } from "../models/index.js";
import { ensureGuild } from "./common.js";

const supporterCache = new Map();

export function clearSupporterCache(guildId = null) {
  if (guildId) {
    supporterCache.delete(String(guildId));
  } else {
    supporterCache.clear();
  }
}

export async function getSupporterConfig(guildId) {
  const gId = String(guildId);
  if (supporterCache.has(gId)) {
    return supporterCache.get(gId);
  }

  const record = await SupporterConfig.findOne({ where: { guild_id: gId } });
  const data = record ? record.get({ plain: true }) : null;
  supporterCache.set(gId, data);
  return data;
}

export async function setSupporterConfig(guildId, data) {
  const gId = String(guildId);
  await ensureGuild(gId);

  const defaults = {
    enabled: typeof data.enabled === 'boolean' ? data.enabled : false,
    vanity_text: data.vanity_text || "",
    vanity_role_id: data.vanity_role_id || "",
    vanity_channel_id: data.vanity_channel_id || "",
    vanity_message: data.vanity_message || "",
    clan_role_id: data.clan_role_id || "",
    clan_channel_id: data.clan_channel_id || "",
    clan_message: data.clan_message || "",
  };

  const [record, created] = await SupporterConfig.findOrCreate({
    where: { guild_id: gId },
    defaults: { guild_id: gId, ...defaults },
  });

  if (!created) {
    await record.update(defaults);
  }

  clearSupporterCache(gId);
  return record.get({ plain: true });
}
