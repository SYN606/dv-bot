import { describe, it, expect, vi } from "bun:test";
import { PermissionFlagsBits } from "discord.js";
import {
  parseDuration,
  resolveTargetRole,
  lockChannel,
  unlockChannel,
  hideChannel,
  unhideChannel,
} from "../src/services/channelLockService.js";
import lockCommand from "../src/commands/channels/lock.js";
import unlockCommand from "../src/commands/channels/unlock.js";
import hideCommand from "../src/commands/channels/hide.js";
import unhideCommand from "../src/commands/channels/unhide.js";

describe("Channel Lock Duration Parser", () => {
  it("should parse duration strings accurately", () => {
    expect(parseDuration("30s")).toBe(30);
    expect(parseDuration("10m")).toBe(600);
    expect(parseDuration("2h")).toBe(7200);
    expect(parseDuration("1d")).toBe(86400);
    expect(parseDuration("1w")).toBe(604800);
  });

  it("should return null for invalid or negative durations", () => {
    expect(parseDuration("")).toBeNull();
    expect(parseDuration(null)).toBeNull();
    expect(parseDuration("0m")).toBeNull();
    expect(parseDuration("-5m")).toBeNull();
    expect(parseDuration("invalid")).toBeNull();
  });
});

describe("Channel Lock & Hide Commands Metadata (Slash Only)", () => {
  it("should define lock command as slash-only with correct options", () => {
    expect(lockCommand.name).toBe("lock");
    expect(lockCommand.category).toBe("Channels");
    expect(lockCommand.slashOnly).toBe(true);
    expect(lockCommand.modOnly).toBe(true);
    expect(lockCommand.requiredPermission).toBe(PermissionFlagsBits.ManageChannels);

    const json = lockCommand.slashBuilder.toJSON();
    expect(json.name).toBe("lock");
    expect(json.dm_permission).toBe(false);
    expect(json.options.some((o) => o.name === "duration")).toBe(true);
    expect(json.options.some((o) => o.name === "channel")).toBe(true);
    expect(json.options.some((o) => o.name === "reason")).toBe(true);
  });

  it("should define unlock command as slash-only with correct options", () => {
    expect(unlockCommand.name).toBe("unlock");
    expect(unlockCommand.category).toBe("Channels");
    expect(unlockCommand.slashOnly).toBe(true);
    expect(unlockCommand.modOnly).toBe(true);
    expect(unlockCommand.requiredPermission).toBe(PermissionFlagsBits.ManageChannels);

    const json = unlockCommand.slashBuilder.toJSON();
    expect(json.name).toBe("unlock");
    expect(json.dm_permission).toBe(false);
    expect(json.options.some((o) => o.name === "channel")).toBe(true);
    expect(json.options.some((o) => o.name === "reason")).toBe(true);
  });

  it("should define hide command as slash-only with correct options", () => {
    expect(hideCommand.name).toBe("hide");
    expect(hideCommand.category).toBe("Channels");
    expect(hideCommand.slashOnly).toBe(true);
    expect(hideCommand.modOnly).toBe(true);
    expect(hideCommand.requiredPermission).toBe(PermissionFlagsBits.ManageChannels);

    const json = hideCommand.slashBuilder.toJSON();
    expect(json.name).toBe("hide");
    expect(json.dm_permission).toBe(false);
    expect(json.options.some((o) => o.name === "channel")).toBe(true);
    expect(json.options.some((o) => o.name === "reason")).toBe(true);
  });

  it("should define unhide command as slash-only with correct options", () => {
    expect(unhideCommand.name).toBe("unhide");
    expect(unhideCommand.category).toBe("Channels");
    expect(unhideCommand.slashOnly).toBe(true);
    expect(unhideCommand.modOnly).toBe(true);
    expect(unhideCommand.requiredPermission).toBe(PermissionFlagsBits.ManageChannels);

    const json = unhideCommand.slashBuilder.toJSON();
    expect(json.name).toBe("unhide");
    expect(json.dm_permission).toBe(false);
    expect(json.options.some((o) => o.name === "channel")).toBe(true);
    expect(json.options.some((o) => o.name === "reason")).toBe(true);
  });
});

