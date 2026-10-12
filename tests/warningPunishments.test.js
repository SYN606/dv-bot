/**
 * Tests for Warning Punishment Config DB helper
 * Uses bun:test (native bun test runner)
 * Run: bun test tests/
 */
import { describe, it, expect, beforeAll, beforeEach } from "bun:test";
import { getDb } from "../src/db/index.js";
import { warningPunishmentConfig } from "../src/db/schema/sqlite.js";
import { inArray } from "drizzle-orm";

// Ensure DB schema is loaded
beforeAll(() => {
  getDb();
});

// --- Warning Punishment Config tests ---
describe("warningPunishments helper", () => {
  let setWarningPunishmentConfig, getWarningPunishmentConfig, getAllWarningPunishmentConfigs, removeWarningPunishmentConfig;

  beforeAll(async () => {
    const helpers = await import("../src/db/helpers/warningPunishments.js");
    setWarningPunishmentConfig = helpers.setWarningPunishmentConfig;
    getWarningPunishmentConfig = helpers.getWarningPunishmentConfig;
    getAllWarningPunishmentConfigs = helpers.getAllWarningPunishmentConfigs;
    removeWarningPunishmentConfig = helpers.removeWarningPunishmentConfig;
  });

  const GUILD = "111111111111111111";

  beforeEach(async () => {
    const db = getDb();
    await db
      .delete(warningPunishmentConfig)
      .where(inArray(warningPunishmentConfig.guild_id, [GUILD, "GUILD_A", "GUILD_B"]))
      .run();
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

// --- Warning duration parse utility ---
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
