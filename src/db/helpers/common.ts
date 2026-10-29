import { Guild, User, SystemMeta } from "../models/index.js";

const guildCache = new Set();
const userCache = new Set();
const metaCache = new Map();
const MAX_CACHE_ENTRIES = 10000;

export async function getSystemMeta(key) {
  const k = String(key);
  if (metaCache.has(k)) return metaCache.get(k);
  try {
    const record = await SystemMeta.findByPk(k);
    const val = record ? record.value : null;
    metaCache.set(k, val);
    return val;
  } catch {
    return null;
  }
}

export async function setSystemMeta(key, value) {
  const k = String(key);
  const v = String(value);
  try {
    const [record, created]: any = await SystemMeta.findOrCreate({
      where: { key: k },
      defaults: { key: k, value: v },
    });
    if (!created) {
      record.value = v;
      await record.save();
    }
    metaCache.set(k, v);
    return v;
  } catch (err) {
    metaCache.set(k, v);
    return v;
  }
}

export async function ensureGuild(guildId) {
  const gId = String(guildId);
  if (guildCache.has(gId)) return;

  await Guild.findOrCreate({
    where: { guild_id: gId },
    defaults: { guild_id: gId },
  });

  if (guildCache.size >= MAX_CACHE_ENTRIES) guildCache.clear();
  guildCache.add(gId);
}

export async function ensureUser(userId) {
  const uId = String(userId);
  if (userCache.has(uId)) return;

  await User.findOrCreate({
    where: { user_id: uId },
    defaults: { user_id: uId },
  });

  if (userCache.size >= MAX_CACHE_ENTRIES) userCache.clear();
  userCache.add(uId);
}

export async function ensureGuildAndUser(guildId, userId) {
  await Promise.all([ensureGuild(guildId), ensureUser(userId)]);
}

export function clearEntityCache() {
  guildCache.clear();
  userCache.clear();
  metaCache.clear();
}
