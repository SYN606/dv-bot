import { processWeeklyAutoRoles } from "../services/autoroleService.js";
import { logger } from "../utils/logger.js";

/**
 * AutoRole Worker: Microservice worker that triggers weekly rollover of leaderboards.
 * For production, this should ideally be triggered by a Cron Job once a week.
 * Here we provide a manual trigger or a long interval check.
 */
export class AutoRoleWorker {
  constructor(client) {
    this.client = client;
    this.timer = null;
    
    // Check every hour if it's Sunday at midnight (UTC)
    this.intervalMs = 60 * 60 * 1000;
  }

  start() {
    if (!this.timer) {
      this.timer = setInterval(() => this.check(), this.intervalMs);
      // Run once on startup to check
      this.check();
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async check() {
    const now = new Date();
    // Example: If it's Sunday (0) and hour is 0 (Midnight UTC)
    if (now.getUTCDay() === 0 && now.getUTCHours() === 0) {
      logger.info("[AutoRoleWorker] Triggering weekly rollover...");
      await processWeeklyAutoRoles(this.client);
    }
  }
}
