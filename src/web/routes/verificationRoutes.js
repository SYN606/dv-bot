import { Hono } from "hono";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { VerificationConfig } from "../../db/models/index.js";
import { ensureGuild } from "../../db/helpers/common.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { formatServerVariables } from "../../utils/templateParser.js";
import { apiCache } from "./cache.js";

export const verificationRoutes = new Hono();

// Verification Setup Retrieval
verificationRoutes.get("/guilds/:guildId/verification", async (c) => {
  const guildId = c.req.param("guildId");
  const cacheKey = `guild:${guildId}:verification`;
  const cached = apiCache.get(cacheKey);
  if (cached) {
    return c.json(cached);
  }

  const config = await VerificationConfig.findByPk(guildId);
  const raw = config ? config.toJSON() : {};
  const payload = {
    ...raw,
    enabled: Boolean(raw.enabled),
    channelId: raw.verify_channel_id ? String(raw.verify_channel_id) : "",
    verifiedRoleId: raw.verified_role_id ? String(raw.verified_role_id) : "",
    unverifiedRoleId: raw.unverified_role_id ? String(raw.unverified_role_id) : "",
    logChannelId: raw.log_channel_id ? String(raw.log_channel_id) : "",
    mode: raw.mode || "button",
    minAccountAgeHours: Number(raw.min_account_age_hours || 0),
    embedTitle: raw.embed_title || "",
    embedDescription: raw.embed_description || "",
    buttonLabel: raw.button_label || "Verify Access",
    buttonEmoji: raw.button_emoji || "✅",
  };

  // Cache for 30s
  apiCache.set(cacheKey, payload, 30000);

  return c.json(payload);
});

// Verification Setup Save
verificationRoutes.post("/guilds/:guildId/verification", async (c) => {
  const guildId = c.req.param("guildId");
  const body = await c.req.json();
  const botGuild = c.get("botGuild");

  await ensureGuild(guildId);

  const [config] = await VerificationConfig.findOrCreate({
    where: { guild_id: guildId },
    defaults: { guild_id: guildId },
  });

  if (body.enabled !== undefined) config.enabled = Boolean(body.enabled);
  if (body.mode !== undefined) config.mode = String(body.mode);
  if (body.min_account_age_hours !== undefined || body.minAccountAgeHours !== undefined) {
    config.min_account_age_hours = Number(body.min_account_age_hours ?? body.minAccountAgeHours ?? 0);
  }
  if (body.embed_title !== undefined || body.embedTitle !== undefined) {
    config.embed_title = body.embed_title ?? body.embedTitle ?? null;
  }
  if (body.embed_description !== undefined || body.embedDescription !== undefined) {
    config.embed_description = body.embed_description ?? body.embedDescription ?? null;
  }
  if (body.button_label !== undefined || body.buttonLabel !== undefined) {
    config.button_label = body.button_label ?? body.buttonLabel ?? "Verify Access";
  }
  if (body.button_emoji !== undefined || body.buttonEmoji !== undefined) {
    config.button_emoji = body.button_emoji ?? body.buttonEmoji ?? "✅";
  }

  const channelId = body.channelId ?? body.verify_channel_id;
  if (channelId !== undefined) config.verify_channel_id = channelId || null;

  const verifiedRoleId = body.verifiedRoleId ?? body.verified_role_id;
  if (verifiedRoleId !== undefined) config.verified_role_id = verifiedRoleId || null;

  const unverifiedRoleId = body.unverifiedRoleId ?? body.unverified_role_id;
  if (unverifiedRoleId !== undefined) config.unverified_role_id = unverifiedRoleId || null;

  const logChannelId = body.logChannelId ?? body.log_channel_id;
  if (logChannelId !== undefined) config.log_channel_id = logChannelId || null;

  await config.save();

  // Invalidate cache immediately on write
  apiCache.delete(`guild:${guildId}:verification`);

  // Deploy verification button panel if requested directly
  if (body.deployPanel && botGuild && config.verify_channel_id) {
    const channel = botGuild.channels.cache.get(String(config.verify_channel_id));
    if (channel && channel.send) {
      const rawTitle = config.embed_title || "Server Verification";
      const rawDesc =
        config.embed_description ||
        `${EMOJIS.get("welcome") || "🛡️"} Welcome to **{server}**!\n\n` +
        `To gain access to the rest of the server channels, please click the verification button below.`;

      const title = formatServerVariables(rawTitle, { guild: botGuild, channel, config });
      const description = formatServerVariables(rawDesc, { guild: botGuild, channel, config });
      const btnLabel = formatServerVariables(config.button_label || "Verify Access", { guild: botGuild, channel, config });

      const embed = makeEmbed({
        title,
        description,
        level: "PRIMARY",
      });

      const button = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("verify_member_btn")
          .setLabel(btnLabel)
          .setStyle(ButtonStyle.Success)
          .setEmoji(config.button_emoji || EMOJIS.get("success") || "✅")
      );

      await channel.send({ embeds: [embed], components: [button] }).catch(() => {});
    }
  }

  return c.json({ success: true, config });
});

// Deploy verification button to configured channel
verificationRoutes.post("/guilds/:guildId/verification/post_button", async (c) => {
  const guildId = c.req.param("guildId");
  const botGuild = c.get("botGuild");
  const config = await VerificationConfig.findByPk(guildId);

  if (!config || !config.verify_channel_id) {
    return c.json({ error: "Verification channel is not configured." }, 400);
  }

  const channel = botGuild?.channels.cache.get(String(config.verify_channel_id));
  if (!channel || !channel.send) {
    return c.json({ error: "Verification channel was not found or bot lacks send access." }, 404);
  }

  const rawTitle = config.embed_title || "Server Verification";
  const rawDesc =
    config.embed_description ||
    `${EMOJIS.get("welcome") || "🛡️"} Welcome to **{server}**!\n\n` +
    `To gain access to the rest of the server channels, please click the verification button below.`;

  const title = formatServerVariables(rawTitle, { guild: botGuild, channel, config });
  const description = formatServerVariables(rawDesc, { guild: botGuild, channel, config });
  const btnLabel = formatServerVariables(config.button_label || "Verify Access", { guild: botGuild, channel, config });

  const embed = makeEmbed({
    title,
    description,
    level: "PRIMARY",
  });

  const button = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("verify_member_btn")
      .setLabel(btnLabel)
      .setStyle(ButtonStyle.Success)
      .setEmoji(config.button_emoji || EMOJIS.get("success") || "✅")
  );

  await channel.send({ embeds: [embed], components: [button] });
  return c.json({ success: true, message: "Verification prompt posted to channel." });
});
