import { processExpiredTempbans } from "../services/tempbanService.js";

/**
 * Tempban Worker: Microservice worker that polls and automatically lifts expired temporary bans.
 */
export class TempbanWorker {
  constructor(client, intervalMs = 30000) {
    this.client = client;
    this.intervalMs = intervalMs;
    this.timer = null;
    this.isProcessing = false;
  }

  start() {
    if (!this.timer) {
      this.timer = setInterval(() => this.check(), this.intervalMs);
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
      await processExpiredTempbans(this.client);
    } finally {
      this.isProcessing = false;
    }
  }
}
