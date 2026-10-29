import { Hono } from "hono";
import { WelcomeConfig } from "../../db/models/index.js";
import { ensureGuild } from "../../db/helpers/common.js";
import { apiCache } from "./cache.js";
import { buildWelcomePayload, formatWelcomeText } from "../../utils/welcomeFormatter.js";

export const welcomeRoutes = new Hono();

const DEFAULT_WELCOME_CONFIG = {
  welcome_enabled: 0,
  welcome_channel_id: "",
  welcome_message: "Hey {user}, welcome to **{server}**! Glad to have you here. You are member #{memberCount}! 🎉",
  welcome_is_embed: 1,
  welcome_embed_title: "Welcome to {server}!",
  welcome_embed_title_url: "",
  welcome_embed_author: "",
  welcome_embed_author_icon: "",
  welcome_embed_author_url: "",
  welcome_embed_color: "#6366F1",
  welcome_embed_footer: "Member #{memberCount}",
  welcome_embed_footer_icon: "",
  welcome_embed_fields: "[]",
  welcome_show_thumbnail: 1,
  welcome_thumbnail_type: "user_avatar",
  welcome_thumbnail_custom: "",
  welcome_image_url: "",
  welcome_ping_user: 1,
  welcome_delete_seconds: 0,
  welcome_show_timestamp: 1,

  dm_enabled: 0,
  dm_message: "Welcome to **{server}**, {username}! Please check out our rules and enjoy your stay.",
  dm_is_embed: 0,
  dm_embed_title: "Welcome to {server}!",
  dm_embed_color: "#10B981",
  dm_embed_footer: "{server}",
  dm_show_thumbnail: 1,

  leave_enabled: 0,
  leave_channel_id: "",
  leave_message: "{username} has left the server. We are down to {memberCount} members.",
  leave_is_embed: 0,
  leave_embed_title: "Goodbye!",
  leave_embed_color: "#F43F5E",
  leave_embed_footer: "Remaining: {memberCount} members",
  leave_show_thumbnail: 1,
  leave_image_url: "",

  autorole_enabled: 0,
  join_role_ids: "[]",
  bot_role_id: "",
};

