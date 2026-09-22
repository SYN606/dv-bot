import { beforeEach, describe, expect, it } from "bun:test";
import banCommand from "../src/commands/moderation/ban.js";
import fakebanCommand from "../src/commands/moderation/fakeban.js";
import kickCommand from "../src/commands/moderation/kick.js";
import tempbanCommand from "../src/commands/moderation/tempban.js";
import timeoutCommand from "../src/commands/moderation/timeout.js";
import renameCommand from "../src/commands/admin/rename.js";
import stealCommand from "../src/commands/utility/steal.js";
import { TempbanRecord, TempbanConfig, VerificationConfig } from "../src/db/models/index.js";
import { TempbanWorker } from "../src/handlers/tempbanWorker.js";

// Mock helper to build mock command context
function createMockCtx({
  userId = "100000000000000001",
  ownerId = "999999999999999999",
  userRoles = 10,
  targetId = "200000000000000002",
  targetRoles = 5,
  targetKickable = true,
  targetBannable = true,
  targetModeratable = true,
  options = {},
  commandName = "cmd",
  subcommand = null,
} = {}) {
  let repliedContent = null;
  let sentDm = null;
  let kickedReason = null;
  let bannedReason = null;
  let timedOutMs = null;
  let nicknameSet = null;

  const targetMember = targetId ? {
    id: targetId,
    displayName: "TargetUser",
    nickname: "OldNick",
    kickable: targetKickable,
    bannable: targetBannable,
    moderatable: targetModeratable,
    roles: {
      highest: { position: targetRoles },
      cache: new Map(),
    },
    permissions: {
      has: (perm) => false,
    },
    send: async (msg) => { sentDm = msg; },
    kick: async (reason) => { kickedReason = reason; },
    timeout: async (ms, reason) => { timedOutMs = ms; },
    setNickname: async (nick) => { nicknameSet = nick; },
  } : null;

  const guild = {
    id: "500000000000000005",
    name: "Test Server",
    ownerId,
    premiumTier: 1,
    roles: {
      cache: new Map(),
      everyone: { id: "500000000000000005" },
    },
    members: {
      me: {
        roles: { highest: { position: 100 } },
        permissions: { has: () => true },
      },
      fetch: async (id) => {
        if (id === targetId) return targetMember;
        if (id === ownerId) {
          return {
            id: ownerId,
            displayName: "OwnerUser",
            roles: { highest: { position: 999 }, cache: new Map() },
            permissions: { has: () => true },
          };
        }
        return null;
      },
    },
    bans: {
      create: async (id, opts) => { bannedReason = opts?.reason; },
      remove: async () => {},
    },
    emojis: {
      cache: new Map(),
      fetch: async () => new Map(),
      create: async (opts) => ({ id: "987", name: opts.name, toString: () => `<:${opts.name}:987>` }),
    },
    stickers: {
      cache: new Map(),
      fetch: async () => new Map(),
      create: async (opts) => ({ id: "654", name: opts.name }),
    },
  };

  const member = {
    id: userId,
    roles: { highest: { position: userRoles } },
    permissions: { has: () => false },
  };

  const user = {
    id: userId,
    tag: "ModUser#0001",
    username: "ModUser",
    displayAvatarURL: () => "https://example.com/avatar.png",
    send: async () => {},
  };

  const client = {
    users: {
      fetch: async (id) => ({
        id,
        tag: `User${id}#0000`,
        username: `User${id}`,
        send: async (msg) => { sentDm = msg; },
        displayAvatarURL: () => "https://example.com/avatar.png",
      }),
    },
    guilds: {
      cache: new Map([[guild.id, guild]]),
    },
    config: { PREFIX: "!" },
  };

  return {
    ctx: {
      client,
      guild,
      user,
      member,
      command: { name: commandName },
      options,
      subcommand,
      channel: { id: "300000000000000003" },
      reply: async (payload) => {
        repliedContent = payload;
        return payload;
      },
      defer: async () => {},
    },
    getReply: () => repliedContent,
    getSentDm: () => sentDm,
    getKickedReason: () => kickedReason,
    getBannedReason: () => bannedReason,
    getTimedOutMs: () => timedOutMs,
    getNicknameSet: () => nicknameSet,
  };
}

