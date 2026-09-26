import { Hono } from "hono";
import { PermissionFlagsBits } from "discord.js";
import { PERMISSION_RISKS, analyzeMemberPermissions } from "../../utils/permissionsData.js";

export const permissionsRoutes = new Hono();

/**
 * Server-wide permissions audit
 */
permissionsRoutes.get("/guilds/:guildId/permissions/audit", async (c) => {
  const guild = c.get("botGuild");
  if (!guild) {
    return c.json({ error: "Guild not found" }, 404);
  }

  // Ensure members are cached
  try {
    await guild.members.fetch();
  } catch (e) {}

  const auditResult = {
    roles: [],
    members: []
  };

  const memberCache = new Map();

  // Audit Roles
  for (const role of guild.roles.cache.values()) {
    const dangerous = [];
    for (const key of Object.keys(PERMISSION_RISKS)) {
      const permData = PERMISSION_RISKS[key];
      if (role.permissions.has(permData.flag)) {
        dangerous.push({ name: permData.name, level: permData.level });
      }
    }

    if (dangerous.length > 0) {
      auditResult.roles.push({
        id: role.id,
        name: role.name,
        hexColor: role.hexColor,
        position: role.position,
        permissions: dangerous,
        memberCount: role.members.size,
      });

      // Keep track of members who have this role
      for (const member of role.members.values()) {
        if (member.user.bot) continue;
        memberCache.set(member.id, member);
      }
    }
  }

  // Add Owner if not already included
  const owner = await guild.members.fetch(guild.ownerId).catch(() => null);
  if (owner) {
    memberCache.set(owner.id, owner);
  }

  // Audit Members
  for (const member of memberCache.values()) {
    const data = analyzeMemberPermissions(member);
    if (data.length > 0) {
      auditResult.members.push({
        id: member.id,
        username: member.user.username,
        avatar: member.user.displayAvatarURL(),
        bot: member.user.bot,
        permissions: data,
        isOwner: member.id === guild.ownerId,
        redCount: data.filter(d => d.level === "red").length,
        yellowCount: data.filter(d => d.level === "yellow").length,
      });
    }
  }

  // Sort
  auditResult.roles.sort((a, b) => b.position - a.position);
  auditResult.members.sort((a, b) => {
    if (a.redCount !== b.redCount) return b.redCount - a.redCount;
    return b.yellowCount - a.yellowCount;
  });

  return c.json(auditResult);
});

/**
 * Audit individual member permissions
 */
permissionsRoutes.get("/guilds/:guildId/permissions/member/:userId", async (c) => {
  const guild = c.get("botGuild");
  const userId = c.req.param("userId");
  
  if (!guild) {
    return c.json({ error: "Guild not found" }, 404);
  }

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) {
    return c.json({ error: "Member not found" }, 404);
  }

  const data = analyzeMemberPermissions(member);
  
  return c.json({
    user: {
      id: member.id,
      username: member.user.username,
      avatar: member.user.displayAvatarURL(),
      bot: member.user.bot,
      roles: member.roles.cache.map(r => ({ id: r.id, name: r.name, hexColor: r.hexColor })).filter(r => r.name !== "@everyone")
    },
    permissions: data
  });
});
