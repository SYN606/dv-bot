import { Hono } from "hono";
import { getLiveBotGuildIds } from "./authRoutes.js";
import { apiCache } from "./cache.js";
import { PROTECTED_COMMANDS } from "../../core/permissions.js";

export const botRoutes = new Hono();

// 1. Bot Profile Metadata (Avatar PFP, Banner, Username, ID, Joined Guilds)
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

// 2. Public Commands Documentation Endpoint (All commands, descriptions, aliases, usage, options)
botRoutes.get("/commands", async (c) => {
  const cacheKey = "public:commands";
  const cached = apiCache.get(cacheKey);
  if (cached) {
    return c.json(cached);
  }

  const client = c.get("discordClient");
  const commandsList = [];

  if (client?.commands) {
    for (const cmd of client.commands.values()) {
      const category = (cmd.category || "Utility").toLowerCase();
      const rawOptions = cmd.slashBuilder?.options || [];
      const options = rawOptions.map((opt) => {
        const json = typeof opt.toJSON === "function" ? opt.toJSON() : opt;
        return {
          name: json.name,
          description: json.description || "",
          required: Boolean(json.required),
          type: json.type,
        };
      });

      // Build default syntax
      const optionsUsage = options
        .map((o) => (o.required ? `<${o.name}>` : `[${o.name}]`))
        .join(" ");
      const prefixSyntax = `!${cmd.name}${optionsUsage ? ` ${optionsUsage}` : ""}`;
      const slashSyntax = `/${cmd.name}${optionsUsage ? ` ${optionsUsage}` : ""}`;

      let permissionLevel = "Everyone";
      if (cmd.adminOnly) permissionLevel = "Server Admin";
      else if (cmd.configOnly) permissionLevel = "Manage Server";
      else if (cmd.modOnly) permissionLevel = "Moderator";

      commandsList.push({
        name: cmd.name,
        description: cmd.description || "No description provided.",
        category,
        aliases: cmd.aliases || [],
        usage: cmd.usage || prefixSyntax,
        slashUsage: slashSyntax,
        prefixUsage: prefixSyntax,
        permissionLevel,
        adminOnly: Boolean(cmd.adminOnly),
        modOnly: Boolean(cmd.modOnly),
        configOnly: Boolean(cmd.configOnly),
        isProtected: PROTECTED_COMMANDS.has(cmd.name.toLowerCase()),
        slashOnly: Boolean(cmd.slashOnly),
        options,
      });
    }
  }

  // Sort by category then name
  commandsList.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

  const categories = [...new Set(commandsList.map((c) => c.category))];

  const payload = {
    commands: commandsList,
    total: commandsList.length,
    count: commandsList.length,
    categories,
  };

  // Cache for 60 seconds
  apiCache.set(cacheKey, payload, 60000);
  return c.json(payload);
});
