import { describe, expect, it } from "bun:test";
import {
  makeEmbed,
  successEmbed,
  errorEmbed,
  moderationEmbed,
  metricCardEmbed,
  cardEmbed,
  trackEmbed,
  smoothEmbed,
  DIVIDER_LINE,
  COLORS,
  md,
} from "../src/core/embeds.js";

describe("Embed System Tests", () => {
  it("should create smooth clean embeds without divider lines by default", () => {
    const embed = makeEmbed({
      title: "System Alert",
      description: "High CPU detected",
      level: "WARNING",
    });

    const data = embed.toJSON();
    expect(data.description.startsWith(DIVIDER_LINE)).toBe(false);
    expect(data.description).toBe("High CPU detected");
    expect(data.color).toBe(COLORS.WARNING);
  });

  it("should support enabling header divider line when explicitly requested", () => {
    const embed = makeEmbed({
      title: "Divided Embed",
      description: "Text below divider",
      headerDivider: true,
    });

    const data = embed.toJSON();
    expect(data.description.startsWith(DIVIDER_LINE)).toBe(true);
    expect(data.description).toContain("Text below divider");
  });

  it("should safely handle empty description with divider line when requested", () => {
    const embed = makeEmbed({
      title: "Empty Description",
      headerDivider: true,
    });

    const data = embed.toJSON();
    expect(data.description).toBe(DIVIDER_LINE);
  });

  it("should support direct fields array with sanitization", () => {
    const embed = makeEmbed({
      title: "Field Test",
      fields: [
        { name: "Status", value: "Active", inline: true },
        { name: "EmptyVal", value: "", inline: false },
      ],
    });

    const data = embed.toJSON();
    expect(data.fields.length).toBe(2);
    expect(data.fields[0].name).toBe("Status");
    expect(data.fields[0].value).toBe("Active");
    expect(data.fields[0].inline).toBe(true);
    expect(data.fields[1].value).toBe("\u200b"); // Sanitized against Discord API 400
  });

  it("should format blockquote and subtext in description", () => {
    const embed = makeEmbed({
      title: "Blockquote Test",
      description: "Critical action taken",
      quote: true,
      subtext: "Logged to audit trail",
      headerDivider: false,
    });

    const data = embed.toJSON();
    expect(data.description).toContain("> Critical action taken");
    expect(data.description).toContain("-# Logged to audit trail");
  });

  it("should construct high-fidelity moderationEmbed", () => {
    const embed = moderationEmbed({
      action: "BAN",
      targetUser: { id: "12345", username: "spammer", tag: "spammer#0001", displayAvatarURL: () => "https://cdn.discordapp.com/avatars/12345/abc.png" },
      moderator: { id: "99999", username: "admin", tag: "admin#0001" },
      reason: "Repeated discord invite spamming",
      duration: "7 days",
    });

    const data = embed.toJSON();
    expect(data.title).toContain("BAN");
    expect(data.color).toBe(COLORS.MODERATION);
    expect(data.thumbnail.url).toBe("https://cdn.discordapp.com/avatars/12345/abc.png");

    const reasonField = data.fields.find((f) => f.name.includes("Reason"));
    expect(reasonField).toBeDefined();
    expect(reasonField.value).toBe("> Repeated discord invite spamming");

    const durationField = data.fields.find((f) => f.name.includes("Duration"));
    expect(durationField).toBeDefined();
    expect(durationField.value).toBe("`7 days`");
  });

  it("should construct modern metricCardEmbed", () => {
    const embed = metricCardEmbed({
      title: "Server Performance",
      metrics: [
        { label: "Gateway Ping", value: "18ms" },
        { label: "Uptime", value: "99.99%" },
      ],
    });

    const data = embed.toJSON();
    expect(data.color).toBe(COLORS.ANALYTICS);
    expect(data.fields.length).toBe(2);
    expect(data.fields[0].name).toContain("Gateway Ping");
    expect(data.fields[0].value).toBe("`18ms`");
  });

  it("should construct cardEmbed with author badge", () => {
    const embed = cardEmbed({
      title: "Feature Announcement",
      badge: "SECURITY",
      subtitle: "Verification Gateway v2",
      description: "Auto-gating enabled.",
    });

    const data = embed.toJSON();
    expect(data.author.name).toBe("[SECURITY] Verification Gateway v2");
    expect(data.color).toBe(COLORS.PRIMARY);
  });

  it("should provide markdown formatting helper primitives", () => {
    expect(md.bold("test")).toBe("**test**");
    expect(md.code("ping")).toBe("`ping`");
    expect(md.quote("line1\nline2")).toBe("> line1\n> line2");
    expect(md.subtext("footer hint")).toBe("-# footer hint");
    expect(md.channel("123")).toBe("<#123>");
    expect(md.user("456")).toBe("<@456>");
    expect(md.role("789")).toBe("<@&789>");
  });

  it("should construct Ofira-style trackEmbed matching modern music bot UI", () => {
    const embed = trackEmbed({
      status: "Now Playing",
      statusIcon: "https://example.com/sound.png",
      title: "Hello",
      url: "https://spotify.com/track/123",
      source: "Spotify",
      duration: "02:24",
      requestedBy: "Memory Dealer",
      volume: 100,
      thumbnail: "https://example.com/album.jpg",
    });

    const data = embed.toJSON();
    expect(data.author.name).toBe("Now Playing");
    expect(data.author.icon_url).toBe("https://example.com/sound.png");
    expect(data.description).toContain("[Hello](https://spotify.com/track/123) - Spotify");
    expect(data.description).toContain("Duration: `02:24`");
    expect(data.description).toContain("Requested by Memory Dealer");
    expect(data.description).toContain("🔊 100%");
    expect(data.thumbnail.url).toBe("https://example.com/album.jpg");
    expect(data.color).toBe(COLORS.DARK);
  });

  it("should construct smoothEmbed for minimal card output", () => {
    const embed = smoothEmbed({
      title: "Player Ready",
      description: "Connected to Voice Channel 1",
      badge: "AUDIO",
    });

    const data = embed.toJSON();
    expect(data.author.name).toBe("[AUDIO] Player Ready");
    expect(data.description).toBe("Connected to Voice Channel 1");
    expect(data.color).toBe(COLORS.DARK);
  });
});
