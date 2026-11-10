import { Hono } from "hono";
import {
  getAntinukeSettings,
  updateAntinukeSettings,
  getAntinukeTrustees,
  addAntinukeTrustee,
  removeAntinukeTrustee,
  getAntinukeIncidents,
  getAntinukeIncidentById,
  resolveAntinukeIncident,
  invalidateAntinukeCache,
} from "../../db/helpers/antinuke.js";
import { setModuleEnabled, isModuleEnabled } from "../../db/helpers/moduleStatus.js";
import { ANTINUKE_SERVICE } from "../../services/antinukeService.js";
import { TOPOLOGY_MIRROR } from "../../services/topologyMirror.js";
import { logger } from "../../utils/logger.js";
import { apiCache } from "./cache.js";

export const antinukeRoutes = new Hono<any>();

function getClientAndGuild(c: any) {
  const client = c.get("discordClient");
  const guildId = c.req.param("guildId");
  const guild = client?.guilds?.cache?.get(String(guildId)) || null;
  return { client, guildId, guild };
}

/**
 * Access Control Middleware:
 * Strictly restricts Anti-Nuke routes to:
 * 1. Server Owner
 * 2. Superuser from .env (CONFIG.SUPERUSERS)
 * 3. Whitelisted Anti-Nuke Trustees
 * Users with general "Dashboard Access" roles are blocked with 403 Forbidden.
 */
async function requireAntinukeAccess(c: any, next: any) {
  const { guildId, guild } = getClientAndGuild(c);
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const { CONFIG } = await import("../../config.js");
  const isSuperuser = Array.isArray(CONFIG.SUPERUSERS) && CONFIG.SUPERUSERS.includes(user.id);
  const isOwner = guild ? guild.ownerId === user.id : false;

  if (isSuperuser || isOwner) {
    return await next();
  }

  // Check if user is whitelisted for antinuke
  const trustees = await getAntinukeTrustees(guildId);
  let member = guild?.members?.cache?.get(user.id) || null;
  if (!member && guild) {
    member = await guild.members.fetch(user.id).catch(() => null);
  }

  const isWhitelisted = trustees.some((t: any) => {
    if ((t.target_type === "user" || t.target_type === "bot") && t.target_id === user.id) return true;
    if (t.target_type === "role" && member?.roles?.cache?.has(t.target_id)) return true;
    return false;
  });

  if (!isWhitelisted) {
    return c.json(
      {
        error: "Access denied. Anti-Nuke configuration is restricted to the Server Owner, bot superusers, and whitelisted Anti-Nuke managers.",
        code: "ANTINUKE_ACCESS_RESTRICTED",
      },
      403
    );
  }

  return await next();
}

