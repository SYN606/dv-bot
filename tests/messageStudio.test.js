/**
 * Tests for Message Studio (Validation, Serialization, URL Parsing, and DB Operations)
 * Uses bun:test
 * Run: bun test tests/messageStudio.test.js
 */
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { getDb, getRawSqlite } from "../src/db/index.js";

import {
  parseReplyUrl,
  verifyAndFetchReply,
  transformMentionPlaceholders,
  validateMessage,
  serializeToDiscordPayload,
  LIMITS,
} from "../src/services/messageStudioService.js";

import {
  saveDraft,
  listDrafts,
  getDraft,
  deleteDraft,
  createTemplate,
  listTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  recordHistory,
  listHistory,
  updateHistoryStatus,
  deleteHistoryEntry,
  clearHistory,
} from "../src/db/helpers/messageStudio.js";

beforeAll(() => {
  // Ensure DB schema is loaded
  getDb();
});

describe("Message Studio - Discord Message Link Parsing", () => {
  it("should parse standard discord.com message link", () => {
    const url = "https://discord.com/channels/123456789012345678/234567890123456789/345678901234567890";
    const result = parseReplyUrl(url);
    expect(result).not.toBeNull();
    expect(result.guildId).toBe("123456789012345678");
    expect(result.channelId).toBe("234567890123456789");
    expect(result.messageId).toBe("345678901234567890");
  });

  it("should parse ptb and canary discord links", () => {
    const canaryUrl = "https://canary.discord.com/channels/111/222/333";
    const ptbUrl = "https://ptb.discord.com/channels/444/555/666";

    const canary = parseReplyUrl(canaryUrl);
    expect(canary).toEqual({ guildId: "111", channelId: "222", messageId: "333" });

    const ptb = parseReplyUrl(ptbUrl);
    expect(ptb).toEqual({ guildId: "444", channelId: "555", messageId: "666" });
  });

  it("should parse message links with query parameters, hashes, and brackets", () => {
    const withQuery = "https://discord.com/channels/1033451129364811929/1033451129364811932/123456789012345678?feature=copy";
    const parsedQuery = parseReplyUrl(withQuery);
    expect(parsedQuery).toEqual({
      guildId: "1033451129364811929",
      channelId: "1033451129364811932",
      messageId: "123456789012345678",
    });

    const withBrackets = "<https://discord.com/channels/1033451129364811929/1033451129364811932/123456789012345678>";
    const parsedBrackets = parseReplyUrl(withBrackets);
    expect(parsedBrackets).toEqual({
      guildId: "1033451129364811929",
      channelId: "1033451129364811932",
      messageId: "123456789012345678",
    });
  });

  it("should return null for invalid discord links", () => {
    expect(parseReplyUrl("https://example.com/channels/1/2/3")).toBeNull();
    expect(parseReplyUrl("not-a-url")).toBeNull();
    expect(parseReplyUrl("https://discord.com/channels/123/456")).toBeNull();
    expect(parseReplyUrl("")).toBeNull();
  });
});

describe("Message Studio - Mention Placeholders Transformation", () => {
  it("should transform {USER_ID} into raw Discord user mention <@USER_ID>", () => {
    const text = "Welcome {1033451129364811929} to our server!";
    expect(transformMentionPlaceholders(text)).toBe("Welcome <@1033451129364811929> to our server!");
  });

  it("should transform {user:ID} and {@ID} into raw Discord user mention <@ID>", () => {
    expect(transformMentionPlaceholders("{user:1033451129364811929}")).toBe("<@1033451129364811929>");
    expect(transformMentionPlaceholders("{@1033451129364811929}")).toBe("<@1033451129364811929>");
  });

  it("should transform {#CHANNEL_ID} and {channel:CHANNEL_ID} into raw Discord channel mention <#CHANNEL_ID>", () => {
    expect(transformMentionPlaceholders("Check {#1033451129364811932}")).toBe("Check <#1033451129364811932>");
    expect(transformMentionPlaceholders("Visit {channel:1033451129364811932}")).toBe("Visit <#1033451129364811932>");
  });

  it("should transform {@&ROLE_ID} and {role:ROLE_ID} into raw Discord role mention <@&ROLE_ID>", () => {
    expect(transformMentionPlaceholders("Announcing to {@&1033451129364811930}")).toBe("Announcing to <@&1033451129364811930>");
    expect(transformMentionPlaceholders("{role:1033451129364811930}")).toBe("<@&1033451129364811930>");
  });

  it("should leave non-snowflake braces intact", () => {
    expect(transformMentionPlaceholders("Hello {name}, your score is {100}")).toBe("Hello {name}, your score is {100}");
  });
});

