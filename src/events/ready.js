import { Events } from "discord.js";
import { CONFIG } from "../config.js";
import { ANALYTICS_BATCHER } from "../handlers/analyticsBatcher.js";
import { TempbanWorker } from "../handlers/tempbanWorker.js";
import { AutoRoleWorker } from "../handlers/autoroleWorker.js";
import { initAfkCache } from "../db/helpers/afk.js";
import { initStickyCache } from "../db/helpers/sticky.js";
import { logger } from "../utils/logger.js";

import { startPresence } from "../core/presence.js";

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    logger.info(`[CLIENT READY] Logged in as ${client.user.tag} (ID: ${client.user.id})`);

    // 1. Initialize Presence & Status System
    startPresence(client);

    // 2. Sync Application / Slash Commands
    if (CONFIG.SYNC_COMMANDS) {
      await client.registerSlashCommands();
    }

    // 3. Pre-warm Hot-path zero-query filter caches
    await Promise.all([initAfkCache(), initStickyCache()]);
    logger.info("[CACHE] Hot-path AFK and Sticky caches pre-warmed.");

    // 4. Start Background Workers
    ANALYTICS_BATCHER.start();
    const tempbanWorker = new TempbanWorker(client);
    tempbanWorker.start();
    
    const autoroleWorker = new AutoRoleWorker(client);
    autoroleWorker.start();

    logger.info("[STARTUP] All background workers and services active. Bot is fully online.");
  },
};
