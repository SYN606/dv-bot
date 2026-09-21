import { CONFIG } from "./config.js";
import { DVClient } from "./core/client.js";
import { initDb, closeDb } from "./db/index.js";
import { ANALYTICS_BATCHER } from "./handlers/analyticsBatcher.js";
import { startWebServer } from "./web/server.js";

const client = new DVClient();
let webServer = null;

async function main() {
  console.log("==========================================");
  console.log("Starting DV-BOT (Bun + discord.js v14)");
  console.log("==========================================");

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
  console.log(`\n[SHUTDOWN] Received ${signal}. Gracefully stopping bot...`);
  try {
    if (webServer?.stop) {
      webServer.stop();
      console.log("[SHUTDOWN] Web server stopped.");
    }
    await ANALYTICS_BATCHER.stop();
    await closeDb();
    client.destroy();
    console.log("[SHUTDOWN] Bot stopped cleanly.");
  } finally {
    process.exit(0);
  }
}

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));

main().catch((err) => {
  console.error("[FATAL ERROR DURING STARTUP]:", err);
  process.exit(1);
});