// 1. GET /guilds/:guildId/welcome
welcomeRoutes.get("/guilds/:guildId/welcome", async (c) => {
  const guildId = c.req.param("guildId");
  const cacheKey = `guild:${guildId}:welcome`;
  const cached = apiCache.get(cacheKey);
  if (cached) {
    return c.json(cached);
  }

  await ensureGuild(guildId);
  const record = await WelcomeConfig.findByPk(guildId);
  const raw = record ? record.toJSON() : {};

  let parsedJoinRoles = [];
  try {
    parsedJoinRoles = typeof raw.join_role_ids === "string"
      ? JSON.parse(raw.join_role_ids || "[]")
      : (raw.join_role_ids || []);
  } catch (_) {
    parsedJoinRoles = [];
  }

  let parsedFields = [];
  try {
    parsedFields = typeof raw.welcome_embed_fields === "string"
      ? JSON.parse(raw.welcome_embed_fields || "[]")
      : (raw.welcome_embed_fields || []);
  } catch (_) {
    parsedFields = [];
  }

  const payload = {
    guild_id: guildId,
    welcome_enabled: Boolean(raw.welcome_enabled ?? DEFAULT_WELCOME_CONFIG.welcome_enabled),
    welcome_channel_id: raw.welcome_channel_id || "",
    welcome_message: raw.welcome_message ?? DEFAULT_WELCOME_CONFIG.welcome_message,
    welcome_is_embed: Boolean(raw.welcome_is_embed ?? DEFAULT_WELCOME_CONFIG.welcome_is_embed),
    welcome_embed_title: raw.welcome_embed_title ?? DEFAULT_WELCOME_CONFIG.welcome_embed_title,
    welcome_embed_title_url: raw.welcome_embed_title_url || "",
    welcome_embed_author: raw.welcome_embed_author || "",
    welcome_embed_author_icon: raw.welcome_embed_author_icon || "",
    welcome_embed_author_url: raw.welcome_embed_author_url || "",
    welcome_embed_color: raw.welcome_embed_color || DEFAULT_WELCOME_CONFIG.welcome_embed_color,
    welcome_embed_footer: raw.welcome_embed_footer ?? DEFAULT_WELCOME_CONFIG.welcome_embed_footer,
    welcome_embed_footer_icon: raw.welcome_embed_footer_icon || "",
    welcome_embed_fields: parsedFields,
    welcome_show_thumbnail: Boolean(raw.welcome_show_thumbnail ?? DEFAULT_WELCOME_CONFIG.welcome_show_thumbnail),
    welcome_thumbnail_type: raw.welcome_thumbnail_type || DEFAULT_WELCOME_CONFIG.welcome_thumbnail_type,
    welcome_thumbnail_custom: raw.welcome_thumbnail_custom || "",
    welcome_image_url: raw.welcome_image_url || "",
    welcome_ping_user: Boolean(raw.welcome_ping_user ?? DEFAULT_WELCOME_CONFIG.welcome_ping_user),
    welcome_delete_seconds: Number(raw.welcome_delete_seconds ?? 0),
    welcome_show_timestamp: Boolean(raw.welcome_show_timestamp ?? DEFAULT_WELCOME_CONFIG.welcome_show_timestamp),

    dm_enabled: Boolean(raw.dm_enabled ?? DEFAULT_WELCOME_CONFIG.dm_enabled),
    dm_message: raw.dm_message ?? DEFAULT_WELCOME_CONFIG.dm_message,
    dm_is_embed: Boolean(raw.dm_is_embed ?? DEFAULT_WELCOME_CONFIG.dm_is_embed),
    dm_embed_title: raw.dm_embed_title ?? DEFAULT_WELCOME_CONFIG.dm_embed_title,
    dm_embed_color: raw.dm_embed_color || DEFAULT_WELCOME_CONFIG.dm_embed_color,
    dm_embed_footer: raw.dm_embed_footer ?? DEFAULT_WELCOME_CONFIG.dm_embed_footer,
    dm_show_thumbnail: Boolean(raw.dm_show_thumbnail ?? DEFAULT_WELCOME_CONFIG.dm_show_thumbnail),

    leave_enabled: Boolean(raw.leave_enabled ?? DEFAULT_WELCOME_CONFIG.leave_enabled),
    leave_channel_id: raw.leave_channel_id || "",
    leave_message: raw.leave_message ?? DEFAULT_WELCOME_CONFIG.leave_message,
    leave_is_embed: Boolean(raw.leave_is_embed ?? DEFAULT_WELCOME_CONFIG.leave_is_embed),
    leave_embed_title: raw.leave_embed_title ?? DEFAULT_WELCOME_CONFIG.leave_embed_title,
    leave_embed_color: raw.leave_embed_color || DEFAULT_WELCOME_CONFIG.leave_embed_color,
    leave_embed_footer: raw.leave_embed_footer ?? DEFAULT_WELCOME_CONFIG.leave_embed_footer,
    leave_show_thumbnail: Boolean(raw.leave_show_thumbnail ?? DEFAULT_WELCOME_CONFIG.leave_show_thumbnail),
    leave_image_url: raw.leave_image_url || "",

    autorole_enabled: Boolean(raw.autorole_enabled ?? DEFAULT_WELCOME_CONFIG.autorole_enabled),
    join_role_ids: parsedJoinRoles,
    bot_role_id: raw.bot_role_id || "",
  };

  apiCache.set(cacheKey, payload, 30);
  return c.json(payload);
});

