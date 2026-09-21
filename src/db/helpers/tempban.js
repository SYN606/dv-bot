import { Op } from "sequelize";
import { TempbanConfig, TempbanRecord } from "../models/index.js";
import { ensureGuild, ensureGuildAndUser, ensureUser } from "./common.js";

export async function getTempbanConfig(guildId) {
  return await TempbanConfig.findByPk(String(guildId));
}

export async function setTempbanConfig(guildId, roleId) {
  const gId = String(guildId);
  await ensureGuild(gId);
  const [config, created] = await TempbanConfig.findOrCreate({
    where: { guild_id: gId },
    defaults: { guild_id: gId, role_id: String(roleId) },
  });
  if (!created) {
    config.role_id = String(roleId);
    await config.save();
  }
  return config;
}

export async function createTempban(guildId, userId, moderatorId, reason, expiresAt) {
  const gId = String(guildId);
  const uId = String(userId);
  const mId = String(moderatorId);

  await ensureGuildAndUser(gId, uId);
  await ensureUser(mId);

  const [record, created] = await TempbanRecord.findOrCreate({
    where: { guild_id: gId, user_id: uId },
    defaults: {
      guild_id: gId,
      user_id: uId,
      moderator_id: mId,
      tempban_reason: reason,
      expires_at: expiresAt,
      active: true,
    },
  });

  if (!created) {
    record.moderator_id = mId;
    record.tempban_reason = reason;
    record.expires_at = expiresAt;
    record.active = true;
    await record.save();
  }

  return record;
}

export async function getActiveTempbans(guildId = null) {
  const where = { active: true };
  if (guildId) where.guild_id = String(guildId);
  return await TempbanRecord.findAll({ where });
}

export async function getExpiredTempbans() {
  return await TempbanRecord.findAll({
    where: {
      active: true,
      expires_at: {
        [Op.ne]: null,
        [Op.lte]: new Date(),
      },
    },
  });
}

export async function deactivateTempban(guildId, userId) {
  const record = await TempbanRecord.findOne({
    where: {
      guild_id: String(guildId),
      user_id: String(userId),
    },
  });

  if (record) {
    record.active = false;
    await record.save();
    return true;
  }
  return false;
}
