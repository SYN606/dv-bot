import { Hono } from "hono";
import { PermissionFlagsBits } from "discord.js";

export const permissionsRoutes = new Hono();

const DANGEROUS_PERMISSIONS = [
  { name: "Administrator", flag: PermissionFlagsBits.Administrator },
  { name: "Manage Server", flag: PermissionFlagsBits.ManageGuild },
  { name: "Manage Roles", flag: PermissionFlagsBits.ManageRoles },
  { name: "Manage Channels", flag: PermissionFlagsBits.ManageChannels },
  { name: "Manage Webhooks", flag: PermissionFlagsBits.ManageWebhooks },
  { name: "Ban Members", flag: PermissionFlagsBits.BanMembers },
  { name: "Kick Members", flag: PermissionFlagsBits.KickMembers },
  { name: "Mention Everyone", flag: PermissionFlagsBits.MentionEveryone },
  { name: "Manage Messages", flag: PermissionFlagsBits.ManageMessages },
];

/**
 * Audit server permissions (returns members and roles with dangerous perms)
 */
permissionsRoutes.get("/guilds/:guildId/permissions/audit", async (c) => {
  const guild = c.get("botGuild");
  if (!guild) {
    return c.json({ error: "Guild not found" }, 404);
  }

  // Ensure members are cached
  try {
    await guild.members.fetch();
  } catch (e) {
    // Fallback to cache if fetch fails
  }

  const auditResult = {
    roles: [],
    members: [],
  };

  // 1. Audit Roles
  for (const role of guild.roles.cache.values()) {
    const dangerous = [];
    for (const perm of DANGEROUS_PERMISSIONS) {
      if (role.permissions.has(perm.flag)) {
        dangerous.push(perm.name);
      }
    }
    
    if (dangerous.length > 0) {
      auditResult.roles.push({
        id: role.id,
        name: role.name,
        color: role.hexColor,
        isManaged: role.managed,
        position: role.position,
        permissions: dangerous,
      });
    }
  }

  // 2. Audit Members
  for (const member of guild.members.cache.values()) {
    if (member.user.bot) continue; // Usually bots have high perms, filter them out to keep it clean (or we could include them)
    
    const dangerous = [];
    for (const perm of DANGEROUS_PERMISSIONS) {
      if (member.permissions.has(perm.flag)) {
        dangerous.push(perm.name);
      }
    }

    if (dangerous.length > 0) {
      auditResult.members.push({
        id: member.id,
        username: member.user.username,
        avatar: member.user.displayAvatarURL(),
        bot: member.user.bot,
        permissions: dangerous,
      });
    }
  }

  // Sort
  auditResult.roles.sort((a, b) => b.position - a.position);
  auditResult.members.sort((a, b) => b.permissions.length - a.permissions.length);

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

  const permissions = {
    dangerous: [],
    all: []
  };

  const allKeys = Object.keys(PermissionFlagsBits);
  for (const key of allKeys) {
    if (member.permissions.has(PermissionFlagsBits[key])) {
      permissions.all.push(key);
    }
  }

  for (const perm of DANGEROUS_PERMISSIONS) {
    if (member.permissions.has(perm.flag)) {
      permissions.dangerous.push(perm.name);
    }
  }

  return c.json({
    user: {
      id: member.id,
      username: member.user.username,
      avatar: member.user.displayAvatarURL(),
      bot: member.user.bot,
      roles: member.roles.cache.map(r => ({ id: r.id, name: r.name, hexColor: r.hexColor })).filter(r => r.name !== "@everyone")
    },
    permissions
  });
});
