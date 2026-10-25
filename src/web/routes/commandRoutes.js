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
  fun: {
    name: "Fun & Roleplay",
    description: "Social anime roleplay interactions, love compatibility ship calculator, and fun commands",
    icon: "Sparkles",
  },
  voice: {
    name: "Voice Tools",
    description: "Voice channel dragging, mass move, and automated VC roles",
    icon: "Volume2",
  },
};

// Helper: Build enriched commands state payload
export async function getGuildCommandsState(guildId, rawChannelId, client) {
  const channelId =
    rawChannelId &&
    rawChannelId !== "global" &&
    rawChannelId !== "all" &&
    rawChannelId !== "null" &&
    rawChannelId !== "undefined"
      ? String(rawChannelId)
      : null;

  const allCommands = client?.commands
    ? Array.from(client.commands.values()).map((cmd) => {
        const cat = (cmd.category || "Utility").toLowerCase();
        return {
          name: cmd.name,
          description: cmd.description || "No description provided.",
          category: cat,
          aliases: Array.isArray(cmd.aliases) ? cmd.aliases : [],
          isProtected: PROTECTED_COMMANDS.has(cmd.name.toLowerCase()),
        };
      })
    : [];

  // Fetch guild-wide disabled commands
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

  const guildDisabledSet = new Set(guildDisabled.map((d) => String(d).toLowerCase()));
  const channelDisabledSet = new Set(channelDisabled.map((d) => String(d).toLowerCase()));

  // Effective disabled in current scope
  const disabled = channelId
    ? [...new Set([...guildDisabled, ...channelDisabled].map((d) => String(d).toLowerCase()))]
    : guildDisabled.map((d) => String(d).toLowerCase());

  const disabledSet = new Set(disabled);

  // Enrich commands with per-scope states
  const enrichedCommands = allCommands.map((cmd) => {
    const cmdNameLower = cmd.name.toLowerCase();
    const isGuildOff = guildDisabledSet.has(cmdNameLower);
    const isChannelOff = channelDisabledSet.has(cmdNameLower);
    const isOffInScope = channelId ? (isGuildOff || isChannelOff) : isGuildOff;

    return {
      ...cmd,
      disabled: isOffInScope,
      guildDisabled: isGuildOff,
      channelDisabled: isChannelOff,
    };
  });

  // Group commands into functional modules
  const categoryMap = new Map();
  for (const cmd of enrichedCommands) {
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
        activeCount: 0,
        disabledCount: 0,
        nonProtectedCount: 0,
        canDisable: false,
        isAllDisabled: false,
        isAllActive: false,
      });
    }

    const mod = categoryMap.get(catId);
    mod.commands.push(cmd);
    mod.total += 1;
    if (!cmd.isProtected) {
      mod.nonProtectedCount += 1;
      mod.canDisable = true;
    }
    if (cmd.disabled) {
      mod.disabledCount += 1;
    } else {
      mod.activeCount += 1;
    }
  }

  for (const mod of categoryMap.values()) {
    mod.isAllDisabled = mod.nonProtectedCount > 0 && mod.disabledCount >= mod.nonProtectedCount;
    mod.isAllActive = mod.nonProtectedCount > 0 && mod.disabledCount === 0;
  }

  const modules = Array.from(categoryMap.values());
  const totalCount = enrichedCommands.length;
  const disabledCount = enrichedCommands.filter((c) => c.disabled).length;
  const protectedCount = enrichedCommands.filter((c) => c.isProtected).length;
  const activeCount = Math.max(0, totalCount - disabledCount);

  return {
    commands: enrichedCommands,
    disabled,
    guildDisabled,
    channelDisabled,
    modules,
    scope: channelId ? "channel" : "guild",
    channelId,
    stats: {
      total: totalCount,
      active: activeCount,
      disabled: disabledCount,
      protected: protectedCount,
      guildDisabledCount: guildDisabled.length,
      channelDisabledCount: channelDisabled.length,
    },
  };
}

// 1. Command Restrictions List & Info
commandRoutes.get("/guilds/:guildId/commands", async (c) => {
  const guildId = c.req.param("guildId");
  const rawChannel = c.req.query("channel_id") || c.req.query("channelId");
  const client = c.get("discordClient");

  const state = await getGuildCommandsState(guildId, rawChannel, client);
  return c.json(state);
});

