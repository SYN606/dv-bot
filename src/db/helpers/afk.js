import { AFK } from "../models/index.js";
import { ensureGuildAndUser, ensureUser } from "./common.js";

// In-memory zero-query filter and full status cache
const activeAfkUserIds = new Set();
const afkCache = new Map();

export function getAfkCacheKey(userId, guildId = null) {
  return `${userId}:${guildId || "global"}`;
}

export async function initAfkCache() {
  try {
    const records = await AFK.findAll({ attributes: ["user_id", "guild_id", "afk_reason", "since", "is_global", "original_nickname"] });
    activeAfkUserIds.clear();
    afkCache.clear();
    for (const r of records) {
      const uId = String(r.user_id);
      activeAfkUserIds.add(uId);
      const key = getAfkCacheKey(uId, r.guild_id);
      afkCache.set(key, r);
    }
  } catch (err) {
    console.error("[AFK CACHE INIT ERROR]:", err);
  }
}

export function clearAfkCache(userId = null) {
  if (userId) {
    const uId = String(userId);
    for (const key of afkCache.keys()) {
      if (key.startsWith(`${uId}:`)) afkCache.delete(key);
    }
    // Check if user still has any other guild afk
    let stillAfk = false;
    for (const key of afkCache.keys()) {
      if (key.startsWith(`${uId}:`)) {
        stillAfk = true;
        break;
      }
    }
    if (!stillAfk) activeAfkUserIds.delete(uId);
  } else {
    afkCache.clear();
    activeAfkUserIds.clear();
  }
}

export async function getAfkStatus(userId, guildId = null) {
  const uId = String(userId);
  // Fast path: 0ms lookup without DB query
  if (!activeAfkUserIds.has(uId)) {
    return null;
  }

  const gId = guildId ? String(guildId) : null;
  const key = getAfkCacheKey(uId, gId);

  if (afkCache.has(key)) {
    return afkCache.get(key);
  }

  // Fallback to global if guild-specific not found
  const globalKey = getAfkCacheKey(uId, null);
  if (afkCache.has(globalKey)) {
    return afkCache.get(globalKey);
  }

  const where = { user_id: uId };
  if (gId) {
    where.guild_id = gId;
  } else {
    where.is_global = true;
  }

  const record = await AFK.findOne({ where });
  if (record) {
    afkCache.set(key, record);
  }
  return record;
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

  activeAfkUserIds.add(uId);
  const key = getAfkCacheKey(uId, isGlobal ? null : gId);
  afkCache.set(key, record);

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
