import { Events } from "discord.js";
import { CONFIG } from "../config.js";
import { ANALYTICS_BATCHER } from "../handlers/analyticsBatcher.js";
import { TempbanWorker } from "../handlers/tempbanWorker.js";
import { AutoRoleWorker } from "../handlers/autoroleWorker.js";
import { SupporterWorker } from "../handlers/supporterHandler.js";
import { initAfkCache } from "../db/helpers/afk.js";
import { initStickyCache } from "../db/helpers/sticky.js";
import { initAutoresponderCache } from "../db/helpers/autoresponder.js";
import { restoreActiveChannelLocks } from "../services/channelLockService.js";
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
    await Promise.all([initAfkCache(), initStickyCache(), initAutoresponderCache()]);
    logger.info("[CACHE] Hot-path AFK, Sticky, and Autoresponder caches pre-warmed.");
    await restoreActiveChannelLocks(client).catch(() => {});

    // 4. Start Background Workers
    ANALYTICS_BATCHER.start();
    const tempbanWorker = new TempbanWorker(client);
    tempbanWorker.start();
    
    const autoroleWorker = new AutoRoleWorker(client);
    autoroleWorker.start();

    const supporterWorker = new SupporterWorker(client);
    supporterWorker.start();

    // Attach worker references for clean graceful shutdown
    client.workers = {
      tempbanWorker,
      autoroleWorker,
      supporterWorker,
    };

    // 5. Safely Stagger Member & Presence Pre-warming in the background without flooding Gateway
    (async () => {
      // Only prewarm small guilds or skip heavy presence requests to prevent Gateway 429s
      for (const guild of client.guilds.cache.values()) {
        if ((guild.memberCount || 0) > 2500) continue; // Skip full pre-fetch on massive guilds
        try {
          await guild.members.fetch().catch(() => null);
          await new Promise((r) => setTimeout(r, 2500)); // 2.5s delay between guilds to respect Gateway limits
        } catch {}
      }
    })();

    logger.info("[STARTUP] All background workers and services active. Bot is fully online.");
  },
};
