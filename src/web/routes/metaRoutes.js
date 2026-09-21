import { Hono } from "hono";
import { ChannelType } from "discord.js";
import { apiCache } from "./cache.js";

export const metaRoutes = new Hono();

// Guild Metadata (Text Channels, Roles with Hierarchy, Custom Emojis)
metaRoutes.get("/guilds/:guildId/meta", async (c) => {
  const guildId = c.req.param("guildId");
  const cacheKey = `guild:${guildId}:meta`;
  const cached = apiCache.get(cacheKey);
  if (cached) {
    return c.json(cached);
  }

  const botGuild = c.get("botGuild");
  if (!botGuild) {
    return c.json({ error: "Bot is not present in this server." }, 404);
  }

  const channels = botGuild.channels.cache
    .filter((ch) => ch.type === ChannelType.GuildText)
    .map((ch) => ({ id: ch.id, name: ch.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const botMember = botGuild?.members?.me;
  const roles = botGuild.roles.cache
    .filter((r) => r.id !== botGuild.id)
    .map((r) => ({
      id: r.id,
      name: r.name,
      color: r.hexColor,
      position: r.position,
      managed: r.managed,
      isAboveBot: botMember?.roles?.highest ? r.position >= botMember.roles.highest.position : false,
    }))
    .sort((a, b) => b.position - a.position);

  const emojis = botGuild.emojis?.cache
    ? Array.from(botGuild.emojis.cache.values()).map((e) => ({
        id: e.id,
        name: e.name,
        animated: Boolean(e.animated),
        url: typeof e.imageURL === "function"
          ? e.imageURL({ size: 64 })
          : `https://cdn.discordapp.com/emojis/${e.id}.${e.animated ? "gif" : "png"}`,
        identifier: `<${e.animated ? "a" : ""}:${e.name}:${e.id}>`,
        raw: typeof e.toString === "function" ? e.toString() : `<${e.animated ? "a" : ""}:${e.name}:${e.id}>`,
      })).sort((a, b) => a.name.localeCompare(b.name))
    : [];

  const payload = { channels, roles, emojis };

  // Cache for 15 seconds
  apiCache.set(cacheKey, payload, 15000);

  return c.json(payload);
});

// Standalone Server Emojis Endpoint
metaRoutes.get("/guilds/:guildId/emojis", async (c) => {
  const guildId = c.req.param("guildId");
  const cacheKey = `guild:${guildId}:emojis`;
  const cached = apiCache.get(cacheKey);
  if (cached) {
    return c.json(cached);
  }

  const botGuild = c.get("botGuild");
  if (!botGuild) {
    return c.json({ error: "Bot is not present in this server." }, 404);
  }

  const emojis = botGuild.emojis?.cache
    ? Array.from(botGuild.emojis.cache.values()).map((e) => ({
        id: e.id,
        name: e.name,
        animated: Boolean(e.animated),
        url: typeof e.imageURL === "function"
          ? e.imageURL({ size: 64 })
          : `https://cdn.discordapp.com/emojis/${e.id}.${e.animated ? "gif" : "png"}`,
        identifier: `<${e.animated ? "a" : ""}:${e.name}:${e.id}>`,
        raw: typeof e.toString === "function" ? e.toString() : `<${e.animated ? "a" : ""}:${e.name}:${e.id}>`,
      })).sort((a, b) => a.name.localeCompare(b.name))
    : [];

  // Cache for 15 seconds
  apiCache.set(cacheKey, emojis, 15000);

  return c.json(emojis);
});
