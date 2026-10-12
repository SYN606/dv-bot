import { AFK } from "../models/index.js";
import { ensureGuildAndUser } from "./common.js";

// In-memory zero-query filter and full status cache: `${userId}:${guildId}` -> record
const activeAfkUserIds = new Set();
const afkCache = new Map();
const MAX_AFK_CACHE = 5000;

// Per-user-guild lock queue to serialize concurrent mention additions without race conditions
const mentionQueues = new Map();

export function getAfkCacheKey(userId, guildId) {
  return `${userId}:${guildId}`;
}

export function isUserAfkQuick(userId, guildId) {
  if (!userId || !guildId) return false;
  const uId = String(userId);
  if (!activeAfkUserIds.has(uId)) return false;
  const key = getAfkCacheKey(uId, String(guildId));
  return afkCache.has(key);
}

function setBoundedCache(key, value) {
  if (afkCache.size >= MAX_AFK_CACHE && !afkCache.has(key)) {
    const oldestKey = afkCache.keys().next().value;
    if (oldestKey) afkCache.delete(oldestKey);
  }
  afkCache.set(key, value);
}

export async function initAfkCache() {
  try {
    const records = await AFK.findAll({
      attributes: ["user_id", "guild_id", "afk_reason", "since", "original_nickname", "mentions"],
    });
    activeAfkUserIds.clear();
    afkCache.clear();
    for (const r of records) {
      if (!r.guild_id) continue;
      const uId = String(r.user_id);
      const gId = String(r.guild_id);
      activeAfkUserIds.add(uId);
      const key = getAfkCacheKey(uId, gId);
      setBoundedCache(key, r);
    }
  } catch (err) {
    console.error("[AFK CACHE INIT ERROR]:", err);
  }
}

export function clearAfkCache(userId = null, guildId = null) {
  if (userId && guildId) {
    const uId = String(userId);
    const gId = String(guildId);
    const key = getAfkCacheKey(uId, gId);
    afkCache.delete(key);
    mentionQueues.delete(key);

    let hasOtherGuildAfk = false;
    for (const k of afkCache.keys()) {
      if (k.startsWith(`${uId}:`)) {
        hasOtherGuildAfk = true;
        break;
      }
    }
    if (!hasOtherGuildAfk) activeAfkUserIds.delete(uId);
  } else if (userId) {
    const uId = String(userId);
    for (const key of afkCache.keys()) {
      if (key.startsWith(`${uId}:`)) {
        afkCache.delete(key);
        mentionQueues.delete(key);
      }
    }
    activeAfkUserIds.delete(uId);
  } else {
    afkCache.clear();
    activeAfkUserIds.clear();
    mentionQueues.clear();
  }
}

export async function getAfkStatus(userId, guildId) {
  if (!userId || !guildId) return null;
  const uId = String(userId);
  const gId = String(guildId);

  // Fast path: 0ms lookup without DB query
  if (!activeAfkUserIds.has(uId)) {
    return null;
  }

  const key = getAfkCacheKey(uId, gId);
  if (afkCache.has(key)) {
    return afkCache.get(key);
  }

  const record = await AFK.findOne({ where: { user_id: uId, guild_id: gId } });
  if (record) {
    setBoundedCache(key, record);
    activeAfkUserIds.add(uId);
  }
  return record;
}

export async function setAfkStatus(userId, guildId, reason, originalNickname = null) {
  if (!userId || !guildId) throw new Error("userId and guildId are required for local AFK status.");
  const uId = String(userId);
  const gId = String(guildId);

  await ensureGuildAndUser(gId, uId);

  // If user was already AFK, preserve their true original nickname if the passed nickname is [AFK] ...
  const existing = await getAfkStatus(uId, gId);
  let nickToSave = originalNickname;
  if (existing && existing.original_nickname !== undefined) {
    if (nickToSave === null || (typeof nickToSave === "string" && nickToSave.startsWith("[AFK]"))) {
      nickToSave = existing.original_nickname;
    }
  }

  const [record, created] = await AFK.findOrCreate({
    where: {
      user_id: uId,
      guild_id: gId,
    },
    defaults: {
      user_id: uId,
      guild_id: gId,
      afk_reason: reason,
      since: Math.floor(Date.now() / 1000),
      original_nickname: nickToSave,
      mentions: "[]",
    },
  });

  if (!created) {
    record.afk_reason = reason;
    record.since = Math.floor(Date.now() / 1000);
    record.mentions = "[]";
    if (nickToSave !== undefined) {
      record.original_nickname = nickToSave;
    }
    await record.save();
  }

  activeAfkUserIds.add(uId);
  const key = getAfkCacheKey(uId, gId);
  setBoundedCache(key, record);

  return record;
}

export async function addAfkMention(userId, guildId, mentionData) {
  if (!userId || !guildId) return;
  const key = getAfkCacheKey(String(userId), String(guildId));

  // Serialize mention writes per user per guild to prevent read-modify-write race conditions
  const prevTask = mentionQueues.get(key) || Promise.resolve();
  const nextTask = prevTask
    .then(async () => {
      const status = await getAfkStatus(userId, guildId);
      if (!status) return;

      let mentions = [];
      try {
        mentions = typeof status.mentions === "string" ? JSON.parse(status.mentions || "[]") : (Array.isArray(status.mentions) ? status.mentions : []);
      } catch (_) {
        mentions = [];
      }

      mentions.push(mentionData);
      // Cap at 20 most recent mentions to prevent unbounded growth
      if (mentions.length > 20) {
        mentions = mentions.slice(-20);
      }

      const serialized = JSON.stringify(mentions);
      status.mentions = serialized;
      if (typeof status.save === "function") {
        await status.save().catch(() => {});
      } else {
        await AFK.update({ mentions: serialized }, { where: { user_id: String(userId), guild_id: String(guildId) } }).catch(() => {});
      }

      setBoundedCache(key, status);
    })
    .catch((err) => {
      console.error(`[AFK MENTION ERROR] for ${key}:`, err);
    })
    .finally(() => {
      if (mentionQueues.get(key) === nextTask) {
        mentionQueues.delete(key);
      }
    });

  mentionQueues.set(key, nextTask);
  return nextTask;
}

export async function removeAfkStatus(userId, guildId) {
  if (!userId || !guildId) return false;
  const uId = String(userId);
  const gId = String(guildId);

  const deleted = await AFK.destroy({ where: { user_id: uId, guild_id: gId } });
  clearAfkCache(uId, gId);
  return deleted > 0;
}
