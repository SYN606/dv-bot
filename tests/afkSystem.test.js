import { describe, it, expect, vi, beforeEach } from "bun:test";
import {
  setAfkStatus,
  getAfkStatus,
  isUserAfkQuick,
  addAfkMention,
  removeAfkStatus,
  clearAfkCache,
} from "../src/db/helpers/afk.js";
import { handleAfk, clearAfkHandlerState } from "../src/handlers/afkHandler.js";
import afkCommand from "../src/commands/utility/afk.js";

describe("AFK Database & Cache Helpers", () => {
  const guildId = "test_guild_afk_1";
  const userId = "test_user_afk_1";

  beforeEach(async () => {
    clearAfkCache();
    clearAfkHandlerState();
    await removeAfkStatus(userId, guildId).catch(() => {});
  });

  it("should set and retrieve AFK status with memory caching", async () => {
    const record = await setAfkStatus(userId, guildId, "Studying for exams", "OriginalNick");
    expect(record).toBeDefined();
    expect(record.afk_reason).toBe("Studying for exams");

    expect(isUserAfkQuick(userId, guildId)).toBe(true);

    const retrieved = await getAfkStatus(userId, guildId);
    expect(retrieved).toBeDefined();
    expect(retrieved.user_id).toBe(userId);
    expect(retrieved.guild_id).toBe(guildId);
    expect(retrieved.afk_reason).toBe("Studying for exams");
    expect(retrieved.original_nickname).toBe("OriginalNick");
  });

  it("should preserve original nickname if updating reason while already AFK", async () => {
    await setAfkStatus(userId, guildId, "First reason", "MyRealNick");
    
    // User updates their AFK reason; command would pass [AFK] MyRealNick if not protected
    await setAfkStatus(userId, guildId, "Second reason", "[AFK] MyRealNick");

    const status = await getAfkStatus(userId, guildId);
    expect(status.afk_reason).toBe("Second reason");
    expect(status.original_nickname).toBe("MyRealNick");
  });

  it("should safely serialize concurrent mention additions without losing data", async () => {
    await setAfkStatus(userId, guildId, "Busy working", null);

    const mention1 = {
      author_id: "user_a",
      author_tag: "Alice",
      channel_id: "chan_1",
      content: "Hey did you see this?",
      message_url: "https://discord.com/channels/1/1/1",
      timestamp: 1000,
    };

    const mention2 = {
      author_id: "user_b",
      author_tag: "Bob",
      channel_id: "chan_2",
      content: "Check this out too",
      message_url: "https://discord.com/channels/1/2/2",
      timestamp: 1001,
    };

    // Dispatch concurrently
    await Promise.all([
      addAfkMention(userId, guildId, mention1),
      addAfkMention(userId, guildId, mention2),
    ]);

    const status = await getAfkStatus(userId, guildId);
    const mentions = typeof status.mentions === "string" ? JSON.parse(status.mentions) : status.mentions;

    expect(mentions.length).toBe(2);
    const authors = mentions.map((m) => m.author_id);
    expect(authors).toContain("user_a");
    expect(authors).toContain("user_b");
  });

  it("should remove AFK status and purge cache cleanly", async () => {
    await setAfkStatus(userId, guildId, "Quick break", null);
    expect(isUserAfkQuick(userId, guildId)).toBe(true);

    const deleted = await removeAfkStatus(userId, guildId);
    expect(deleted).toBe(true);

    expect(isUserAfkQuick(userId, guildId)).toBe(false);
    const status = await getAfkStatus(userId, guildId);
    expect(status).toBeNull();
  });
});

