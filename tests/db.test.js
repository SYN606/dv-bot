import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { Sequelize } from "sequelize";
import {
  Guild,
  User,
  RestrictedCommand,
  AdminRole,
  MemberAnalytics,
  VerificationConfig,
} from "../src/db/models/index.js";
import {
  disableCommand,
  enableCommand,
  getDisabledCommands,
  isCommandRestricted,
  bulkRestrictCommands,
  bulkUnrestrictCommands,
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

  it("should handle bulk restrict and unrestrict with protected command safeguards", async () => {
    const guildId = "1001";
    const channelId = "3002";
    await RestrictedCommand.destroy({ where: { guild_id: guildId, channel_id: channelId } });

    // Attempt to bulk restrict a list including protected commands ('help', 'adminrole')
    const toRestrict = ["ping", "avatar", "help", "adminrole", "banner"];
    const result = await bulkRestrictCommands(guildId, channelId, toRestrict);

    expect(result.restrictedCount).toBe(3); // ping, avatar, banner
    expect(result.skipped).toContain("help");
    expect(result.skipped).toContain("adminrole");

    // Check that ping, avatar, banner are restricted, but help and adminrole are not
    expect(await isCommandRestricted(guildId, channelId, "ping")).toBe(true);
    expect(await isCommandRestricted(guildId, channelId, "avatar")).toBe(true);
    expect(await isCommandRestricted(guildId, channelId, "banner")).toBe(true);
    expect(await isCommandRestricted(guildId, channelId, "help")).toBe(false);
    expect(await isCommandRestricted(guildId, channelId, "adminrole")).toBe(false);

    // Bulk unrestrict
    const unrestrictRes = await bulkUnrestrictCommands(guildId, channelId, ["ping", "banner"]);
    expect(unrestrictRes.unrestrictCount).toBe(2);

    expect(await isCommandRestricted(guildId, channelId, "ping")).toBe(false);
    expect(await isCommandRestricted(guildId, channelId, "banner")).toBe(false);
    expect(await isCommandRestricted(guildId, channelId, "avatar")).toBe(true);
  });

  it("should preserve 19-digit snowflake IDs verbatim without precision loss or truncation", async () => {
    const guildId = "1550806635440644127";
    const channelId = "1551651185835114560";
    const roleId = "1551609897827967232";
    const logId = "1551651201559429440";

    const [config, created] = await VerificationConfig.upsert({
      guild_id: guildId,
      verify_channel_id: channelId,
      verified_role_id: roleId,
      log_channel_id: logId,
      enabled: true,
      mode: "captcha",
      button_label: "Verify Real User",
    });

    const retrieved = await VerificationConfig.findByPk(guildId);
    expect(retrieved).not.toBeNull();
    // Critical: Verify that none of the last digits are rounded to 000!
    expect(retrieved.guild_id).toBe("1550806635440644127");
    expect(retrieved.verify_channel_id).toBe("1551651185835114560");
    expect(retrieved.verified_role_id).toBe("1551609897827967232");
    expect(retrieved.log_channel_id).toBe("1551651201559429440");
    expect(retrieved.mode).toBe("captcha");
    expect(retrieved.button_label).toBe("Verify Real User");
  });
});
