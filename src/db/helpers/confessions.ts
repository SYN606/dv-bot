import { ConfessionConfig, Confession } from "../models/index.js";
import { ensureGuild } from "./common.js";

// Fast in-memory cache for config
const configCache = new Map<string, any>();
const userCooldownMap = new Map<string, number>(); // `${guildId}:${userId}` -> timestamp

export async function getConfessionConfig(guildId: string) {
  const gId = String(guildId);
  if (configCache.has(gId)) {
    return configCache.get(gId);
  }

  await ensureGuild(gId);
  const [record, created]: any = await ConfessionConfig.findOrCreate({
    where: { guild_id: gId },
    defaults: {
      guild_id: gId,
      enabled: false,
      channel_id: null,
      review_channel_id: null,
      reviewer_role_ids: "[]",
      show_author_in_review: true,
      allow_anonymous: true,
      require_approval: true,
      auto_thread: true,
      cooldown_seconds: 60,
      banned_words: "",
      regex_filter: "",
      regex_filter_enabled: false,
      current_number: 0,
    },
  });

  const parsed = normalizeConfig(record);
  configCache.set(gId, parsed);
  return parsed;
}

export function normalizeConfig(record: any) {
  if (!record) return null;
  const raw = typeof record.toJSON === "function" ? record.toJSON() : record;

  let reviewerRoleIds: string[] = [];
  try {
    reviewerRoleIds = typeof raw.reviewer_role_ids === "string"
      ? JSON.parse(raw.reviewer_role_ids || "[]")
      : (Array.isArray(raw.reviewer_role_ids) ? raw.reviewer_role_ids : []);
  } catch {
    reviewerRoleIds = [];
  }

  return {
    ...raw,
    enabled: Boolean(raw.enabled),
    show_author_in_review: Boolean(raw.show_author_in_review),
    allow_anonymous: Boolean(raw.allow_anonymous),
    require_approval: Boolean(raw.require_approval),
    auto_thread: Boolean(raw.auto_thread),
    regex_filter_enabled: Boolean(raw.regex_filter_enabled),
    cooldown_seconds: Number(raw.cooldown_seconds) || 60,
    current_number: Number(raw.current_number) || 0,
    reviewer_role_ids: reviewerRoleIds,
  };
}

export async function saveConfessionConfig(guildId: string, updates: Record<string, any>) {
  const gId = String(guildId);
  await ensureGuild(gId);

  const payload: Record<string, any> = { ...updates, updated_at: new Date().toISOString() };

  if (payload.reviewer_role_ids !== undefined) {
    payload.reviewer_role_ids = JSON.stringify(
      Array.isArray(payload.reviewer_role_ids) ? payload.reviewer_role_ids : []
    );
  }

  const [record]: any = await ConfessionConfig.findOrCreate({
    where: { guild_id: gId },
    defaults: { guild_id: gId },
  });

  await record.update(payload);
  const updated = normalizeConfig(record);
  configCache.set(gId, updated);
  return updated;
}

/**
 * Validates text against the guild's banned words and custom regex patterns.
 */
export function checkWordFilter(content: string, config: any): { flagged: boolean; matched: string | null; reason: string | null } {
  if (!config || !config.regex_filter_enabled || !content) {
    return { flagged: false, matched: null, reason: null };
  }

  const textToScan = content.toLowerCase();

  // 1. Check comma / newline separated banned words
  if (config.banned_words && config.banned_words.trim().length > 0) {
    const rawWords = config.banned_words
      .split(/[\n,]/)
      .map((w: string) => w.trim().toLowerCase())
      .filter((w: string) => w.length > 0);

    for (const word of rawWords) {
      // Use regex with word boundaries where possible
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const wordRegex = new RegExp(`\\b${escaped}\\b`, "i");
      if (wordRegex.test(content) || textToScan.includes(word)) {
        return { flagged: true, matched: word, reason: `Matches blacklisted word: "${word}"` };
      }
    }
  }

  // 2. Check custom regex pattern
  if (config.regex_filter && config.regex_filter.trim().length > 0) {
    try {
      const customRegex = new RegExp(config.regex_filter.trim(), "i");
      if (customRegex.test(content)) {
        const match = content.match(customRegex);
        return {
          flagged: true,
          matched: match ? match[0] : config.regex_filter,
          reason: `Matches server word filter pattern: "${config.regex_filter}"`,
        };
      }
    } catch (err: any) {
      console.warn(`[CONFESSION REGEX ERROR] Invalid regex pattern "${config.regex_filter}":`, err.message);
    }
  }

  return { flagged: false, matched: null, reason: null };
}

/**
 * Checks and updates user cooldown. Returns remaining cooldown seconds (or 0 if allowed).
 */
export function checkUserCooldown(guildId: string, userId: string, cooldownSeconds: number): number {
  if (!cooldownSeconds || cooldownSeconds <= 0) return 0;
  const key = `${guildId}:${userId}`;
  const now = Date.now();
  const lastTime = userCooldownMap.get(key) || 0;
  const elapsed = (now - lastTime) / 1000;

  if (elapsed < cooldownSeconds) {
    return Math.ceil(cooldownSeconds - elapsed);
  }

  userCooldownMap.set(key, now);
  return 0;
}

export async function createConfession(data: {
  guildId: string;
  userId: string;
  userTag: string;
  content: string;
  imageUrl?: string | null;
  isAnonymous?: boolean;
  status?: string;
}) {
  const gId = String(data.guildId);
  const config = await getConfessionConfig(gId);
  const nextNumber = (config.current_number || 0) + 1;

  // Persist incremented counter
  await saveConfessionConfig(gId, { current_number: nextNumber });

  const record = await Confession.create({
    confession_number: nextNumber,
    guild_id: gId,
    user_id: String(data.userId),
    user_tag: data.userTag || "Unknown User",
    content: data.content,
    image_url: data.imageUrl || null,
    status: data.status || (config.require_approval ? "pending" : "approved"),
    is_anonymous: data.isAnonymous !== undefined ? data.isAnonymous : true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  return record;
}

export async function getConfessionByNumber(guildId: string, confessionNumber: number) {
  return await Confession.findOne({
    where: {
      guild_id: String(guildId),
      confession_number: Number(confessionNumber),
    },
  });
}

export async function getConfessionById(id: number) {
  return await Confession.findOne({
    where: { id: Number(id) },
  });
}

export async function listPublicConfessions(guildId: string, limit = 10, offset = 0) {
  return await Confession.findAll({
    where: {
      guild_id: String(guildId),
      status: "approved",
    },
    order: [["confession_number", "DESC"]],
    limit: Math.min(50, Math.max(1, Number(limit))),
    offset: Math.max(0, Number(offset)),
  });
}

export async function updateConfessionStatus(
  guildId: string,
  confessionNumber: number,
  updates: Record<string, any>
) {
  const record = await getConfessionByNumber(guildId, confessionNumber);
  if (!record) return null;

  const payload: Record<string, any> = { ...updates, updated_at: new Date().toISOString() };
  await record.update(payload);
  return record;
}
