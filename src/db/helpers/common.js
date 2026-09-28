import { Guild, User } from "../models/index.js";

const guildCache = new Set();
const userCache = new Set();
const MAX_CACHE_ENTRIES = 10000;

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
}
