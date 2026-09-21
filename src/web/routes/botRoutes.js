import { Hono } from "hono";
import { getLiveBotGuildIds } from "./authRoutes.js";
import { apiCache } from "./cache.js";

export const botRoutes = new Hono();

// Bot Profile Metadata (Avatar PFP, Banner, Username, ID, Joined Guilds)
botRoutes.get("/bot", async (c) => {
  const cacheKey = "bot:profile";
  const cached = apiCache.get(cacheKey);
  if (cached) {
    return c.json(cached);
  }

  const client = c.get("discordClient");
  const botUser = client?.user;

  const botAvatar =
    botUser?.displayAvatarURL?.({ extension: "png", size: 256 }) ||
    (botUser?.avatar
      ? `https://cdn.discordapp.com/avatars/${botUser.id}/${botUser.avatar}.png`
      : "https://cdn.discordapp.com/embed/avatars/0.png");

  let botBanner = null;
  try {
    if (botUser?.banner) {
      botBanner = `https://cdn.discordapp.com/banners/${botUser.id}/${botUser.banner}.png?size=1024`;
    } else if (typeof botUser?.bannerURL === "function") {
      botBanner = botUser.bannerURL({ size: 1024 });
    }
  } catch {}

  const guildIds = await getLiveBotGuildIds(client);

  const payload = {
    id: botUser?.id || null,
    username: botUser?.username || "Digital Vigital",
    avatar: botAvatar,
    banner: botBanner,
    guildIds,
  };

  // Cache for 30 seconds
  apiCache.set(cacheKey, payload, 30000);

  return c.json(payload);
});
