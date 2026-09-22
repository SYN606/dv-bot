import { Hono } from "hono";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import {
  getMediaOnlyChannel,
  getMediaOnlyChannels,
  setMediaOnlyChannel,
  removeMediaOnlyChannel,
} from "../../db/helpers/mediaOnly.js";
import {
  getAdminRoles,
  addAdminRole,
  removeAdminRole,
  getAdminUsers,
  addAdminUser,
  removeAdminUser,
} from "../../db/helpers/adminRoles.js";
import {
  getTempbanConfig,
  setTempbanConfig,
  removeTempbanConfig,
} from "../../db/helpers/tempban.js";
import { ModerationLogConfig, VCRoleConfig } from "../../db/models/index.js";
import { apiCache } from "./cache.js";

export const moderationRoutes = new Hono();

// 1. Media-Only Channels Setup
moderationRoutes.get("/guilds/:guildId/media_only", async (c) => {
  const guildId = c.req.param("guildId");
  const cacheKey = `guild:${guildId}:media_only`;
  const cached = apiCache.get(cacheKey);
  if (cached) {
    return c.json(cached);
  }

  const channels = await getMediaOnlyChannels(guildId);
  apiCache.set(cacheKey, channels, 30000);
  return c.json(channels);
});

moderationRoutes.post("/guilds/:guildId/media_only", async (c) => {
  const guildId = c.req.param("guildId");
  const body = await c.req.json().catch(() => ({}));
  const channel_id = body.channel_id || body.channelId;
  const image_only = body.image_only !== undefined ? !!body.image_only : !!body.imageOnly;
  const auto_mute = body.auto_mute !== undefined ? !!body.auto_mute : !!body.autoMute;
  const nsfw_bypass = body.nsfw_bypass !== undefined ? !!body.nsfw_bypass : (body.allowNsfw !== undefined ? !!body.allowNsfw : true);
  const whitelist_role_id = body.whitelist_role_id || body.whitelistRoleId || null;
  const post_sticky = body.post_sticky_notice !== undefined ? !!body.post_sticky_notice : !!body.postStickyNotice;

  if (!channel_id) return c.json({ error: "channel_id is required" }, 400);

  let sticky_message_id = null;

  if (post_sticky) {
    const botGuild = c.get("botGuild");
    const client = c.get("discordClient");
    let targetChannel = botGuild?.channels?.cache?.get(String(channel_id));
    if (!targetChannel && botGuild?.channels?.fetch) {
      targetChannel = await botGuild.channels.fetch(String(channel_id)).catch(() => null);
    }
    if (!targetChannel && client?.channels?.cache) {
      targetChannel = client.channels.cache.get(String(channel_id));
    }

    if (targetChannel && targetChannel.send) {
      const embed = makeEmbed({
        title: "Media-Only Channel",
        description: image_only
          ? `${EMOJIS.get("announcement") || "📢"} This channel is configured for **images only**.\n\n• Text messages without media attachments will be removed automatically.`
          : `${EMOJIS.get("announcement") || "📢"} This channel is configured for **media only**.\n\n• Images, videos, GIFs, and media links are allowed.\n• Non-media messages will be removed automatically.`,
        level: "SYSTEM",
        footer: "MEDIA_ONLY_STICKY_NOTICE",
      });

      const msg = await targetChannel.send({ embeds: [embed] }).catch(() => null);
      if (msg) {
        sticky_message_id = String(msg.id);
      }
    }
  }

  const record = await setMediaOnlyChannel(guildId, channel_id, {
    image_only,
    auto_mute,
    nsfw_bypass,
    whitelist_role_id,
    ...(sticky_message_id ? { sticky_message_id } : {}),
  });

  apiCache.delete(`guild:${guildId}:media_only`);
  return c.json({ success: true, record });
});