// Single Command Toggle
commandRoutes.post("/guilds/:guildId/commands/toggle", async (c) => {
  const guildId = c.req.param("guildId");
  const body = await c.req.json().catch(() => ({}));
  const rawChannel = body.channel_id || body.channelId;
  const channel_id = (rawChannel && rawChannel !== "global" && rawChannel !== "null") ? String(rawChannel) : null;
  const command_name = (body.command_name || body.commandName || "").toLowerCase().replace(/^\//, "");
  const enable = body.enable !== undefined ? !!body.enable : !body.disabled;
  const client = c.get("discordClient");

  if (!command_name) {
    return c.json({ error: "command_name is required" }, 400);
  }

  if (PROTECTED_COMMANDS.has(command_name)) {
    return c.json({ error: "Protected commands cannot be disabled." }, 400);
  }

  // Guild-wide toggle
  if (!channel_id) {
    if (enable) {
      await enableCommandGuild(guildId, command_name);
    } else {
      await disableCommandGuild(guildId, command_name);
    }
    apiCache.delete(`guild:${guildId}:guild_disabled_cmds`);
  } else {
    // Channel-scoped toggle
    if (enable) {
      await enableCommand(guildId, channel_id, command_name);
    } else {
      await disableCommand(guildId, channel_id, command_name);
    }
    apiCache.delete(`guild:${guildId}:disabled_cmds:${channel_id}`);
  }

  const state = await getGuildCommandsState(guildId, channel_id, client);
  return c.json({
    success: true,
    command: command_name,
    enabled: enable,
    scope: channel_id ? "channel" : "guild",
    ...state,
  });
});

// Module Bulk Toggle (Enable / Disable entire category)
commandRoutes.post("/guilds/:guildId/commands/module_toggle", async (c) => {
  const guildId = c.req.param("guildId");
  const body = await c.req.json().catch(() => ({}));
  const rawChannel = body.channel_id || body.channelId;
  const channel_id = (rawChannel && rawChannel !== "global" && rawChannel !== "null") ? String(rawChannel) : null;
  const category = (body.category || body.module || "").trim().toLowerCase();
  const enable = body.enable !== undefined ? !!body.enable : !body.disabled;
  const client = c.get("discordClient");

  if (!category) {
    return c.json({ error: "category is required" }, 400);
  }

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

  if (!channel_id) {
    // Guild-wide module toggle
    if (enable) {
      await bulkEnableCommandsGuild(guildId, [...targetCommands, `category:${category}`]);
    } else {
      await bulkDisableCommandsGuild(guildId, [...targetCommands, `category:${category}`]);
    }
    apiCache.delete(`guild:${guildId}:guild_disabled_cmds`);
  } else {
    // Channel-scoped module toggle
    if (enable) {
      await bulkUnrestrictCommands(guildId, channel_id, [...targetCommands, `category:${category}`]);
    } else {
      await bulkRestrictCommands(guildId, channel_id, [...targetCommands, `category:${category}`]);
    }
    apiCache.delete(`guild:${guildId}:disabled_cmds:${channel_id}`);
  }

  const state = await getGuildCommandsState(guildId, channel_id, client);
  return c.json({
    success: true,
    category,
    enabled: enable,
    scope: channel_id ? "channel" : "guild",
    affectedCount: targetCommands.length,
    skippedProtected: protectedSkipped,
    ...state,
  });
});

// Bulk Toggle All Commands (Server-wide or Channel-wide)
commandRoutes.post("/guilds/:guildId/commands/bulk_toggle", async (c) => {
  const guildId = c.req.param("guildId");
  const body = await c.req.json().catch(() => ({}));
  const rawChannel = body.channel_id || body.channelId;
  const channel_id = (rawChannel && rawChannel !== "global" && rawChannel !== "null") ? String(rawChannel) : null;
  const enable = body.enable !== undefined ? !!body.enable : !body.disabled;
  const client = c.get("discordClient");

  if (!client || !client.commands) {
    return c.json({ error: "Bot client is not available." }, 500);
  }

  const targetCommands = [];
  for (const cmd of client.commands.values()) {
    const name = cmd.name.toLowerCase();
    if (!PROTECTED_COMMANDS.has(name)) {
      targetCommands.push(name);
    }
  }

  if (!channel_id) {
    if (enable) {
      await bulkEnableCommandsGuild(guildId, targetCommands);
    } else {
      await bulkDisableCommandsGuild(guildId, targetCommands);
    }
    apiCache.delete(`guild:${guildId}:guild_disabled_cmds`);
  } else {
    if (enable) {
      await bulkUnrestrictCommands(guildId, channel_id, targetCommands);
    } else {
      await bulkRestrictCommands(guildId, channel_id, targetCommands);
    }
    apiCache.delete(`guild:${guildId}:disabled_cmds:${channel_id}`);
  }

  const state = await getGuildCommandsState(guildId, channel_id, client);
  return c.json({
    success: true,
    enabled: enable,
    scope: channel_id ? "channel" : "guild",
    affectedCount: targetCommands.length,
    ...state,
  });
});

// Reset Channel Overrides
commandRoutes.post("/guilds/:guildId/commands/reset_channel", async (c) => {
  const guildId = c.req.param("guildId");
  const body = await c.req.json().catch(() => ({}));
  const rawChannel = body.channel_id || body.channelId;
  const channel_id = (rawChannel && rawChannel !== "global" && rawChannel !== "null") ? String(rawChannel) : null;
  const client = c.get("discordClient");

  if (!channel_id) {
    return c.json({ error: "channel_id is required to reset channel restrictions." }, 400);
  }

  const { RestrictedCommand } = await import("../../db/models/index.js");
  const { clearGuildRestrictCache } = await import("../../db/helpers/channelCommandRestrict.js");

  await RestrictedCommand.destroy({
    where: { guild_id: String(guildId), channel_id: String(channel_id) },
  });

  clearGuildRestrictCache(guildId);
  apiCache.delete(`guild:${guildId}:disabled_cmds:${channel_id}`);

  const state = await getGuildCommandsState(guildId, channel_id, client);
  return c.json({
    success: true,
    reset: true,
    channelId: channel_id,
    ...state,
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
      repins: r.counter || 0,
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
          title: "ðŸ“Œ Sticky Message",
          description: cleanText ? `${EMOJIS.get("announcement") || "ðŸ“Œ"} ${cleanText}` : "ðŸ“Œ **Sticky Notice**",
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
