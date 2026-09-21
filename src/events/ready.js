import { CONFIG } from "../config.js";
import { ANALYTICS_BATCHER } from "../handlers/analyticsBatcher.js";
import { TempbanWorker } from "../handlers/tempbanWorker.js";

export default {
  name: "ready",
  once: true,
  async execute(client) {
    console.log(`[CLIENT READY] Logged in as ${client.user.tag} (ID: ${client.user.id})`);

    // 1. Sync Application / Slash Commands
    if (CONFIG.SYNC_COMMANDS) {
      await client.registerSlashCommands();
    }

    // 2. Start Background Workers
    ANALYTICS_BATCHER.start();
    const tempbanWorker = new TempbanWorker(client);
    tempbanWorker.start();

    console.log("[STARTUP] All background workers and services active.");
  },
};
