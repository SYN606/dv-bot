import { Hono } from "hono";
import { WelcomeConfig } from "../../db/models/index.js";
import { ensureGuild } from "../../db/helpers/common.js";
import { getRawSqlite } from "../../db/index.js";
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
  welcome_trigger: "join",

  dm_enabled: 0,
  dm_message: "Welcome to **{server}**, {username}! Please check out our rules and enjoy your stay.",
  dm_is_embed: 0,
  dm_embed_title: "Welcome to {server}!",
  dm_embed_color: "#10B981",
  dm_embed_footer: "{server}",
  dm_show_thumbnail: 1,

  leave_enabled: 0,
  leave_channel_id: "",
  leave_message: "## 🚪 {displayName} has left the server\n\n> 👤 **User:** {user} (`{username}`)\n> 🆔 **User ID:** `{id}`\n> 🏷️ **Normal Name:** {displayName}\n> 🛡️ **Roles:** {roles}\n> 👥 **Remaining Members:** #{memberCount}",
  leave_is_embed: 1,
  leave_embed_title: "🚪 Member Departed",
  leave_embed_color: "#F43F5E",
  leave_embed_footer: "User ID: {id} • Remaining: {memberCount} members",
  leave_show_thumbnail: 1,
  leave_image_url: "",

  autorole_enabled: 0,
  join_role_ids: "[]",
  bot_role_id: "",
};

export function ensureWelcomeConfigTable() {
  const sqlite = getRawSqlite();
  if (!sqlite) return;
  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS welcome_config (
        guild_id TEXT PRIMARY KEY,
        welcome_enabled INTEGER DEFAULT 0,
        welcome_channel_id TEXT,
        welcome_message TEXT DEFAULT 'Hey {user}, welcome to **{server}**! Glad to have you here. You are member #{memberCount}! 🎉',
        welcome_is_embed INTEGER DEFAULT 1,
        welcome_embed_title TEXT DEFAULT 'Welcome to {server}!',
        welcome_embed_title_url TEXT,
        welcome_embed_author TEXT,
        welcome_embed_author_icon TEXT,
        welcome_embed_author_url TEXT,
        welcome_embed_color TEXT DEFAULT '#6366F1',
        welcome_embed_footer TEXT DEFAULT 'Member #{memberCount}',
        welcome_embed_footer_icon TEXT,
        welcome_embed_fields TEXT DEFAULT '[]',
        welcome_show_thumbnail INTEGER DEFAULT 1,
        welcome_thumbnail_type TEXT DEFAULT 'user_avatar',
        welcome_thumbnail_custom TEXT,
        welcome_image_url TEXT,
        welcome_ping_user INTEGER DEFAULT 1,
        welcome_delete_seconds INTEGER DEFAULT 0,
        welcome_show_timestamp INTEGER DEFAULT 1,
        welcome_trigger TEXT DEFAULT 'join',
        dm_enabled INTEGER DEFAULT 0,
        dm_message TEXT DEFAULT 'Welcome to **{server}**, {username}! Please check out our rules and enjoy your stay.',
        dm_is_embed INTEGER DEFAULT 0,
        dm_embed_title TEXT DEFAULT 'Welcome to {server}!',
        dm_embed_color TEXT DEFAULT '#10B981',
        dm_embed_footer TEXT DEFAULT '{server}',
        dm_show_thumbnail INTEGER DEFAULT 1,
        leave_enabled INTEGER DEFAULT 0,
        leave_channel_id TEXT,
        leave_message TEXT DEFAULT '## 🚪 {displayName} has left the server\\n\\n> 👤 **User:** {user} (\`{username}\`)\\n> 🆔 **User ID:** \`{id}\`\\n> 🏷️ **Normal Name:** {displayName}\\n> 🛡️ **Roles:** {roles}\\n> 👥 **Remaining Members:** #{memberCount}',
        leave_is_embed INTEGER DEFAULT 1,
        leave_embed_title TEXT DEFAULT '🚪 Member Departed',
        leave_embed_color TEXT DEFAULT '#F43F5E',
        leave_embed_footer TEXT DEFAULT 'User ID: {id} • Remaining: {memberCount} members',
        leave_show_thumbnail INTEGER DEFAULT 1,
        leave_image_url TEXT,
        autorole_enabled INTEGER DEFAULT 0,
        join_role_ids TEXT DEFAULT '[]',
        bot_role_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const welcomeCols = [
      "welcome_embed_title_url TEXT",
      "welcome_embed_author TEXT",
      "welcome_embed_author_icon TEXT",
      "welcome_embed_author_url TEXT",
      "welcome_embed_footer_icon TEXT",
      "welcome_embed_fields TEXT DEFAULT '[]'",
      "welcome_thumbnail_type TEXT DEFAULT 'user_avatar'",
      "welcome_thumbnail_custom TEXT",
      "welcome_show_timestamp INTEGER DEFAULT 1",
      "welcome_trigger TEXT DEFAULT 'join'",
      "dm_is_embed INTEGER DEFAULT 0",
      "dm_embed_title TEXT DEFAULT 'Welcome to {server}!'",
      "dm_embed_color TEXT DEFAULT '#10B981'",
      "dm_embed_footer TEXT DEFAULT '{server}'",
      "dm_show_thumbnail INTEGER DEFAULT 1",
      "leave_embed_footer TEXT DEFAULT 'User ID: {id} • Remaining: {memberCount} members'",
      "leave_show_thumbnail INTEGER DEFAULT 1",
      "leave_image_url TEXT",
      "leave_embed_author TEXT",
      "leave_embed_author_icon TEXT",
      "leave_embed_fields TEXT DEFAULT '[]'",
    ];
    for (const col of welcomeCols) {
      try {
        sqlite.exec(`ALTER TABLE welcome_config ADD COLUMN ${col};`);
      } catch (_) {}
    }
  } catch (err) {
    console.error("[WELCOME SCHEMA BOOTSTRAP ERROR]:", err);
  }
}

