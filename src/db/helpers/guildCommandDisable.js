import { DisabledCommand } from "../models/index.js";
import { PROTECTED_COMMANDS } from "../../core/permissions.js";

// In-memory fast-path cache: key = `${guildId}:${commandName}` → boolean
const disabledCache = new Map();

function normalize(name) {
  return String(name).trim().toLowerCase().replace(/^\//, "");
}

function cacheKey(guildId, commandName) {
  return `${guildId}:${normalize(commandName)}`;
}

export function invalidateGuildCommandCache(guildId, commandName = null) {
  if (commandName) {
    disabledCache.delete(cacheKey(guildId, commandName));
  } else {
    // Clear all entries for this guild
    const prefix = `${guildId}:`;
    for (const key of disabledCache.keys()) {
      if (key.startsWith(prefix)) disabledCache.delete(key);
    }
  }
}

/**
 * Check if a command is globally disabled in a guild.
 * Admins are NOT checked here — caller is responsible for bypassing admins.
 */
export async function isCommandGloballyDisabled(guildId, commandName) {
  const cmd = normalize(commandName);
  const key = cacheKey(guildId, cmd);

  if (disabledCache.has(key)) {
    return disabledCache.get(key);
  }

  const record = await DisabledCommand.findOne({
    where: { guild_id: String(guildId), command_name: cmd },
    attributes: ["id"],
  });

  const result = !!record;
  if (disabledCache.size >= 5000) disabledCache.clear();
  disabledCache.set(key, result);
  return result;
}

/**
 * Disable a command guild-wide.
 * Returns true if newly disabled, false if already disabled.
 */
export async function disableCommandGuild(guildId, commandName) {
  const cmd = normalize(commandName);
  if (PROTECTED_COMMANDS.has(cmd)) {
    throw new Error(`Command '${cmd}' is protected and cannot be disabled.`);
  }

  const [, created] = await DisabledCommand.findOrCreate({
    where: { guild_id: String(guildId), command_name: cmd },
    defaults: { guild_id: String(guildId), command_name: cmd },
  });

  invalidateGuildCommandCache(guildId, cmd);
  return created;
}

/**
 * Re-enable a command guild-wide.
 * Returns true if a record was deleted (i.e., it was disabled).
 */
export async function enableCommandGuild(guildId, commandName) {
  const cmd = normalize(commandName);
  const deleted = await DisabledCommand.destroy({
    where: { guild_id: String(guildId), command_name: cmd },
  });
  invalidateGuildCommandCache(guildId, cmd);
  return deleted > 0;
}

/**
 * Get the full list of globally disabled command names for a guild.
 */
export async function getGuildDisabledCommands(guildId) {
  const records = await DisabledCommand.findAll({
    where: { guild_id: String(guildId) },
    attributes: ["command_name"],
  });
  return records.map((r) => r.command_name);
}

/**
 * Bulk disable multiple commands guild-wide (skips protected commands).
 */
export async function bulkDisableCommandsGuild(guildId, commandNames) {
  const gId = String(guildId);
  const names = Array.isArray(commandNames) ? commandNames : [commandNames];
  const normalized = [...new Set(names.map(normalize).filter(Boolean))];

  const skipped = [];
  const toDisable = [];
  for (const cmd of normalized) {
    if (PROTECTED_COMMANDS.has(cmd)) skipped.push(cmd);
    else toDisable.push(cmd);
  }

  let count = 0;
  for (const cmd of toDisable) {
    const [, created] = await DisabledCommand.findOrCreate({
      where: { guild_id: gId, command_name: cmd },
      defaults: { guild_id: gId, command_name: cmd },
    });
    if (created) count++;
    invalidateGuildCommandCache(gId, cmd);
  }

  return { disabledCount: toDisable.length, newlyDisabled: count, skipped };
}

/**
 * Bulk re-enable multiple commands guild-wide.
 */
export async function bulkEnableCommandsGuild(guildId, commandNames) {
  const gId = String(guildId);
  const names = Array.isArray(commandNames) ? commandNames : [commandNames];
  const normalized = [...new Set(names.map(normalize).filter(Boolean))];

  if (normalized.length === 0) return { enabledCount: 0 };

  const { Op } = await import("sequelize");
  const deleted = await DisabledCommand.destroy({
    where: { guild_id: gId, command_name: { [Op.in]: normalized } },
  });

  for (const cmd of normalized) invalidateGuildCommandCache(gId, cmd);
  return { enabledCount: deleted };
}