// 2. POST /guilds/:guildId/welcome
welcomeRoutes.post("/guilds/:guildId/welcome", async (c) => {
  const guildId = c.req.param("guildId");
  const body = await c.req.json();

  await ensureGuild(guildId);

  const joinRolesSerialized = Array.isArray(body.join_role_ids)
    ? JSON.stringify(body.join_role_ids)
    : (typeof body.join_role_ids === "string" ? body.join_role_ids : "[]");

  const fieldsSerialized = Array.isArray(body.welcome_embed_fields)
    ? JSON.stringify(body.welcome_embed_fields)
    : (typeof body.welcome_embed_fields === "string" ? body.welcome_embed_fields : "[]");

  const updateData = {
    welcome_enabled: body.welcome_enabled ? 1 : 0,
    welcome_channel_id: body.welcome_channel_id ? String(body.welcome_channel_id) : null,
    welcome_message: body.welcome_message !== undefined ? String(body.welcome_message) : DEFAULT_WELCOME_CONFIG.welcome_message,
    welcome_is_embed: body.welcome_is_embed ? 1 : 0,
    welcome_embed_title: body.welcome_embed_title !== undefined ? String(body.welcome_embed_title) : DEFAULT_WELCOME_CONFIG.welcome_embed_title,
    welcome_embed_title_url: body.welcome_embed_title_url ? String(body.welcome_embed_title_url).trim() : null,
    welcome_embed_author: body.welcome_embed_author !== undefined ? String(body.welcome_embed_author) : null,
    welcome_embed_author_icon: body.welcome_embed_author_icon ? String(body.welcome_embed_author_icon).trim() : null,
    welcome_embed_author_url: body.welcome_embed_author_url ? String(body.welcome_embed_author_url).trim() : null,
    welcome_embed_color: body.welcome_embed_color ? String(body.welcome_embed_color) : DEFAULT_WELCOME_CONFIG.welcome_embed_color,
    welcome_embed_footer: body.welcome_embed_footer !== undefined ? String(body.welcome_embed_footer) : DEFAULT_WELCOME_CONFIG.welcome_embed_footer,
    welcome_embed_footer_icon: body.welcome_embed_footer_icon ? String(body.welcome_embed_footer_icon).trim() : null,
    welcome_embed_fields: fieldsSerialized,
    welcome_show_thumbnail: body.welcome_show_thumbnail ? 1 : 0,
    welcome_thumbnail_type: body.welcome_thumbnail_type || "user_avatar",
    welcome_thumbnail_custom: body.welcome_thumbnail_custom ? String(body.welcome_thumbnail_custom).trim() : null,
    welcome_image_url: body.welcome_image_url ? String(body.welcome_image_url).trim() : null,
    welcome_ping_user: body.welcome_ping_user ? 1 : 0,
    welcome_delete_seconds: Math.max(0, parseInt(body.welcome_delete_seconds, 10) || 0),
    welcome_show_timestamp: body.welcome_show_timestamp ? 1 : 0,

    dm_enabled: body.dm_enabled ? 1 : 0,
    dm_message: body.dm_message !== undefined ? String(body.dm_message) : DEFAULT_WELCOME_CONFIG.dm_message,
    dm_is_embed: body.dm_is_embed ? 1 : 0,
    dm_embed_title: body.dm_embed_title !== undefined ? String(body.dm_embed_title) : DEFAULT_WELCOME_CONFIG.dm_embed_title,
    dm_embed_color: body.dm_embed_color ? String(body.dm_embed_color) : DEFAULT_WELCOME_CONFIG.dm_embed_color,
    dm_embed_footer: body.dm_embed_footer !== undefined ? String(body.dm_embed_footer) : DEFAULT_WELCOME_CONFIG.dm_embed_footer,
    dm_show_thumbnail: body.dm_show_thumbnail ? 1 : 0,

    leave_enabled: body.leave_enabled ? 1 : 0,
    leave_channel_id: body.leave_channel_id ? String(body.leave_channel_id) : null,
    leave_message: body.leave_message !== undefined ? String(body.leave_message) : DEFAULT_WELCOME_CONFIG.leave_message,
    leave_is_embed: body.leave_is_embed ? 1 : 0,
    leave_embed_title: body.leave_embed_title !== undefined ? String(body.leave_embed_title) : DEFAULT_WELCOME_CONFIG.leave_embed_title,
    leave_embed_color: body.leave_embed_color ? String(body.leave_embed_color) : DEFAULT_WELCOME_CONFIG.leave_embed_color,
    leave_embed_footer: body.leave_embed_footer !== undefined ? String(body.leave_embed_footer) : DEFAULT_WELCOME_CONFIG.leave_embed_footer,
    leave_show_thumbnail: body.leave_show_thumbnail ? 1 : 0,
    leave_image_url: body.leave_image_url ? String(body.leave_image_url).trim() : null,

    autorole_enabled: body.autorole_enabled ? 1 : 0,
    join_role_ids: joinRolesSerialized,
    bot_role_id: body.bot_role_id ? String(body.bot_role_id) : null,
    updated_at: new Date().toISOString(),
  };

  const existing = await WelcomeConfig.findByPk(guildId);
  if (existing) {
    await existing.update(updateData);
  } else {
    await WelcomeConfig.create({
      guild_id: guildId,
      ...updateData,
    });
  }

  apiCache.delete(`guild:${guildId}:welcome`);

  return c.json({
    success: true,
    message: "Welcome and Leave settings updated successfully",
  });
});

