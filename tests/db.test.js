import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { Sequelize } from "sequelize";
import {
  Guild,
  User,
  RestrictedCommand,
  AdminRole,
  MemberAnalytics,
} from "../src/db/models/index.js";
import {
  disableCommand,
  enableCommand,
  getDisabledCommands,
  isCommandRestricted,
} from "../src/db/helpers/channelCommandRestrict.js";

describe("Database & Model Tests (Sequelize Multi-DB)", () => {
  it("should create and query models cleanly", async () => {
    const [guild] = await Guild.findOrCreate({ where: { guild_id: "1001" } });
    expect(String(guild.guild_id)).toBe("1001");

    const [user] = await User.findOrCreate({ where: { user_id: "2001" } });
    expect(String(user.user_id)).toBe("2001");
  });

  it("should handle channel command disable/enable flow", async () => {
    const guildId = "1001";
    const channelId = "3001";

    // 1. Initial state: not restricted
    const initialRestricted = await isCommandRestricted(guildId, channelId, "userstats");
    expect(initialRestricted).toBe(false);

    // 2. Disable command
    const changed = await disableCommand(guildId, channelId, "userstats");
    expect(changed).toBe(true);

    // 3. Verify it is now restricted
    const isBlocked = await isCommandRestricted(guildId, channelId, "userstats");
    expect(isBlocked).toBe(true);

    const disabledList = await getDisabledCommands(guildId, channelId);
    expect(disabledList).toContain("userstats");

    // 4. Idempotent disable returns false
    const secondDisable = await disableCommand(guildId, channelId, "userstats");
    expect(secondDisable).toBe(false);

    // 5. Re-enable command
    const reenabled = await enableCommand(guildId, channelId, "userstats");
    expect(reenabled).toBe(true);

    const isBlockedAfter = await isCommandRestricted(guildId, channelId, "userstats");
    expect(isBlockedAfter).toBe(false);
  });
});