describe("Channel Lock Service Thread Handling", () => {
  it("should lock a thread using setLocked(true)", async () => {
    const mockThread = {
      id: "thread_1",
      name: "help-thread",
      isThread: () => true,
      locked: false,
      setLocked: vi.fn(async () => {}),
      permissionsFor: () => ({
        has: (perm) => perm === PermissionFlagsBits.ManageThreads,
      }),
    };

    const mockGuild = {
      id: "guild_1",
      members: { me: { id: "bot" } },
    };

    const res = await lockChannel({
      channel: mockThread,
      guild: mockGuild,
      moderator: { tag: "Mod#0001", id: "mod_1" },
    });

    expect(res.success).toBe(true);
    expect(res.isThread).toBe(true);
    expect(mockThread.setLocked).toHaveBeenCalledWith(true, expect.stringContaining("Thread locked by"));
  });

  it("should detect already locked thread", async () => {
    const mockThread = {
      id: "thread_1",
      name: "help-thread",
      isThread: () => true,
      locked: true,
      setLocked: vi.fn(),
      permissionsFor: () => ({
        has: () => true,
      }),
    };

    const mockGuild = {
      id: "guild_1",
      members: { me: { id: "bot" } },
    };

    const res = await lockChannel({
      channel: mockThread,
      guild: mockGuild,
      moderator: { tag: "Mod#0001", id: "mod_1" },
    });

    expect(res.alreadyLocked).toBe(true);
    expect(mockThread.setLocked).not.toHaveBeenCalled();
  });

  it("should unlock a thread using setLocked(false)", async () => {
    const mockThread = {
      id: "thread_1",
      name: "help-thread",
      isThread: () => true,
      locked: true,
      setLocked: vi.fn(async () => {}),
      permissionsFor: () => ({
        has: () => true,
      }),
    };

    const mockGuild = {
      id: "guild_1",
      members: { me: { id: "bot" } },
    };

    const res = await unlockChannel({
      channel: mockThread,
      guild: mockGuild,
      moderator: { tag: "Mod#0001", id: "mod_1" },
    });

    expect(res.success).toBe(true);
    expect(res.isThread).toBe(true);
    expect(mockThread.setLocked).toHaveBeenCalledWith(false, expect.stringContaining("Thread unlocked by"));
  });

  it("should detect thread that is not locked on unlock", async () => {
    const mockThread = {
      id: "thread_1",
      name: "help-thread",
      isThread: () => true,
      locked: false,
      setLocked: vi.fn(),
      permissionsFor: () => ({
        has: () => true,
      }),
    };

    const mockGuild = {
      id: "guild_1",
      members: { me: { id: "bot" } },
    };

    const res = await unlockChannel({
      channel: mockThread,
      guild: mockGuild,
      moderator: { tag: "Mod#0001", id: "mod_1" },
    });

    expect(res.notLocked).toBe(true);
    expect(mockThread.setLocked).not.toHaveBeenCalled();
  });
});

