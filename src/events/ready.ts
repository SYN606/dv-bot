import { Events } from "discord.js";
import { CONFIG } from "../config.js";
import { ANALYTICS_BATCHER } from "../handlers/analyticsBatcher.js";
import { hydrateVoiceSessions } from "./voiceStateUpdate.js";
import { TempbanWorker } from "../handlers/tempbanWorker.js";
import { AutoRoleWorker } from "../handlers/autoroleWorker.js";
import { SupporterWorker } from "../handlers/supporterHandler.js";
import { TicketJobRunner } from "../services/ticketJobRunner.js";
import { initAfkCache } from "../db/helpers/afk.js";
import { initStickyCache } from "../db/helpers/sticky.js";
import { initAutoresponderCache } from "../db/helpers/autoresponder.js";
import { restoreActiveChannelLocks } from "../services/channelLockService.js";
import { logger } from "../utils/logger.js";
import { startPresence } from "../core/presence.js";
import { pruneOldAnalyticsData } from "../db/helpers/analytics.js";

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

    // 4. Start Background Workers & Hydrate Active Voice Sessions
    ANALYTICS_BATCHER.start();
    hydrateVoiceSessions(client);

    const tempbanWorker = new TempbanWorker(client);
    tempbanWorker.start();

    const autoroleWorker = new AutoRoleWorker(client);
    autoroleWorker.start();

    const supporterWorker = new SupporterWorker(client);
    supporterWorker.start();

    const ticketJobRunner = new TicketJobRunner(client);
    ticketJobRunner.start();

    // 5. Initialize Lavalink Music Subsystem
    if (client.music) {
      await client.music.init();
    }

    // Hydrate active ticket channels for real-time listener fast-path
    import("../db/models/index.js").then(async ({ Ticket, Op }) => {
      try {
        const openTickets = await Ticket.findAll({
          where: {
            status: { [Op.ne]: "closed" },
          },
        });
        const { registerActiveTicketChannel } = await import("../db/helpers/tickets.js");
        for (const t of openTickets) {
          if (t.channel_id) registerActiveTicketChannel(t.channel_id);
        }
      } catch (_) {}
    }).catch(() => null);

    // Attach worker references for clean graceful shutdown
    client.workers = {
      tempbanWorker,
      autoroleWorker,
      supporterWorker,
      ticketJobRunner,
    };

    // 5. Automated 90-day Data Pruning (Runs on startup & daily)
    pruneOldAnalyticsData(90).catch((err) => logger.error("[PRUNING ERROR]:", err));
    const retentionTimer = setInterval(() => {
      pruneOldAnalyticsData(90).catch((err) => logger.error("[PRUNING ERROR]:", err));
    }, 24 * 60 * 60 * 1000);
    if (typeof retentionTimer.unref === "function") retentionTimer.unref();

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
