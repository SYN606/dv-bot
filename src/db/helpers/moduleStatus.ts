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
  if (m === "confessions" || m === "confession") return "confessions";
  if (m === "antinuke" || m === "anti_nuke" || m === "security" || m === "protection") return "antinuke";
  if (m === "music" || m === "audio") return "music";
  if (m === "tickets" || m === "ticket") return "tickets";
  if (m === "welcome" || m === "welcome_leave" || m === "greetings") return "welcome";
  if (m === "moderation" || m === "mod") return "moderation";
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
    let isEnabled: boolean;
    if (record) {
      isEnabled = record.value !== "false" && record.value !== "0";
    } else if (mod === "antinuke") {
      const { getAntinukeSettings } = await import("./antinuke.js");
      const s = await getAntinukeSettings(gId);
      isEnabled = Boolean(s.enabled);
    } else {
      isEnabled = true;
    }
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

  if (mod === "antinuke") {
    try {
      const { updateAntinukeSettings, invalidateAntinukeCache } = await import("./antinuke.js");
      await updateAntinukeSettings(gId, { enabled: isEnabled ? 1 : 0 });
      invalidateAntinukeCache(gId);
    } catch (err) {
      console.error(`[MODULE STATUS] Failed to sync antinuke settings for guild ${gId}:`, err);
    }
  }

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
  const modules = [
    "antinuke",
    "autoresponder",
    "sticky",
    "media_only",
    "warning_punishments",
    "autorole",
    "supporter",
    "verification",
    "confessions",
    "music",
    "tickets",
    "welcome",
    "moderation",
  ];
  const result: Record<string, boolean> = {};
  for (const m of modules) {
    result[m] = await isModuleEnabled(guildId, m);
  }
  return result;
}

/**
 * Maps a command to its parent module for dashboard-wide activation control.
 */
export function getCommandModule(command: any): string | null {
  if (!command) return null;
  if (command.module) return normalizeModuleName(command.module);
  const name = String(command.name || "").toLowerCase();
  const cat = String(command.category || "").toLowerCase();

  if (name === "antinuke") return "antinuke";
  if (
    cat === "music" ||
    [
      "play", "pause", "skip", "queue", "stop", "seek", "volume",
      "nowplaying", "np", "loop", "shuffle", "lyrics", "filters", "clearqueue"
    ].includes(name)
  ) {
    return "music";
  }
  if (cat === "tickets" || name === "ticket") return "tickets";
  if (name === "confess" || name === "confession") return "confessions";
  if (name === "verify" || name === "verification") return "verification";
  if (name === "autorole") return "autorole";
  if (name === "sticky") return "sticky";
  if (name === "autoresponder") return "autoresponder";
  if (
    cat === "moderation" &&
    ["ban", "kick", "timeout", "mute", "unmute", "warn", "warnings", "unban", "lock", "unlock"].includes(name)
  ) {
    return "moderation";
  }
  return null;
}
