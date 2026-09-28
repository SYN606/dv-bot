import { Op } from "sequelize";
import { RestrictedCommand } from "../models/index.js";
import { ensureGuild } from "./common.js";
import { PROTECTED_COMMANDS } from "../../core/permissions.js";

// In-memory cache for ultra-fast check lookups
const restrictCache = new Map();
const MAX_CACHE_ENTRIES = 2000;

function normalize(commandName) {
  return String(commandName).trim().toLowerCase().replace(/^\//, "");
}

function getCacheKey(guildId, channelId, commandName) {
  return `${guildId}:${channelId}:${normalize(commandName)}`;
}

export function invalidateRestrictCache(guildId, channelId, commandName) {
  restrictCache.delete(getCacheKey(guildId, channelId, commandName));
}

export function clearGuildRestrictCache(guildId) {
  const prefix = `${guildId}:`;
  for (const key of restrictCache.keys()) {
    if (key.startsWith(prefix)) {
      restrictCache.delete(key);
    }
  }
}

export async function restrictCommand(guildId, channelId, commandName, scope = "both") {
  const cmd = normalize(commandName);
  const gId = String(guildId);
  const cId = String(channelId);

  await ensureGuild(gId);

  const [record, created] = await RestrictedCommand.findOrCreate({
    where: {
      guild_id: gId,
      channel_id: cId,
      command_name: cmd,
    },
    defaults: {
      guild_id: gId,
      channel_id: cId,
      command_name: cmd,
      restriction_scope: scope.toLowerCase(),
    },
  });

  let changed = created;
  if (!created && record.restriction_scope !== scope.toLowerCase()) {
    record.restriction_scope = scope.toLowerCase();
    await record.save();
    changed = true;
  }

  invalidateRestrictCache(gId, cId, cmd);
  return changed;
}

export async function unrestrictCommand(guildId, channelId, commandName) {
  const cmd = normalize(commandName);
  const gId = String(guildId);
  const cId = String(channelId);

  const deletedCount = await RestrictedCommand.destroy({
    where: {
      guild_id: gId,
      channel_id: cId,
      command_name: cmd,
    },
  });

  invalidateRestrictCache(gId, cId, cmd);
  return deletedCount > 0;
}

export async function isCommandRestricted(guildId, channelId, commandName) {
  const cmd = normalize(commandName);
  const key = getCacheKey(guildId, channelId, cmd);

  if (restrictCache.has(key)) {
    return restrictCache.get(key);
  }

  const exists = !!(await RestrictedCommand.findOne({
    where: {
      guild_id: String(guildId),
      channel_id: String(channelId),
      command_name: cmd,
    },
    attributes: ["id"],
  }));

  if (restrictCache.size >= MAX_CACHE_ENTRIES) {
    restrictCache.clear();
  }
  restrictCache.set(key, exists);

  return exists;
}

export async function getRestrictedCommands(guildId, channelId) {
  const records = await RestrictedCommand.findAll({
    where: {
      guild_id: String(guildId),
      channel_id: String(channelId),
    },
    attributes: ["command_name"],
  });

  return records.map((r) => r.command_name);
}

export async function bulkRestrictCommands(guildId, channelId, commandNames, scope = "both") {
  const gId = String(guildId);
  const cId = String(channelId);
  await ensureGuild(gId);

  const rawList = Array.isArray(commandNames) ? commandNames : [commandNames];
  const normalized = Array.from(
    new Set(rawList.map(normalize).filter(Boolean))
  );

  const toAdd = [];
  const skipped = [];

  for (const cmd of normalized) {
    if (PROTECTED_COMMANDS.has(cmd)) {
      skipped.push(cmd);
    } else {
      toAdd.push(cmd);
    }
  }

  let count = 0;
  for (const cmd of toAdd) {
    const [record, created] = await RestrictedCommand.findOrCreate({
      where: {
        guild_id: gId,
        channel_id: cId,
        command_name: cmd,
      },
      defaults: {
        guild_id: gId,
        channel_id: cId,
        command_name: cmd,
        restriction_scope: scope.toLowerCase(),
      },
    });

    if (created || record.restriction_scope !== scope.toLowerCase()) {
      if (!created) {
        record.restriction_scope = scope.toLowerCase();
        await record.save();
      }
      count++;
    }
    invalidateRestrictCache(gId, cId, cmd);
  }

  return { restrictedCount: toAdd.length, newRestrictions: count, skipped };
}

export async function bulkUnrestrictCommands(guildId, channelId, commandNames) {
  const gId = String(guildId);
  const cId = String(channelId);

  const rawList = Array.isArray(commandNames) ? commandNames : [commandNames];
  const normalized = Array.from(
    new Set(rawList.map(normalize).filter(Boolean))
  );

  if (normalized.length === 0) {
    return { unrestrictCount: 0 };
  }

  const deletedCount = await RestrictedCommand.destroy({
    where: {
      guild_id: gId,
      channel_id: cId,
      command_name: {
        [Op.in]: normalized,
      },
    },
  });

  for (const cmd of normalized) {
    invalidateRestrictCache(gId, cId, cmd);
  }

  return { unrestrictCount: deletedCount };
}

// Compatibility Aliases
export const disableCommand = restrictCommand;
export const enableCommand = unrestrictCommand;
export const getDisabledCommands = getRestrictedCommands;
export const bulkDisableCommands = bulkRestrictCommands;
export const bulkEnableCommands = bulkUnrestrictCommands;

