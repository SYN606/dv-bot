import { ActivityType } from "discord.js";
import { CONFIG } from "../config.js";

let presenceInterval = null;

export const ACTIVITY_TYPE_MAP = {
  PLAYING: ActivityType.Playing,
  STREAMING: ActivityType.Streaming,
  LISTENING: ActivityType.Listening,
  WATCHING: ActivityType.Watching,
  COMPETING: ActivityType.Competing,
  CUSTOM: ActivityType.Custom,
};

/**
 * Initializes and manages the bot presence and rotating activity states.
 * Supports static text override via BOT_ACTIVITY_TEXT or automatic cycling.
 */
export function startPresence(client) {
  if (!client?.user) return;

  if (presenceInterval) {
    clearInterval(presenceInterval);
    presenceInterval = null;
  }

  const prefix = CONFIG.PREFIX || "ts";
  const botName = CONFIG.BOT_NAME || "Ofira";
  const customText = CONFIG.BOT_ACTIVITY_TEXT;
  const rawType = (CONFIG.BOT_ACTIVITY_TYPE || "LISTENING").toUpperCase();
  const activityType = ACTIVITY_TYPE_MAP[rawType] ?? ActivityType.Listening;
  const status = CONFIG.BOT_STATUS || "online";

  // Static override
  if (customText) {
    try {
      client.user.setPresence({
        status,
        activities: [{ name: customText, type: activityType }],
      });
    } catch (err) {
      console.error("[PRESENCE ERROR]:", err.message);
    }
    return;
  }

  // Dynamic rotating presence
  let step = 0;
  const updateStatus = () => {
    try {
      if (!client.user) return;
      const guildCount = client.guilds.cache.size || 0;
      const userCount = client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0);

      const rotation = [
        { name: `${prefix}help | /help`, type: ActivityType.Listening },
        { name: `🛡️ Moderation & Server Security`, type: ActivityType.Watching },
        { name: `over ${guildCount} servers • ${userCount} users`, type: ActivityType.Watching },
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

  // Run immediately and then rotate every 20 seconds
  updateStatus();
  presenceInterval = setInterval(updateStatus, 20_000);
}

/**
 * Stops the presence rotation interval cleanly.
 */
export function stopPresence() {
  if (presenceInterval) {
    clearInterval(presenceInterval);
    presenceInterval = null;
  }
}
