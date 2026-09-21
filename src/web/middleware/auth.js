import { getCookie } from "hono/cookie";
import { verifySessionToken } from "../auth.js";

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

  c.set("user", session.user);
  c.set("guilds", session.guilds);
  await next();
}

export async function requireGuildAdmin(c, next) {
  const guildId = c.req.param("guildId");
  const userGuilds = c.get("guilds") || [];
  const client = c.get("discordClient");

  const targetGuild = userGuilds.find((g) => g.id === guildId);
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

  const botGuild = client?.guilds.cache.get(guildId) || null;
  c.set("currentGuild", targetGuild);
  c.set("botGuild", botGuild);

  await next();
}