moderationRoutes.delete("/guilds/:guildId/media_only/:channelId", async (c) => {
  const guildId = c.req.param("guildId");
  const channelId = c.req.param("channelId");

  const existing = await getMediaOnlyChannel(guildId, channelId);
  if (existing?.sticky_message_id) {
    const botGuild = c.get("botGuild");
    const client = c.get("discordClient");
    let targetChannel = botGuild?.channels?.cache?.get(String(channelId));
    if (!targetChannel && botGuild?.channels?.fetch) {
      targetChannel = await botGuild.channels.fetch(String(channelId)).catch(() => null);
    }
    if (!targetChannel && client?.channels?.cache) {
      targetChannel = client.channels.cache.get(String(channelId));
    }
    if (targetChannel?.messages?.fetch) {
      const msg = await targetChannel.messages.fetch(String(existing.sticky_message_id)).catch(() => null);
      if (msg && msg.delete) {
        await msg.delete().catch(() => {});
      }
    }
  }

  const deleted = await removeMediaOnlyChannel(guildId, channelId);

  apiCache.delete(`guild:${guildId}:media_only`);
  return c.json({ success: deleted });
});

// 2. Staff Admin Roles & Admin Users Management
moderationRoutes.get("/guilds/:guildId/admin_roles", async (c) => {
  const guildId = c.req.param("guildId");
  const cacheKey = `guild:${guildId}:admin_roles`;
  const cached = apiCache.get(cacheKey);
  if (cached) {
    return c.json(cached);
  }

  const botGuild = c.get("botGuild");
  const [roleIds, userIds] = await Promise.all([
    getAdminRoles(guildId),
    getAdminUsers(guildId),
  ]);

  const roles = roleIds.map((rId) => {
    const r = botGuild?.roles.cache.get(rId);
    return {
      id: rId,
      name: r?.name || `Role ${rId}`,
      color: r?.hexColor || "#99aab5",
    };
  });

  const users = await Promise.all(
    userIds.map(async (uId) => {
      let member = botGuild?.members.cache.get(uId);
      if (!member && botGuild) {
        member = await botGuild.members.fetch(uId).catch(() => null);
      }
      return {
        id: uId,
        username: member?.user?.username || `User ${uId}`,
        avatar: member?.user?.displayAvatarURL ? member.user.displayAvatarURL({ extension: "png", size: 64 }) : null,
        isOwner: botGuild?.ownerId === uId,
      };
    })
  );

  const payload = {
    adminRoles: roles,
    roleIds,
    adminUsers: users,
    userIds,
    ownerId: botGuild?.ownerId || null,
  };

  apiCache.set(cacheKey, payload, 30000);
  return c.json(payload);
});

moderationRoutes.post("/guilds/:guildId/admin_roles", async (c) => {
  const guildId = c.req.param("guildId");
  const body = await c.req.json().catch(() => ({}));
  const role_id = body.role_id || body.roleId;

  if (!role_id) {
    return c.json({ error: "role_id is required" }, 400);
  }

  const created = await addAdminRole(guildId, role_id);
  apiCache.delete(`guild:${guildId}:admin_roles`);
  return c.json({ success: true, created });
});

moderationRoutes.delete("/guilds/:guildId/admin_roles/:roleId", async (c) => {
  const guildId = c.req.param("guildId");
  const roleId = c.req.param("roleId");

  const removed = await removeAdminRole(guildId, roleId);
  apiCache.delete(`guild:${guildId}:admin_roles`);
  return c.json({ success: removed });
});

// Admin Users Endpoints
moderationRoutes.post("/guilds/:guildId/admin_users", async (c) => {
  const guildId = c.req.param("guildId");
  const body = await c.req.json().catch(() => ({}));
  const userId = body.user_id || body.userId;

  if (!userId) {
    return c.json({ error: "userId is required" }, 400);
  }

  const cleanUserId = String(userId).trim().replace(/[<@!>]/g, "");
  if (!/^\d{17,20}$/.test(cleanUserId)) {
    return c.json({ error: "Invalid Discord User ID (must be a 17-20 digit Snowflake)" }, 400);
  }

  const created = await addAdminUser(guildId, cleanUserId);
  apiCache.delete(`guild:${guildId}:admin_roles`);
  return c.json({ success: true, created });
});

moderationRoutes.delete("/guilds/:guildId/admin_users/:userId", async (c) => {
  const guildId = c.req.param("guildId");
  const userId = c.req.param("userId");
  const botGuild = c.get("botGuild");

  if (botGuild?.ownerId === userId) {
    return c.json({ error: "Cannot revoke Server Owner administration privileges" }, 403);
  }

  const removed = await removeAdminUser(guildId, userId);
  apiCache.delete(`guild:${guildId}:admin_roles`);
  return c.json({ success: removed });
});

