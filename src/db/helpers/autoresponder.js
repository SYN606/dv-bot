import { AutoResponder, AutoResponderReaction } from "../models/index.js";
import { ensureGuild } from "./common.js";

export async function getGuildAutoresponders(guildId) {
  return await AutoResponder.findAll({
    where: { guild_id: String(guildId) },
    include: [{ model: AutoResponderReaction, as: "reactions" }],
  });
}

export async function getRuleById(responderId) {
  return await AutoResponder.findByPk(responderId, {
    include: [{ model: AutoResponderReaction, as: "reactions" }],
  });
}

export async function upsertAutoresponder(guildId, data) {
  await ensureGuild(guildId);
  return await AutoResponder.create({
    guild_id: String(guildId),
    ...data,
  });
}

export async function deleteAutoresponder(guildId, responderId) {
  return await AutoResponder.destroy({
    where: {
      guild_id: String(guildId),
      responder_id: Number(responderId),
    },
  });
}

export async function addResponderReaction(responderId, emoji) {
  return await AutoResponderReaction.findOrCreate({
    where: {
      responder_id: Number(responderId),
      emoji: String(emoji),
    },
    defaults: {
      responder_id: Number(responderId),
      emoji: String(emoji),
    },
  });
}

export async function clearResponderReactions(responderId) {
  return await AutoResponderReaction.destroy({
    where: { responder_id: Number(responderId) },
  });
}