describe("Message Studio - Payload Validation", () => {
  it("should reject an empty message without content, embeds, or attachments", () => {
    const result = validateMessage({
      mode: "normal",
      content: "",
      embeds: [],
      attachments: [],
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("requires message content or an attachment");
  });

  it("should accept valid normal text message", () => {
    const result = validateMessage({
      mode: "normal",
      content: "Hello Discord!",
      embeds: [],
      attachments: [],
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should reject message content over 2000 characters", () => {
    const longContent = "A".repeat(2001);
    const result = validateMessage({
      mode: "normal",
      content: longContent,
      embeds: [],
      attachments: [],
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("2000 characters"))).toBe(true);
  });

  it("should reject more than 10 embeds", () => {
    const embeds = Array.from({ length: 11 }, (_, i) => ({
      title: `Embed ${i}`,
      description: "Test description",
    }));
    const result = validateMessage({
      mode: "embed",
      content: "",
      embeds,
      attachments: [],
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("maximum of 10"))).toBe(true);
  });

  it("should reject an embed with title over 256 characters", () => {
    const result = validateMessage({
      mode: "embed",
      content: "",
      embeds: [
        {
          title: "x".repeat(257),
          description: "Normal description",
        },
      ],
      attachments: [],
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("title exceeds 256 characters"))).toBe(true);
  });

  it("should reject an embed with more than 25 fields", () => {
    const fields = Array.from({ length: 26 }, (_, i) => ({
      name: `Field ${i}`,
      value: `Value ${i}`,
    }));
    const result = validateMessage({
      mode: "embed",
      content: "",
      embeds: [{ title: "Test", fields }],
      attachments: [],
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("max allowed is 25"))).toBe(true);
  });

  it("should reject total combined embed characters exceeding 6000", () => {
    const result = validateMessage({
      mode: "embed",
      content: "",
      embeds: [
        { description: "a".repeat(3500) },
        { description: "b".repeat(3000) },
      ],
      attachments: [],
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("exceeding Discord's 6,000 character limit"))).toBe(true);
  });

  it("should reject invalid attachment or media URLs", () => {
    const result = validateMessage({
      mode: "embed",
      content: "",
      embeds: [
        {
          title: "Embed with bad image",
          image: { url: "ftp://invalid-url.com/img.png" },
        },
      ],
      attachments: ["not-a-valid-http-url"],
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("must be a valid HTTP/HTTPS"))).toBe(true);
  });
});

describe("Message Studio - Payload Builder Serialization", () => {
  it("should build safe normal message with restricted mentions by default", () => {
    const payload = serializeToDiscordPayload({
      mode: "normal",
      content: "Hello @everyone and @here!",
      embeds: [],
      attachments: [],
      mention_config: {
        parseUsers: true,
        parseRoles: false,
        parseEveryone: false,
      },
    });

    expect(payload.content).toBe("Hello @everyone and @here!");
    expect(payload.allowedMentions).toBeDefined();
    expect(payload.allowedMentions.parse).toEqual(["users"]);
  });

  it("should build embed structure with parsed hex color", () => {
    const payload = serializeToDiscordPayload({
      mode: "embed",
      content: "",
      embeds: [
        {
          title: "Announcement",
          description: "Big news!",
          color: "#5865f2",
          author: { name: "Bot Admin", icon_url: "https://example.com/icon.png" },
          fields: [{ name: "Release Date", value: "Today", inline: true }],
          footer: { text: "DV-BOT Studio" },
          timestamp: true,
        },
      ],
      attachments: [],
      mention_config: {},
    });

    expect(payload.embeds).toHaveLength(1);
    const serialized = payload.embeds[0].toJSON();
    expect(serialized.title).toBe("Announcement");
    expect(serialized.description).toBe("Big news!");
    expect(serialized.color).toBe(0x5865f2);
    expect(serialized.author.name).toBe("Bot Admin");
    expect(serialized.fields[0].name).toBe("Release Date");
    expect(serialized.footer.text).toBe("DV-BOT Studio");
    expect(serialized.timestamp).toBeDefined();
  });

  it("should transform mention placeholders in content and embed fields during serialization", () => {
    const payload = serializeToDiscordPayload({
      mode: "hybrid",
      content: "Hello {1033451129364811929}, check {#1033451129364811932}!",
      embeds: [
        {
          title: "Notice for {1033451129364811929}",
          description: "See {channel:1033451129364811932} and {role:1033451129364811930}",
          fields: [
            { name: "User", value: "{1033451129364811929}", inline: true },
            { name: "Channel", value: "{#1033451129364811932}", inline: true },
          ],
        },
      ],
      attachments: [],
      mention_config: {},
    });

    expect(payload.content).toBe("Hello <@1033451129364811929>, check <#1033451129364811932>!");
    expect(payload.allowedMentions.parse).toContain("users");

    const embed = payload.embeds[0].toJSON();
    expect(embed.title).toBe("Notice for <@1033451129364811929>");
    expect(embed.description).toBe("See <#1033451129364811932> and <@&1033451129364811930>");
    expect(embed.fields[0].value).toBe("<@1033451129364811929>");
    expect(embed.fields[1].value).toBe("<#1033451129364811932>");
  });

  it("should attach reply message reference when reply_config is active", () => {
    const payload = serializeToDiscordPayload({
      mode: "normal",
      content: "Replying to your query",
      embeds: [],
      attachments: [],
      reply_config: {
        enabled: true,
        messageId: "987654321098765432",
        channelId: "123456789012345678",
        mentionUser: false,
      },
      mention_config: {},
    });

    expect(payload.reply).toBeDefined();
    expect(payload.reply.messageReference).toBe("987654321098765432");
    expect(payload.allowedMentions.repliedUser).toBe(false);
  });

  it("should parse snake_case reply_config and fetch message cleanly in verifyAndFetchReply", async () => {
    const mockChannel = {
      id: "234567890123456789",
      name: "general",
      isTextBased: () => true,
      permissionsFor: () => ({ has: () => true }),
      messages: {
        fetch: async (id) => ({
          id,
          content: "Original discord message",
          author: { id: "user_123", username: "Tester", displayAvatarURL: () => "https://example.com/avatar.png" },
          createdAt: new Date(),
          url: `https://discord.com/channels/123456789012345678/234567890123456789/${id}`,
        }),
      },
    };

    const mockGuild = {
      id: "123456789012345678",
      members: { me: {} },
      channels: {
        cache: new Map([[mockChannel.id, mockChannel]]),
        fetch: async () => mockChannel,
      },
    };

    const mockClient = {
      guilds: {
        cache: new Map([[mockGuild.id, mockGuild]]),
        fetch: async () => mockGuild,
      },
    };

    const snakeCaseReply = {
      enabled: true,
      guild_id: "123456789012345678",
      channel_id: "234567890123456789",
      message_id: "345678901234567890",
      mention_user: false,
    };

    const result = await verifyAndFetchReply(mockClient, "123456789012345678", snakeCaseReply);
    expect(result.valid).toBe(true);
    expect(result.messageId).toBe("345678901234567890");
    expect(result.channelId).toBe("234567890123456789");
    expect(result.contentSnippet).toBe("Original discord message");
  });
});

describe("Message Studio - Database Helpers (Drafts)", () => {
  const guildId = "test_guild_ms_101";

  it("should save and retrieve a new draft", async () => {
    const result = await saveDraft(
      guildId,
      {
        name: "Welcome Announcement",
        mode: "embed",
        content: "Hey there!",
        embeds: [{ title: "Welcome" }],
        attachments: [],
        channel_id: "channel_101",
        reply_config: {},
        mention_config: {},
      },
      "user_admin"
    );

    expect(result.draft).toBeDefined();
    expect(result.draft.id).toBeDefined();
    expect(result.draft.name).toBe("Welcome Announcement");
    expect(result.draft.revision).toBe(1);

    const retrieved = await getDraft(guildId, result.draft.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved.id).toBe(result.draft.id);
    expect(retrieved.embeds).toEqual([{ title: "Welcome" }]);
  });

  it("should update draft and increment revision with optimistic concurrency", async () => {
    const initial = await saveDraft(guildId, {
      name: "Editable Draft",
      content: "Original Content",
    });
    const draft = initial.draft;

    // Update with correct expected revision
    const updateResult = await saveDraft(guildId, {
      id: draft.id,
      name: "Edited Draft",
      content: "Updated Content",
      expectedRevision: draft.revision,
    });

    expect(updateResult.draft.name).toBe("Edited Draft");
    expect(updateResult.draft.revision).toBe(draft.revision + 1);

    // Mismatched expected revision should report conflict
    const conflictResult = await saveDraft(guildId, {
      id: draft.id,
      name: "Conflicted Save",
      expectedRevision: 999, // wrong revision
    });

    expect(conflictResult.conflict).toBe(true);
    expect(conflictResult.currentDraft).toBeDefined();
  });

  it("should list drafts for a guild and delete a draft", async () => {
    const initial = await saveDraft(guildId, {
      name: "Draft to Delete",
    });
    const draft = initial.draft;

    const drafts = await listDrafts(guildId);
    expect(drafts.some((d) => d.id === draft.id)).toBe(true);

    const deleted = await deleteDraft(guildId, draft.id);
    expect(deleted).toBe(true);

    const postDelete = await getDraft(guildId, draft.id);
    expect(postDelete).toBeNull();
  });
});

describe("Message Studio - Database Helpers (Templates)", () => {
  const guildId = "test_guild_ms_templates";

  it("should create, list, and duplicate templates", async () => {
    const tpl = await createTemplate(
      guildId,
      {
        name: "Rules Notice",
        description: "Standard rules format",
        category: "Moderation",
        mode: "embed",
        embeds: [{ title: "Rule 1", description: "Be respectful." }],
      },
      "admin_1"
    );

    expect(tpl.id).toBeDefined();
    expect(tpl.name).toBe("Rules Notice");

    // Search / filter templates
    const list = await listTemplates(guildId, { category: "Moderation" });
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].category).toBe("Moderation");

    // Duplicate template
    const cloned = await duplicateTemplate(guildId, tpl.id, "admin_2");
    expect(cloned).not.toBeNull();
    expect(cloned.name).toBe("Copy of Rules Notice");
    expect(cloned.embeds).toEqual(tpl.embeds);

    // Update template
    const updated = await updateTemplate(guildId, tpl.id, {
      name: "Updated Rules Notice",
    });
    expect(updated.name).toBe("Updated Rules Notice");

    // Delete template
    const delResult = await deleteTemplate(guildId, tpl.id);
    expect(delResult).toBe(true);
    const fetchDeleted = await getTemplate(guildId, tpl.id);
    expect(fetchDeleted).toBeNull();
  });
});

describe("Message Studio - Database Helpers (History)", () => {
  const guildId = "test_guild_ms_history";

  it("should record message delivery history and track deletion status", async () => {
    const historyItem = await recordHistory(guildId, {
      message_id: "discord_msg_123456",
      channel_id: "discord_chn_789012",
      user_id: "admin_user_456",
      source_type: "studio_composer",
      payload: { content: "Published message content" },
      status: "delivered",
    });

    expect(historyItem.id).toBeDefined();
    expect(historyItem.message_id).toBe("discord_msg_123456");
    expect(historyItem.status).toBe("delivered");

    // Query history
    const historyList = await listHistory(guildId);
    expect(historyList.length).toBeGreaterThan(0);
    expect(historyList[0].message_id).toBe("discord_msg_123456");

    // Mark as deleted
    const updated = await updateHistoryStatus(guildId, "discord_msg_123456", "deleted");
    expect(updated).not.toBeNull();
    expect(updated.status).toBe("deleted");

    // Delete single history entry by id
    const deleteRes = await deleteHistoryEntry(guildId, historyItem.id);
    expect(deleteRes).toBe(true);

    const historyAfterDelete = await listHistory(guildId);
    expect(historyAfterDelete.some((h) => h.id === historyItem.id)).toBe(false);

    // Record another history item and clear history
    await recordHistory(guildId, {
      message_id: "discord_msg_789",
      channel_id: "discord_chn_789",
      user_id: "admin_user_456",
      source_type: "studio_composer",
      payload: { content: "To be cleared" },
      status: "delivered",
    });

    const cleared = await clearHistory(guildId);
    expect(cleared).toBe(true);

    const emptyHistory = await listHistory(guildId);
    expect(emptyHistory.length).toBe(0);
  });
});
