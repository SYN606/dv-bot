import { Hono } from "hono";
import { PROTECTED_COMMANDS } from "../../core/permissions.js";
import {
  getDisabledCommands,
  disableCommand,
  enableCommand,
  bulkRestrictCommands,
  bulkUnrestrictCommands,
} from "../../db/helpers/channelCommandRestrict.js";
import {
  disableCommandGuild,
  enableCommandGuild,
  getGuildDisabledCommands,
  bulkDisableCommandsGuild,
  bulkEnableCommandsGuild,
} from "../../db/helpers/guildCommandDisable.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import {
  getStickyMessage,
  setStickyMessage,
  removeStickyMessage,
  updateStickyLastMessage,
} from "../../db/helpers/sticky.js";
import { StickyMessage } from "../../db/models/index.js";
import { apiCache } from "./cache.js";

const IMAGE_URL_REGEX = /(https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp)(?:\?\S+)?)/i;

export const commandRoutes = new Hono();

export const MODULE_METADATA = {
  moderation: {
    name: "Moderation",
    description: "Ban, kick, timeout, unban, and warnings moderation suite",
    icon: "ShieldAlert",
  },
  admin: {
    name: "Administration",
    description: "Server administration, admin roles, media channels, purge, and logs",
    icon: "ShieldCheck",
  },
  analytics: {
    name: "Analytics & Tracking",
    description: "Member leaderboards, message statistics, and server activity charts",
    icon: "BarChart3",
  },
  channels: {
    name: "Channel Management",
    description: "Channel lockdown and message slowmode rate limits",
    icon: "Hash",
  },
  utility: {
    name: "General Utility",
    description: "AFK system, user avatars, banners, ping, and server information",
    icon: "Wrench",
  },
  voice: {
    name: "Voice Tools",
    description: "Voice channel dragging, mass move, and automated VC roles",
    icon: "Volume2",
  },
};

// 1. Command Restrictions List & Info
commandRoutes.get("/guilds/:guildId/commands", async (c) => {
  const guildId = c.req.param("guildId");
  const channelId = c.req.query("channel_id") || c.req.query("channelId");
  const client = c.get("discordClient");

  const allCommands = client
    ? Array.from(client.commands.values()).map((cmd) => {
        const cat = (cmd.category || "Utility").toLowerCase();
        return {
          name: cmd.name,
          description: cmd.description || "No description provided.",
          category: cat,
          isProtected: PROTECTED_COMMANDS.has(cmd.name.toLowerCase()),
        };
      })
    : [];

  // Fetch guild-wide disabled commands (always)
  const guildDisabledCacheKey = `guild:${guildId}:guild_disabled_cmds`;
  let guildDisabled = apiCache.get(guildDisabledCacheKey);
  if (!guildDisabled) {
    guildDisabled = await getGuildDisabledCommands(guildId);
    apiCache.set(guildDisabledCacheKey, guildDisabled, 15000);
  }

  let channelDisabled = [];
  if (channelId) {
    const cacheKey = `guild:${guildId}:disabled_cmds:${channelId}`;
    const cached = apiCache.get(cacheKey);
    if (cached) {
      channelDisabled = cached;
    } else {
      channelDisabled = await getDisabledCommands(guildId, channelId);
      apiCache.set(cacheKey, channelDisabled, 15000);
    }
  }

  // Merge: guild-wide + channel-specific (deduplicated)
  const disabled = [...new Set([...guildDisabled, ...channelDisabled].map((d) => String(d).toLowerCase()))];

  const disabledSet = new Set(disabled);
  const guildDisabledSet = new Set(guildDisabled.map((d) => String(d).toLowerCase()));

  // Group commands into functional modules
  const categoryMap = new Map();
  for (const cmd of allCommands) {
    const catId = cmd.category || "utility";
    if (!categoryMap.has(catId)) {
      const meta = MODULE_METADATA[catId] || {
        name: catId.charAt(0).toUpperCase() + catId.slice(1),
        description: `${catId} commands module`,
        icon: "Terminal",
      };
      categoryMap.set(catId, {
        id: catId,
        name: meta.name,
        description: meta.description,
        icon: meta.icon,
        commands: [],
        total: 0,
        disabledCount: 0,
        nonProtectedCount: 0,
        canDisable: false,
        isAllDisabled: false,
      });
    }

    const mod = categoryMap.get(catId);
    const cmdNameLower = cmd.name.toLowerCase();
    mod.commands.push({
      ...cmd,
      disabled: disabledSet.has(cmdNameLower),
      guildDisabled: guildDisabledSet.has(cmdNameLower),
    });
    mod.total += 1;
    if (!cmd.isProtected) {
      mod.nonProtectedCount += 1;
      mod.canDisable = true;
    }
    if (disabledSet.has(cmd.name.toLowerCase())) {
      mod.disabledCount += 1;
    }
  }

  for (const mod of categoryMap.values()) {
    mod.isAllDisabled = mod.nonProtectedCount > 0 && mod.disabledCount >= mod.nonProtectedCount;
  }

  const modules = Array.from(categoryMap.values());
  const totalCount = allCommands.length;
  const disabledCount = disabled.length;
  const protectedCount = allCommands.filter((cmd) => cmd.isProtected).length;
  const activeCount = Math.max(0, totalCount - disabledCount);

  return c.json({
    commands: allCommands,
    disabled,
    guildDisabled,
    modules,
    stats: {
      total: totalCount,
      active: activeCount,
      disabled: disabledCount,
      protected: protectedCount,
    },
  });
});

