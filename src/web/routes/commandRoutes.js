import { Hono } from "hono";
import { PROTECTED_COMMANDS } from "../../core/permissions.js";
import {
  getDisabledCommands,
  disableCommand,
  enableCommand,
} from "../../db/helpers/channelCommandRestrict.js";
import {
  getStickyMessage,
  setStickyMessage,
  removeStickyMessage,
} from "../../db/helpers/sticky.js";
import { apiCache } from "./cache.js";

export const commandRoutes = new Hono();

// 1. Command Restrictions List & Info
commandRoutes.get("/guilds/:guildId/commands", async (c) => {
  const guildId = c.req.param("guildId");
  const channelId = c.req.query("channel_id");
  const client = c.get("discordClient");

  const allCommands = client
    ? Array.from(client.commands.values()).map((cmd) => ({
        name: cmd.name,
        description: cmd.description,
        category: cmd.category,
        isProtected: PROTECTED_COMMANDS.has(cmd.name.toLowerCase()),
      }))
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

  return c.json({ commands: allCommands, disabled });
});

commandRoutes.post("/guilds/:guildId/commands/toggle", async (c) => {
  const guildId = c.req.param("guildId");
  const { channel_id, command_name, enable } = await c.req.json();

  if (!channel_id || !command_name) {
    return c.json({ error: "channel_id and command_name are required" }, 400);
  }

  if (PROTECTED_COMMANDS.has(command_name.toLowerCase())) {
    return c.json({ error: "Protected commands cannot be disabled." }, 400);
  }

  if (enable) {
    await enableCommand(guildId, channel_id, command_name);
  } else {
    await disableCommand(guildId, channel_id, command_name);
  }

  apiCache.delete(`guild:${guildId}:disabled_cmds:${channel_id}`);
  return c.json({ success: true, enabled: !!enable });
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
