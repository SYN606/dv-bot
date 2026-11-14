import {
  type Guild,
  type User,
  AuditLogEvent,
  type GuildAuditLogsEntry,
} from "discord.js";
import { logger } from "../utils/logger.js";

interface CachedAuditBatch {
  timestamp: number;
  entries: any[];
}

class AntinukeAuditResolver {
  // Key: `${guildId}:${actionType}` -> CachedAuditBatch
  private auditCache = new Map<string, CachedAuditBatch>();
  // In-flight request deduplication map
  private inFlight = new Map<string, Promise<GuildAuditLogsEntry | null>>();

  constructor() {
    const pruneTimer = setInterval(() => this.prune(), 30 * 1000);
    if (pruneTimer.unref) pruneTimer.unref();
  }

  private prune(): void {
    const now = Date.now();
    for (const [key, batch] of this.auditCache.entries()) {
      if (now - batch.timestamp > 8000) {
        this.auditCache.delete(key);
      }
    }
  }

  public removeGuild(guildId: string): void {
    const prefix = `${guildId}:`;
    for (const key of this.auditCache.keys()) {
      if (key.startsWith(prefix)) {
        this.auditCache.delete(key);
      }
    }
  }

  /**
   * Resolves the executor of an administrative action safely with rate-limit deduplication.
   */
  public async resolveExecutor(
    guild: Guild,
    actionType: AuditLogEvent,
    targetId?: string | null
  ): Promise<any | null> {
    if (!guild) return null;

    const cacheKey = `${guild.id}:${actionType}`;
    const now = Date.now();

    // 1. Check in-memory cache first (valid for 3 seconds)
    const cached = this.auditCache.get(cacheKey);
    if (cached && now - cached.timestamp <= 3000) {
      const match = this.findMatchingEntry(cached.entries, targetId, now);
      if (match?.executor) return match.executor;
    }

    // 2. If a request for this guild & action is already in-flight, piggyback on it
    if (this.inFlight.has(cacheKey)) {
      const entry = await this.inFlight.get(cacheKey);
      if (entry?.executor) {
        if (!targetId || entry.targetId === targetId || (entry.target as any)?.id === targetId) {
          return entry.executor;
        }
      }
    }

    // 3. Dispatch fresh audit log query
    const fetchPromise = (async (): Promise<GuildAuditLogsEntry | null> => {
      try {
        // Pacing delay (200ms) to allow Discord audit logs to write
        await new Promise((r) => setTimeout(r, 200));

        const auditLogs = await guild.fetchAuditLogs({
          type: actionType,
          limit: 8,
        });

        const entries = Array.from(auditLogs.entries.values());
        if (this.auditCache.size >= 100) this.prune();
        this.auditCache.set(cacheKey, { timestamp: Date.now(), entries });

        let match = this.findMatchingEntry(entries, targetId, Date.now());
        if (!match && targetId) {
          // Retry once with a brief 300ms delay in case Discord audit log has not propagated yet
          await new Promise((r) => setTimeout(r, 300));
          const freshLogs = await guild.fetchAuditLogs({
            type: actionType,
            limit: 8,
          }).catch(() => null);
          if (freshLogs) {
            const freshEntries: any[] = Array.from(freshLogs.entries.values());
            this.auditCache.set(cacheKey, { timestamp: Date.now(), entries: freshEntries });
            match = this.findMatchingEntry(freshEntries, targetId, Date.now());
          }
        }
        return match;
      } catch (_) {
        return null;
      } finally {
        this.inFlight.delete(cacheKey);
      }
    })();

    this.inFlight.set(cacheKey, fetchPromise);
    const result = await fetchPromise;
    return result?.executor || null;
  }

  private findMatchingEntry(
    entries: any[],
    targetId?: string | null,
    now: number = Date.now()
  ): any | null {
    for (const entry of entries) {
      const entryAgeMs = now - entry.createdTimestamp;
      // Must be recent (under 15 seconds old)
      if (entryAgeMs > 15000) continue;

      if (targetId) {
        if (entry.targetId === targetId || (entry.target as any)?.id === targetId) {
          return entry;
        }
      } else {
        return entry;
      }
    }
    return targetId ? null : (entries[0] || null);
  }
}

export const ANTINUKE_AUDIT = new AntinukeAuditResolver();
