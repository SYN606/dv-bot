import { describe, it, expect, vi } from "bun:test";
import { PermissionFlagsBits } from "discord.js";
import fakebanCommand from "../src/commands/moderation/fakeban.js";

describe("Fakeban Command Configuration", () => {
  it("should have correct metadata and be slash-only", () => {
    expect(fakebanCommand.name).toBe("fakeban");
    expect(fakebanCommand.category).toBe("Moderation");
    expect(fakebanCommand.slashOnly).toBe(true);
    expect(fakebanCommand.modOnly).toBe(true);
    expect(fakebanCommand.requiredPermission).toBe(PermissionFlagsBits.BanMembers);
    expect(fakebanCommand.aliases).toEqual([]);
  });

  it("should define slashBuilder with user and reason options", () => {
    expect(fakebanCommand.slashBuilder).toBeDefined();
    const json = fakebanCommand.slashBuilder.toJSON();

    expect(json.name).toBe("fakeban");
    expect(json.dm_permission).toBe(false);

    const userOpt = json.options.find((o) => o.name === "user");
    expect(userOpt).toBeDefined();
    expect(userOpt.required).toBe(true);

    const reasonOpt = json.options.find((o) => o.name === "reason");
    expect(reasonOpt).toBeDefined();
    expect(reasonOpt.required).toBe(false);
  });
});

