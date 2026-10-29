import { Hono } from "hono";
import { PermissionFlagsBits, AuditLogEvent } from "discord.js";
import { ModerationLogConfig } from "../../db/models/index.js";
import { makeEmbed, COLORS } from "../../core/embeds.js";
import { apiCache } from "./cache.js";

export const auditLogRoutes = new Hono();

// Friendly mapping of AuditLogEvent IDs to Category, Name, Severity, and Icon
const ACTION_DEFINITIONS = {
  // Guild / Server
  [AuditLogEvent.GuildUpdate]: { name: "Server Settings Updated", category: "server", severity: "info" },
  
  // Channels
  [AuditLogEvent.ChannelCreate]: { name: "Channel Created", category: "channels", severity: "success" },
  [AuditLogEvent.ChannelUpdate]: { name: "Channel Updated", category: "channels", severity: "info" },
  [AuditLogEvent.ChannelDelete]: { name: "Channel Deleted", category: "channels", severity: "danger" },
  [AuditLogEvent.ChannelOverwriteCreate]: { name: "Channel Permission Created", category: "channels", severity: "success" },
  [AuditLogEvent.ChannelOverwriteUpdate]: { name: "Channel Permission Updated", category: "channels", severity: "info" },
  [AuditLogEvent.ChannelOverwriteDelete]: { name: "Channel Permission Deleted", category: "channels", severity: "warning" },
  
  // Members & Moderation
  [AuditLogEvent.MemberKick]: { name: "Member Kicked", category: "moderation", severity: "warning" },
  [AuditLogEvent.MemberPrune]: { name: "Members Pruned", category: "moderation", severity: "warning" },
  [AuditLogEvent.MemberBanAdd]: { name: "Member Banned", category: "moderation", severity: "danger" },
  [AuditLogEvent.MemberBanRemove]: { name: "Member Unbanned", category: "moderation", severity: "success" },
  [AuditLogEvent.MemberUpdate]: { name: "Member Updated", category: "members", severity: "info" },
  [AuditLogEvent.MemberRoleUpdate]: { name: "Member Roles Updated", category: "members", severity: "info" },
  [AuditLogEvent.MemberMove]: { name: "Member Moved (Voice)", category: "members", severity: "info" },
  [AuditLogEvent.MemberDisconnect]: { name: "Member Disconnected (Voice)", category: "members", severity: "warning" },
  [AuditLogEvent.BotAdd]: { name: "Bot Added to Server", category: "server", severity: "info" },
  
  // Roles
  [AuditLogEvent.RoleCreate]: { name: "Role Created", category: "roles", severity: "success" },
  [AuditLogEvent.RoleUpdate]: { name: "Role Updated", category: "roles", severity: "info" },
  [AuditLogEvent.RoleDelete]: { name: "Role Deleted", category: "roles", severity: "danger" },
  
  // Invites
  [AuditLogEvent.InviteCreate]: { name: "Invite Created", category: "server", severity: "info" },
  [AuditLogEvent.InviteUpdate]: { name: "Invite Updated", category: "server", severity: "info" },
  [AuditLogEvent.InviteDelete]: { name: "Invite Deleted", category: "server", severity: "warning" },
  
  // Webhooks
  [AuditLogEvent.WebhookCreate]: { name: "Webhook Created", category: "server", severity: "info" },
  [AuditLogEvent.WebhookUpdate]: { name: "Webhook Updated", category: "server", severity: "info" },
  [AuditLogEvent.WebhookDelete]: { name: "Webhook Deleted", category: "server", severity: "danger" },
  
  // Emojis & Stickers
  [AuditLogEvent.EmojiCreate]: { name: "Emoji Created", category: "server", severity: "info" },
  [AuditLogEvent.EmojiUpdate]: { name: "Emoji Updated", category: "server", severity: "info" },
  [AuditLogEvent.EmojiDelete]: { name: "Emoji Deleted", category: "server", severity: "warning" },
  [AuditLogEvent.StickerCreate]: { name: "Sticker Created", category: "server", severity: "info" },
  [AuditLogEvent.StickerUpdate]: { name: "Sticker Updated", category: "server", severity: "info" },
  [AuditLogEvent.StickerDelete]: { name: "Sticker Deleted", category: "server", severity: "warning" },
  
  // Messages
  [AuditLogEvent.MessageDelete]: { name: "Message Deleted", category: "messages", severity: "warning" },
  [AuditLogEvent.MessageBulkDelete]: { name: "Bulk Messages Deleted", category: "messages", severity: "danger" },
  [AuditLogEvent.MessagePin]: { name: "Message Pinned", category: "messages", severity: "info" },
  [AuditLogEvent.MessageUnpin]: { name: "Message Unpinned", category: "messages", severity: "info" },
  
  // AutoMod
  [AuditLogEvent.AutoModerationRuleCreate]: { name: "AutoMod Rule Created", category: "moderation", severity: "info" },
  [AuditLogEvent.AutoModerationRuleUpdate]: { name: "AutoMod Rule Updated", category: "moderation", severity: "info" },
  [AuditLogEvent.AutoModerationRuleDelete]: { name: "AutoMod Rule Deleted", category: "moderation", severity: "warning" },
  [AuditLogEvent.AutoModerationBlockMessage]: { name: "AutoMod Blocked Message", category: "moderation", severity: "danger" },
};

