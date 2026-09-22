import { describe, expect, it, beforeAll } from "bun:test";
import { initDb } from "../src/db/index.js";
import { setAfkStatus, getAfkStatus, removeAfkStatus } from "../src/db/helpers/afk.js";
import { handleAfk } from "../src/handlers/afkHandler.js";
import {
  dispatchStickyNotice,
  deletePreviousSticky,
  getOrCreateStickyWebhook,
} from "../src/utils/webhookManager.js";
import { handleMediaOnly, mediaViolationCounter } from "../src/handlers/mediaOnlyHandler.js";
import { setMediaOnlyChannel } from "../src/db/helpers/mediaOnly.js";

describe("AFK System & Webhook Manager 429 Resilience Tests", () => {
  const guildId = "661100";
  const channelId = "661101";

  beforeAll(async () => {
    await initDb();
    mediaViolationCounter.clear();
  });

  // 1. Webhook Manager Tests
  describe("Webhook Manager", () => {
    it("should safely fall back to channel.send and delete previous sticky", async () => {
      let deletedMsgId = null;
      let sentContent = null;

      const mockChannel = {
        id: channelId,
        guild: {
          id: guildId,
          me: { id: "bot_123" },
        },
        permissionsFor: () => ({ has: () => false }), // No webhook permission -> triggers channel fallback
        messages: {
          fetch: async (id) => ({
            id,
            delete: async () => { deletedMsgId = id; },
          }),
        },
        send: async ({ embeds, content }) => {
          sentContent = content || embeds?.[0]?.data?.description;
          return { id: "new_sticky_999" };
        },
      };

      const newId = await dispatchStickyNotice({
        channel: mockChannel,
        content: "Test sticky notice",
        lastMessageId: "old_sticky_111",
        minCooldownMs: 0,
        force: true,
      });

      expect(newId).toBe("new_sticky_999");
      expect(deletedMsgId).toBe("old_sticky_111");
      expect(sentContent).toContain("Test sticky notice");
    });

    it("should avoid resending if channel last message is already the sticky", async () => {
      let sendCalled = false;
      const mockChannel = {
        id: "channel_cached",
        lastMessageId: "existing_sticky_555",
        guild: { id: guildId, me: { id: "bot_123" } },
        permissionsFor: () => ({ has: () => false }),
        send: async () => { sendCalled = true; return { id: "should_not_run" }; },
      };

      const resId = await dispatchStickyNotice({
        channel: mockChannel,
        content: "Notice",
        lastMessageId: "existing_sticky_555",
        minCooldownMs: 0,
      });

      expect(resId).toBe("existing_sticky_555");
      expect(sendCalled).toBe(false);
    });
  });

  // 2. AFK System & Mention Aggregation Tests
  describe("AFK System & 429 Prevention", () => {
    it("should aggregate multiple mentioned AFK users into a single embed reply", async () => {
      // Set two users AFK
      await setAfkStatus("afk_u1", guildId, "Studying math");
      await setAfkStatus("afk_u2", guildId, "Grabbing lunch");

      let replyEmbed = null;
      let replyCount = 0;

      const mentionsMap = new Map();
      mentionsMap.set("afk_u1", { id: "afk_u1", bot: false });
      mentionsMap.set("afk_u2", { id: "afk_u2", bot: false });

      const mockMsg = {
        guild: { id: guildId, ownerId: "owner_99" },
        channel: { id: "ch_general" },
        author: { id: "sender_user", bot: false },
        mentions: { users: mentionsMap },
        reply: async ({ embeds }) => {
          replyCount++;
          replyEmbed = embeds?.[0];
          return { delete: async () => {} };
        },
      };

      await handleAfk(mockMsg);

      // Exactly ONE aggregated reply should be sent
      expect(replyCount).toBe(1);
      expect(replyEmbed).toBeDefined();
      expect(replyEmbed.data.title).toContain("AFK Members Mentioned");
      expect(replyEmbed.data.description).toContain("<@afk_u1>");
      expect(replyEmbed.data.description).toContain("Studying math");
      expect(replyEmbed.data.description).toContain("<@afk_u2>");
      expect(replyEmbed.data.description).toContain("Grabbing lunch");

      // Immediate second mention should be rate-limited by 30s cooldown
      replyCount = 0;
      await handleAfk(mockMsg);
      expect(replyCount).toBe(0);
    });

    it("should welcome back returning AFK user and prevent duplicate welcome spam", async () => {
      await setAfkStatus("returning_u1", guildId, "Away for a bit");

      let welcomeSent = 0;
      const createMsg = () => ({
        guild: {
          id: guildId,
          ownerId: "owner_99",
          me: { permissions: { has: () => false } },
        },
        channel: { id: "ch_general" },
        author: { id: "returning_u1", bot: false },
        member: { roles: { highest: { position: 1 } }, setNickname: async () => {} },
        mentions: { users: new Map() },
        reply: async () => {
          welcomeSent++;
          return { delete: async () => {} };
        },
      });

      // 1st message -> Welcome Back sent
      await handleAfk(createMsg());
      expect(welcomeSent).toBe(1);

      // Status in DB removed
      const checkAfk = await getAfkStatus("returning_u1", guildId);
      expect(checkAfk).toBeNull();

      // 2nd rapid message -> in-flight lock / cleared status prevents duplicate welcome
      await handleAfk(createMsg());
      expect(welcomeSent).toBe(1);
    });

    it("should send DM to AFK user when mentioned and show jump buttons on return", async () => {
      const targetId = "afk_dm_user";
      await setAfkStatus(targetId, guildId, "Working on project");

      let dmPayload = null;
      const mockAfkUser = {
        id: targetId,
        bot: false,
        send: async (payload) => {
          dmPayload = payload;
          return { id: "dm_123" };
        },
      };

      const mentionsMap = new Map();
      mentionsMap.set(targetId, mockAfkUser);

      const msgUrl = `https://discord.com/channels/${guildId}/ch_1/msg_999`;
      const mentionMsg = {
        guild: { id: guildId, name: "Test Server", iconURL: () => "https://example.com/icon.png" },
        channel: { id: "ch_1", name: "general" },
        author: { id: "pinger_1", tag: "Pinger#0001", bot: false, displayAvatarURL: () => "https://example.com/avatar.png" },
        mentions: { users: mentionsMap },
        content: "Hey where is the code?",
        url: msgUrl,
        reply: async () => ({ delete: async () => {} }),
      };

      // 1. Target is mentioned -> receives DM with Jump button
      await handleAfk(mentionMsg);

      expect(dmPayload).not.toBeNull();
      expect(dmPayload.embeds?.[0]?.data?.title).toContain("You were mentioned while AFK!");
      expect(dmPayload.embeds?.[0]?.data?.description).toContain("Hey where is the code?");
      expect(dmPayload.components?.length).toBe(1);
      expect(dmPayload.components[0].components[0].data.url).toBe(msgUrl);

      // 2. Target user returns -> sends message, receives welcome embed with mentions & jump button
      let returnReply = null;
      const returnMsg = {
        guild: {
          id: guildId,
          name: "Test Server",
          ownerId: "owner_99",
          me: { permissions: { has: () => false } },
        },
        channel: { id: "ch_1", name: "general" },
        author: { id: targetId, username: "TargetUser", bot: false, displayAvatarURL: () => "https://example.com/avatar.png" },
        member: { roles: { highest: { position: 1 } }, setNickname: async () => {} },
        mentions: { users: new Map() },
        reply: async (payload) => {
          returnReply = payload;
          return { delete: async () => {} };
        },
      };

      await handleAfk(returnMsg);

      expect(returnReply).not.toBeNull();
      expect(returnReply.embeds?.[0]?.data?.title).toContain("TargetUser is no longer AFK");
      expect(returnReply.embeds?.[0]?.data?.description).toContain("Mentions Received (1)");
      expect(returnReply.embeds?.[0]?.data?.description).toContain("Hey where is the code?");
      expect(returnReply.components?.length).toBe(1);
      expect(returnReply.components[0].components[0].data.url).toBe(msgUrl);

      // Status in DB removed
      const checkStatus = await getAfkStatus(targetId, guildId);
      expect(checkStatus).toBeNull();
    });

    it("should strictly scope AFK to the local guild (not global)", async () => {
      const uId = "local_afk_user";
      const guildA = "guild_A_111";
      const guildB = "guild_B_222";

      await setAfkStatus(uId, guildA, "Only AFK in Guild A");

      // In Guild A, user is AFK
      const afkInA = await getAfkStatus(uId, guildA);
      expect(afkInA).not.toBeNull();
      expect(afkInA.afk_reason).toBe("Only AFK in Guild A");

      // In Guild B, user is NOT AFK
      const afkInB = await getAfkStatus(uId, guildB);
      expect(afkInB).toBeNull();

      // Clear
      await removeAfkStatus(uId, guildA);
      expect(await getAfkStatus(uId, guildA)).toBeNull();
    });
  });

  // 3. Media Warning Throttle Tests
  describe("Media Warning Throttling", () => {
    it("should delete repeated non-media messages but throttle warning embeds to avoid 429", async () => {
      const mediaChId = "media_channel_throttle";
      await setMediaOnlyChannel(guildId, mediaChId, {
        image_only: true,
        auto_mute: false,
      });

      let warningsSent = 0;
      let deletesCount = 0;

      const createMsg = (text) => ({
        guild: { id: guildId },
        channel: {
          id: mediaChId,
          nsfw: false,
          send: async () => {
            warningsSent++;
            return { delete: async () => {} };
          },
        },
        author: { id: "spammer_99", bot: false },
        attachments: [],
        content: text,
        deletable: true,
        delete: async () => { deletesCount++; },
      });

      // Msg 1 -> deleted, warning sent
      await handleMediaOnly(createMsg("bad message 1"));
      expect(deletesCount).toBe(1);
      expect(warningsSent).toBe(1);

      // Msg 2 within 8s -> deleted, but warning is THROTTLED to prevent 429
      await handleMediaOnly(createMsg("bad message 2"));
      expect(deletesCount).toBe(2);
      expect(warningsSent).toBe(1); // Still 1! 429 avoided!
    });
  });
});
