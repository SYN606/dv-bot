import { WarningPunishmentConfig } from "../models/index.js";

export async function getWarningPunishmentConfig(guildId, warnCount) {
  return await WarningPunishmentConfig.findOne({
    where: {
      guild_id: String(guildId),
      warn_count: Number(warnCount),
    },
  });
}

export async function getAllWarningPunishmentConfigs(guildId) {
  return await WarningPunishmentConfig.findAll({
    where: {
      guild_id: String(guildId),
    },
    order: [["warn_count", "ASC"]],
  });
}

export async function setWarningPunishmentConfig(guildId, warnCount, actionType, duration = null) {
  const gId = String(guildId);
  const count = Number(warnCount);

  const [config, created] = await WarningPunishmentConfig.findOrCreate({
    where: { guild_id: gId, warn_count: count },
    defaults: {
      guild_id: gId,
      warn_count: count,
      action_type: actionType,
      duration: duration,
    },
  });

  if (!created) {
    config.action_type = actionType;
    config.duration = duration;
    await config.save();
  }

  return config;
}

export async function removeWarningPunishmentConfig(guildId, warnCount) {
  const deleted = await WarningPunishmentConfig.destroy({
    where: {
      guild_id: String(guildId),
      warn_count: Number(warnCount),
    },
  });
  return deleted > 0;
}
