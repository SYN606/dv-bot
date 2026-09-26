import { Events } from "discord.js";
import { CONFIG } from "../config.js";
import { ANALYTICS_BATCHER } from "../handlers/analyticsBatcher.js";
import { TempbanWorker } from "../handlers/tempbanWorker.js";
import { PermissionScanner } from "../handlers/permissionScanner.js";
import { initAfkCache } from "../db/helpers/afk.js";
import { initStickyCache } from "../db/helpers/sticky.js";

import { startPresence } from "../core/presence.js";

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`[CLIENT READY] Logged in as ${client.user.tag} (ID: ${client.user.id})`);

    // 1. Initialize Presence & Status System
    startPresence(client);

    // 2. Sync Application / Slash Commands
    if (CONFIG.SYNC_COMMANDS) {
      await client.registerSlashCommands();
    }

    // 3. Pre-warm Hot-path zero-query filter caches
    await Promise.all([initAfkCache(), initStickyCache()]);
    console.log("[CACHE] Hot-path AFK and Sticky caches pre-warmed.");

    // 4. Start Background Workers
    ANALYTICS_BATCHER.start();
    const tempbanWorker = new TempbanWorker(client);
    tempbanWorker.start();
    
    const permissionScanner = new PermissionScanner(client);
    permissionScanner.start();

    console.log("[STARTUP] All background workers and services active.");
  },
};