describe("Channel Lock & Unlock Permissions", () => {
  it("should fail lockChannel if bot lacks permissions", async () => {
    const mockChannel = {
      id: "chan_1",
      isThread: () => false,
      permissionsFor: () => ({
        has: () => false,
      }),
    };
    const mockGuild = {
      id: "guild_1",
      members: { me: { id: "bot" } },
    };

    const res = await lockChannel({
      channel: mockChannel,
      guild: mockGuild,
    });

    expect(res.error).toContain("permission");
  });

  it("should deny SendMessages, Threads, and Reactions when locking a text channel", async () => {
    let editedPerms = null;
    const everyoneRole = { id: "guild_1", name: "@everyone" };
    const mockChannel = {
      id: "chan_1",
      isThread: () => false,
      permissionOverwrites: {
        cache: new Map(),
        edit: vi.fn(async (target, perms) => {
          editedPerms = perms;
        }),
      },
      permissionsFor: () => ({
        has: () => true,
      }),
    };

    const mockGuild = {
      id: "guild_1",
      roles: {
        everyone: everyoneRole,
        cache: new Map([["guild_1", everyoneRole]]),
      },
      members: { me: { id: "bot" } },
    };

    const res = await lockChannel({
      channel: mockChannel,
      guild: mockGuild,
      moderator: { tag: "Mod#0001", id: "mod_1" },
    });

    expect(res.success).toBe(true);
    expect(editedPerms).toBeDefined();
    expect(editedPerms.SendMessages).toBe(false);
    expect(editedPerms.SendMessagesInThreads).toBe(false);
    expect(editedPerms.CreatePublicThreads).toBe(false);
    expect(editedPerms.CreatePrivateThreads).toBe(false);
    expect(editedPerms.AddReactions).toBe(false);
  });

  it("should never restore SendMessages to false on unlock", async () => {
    let editedPerms = null;
    const everyoneRole = { id: "guild_1", name: "@everyone" };
    const denySet = new Set([PermissionFlagsBits.SendMessages]);
    const mockOverwrite = {
      deny: { has: (bit) => denySet.has(bit) },
      allow: { has: () => false },
    };

    const mockChannel = {
      id: "chan_1",
      isThread: () => false,
      permissionOverwrites: {
        cache: new Map([["guild_1", mockOverwrite]]),
        edit: vi.fn(async (target, perms) => {
          editedPerms = perms;
        }),
      },
      permissionsFor: () => ({
        has: () => true,
      }),
    };

    const mockGuild = {
      id: "guild_1",
      roles: {
        everyone: everyoneRole,
        cache: new Map([["guild_1", everyoneRole]]),
      },
      members: { me: { id: "bot" } },
    };

    const res = await unlockChannel({
      channel: mockChannel,
      guild: mockGuild,
      moderator: { tag: "Mod#0001", id: "mod_1" },
    });

    expect(res.success).toBe(true);
    expect(editedPerms).toBeDefined();
    expect(editedPerms.SendMessages).not.toBe(false);
    expect(editedPerms.SendMessages).toBeNull();
    expect(editedPerms.SendMessagesInThreads).toBeNull();
    expect(editedPerms.CreatePublicThreads).toBeNull();
    expect(editedPerms.CreatePrivateThreads).toBeNull();
    expect(editedPerms.AddReactions).toBeNull();
  });
});

describe("Channel Hide & Unhide Permissions", () => {
  it("should reject hiding threads", async () => {
    const mockThread = {
      id: "thread_1",
      isThread: () => true,
    };
    const mockGuild = { id: "guild_1" };

    const res = await hideChannel({
      channel: mockThread,
      guild: mockGuild,
    });

    expect(res.error).toContain("Threads cannot be hidden");
  });

  it("should set ViewChannel to false on hide", async () => {
    let editedPerms = null;
    const everyoneRole = { id: "guild_1", name: "@everyone" };
    const mockChannel = {
      id: "chan_1",
      isThread: () => false,
      permissionOverwrites: {
        cache: new Map(),
        edit: vi.fn(async (target, perms) => {
          editedPerms = perms;
        }),
      },
      permissionsFor: () => ({
        has: () => true,
      }),
    };

    const mockGuild = {
      id: "guild_1",
      roles: {
        everyone: everyoneRole,
        cache: new Map([["guild_1", everyoneRole]]),
      },
      members: { me: { id: "bot" } },
    };

    const res = await hideChannel({
      channel: mockChannel,
      guild: mockGuild,
      moderator: { tag: "Mod#0001", id: "mod_1" },
    });

    expect(res.success).toBe(true);
    expect(editedPerms.ViewChannel).toBe(false);
  });

  it("should never set ViewChannel to false on unhide", async () => {
    let editedPerms = null;
    const everyoneRole = { id: "guild_1", name: "@everyone" };
    const denySet = new Set([PermissionFlagsBits.ViewChannel]);
    const mockOverwrite = {
      deny: { has: (bit) => denySet.has(bit) },
      allow: { has: () => false },
    };

    const mockChannel = {
      id: "chan_1",
      isThread: () => false,
      permissionOverwrites: {
        cache: new Map([["guild_1", mockOverwrite]]),
        edit: vi.fn(async (target, perms) => {
          editedPerms = perms;
        }),
      },
      permissionsFor: () => ({
        has: () => true,
      }),
    };

    const mockGuild = {
      id: "guild_1",
      roles: {
        everyone: everyoneRole,
        cache: new Map([["guild_1", everyoneRole]]),
      },
      members: { me: { id: "bot" } },
    };

    const res = await unhideChannel({
      channel: mockChannel,
      guild: mockGuild,
      moderator: { tag: "Mod#0001", id: "mod_1" },
    });

    expect(res.success).toBe(true);
    expect(editedPerms.ViewChannel).not.toBe(false);
    expect(editedPerms.ViewChannel).toBeNull();
  });
});
