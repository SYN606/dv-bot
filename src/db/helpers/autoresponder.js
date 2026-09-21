import { AutoResponder, AutoResponderReaction } from "../models/index.js";
import { ensureGuild } from "./common.js";

const autoresponderCache = new Map();

export function invalidateAutoresponderCache(guildId = null) {
  if (guildId) {
    autoresponderCache.delete(String(guildId));
  } else {
    autoresponderCache.clear();
  }
}

export async function getGuildAutoresponders(guildId) {
  const gId = String(guildId);
  if (autoresponderCache.has(gId)) {
    return autoresponderCache.get(gId);
  }

  const rules = await AutoResponder.findAll({
    where: { guild_id: gId },
    include: [{ model: AutoResponderReaction, as: "reactions" }],
  });

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
  const [updatedCount] = await AutoResponder.update(data, {
    where: {
      guild_id: gId,
      responder_id: Number(responderId),
    },
  });
  invalidateAutoresponderCache(gId);
  return updatedCount > 0;
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

export async function setResponderReactions(responderId, emojiList) {
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

  invalidateAutoresponderCache();
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