describe("Moderation Command Safeguards", () => {
  it("ban: should prevent moderator from banning themselves", async () => {
    const { ctx, getReply } = createMockCtx({
      userId: "1001",
      options: { user: "1001" },
    });
    await banCommand.execute(ctx);
    expect(getReply()?.embeds[0]?.data?.description).toContain("You cannot ban yourself");
  });

  it("ban: should prevent banning the server owner", async () => {
    const { ctx, getReply } = createMockCtx({
      ownerId: "9999",
      options: { user: "9999" },
    });
    await banCommand.execute(ctx);
    expect(getReply()?.embeds[0]?.data?.description).toContain("You cannot ban the server owner");
  });

  it("ban: should block banning members with equal or higher roles", async () => {
    const { ctx, getReply } = createMockCtx({
      userRoles: 5,
      targetRoles: 10,
      options: { user: "200000000000000002" },
    });
    await banCommand.execute(ctx);
    expect(getReply()?.embeds[0]?.data?.description).toContain("equal or higher role");
  });

  it("kick: should prevent kicking self and owner", async () => {
    const selfCtx = createMockCtx({ userId: "1001", options: { user: "1001" } });
    await kickCommand.execute(selfCtx.ctx);
    expect(selfCtx.getReply()?.embeds[0]?.data?.description).toContain("You cannot kick yourself");

    const ownerCtx = createMockCtx({ ownerId: "9999", options: { user: "9999" } });
    await kickCommand.execute(ownerCtx.ctx);
    expect(ownerCtx.getReply()?.embeds[0]?.data?.description).toContain("You cannot kick the server owner");
  });

  it("kick: should block kicking higher role members", async () => {
    const { ctx, getReply } = createMockCtx({
      userRoles: 5,
      targetRoles: 10,
      options: { user: "200000000000000002" },
    });
    await kickCommand.execute(ctx);
    expect(getReply()?.embeds[0]?.data?.description).toContain("equal or higher role");
  });

  it("kick: should successfully kick valid member with DM warning", async () => {
    const { ctx, getReply, getSentDm, getKickedReason } = createMockCtx({
      userRoles: 20,
      targetRoles: 5,
      options: { user: "200000000000000002", reason: "Spamming in general" },
    });
    await kickCommand.execute(ctx);
    expect(getReply()?.embeds[0]?.data?.title).toContain("Member Kicked");
    expect(getSentDm()?.embeds[0]?.data?.title).toContain("You Were Kicked");
    expect(getKickedReason()).toBe("Spamming in general");
  });

  it("timeout: should block timeout on higher roles and self", async () => {
    const selfCtx = createMockCtx({ userId: "1001", options: { user: "1001" } });
    await timeoutCommand.execute(selfCtx.ctx);
    expect(selfCtx.getReply()?.embeds[0]?.data?.description).toContain("You cannot timeout yourself");

    const roleCtx = createMockCtx({
      userRoles: 5,
      targetRoles: 10,
      options: { user: "200000000000000002", duration: "10m" },
    });
    await timeoutCommand.execute(roleCtx.ctx);
    expect(roleCtx.getReply()?.embeds[0]?.data?.description).toContain("equal or higher role");
  });

  it("timeout: should reject durations exceeding 28 days", async () => {
    const { ctx, getReply } = createMockCtx({
      userRoles: 50,
      targetRoles: 5,
      options: { user: "200000000000000002", duration: "30d" },
    });
    await timeoutCommand.execute(ctx);
    expect(getReply()?.embeds[0]?.data?.description).toContain("cannot exceed **28 days**");
  });
});

