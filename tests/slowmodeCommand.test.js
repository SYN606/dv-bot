import { describe, it, expect, vi } from "bun:test";
import { PermissionFlagsBits } from "discord.js";
import slowmodeCommand from "../src/commands/channels/slowmode.js";

describe("Slowmode Command Configuration", () => {
  it("should have correct metadata and be slash-only", () => {
    expect(slowmodeCommand.name).toBe("slowmode");
    expect(slowmodeCommand.category).toBe("Channels");
    expect(slowmodeCommand.slashOnly).toBe(true);
    expect(slowmodeCommand.modOnly).toBe(true);
    expect(slowmodeCommand.requiredPermission).toBe(PermissionFlagsBits.ManageChannels);
  });

  it("should define slashBuilder with seconds (0-21600), channel, and reason", () => {
    expect(slowmodeCommand.slashBuilder).toBeDefined();
    const json = slowmodeCommand.slashBuilder.toJSON();

    expect(json.name).toBe("slowmode");
    expect(json.dm_permission).toBe(false);

    const secondsOpt = json.options.find((o) => o.name === "seconds");
    expect(secondsOpt).toBeDefined();
    expect(secondsOpt.required).toBe(true);
    expect(secondsOpt.min_value).toBe(0);
    expect(secondsOpt.max_value).toBe(21600);

    const channelOpt = json.options.find((o) => o.name === "channel");
    expect(channelOpt).toBeDefined();
    expect(channelOpt.required).toBe(false);

    const reasonOpt = json.options.find((o) => o.name === "reason");
    expect(reasonOpt).toBeDefined();
    expect(reasonOpt.required).toBe(false);
  });
});

describe("Slowmode Command Execution Guards", () => {
  it("should ignore non-interaction contexts", async () => {
    const ctx = {
      isInteraction: false,
      reply: vi.fn(),
    };

    await slowmodeCommand.execute(ctx);
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  it("should reject channels that do not support rate limits", async () => {
    let replyPayload = null;
    const ctx = {
      isInteraction: true,
      guild: { id: "guild_1" },
      channel: { id: "cat_1" }, // No setRateLimitPerUser
      reply: vi.fn(async (p) => {
        replyPayload = p;
      }),
    };

    await slowmodeCommand.execute(ctx);
    expect(replyPayload.embeds[0].data.title).toContain("Unsupported Channel");
  });

  it("should reject when bot lacks ManageChannels permission", async () => {
    let replyPayload = null;
    const mockChannel = {
      id: "chan_1",
      name: "general",
      isThread: () => false,
      setRateLimitPerUser: vi.fn(),
      permissionsFor: () => ({
        has: () => false,
      }),
    };

    const ctx = {
      isInteraction: true,
      user: { id: "mod_1", tag: "Mod#0001" },
      guild: {
        id: "guild_1",
        members: { me: { id: "bot" } },
      },
      channel: mockChannel,
      reply: vi.fn(async (p) => {
        replyPayload = p;
      }),
      interaction: {
        options: {
          getInteger: () => 10,
          getChannel: () => null,
          getString: () => null,
        },
      },
    };

    await slowmodeCommand.execute(ctx);
    expect(replyPayload.embeds[0].data.title).toContain("Missing Permissions");
    expect(mockChannel.setRateLimitPerUser).not.toHaveBeenCalled();
  });

  it("should successfully set slowmode and send response", async () => {
    let replyPayload = null;
    const mockChannel = {
      id: "chan_1",
      name: "general",
      isThread: () => false,
      setRateLimitPerUser: vi.fn(async () => {}),
      permissionsFor: () => ({
        has: () => true,
      }),
    };

    const ctx = {
      isInteraction: true,
      user: { id: "mod_1", tag: "Mod#0001", username: "mod" },
      guild: {
        id: "guild_1",
        members: { me: { id: "bot" } },
      },
      channel: mockChannel,
      reply: vi.fn(async (p) => {
        replyPayload = p;
      }),
      interaction: {
        options: {
          getInteger: (name) => (name === "seconds" ? 300 : null),
          getChannel: () => null,
          getString: (name) => (name === "reason" ? "Raid prevention" : null),
        },
      },
    };

    await slowmodeCommand.execute(ctx);
    expect(mockChannel.setRateLimitPerUser).toHaveBeenCalledWith(
      300,
      expect.stringContaining("Raid prevention")
    );
    expect(replyPayload.embeds[0].data.title).toContain("Slowmode Enabled");
    expect(replyPayload.embeds[0].data.description).toContain("5 minutes");
  });

  it("should successfully disable slowmode when seconds is 0", async () => {
    let replyPayload = null;
    const mockChannel = {
      id: "chan_1",
      name: "general",
      isThread: () => false,
      setRateLimitPerUser: vi.fn(async () => {}),
      permissionsFor: () => ({
        has: () => true,
      }),
    };

    const ctx = {
      isInteraction: true,
      user: { id: "mod_1", tag: "Mod#0001", username: "mod" },
      guild: {
        id: "guild_1",
        members: { me: { id: "bot" } },
      },
      channel: mockChannel,
      reply: vi.fn(async (p) => {
        replyPayload = p;
      }),
      interaction: {
        options: {
          getInteger: (name) => (name === "seconds" ? 0 : null),
          getChannel: () => null,
          getString: () => null,
        },
      },
    };

    await slowmodeCommand.execute(ctx);
    expect(mockChannel.setRateLimitPerUser).toHaveBeenCalledWith(0, expect.any(String));
    expect(replyPayload.embeds[0].data.title).toContain("Slowmode Disabled");
  });
});
