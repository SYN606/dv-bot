import { type Guild } from "discord.js";
import { logger } from "../utils/logger.js";
import { TOPOLOGY_MIRROR } from "../services/topologyMirror.js";
import { ANTINUKE_AUDIT } from "../services/antinukeAuditResolver.js";
import { apiCache } from "../web/routes/cache.js";
import { invalidateCompiledRules } from "../handlers/autoresponderHandler.js";

export default {
  name: "guildDelete",
  async execute(client: any, guild: Guild) {
    if (!guild?.id) return;
    logger.info(`[GUILD LEAVE] Bot was removed from guild: ${guild.name || "Unknown"} (${guild.id})`);

    try {
      // 1. Evict in-memory topology mirror
      TOPOLOGY_MIRROR.removeGuild(guild.id);

      // 2. Clear antinuke audit resolver cache for this guild
      ANTINUKE_AUDIT.removeGuild(guild.id);

      // 2. Clear autoresponder rule compiler cache
      invalidateCompiledRules(guild.id);

      // 3. Clear Web API cache entries for this guild
      apiCache.invalidateGuild(guild.id);
    } catch (err: any) {
      logger.warn(`[GUILD LEAVE CLEANUP ERROR] Guild ${guild.id}: ${err.message}`);
    }
  },
};
