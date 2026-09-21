import { Hono } from "hono";
import {
  getMediaOnlyChannels,
  setMediaOnlyChannel,
  removeMediaOnlyChannel,
} from "../../db/helpers/mediaOnly.js";
import {
  getAdminRoles,
  addAdminRole,
  removeAdminRole,
} from "../../db/helpers/adminRoles.js";
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
  const body = await c.req.json();
  const { channel_id, image_only, auto_mute, nsfw_bypass } = body;

  if (!channel_id) return c.json({ error: "channel_id is required" }, 400);

  const record = await setMediaOnlyChannel(guildId, channel_id, {
    image_only: !!image_only,
    auto_mute: !!auto_mute,
    nsfw_bypass: nsfw_bypass ?? true,
  });

  apiCache.delete(`guild:${guildId}:media_only`);
  return c.json({ success: true, record });
});

moderationRoutes.delete("/guilds/:guildId/media_only/:channelId", async (c) => {
  const guildId = c.req.param("guildId");
  const channelId = c.req.param("channelId");
  const deleted = await removeMediaOnlyChannel(guildId, channelId);

  apiCache.delete(`guild:${guildId}:media_only`);
  return c.json({ success: deleted });
});

// 2. Staff Admin Roles Management
moderationRoutes.get("/guilds/:guildId/admin_roles", async (c) => {
  const guildId = c.req.param("guildId");
  const cacheKey = `guild:${guildId}:admin_roles`;
  const cached = apiCache.get(cacheKey);
  if (cached) {
    return c.json(cached);
  }

  const botGuild = c.get("botGuild");
  const roleIds = await getAdminRoles(guildId);

  const roles = roleIds.map((rId) => {
    const r = botGuild?.roles.cache.get(rId);
    return {
      id: rId,
      name: r?.name || `Role ${rId}`,
      color: r?.hexColor || "#99aab5",
    };
  });

  const payload = { adminRoles: roles };
  apiCache.set(cacheKey, payload, 30000);
  return c.json(payload);
});

moderationRoutes.post("/guilds/:guildId/admin_roles", async (c) => {
  const guildId = c.req.param("guildId");
  const { role_id } = await c.req.json();

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

// 3. Modlog & VC Role Config
moderationRoutes.get("/guilds/:guildId/config", async (c) => {
  const guildId = c.req.param("guildId");
  const cacheKey = `guild:${guildId}:config`;
  const cached = apiCache.get(cacheKey);
  if (cached) {
    return c.json(cached);
  }

  const [modlog, vcrole] = await Promise.all([
    ModerationLogConfig.findByPk(guildId),
    VCRoleConfig.findByPk(guildId),
  ]);

  const payload = { modlog, vcrole };
  apiCache.set(cacheKey, payload, 30000);
  return c.json(payload);
});

moderationRoutes.post("/guilds/:guildId/config", async (c) => {
  const guildId = c.req.param("guildId");
  const { log_channel_id, vc_role_id } = await c.req.json();

  if (log_channel_id !== undefined) {
    if (log_channel_id) {
      await ModerationLogConfig.upsert({ guild_id: guildId, channel_id: log_channel_id, enabled: true });
    } else {
      await ModerationLogConfig.destroy({ where: { guild_id: guildId } });
    }
  }

  if (vc_role_id !== undefined) {
    if (vc_role_id) {
      await VCRoleConfig.upsert({ guild_id: guildId, role_id: vc_role_id });
    } else {
      await VCRoleConfig.destroy({ where: { guild_id: guildId } });
    }
  }

  apiCache.delete(`guild:${guildId}:config`);
  return c.json({ success: true });
});
