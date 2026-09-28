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
    }
  }

  // Audit Members directly
  for (const member of guild.members.cache.values()) {
    const data = analyzeMemberPermissions(member);
    if (data.length > 0) {
      const redCount = data.filter(d => d.level === "red").length;
      const yellowCount = data.filter(d => d.level === "yellow").length;
      const greenCount = data.filter(d => d.level === "green").length;
      
      const threatScore = (redCount * 10) + (yellowCount * 5) + (greenCount * 1);
      
      let threatLevel = "Low";
      if (threatScore >= 20 || redCount > 0) threatLevel = "Critical";
      else if (threatScore >= 10 || yellowCount >= 2) threatLevel = "High";
      else if (threatScore >= 5 || yellowCount > 0) threatLevel = "Moderate";

      auditResult.members.push({
        id: member.id,
        username: member.user.username,
        avatar: member.user.displayAvatarURL(),
        bot: member.user.bot,
        permissions: data,
        isOwner: member.id === guild.ownerId,
        redCount,
        yellowCount,
        threatScore,
        threatLevel
      });
    }
  }

  // Sort
  auditResult.roles.sort((a, b) => b.position - a.position);
  auditResult.members.sort((a, b) => b.threatScore - a.threatScore);

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

  // Force fetch to bypass cache anomalies
  const member = await guild.members.fetch({ user: userId, force: true }).catch(err => {
    console.error(`[AUDIT] Failed to fetch member ${userId}:`, err.message);
    return null;
  });

  if (!member) {
    return c.json({ error: "Member not found in this server" }, 404);
  }

  const data = analyzeMemberPermissions(member);
  
  const redCount = data.filter(d => d.level === "red").length;
  const yellowCount = data.filter(d => d.level === "yellow").length;
  const greenCount = data.filter(d => d.level === "green").length;
  
  const threatScore = (redCount * 10) + (yellowCount * 5) + (greenCount * 1);
  
  let threatLevel = "Low";
  if (threatScore >= 20 || redCount > 0) threatLevel = "Critical";
  else if (threatScore >= 10 || yellowCount >= 2) threatLevel = "High";
  else if (threatScore >= 5 || yellowCount > 0) threatLevel = "Moderate";

  const userPayload = {
    id: member.id || userId,
    username: member.user?.username || member.displayName || "Unknown User",
    avatar: member.user?.displayAvatarURL() || "https://cdn.discordapp.com/embed/avatars/0.png",
    bot: !!member.user?.bot,
    roles: member.roles.cache.map(r => ({ id: r.id, name: r.name, hexColor: r.hexColor })).filter(r => r.name !== "@everyone")
  };

  // Fetch punishment history
  const { PunishmentRecord, WarningRecord, TempbanRecord } = await import("../../db/models/index.js");
  const [punishments, warnings, tempbans] = await Promise.all([
    PunishmentRecord.findAll({ where: { guild_id: String(guild.id), user_id: String(userId) } }),
    WarningRecord.findAll({ where: { guild_id: String(guild.id), user_id: String(userId) } }),
    TempbanRecord.findAll({ where: { guild_id: String(guild.id), user_id: String(userId) } }),
  ]);

  const history = [
    ...punishments.map(p => ({
      type: p.action_type.toUpperCase(),
      reason: p.reason,
      moderator_id: p.moderator_id,
      date: p.created_at,
    })),
    ...warnings.map(w => ({
      type: 'WARNING',
      reason: w.reason,
      moderator_id: w.moderator_id,
      date: w.created_at,
    })),
    ...tempbans.map(t => ({
      type: 'TEMPBAN',
      reason: t.tempban_reason || "No reason provided",
      moderator_id: t.moderator_id,
      date: t.created_at,
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return c.json({
    user: userPayload,
    permissions: data,
    threatScore,
    threatLevel,
    history
  });
});
