import { Hono } from "hono";
import {
  getGuildAcl,
  addRoleRestriction,
  removeRoleRestriction,
  addChannelRestriction,
  removeChannelRestriction,
} from "../../db/helpers/acl.js";
import { apiCache } from "./cache.js";

export const aclRoutes = new Hono();

// Access Control List (ACL) Engine
aclRoutes.get("/guilds/:guildId/acl", async (c) => {
  const guildId = c.req.param("guildId");
  const cacheKey = `guild:${guildId}:acl`;
  const cached = apiCache.get(cacheKey);
  if (cached) {
    return c.json(cached);
  }

  const acl = await getGuildAcl(guildId);
  apiCache.set(cacheKey, acl, 20000);
  return c.json(acl);
});

aclRoutes.post("/guilds/:guildId/acl/roles", async (c) => {
  const guildId = c.req.param("guildId");
  const body = await c.req.json().catch(() => ({}));
  const roleId = body.roleId || body.role_id;
  const feature = (body.feature || "all").trim();
  const restrictionType = (body.restrictionType || body.restriction_type || "deny").trim();
  if (!roleId) return c.json({ error: "roleId is required" }, 400);

  const result = await addRoleRestriction(guildId, roleId, feature, restrictionType);
  apiCache.delete(`guild:${guildId}:acl`);
  return c.json({ success: true, ...result });
});

aclRoutes.delete("/guilds/:guildId/acl/roles/:id", async (c) => {
  const guildId = c.req.param("guildId");
  const id = c.req.param("id");
  const deleted = await removeRoleRestriction(guildId, id);
  apiCache.delete(`guild:${guildId}:acl`);
  return c.json({ success: deleted });
});

aclRoutes.post("/guilds/:guildId/acl/channels", async (c) => {
  const guildId = c.req.param("guildId");
  const body = await c.req.json().catch(() => ({}));
  const channelId = body.channelId || body.channel_id;
  const feature = (body.feature || "all").trim();
  const restrictionType = (body.restrictionType || body.restriction_type || "deny").trim();
  if (!channelId) return c.json({ error: "channelId is required" }, 400);

  const result = await addChannelRestriction(guildId, channelId, feature, restrictionType);
  apiCache.delete(`guild:${guildId}:acl`);
  return c.json({ success: true, ...result });
});

aclRoutes.delete("/guilds/:guildId/acl/channels/:id", async (c) => {
  const guildId = c.req.param("guildId");
  const id = c.req.param("id");
  const deleted = await removeChannelRestriction(guildId, id);
  apiCache.delete(`guild:${guildId}:acl`);
  return c.json({ success: deleted });
});