antinukeRoutes.use("/guilds/:guildId/antinuke", requireAntinukeAccess);
antinukeRoutes.use("/guilds/:guildId/antinuke/*", requireAntinukeAccess);

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET /guilds/:guildId/antinuke
// ─────────────────────────────────────────────────────────────────────────────
antinukeRoutes.get("/guilds/:guildId/antinuke", async (c) => {
  const { guildId, guild } = getClientAndGuild(c);

  try {
    const [settings, trustees, incidents, isEnabled] = await Promise.all([
      getAntinukeSettings(guildId),
      getAntinukeTrustees(guildId),
      getAntinukeIncidents(guildId, 30),
      isModuleEnabled(guildId, "antinuke"),
    ]);

    settings.enabled = isEnabled;

    // Format Guild Roles for Dropdowns & Selectors
    const roles = guild
      ? guild.roles.cache
          .filter((r: any) => !r.managed && r.id !== guild.id)
          .map((r: any) => ({
            id: r.id,
            name: r.name,
            color: r.hexColor && r.hexColor !== "#000000" ? r.hexColor : "#94a3b8",
            position: r.position,
          }))
          .sort((a: any, b: any) => b.position - a.position)
      : [];

    // Format Guild Channels for Dropdowns
    const channels = guild
      ? guild.channels.cache
          .filter((ch: any) => ch.isTextBased?.() || ch.type === 0 || ch.type === 5)
          .map((ch: any) => ({
            id: ch.id,
            name: ch.name,
            type: ch.type,
            parentId: ch.parentId || null,
          }))
          .sort((a: any, b: any) => a.name.localeCompare(b.name))
      : [];

    // Format Highly Privileged Members (Admins / Moderators)
    const members = guild
      ? guild.members.cache
          .filter((m: any) => !m.user.bot)
          .map((m: any) => ({
            id: m.id,
            tag: m.user.tag,
            displayName: m.displayName || m.user.username,
            avatar: m.user.displayAvatarURL?.({ size: 64 }) || "https://cdn.discordapp.com/embed/avatars/0.png",
          }))
          .slice(0, 100)
      : [];

    // Format Guild Bots for Whitelisting (Join-to-Create, Temp Voice, Utilities)
    const bots = guild
      ? guild.members.cache
          .filter((m: any) => m.user?.bot && m.id !== guild.client?.user?.id)
          .map((m: any) => ({
            id: m.id,
            name: m.user.username,
            tag: m.user.tag || m.user.username,
            avatar: typeof m.user.displayAvatarURL === "function" ? m.user.displayAvatarURL({ size: 64 }) : "https://cdn.discordapp.com/embed/avatars/0.png",
          }))
          .sort((a: any, b: any) => a.name.localeCompare(b.name))
      : [];

    // In-memory Topology Mirror Status
    let topo = TOPOLOGY_MIRROR.getTopology(guildId);
    if (!topo && guild) {
      topo = TOPOLOGY_MIRROR.syncGuild(guild);
    }
    const topologyStats = {
      channelsCount: topo?.channels?.size ?? guild?.channels?.cache?.size ?? 0,
      rolesCount: topo?.roles?.size ?? guild?.roles?.cache?.size ?? 0,
      lastSynced: topo?.lastSynced ?? Date.now(),
      inMemoryActive: Boolean(topo),
    };

    return c.json({
      success: true,
      settings,
      trustees,
      incidents,
      roles,
      channels,
      members,
      bots,
      topologyStats,
      lockdownActive: Boolean(settings.emergency_lockdown_active),
      userCanManageAntinuke: true,
    });
  } catch (err: any) {
    logger.error(`[ANTI-NUKE API] Error fetching settings for guild ${guildId}:`, err);
    return c.json({ error: "Failed to retrieve Anti-Nuke state", details: err.message }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. PATCH /guilds/:guildId/antinuke/settings
// ─────────────────────────────────────────────────────────────────────────────
antinukeRoutes.patch("/guilds/:guildId/antinuke/settings", async (c) => {
  const { guildId } = getClientAndGuild(c);

  try {
    const body = await c.req.json();
    const allowedKeys = [
      "enabled",
      "punishment_type",
      "channel_delete_threshold",
      "channel_create_threshold",
      "role_delete_threshold",
      "role_create_threshold",
      "member_ban_threshold",
      "member_kick_threshold",
      "webhook_create_threshold",
      "window_seconds",
      "strict_anti_bot",
      "strict_dangerous_perms",
      "strict_vanity_protect",
      "auto_recreate_assets",
      "quarantine_role_id",
      "log_channel_id",
    ];

    const updates: Record<string, any> = {};
    for (const key of allowedKeys) {
      if (body[key] !== undefined) {
        if (typeof body[key] === "boolean") {
          updates[key] = body[key] ? 1 : 0;
        } else if (
          typeof body[key] === "number" ||
          (typeof body[key] === "string" && !isNaN(Number(body[key])) && key.includes("threshold"))
        ) {
          updates[key] = Math.max(1, Math.min(120, Number(body[key])));
        } else {
          updates[key] = body[key];
        }
      }
    }

    const updated = await updateAntinukeSettings(guildId, updates);
    if (updates.enabled !== undefined) {
      await setModuleEnabled(guildId, "antinuke", updates.enabled === 1);
    }
    invalidateAntinukeCache(guildId);
    apiCache.delete(`/api/guilds/${guildId}/antinuke`);

    return c.json({ success: true, settings: updated });
  } catch (err: any) {
    logger.error(`[ANTI-NUKE API] Error updating settings for guild ${guildId}:`, err);
    return c.json({ error: "Failed to update Anti-Nuke settings", details: err.message }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. POST /guilds/:guildId/antinuke/trustees
// ─────────────────────────────────────────────────────────────────────────────
antinukeRoutes.post("/guilds/:guildId/antinuke/trustees", async (c) => {
  const { guildId } = getClientAndGuild(c);

  try {
    const body = await c.req.json();
    if (!body.target_id || !body.target_type) {
      return c.json({ error: "target_id and target_type ('user' | 'role' | 'bot') are required." }, 400);
    }

    await addAntinukeTrustee({
      guild_id: guildId,
      target_id: String(body.target_id),
      target_type: body.target_type === "role" ? "role" : body.target_type === "bot" ? "bot" : "user",
      trust_tier: Math.max(1, Math.min(3, Number(body.trust_tier) || 2)),
      bypass_channels: Boolean(body.bypass_channels),
      bypass_roles: Boolean(body.bypass_roles),
      bypass_members: Boolean(body.bypass_members),
      bypass_bots: Boolean(body.bypass_bots),
      bypass_webhooks: Boolean(body.bypass_webhooks),
    });

    invalidateAntinukeCache(guildId);
    apiCache.delete(`/api/guilds/${guildId}/antinuke`);

    const trustees = await getAntinukeTrustees(guildId);
    return c.json({ success: true, trustees });
  } catch (err: any) {
    logger.error(`[ANTI-NUKE API] Error adding trustee for guild ${guildId}:`, err);
    return c.json({ error: "Failed to add trustee", details: err.message }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. DELETE /guilds/:guildId/antinuke/trustees/:trusteeId
// ─────────────────────────────────────────────────────────────────────────────
antinukeRoutes.delete("/guilds/:guildId/antinuke/trustees/:trusteeId", async (c) => {
  const { guildId } = getClientAndGuild(c);
  const trusteeId = c.req.param("trusteeId");

  try {
    await removeAntinukeTrustee(guildId, trusteeId);
    invalidateAntinukeCache(guildId);
    apiCache.delete(`/api/guilds/${guildId}/antinuke`);

    const trustees = await getAntinukeTrustees(guildId);
    return c.json({ success: true, trustees });
  } catch (err: any) {
    logger.error(`[ANTI-NUKE API] Error removing trustee for guild ${guildId}:`, err);
    return c.json({ error: "Failed to remove trustee", details: err.message }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. POST /guilds/:guildId/antinuke/lockdown
// ─────────────────────────────────────────────────────────────────────────────
antinukeRoutes.post("/guilds/:guildId/antinuke/lockdown", async (c) => {
  const { guildId, guild } = getClientAndGuild(c);

  if (!guild) {
    return c.json({ error: "Discord guild not found or unavailable." }, 404);
  }

  try {
    const body = await c.req.json();
    const action = body.action === "lift" ? "lift" : "engage";
    const reason = body.reason || "Triggered via Web Dashboard Panic Lockdown Control";

    let success = false;
    if (action === "engage") {
      success = await ANTINUKE_SERVICE.engageEmergencyLockdown(guild, reason);
    } else {
      success = await ANTINUKE_SERVICE.liftEmergencyLockdown(guild, reason);
    }

    invalidateAntinukeCache(guildId);
    apiCache.delete(`/api/guilds/${guildId}/antinuke`);

    const settings = await getAntinukeSettings(guildId);
    return c.json({
      success,
      lockdownActive: Boolean(settings.emergency_lockdown_active),
      action,
    });
  } catch (err: any) {
    logger.error(`[ANTI-NUKE API] Error altering lockdown for guild ${guildId}:`, err);
    return c.json({ error: "Failed to update lockdown state", details: err.message }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. POST /guilds/:guildId/antinuke/incidents/:incidentId/rollback
// ─────────────────────────────────────────────────────────────────────────────
antinukeRoutes.post("/guilds/:guildId/antinuke/incidents/:incidentId/rollback", async (c) => {
  const { guildId, guild } = getClientAndGuild(c);
  const incidentId = c.req.param("incidentId");

  if (!guild) {
    return c.json({ error: "Discord guild not found or bot lacks permissions." }, 404);
  }

  try {
    const incident = await getAntinukeIncidentById(guildId, incidentId);
    if (!incident) {
      return c.json({ error: "Incident record not found." }, 404);
    }

    let restoredCount = 0;
    if (incident.snapshot_data) {
      try {
        const snapshot = typeof incident.snapshot_data === "string" ? JSON.parse(incident.snapshot_data) : incident.snapshot_data;

        // Restore Channel Snapshot if present
        if (snapshot.type !== undefined && snapshot.permissionOverwrites !== undefined) {
          const restored = await TOPOLOGY_MIRROR.restoreChannel(guild, snapshot);
          if (restored) restoredCount++;
        }
        // Restore Role Snapshot if present
        else if (snapshot.permissions !== undefined && snapshot.color !== undefined) {
          const restored = await TOPOLOGY_MIRROR.restoreRole(guild, snapshot);
          if (restored) restoredCount++;
        }
      } catch (parseErr: any) {
        logger.warn(`[ANTI-NUKE API] Error parsing snapshot for incident ${incidentId}:`, parseErr.message);
      }
    }

    await resolveAntinukeIncident(guildId, incidentId);
    apiCache.delete(`/api/guilds/${guildId}/antinuke`);

    const incidents = await getAntinukeIncidents(guildId, 30);
    return c.json({
      success: true,
      restoredCount,
      incidents,
    });
  } catch (err: any) {
    logger.error(`[ANTI-NUKE API] Error executing rollback for incident ${incidentId}:`, err);
    return c.json({ error: "Failed to rollback incident", details: err.message }, 500);
  }
});