function formatActionInfo(actionId) {
  if (ACTION_DEFINITIONS[actionId]) {
    return ACTION_DEFINITIONS[actionId];
  }
  return {
    name: `Action #${actionId}`,
    category: "other",
    severity: "info",
  };
}

function serializeTarget(target, targetType, targetId) {
  if (!target) {
    return targetId ? { id: String(targetId), name: `ID: ${targetId}`, type: targetType || "Unknown" } : null;
  }
  return {
    id: String(target.id || targetId || ""),
    name: target.name || target.username || target.tag || (target.id ? `ID: ${target.id}` : "Unknown"),
    type: targetType || (target.constructor ? target.constructor.name : "Unknown"),
    avatar: typeof target.displayAvatarURL === "function" ? target.displayAvatarURL({ size: 64 }) : null,
    bot: Boolean(target.bot),
  };
}

function serializeExtra(extra) {
  if (!extra) return null;
  const result = {};
  if (extra.channel) {
    result.channel = {
      id: String(extra.channel.id || ""),
      name: extra.channel.name || String(extra.channel.id || ""),
    };
  }
  if (extra.count !== undefined) {
    result.count = Number(extra.count);
  }
  if (extra.role) {
    result.role = {
      id: String(extra.role.id || ""),
      name: extra.role.name || String(extra.role.id || ""),
      color: extra.role.hexColor || null,
    };
  }
  if (extra.deleteMemberDays !== undefined) {
    result.deleteMemberDays = extra.deleteMemberDays;
  }
  if (extra.membersRemoved !== undefined) {
    result.membersRemoved = extra.membersRemoved;
  }
  return Object.keys(result).length > 0 ? result : null;
}

/**
 * GET /guilds/:guildId/audit-logs
 * Fetch real-time Discord internal audit logs with rich metadata, filtering, and diff tracking.
 */
auditLogRoutes.get("/guilds/:guildId/audit-logs", async (c) => {
  const guild = c.get("botGuild");
  if (!guild) {
    return c.json({ error: "Guild not found on bot instance" }, 404);
  }

  // Verify Bot's permissions
  let botMember = guild.members.me;
  if (!botMember && guild.members?.fetchMe) {
    botMember = await guild.members.fetchMe().catch(() => null);
  }

  const hasAuditPermission = botMember?.permissions?.has(PermissionFlagsBits.ViewAuditLog);
  if (!hasAuditPermission) {
    return c.json({
      missingPermission: true,
      error: "Digital Vigital is missing the 'View Audit Log' permission in this server.",
      entries: [],
      categories: [],
      stats: { total: 0, moderation: 0, members: 0, channels: 0, roles: 0, messages: 0, server: 0 },
    });
  }

  const limitParam = parseInt(c.req.query("limit") || "50", 10);
  const limit = Math.min(Math.max(limitParam, 1), 100);
  const actionParam = c.req.query("action");
  const executorParam = c.req.query("executorId");
  const beforeParam = c.req.query("before");

  let auditOptions = { limit };
  if (actionParam && !isNaN(parseInt(actionParam, 10))) {
    auditOptions.type = parseInt(actionParam, 10);
  }
  if (executorParam) {
    auditOptions.user = executorParam;
  }
  if (beforeParam) {
    auditOptions.before = beforeParam;
  }

  try {
    const rawLogs = await guild.fetchAuditLogs(auditOptions);
    const entries = [];
    const stats = {
      total: 0,
      moderation: 0,
      members: 0,
      channels: 0,
      roles: 0,
      messages: 0,
      server: 0,
      other: 0,
    };

    const uniqueExecutors = new Map();

    for (const entry of rawLogs.entries.values()) {
      const actionInfo = formatActionInfo(entry.action);
      stats.total += 1;
      if (stats[actionInfo.category] !== undefined) {
        stats[actionInfo.category] += 1;
      } else {
        stats.other += 1;
      }

      const executor = entry.executor
        ? {
            id: String(entry.executor.id),
            username: entry.executor.username,
            discriminator: entry.executor.discriminator,
            tag: entry.executor.tag || entry.executor.username,
            avatar: typeof entry.executor.displayAvatarURL === "function" ? entry.executor.displayAvatarURL({ size: 64 }) : null,
            bot: Boolean(entry.executor.bot),
          }
        : null;

      if (executor && !uniqueExecutors.has(executor.id)) {
        uniqueExecutors.set(executor.id, executor);
      }

      const changes = Array.isArray(entry.changes)
        ? entry.changes.map((ch) => ({
            key: ch.key,
            old: ch.old !== undefined ? ch.old : null,
            new: ch.new !== undefined ? ch.new : null,
          }))
        : [];

      entries.push({
        id: String(entry.id),
        action: entry.action,
        actionName: actionInfo.name,
        category: actionInfo.category,
        severity: actionInfo.severity,
        reason: entry.reason || null,
        createdTimestamp: entry.createdTimestamp,
        createdAt: entry.createdAt ? entry.createdAt.toISOString() : new Date(entry.createdTimestamp).toISOString(),
        executor,
        target: serializeTarget(entry.target, entry.targetType, entry.targetId),
        targetType: entry.targetType,
        changes,
        extra: serializeExtra(entry.extra),
      });
    }

    // Available action filters
    const availableActions = Object.entries(ACTION_DEFINITIONS).map(([id, info]) => ({
      id: parseInt(id, 10),
      name: info.name,
      category: info.category,
    }));

    return c.json({
      missingPermission: false,
      entries,
      stats,
      executors: Array.from(uniqueExecutors.values()),
      availableActions,
      lastId: entries.length > 0 ? entries[entries.length - 1].id : null,
    });
  } catch (err) {
    console.error("[AUDIT LOGS FETCH ERROR]:", err);
    return c.json({
      error: err.message || "Failed to fetch Discord audit logs",
      missingPermission: err.code === 50013,
      entries: [],
      stats: { total: 0, moderation: 0, members: 0, channels: 0, roles: 0, messages: 0, server: 0 },
    }, 500);
  }
});

