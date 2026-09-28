import { Hono } from "hono";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, parseEmoji } from "discord.js";
import { VerificationConfig } from "../../db/models/index.js";
import { ensureGuild } from "../../db/helpers/common.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { formatServerVariables } from "../../utils/templateParser.js";
import { apiCache } from "./cache.js";
import { VerificationService } from "../../services/index.js";

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
  const botGuild = c.get("botGuild");

  const rawRoleId = raw.verified_role_id ? String(raw.verified_role_id) : "";
  let roleExists = true;
  if (rawRoleId && botGuild?.roles?.cache && botGuild.roles.cache.size > 0) {
    if (!botGuild.roles.cache.has(rawRoleId)) {
      roleExists = false;
    }
  }

  // Detect if saved embed_description contains outdated cluttered templates
  const hasLegacyClutter = Boolean(raw.embed_description && (
    raw.embed_description.includes("{memberCount}") ||
    raw.embed_description.includes("{rules}") ||
    raw.embed_description.includes("member #") ||
    raw.embed_description.includes("@unknown-role")
  ));

  const payload = {
    ...raw,
    enabled: Boolean(raw.enabled),
    channelId: raw.verify_channel_id ? String(raw.verify_channel_id) : "",
    verifiedRoleId: roleExists ? rawRoleId : "",
    roleExists,
    hasLegacyClutter,
    unverifiedRoleId: raw.unverified_role_id ? String(raw.unverified_role_id) : "",
    logChannelId: raw.log_channel_id ? String(raw.log_channel_id) : "",
    mode: raw.mode || "button",
    minAccountAgeHours: Number(raw.min_account_age_hours || 0),
    embedTitle: raw.embed_title || "Server Verification",
    embedDescription: raw.embed_description || "🛡️ Click the button below to verify and get access to the server.",
    buttonLabel: raw.button_label || "Verify Access",
    buttonEmoji: raw.button_emoji || "✅",
  };

  // Cache for 30s
  apiCache.set(cacheKey, payload, 30000);

  return c.json(payload);
});

// Reset verification config: completely delete saved verification config from database
verificationRoutes.post("/guilds/:guildId/verification/reset", async (c) => {
  const guildId = c.req.param("guildId");
  await VerificationConfig.destroy({ where: { guild_id: String(guildId) } });
  apiCache.delete(`guild:${guildId}:verification`);

  return c.json({
    success: true,
    message: "Verification configuration completely deleted and reset.",
    config: {
      enabled: false,
      channelId: "",
      verifiedRoleId: "",
      unverifiedRoleId: "",
      logChannelId: "",
      mode: "button",
      minAccountAgeHours: 0,
      embedTitle: "Server Verification",
      embedDescription: "🛡️ Click the button below to verify and get access to the server.",
      buttonLabel: "Verify Access",
      buttonEmoji: "✅",
    },
  });
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
  if (body.deployPanel && config.verify_channel_id) {
    const targetChannelId = String(config.verify_channel_id).trim();
    const guildObj = botGuild || c.get("discordClient")?.guilds?.cache?.get(guildId);
    if (guildObj) {
      await VerificationService.deployVerificationPrompt({
        guild: guildObj,
        channelId: targetChannelId,
        config,
      }).catch((err) => {
        console.warn("[VERIFICATION DIRECT DEPLOY FAILED]:", err?.message);
      });
    }
  }

  return c.json({ success: true, config });
});

