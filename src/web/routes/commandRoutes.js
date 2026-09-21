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
  getStickyMessage,
  setStickyMessage,
  removeStickyMessage,
} from "../../db/helpers/sticky.js";
import { apiCache } from "./cache.js";

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

  let disabled = [];
  if (channelId) {
    const cacheKey = `guild:${guildId}:disabled_cmds:${channelId}`;
    const cached = apiCache.get(cacheKey);
    if (cached) {
      disabled = cached;
    } else {
      disabled = await getDisabledCommands(guildId, channelId);
      apiCache.set(cacheKey, disabled, 15000);
    }
  }

  const disabledSet = new Set(disabled.map((d) => String(d).toLowerCase()));

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
    mod.commands.push({
      ...cmd,
      disabled: disabledSet.has(cmd.name.toLowerCase()),
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

  if (!channel_id || !command_name) {
    return c.json({ error: "channel_id and command_name are required" }, 400);
  }

  if (PROTECTED_COMMANDS.has(command_name)) {
    return c.json({ error: "Protected commands cannot be disabled." }, 400);
  }

  if (enable) {
    await enableCommand(guildId, channel_id, command_name);
  } else {
    await disableCommand(guildId, channel_id, command_name);
  }

  apiCache.delete(`guild:${guildId}:disabled_cmds:${channel_id}`);
  return c.json({ success: true, command: command_name, enabled: enable });
});

// Module Bulk Toggle (Enable / Disable entire category for channel)
commandRoutes.post("/guilds/:guildId/commands/module_toggle", async (c) => {
  const guildId = c.req.param("guildId");
  const body = await c.req.json().catch(() => ({}));
  const channel_id = body.channel_id || body.channelId;
  const category = (body.category || body.module || "").trim().toLowerCase();
  const enable = body.enable !== undefined ? !!body.enable : !body.disabled;

  if (!channel_id || !category) {
    return c.json({ error: "channel_id and category are required" }, 400);
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
  if (enable) {
    result = await bulkUnrestrictCommands(guildId, channel_id, targetCommands);
  } else {
    result = await bulkRestrictCommands(guildId, channel_id, targetCommands);
  }

  apiCache.delete(`guild:${guildId}:disabled_cmds:${channel_id}`);

  return c.json({
    success: true,
    category,
    enabled: enable,
    affectedCount: targetCommands.length,
    skippedProtected: protectedSkipped,
    details: result,
  });
});

// 2. Sticky Channel Messages
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
  const { channel_id, content } = await c.req.json();

  if (!channel_id || !content) {
    return c.json({ error: "channel_id and content are required" }, 400);
  }

  const record = await setStickyMessage(guildId, channel_id, content);
  apiCache.delete(`guild:${guildId}:sticky:${channel_id}`);
  return c.json({ success: true, record });
});

commandRoutes.delete("/guilds/:guildId/sticky/:channelId", async (c) => {
  const guildId = c.req.param("guildId");
  const channelId = c.req.param("channelId");
  const deleted = await removeStickyMessage(guildId, channelId);

  apiCache.delete(`guild:${guildId}:sticky:${channelId}`);
  return c.json({ success: deleted });
});
