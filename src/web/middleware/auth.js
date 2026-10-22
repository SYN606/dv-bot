import { getCookie, deleteCookie } from "hono/cookie";
import { verifySessionToken, fetchDiscordGuilds } from "../auth.js";
import { apiCache } from "../routes/cache.js";
import { logger } from "../../utils/logger.js";

// Permission bitmasks
const ADMINISTRATOR = 0x8;
const MANAGE_GUILD = 0x20;

export async function requireAuth(c, next) {
  const token = getCookie(c, "dv_session");
  const session = verifySessionToken(token);

  if (!session) {
    if (c.req.path.startsWith("/api/")) {
      return c.json({ error: "Unauthorized. Please log in with Discord." }, 401);
    }
    return c.redirect("/auth/login");
  }

  // Restore guilds dynamically instead of packing them in the cookie
  let userGuilds = apiCache.get(`user_guilds:${session.user.id}`);
  
  if (!userGuilds) {
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
    } catch (err) {
      if (err.status === 429) {
        // Discord API Rate Limited (@me/guilds): Fallback to bot client cache without kicking out user
        const client = c.get("discordClient");
        const fallbackGuilds = [];
        if (client?.guilds?.cache) {
          for (const guild of client.guilds.cache.values()) {
            const member = guild.members.cache.get(session.user.id);
            if (member) {
              const isAdmin = member.permissions?.has(8n) || member.permissions?.has(32n) || guild.ownerId === session.user.id;
              fallbackGuilds.push({
                id: guild.id,
                name: guild.name,
                icon: guild.icon,
                permissions: isAdmin ? "8" : "0",
                owner: guild.ownerId === session.user.id,
              });
            }
          }
        }
        userGuilds = fallbackGuilds;
        // Cache fallback for 30 seconds to ride out the rate limit window
        apiCache.set(`user_guilds:${session.user.id}`, userGuilds, 30000);
        logger.warn(`[AUTH MIDDLEWARE] Discord API rate limited (@me/guilds). Using client guild cache fallback for user ${session.user.id}.`);
      } else if (err.status === 401 || err.message?.includes("401")) {
        deleteCookie(c, "dv_session");
        apiCache.delete(`user_guilds:${session.user.id}`);
        logger.warn(`[AUTH] Session access token expired for user ${session.user.id}. Cookie cleared.`);
        if (c.req.path.startsWith("/api/")) {
          return c.json({ error: "Session expired. Please log in again.", code: "SESSION_EXPIRED" }, 401);
        }
        return c.redirect("/auth/login");
      } else {
        logger.warn(`[AUTH MIDDLEWARE] Could not fetch Discord guilds for ${session.user.id}:`, err.message);
        if (c.req.path.startsWith("/api/")) {
          return c.json({ error: "Failed to restore server list from Discord." }, 500);
        }
        return c.redirect("/auth/login");
      }
    }
  }

  c.set("user", session.user);
  c.set("sessionToken", session); // Provide full session context including token
  c.set("guilds", userGuilds);
  await next();
}

export async function requireGuildAdmin(c, next) {
  const guildId = c.req.param("guildId");
  const user = c.get("user");
  const userGuilds = c.get("guilds") || [];
  const client = c.get("discordClient");
  
  const { CONFIG } = await import("../../config.js");
  const isSuperuser = CONFIG.SUPERUSERS.includes(user.id);

  let targetGuild = userGuilds.find((g) => g.id === guildId);
  
  // Superusers bypass standard membership/permission checks
  if (!isSuperuser) {
    if (!targetGuild) {
      if (c.req.path.startsWith("/api/")) {
        return c.json({ error: "Guild not found or access denied." }, 403);
      }
      return c.redirect("/dashboard");
    }

    const permissions = BigInt(targetGuild.permissions || 0);
    const isAdmin = targetGuild.owner || (permissions & BigInt(ADMINISTRATOR)) === BigInt(ADMINISTRATOR);
    const hasManageGuild = (permissions & BigInt(MANAGE_GUILD)) === BigInt(MANAGE_GUILD);

    if (!isAdmin && !hasManageGuild) {
      if (c.req.path.startsWith("/api/")) {
        return c.json({ error: "You lack Administrator or Manage Server permissions in this guild." }, 403);
      }
      return c.redirect("/dashboard");
    }
  }

  let botGuild = client?.guilds.cache.get(guildId) || null;
  if (!botGuild && client?.guilds) {
    botGuild = await client.guilds.fetch(guildId).catch(() => null);
  }
  
  // If superuser and they aren't in the guild naturally, mock targetGuild using bot's info
  if (isSuperuser && !targetGuild && botGuild) {
    targetGuild = {
      id: botGuild.id,
      name: botGuild.name,
      icon: botGuild.icon,
      permissions: "8", // Mock admin
      owner: false,
    };
  }

  c.set("currentGuild", targetGuild);
  c.set("botGuild", botGuild);

  await next();
}
