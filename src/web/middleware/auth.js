import { getCookie } from "hono/cookie";
import { verifySessionToken, fetchDiscordGuilds } from "../auth.js";
import { apiCache } from "../routes/cache.js";

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
      console.error("[AUTH MIDDLEWARE] Failed to fetch user guilds:", err);
      if (c.req.path.startsWith("/api/")) {
        return c.json({ error: "Failed to restore server list from Discord." }, 500);
      }
      return c.redirect("/auth/login");
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
