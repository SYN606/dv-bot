import { AFK } from "../models/index.js";
import { ensureGuildAndUser, ensureUser } from "./common.js";

const afkCache = new Map();

export function getAfkCacheKey(userId, guildId = null) {
  return `${userId}:${guildId || "global"}`;
}

export function clearAfkCache(userId = null) {
  if (userId) {
    for (const key of afkCache.keys()) {
      if (key.startsWith(`${userId}:`)) afkCache.delete(key);
    }
  } else {
    afkCache.clear();
  }
}

export async function getAfkStatus(userId, guildId = null) {
  const uId = String(userId);
  const gId = guildId ? String(guildId) : null;

  const where = { user_id: uId };
  if (gId) {
    where.guild_id = gId;
  } else {
    where.is_global = true;
  }

  return await AFK.findOne({ where });
}

export async function setAfkStatus(userId, guildId, reason, isGlobal = false, originalNickname = null) {
  const uId = String(userId);
  const gId = guildId ? String(guildId) : null;

  if (gId) {
    await ensureGuildAndUser(gId, uId);
  } else {
    await ensureUser(uId);
  }

  const [record, created] = await AFK.findOrCreate({
    where: {
      user_id: uId,
      guild_id: isGlobal ? null : gId,
    },
    defaults: {
      user_id: uId,
      guild_id: isGlobal ? null : gId,
      afk_reason: reason,
      since: Math.floor(Date.now() / 1000),
      is_global: isGlobal,
      original_nickname: originalNickname,
    },
  });

  if (!created) {
    record.afk_reason = reason;
    record.since = Math.floor(Date.now() / 1000);
    record.is_global = isGlobal;
    if (originalNickname) record.original_nickname = originalNickname;
    await record.save();
  }

  clearAfkCache(uId);
  return record;
}

export async function removeAfkStatus(userId, guildId = null) {
  const uId = String(userId);
  const gId = guildId ? String(guildId) : null;

  const where = { user_id: uId };
  if (gId) {
    where.guild_id = gId;
  }

  const deleted = await AFK.destroy({ where });
  clearAfkCache(uId);
  return deleted > 0;
}
