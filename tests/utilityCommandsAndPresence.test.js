import { describe, it, expect, vi } from "bun:test";
import roleinfoCommand from "../src/commands/utility/roleinfo.js";
import serverinfoCommand from "../src/commands/utility/serverinfo.js";
import { formatCompact, startPresence, stopPresence, ACTIVITY_TYPE_MAP } from "../src/core/presence.js";
import { ActivityType } from "discord.js";

describe("roleinfo command", () => {
  it("should be marked as slashOnly: true and have slashBuilder", () => {
    expect(roleinfoCommand.name).toBe("roleinfo");
    expect(roleinfoCommand.slashOnly).toBe(true);
    expect(roleinfoCommand.slashBuilder).toBeDefined();
    expect(roleinfoCommand.slashBuilder.name).toBe("roleinfo");
    expect(roleinfoCommand.aliases.length).toBe(0);
  });

  it("should ignore non-interaction contexts", async () => {
    const ctx = {
      isInteraction: false,
      reply: vi.fn(),
    };
    await roleinfoCommand.execute(ctx);
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  it("should reply with error if target role is missing", async () => {
    let replyPayload = null;
    const ctx = {
      isInteraction: true,
      guild: {
        roles: { cache: new Map() },
        members: { cache: new Map() },
      },
      options: { role: null },
      reply: vi.fn(async (p) => { replyPayload = p; }),
    };

    await roleinfoCommand.execute(ctx);
    expect(replyPayload).toBeDefined();
    expect(replyPayload.ephemeral).toBe(true);
    expect(replyPayload.embeds[0].data.title).toContain("Error");
  });
});

describe("serverinfo command", () => {
  it("should be marked as slashOnly: true and have slashBuilder", () => {
    expect(serverinfoCommand.name).toBe("serverinfo");
    expect(serverinfoCommand.slashOnly).toBe(true);
    expect(serverinfoCommand.slashBuilder).toBeDefined();
    expect(serverinfoCommand.slashBuilder.name).toBe("serverinfo");
    expect(serverinfoCommand.aliases.length).toBe(0);
  });

  it("should ignore non-interaction contexts", async () => {
    const ctx = {
      isInteraction: false,
      reply: vi.fn(),
    };
    await serverinfoCommand.execute(ctx);
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  it("should generate a rich server overview embed", async () => {
    let replyPayload = null;
    const makeFakeCollection = (entries = []) => {
      const map = new Map(entries);
      map.filter = (fn) => {
        const filtered = new Map();
        for (const [k, v] of map.entries()) {
          if (fn(v, k, map)) filtered.set(k, v);
        }
        return filtered;
      };
      return map;
    };

    const mockGuild = {
      id: "123456789012345678",
      name: "Test Guild",
      createdTimestamp: 1600000000000,
      memberCount: 1500,
      ownerId: "987654321098765432",
      verificationLevel: 1,
      premiumTier: 2,
      premiumSubscriptionCount: 7,
      description: "A great test guild",
      fetchOwner: vi.fn(async () => ({ id: "987654321098765432" })),
      members: {
        cache: makeFakeCollection([
          ["bot1", { user: { bot: true } }],
          ["bot2", { user: { bot: true } }],
        ]),
      },
      channels: {
        cache: makeFakeCollection(),
      },
      roles: {
        cache: makeFakeCollection([["r1", {}], ["r2", {}]]),
      },
      emojis: { cache: makeFakeCollection() },
      stickers: { cache: makeFakeCollection() },
      iconURL: vi.fn(() => "https://example.com/icon.png"),
      bannerURL: vi.fn(() => null),
    };

    const ctx = {
      isInteraction: true,
      guild: mockGuild,
      user: { tag: "Admin#0001", displayAvatarURL: () => "https://example.com/avatar.png" },
      reply: vi.fn(async (p) => { replyPayload = p; }),
    };

    await serverinfoCommand.execute(ctx);
    expect(replyPayload).toBeDefined();
    expect(replyPayload.embeds.length).toBe(1);
    expect(replyPayload.embeds[0].data.title).toContain("Test Guild");
  });
});

describe("Presence Formatter & Rotator", () => {
  it("should format member count in compact format (1.1k, 14.5k, etc.)", () => {
    expect(formatCompact(500)).toBe("500");
    expect(formatCompact(1100)).toBe("1.1k");
    expect(formatCompact(1120)).toBe("1.1k");
    expect(formatCompact(1500)).toBe("1.5k");
    expect(formatCompact(14500)).toBe("14.5k");
    expect(formatCompact(1200000)).toBe("1.2m");
    expect(formatCompact(0)).toBe("0");
    expect(formatCompact(null)).toBe("0");
    expect(formatCompact(undefined)).toBe("0");
  });

  it("should cycle presence activities with compact member formatting", () => {
    let capturedPresence = null;
    const mockClient = {
      user: {
        setPresence: vi.fn((p) => { capturedPresence = p; }),
      },
      guilds: {
        cache: new Map([
          ["g1", { memberCount: 800 }],
          ["g2", { memberCount: 350 }],
        ]),
      },
    };

    // Temporarily clear custom text if set in environment to test rotation
    const oldText = process.env.BOT_ACTIVITY_TEXT;
    delete process.env.BOT_ACTIVITY_TEXT;

    startPresence(mockClient);
    expect(mockClient.user.setPresence).toHaveBeenCalled();
    const callArgs = mockClient.user.setPresence.mock.calls[0][0];
    expect(callArgs.activities[0].name).toBeDefined();

    stopPresence();
    if (oldText) process.env.BOT_ACTIVITY_TEXT = oldText;
  });
});
