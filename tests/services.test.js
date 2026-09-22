import { describe, expect, it, beforeAll } from "bun:test";
import { initDb } from "../src/db/index.js";
import {
  ChannelLockService,
  TempbanService,
  VerificationService,
  ModerationService,
} from "../src/services/index.js";
import { ChannelPermissionSnapshot, VerificationConfig, TempbanRecord, TempbanConfig } from "../src/db/models/index.js";

describe("Microservices Architectural Domain Services Tests", () => {
  const guildId = "990001";
  const channelId = "990002";
  const verifiedRoleId = "990003";

  beforeAll(async () => {
    await initDb();
  });

  describe("ChannelLockService", () => {
    it("should parse duration strings accurately", () => {
      expect(ChannelLockService.parseDuration("30s")).toBe(30);
      expect(ChannelLockService.parseDuration("15m")).toBe(900);
      expect(ChannelLockService.parseDuration("2h")).toBe(7200);
      expect(ChannelLockService.parseDuration("1d")).toBe(86400);
      expect(ChannelLockService.parseDuration("1w")).toBe(604800);
      expect(ChannelLockService.parseDuration("invalid")).toBeNull();
    });

    it("should resolve @everyone when verification is disabled", async () => {
      const mockGuild = {
        id: guildId,
        roles: {
          everyone: { id: guildId, name: "@everyone" },
          cache: new Map(),
        },
      };

      const result = await ChannelLockService.resolveTargetRole(mockGuild);
      expect(result.usingVerifiedRole).toBe(false);
      expect(result.role.name).toBe("@everyone");
    });

    it("should resolve verified role when verification is enabled with verified_role_id", async () => {
      const [cfg] = await VerificationConfig.findOrCreate({
        where: { guild_id: guildId },
        defaults: { guild_id: guildId, enabled: true, verified_role_id: verifiedRoleId },
      });
      cfg.enabled = true;
      cfg.verified_role_id = verifiedRoleId;
      await cfg.save();

      const mockVerifiedRole = { id: verifiedRoleId, name: "Citizens" };
      const mockGuild = {
        id: guildId,
        roles: {
          everyone: { id: guildId, name: "@everyone" },
          cache: new Map([[verifiedRoleId, mockVerifiedRole]]),
        },
      };

      const result = await ChannelLockService.resolveTargetRole(mockGuild);
      expect(result.usingVerifiedRole).toBe(true);
      expect(result.verifiedRoleName).toBe("Citizens");
    });

    it("should lock channel and snapshot permissions, then unlock and restore", async () => {
      let editedOverwrites = null;
      const mockTargetRole = { id: guildId, name: "@everyone" };
      const mockChannel = {
        id: channelId,
        name: "general",
        permissionOverwrites: {
          cache: new Map(),
          edit: async (role, perms) => { editedOverwrites = perms; },
        },
      };

      const mockGuild = {
        id: guildId,
        name: "Test Guild",
        roles: {
          everyone: mockTargetRole,
          cache: new Map(),
        },
        channels: { cache: new Map([[channelId, mockChannel]]) },
      };

      // 1. Lock channel
      const lockRes = await ChannelLockService.lockChannel({
        channel: mockChannel,
        guild: mockGuild,
        moderator: { id: "mod_1", tag: "Mod#0001" },
        durationStr: "10m",
      });

      expect(lockRes.success).toBe(true);
      expect(editedOverwrites.SendMessages).toBe(false);
      expect(editedOverwrites.AddReactions).toBe(false);

      // Verify DB snapshot exists
      const snapshot = await ChannelPermissionSnapshot.findOne({
        where: { guild_id: guildId, channel_id: channelId, permission_name: "SendMessages" },
      });
      expect(snapshot).not.toBeNull();

      // 2. Unlock channel
      const unlockRes = await ChannelLockService.unlockChannel({
        channel: mockChannel,
        guild: mockGuild,
        moderator: { id: "mod_1", tag: "Mod#0001" },
      });

      expect(unlockRes.success).toBe(true);
      const snapshotAfter = await ChannelPermissionSnapshot.findOne({
        where: { guild_id: guildId, channel_id: channelId, permission_name: "SendMessages" },
      });
      expect(snapshotAfter).toBeNull();
    });
  });

  describe("TempbanService", () => {
    it("should parse and format durations correctly", () => {
      expect(TempbanService.parseDuration("2h")).toBe(7200);
      expect(TempbanService.formatDuration(7200)).toBe("2 hours");
      expect(TempbanService.formatDuration(86400)).toBe("1 day");
      expect(TempbanService.formatDuration(45)).toBe("45 seconds");
    });

    it("should execute tempban and persist record", async () => {
      let banCreatedReason = null;
      let dmSent = null;

      const mockTargetMember = {
        id: "victim_1",
        send: async (payload) => { dmSent = payload; },
      };

      const mockGuild = {
        id: guildId,
        name: "Test Server",
        roles: { cache: new Map() },
        bans: {
          create: async (id, opts) => { banCreatedReason = opts.reason; },
          remove: async () => {},
        },
      };

      const res = await TempbanService.executeTempban({
        guild: mockGuild,
        moderator: { id: "mod_99", tag: "Admin#0001" },
        targetMember: mockTargetMember,
        durationSeconds: 3600,
        reason: "Disruptive behavior",
      });

      expect(res.success).toBe(true);
      expect(dmSent).not.toBeNull();
      expect(banCreatedReason).toContain("Disruptive behavior");

      const record = await TempbanRecord.findOne({
        where: { guild_id: guildId, user_id: "victim_1" },
      });
      expect(record).not.toBeNull();
      expect(record.active).toBe(true);

      // Lift tempban
      const liftRes = await TempbanService.liftTempban({
        guild: mockGuild,
        targetUserId: "victim_1",
        reason: "Appeal accepted",
      });
      expect(liftRes.success).toBe(true);

      const refreshed = await TempbanRecord.findOne({
        where: { guild_id: guildId, user_id: "victim_1" },
      });
      expect(refreshed.active).toBe(false);
    });
  });

  describe("VerificationService", () => {
    it("should validate account age limits", () => {
      const youngAccount = {
        createdTimestamp: Date.now() - 3600 * 1000 * 12, // 12 hours old
      };
      const matureAccount = {
        createdTimestamp: Date.now() - 3600 * 1000 * 48, // 48 hours old
      };

      const youngCheck = VerificationService.checkAccountAge(youngAccount, 24);
      expect(youngCheck.passed).toBe(false);
      expect(youngCheck.shortfallHours).toBeGreaterThan(11);

      const matureCheck = VerificationService.checkAccountAge(matureAccount, 24);
      expect(matureCheck.passed).toBe(true);
      expect(matureCheck.shortfallHours).toBe(0);
    });

    it("should manage verification configuration lifecycle", async () => {
      const cfg = await VerificationService.saveVerificationConfig(guildId, {
        enabled: true,
        mode: "button",
        min_account_age_hours: 12,
        button_label: "Join The Server",
      });

      expect(cfg.enabled).toBe(true);
      expect(cfg.min_account_age_hours).toBe(12);
      expect(cfg.button_label).toBe("Join The Server");

      const reset = await VerificationService.resetVerificationConfig(guildId);
      expect(reset.enabled).toBe(false);
      expect(reset.button_label).toBe("Verify Access");
    });
  });

  describe("ModerationService", () => {
    it("should execute kick, ban, unban, and timeout with audit logging", async () => {
      let kicked = false;
      let timedOutMs = null;
      let bannedId = null;
      let unbannedId = null;

      const mockMember = {
        id: "bad_user_1",
        send: async () => {},
        kick: async () => { kicked = true; },
        timeout: async (ms) => { timedOutMs = ms; },
      };

      const mockGuild = {
        id: guildId,
        name: "Mod Server",
        bans: {
          create: async (id) => { bannedId = id; },
          remove: async (id) => { unbannedId = id; },
        },
      };

      const mod = { id: "mod_lead", tag: "HeadMod#0001" };

      await ModerationService.executeKick({
        guild: mockGuild,
        moderator: mod,
        targetMember: mockMember,
        reason: "Rule violation",
      });
      expect(kicked).toBe(true);

      await ModerationService.executeTimeout({
        guild: mockGuild,
        moderator: mod,
        targetMember: mockMember,
        durationMs: 600000,
        reason: "Spam timeout",
      });
      expect(timedOutMs).toBe(600000);

      await ModerationService.executeBan({
        guild: mockGuild,
        moderator: mod,
        targetUser: { id: "bad_user_1", send: async () => {} },
        reason: "Malicious raid",
      });
      expect(bannedId).toBe("bad_user_1");

      await ModerationService.executeUnban({
        guild: mockGuild,
        moderator: mod,
        targetUserId: "bad_user_1",
        reason: "Unbanned on appeal",
      });
      expect(unbannedId).toBe("bad_user_1");
    });
  });
});
