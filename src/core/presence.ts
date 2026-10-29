import { ActivityType, type Client } from "discord.js";
import { CONFIG } from "../config";

let presenceInterval: any = null;

export const ACTIVITY_TYPE_MAP: Record<string, ActivityType> = {
  PLAYING: ActivityType.Playing,
  STREAMING: ActivityType.Streaming,
  LISTENING: ActivityType.Listening,
  WATCHING: ActivityType.Watching,
  COMPETING: ActivityType.Competing,
  CUSTOM: ActivityType.Custom,
};

/**
 * Formats a number into a compact human-readable string (e.g., 1120 -> "1.1k", 1200000 -> "1.2m").
 */
export function formatCompact(num: any): string {
  if (num == null || isNaN(num)) return "0";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(num).toLowerCase();
}

/**
 * Initializes and manages the bot presence and rotating activity states.
 * Supports static text override via BOT_ACTIVITY_TEXT or automatic cycling.
 */
export function startPresence(client: Client | any): void {
  if (!client?.user) return;

  if (presenceInterval) {
    clearInterval(presenceInterval);
    presenceInterval = null;
  }

  const prefix = CONFIG.PREFIX || "ts";
  const customText = CONFIG.BOT_ACTIVITY_TEXT;
  const rawType = (CONFIG.BOT_ACTIVITY_TYPE || "LISTENING").toUpperCase();
  const activityType = ACTIVITY_TYPE_MAP[rawType] ?? ActivityType.Listening;
  const status = (CONFIG.BOT_STATUS || "online") as any;

  // Static override
  if (customText) {
    try {
      client.user.setPresence({
        status,
        activities: [{ name: customText, type: activityType }],
      });
    } catch (err: any) {
      console.error("[PRESENCE ERROR]:", err.message);
    }
    return;
  }

  // Dynamic rotating presence
  let step = 0;
  const updateStatus = () => {
    try {
      if (!client.user) return;
      const guildCount = client.guilds?.cache?.size || 0;
      let rawUserCount = 0;
      if (client.guilds?.cache) {
        for (const guild of client.guilds.cache.values()) {
          rawUserCount += (guild.memberCount || 0);
        }
      }
      const userCount = formatCompact(rawUserCount);

      const rotation = [
        { name: `${prefix}help | /help`, type: ActivityType.Listening },
        { name: `🛡️ Moderation & Server Security`, type: ActivityType.Watching },
        { name: `over ${guildCount} servers • ${userCount} members`, type: ActivityType.Watching },
        { name: `bot.digitalvigital.fun`, type: ActivityType.Listening },
      ];

      const current = rotation[step % rotation.length];
      step++;

      client.user.setPresence({
        status,
        activities: [{ name: current.name, type: current.type }],
      });
    } catch (err) {
      // Ignore transient gateway disconnection errors
    }
  };

  // Run immediately and then rotate slowly every 4 to 5 hours (default: 4.5 hours)
  updateStatus();
  const ROTATION_INTERVAL_MS = (CONFIG.PRESENCE_ROTATE_HOURS ? Number(CONFIG.PRESENCE_ROTATE_HOURS) : 4.5) * 60 * 60 * 1000;
  presenceInterval = setInterval(updateStatus, ROTATION_INTERVAL_MS);
}

/**
 * Stops the presence rotation interval cleanly.
 */
export function stopPresence(): void {
  if (presenceInterval) {
    clearInterval(presenceInterval);
    presenceInterval = null;
  }
}