describe("AFK Handler Concurrency, Rate Limits, and Nickname Logic", () => {
  const guildId = "guild_handler_1";
  const authorId = "author_handler_1";
  const mentionedId = "mentioned_handler_1";

  beforeEach(async () => {
    clearAfkCache();
    clearAfkHandlerState();
    await removeAfkStatus(authorId, guildId).catch(() => {});
    await removeAfkStatus(mentionedId, guildId).catch(() => {});
  });

  it("should respect the 5-second grace period right after going AFK", async () => {
    // Set AFK timestamp to right now
    await setAfkStatus(authorId, guildId, "Dinner", null);

    let replyCalled = false;
    const message = {
      guild: { id: guildId, name: "Test Server" },
      author: { id: authorId, bot: false, username: "Chef" },
      member: {
        nickname: "[AFK] Chef",
        displayName: "[AFK] Chef",
        roles: { highest: { position: 1 } },
        setNickname: vi.fn(),
      },
      mentions: { users: new Map() },
      reply: vi.fn(async () => { replyCalled = true; }),
    };

    // User speaks immediately within 5 seconds
    await handleAfk(message);

    // Should NOT have cleared AFK due to grace period
    expect(replyCalled).toBe(false);
    expect(isUserAfkQuick(authorId, guildId)).toBe(true);
  });

  it("should restore nickname to null if user originally had no nickname", async () => {
    // Set AFK 10 seconds ago with original_nickname = null
    const record = await setAfkStatus(authorId, guildId, "Gone", null);
    record.since = Math.floor(Date.now() / 1000) - 10;
    await record.save();

    let restoredNick = "UNSET";
    let replyEmbed = null;

    const message = {
      guild: {
        id: guildId,
        name: "Test Server",
        ownerId: "some_other_owner",
        members: {
          me: {
            permissions: { has: (perm) => perm === "ManageNicknames" },
            roles: { highest: { position: 10 } },
          },
        },
      },
      author: { id: authorId, bot: false, username: "NoNickUser" },
      member: {
        nickname: "[AFK] NoNickUser",
        displayName: "[AFK] NoNickUser",
        roles: { highest: { position: 2 } },
        setNickname: vi.fn(async (n) => { restoredNick = n; }),
      },
      mentions: { users: new Map() },
      reply: vi.fn(async (p) => {
        replyEmbed = p.embeds?.[0];
        return { delete: vi.fn() };
      }),
    };

    await handleAfk(message);

    // Nickname should be reset to null (Discord's API for clearing custom nickname)
    expect(message.member.setNickname).toHaveBeenCalled();
    expect(restoredNick).toBeNull();
    expect(replyEmbed).toBeDefined();
    expect(replyEmbed.data.title).toContain("is no longer AFK");
  });

  it("should prevent duplicate welcome replies on rapid burst messages", async () => {
    const record = await setAfkStatus(authorId, guildId, "Coffee", "NickA");
    record.since = Math.floor(Date.now() / 1000) - 20;
    await record.save();

    let replyCount = 0;
    const createMsg = () => ({
      guild: { id: guildId, name: "Test Server", ownerId: "owner" },
      author: { id: authorId, bot: false, username: "NickA" },
      member: {
        nickname: "[AFK] NickA",
        displayName: "[AFK] NickA",
        roles: { highest: { position: 1 } },
        setNickname: vi.fn(),
      },
      mentions: { users: new Map() },
      reply: vi.fn(async () => {
        replyCount++;
        return { delete: vi.fn() };
      }),
    });

    // Fire 3 messages simultaneously
    await Promise.all([
      handleAfk(createMsg()),
      handleAfk(createMsg()),
      handleAfk(createMsg()),
    ]);

    // Only one welcome reply should have been sent
    expect(replyCount).toBe(1);
  });

  it("should rate limit DMs to AFK mentioned users to prevent 429 floods", async () => {
    // Set target user AFK
    const record = await setAfkStatus(mentionedId, guildId, "Gaming", null);
    record.since = Math.floor(Date.now() / 1000) - 60;
    await record.save();

    let dmCount = 0;
    const targetUser = {
      id: mentionedId,
      bot: false,
      username: "Gamer",
      send: vi.fn(async () => { dmCount++; }),
    };

    const makeMentionMsg = (chanId) => ({
      guild: { id: guildId, name: "Test Server" },
      author: { id: "pinger_1", bot: false, username: "Pinger" },
      channel: { id: chanId, name: "general" },
      content: `<@${mentionedId}> hey check this out!`,
      url: "https://discord.com/channels/1/1/1",
      mentions: {
        users: new Map([[mentionedId, targetUser]]),
      },
      reply: vi.fn(async () => ({ delete: vi.fn() })),
    });

    // Message 1 mentions target in channel 1
    await handleAfk(makeMentionMsg("chan_1"));

    // Message 2 mentions target in channel 2 immediately
    await handleAfk(makeMentionMsg("chan_2"));

    // Give background async tasks time to complete
    await new Promise((r) => setTimeout(r, 10));

    // Target should only receive 1 DM due to 60s DM cooldown
    expect(dmCount).toBe(1);
  });
});

describe("AFK Command Guards and Options Parsing", () => {
  it("should reject execution outside guilds", async () => {
    let replyPayload = null;
    const ctx = {
      guild: null,
      reply: vi.fn(async (p) => { replyPayload = p; }),
    };

    await afkCommand.execute(ctx);
    expect(replyPayload).toBeDefined();
    expect(replyPayload.ephemeral).toBe(true);
    expect(replyPayload.content).toContain("server");
  });

  it("should sanitize reason and strip existing [AFK] prefix from nickname", async () => {
    let newNick = null;
    let savedStatus = null;

    const ctx = {
      guild: {
        id: "guild_cmd_1",
        ownerId: "owner_id",
        members: {
          me: {
            permissions: { has: (p) => p === "ManageNicknames" },
            roles: { highest: { position: 10 } },
          },
        },
      },
      user: {
        id: "user_cmd_1",
        username: "Bob",
        displayAvatarURL: () => "https://avatar.url",
      },
      member: {
        displayName: "[AFK] [AFK] Bob",
        nickname: "[AFK] [AFK] Bob",
        permissions: { has: () => false },
        roles: { highest: { position: 1 } },
        setNickname: vi.fn(async (n) => { newNick = n; }),
      },
      options: {
        reason: "Studying for `math` exam\nwith friends",
      },
      reply: vi.fn(async () => {}),
    };

    await afkCommand.execute(ctx);

    // It should strip the existing [AFK] tags and produce clean single [AFK] Bob
    expect(newNick).toBe("[AFK] Bob");
    expect(ctx.reply).toHaveBeenCalled();

    const status = await getAfkStatus("user_cmd_1", "guild_cmd_1");
    expect(status.afk_reason).not.toContain("\n");
    expect(status.afk_reason).not.toContain("`");
  });
});