async function safeFindWelcomeConfig(guildId) {
  try {
    return await WelcomeConfig.findByPk(guildId);
  } catch (err) {
    if (String(err?.message || "").includes("no such table")) {
      ensureWelcomeConfigTable();
      try {
        return await WelcomeConfig.findByPk(guildId);
      } catch (_) {
        return null;
      }
    }
    return null;
  }
}

// 1. GET /guilds/:guildId/welcome
welcomeRoutes.get("/guilds/:guildId/welcome", async (c) => {
  const guildId = c.req.param("guildId");
  const cacheKey = `guild:${guildId}:welcome`;
  const cached = apiCache.get(cacheKey);
  if (cached) {
    return c.json(cached);
  }

  try {
    await ensureGuild(guildId);
  } catch (_) {}

  const record = await safeFindWelcomeConfig(guildId);
  const raw: Record<string, any> = record ? record.toJSON() : {};

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
    welcome_trigger: raw.welcome_trigger || DEFAULT_WELCOME_CONFIG.welcome_trigger,

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
  const body: Record<string, any> = await c.req.json();

  try {
    await ensureGuild(guildId);
  } catch (_) {}

  const joinRolesSerialized = Array.isArray(body.join_role_ids)
    ? JSON.stringify(body.join_role_ids)
    : (typeof body.join_role_ids === "string" ? body.join_role_ids : "[]");

  const fieldsSerialized = Array.isArray(body.welcome_embed_fields)
    ? JSON.stringify(body.welcome_embed_fields)
    : (typeof body.welcome_embed_fields === "string" ? body.welcome_embed_fields : "[]");

  const updateData: Record<string, any> = {
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
    welcome_trigger: ["join", "onboarding", "verification"].includes(String(body.welcome_trigger || "").toLowerCase())
      ? String(body.welcome_trigger).toLowerCase()
      : "join",

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

  ensureWelcomeConfigTable();

  let existing = await safeFindWelcomeConfig(guildId);
  if (existing) {
    await existing.update(updateData);
  } else {
    try {
      await WelcomeConfig.create({
        guild_id: guildId,
        ...updateData,
      });
    } catch (createErr) {
      if (String(createErr?.message || "").includes("no such table")) {
        ensureWelcomeConfigTable();
        await WelcomeConfig.create({
          guild_id: guildId,
          ...updateData,
        });
      } else {
        throw createErr;
      }
    }
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
  const body: Record<string, any> = await c.req.json().catch(() => ({}));
  const rawType = String(body.type || "channel").toLowerCase().trim();
  const type = (rawType === "welcome" || rawType === "welcome_channel")
    ? "channel"
    : (rawType === "goodbye" || rawType === "leave_channel")
    ? "leave"
    : rawType;

  const draftConfig = body.config && typeof body.config === "object" ? body.config : null;
  const overrideChannelId = body.channelId ? String(body.channelId).trim() : null;
  const autoDeleteSeconds = Math.max(0, parseInt(body.autoDeleteSeconds, 10) || 0);

  const client: any = (c as any).get("discordClient");
  let botGuild: any = (c as any).get("botGuild") || client?.guilds?.cache?.get(guildId);
  if (!botGuild && client?.guilds?.fetch) {
    botGuild = await client.guilds.fetch(guildId).catch(() => null);
  }
  const user: any = (c as any).get("user");

  if (!botGuild) {
    return c.json({
      success: false,
      error: "Bot is not in this guild or guild not found",
      message: "Bot is not in this guild or guild not found",
    }, 404);
  }

  const baseRecord = await safeFindWelcomeConfig(guildId);
  const baseConfig: Record<string, any> = baseRecord ? baseRecord.toJSON() : {};

  // Merge draft over saved configuration so unsaved drafts can be previewed directly in Discord
  const config: Record<string, any> = {
    ...DEFAULT_WELCOME_CONFIG,
    ...baseConfig,
    ...(draftConfig || {}),
  };

  // Create or resolve test member (using the current user in guild if cached/fetchable, or a rich synthetic member with roles)
  let actualMember = user?.id ? botGuild.members?.cache?.get(user.id) : null;
  if (!actualMember && user?.id && botGuild.members?.fetch) {
    actualMember = await botGuild.members.fetch(user.id).catch(() => null);
  }

  const targetMember: any = actualMember || {
    id: user?.id || "104712345678901234",
    displayName: user?.username ? `${user.username} (Staff Lead)` : "AdminTester",
    nickname: user?.username ? `${user.username} (Staff Lead)` : "AdminTester",
    guild: botGuild,
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 75),
    roleNames: ["@Server Administrator", "@VIP Supporter", "@Community Mod"],
    user: {
      id: user?.id || "104712345678901234",
      username: user?.username || "AdminTester",
      globalName: user?.username || "AdminTester",
      tag: user?.username ? `${user.username}#0000` : "AdminTester#0000",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 180),
      displayAvatarURL: () => (user?.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=512` : "https://cdn.discordapp.com/embed/avatars/0.png"),
    },
  };

  try {
    if (type === "channel") {
      const targetChannelId = overrideChannelId || config.welcome_channel_id;
      if (!targetChannelId) {
        return c.json({
          success: false,
          error: "No welcome channel specified. Please select a channel to send the test message to.",
          message: "No welcome channel specified. Please select a channel to send the test message to."
        }, 400);
      }

      let channel = botGuild.channels?.cache?.get(targetChannelId);
      if (!channel && botGuild.channels?.fetch) {
        channel = await botGuild.channels.fetch(targetChannelId).catch(() => null);
      }
      if (!channel || typeof channel.send !== "function") {
        return c.json({
          success: false,
          error: "Selected welcome channel not found or bot lacks access to view/send messages in it.",
          message: "Selected welcome channel not found or bot lacks access to view/send messages in it."
        }, 404);
      }

      const payload: any = buildWelcomePayload(config, targetMember, "welcome");
      if (payload && typeof payload === "object") {
        payload.allowedMentions = { parse: ["users"] };
      }

      let sentMsg = null;
      try {
        sentMsg = await channel.send(payload);
      } catch (sendErr: any) {
        if (sendErr?.code === 50013) {
          return c.json({
            success: false,
            error: `Bot lacks 'Send Messages' or 'Embed Links' permission in #${channel.name}.`,
            message: `Bot lacks 'Send Messages' or 'Embed Links' permission in #${channel.name}.`,
          }, 403);
        }
        if (sendErr?.code === 50001) {
          return c.json({
            success: false,
            error: `Bot lacks 'View Channel' access to #${channel.name}.`,
            message: `Bot lacks 'View Channel' access to #${channel.name}.`,
          }, 403);
        }
        throw sendErr;
      }

      if (autoDeleteSeconds > 0 && sentMsg?.delete) {
        setTimeout(() => {
          sentMsg.delete().catch(() => null);
        }, autoDeleteSeconds * 1000);
      }

      return c.json({
        success: true,
        message: `Test welcome message sent to #${channel.name}${autoDeleteSeconds > 0 ? ` (auto-deletes in ${autoDeleteSeconds}s)` : ""}`,
      });
    }

    if (type === "leave") {
      const targetChannelId = overrideChannelId || config.leave_channel_id;
      if (!targetChannelId) {
        return c.json({
          success: false,
          error: "No goodbye channel specified. Please select a channel to send the test message to.",
          message: "No goodbye channel specified. Please select a channel to send the test message to."
        }, 400);
      }

      let channel = botGuild.channels?.cache?.get(targetChannelId);
      if (!channel && botGuild.channels?.fetch) {
        channel = await botGuild.channels.fetch(targetChannelId).catch(() => null);
      }
      if (!channel || typeof channel.send !== "function") {
        return c.json({
          success: false,
          error: "Selected goodbye channel not found or bot lacks access to view/send messages in it.",
          message: "Selected goodbye channel not found or bot lacks access to view/send messages in it."
        }, 404);
      }

      const payload: any = buildWelcomePayload(config, targetMember, "leave");
      if (payload && typeof payload === "object") {
        payload.allowedMentions = { parse: ["users"] };
      }

      let sentMsg = null;
      try {
        sentMsg = await channel.send(payload);
      } catch (sendErr: any) {
        if (sendErr?.code === 50013) {
          return c.json({
            success: false,
            error: `Bot lacks 'Send Messages' or 'Embed Links' permission in #${channel.name}.`,
            message: `Bot lacks 'Send Messages' or 'Embed Links' permission in #${channel.name}.`,
          }, 403);
        }
        if (sendErr?.code === 50001) {
          return c.json({
            success: false,
            error: `Bot lacks 'View Channel' access to #${channel.name}.`,
            message: `Bot lacks 'View Channel' access to #${channel.name}.`,
          }, 403);
        }
        throw sendErr;
      }

      if (autoDeleteSeconds > 0 && sentMsg?.delete) {
        setTimeout(() => {
          sentMsg.delete().catch(() => null);
        }, autoDeleteSeconds * 1000);
      }

      return c.json({
        success: true,
        message: `Test goodbye message sent to #${channel.name}${autoDeleteSeconds > 0 ? ` (auto-deletes in ${autoDeleteSeconds}s)` : ""}`,
      });
    }

    if (type === "dm") {
      if (!user?.id) {
        return c.json({
          success: false,
          error: "Could not identify current admin user session.",
          message: "Could not identify current admin user session."
        }, 400);
      }

      const discordUser = await (botGuild.client || client)?.users?.fetch(user.id).catch(() => null);
      if (!discordUser) {
        return c.json({
          success: false,
          error: "Could not fetch your Discord user account.",
          message: "Could not fetch your Discord user account."
        }, 404);
      }

      const dmPayload: any = buildWelcomePayload(config, targetMember, "dm");
      if (dmPayload && typeof dmPayload === "object") {
        dmPayload.allowedMentions = { parse: ["users"] };
      }

      let sentDm = null;
      try {
        sentDm = await discordUser.send(dmPayload);
      } catch (dmErr: any) {
        if (dmErr?.code === 50007) {
          return c.json({
            success: false,
            error: "Cannot send direct message to your Discord account. Please enable 'Direct Messages' from server members in your Discord Privacy Settings.",
            message: "Cannot send direct message to your Discord account. Please enable 'Direct Messages' from server members in your Discord Privacy Settings.",
          }, 403);
        }
        throw dmErr;
      }

      if (autoDeleteSeconds > 0 && sentDm?.delete) {
        setTimeout(() => {
          sentDm.delete().catch(() => null);
        }, autoDeleteSeconds * 1000);
      }

      return c.json({
        success: true,
        message: `Test onboarding DM delivered to your direct messages!${autoDeleteSeconds > 0 ? ` (auto-deletes in ${autoDeleteSeconds}s)` : ""}`,
      });
    }

    return c.json({
      success: false,
      error: "Invalid test type specified.",
      message: "Invalid test type specified."
    }, 400);
  } catch (err: any) {
    console.error("[WELCOME TEST DISPATCH ERROR]:", err);
    return c.json({
      success: false,
      error: err.message || "Discord API error",
      message: `Failed to dispatch test message: ${err.message || "Discord API error"}`,
    }, 500);
  }
});
