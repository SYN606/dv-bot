import { processWeeklyAutoRoles } from "../services/autoroleService.js";
import { resetAllWeeklyAnalytics } from "../db/helpers/analytics.js";
import { getSystemMeta, setSystemMeta } from "../db/helpers/common.js";
import { logger } from "../utils/logger.js";

function getIsoWeekString(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/**
 * AutoRole Worker: Microservice worker that triggers weekly rollover of leaderboards.
 * Deduplicated via ISO calendar week in system_meta to guarantee strictly one execution per week.
 */
export class AutoRoleWorker {
  public client: any;
  public timer: any;
  public isProcessing: boolean;
  public intervalMs: number;
  constructor(client) {
    this.client = client;
    this.timer = null;
    this.isProcessing = false;
    
    // Check every 10 minutes to reliably detect Sunday midnight UTC window
    this.intervalMs = 10 * 60 * 1000;
  }

  start() {
    if (!this.timer) {
      this.timer = setInterval(() => this.check(), this.intervalMs);
      // Run initial check on startup
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
    if (this.isProcessing) return;
    this.isProcessing = true;
    try {
      const now = new Date();
      // Only execute on Sunday (0) between 00:00 and 00:59 UTC
      if (now.getUTCDay() === 0 && now.getUTCHours() === 0) {
        const currentWeekKey = getIsoWeekString(now);
        const lastRollover = await getSystemMeta("last_autorole_rollover_week");

        if (lastRollover === currentWeekKey) {
          // Already performed for this calendar week, skip cleanly
          return;
        }

        logger.info(`[AutoRoleWorker] Triggering weekly rollover for week ${currentWeekKey}...`);
        
        // 1. Process guild-configured auto roles and role reward announcements
        await processWeeklyAutoRoles(this.client);

        // 2. Globally reset weekly messages and weekly voice seconds for all guilds
        await resetAllWeeklyAnalytics();

        await setSystemMeta("last_autorole_rollover_week", currentWeekKey);
        logger.info(`[AutoRoleWorker] Successfully completed weekly rollover for week ${currentWeekKey}.`);
      }
    } catch (err) {
      logger.error("[AutoRoleWorker] Error during check:", err);
    } finally {
      this.isProcessing = false;
    }
  }
}
