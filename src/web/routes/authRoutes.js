import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { verifySessionToken, fetchDiscordGuilds, createSessionToken } from "../auth.js";

export const authRoutes = new Hono();

// Helper to get real-time bot guild IDs
export async function getLiveBotGuildIds(client) {
  if (!client?.guilds) return [];
  let ids = Array.from(client.guilds.cache.keys()).map(String);
  if (ids.length === 0 && typeof client.guilds.fetch === "function") {
    try {
      const fetched = await client.guilds.fetch();
      ids = Array.from(fetched.keys()).map(String);
    } catch (e) {
      console.error("[LIVE BOT GUILDS ERROR]:", e);
    }
  }
  return ids;
}

// Current User & Session Info
authRoutes.get("/me", async (c) => {
  const sessionCookie = getCookie(c, "dv_session");
  const session = verifySessionToken(sessionCookie);
  if (!session || !session.user) {
    return c.json({ user: null, guilds: [] });
  }

  const { apiCache } = await import("./cache.js");
  let userGuilds = apiCache.get(`user_guilds:${session.user.id}`);
  
  if (!userGuilds && session.accessToken) {
    try {
      const rawGuilds = await fetchDiscordGuilds(session.accessToken);
      userGuilds = rawGuilds.map((g) => ({
        id: g.id,
        name: g.name,
        icon: g.icon,
        permissions: g.permissions,
        owner: g.owner,
      }));
      apiCache.set(`user_guilds:${session.user.id}`, userGuilds, 1000 * 60 * 60);
    } catch (e) {
      userGuilds = [];
    }
  }

  const client = c.get("discordClient");
  const botGuildIds = await getLiveBotGuildIds(client);

  const guilds = (userGuilds || []).map((g) => {
    const isBotInGuild =
      botGuildIds.includes(String(g.id)) ||
      Boolean(client?.guilds?.cache?.has(String(g.id)));

    const perms = BigInt(g.permissions || "0");
    const canManage = Boolean(
      g.owner ||
      (perms & 8n) === 8n ||
      (perms & 32n) === 32n
    );

    return {
      ...g,
      botPresent: isBotInGuild,
      canManage,
    };
  });

  return c.json({
    user: session.user,
    guilds,
  });
});

// Sync / Refresh User Guilds from Discord API
authRoutes.post("/me/sync", async (c) => {
  const sessionCookie = getCookie(c, "dv_session");
  const session = verifySessionToken(sessionCookie);
  if (!session || !session.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const client = c.get("discordClient");
  const botGuildIds = await getLiveBotGuildIds(client);

  const { apiCache } = await import("./cache.js");
  let updatedGuilds = apiCache.get(`user_guilds:${session.user.id}`) || [];
  
  if (session.accessToken) {
    try {
      const rawGuilds = await fetchDiscordGuilds(session.accessToken);
      updatedGuilds = rawGuilds.map((g) => ({
        id: g.id,
        name: g.name,
        icon: g.icon,
        permissions: g.permissions,
        owner: g.owner,
      }));

      // Update in-memory cache directly instead of rewriting the cookie
      apiCache.set(`user_guilds:${session.user.id}`, updatedGuilds, 1000 * 60 * 60);
    } catch (err) {
      console.error("[SYNC SERVERS ERROR]:", err);
    }
  }

  const mappedGuilds = updatedGuilds.map((g) => {
    const isBotInGuild =
      botGuildIds.includes(String(g.id)) ||
      Boolean(client?.guilds?.cache?.has(String(g.id)));

    const perms = BigInt(g.permissions || "0");
    const canManage = Boolean(
      g.owner ||
      (perms & 8n) === 8n ||
      (perms & 32n) === 32n
    );

    return {
      ...g,
      botPresent: isBotInGuild,
      canManage,
    };
  });

  return c.json({
    user: session.user,
    guilds: mappedGuilds,
  });
});
