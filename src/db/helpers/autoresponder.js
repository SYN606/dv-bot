import { AutoResponder, AutoResponderReaction } from "../models/index.js";
import { ensureGuild } from "./common.js";
import { invalidateCompiledRules } from "../../handlers/autoresponderHandler.js";

const autoresponderCache = new Map();
const activeAutoresponderGuilds = new Set();

export async function initAutoresponderCache() {
  try {
    const rules = await AutoResponder.findAll({
      include: [{ model: AutoResponderReaction, as: "reactions" }],
    });
    activeAutoresponderGuilds.clear();
    autoresponderCache.clear();
    invalidateCompiledRules();
    for (const r of rules) {
      if (!r.guild_id) continue;
      const gId = String(r.guild_id);
      activeAutoresponderGuilds.add(gId);
      if (!autoresponderCache.has(gId)) {
        autoresponderCache.set(gId, []);
      }
      autoresponderCache.get(gId).push(r);
    }
  } catch (err) {
    console.error("[AUTORESPONDER CACHE INIT ERROR]:", err);
  }
}

export function invalidateAutoresponderCache(guildId = null) {
  if (guildId) {
    const gId = String(guildId);
    autoresponderCache.delete(gId);
    invalidateCompiledRules(gId);
    // Mark guild in active set so next read will re-fetch and re-evaluate
    activeAutoresponderGuilds.add(gId);
  } else {
    autoresponderCache.clear();
    activeAutoresponderGuilds.clear();
    invalidateCompiledRules();
  }
}

export function hasGuildAutoresponders(guildId) {
  const gId = String(guildId);
  return activeAutoresponderGuilds.has(gId);
}

export async function getGuildAutoresponders(guildId) {
  const gId = String(guildId);
  // Fast path: if the guild has never configured autoresponders and isn't marked, return empty array immediately
  if (autoresponderCache.has(gId)) {
    return autoresponderCache.get(gId);
  }

  // If the pre-warmed set knows there are no rules for this guild, return empty array without querying DB
  if (!activeAutoresponderGuilds.has(gId) && autoresponderCache.size > 0) {
    autoresponderCache.set(gId, []);
    return [];
  }

  const rules = await AutoResponder.findAll({
    where: { guild_id: gId },
    include: [{ model: AutoResponderReaction, as: "reactions" }],
  });

  if (rules.length > 0) {
    activeAutoresponderGuilds.add(gId);
  } else {
    activeAutoresponderGuilds.delete(gId);
  }

  autoresponderCache.set(gId, rules);
  return rules;
}

export async function getRuleById(responderId) {
  return await AutoResponder.findByPk(responderId, {
    include: [{ model: AutoResponderReaction, as: "reactions" }],
  });
}

export async function upsertAutoresponder(guildId, data) {
  const gId = String(guildId);
  await ensureGuild(gId);
  const result = await AutoResponder.create({
    guild_id: gId,
    ...data,
  });
  invalidateAutoresponderCache(gId);
  return result;
}

export async function deleteAutoresponder(guildId, responderId) {
  const gId = String(guildId);
  const deleted = await AutoResponder.destroy({
    where: {
      guild_id: gId,
      responder_id: Number(responderId),
    },
  });
  invalidateAutoresponderCache(gId);
  return deleted;
}

export async function updateAutoresponder(guildId, responderId, data) {
  const gId = String(guildId);
  const existing = await AutoResponder.findOne({
    where: {
      guild_id: gId,
      responder_id: Number(responderId),
    },
  });
  if (!existing) return false;

  await AutoResponder.update(data, {
    where: {
      guild_id: gId,
      responder_id: Number(responderId),
    },
  });
  invalidateAutoresponderCache(gId);
  return true;
}

export async function toggleAutoresponder(guildId, responderId) {
  const gId = String(guildId);
  const rule = await AutoResponder.findOne({
    where: {
      guild_id: gId,
      responder_id: Number(responderId),
    },
  });
  if (!rule) return null;

  rule.enabled = !rule.enabled;
  await rule.save();
  invalidateAutoresponderCache(gId);
  return rule.enabled;
}

export async function setResponderReactions(responderId, emojiList, guildId = null) {
  const id = Number(responderId);
  await AutoResponderReaction.destroy({
    where: { responder_id: id },
  });

  if (Array.isArray(emojiList) && emojiList.length > 0) {
    const records = emojiList
      .map((em) => (typeof em === "string" ? em.trim() : ""))
      .filter(Boolean)
      .map((emoji) => ({
        responder_id: id,
        emoji,
      }));

    if (records.length > 0) {
      await AutoResponderReaction.bulkCreate(records);
    }
  }

  invalidateAutoresponderCache(guildId);
}

export async function addResponderReaction(responderId, emoji) {
  const res = await AutoResponderReaction.findOrCreate({
    where: {
      responder_id: Number(responderId),
      emoji: String(emoji),
    },
    defaults: {
      responder_id: Number(responderId),
      emoji: String(emoji),
    },
  });
  // Invalidate all caches since responderId is not keyed by guild
  invalidateAutoresponderCache();
  return res;
}

export async function clearResponderReactions(responderId) {
  const res = await AutoResponderReaction.destroy({
    where: { responder_id: Number(responderId) },
  });
  invalidateAutoresponderCache();
  return res;
}

