import { describe, it, expect, vi } from "bun:test";
import { PermissionFlagsBits } from "discord.js";
import purgeCommand from "../src/commands/admin/purge.js";

describe("Purge Command Configuration", () => {
  it("should have correct command metadata and be slash-only", () => {
    expect(purgeCommand.name).toBe("purge");
    expect(purgeCommand.slashOnly).toBe(true);
    expect(purgeCommand.modOnly).toBe(true);
    expect(purgeCommand.requiredPermission).toBe(PermissionFlagsBits.ManageMessages);
    expect(purgeCommand.category).toBe("Admin");
  });

  it("should define slashBuilder with amount (1-1000) and optional user", () => {
    expect(purgeCommand.slashBuilder).toBeDefined();
    const json = purgeCommand.slashBuilder.toJSON();

    expect(json.name).toBe("purge");
    expect(json.dm_permission).toBe(false);

    const amountOpt = json.options.find((o) => o.name === "amount");
    expect(amountOpt).toBeDefined();
    expect(amountOpt.required).toBe(true);
    expect(amountOpt.min_value).toBe(1);
    expect(amountOpt.max_value).toBe(1000);

    const userOpt = json.options.find((o) => o.name === "user");
    expect(userOpt).toBeDefined();
    expect(userOpt.required).toBe(false);
  });
});

describe("Purge Command Execution Guards", () => {
  it("should ignore non-interaction contexts", async () => {
    const ctx = {
      isInteraction: false,
      defer: vi.fn(),
      reply: vi.fn(),
    };

    await purgeCommand.execute(ctx);
    expect(ctx.defer).not.toHaveBeenCalled();
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  it("should reject execution outside guilds", async () => {
    let replyPayload = null;
    const ctx = {
      isInteraction: true,
      defer: vi.fn(),
      guild: null,
      channel: { isTextBased: () => true, bulkDelete: () => {} },
      reply: vi.fn(async (p) => {
        replyPayload = p;
      }),
      interaction: { options: { getInteger: () => 10 } },
    };

    await purgeCommand.execute(ctx);
    expect(ctx.defer).toHaveBeenCalledWith({ ephemeral: true });
    expect(ctx.reply).toHaveBeenCalled();
    expect(replyPayload.embeds[0].data.title).toContain("Command Error");
  });

  it("should reject channels that cannot bulkDelete", async () => {
    let replyPayload = null;
    const ctx = {
      isInteraction: true,
      defer: vi.fn(),
      guild: { id: "123" },
      channel: { isTextBased: () => false },
      reply: vi.fn(async (p) => {
        replyPayload = p;
      }),
      interaction: { options: { getInteger: () => 10 } },
    };

    await purgeCommand.execute(ctx);
    expect(replyPayload.embeds[0].data.title).toContain("Invalid Channel");
  });

  it("should reject archived threads", async () => {
    let replyPayload = null;
    const ctx = {
      isInteraction: true,
      defer: vi.fn(),
      guild: { id: "123" },
      channel: {
        isTextBased: () => true,
        bulkDelete: () => {},
        isThread: () => true,
        archived: true,
      },
      reply: vi.fn(async (p) => {
        replyPayload = p;
      }),
      interaction: { options: { getInteger: () => 10 } },
    };

    await purgeCommand.execute(ctx);
    expect(replyPayload.embeds[0].data.title).toContain("Thread Archived");
  });

  it("should reject when bot lacks ManageMessages permission", async () => {
    let replyPayload = null;
    const botMember = { id: "bot" };
    const ctx = {
      isInteraction: true,
      defer: vi.fn(),
      guild: {
        id: "123",
        members: { me: botMember },
      },
      channel: {
        isTextBased: () => true,
        bulkDelete: () => {},
        permissionsFor: () => ({
          has: (perm) => perm !== PermissionFlagsBits.ManageMessages,
        }),
      },
      reply: vi.fn(async (p) => {
        replyPayload = p;
      }),
      interaction: { options: { getInteger: () => 10 } },
    };

    await purgeCommand.execute(ctx);
    expect(replyPayload.embeds[0].data.title).toContain("Missing Permissions");
    expect(replyPayload.embeds[0].data.description).toContain("Manage Messages");
  });

  it("should reject when bot lacks ReadMessageHistory permission", async () => {
    let replyPayload = null;
    const botMember = { id: "bot" };
    const ctx = {
      isInteraction: true,
      defer: vi.fn(),
      guild: {
        id: "123",
        members: { me: botMember },
      },
      channel: {
        isTextBased: () => true,
        bulkDelete: () => {},
        permissionsFor: () => ({
          has: (perm) => perm !== PermissionFlagsBits.ReadMessageHistory,
        }),
      },
      reply: vi.fn(async (p) => {
        replyPayload = p;
      }),
      interaction: { options: { getInteger: () => 10 } },
    };

    await purgeCommand.execute(ctx);
    expect(replyPayload.embeds[0].data.title).toContain("Missing Permissions");
    expect(replyPayload.embeds[0].data.description).toContain("Read Message History");
  });

  it("should handle single message deletion cleanly without calling bulkDelete", async () => {
    const mockMessage = {
      id: "msg_1",
      pinned: false,
      author: { id: "user_1" },
      createdTimestamp: Date.now() - 1000,
      delete: vi.fn(async () => {}),
    };

    const mockMessagesMap = new Map([["msg_1", mockMessage]]);
    mockMessagesMap.last = () => mockMessage;

    const mockBulkDelete = vi.fn(async () => ({ size: 0 }));
    let replyPayload = null;

    const ctx = {
      isInteraction: true,
      defer: vi.fn(),
      user: { id: "mod_1", tag: "Mod#0001" },
      guild: {
        id: "guild_123",
        members: { me: { id: "bot_1" } },
      },
      channel: {
        id: "chan_123",
        isTextBased: () => true,
        bulkDelete: mockBulkDelete,
        permissionsFor: () => ({ has: () => true }),
        messages: {
          fetch: vi.fn(async () => mockMessagesMap),
        },
      },
      reply: vi.fn(async (p) => {
        replyPayload = p;
      }),
      interaction: {
        options: {
          getInteger: (name) => (name === "amount" ? 1 : null),
          getUser: () => null,
        },
      },
    };

    await purgeCommand.execute(ctx);

    // Verify chunk.length === 1 uses msg.delete() directly
    expect(mockMessage.delete).toHaveBeenCalledTimes(1);
    expect(mockBulkDelete).not.toHaveBeenCalled();
    expect(replyPayload.embeds[0].data.title).toContain("Messages Purged");
    expect(replyPayload.embeds[0].data.description).toContain("Successfully deleted **1** messages");
  });
});
