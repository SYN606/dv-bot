import { WarningRecord } from "../models/index.js";
import { ensureGuildAndUser, ensureUser } from "./common.js";

export async function addWarning(guildId, userId, moderatorId, reason) {
  const gId = String(guildId);
  const uId = String(userId);
  const mId = String(moderatorId);

  await ensureGuildAndUser(gId, uId);
  await ensureUser(mId);

  return await WarningRecord.create({
    guild_id: gId,
    user_id: uId,
    moderator_id: mId,
    reason: reason || "No reason provided",
  });
}

export async function getWarnings(guildId, userId) {
  return await WarningRecord.findAll({
    where: {
      guild_id: String(guildId),
      user_id: String(userId),
    },
    order: [["created_at", "DESC"]],
  });
}

export async function deleteWarning(guildId, warnId) {
  const deleted = await WarningRecord.destroy({
    where: {
      guild_id: String(guildId),
      warn_id: Number(warnId),
    },
  });
  return deleted > 0;
}

export async function clearWarnings(guildId, userId) {
  const deleted = await WarningRecord.destroy({
    where: {
      guild_id: String(guildId),
      user_id: String(userId),
    },
  });
  return deleted;
}