// 3. POST /guilds/:guildId/welcome/test
welcomeRoutes.post("/guilds/:guildId/welcome/test", async (c) => {
  const guildId = c.req.param("guildId");
  const { type = "channel" } = await c.req.json();
  const botGuild = c.get("botGuild");
  const user = c.get("user");

  if (!botGuild) {
    return c.json({ success: false, message: "Bot is not in this guild" }, 404);
  }

  const config = await WelcomeConfig.findByPk(guildId);
  if (!config) {
    return c.json({ success: false, message: "Please save your configuration first before sending a test message." }, 400);
  }

  // Create or resolve test member (using the current user in guild if cached, or a synthetic member)
  const targetMember = botGuild.members.cache.get(user?.id) || {
    id: user?.id || "0",
    displayName: user?.username || "AdminTester",
    guild: botGuild,
    user: {
      id: user?.id || "0",
      username: user?.username || "AdminTester",
      tag: user?.username ? `${user.username}#0000` : "AdminTester#0000",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120),
      displayAvatarURL: () => (user?.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=512` : "https://cdn.discordapp.com/embed/avatars/0.png"),
    },
  };

  try {
    if (type === "channel") {
      if (!config.welcome_channel_id) {
        return c.json({ success: false, message: "No welcome channel configured" }, 400);
      }
      let channel = botGuild.channels.cache.get(config.welcome_channel_id);
      if (!channel && botGuild.channels.fetch) {
        channel = await botGuild.channels.fetch(config.welcome_channel_id).catch(() => null);
      }
      if (!channel || !channel.isTextBased()) {
        return c.json({ success: false, message: "Welcome channel not found or bot lacks access" }, 404);
      }
      const payload = buildWelcomePayload(config, targetMember, "welcome");
      await channel.send(payload);
      return c.json({ success: true, message: `Test welcome message sent to #${channel.name}` });
    }

    if (type === "leave") {
      if (!config.leave_channel_id) {
        return c.json({ success: false, message: "No leave channel configured" }, 400);
      }
      let channel = botGuild.channels.cache.get(config.leave_channel_id);
      if (!channel && botGuild.channels.fetch) {
        channel = await botGuild.channels.fetch(config.leave_channel_id).catch(() => null);
      }
      if (!channel || !channel.isTextBased()) {
        return c.json({ success: false, message: "Leave channel not found or bot lacks access" }, 404);
      }
      const payload = buildWelcomePayload(config, targetMember, "leave");
      await channel.send(payload);
      return c.json({ success: true, message: `Test goodbye message sent to #${channel.name}` });
    }

    if (type === "dm") {
      if (!user?.id) {
        return c.json({ success: false, message: "Could not identify current admin user" }, 400);
      }
      const discordUser = await botGuild.client.users.fetch(user.id).catch(() => null);
      if (!discordUser) {
        return c.json({ success: false, message: "Could not fetch Discord user" }, 404);
      }
      const dmPayload = buildWelcomePayload(config, targetMember, "dm");
      await discordUser.send(dmPayload);
      return c.json({ success: true, message: "Test onboarding DM delivered to your direct messages!" });
    }

    return c.json({ success: false, message: "Invalid test type" }, 400);
  } catch (err) {
    console.error("[WELCOME TEST DISPATCH ERROR]:", err);
    return c.json({
      success: false,
      message: `Failed to dispatch test message: ${err.message || "Discord API error"}`,
    }, 500);
  }
});
