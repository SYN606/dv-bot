import { Hono } from "hono";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type TextChannel,
} from "discord.js";
import {
  getConfessionConfig,
  saveConfessionConfig,
  checkWordFilter,
} from "../../db/helpers/confessions.js";
import { setModuleEnabled } from "../../db/helpers/moduleStatus.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";

export const confessionRoutes = new Hono();

// 1. Get Confessions Configuration
confessionRoutes.get("/guilds/:guildId/confessions/config", async (c) => {
  const guildId = c.req.param("guildId");
  const config = await getConfessionConfig(guildId);
  return c.json(config);
});

// 2. Update Confessions Configuration
confessionRoutes.put("/guilds/:guildId/confessions/config", async (c) => {
  const guildId = c.req.param("guildId");
  const body = await c.req.json().catch(() => ({}));

  const updates: Record<string, any> = {};

  if (body.enabled !== undefined) updates.enabled = Boolean(body.enabled);
  if (body.channel_id !== undefined) updates.channel_id = body.channel_id ? String(body.channel_id) : null;
  if (body.review_channel_id !== undefined) updates.review_channel_id = body.review_channel_id ? String(body.review_channel_id) : null;
  if (body.reviewer_role_ids !== undefined) updates.reviewer_role_ids = Array.isArray(body.reviewer_role_ids) ? body.reviewer_role_ids : [];
  if (body.show_author_in_review !== undefined) updates.show_author_in_review = Boolean(body.show_author_in_review);
  if (body.allow_anonymous !== undefined) updates.allow_anonymous = Boolean(body.allow_anonymous);
  if (body.require_approval !== undefined) updates.require_approval = Boolean(body.require_approval);
  if (body.auto_thread !== undefined) updates.auto_thread = Boolean(body.auto_thread);
  if (body.cooldown_seconds !== undefined) updates.cooldown_seconds = Math.max(0, Number(body.cooldown_seconds) || 0);
  if (body.banned_words !== undefined) updates.banned_words = String(body.banned_words || "");
  if (body.regex_filter !== undefined) {
    const rawPattern = String(body.regex_filter || "").trim();
    if (rawPattern.length > 0) {
      try {
        new RegExp(rawPattern, "i");
      } catch (err: any) {
        return c.json({ error: `Invalid regular expression: ${err.message}` }, 400);
      }
    }
    updates.regex_filter = rawPattern;
  }
  if (body.regex_filter_enabled !== undefined) updates.regex_filter_enabled = Boolean(body.regex_filter_enabled);

  const updated = await saveConfessionConfig(guildId, updates);

  if (updates.enabled !== undefined) {
    await setModuleEnabled(guildId, "confessions", updates.enabled);
  }

  return c.json({ success: true, config: updated });
});

// 3. Test Filter Sandbox
confessionRoutes.post("/guilds/:guildId/confessions/test-filter", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const text = String(body.text || "");
  const banned_words = String(body.banned_words || "");
  const regex_filter = String(body.regex_filter || "");

  const mockConfig = {
    regex_filter_enabled: true,
    banned_words,
    regex_filter,
  };

  const result = checkWordFilter(text, mockConfig);
  return c.json(result);
});

// 4. Send Interactive Submission Panel into Channel
confessionRoutes.post("/guilds/:guildId/confessions/send-panel", async (c) => {
  const guildId = c.req.param("guildId");
  const botGuild: any = c.get("botGuild" as any);

  if (!botGuild) {
    return c.json({ error: "Bot is not in this guild." }, 404);
  }

  const config = await getConfessionConfig(guildId);
  if (!config || !config.channel_id) {
    return c.json({ error: "Please select and save a public confession channel first." }, 400);
  }

  const channel = (await botGuild.channels.fetch(config.channel_id).catch(() => null)) as TextChannel | null;
  if (!channel || !channel.isTextBased()) {
    return c.json({ error: "Configured confession channel is invalid or bot lacks permissions to access it." }, 400);
  }

  const heartEmoji = EMOJIS.get("heart") || "💌";
  const embed = makeEmbed({
    title: `${heartEmoji} Server Confessions Box`,
    description:
      `Have something on your mind that you want to share with the server anonymously?\n\n` +
      `• Click the button below to open the confession form.\n` +
      `• Your identity is protected and kept completely anonymous.\n` +
      `• Submissions must respect server community guidelines.\n\n` +
      `*All confessions are screened according to server safety standards.*`,
    color: "#EC4899",
    footer: `${botGuild.name || "Server"} • Anonymous Confessions`,
  });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("confess_open_modal")
      .setLabel("Submit Anonymous Confession")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("💌")
  );

  try {
    await channel.send({
      embeds: [embed],
      components: [row],
    });
    return c.json({ success: true, message: `Confession panel sent to #${channel.name}` });
  } catch (err: any) {
    return c.json({ error: `Failed to send panel: ${err.message}` }, 500);
  }
});
