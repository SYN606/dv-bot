import { describe, expect, it, beforeAll } from "bun:test";
import { initDb } from "../src/db/index.js";
import { setMediaOnlyChannel, removeMediaOnlyChannel } from "../src/db/helpers/mediaOnly.js";
import {
  handleMediaOnly,
  isValidMedia,
  mediaViolationCounter,
} from "../src/handlers/mediaOnlyHandler.js";

describe("Media-Only System & 3-Strike Escalation Tests", () => {
  const guildId = "998811";
  const channelId = "998822";
  const nsfwChannelId = "998833";
  const whitelistRoleId = "998844";

  beforeAll(async () => {
    await initDb();
    mediaViolationCounter.clear();

    await setMediaOnlyChannel(guildId, channelId, {
      image_only: false,
      auto_mute: true,
      nsfw_bypass: true,
      whitelist_role_id: whitelistRoleId,
    });

    await setMediaOnlyChannel(guildId, nsfwChannelId, {
      image_only: false,
      auto_mute: false,
      nsfw_bypass: true,
    });
  });

  it("isValidMedia should correctly recognize images, videos, and link providers", () => {
    // 1. Image attachment
    expect(
      isValidMedia({
        attachments: [{ contentType: "image/png", name: "art.png" }],
        content: "",
      }, true)
    ).toBe(true);

    // 2. Video attachment when imageOnly is true should fail
    expect(
      isValidMedia({
        attachments: [{ contentType: "video/mp4", name: "clip.mp4" }],
        content: "",
      }, true)
    ).toBe(false);

    // 3. Video attachment when imageOnly is false should pass
    expect(
      isValidMedia({
        attachments: [{ contentType: "video/mp4", name: "clip.mp4" }],
        content: "",
      }, false)
    ).toBe(true);

    // 4. Tenor / Imgur / Giphy links
    expect(
      isValidMedia({
        attachments: [],
        content: "Check this out https://tenor.com/view/funny-cat-123",
      }, false)
    ).toBe(true);

    expect(
      isValidMedia({
        attachments: [],
        content: "Nice photo https://i.imgur.com/xyz123.jpg and caption",
      }, true)
    ).toBe(true);

    // 5. Plain text should fail
    expect(
      isValidMedia({
        attachments: [],
        content: "Hello everyone, how are you today?",
      }, false)
    ).toBe(false);
  });

  it("should bypass command prefixes (!, ., /, dv )", async () => {
    let deleted = false;
    const msg = {
      guild: { id: guildId },
      channel: { id: channelId, nsfw: false, send: async () => {} },
      author: { id: "user_cmd", bot: false },
      content: "!help",
      deletable: true,
      delete: async () => { deleted = true; },
    };

    const handled = await handleMediaOnly(msg);
    expect(handled).toBe(false);
    expect(deleted).toBe(false);
  });

  it("should bypass NSFW channels if nsfw_bypass is enabled", async () => {
    let deleted = false;
    const msg = {
      guild: { id: guildId },
      channel: { id: nsfwChannelId, nsfw: true, send: async () => {} },
      author: { id: "user_nsfw", bot: false },
      content: "Just plain text chat in NSFW channel",
      deletable: true,
      delete: async () => { deleted = true; },
    };

    const handled = await handleMediaOnly(msg);
    expect(handled).toBe(false);
    expect(deleted).toBe(false);
  });

  it("should bypass users holding whitelist_role_id", async () => {
    let deleted = false;
    const msg = {
      guild: { id: guildId },
      channel: { id: channelId, nsfw: false, send: async () => {} },
      author: { id: "user_vip", bot: false },
      member: {
        roles: {
          cache: new Map([[whitelistRoleId, { id: whitelistRoleId }]]),
        },
      },
      content: "VIP member chat text",
      deletable: true,
      delete: async () => { deleted = true; },
    };

    const handled = await handleMediaOnly(msg);
    expect(handled).toBe(false);
    expect(deleted).toBe(false);
  });

  it("should delete non-media text and escalate to timeout on 3rd violation", async () => {
    const userId = "violator_01";
    let deletedCount = 0;
    let timedOutMs = 0;
    let warningSent = 0;

    const createMsg = () => ({
      guild: { id: guildId },
      channel: {
        id: channelId,
        nsfw: false,
        send: async () => {
          warningSent++;
          return { delete: async () => {} };
        },
      },
      author: { id: userId, bot: false },
      member: {
        roles: { cache: new Map() },
        timeout: async (ms) => {
          timedOutMs = ms;
        },
      },
      content: "Non-media chat message",
      deletable: true,
      delete: async () => {
        deletedCount++;
      },
    });

    // Violation 1
    const res1 = await handleMediaOnly(createMsg());
    expect(res1).toBe(true);
    expect(deletedCount).toBe(1);
    expect(timedOutMs).toBe(0);
    expect(mediaViolationCounter.get(`${guildId}:${userId}`)).toBe(1);

    // Violation 2
    const res2 = await handleMediaOnly(createMsg());
    expect(res2).toBe(true);
    expect(deletedCount).toBe(2);
    expect(timedOutMs).toBe(0);
    expect(mediaViolationCounter.get(`${guildId}:${userId}`)).toBe(2);

    // Violation 3 (3rd strike -> auto-mute timeout triggered!)
    const res3 = await handleMediaOnly(createMsg());
    expect(res3).toBe(true);
    expect(deletedCount).toBe(3);
    expect(timedOutMs).toBe(60000);
    expect(mediaViolationCounter.get(`${guildId}:${userId}`)).toBe(3);
  });

  it("should handle valid media without deleting and refresh sticky message", async () => {
    let deleted = false;
    let stickyDeleted = false;
    let newStickySent = false;

    // Configure sticky notice on channel
    await setMediaOnlyChannel(guildId, channelId, {
      sticky_message_id: "888111222333444555",
    });

    const msg = {
      guild: { id: guildId },
      channel: {
        id: channelId,
        nsfw: false,
        messages: {
          fetch: async (id) => {
            if (id === "888111222333444555") {
              return { delete: async () => { stickyDeleted = true; } };
            }
            return null;
          },
        },
        send: async () => {
          newStickySent = true;
          return { id: "999888777666555444" };
        },
      },
      author: { id: "user_art", bot: false },
      attachments: [{ contentType: "image/png", name: "cool_drawing.png" }],
      content: "Here is my drawing!",
      deletable: true,
      delete: async () => { deleted = true; },
    };

    const handled = await handleMediaOnly(msg);
    expect(handled).toBe(false);
    expect(deleted).toBe(false);
  });
});