// Deploy verification button to configured channel
verificationRoutes.post("/guilds/:guildId/verification/post_button", async (c) => {
  const guildId = c.req.param("guildId");
  const client = c.get("discordClient");
  let botGuild = c.get("botGuild");
  if (!botGuild && client) {
    botGuild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
  }

  const body = await c.req.json().catch(() => ({}));

  let [config] = await VerificationConfig.findOrCreate({
    where: { guild_id: guildId },
    defaults: { guild_id: guildId },
  });

  // Synchronize all submitted configuration properties
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

  const channelId = body.channelId ?? body.verify_channel_id ?? body.channel_id;
  if (channelId !== undefined) config.verify_channel_id = channelId || null;

  const verifiedRoleId = body.verifiedRoleId ?? body.verified_role_id;
  if (verifiedRoleId !== undefined) config.verified_role_id = verifiedRoleId || null;

  const unverifiedRoleId = body.unverifiedRoleId ?? body.unverified_role_id;
  if (unverifiedRoleId !== undefined) config.unverified_role_id = unverifiedRoleId || null;

  const logChannelId = body.logChannelId ?? body.log_channel_id;
  if (logChannelId !== undefined) config.log_channel_id = logChannelId || null;

  await config.save();
  apiCache.delete(`guild:${guildId}:verification`);

  const targetChannelId = config.verify_channel_id ? String(config.verify_channel_id).trim() : "";
  if (!targetChannelId) {
    return c.json({ error: "Please select a verification channel first." }, 400);
  }

  const targetRoleId = config.verified_role_id ? String(config.verified_role_id).trim() : "";
  if (!targetRoleId || targetRoleId === "null" || targetRoleId === "undefined") {
    return c.json({ error: "Please select a Role to Grant in the Verification settings before sending the prompt." }, 400);
  }

  // Fetch channel from cache or Discord API with comprehensive fallback
  let channel = null;
  let fetchError = null;

  if (botGuild?.channels?.cache) {
    channel = botGuild.channels.cache.get(targetChannelId) || null;
  }
  if (!channel && botGuild?.channels?.fetch) {
    channel = await botGuild.channels.fetch(targetChannelId).catch((err) => {
      fetchError = err;
      return null;
    });
  }
  if (!channel && client?.channels?.cache) {
    channel = client.channels.cache.get(targetChannelId) || null;
  }
  if (!channel && client?.channels?.fetch) {
    channel = await client.channels.fetch(targetChannelId).catch((err) => {
      fetchError = err;
      return null;
    });
  }

  if (!channel) {
    if (fetchError?.code === 50001 || fetchError?.message?.includes("Missing Access")) {
      return c.json({
        error: `Bot lacks access to channel ${targetChannelId}. Please grant the bot "View Channel" in that channel's Discord permissions.`,
      }, 403);
    }
    if (fetchError?.code === 10003 || fetchError?.message?.includes("Unknown Channel")) {
      return c.json({
        error: `Channel ${targetChannelId} was not found on Discord. It may have been deleted or the bot cannot view it.`,
      }, 404);
    }
    return c.json({
      error: `Verification channel (${targetChannelId}) could not be accessed. Please ensure the bot is in this server and has "View Channel" permissions.`,
    }, 404);
  }

  if (typeof channel.send !== "function" || (typeof channel.isTextBased === "function" && !channel.isTextBased())) {
    return c.json({
      error: `#${channel.name || "channel"} is not a text channel the bot can send messages to.`,
    }, 400);
  }

  // Validate bot channel permissions
  const guildObj = botGuild || channel.guild || (client?.guilds ? client.guilds.cache.get(guildId) : null);
  let botMember = guildObj?.members?.me || null;
  if (!botMember && guildObj?.members?.fetch) {
    botMember = await guildObj.members.fetchMe().catch(() => null);
  }

  if (botMember && channel.permissionsFor) {
    const perms = channel.permissionsFor(botMember);
    if (perms) {
      if (!perms.has("ViewChannel")) {
        return c.json({
          error: `The bot cannot view #${channel.name}. In Discord, grant the bot "View Channel" permission in #${channel.name}.`,
        }, 403);
      }
      if (!perms.has("SendMessages")) {
        return c.json({
          error: `The bot cannot send messages in #${channel.name}. In Discord, grant the bot "Send Messages" permission in #${channel.name}.`,
        }, 403);
      }
      if (!perms.has("EmbedLinks")) {
        return c.json({
          error: `The bot cannot send embeds in #${channel.name}. In Discord, grant the bot "Embed Links" permission in #${channel.name}.`,
        }, 403);
      }
    }
  }

  // Validate verified role existence and hierarchy
  let verifiedRole = guildObj?.roles?.cache?.get(targetRoleId) || null;
  if (!verifiedRole && guildObj?.roles?.fetch) {
    verifiedRole = await guildObj.roles.fetch(targetRoleId).catch(() => null);
  }

  if (!verifiedRole) {
    return c.json({
      error: `The selected Role to Grant (${targetRoleId}) was not found on this server. It may have been deleted. Please pick a valid role in the dashboard before posting.`,
    }, 400);
  }

  if (botMember && verifiedRole.position >= botMember.roles.highest.position) {
    return c.json({
      error: `The bot cannot assign @${verifiedRole.name} because it is positioned higher than (or equal to) the bot's highest role. In Discord Server Settings > Roles, drag the bot's role above @${verifiedRole.name}.`,
    }, 400);
  }

  try {
    await VerificationService.deployVerificationPrompt({
      guild: guildObj,
      channelId: targetChannelId,
      config,
    });
    return c.json({ success: true, message: `Verification prompt posted to #${channel.name}!` });
  } catch (err) {
    console.error("[VERIFICATION PROMPT SEND ERROR]:", err);
    if (err.code === 50013 || err.message?.includes("Missing Permissions") || err.message?.includes("Bot lacks")) {
      return c.json({
        error: `Discord permission error in #${channel.name}: Missing Permissions. Please grant the bot "Send Messages" and "Embed Links" in #${channel.name}.`,
      }, 403);
    }
    return c.json({
      error: `Discord error while sending message to #${channel.name}: ${err.message || "Failed to post message"}.`,
    }, 400);
  }
});
