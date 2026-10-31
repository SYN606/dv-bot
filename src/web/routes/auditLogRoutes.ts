import { Hono } from "hono";
import { PermissionFlagsBits, AuditLogEvent } from "discord.js";
import { ModerationLogConfig, VCRoleConfig } from "../../db/models/index.js";
import { makeEmbed, COLORS } from "../../core/embeds.js";
import { apiCache } from "./cache.js";
import { invalidateLogConfigCache } from "../../utils/modLog.js";

export const auditLogRoutes = new Hono();

// In-flight Promise deduplication map to prevent concurrent spikes to Discord API
const inFlightAuditRequests = new Map();

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
 * Fetch real-time Discord internal audit logs with 429 rate limit shielding and deduplication.
 */
auditLogRoutes.get("/guilds/:guildId/audit-logs", async (c) => {
  const guild = c.get("botGuild");
  if (!guild) {
    return c.json({ error: "Guild not found on bot instance" }, 404);
  }

  // 1. Verify Bot's permissions
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
  const actionParam = c.req.query("action") || "";
  const executorParam = c.req.query("executorId") || "";
  const beforeParam = c.req.query("before") || "";

  // 2. Check In-Memory Rate-Limit Shield Cache (15s TTL)
  const cacheKey = `guild:${guild.id}:audit_logs:${limit}:${actionParam}:${executorParam}:${beforeParam}`;
  const cachedResponse = apiCache.get(cacheKey);
  if (cachedResponse) {
    return c.json({ ...cachedResponse, cached: true });
  }

  // Fallback cache key for 429 recovery
  const fallbackKey = `guild:${guild.id}:audit_logs:latest_snapshot`;

  // 3. Deduplicate in-flight requests (concurrent calls share the exact same promise)
  let requestPromise = inFlightAuditRequests.get(cacheKey);

  if (!requestPromise) {
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

    requestPromise = (async () => {
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

        const uniqueExecutors = new Map<string, any>();
        const vcConfig: any = await VCRoleConfig.findByPk(guild.id).catch(() => null);
        const vcRoleId = vcConfig?.role_id ? String(vcConfig.role_id) : null;
        const botUserId = guild.client?.user?.id;

        for (const entry of rawLogs.entries.values()) {
          // Suppress automated bot VC auto-role assignments from flooding audit logs
          if (
            entry.action === AuditLogEvent.MemberRoleUpdate &&
            botUserId &&
            entry.executor?.id === botUserId &&
            vcRoleId
          ) {
            const rawChanges = Array.isArray(entry.changes) ? entry.changes : [];
            const isOnlyVcRole = rawChanges.length > 0 && rawChanges.every((ch) => {
              const rolesList = Array.isArray(ch.new) ? ch.new : (Array.isArray(ch.old) ? ch.old : []);
              return rolesList.every((r: any) => String(r.id) === vcRoleId);
            });
            if (isOnlyVcRole) {
              continue;
            }
          }
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

        const availableActions = Object.entries(ACTION_DEFINITIONS).map(([id, info]) => ({
          id: parseInt(id, 10),
          name: info.name,
          category: info.category,
        }));

        const result = {
          missingPermission: false,
          entries,
          stats,
          executors: Array.from(uniqueExecutors.values()),
          availableActions,
          lastId: entries.length > 0 ? entries[entries.length - 1].id : null,
          rateLimited: false,
        };

        // Cache successful response for 15s to shield Discord rate limits
        apiCache.set(cacheKey, result, 15000);
        // Save latest snapshot as resilient fallback (persists 5 minutes)
        apiCache.set(fallbackKey, result, 300000);

        return result;
      } catch (err) {
        // 429 Rate Limit Shielding
        const isRateLimited = err.status === 429 || err.code === 429 || err.message?.toLowerCase().includes("rate limit");
        if (isRateLimited) {
          console.warn(`[AUDIT LOGS] Discord 429 Rate Limit hit for guild ${guild.id}. Serving resilient cache fallback.`);
          const fallback = apiCache.get(fallbackKey);
          if (fallback) {
            return {
              ...fallback,
              rateLimited: true,
              retryAfter: 5,
              cached: true,
            };
          }
          return {
            missingPermission: false,
            rateLimited: true,
            retryAfter: 5,
            entries: [],
            stats: { total: 0, moderation: 0, members: 0, channels: 0, roles: 0, messages: 0, server: 0 },
            executors: [],
            availableActions: [],
          };
        }
        throw err;
      } finally {
        inFlightAuditRequests.delete(cacheKey);
      }
    })();

    inFlightAuditRequests.set(cacheKey, requestPromise);
  }

  try {
    const payload = await requestPromise;
    return c.json(payload);
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
 * Get moderation & categorized event log channels configuration.
 */
auditLogRoutes.get("/guilds/:guildId/audit-logs/config", async (c) => {
  const guildId = c.req.param("guildId");
  const cacheKey = `guild:${guildId}:modlog_config`;
  const cached = apiCache.get(cacheKey);
  if (cached) {
    return c.json(cached);
  }

  const modLog: any = await ModerationLogConfig.findOne({ where: { guild_id: guildId } });
  let eventsConfig = {};
  try {
    if (modLog?.events_config) {
      eventsConfig = typeof modLog.events_config === "string" ? JSON.parse(modLog.events_config) : modLog.events_config;
    }
  } catch {}

  const payload = {
    modLogChannelId: modLog?.channel_id || "",
    enabled: Boolean(modLog?.enabled),
    eventsConfig,
  };

  // Cache config for 30s
  apiCache.set(cacheKey, payload, 30000);
  return c.json(payload);
});

/**
 * POST /guilds/:guildId/audit-logs/config
 * Update moderation & event log channels configuration.
 */
auditLogRoutes.post("/guilds/:guildId/audit-logs/config", async (c) => {
  const guildId = c.req.param("guildId");
  const body = await c.req.json().catch(() => ({}));
  const channelId = body.channelId !== undefined ? body.channelId : (body.modLogChannelId || "");
  const enabled = body.enabled !== undefined ? Boolean(body.enabled) : true;
  const eventsConfig = body.eventsConfig
    ? (typeof body.eventsConfig === "string" ? body.eventsConfig : JSON.stringify(body.eventsConfig))
    : "{}";

  await ModerationLogConfig.upsert({
    guild_id: guildId,
    channel_id: String(channelId || ""),
    enabled,
    events_config: eventsConfig,
  });

  // Invalidate caches immediately
  apiCache.delete(`guild:${guildId}:config`);
  apiCache.delete(`guild:${guildId}:modlog_config`);
  invalidateLogConfigCache(guildId);

  let parsedEvents = {};
  try {
    parsedEvents = typeof eventsConfig === "string" ? JSON.parse(eventsConfig) : eventsConfig;
  } catch {}

  return c.json({
    success: true,
    modLogChannelId: channelId,
    enabled,
    eventsConfig: parsedEvents,
  });
});

/**
 * POST /guilds/:guildId/audit-logs/test
 * Send a verification test embed to the configured moderation log channel or specific event channel.
 */
auditLogRoutes.post("/guilds/:guildId/audit-logs/test", async (c) => {
  const guildId = c.req.param("guildId");
  const guild: any = (c as any).get("botGuild");
  const user: any = (c as any).get("user");
  const body: any = await c.req.json().catch(() => ({}));

  if (!guild) {
    return c.json({ error: "Guild not found" }, 404);
  }

  const modLog: any = await ModerationLogConfig.findOne({ where: { guild_id: guildId } });
  let targetChannelId = body.channelId;

  if (!targetChannelId && body.eventType && modLog?.events_config) {
    try {
      const parsed = typeof modLog.events_config === "string" ? JSON.parse(modLog.events_config) : modLog.events_config;
      if (parsed[body.eventType]?.channel_id) {
        targetChannelId = parsed[body.eventType].channel_id;
      }
    } catch {}
  }

  if (!targetChannelId) {
    targetChannelId = modLog?.channel_id;
  }

  if (!targetChannelId) {
    return c.json({ error: "No target log channel configured for this event" }, 400);
  }

  let channel = guild.channels?.cache?.get(targetChannelId);
  if (!channel && guild.channels?.fetch) {
    channel = await guild.channels.fetch(targetChannelId).catch(() => null);
  }

  if (!channel || !channel.send) {
    return c.json({ error: "Configured channel not found or bot cannot access it" }, 400);
  }

  const eventLabel = body.eventLabel || (body.eventType ? body.eventType.replace(/_/g, " ").toUpperCase() : "Moderation & System");
  const eventColor = body.color || COLORS.DARK;

  try {
    let testEmbed: any;
    if (body.eventType === "message_deleted") {
      testEmbed = makeEmbed({
        title: `🗑️ Message Deleted in #${channel.name}`,
        description: `> This is a simulated deleted message dispatched from the dashboard to verify your log formatting.`,
        level: "WARNING",
        color: eventColor,
        footer: `Author ID: ${user?.id || "0"} • Channel ID: ${channel.id}`,
      });
      testEmbed.setAuthor({
        name: user?.username || "Dashboard Admin",
        iconURL: user?.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : undefined,
      });
      testEmbed.addFields(
        { name: "👤 Author", value: `<@${user?.id || "Admin"}>\n\`${user?.username || "Admin"}\``, inline: true },
        { name: "📁 Channel", value: `<#${channel.id}>`, inline: true },
        { name: "🆔 Message ID", value: "`1234567890987654321`", inline: true },
        { name: "Attached Files (1)", value: "🖼️ [sample_image.png](https://cdn.discordapp.com) `(1.2 MB)`", inline: false },
        { name: "Media Links (1)", value: "[Tenor GIF](https://tenor.com)", inline: false }
      );
    } else if (body.eventType === "message_edited") {
      testEmbed = makeEmbed({
        title: `✏️ Message Edited in #${channel.name}`,
        description: `**Before:**\n> Hello world! Check out this cool picture.\n\n**After:**\n> Hello server! Check out this cool picture & link.`,
        level: "INFO",
        color: eventColor,
        footer: `Author ID: ${user?.id || "0"} • Channel ID: ${channel.id}`,
      });
      testEmbed.setAuthor({
        name: user?.username || "Dashboard Admin",
        iconURL: user?.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : undefined,
      });
      testEmbed.addFields(
        { name: "👤 Author", value: `<@${user?.id || "Admin"}>\n\`${user?.username || "Admin"}\``, inline: true },
        { name: "📁 Channel", value: `<#${channel.id}>`, inline: true },
        { name: "🆔 Message ID", value: "`1234567890987654321`", inline: true },
        { name: "Jump to Message", value: `[Click to View](https://discord.com)`, inline: true }
      );
    } else {
      testEmbed = makeEmbed({
        title: `🛡️ Digital Vigital — ${eventLabel} Test`,
        description: `Live test log event dispatched from the web dashboard by <@${user?.id || "Admin"}>.\n\n• **Event:** \`${eventLabel}\`\n• **Channel:** <#${channel.id}>\n• **Status:** Pipeline Connected & Operational\n• **Timestamp:** <t:${Math.floor(Date.now() / 1000)}:F>`,
        level: "SUCCESS",
        color: eventColor,
        footer: "DIGITAL_VIGITAL_LOG_SYSTEM",
      });
    }

    await channel.send({ embeds: [testEmbed] });
    return c.json({ success: true, message: `Test dispatch delivered to #${channel.name}!` });
  } catch (err) {
    return c.json({ error: err.message || "Bot lacks Send Messages or Embed Links permission in this channel" }, 500);
  }
});
