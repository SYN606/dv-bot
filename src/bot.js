import { CONFIG } from "./config.js";
import { DVClient } from "./core/client.js";
import { initDb, closeDb } from "./db/index.js";
import { ANALYTICS_BATCHER } from "./handlers/analyticsBatcher.js";
import { startWebServer } from "./web/server.js";
import { logger } from "./utils/logger.js";

const client = new DVClient();
let webServer = null;

// Global process error monitors for deep diagnostic telemetry
process.on("unhandledRejection", (reason, promise) => {
  logger.error("[PROCESS] Unhandled Promise Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  logger.fatal("[PROCESS] Uncaught Fatal Exception:", error);
  logger.flushSync();
  process.exit(1);
});

async function main() {
  logger.info("==========================================");
  logger.info(`Starting DV-BOT (Bun ${typeof Bun !== "undefined" ? Bun.version : process.version} + discord.js v14)`);
  logger.info(`Runtime Platform: ${process.platform} (${process.arch}) | ENV: ${CONFIG.ENV}`);
  logger.info("==========================================");

  await initDb();
  await client.loadCommands();
  await client.loadComponents();
  await client.loadEvents();

  // Start Hono Web Dashboard
  webServer = startWebServer(client, CONFIG.DASHBOARD_PORT);

  await client.start();
}

// Graceful Shutdown
async function handleShutdown(signal) {
  logger.warn(`[SHUTDOWN] Received ${signal}. Gracefully stopping bot...`);
  try {
    if (webServer?.stop) {
      webServer.stop();
      logger.info("[SHUTDOWN] Web server stopped.");
    }
    await ANALYTICS_BATCHER.stop();
    await closeDb();
    client.destroy();
    logger.info("[SHUTDOWN] Bot stopped cleanly.");
  } finally {
    await logger.flush();
    process.exit(0);
  }
}

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));

main().catch(async (err) => {
  logger.fatal("[FATAL ERROR DURING STARTUP]:", err);
  await logger.flush();
  process.exit(1);
});