// 3. Modlog, VC Role, and Tempban Config
moderationRoutes.get("/guilds/:guildId/config", async (c) => {
  const guildId = c.req.param("guildId");
  const cacheKey = `guild:${guildId}:config`;
  const cached = apiCache.get(cacheKey);
  if (cached) {
    return c.json(cached);
  }

  const [modlog, vcrole, tempbanCfg] = await Promise.all([
    ModerationLogConfig.findByPk(guildId),
    VCRoleConfig.findByPk(guildId),
    getTempbanConfig(guildId),
  ]);

  const payload = {
    modlog,
    vcrole,
    tempban: tempbanCfg,
    modLogChannelId: modlog?.channel_id ? String(modlog.channel_id) : "",
    log_channel_id: modlog?.channel_id ? String(modlog.channel_id) : "",
    vcRoleId: vcrole?.role_id ? String(vcrole.role_id) : "",
    vc_role_id: vcrole?.role_id ? String(vcrole.role_id) : "",
    tempbanRoleId: tempbanCfg?.role_id ? String(tempbanCfg.role_id) : "",
    tempban_role_id: tempbanCfg?.role_id ? String(tempbanCfg.role_id) : "",
  };
  apiCache.set(cacheKey, payload, 30000);
  return c.json(payload);
});

moderationRoutes.post("/guilds/:guildId/config", async (c) => {
  const guildId = c.req.param("guildId");
  const body = await c.req.json().catch(() => ({}));
  const logChannelId = body.log_channel_id !== undefined
    ? body.log_channel_id
    : (body.modLogChannelId !== undefined ? body.modLogChannelId : body.logChannelId);
  const vcRoleId = body.vc_role_id !== undefined
    ? body.vc_role_id
    : (body.vcRoleId !== undefined ? body.vcRoleId : body.vc_role);
  const tempbanRoleId = body.tempban_role_id !== undefined
    ? body.tempban_role_id
    : (body.tempbanRoleId !== undefined ? body.tempbanRoleId : body.tempban_role);

  if (logChannelId !== undefined) {
    if (logChannelId) {
      await ModerationLogConfig.upsert({ guild_id: guildId, channel_id: String(logChannelId), enabled: true });
    } else {
      await ModerationLogConfig.destroy({ where: { guild_id: guildId } });
    }
  }

  if (vcRoleId !== undefined) {
    if (vcRoleId) {
      await VCRoleConfig.upsert({ guild_id: guildId, role_id: String(vcRoleId) });
    } else {
      await VCRoleConfig.destroy({ where: { guild_id: guildId } });
    }
  }

  if (tempbanRoleId !== undefined) {
    if (tempbanRoleId) {
      await setTempbanConfig(guildId, String(tempbanRoleId));
    } else {
      await removeTempbanConfig(guildId);
    }
  }

  apiCache.delete(`guild:${guildId}:config`);
  apiCache.delete(`guild:${guildId}:tempban`);
  return c.json({ success: true });
});

// Dedicated Tempban Config Endpoints
moderationRoutes.get("/guilds/:guildId/tempban", async (c) => {
  const guildId = c.req.param("guildId");
  const cacheKey = `guild:${guildId}:tempban`;
  const cached = apiCache.get(cacheKey);
  if (cached) {
    return c.json(cached);
  }

  const tempbanCfg = await getTempbanConfig(guildId);
  const payload = {
    guild_id: guildId,
    role_id: tempbanCfg?.role_id ? String(tempbanCfg.role_id) : null,
    tempbanRoleId: tempbanCfg?.role_id ? String(tempbanCfg.role_id) : "",
    enabled: !!tempbanCfg?.role_id,
  };
  apiCache.set(cacheKey, payload, 30000);
  return c.json(payload);
});

moderationRoutes.post("/guilds/:guildId/tempban", async (c) => {
  const guildId = c.req.param("guildId");
  const body = await c.req.json().catch(() => ({}));
  const roleId = body.role_id !== undefined
    ? body.role_id
    : (body.roleId !== undefined ? body.roleId : body.tempbanRoleId);

  if (roleId) {
    await setTempbanConfig(guildId, String(roleId));
  } else {
    await removeTempbanConfig(guildId);
  }

  apiCache.delete(`guild:${guildId}:config`);
  apiCache.delete(`guild:${guildId}:tempban`);
  return c.json({
    success: true,
    guild_id: guildId,
    role_id: roleId ? String(roleId) : null,
    enabled: !!roleId,
  });
});