describe("Fakeban Command Execution Guards", () => {
  it("should ignore non-interaction contexts", async () => {
    const ctx = {
      isInteraction: false,
      reply: vi.fn(),
    };

    await fakebanCommand.execute(ctx);
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  it("should reject execution outside a guild", async () => {
    const ctx = {
      isInteraction: true,
      guild: null,
      reply: vi.fn(),
    };

    await fakebanCommand.execute(ctx);
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  it("should reject if target user cannot be found", async () => {
    let replyPayload = null;
    const ctx = {
      isInteraction: true,
      guild: { id: "guild_1" },
      user: { id: "mod_1", tag: "Mod#0001" },
      options: {},
      interaction: {
        options: {
          getUser: () => null,
          getString: () => null,
        },
      },
      client: {
        users: { fetch: vi.fn().mockResolvedValue(null) },
      },
      reply: vi.fn(async (p) => {
        replyPayload = p;
      }),
    };

    await fakebanCommand.execute(ctx);
    expect(replyPayload).toBeDefined();
    expect(replyPayload.ephemeral).toBe(true);
    expect(replyPayload.embeds[0].data.title).toContain("User Not Found");
  });

  it("should reject if user lacks mock operation permissions", async () => {
    let replyPayload = null;
    const ctx = {
      isInteraction: true,
      guild: { id: "guild_1", ownerId: "owner_1" },
      user: { id: "regular_user", tag: "User#0001" },
      member: {
        id: "regular_user",
        permissions: { has: () => false },
      },
      options: { user: "target_1" },
      interaction: {
        options: {
          getUser: () => ({ id: "target_1", tag: "Target#0001" }),
          getString: () => "Testing",
        },
      },
      reply: vi.fn(async (p) => {
        replyPayload = p;
      }),
    };

    await fakebanCommand.execute(ctx);
    expect(replyPayload).toBeDefined();
    expect(replyPayload.ephemeral).toBe(true);
    expect(replyPayload.embeds[0].data.title).toContain("Permission Denied");
  });

  it("should reject if target is self", async () => {
    let replyPayload = null;
    const ctx = {
      isInteraction: true,
      guild: { id: "guild_1", ownerId: "owner_1" },
      user: { id: "mod_1", tag: "Mod#0001" },
      member: {
        id: "mod_1",
        permissions: { has: (p) => p === PermissionFlagsBits.BanMembers },
      },
      options: { user: "mod_1" },
      interaction: {
        options: {
          getUser: () => ({ id: "mod_1", tag: "Mod#0001" }),
          getString: () => null,
        },
      },
      reply: vi.fn(async (p) => {
        replyPayload = p;
      }),
    };

    await fakebanCommand.execute(ctx);
    expect(replyPayload).toBeDefined();
    expect(replyPayload.ephemeral).toBe(true);
    expect(replyPayload.embeds[0].data.description).toContain("cannot fake ban yourself");
  });

  it("should reject if target is server owner", async () => {
    let replyPayload = null;
    const ctx = {
      isInteraction: true,
      guild: { id: "guild_1", ownerId: "owner_1" },
      user: { id: "mod_1", tag: "Mod#0001" },
      member: {
        id: "mod_1",
        permissions: { has: (p) => p === PermissionFlagsBits.BanMembers },
      },
      options: { user: "owner_1" },
      interaction: {
        options: {
          getUser: () => ({ id: "owner_1", tag: "Owner#0001" }),
          getString: () => null,
        },
      },
      reply: vi.fn(async (p) => {
        replyPayload = p;
      }),
    };

    await fakebanCommand.execute(ctx);
    expect(replyPayload).toBeDefined();
    expect(replyPayload.ephemeral).toBe(true);
    expect(replyPayload.embeds[0].data.description).toContain("cannot fake ban the server owner");
  });

  it("should reject if target is the bot itself", async () => {
    let replyPayload = null;
    const ctx = {
      isInteraction: true,
      guild: { id: "guild_1", ownerId: "owner_1" },
      user: { id: "mod_1", tag: "Mod#0001" },
      member: {
        id: "mod_1",
        permissions: { has: (p) => p === PermissionFlagsBits.BanMembers },
      },
      client: {
        user: { id: "bot_id" },
      },
      options: { user: "bot_id" },
      interaction: {
        options: {
          getUser: () => ({ id: "bot_id", tag: "Bot#0001" }),
          getString: () => null,
        },
      },
      reply: vi.fn(async (p) => {
        replyPayload = p;
      }),
    };

    await fakebanCommand.execute(ctx);
    expect(replyPayload).toBeDefined();
    expect(replyPayload.ephemeral).toBe(true);
    expect(replyPayload.embeds[0].data.description).toContain("cannot fake ban the bot");
  });

  it("should reject if target is administrator and moderator is not owner", async () => {
    let replyPayload = null;
    const ctx = {
      isInteraction: true,
      guild: {
        id: "guild_1",
        ownerId: "owner_1",
        members: {
          fetch: vi.fn().mockResolvedValue({
            id: "admin_target",
            permissions: { has: (p) => p === PermissionFlagsBits.Administrator },
            roles: { highest: { position: 10 } },
          }),
        },
      },
      user: { id: "mod_1", tag: "Mod#0001" },
      member: {
        id: "mod_1",
        permissions: { has: (p) => p === PermissionFlagsBits.BanMembers },
        roles: { highest: { position: 5 } },
      },
      client: { user: { id: "bot_id" } },
      options: { user: "admin_target" },
      interaction: {
        options: {
          getUser: () => ({ id: "admin_target", tag: "Admin#0001" }),
          getString: () => "Testing",
        },
      },
      reply: vi.fn(async (p) => {
        replyPayload = p;
      }),
    };

    await fakebanCommand.execute(ctx);
    expect(replyPayload).toBeDefined();
    expect(replyPayload.ephemeral).toBe(true);
    expect(replyPayload.embeds[0].data.description).toContain("fake ban an administrator");
  });

  it("should successfully fakeban a target, sending mock DM and public embed", async () => {
    let replyPayload = null;
    const sendDmFn = vi.fn().mockResolvedValue(true);
    const targetUser = {
      id: "target_1",
      tag: "Target#0001",
      username: "Target",
      send: sendDmFn,
    };

    const ctx = {
      isInteraction: true,
      guild: {
        id: "guild_1",
        name: "Test Guild",
        ownerId: "owner_1",
        members: {
          fetch: vi.fn().mockResolvedValue({
            id: "target_1",
            permissions: { has: () => false },
            roles: { highest: { position: 2 } },
          }),
        },
      },
      user: {
        id: "mod_1",
        tag: "Mod#0001",
        username: "Mod",
        displayAvatarURL: () => "https://example.com/avatar.png",
      },
      member: {
        id: "mod_1",
        permissions: { has: (p) => p === PermissionFlagsBits.BanMembers },
        roles: { highest: { position: 5 } },
      },
      client: { user: { id: "bot_id" } },
      options: { user: "target_1", reason: "Spamming memes" },
      interaction: {
        options: {
          getUser: () => targetUser,
          getString: () => "Spamming memes",
        },
      },
      reply: vi.fn(async (p) => {
        replyPayload = p;
      }),
    };

    await fakebanCommand.execute(ctx);

    // Mock DM was sent to target
    expect(sendDmFn).toHaveBeenCalled();
    const dmArgs = sendDmFn.mock.calls[0][0];
    expect(dmArgs.embeds[0].data.title).toContain("You Were Banned");
    expect(dmArgs.embeds[0].data.description).toContain("Spamming memes");

    // Public channel embed was sent
    expect(replyPayload).toBeDefined();
    expect(replyPayload.ephemeral).toBeUndefined();
    expect(replyPayload.embeds[0].data.title).toContain("User Banned");
    expect(replyPayload.embeds[0].data.description).toContain("Target#0001");
    expect(replyPayload.embeds[0].data.description).toContain("Spamming memes");
  });
});
