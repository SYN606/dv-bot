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

  let channelsCollection = botGuild.channels.cache;
  if (!channelsCollection || channelsCollection.size === 0) {
    channelsCollection = await botGuild.channels.fetch().catch(() => botGuild.channels.cache);
  }

  const channels = channelsCollection
    ? Array.from(channelsCollection.values())
        .filter((ch) => ch && (ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement || (ch.isTextBased?.() && !ch.isThread?.() && !ch.isVoiceBased?.())))
        .map((ch) => ({ id: ch.id, name: ch.name }))
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

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

  const botsCount = botGuild.members?.cache ? botGuild.members.cache.filter((m) => m.user?.bot).size : 0;
  const createdTimestamp = botGuild.createdTimestamp || 0;

  const payload = {
    channels,
    roles,
    emojis,
    guild: {
      id: botGuild.id,
      name: botGuild.name,
      memberCount: botGuild.memberCount || 0,
      botCount: botsCount,
      humanCount: Math.max(0, (botGuild.memberCount || 0) - botsCount),
      ownerId: botGuild.ownerId || "",
      rulesChannelId: botGuild.rulesChannelId || null,
      premiumSubscriptionCount: botGuild.premiumSubscriptionCount || 0,
      createdAt: createdTimestamp,
      icon: typeof botGuild.iconURL === "function" ? botGuild.iconURL({ size: 128, extension: "png" }) : null,
    },
  };

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

// Guild Members Endpoint (for staff/admin member selection)
metaRoutes.get("/guilds/:guildId/members", async (c) => {
  const guildId = c.req.param("guildId");
  const botGuild = c.get("botGuild");
  if (!botGuild) {
    return c.json({ error: "Bot is not present in this server." }, 404);
  }

  const query = (c.req.query("q") || "").trim();
  const limit = Math.min(Math.max(parseInt(c.req.query("limit") || "25", 10) || 25, 1), 50);

  let memberList = [];

  try {
    if (query) {
      // If query is an exact snowflake ID, try fetching directly
      if (/^\d{17,20}$/.test(query)) {
        const directMember = await botGuild.members.fetch(query).catch(() => null);
        if (directMember) {
          memberList.push(directMember);
        }
      }

      // If search method exists on members
      if (typeof botGuild.members?.search === "function") {
        const searched = await botGuild.members.search({ query, limit }).catch(() => null);
        if (searched && searched.size > 0) {
          for (const m of searched.values()) {
            if (!memberList.some((x) => x.id === m.id)) {
              memberList.push(m);
            }
          }
        }
      }

      // If still fewer than limit, search cached members
      if (memberList.length < limit && botGuild.members?.cache) {
        const qLower = query.toLowerCase();
        for (const m of botGuild.members.cache.values()) {
          if (memberList.length >= limit) break;
          if (memberList.some((x) => x.id === m.id)) continue;
          const username = m.user?.username?.toLowerCase() || "";
          const displayName = m.displayName?.toLowerCase() || "";
          if (username.includes(qLower) || displayName.includes(qLower) || m.id.includes(query)) {
            memberList.push(m);
          }
        }
      }
    } else {
      // No query, return from cache up to limit
      if (botGuild.members?.cache) {
        for (const m of botGuild.members.cache.values()) {
          if (memberList.length >= limit) break;
          memberList.push(m);
        }
      }
    }
  } catch (err) {
    // Graceful fallback to cache
    if (botGuild.members?.cache) {
      memberList = Array.from(botGuild.members.cache.values()).slice(0, limit);
    }
  }

  const results = memberList.map((m) => ({
    id: m.id,
    username: m.user?.username || m.displayName || `User ${m.id}`,
    displayName: m.displayName || m.user?.username || `User ${m.id}`,
    avatar: typeof m.user?.displayAvatarURL === "function"
      ? m.user.displayAvatarURL({ extension: "png", size: 64 })
      : (m.user?.avatar ? `https://cdn.discordapp.com/avatars/${m.id}/${m.user.avatar}.png` : null),
    isBot: Boolean(m.user?.bot),
    isOwner: botGuild.ownerId === m.id,
  }));

  return c.json(results);
});
