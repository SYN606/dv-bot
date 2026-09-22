import { describe, expect, it, beforeAll } from "bun:test";
import { initDb } from "../src/db/index.js";
import { AutoResponder } from "../src/db/models/index.js";
import {
  upsertAutoresponder,
  updateAutoresponder,
  setResponderReactions,
  deleteAutoresponder,
  invalidateAutoresponderCache,
} from "../src/db/helpers/autoresponder.js";
import {
  handleAutoresponder,
  formatAutoresponderText,
  responderCooldowns,
} from "../src/handlers/autoresponderHandler.js";

describe("Autoresponder Engine & Execution Tests", () => {
  const guildId = "771122";
  let ruleIdExact;
  let ruleIdRegex;
  let ruleIdReactionOnly;
  let ruleIdCooldown;

  beforeAll(async () => {
    await initDb();
    await AutoResponder.destroy({ where: { guild_id: guildId } });
    invalidateAutoresponderCache(guildId);
    responderCooldowns.clear();

    // 1. Exact match rule with template variables
    const r1 = await upsertAutoresponder(guildId, {
      trigger_phrase: "hello bot",
      match_type: "exact",
      reply_content: "Hello {user}! Welcome to {server}.",
      enabled: true,
      ignore_bots: true,
    });
    ruleIdExact = r1.responder_id;
    await setResponderReactions(ruleIdExact, ["👋"]);

    // 2. Regex rule with embed
    const r2 = await upsertAutoresponder(guildId, {
      trigger_phrase: "^ping (\\w+)$",
      match_type: "regex",
      reply_content: "Pong {username} in {channel}!",
      is_embed: true,
      embed_title: "Ping Response",
      enabled: true,
    });
    ruleIdRegex = r2.responder_id;

    // 3. Reaction-only rule
    const r3 = await upsertAutoresponder(guildId, {
      trigger_phrase: "awesome",
      match_type: "contains",
      reply_content: null,
      enabled: true,
    });
    ruleIdReactionOnly = r3.responder_id;
    await setResponderReactions(ruleIdReactionOnly, ["🔥", "⭐"]);

    // 4. Cooldown rule (10 seconds)
    const r4 = await upsertAutoresponder(guildId, {
      trigger_phrase: "spammy",
      match_type: "contains",
      reply_content: "Slow down!",
      cooldown: 10,
      enabled: true,
    });
    ruleIdCooldown = r4.responder_id;
  });

  it("formatAutoresponderText should resolve rich template variables", () => {
    const mockMsg = {
      guild: {
        id: "771122",
        name: "Test Guild",
        memberCount: 42,
        ownerId: "999",
      },
      author: {
        id: "123",
        username: "testuser",
        tag: "testuser#0001",
        toString: () => "<@123>",
      },
      channel: {
        id: "456",
        name: "general",
        toString: () => "<#456>",
      },
    };

    const template = "Hi {user}! You are {username} (ID: {user.id}) in {server} (Members: {memberCount}) at {channel}.";
    const formatted = formatAutoresponderText(template, mockMsg);

    expect(formatted).toContain("<@123>");
    expect(formatted).toContain("testuser");
    expect(formatted).toContain("ID: 123");
    expect(formatted).toContain("Test Guild");
    expect(formatted).toContain("Members: 42");
    expect(formatted).toContain("<#456>");
  });

  it("should trigger exact match with reply and emoji reactions", async () => {
    let replyContent = "";
    const reactionsAdded = [];

    const mockMsg = {
      guild: { id: guildId, name: "Alpha Server" },
      author: { id: "user_01", username: "Alex", bot: false },
      channel: {
        id: "ch_01",
        name: "lounge",
        send: async () => {},
      },
      content: "hello bot",
      reply: async ({ content }) => {
        replyContent = content;
      },
      react: async (emoji) => {
        reactionsAdded.push(emoji);
      },
    };

    const handled = await handleAutoresponder(mockMsg);
    expect(handled).toBe(true);
    expect(replyContent).toContain("Hello <@user_01>! Welcome to Alpha Server.");
    expect(reactionsAdded).toContain("👋");
  });

  it("should trigger regex rule with embed dispatching", async () => {
    let sentEmbed = null;

    const mockMsg = {
      guild: { id: guildId, name: "Alpha Server" },
      author: { id: "user_02", username: "Bob", bot: false },
      channel: { id: "ch_02", name: "bot-chat", send: async () => {} },
      content: "ping test",
      reply: async ({ embeds }) => {
        sentEmbed = embeds?.[0];
      },
      react: async () => {},
    };

    const handled = await handleAutoresponder(mockMsg);
    expect(handled).toBe(true);
    expect(sentEmbed).toBeDefined();
    expect(sentEmbed.data.title).toContain("Ping Response");
    expect(sentEmbed.data.description).toContain("Pong Bob in <#ch_02>!");
  });

  it("should handle reaction-only autoresponders without sending text", async () => {
    let textSent = false;
    const reactions = [];

    const mockMsg = {
      guild: { id: guildId, name: "Alpha Server" },
      author: { id: "user_03", username: "Charlie", bot: false },
      channel: {
        id: "ch_03",
        send: async () => { textSent = true; },
      },
      content: "This project is awesome!",
      reply: async () => { textSent = true; },
      react: async (emoji) => { reactions.push(emoji); },
    };

    const handled = await handleAutoresponder(mockMsg);
    expect(handled).toBe(true);
    expect(textSent).toBe(false);
    expect(reactions).toEqual(["🔥", "⭐"]);
  });

  it("should enforce cooldown on repeat triggers by the same user", async () => {
    let replyCount = 0;

    const createMsg = () => ({
      guild: { id: guildId, name: "Alpha Server" },
      author: { id: "user_spammer", username: "Dave", bot: false },
      channel: { id: "ch_04", send: async () => {} },
      content: "don't be spammy",
      reply: async () => { replyCount++; },
      react: async () => {},
    });

    // 1st time: matches and triggers
    const res1 = await handleAutoresponder(createMsg());
    expect(res1).toBe(true);
    expect(replyCount).toBe(1);

    // 2nd time immediately: blocked by cooldown
    const res2 = await handleAutoresponder(createMsg());
    expect(res2).toBe(false);
    expect(replyCount).toBe(1);
  });

  it("should ignore bot messages and prevent bot self-trigger loops", async () => {
    let triggered = false;

    // A. External bot message when ignore_bots is true
    const botMsg = {
      guild: { id: guildId, name: "Alpha Server" },
      author: { id: "other_bot", bot: true },
      channel: { id: "ch_01" },
      content: "hello bot",
      reply: async () => { triggered = true; },
      react: async () => {},
    };
    const resBot = await handleAutoresponder(botMsg);
    expect(resBot).toBe(false);
    expect(triggered).toBe(false);

    // B. DV-BOT itself (prevent loops)
    const selfMsg = {
      guild: { id: guildId, name: "Alpha Server" },
      client: { user: { id: "dv_bot_id" } },
      author: { id: "dv_bot_id", bot: true },
      channel: { id: "ch_01" },
      content: "hello bot",
      reply: async () => { triggered = true; },
      react: async () => {},
    };
    const resSelf = await handleAutoresponder(selfMsg);
    expect(resSelf).toBe(false);
    expect(triggered).toBe(false);
  });

  it("should support updating and editing autoresponders", async () => {
    // Update ruleIdExact to match 'greetings bot' instead of 'hello bot'
    const updated = await updateAutoresponder(guildId, ruleIdExact, {
      trigger_phrase: "greetings bot",
      reply_content: "Greetings {user}!",
    });
    expect(updated).toBe(true);

    let reply = "";
    const msg = {
      guild: { id: guildId, name: "Alpha Server" },
      author: { id: "user_edit", username: "Eve", bot: false },
      channel: { id: "ch_01", send: async () => {} },
      content: "greetings bot",
      reply: async ({ content }) => { reply = content; },
      react: async () => {},
    };

    const handled = await handleAutoresponder(msg);
    expect(handled).toBe(true);
    expect(reply).toBe("Greetings <@user_edit>!");

    // Old trigger no longer fires
    const oldMsg = {
      guild: { id: guildId, name: "Alpha Server" },
      author: { id: "user_edit", username: "Eve", bot: false },
      channel: { id: "ch_01", send: async () => {} },
      content: "hello bot",
      reply: async () => {},
      react: async () => {},
    };
    const handledOld = await handleAutoresponder(oldMsg);
    expect(handledOld).toBe(false);
  });
});