commandRoutes.post("/guilds/:guildId/commands/toggle", async (c) => {
  const guildId = c.req.param("guildId");
  const body = await c.req.json().catch(() => ({}));
  const channel_id = body.channel_id || body.channelId;
  const command_name = (body.command_name || body.commandName || "").toLowerCase().replace(/^\//, "");
  const enable = body.enable !== undefined ? !!body.enable : !body.disabled;

  if (!command_name) {
    return c.json({ error: "command_name is required" }, 400);
  }

  if (PROTECTED_COMMANDS.has(command_name)) {
    return c.json({ error: "Protected commands cannot be disabled." }, 400);
  }

  // Guild-wide toggle (no channel_id supplied — used by the dashboard toggle switch)
  if (!channel_id) {
    if (enable) {
      await enableCommandGuild(guildId, command_name);
    } else {
      await disableCommandGuild(guildId, command_name);
    }
    apiCache.delete(`guild:${guildId}:guild_disabled_cmds`);
    return c.json({ success: true, command: command_name, enabled: enable, scope: "guild" });
  }

  // Channel-scoped toggle (legacy — used by /command disable in-chat)
  if (enable) {
    await enableCommand(guildId, channel_id, command_name);
  } else {
    await disableCommand(guildId, channel_id, command_name);
  }

  apiCache.delete(`guild:${guildId}:disabled_cmds:${channel_id}`);
  return c.json({ success: true, command: command_name, enabled: enable, scope: "channel", channel_id });
});

// Module Bulk Toggle (Enable / Disable entire category — guild-wide or channel-scoped)
commandRoutes.post("/guilds/:guildId/commands/module_toggle", async (c) => {
  const guildId = c.req.param("guildId");
  const body = await c.req.json().catch(() => ({}));
  const channel_id = body.channel_id || body.channelId;
  const category = (body.category || body.module || "").trim().toLowerCase();
  const enable = body.enable !== undefined ? !!body.enable : !body.disabled;

  if (!category) {
    return c.json({ error: "category is required" }, 400);
  }

  const client = c.get("discordClient");
  if (!client || !client.commands) {
    return c.json({ error: "Bot client is not available." }, 500);
  }

  // Find all commands belonging to this category
  const targetCommands = [];
  let protectedSkipped = 0;

  for (const cmd of client.commands.values()) {
    const cmdCat = (cmd.category || "Utility").toLowerCase();
    if (cmdCat === category) {
      const name = cmd.name.toLowerCase();
      if (PROTECTED_COMMANDS.has(name)) {
        protectedSkipped++;
      } else {
        targetCommands.push(name);
      }
    }
  }

  if (targetCommands.length === 0) {
    if (protectedSkipped > 0) {
      return c.json(
        { error: `All commands in module '${category}' are protected core commands and cannot be disabled.` },
        400
      );
    }
    return c.json({ error: `No commands found for module '${category}'.` }, 404);
  }

  let result;
  let scope;

  if (!channel_id) {
    // Guild-wide module toggle (dashboard)
    scope = "guild";
    if (enable) {
      result = await bulkEnableCommandsGuild(guildId, targetCommands);
    } else {
      result = await bulkDisableCommandsGuild(guildId, targetCommands);
    }
    apiCache.delete(`guild:${guildId}:guild_disabled_cmds`);
  } else {
    // Channel-scoped module toggle (in-chat /command)
    scope = "channel";
    if (enable) {
      result = await bulkUnrestrictCommands(guildId, channel_id, targetCommands);
    } else {
      result = await bulkRestrictCommands(guildId, channel_id, targetCommands);
    }
    apiCache.delete(`guild:${guildId}:disabled_cmds:${channel_id}`);
  }

  return c.json({
    success: true,
    category,
    enabled: enable,
    scope,
    affectedCount: targetCommands.length,
    skippedProtected: protectedSkipped,
    details: result,
  });
});

// 2. Sticky Channel Messages
commandRoutes.get("/guilds/:guildId/sticky", async (c) => {
  const guildId = c.req.param("guildId");
  const cacheKey = `guild:${guildId}:sticky_all`;
  const cached = apiCache.get(cacheKey);
  if (cached) {
    return c.json(cached);
  }

  const records = await StickyMessage.findAll({
    where: { guild_id: String(guildId) },
  });

  const botGuild = c.get("botGuild");
  const stickyList = records.map((r) => {
    const ch = botGuild?.channels.cache.get(String(r.channel_id));
    return {
      id: r.id,
      channel_id: String(r.channel_id),
      channelId: String(r.channel_id),
      channelName: ch?.name || `channel-${r.channel_id}`,
      content: r.sticky_content,
      sticky_content: r.sticky_content,
      counter: r.counter || 0,
      last_message_id: r.last_message_id ? String(r.last_message_id) : null,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  });

  const payload = { stickyList };
  apiCache.set(cacheKey, payload, 15000);
  return c.json(payload);
});

commandRoutes.get("/guilds/:guildId/sticky/:channelId", async (c) => {
  const guildId = c.req.param("guildId");
  const channelId = c.req.param("channelId");
  const cacheKey = `guild:${guildId}:sticky:${channelId}`;
  const cached = apiCache.get(cacheKey);
  if (cached) {
    return c.json(cached);
  }

  const record = await getStickyMessage(guildId, channelId);
  const payload = record || {};
  apiCache.set(cacheKey, payload, 30000);
  return c.json(payload);
});

commandRoutes.post("/guilds/:guildId/sticky", async (c) => {
  const guildId = c.req.param("guildId");
  const body = await c.req.json().catch(() => ({}));
  const channel_id = body.channel_id || body.channelId;
  const content = (body.content || body.sticky_content || "").trim();
  const postNow = body.post_now !== undefined ? Boolean(body.post_now) : true;

  if (!channel_id || !content) {
    return c.json({ error: "channel_id and content are required" }, 400);
  }

  const record = await setStickyMessage(guildId, channel_id, content);

  // If postNow is requested and bot is present, immediately deploy/refresh notice into channel
  const botGuild = c.get("botGuild");
  if (postNow && botGuild) {
    try {
      let targetChannel = botGuild.channels.cache.get(channel_id);
      if (!targetChannel && typeof botGuild.channels.fetch === "function") {
        targetChannel = await botGuild.channels.fetch(channel_id).catch(() => null);
      }

      if (targetChannel && typeof targetChannel.send === "function") {
        // Delete previous sticky message if known
        if (record.last_message_id && /^\d{17,20}$/.test(record.last_message_id)) {
          try {
            const oldMsg = await targetChannel.messages.fetch(record.last_message_id).catch(() => null);
            if (oldMsg && typeof oldMsg.delete === "function") {
              await oldMsg.delete().catch(() => {});
            }
          } catch {}
        }

        const imgMatch = content.match(IMAGE_URL_REGEX);
        const imageUrl = imgMatch ? imgMatch[1] : null;
        const cleanText = imageUrl ? content.replace(imageUrl, "").trim() : content;

        const embed = makeEmbed({
          title: "📌 Sticky Message",
          description: cleanText ? `${EMOJIS.get("announcement") || "📌"} ${cleanText}` : "📌 **Sticky Notice**",
          image: imageUrl,
          level: "SYSTEM",
        });

        const newMsg = await targetChannel.send({ embeds: [embed] }).catch(() => null);
        if (newMsg?.id) {
          await updateStickyLastMessage(guildId, channel_id, newMsg.id);
          record.last_message_id = newMsg.id;
        }
      }
    } catch (err) {
      console.warn(`[STICKY POST_NOW WARNING] Channel ${channel_id}:`, err?.message || err);
    }
  }

  apiCache.delete(`guild:${guildId}:sticky:${channel_id}`);
  apiCache.delete(`guild:${guildId}:sticky_all`);
  return c.json({ success: true, record });
});

commandRoutes.delete("/guilds/:guildId/sticky/:channelId", async (c) => {
  const guildId = c.req.param("guildId");
  const channelId = c.req.param("channelId");
  const botGuild = c.get("botGuild");

  // Attempt to delete stale sticky message in Discord channel before deleting record
  try {
    const existing = await getStickyMessage(guildId, channelId);
    if (existing?.last_message_id && botGuild) {
      let targetChannel = botGuild.channels.cache.get(channelId);
      if (!targetChannel && typeof botGuild.channels.fetch === "function") {
        targetChannel = await botGuild.channels.fetch(channelId).catch(() => null);
      }
      if (targetChannel && typeof targetChannel.messages?.fetch === "function") {
        const oldMsg = await targetChannel.messages.fetch(existing.last_message_id).catch(() => null);
        if (oldMsg && typeof oldMsg.delete === "function") {
          await oldMsg.delete().catch(() => {});
        }
      }
    }
  } catch {}

  const deleted = await removeStickyMessage(guildId, channelId);

  apiCache.delete(`guild:${guildId}:sticky:${channelId}`);
  apiCache.delete(`guild:${guildId}:sticky_all`);
  return c.json({ success: deleted });
});