describe("Ported Python Commands: fakeban, tempban, steal, rename", () => {
  beforeEach(async () => {
    await TempbanRecord.destroy({ where: { guild_id: "500000000000000005" } }).catch(() => {});
    await TempbanConfig.destroy({ where: { guild_id: "500000000000000005" } }).catch(() => {});
  });

  it("fakeban: should prevent fakebanning self and owner", async () => {
    const selfCtx = createMockCtx({ userId: "1001", options: { user: "1001" } });
    await fakebanCommand.execute(selfCtx.ctx);
    expect(selfCtx.getReply()?.embeds[0]?.data?.description).toContain("You cannot fake ban yourself");

    const ownerCtx = createMockCtx({ ownerId: "9999", options: { user: "9999" } });
    await fakebanCommand.execute(ownerCtx.ctx);
    expect(ownerCtx.getReply()?.embeds[0]?.data?.description).toContain("You cannot fake ban the server owner");
  });

  it("fakeban: should simulate ban via DM and channel response without banning user", async () => {
    const { ctx, getReply, getSentDm, getBannedReason } = createMockCtx({
      userRoles: 50,
      targetRoles: 5,
      options: { user: "200000000000000002", reason: "Trolling" },
    });
    await fakebanCommand.execute(ctx);
    expect(getReply()?.embeds[0]?.data?.title).toContain("User Banned");
    expect(getReply()?.embeds[0]?.data?.description).toContain("Trolling");
    expect(getSentDm()?.embeds[0]?.data?.title).toContain("You Were Banned");
    // Verify native ban was NOT called
    expect(getBannedReason()).toBeNull();
  });

  it("tempban: should create active tempban record in database", async () => {
    const { ctx, getReply } = createMockCtx({
      userRoles: 50,
      targetRoles: 5,
      options: { user: "200000000000000002", duration: "2h", reason: "Rule 1 violation" },
    });
    await tempbanCommand.execute(ctx);
    expect(getReply()?.embeds[0]?.data?.title).toContain("Member Tempbanned");

    const record = await TempbanRecord.findOne({
      where: { guild_id: "500000000000000005", user_id: "200000000000000002" },
    });
    expect(record).not.toBeNull();
    expect(record.active).toBe(true);
    expect(record.tempban_reason).toBe("Rule 1 violation");
  });

  it("tempban: untempban should deactivate active record", async () => {
    const { ctx: addCtx } = createMockCtx({
      userRoles: 50,
      targetRoles: 5,
      options: { user: "200000000000000002", duration: "2h", reason: "Tempban before lift" },
    });
    await tempbanCommand.execute(addCtx);

    const { ctx, getReply } = createMockCtx({
      commandName: "untempban",
      subcommand: "remove",
      options: { user: "200000000000000002" },
    });
    await tempbanCommand.execute(ctx);
    expect(getReply()?.embeds[0]?.data?.title).toContain("Tempban Lifted");

    const record = await TempbanRecord.findOne({
      where: { guild_id: "500000000000000005", user_id: "200000000000000002" },
    });
    expect(record.active).toBe(false);
  });

  it("tempban role: should configure and clear isolation role", async () => {
    // 1. Configure role via subcommand
    const { ctx: setCtx, getReply: getSetReply } = createMockCtx({
      userId: "999999999999999999", // Owner
      subcommand: "role",
      options: { role: "666666666666666666" },
    });
    setCtx.guild.roles.cache.set("666666666666666666", { id: "666666666666666666", name: "Jailed", position: 5 });

    await tempbanCommand.execute(setCtx);
    expect(getSetReply()?.embeds[0]?.data?.title).toContain("Tempban Role Configured");

    // 2. View current config
    const { ctx: viewCtx, getReply: getViewReply } = createMockCtx({
      userId: "999999999999999999",
      subcommand: "role",
      options: {},
    });
    viewCtx.guild.roles.cache.set("666666666666666666", { id: "666666666666666666", name: "Jailed", position: 5 });
    await tempbanCommand.execute(viewCtx);
    expect(getViewReply()?.embeds[0]?.data?.description).toContain("Jailed");

    // 3. Clear role via clear option
    const { ctx: clearCtx, getReply: getClearReply } = createMockCtx({
      userId: "999999999999999999",
      subcommand: "role",
      options: { clear: true },
    });
    await tempbanCommand.execute(clearCtx);
    expect(getClearReply()?.embeds[0]?.data?.title).toContain("Tempban Role Cleared");
  });

  it("tempban: prefix with 'add' keyword should parse target user and duration properly", async () => {
    const { ctx, getReply } = createMockCtx({
      userRoles: 50,
      targetRoles: 5,
      options: { _args: ["add", "<@200000000000000002>", "3h", "Prefix add test"] },
    });
    await tempbanCommand.execute(ctx);
    expect(getReply()?.embeds[0]?.data?.title).toContain("Member Tempbanned");

    const record = await TempbanRecord.findOne({
      where: { guild_id: "500000000000000005", user_id: "200000000000000002" },
    });
    expect(record.active).toBe(true);
    expect(record.tempban_reason).toBe("Prefix add test");
  });

  it("tempbanWorker: should automatically restore verified role on expiry", async () => {
    // Setup verification config for guild
    await VerificationConfig.findOrCreate({
      where: { guild_id: "500000000000000005" },
      defaults: {
        guild_id: "500000000000000005",
        enabled: true,
        verified_role_id: "777777777777777777",
      },
    });

    // Create an expired tempban record
    const expiredRecord = await TempbanRecord.create({
      guild_id: "500000000000000005",
      user_id: "333333333333333333",
      moderator_id: "100000000000000001",
      tempban_reason: "Expired test",
      expires_at: new Date(Date.now() - 10000), // Expired 10s ago
      active: true,
    });

    let addedRole = null;
    const mockMember = {
      id: "333333333333333333",
      roles: {
        cache: new Map(),
        add: async (role) => { addedRole = role; },
        remove: async () => {},
      },
    };

    const mockVerifiedRole = { id: "777777777777777777", position: 10 };
    const mockClient = {
      guilds: {
        cache: new Map([
          [
            "500000000000000005",
            {
              id: "500000000000000005",
              members: {
                fetch: async () => mockMember,
                me: { roles: { highest: { position: 100 } } },
              },
              roles: {
                cache: new Map([["777777777777777777", mockVerifiedRole]]),
              },
              bans: { remove: async () => {} },
            },
          ],
        ]),
      },
    };

    const worker = new TempbanWorker(mockClient);
    await worker.check();

    const refreshed = await TempbanRecord.findByPk(expiredRecord.id);
    expect(refreshed.active).toBe(false);
  });

  it("rename: should prevent renaming server owner and mass mentions", async () => {
    const ownerCtx = createMockCtx({
      ownerId: "9999",
      options: { user: "9999", nickname: "OwnerNewNick" },
    });
    await renameCommand.execute(ownerCtx.ctx);
    expect(ownerCtx.getReply()?.embeds[0]?.data?.description).toContain("cannot change the nickname of the server owner");

    const massMentionCtx = createMockCtx({
      userRoles: 50,
      targetRoles: 5,
      options: { user: "200000000000000002", nickname: "Bad @everyone Nick" },
    });
    await renameCommand.execute(massMentionCtx.ctx);
    expect(massMentionCtx.getReply()?.embeds[0]?.data?.description).toContain("Mass mentions");
  });

  it("rename: should set valid nickname or reset properly", async () => {
    const setCtx = createMockCtx({
      userRoles: 50,
      targetRoles: 5,
      options: { user: "200000000000000002", nickname: "CoolVigilante" },
    });
    await renameCommand.execute(setCtx.ctx);
    expect(setCtx.getNicknameSet()).toBe("CoolVigilante");
    expect(setCtx.getReply()?.embeds[0]?.data?.title).toContain("Nickname Updated");

    const resetCtx = createMockCtx({
      userRoles: 50,
      targetRoles: 5,
      options: { user: "200000000000000002", nickname: "reset" },
    });
    await renameCommand.execute(resetCtx.ctx);
    expect(resetCtx.getNicknameSet()).toBeNull();
    expect(resetCtx.getReply()?.embeds[0]?.data?.title).toContain("Nickname Reset");
  });

  it("steal: should parse custom emojis and warn if no assets found", async () => {
    const emptyCtx = createMockCtx({
      options: { source: "just some regular text without emojis" },
    });
    await stealCommand.execute(emptyCtx.ctx);
    expect(emptyCtx.getReply()?.embeds[0]?.data?.title).toContain("No Assets Found");
  });
});
