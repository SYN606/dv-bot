import { describe, it, expect, beforeEach } from "bun:test";
import { formatAutoresponderText } from "../src/handlers/autoresponderHandler.js";
import { validateAutoresponder } from "../src/web/frontend/src/utils/autoresponder/autoresponderValidation.js";

describe("Autoresponder - Format & Variable Replacements", () => {
  const mockMessage = {
    guild: {
      id: "1033451129364811929",
      name: "Digital Vigital Community",
      memberCount: 14250,
      ownerId: "933850807441428490",
      premiumSubscriptionCount: 14,
    },
    author: {
      id: "933850807441428490",
      username: "syn_dev",
      tag: "syn_dev#0001",
      displayAvatarURL: () => "https://cdn.discordapp.com/avatars/933850807441428490/avatar.png",
    },
    channel: {
      id: "1033451129847156747",
      name: "general-chat",
    },
  };

  it("should replace user and mention variables correctly", () => {
    const raw = "Hello {user}! Welcome {username} ({user.id}) to {server}!";
    const formatted = formatAutoresponderText(raw, mockMessage);
    expect(formatted).toContain("<@933850807441428490>");
    expect(formatted).toContain("syn_dev");
    expect(formatted).toContain("933850807441428490");
    expect(formatted).toContain("Digital Vigital Community");
  });

  it("should replace server, channel, and member variables", () => {
    const raw = "Server has {memberCount} members. Chat in {channel} and owner is {owner.mention}. Boosts: {boosts}";
    const formatted = formatAutoresponderText(raw, mockMessage);
    expect(formatted).toContain("14,250");
    expect(formatted).toContain("<#1033451129847156747>");
    expect(formatted).toContain("<@933850807441428490>");
    expect(formatted).toContain("14");
  });

  it("should handle empty or null text safely", () => {
    expect(formatAutoresponderText("", mockMessage)).toBe("");
    expect(formatAutoresponderText(null, mockMessage)).toBe("");
  });
});

describe("Autoresponder - Frontend Validation", () => {
  it("should require a trigger phrase", () => {
    const res = validateAutoresponder({ trigger: "", reply: "test" });
    expect(res.isValid).toBe(false);
    expect(res.errors.trigger).toBeDefined();
  });

  it("should require a reply, embed, or reaction", () => {
    const res = validateAutoresponder({ trigger: "hello", reply: "", isEmbed: false, reactions: [] });
    expect(res.isValid).toBe(false);
    expect(res.errors.reply).toBeDefined();
  });

  it("should pass when only reactions are provided", () => {
    const res = validateAutoresponder({ trigger: "hello", reply: "", reactions: ["👋"] });
    expect(res.isValid).toBe(true);
    expect(Object.keys(res.errors).length).toBe(0);
  });

  it("should pass when only embed title is provided", () => {
    const res = validateAutoresponder({ trigger: "hello", reply: "", isEmbed: true, embedTitle: "Important Announcement" });
    expect(res.isValid).toBe(true);
    expect(Object.keys(res.errors).length).toBe(0);
  });

  it("should validate regular expression triggers", () => {
    const invalidRegex = validateAutoresponder({ trigger: "[a-z", matchMode: "regex", reply: "hi" });
    expect(invalidRegex.isValid).toBe(false);
    expect(invalidRegex.errors.trigger).toContain("Invalid Regular Expression");

    const validRegex = validateAutoresponder({ trigger: "^ping.*$", matchMode: "regex", reply: "pong" });
    expect(validRegex.isValid).toBe(true);
  });
});
