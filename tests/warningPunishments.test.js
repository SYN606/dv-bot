/**
 * Tests for Warning Punishment Config DB helper
 * Uses bun:test (native bun test runner)
 * Run: bun test tests/
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "../src/db/schema/sqlite.js";

// ─── In-memory DB for isolated tests ─────────────────────────────────────────
let rawDb;
let db;

// Monkeypatch getDb() to return our test DB
const dbModule = await import("../src/db/index.js");
let originalGetDb;

beforeAll(() => {
  rawDb = new Database(":memory:");

  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS guilds (
      guild_id TEXT PRIMARY KEY,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS warnings (
      warn_id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      reason TEXT DEFAULT 'No reason provided',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS warning_punishment_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      warn_count INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      duration INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(guild_id, warn_count)
    );
  `);

  db = drizzle(rawDb, { schema });

  // Patch the exported getDb to use our test DB
  originalGetDb = dbModule.getDb;
  Object.defineProperty(dbModule, "getDb", {
    value: () => db,
    writable: true,
    configurable: true,
  });
});

afterAll(() => {
  // Restore
  Object.defineProperty(dbModule, "getDb", {
    value: originalGetDb,
    writable: true,
    configurable: true,
  });
  rawDb.close();
});

// ─── Warning Punishment Config tests ─────────────────────────────────────────
describe("warningPunishments helper", () => {
  const { setWarningPunishmentConfig, getWarningPunishmentConfig, getAllWarningPunishmentConfigs, removeWarningPunishmentConfig } =
    await import("../src/db/helpers/warningPunishments.js");

  const GUILD = "111111111111111111";

  beforeEach(() => {
    rawDb.exec("DELETE FROM warning_punishment_config");
  });

  it("should insert a new punishment config", async () => {
    const result = await setWarningPunishmentConfig(GUILD, 3, "timeout", 3600);
    expect(result).toBeDefined();
    expect(result.guild_id).toBe(GUILD);
    expect(result.warn_count).toBe(3);
    expect(result.action_type).toBe("timeout");
    expect(result.duration).toBe(3600);
  });

  it("should update an existing punishment config (upsert)", async () => {
    await setWarningPunishmentConfig(GUILD, 5, "kick", null);
    const updated = await setWarningPunishmentConfig(GUILD, 5, "ban", null);
    expect(updated.action_type).toBe("ban");
  });

  it("should retrieve a single config by warnCount", async () => {
    await setWarningPunishmentConfig(GUILD, 2, "timeout", 7200);
    const config = await getWarningPunishmentConfig(GUILD, 2);
    expect(config).not.toBeNull();
    expect(config.action_type).toBe("timeout");
    expect(config.duration).toBe(7200);
  });

  it("should return null for a non-existent threshold", async () => {
    const config = await getWarningPunishmentConfig(GUILD, 99);
    expect(config).toBeNull();
  });

  it("should retrieve all configs sorted by warn_count", async () => {
    await setWarningPunishmentConfig(GUILD, 10, "ban", null);
    await setWarningPunishmentConfig(GUILD, 3, "kick", null);
    await setWarningPunishmentConfig(GUILD, 7, "timeout", 86400);

    const configs = await getAllWarningPunishmentConfigs(GUILD);
    expect(configs.length).toBe(3);
    expect(configs[0].warn_count).toBe(3);
    expect(configs[1].warn_count).toBe(7);
    expect(configs[2].warn_count).toBe(10);
  });

  it("should delete a config and return true", async () => {
    await setWarningPunishmentConfig(GUILD, 4, "kick", null);
    const deleted = await removeWarningPunishmentConfig(GUILD, 4);
    expect(deleted).toBe(true);

    const config = await getWarningPunishmentConfig(GUILD, 4);
    expect(config).toBeNull();
  });

  it("should return false when deleting a non-existent config", async () => {
    const deleted = await removeWarningPunishmentConfig(GUILD, 999);
    expect(deleted).toBe(false);
  });

  it("should not mix configs between guilds", async () => {
    await setWarningPunishmentConfig("GUILD_A", 3, "kick", null);
    await setWarningPunishmentConfig("GUILD_B", 3, "ban", null);

    const a = await getWarningPunishmentConfig("GUILD_A", 3);
    const b = await getWarningPunishmentConfig("GUILD_B", 3);

    expect(a.action_type).toBe("kick");
    expect(b.action_type).toBe("ban");
  });
});

// ─── Warning duration parse utility ──────────────────────────────────────────
describe("formatDuration utility", () => {
  function formatDuration(seconds) {
    if (!seconds) return "?";
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  }

  it("formats days", () => expect(formatDuration(86400)).toBe("1d"));
  it("formats hours", () => expect(formatDuration(3600)).toBe("1h"));
  it("formats minutes", () => expect(formatDuration(300)).toBe("5m"));
  it("formats multi-day", () => expect(formatDuration(604800)).toBe("7d"));
  it("returns ? for null/zero", () => expect(formatDuration(0)).toBe("?"));
});