/**
 * GET /guilds/:guildId/audit-logs/config
 * Get moderation log channel configuration.
 */
auditLogRoutes.get("/guilds/:guildId/audit-logs/config", async (c) => {
  const guildId = c.req.param("guildId");
  const modLog = await ModerationLogConfig.findOne({ where: { guild_id: guildId } });
  return c.json({
    modLogChannelId: modLog?.channel_id || "",
    enabled: Boolean(modLog?.enabled),
  });
});

/**
 * POST /guilds/:guildId/audit-logs/config
 * Update moderation log channel configuration.
 */
auditLogRoutes.post("/guilds/:guildId/audit-logs/config", async (c) => {
  const guildId = c.req.param("guildId");
  const body = await c.req.json().catch(() => ({}));
  const channelId = body.channelId || body.modLogChannelId;
  const enabled = body.enabled !== undefined ? Boolean(body.enabled) : Boolean(channelId);

  if (channelId) {
    await ModerationLogConfig.upsert({
      guild_id: guildId,
      channel_id: String(channelId),
      enabled,
    });
  } else {
    await ModerationLogConfig.destroy({ where: { guild_id: guildId } });
  }

  apiCache.delete(`guild:${guildId}:config`);

  return c.json({
    success: true,
    modLogChannelId: channelId || "",
    enabled,
  });
});

/**
 * POST /guilds/:guildId/audit-logs/test
 * Send a verification test embed to the configured moderation log channel.
 */
auditLogRoutes.post("/guilds/:guildId/audit-logs/test", async (c) => {
  const guildId = c.req.param("guildId");
  const guild = c.get("botGuild");
  const user = c.get("user");

  if (!guild) {
    return c.json({ error: "Guild not found" }, 404);
  }

  const modLog = await ModerationLogConfig.findOne({ where: { guild_id: guildId } });
  if (!modLog?.channel_id) {
    return c.json({ error: "No moderation log channel configured" }, 400);
  }

  let channel = guild.channels.cache.get(modLog.channel_id);
  if (!channel && guild.channels?.fetch) {
    channel = await guild.channels.fetch(modLog.channel_id).catch(() => null);
  }

  if (!channel || !channel.send) {
    return c.json({ error: "Configured channel not found or bot cannot access it" }, 400);
  }

  try {
    const testEmbed = makeEmbed({
      title: "🛡️ Digital Vigital — Moderation Log Test",
      description: `This is a test log message dispatched from the web dashboard by <@${user?.id || "Admin"}>.\n\n• **Status:** Active & Operating Normally\n• **Channel:** <#${channel.id}>\n• **Time:** <t:${Math.floor(Date.now() / 1000)}:F>`,
      level: "SUCCESS",
      color: COLORS.DARK,
      footer: "DIGITAL_VIGITAL_AUDIT_SYSTEM",
    });

    await channel.send({ embeds: [testEmbed] });
    return c.json({ success: true, message: `Test dispatch delivered to #${channel.name}!` });
  } catch (err) {
    return c.json({ error: err.message || "Bot lacks Send Messages or Embed Links permission in this channel" }, 500);
  }
});
