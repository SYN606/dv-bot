import { SystemMeta } from "../models/index.js";

// Fast in-memory cache per guild: `${guildId}:${moduleName}` -> boolean
const moduleStatusCache = new Map<string, boolean>();

/**
 * Normalizes module names
 */
export function normalizeModuleName(mod) {
  const m = String(mod || "").toLowerCase().trim();
  if (m === "autoresponders" || m === "autoresponder") return "autoresponder";
  if (m === "sticky_messages" || m === "stickies" || m === "sticky") return "sticky";
  if (m === "media_only" || m === "mediaonly" || m === "media") return "media_only";
  if (m === "warning_punishments" || m === "punishments" || m === "warning_punishment") return "warning_punishments";
  if (m === "autorole" || m === "auto_roles" || m === "autoroles") return "autorole";
  if (m === "supporter" || m === "supporter_rewards") return "supporter";
  if (m === "verification" || m === "verify") return "verification";
  return m;
}

/**
 * Check if a module is enabled for a guild.
 * Defaults to true unless explicitly toggled off.
 */
export async function isModuleEnabled(guildId, moduleName) {
  const gId = String(guildId);
  const mod = normalizeModuleName(moduleName);
  const cacheKey = `${gId}:${mod}`;

  if (moduleStatusCache.has(cacheKey)) {
    return moduleStatusCache.get(cacheKey);
  }

  try {
    const key = `module_enabled:${gId}:${mod}`;
    const record = await SystemMeta.findByPk(key);
    // If no record exists, default to true
    const isEnabled = record ? record.value !== "false" && record.value !== "0" : true;
    moduleStatusCache.set(cacheKey, isEnabled);
    return isEnabled;
  } catch (err) {
    console.error(`[MODULE STATUS] Error checking isModuleEnabled(${gId}, ${mod}):`, err);
    return true; // fail open so features remain operable
  }
}

/**
 * Set module enabled state for a guild.
 */
export async function setModuleEnabled(guildId, moduleName, enabled) {
  const gId = String(guildId);
  const mod = normalizeModuleName(moduleName);
  const cacheKey = `${gId}:${mod}`;
  const key = `module_enabled:${gId}:${mod}`;
  const isEnabled = Boolean(enabled);
  const val = isEnabled ? "true" : "false";

  await SystemMeta.upsert({
    key,
    value: val,
    updated_at: new Date().toISOString(),
  });

  moduleStatusCache.set(cacheKey, isEnabled);
  return isEnabled;
}

/**
 * Invalidate cache for a guild's module
 */
export function invalidateModuleCache(guildId, moduleName = null) {
  const gId = String(guildId);
  if (moduleName) {
    moduleStatusCache.delete(`${gId}:${normalizeModuleName(moduleName)}`);
  } else {
    for (const k of moduleStatusCache.keys()) {
      if (k.startsWith(`${gId}:`)) moduleStatusCache.delete(k);
    }
  }
}

/**
 * Fetch all module states for a guild
 */
export async function getAllModuleStatuses(guildId) {
  const modules = ["autoresponder", "sticky", "media_only", "warning_punishments"];
  const result: Record<string, boolean> = {};
  for (const m of modules) {
    result[m] = await isModuleEnabled(guildId, m);
  }
  return result;
}
