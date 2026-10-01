import { AuditLogEvent } from "discord.js";
import { CONFIG } from "../config.js";
import { logger } from "../utils/logger.js";

export default {
  name: "guildCreate",
  async execute(client, guild) {
    logger.info(`[GUILD JOIN] Bot joined a new guild: ${guild.name} (${guild.id})`);

    // If there are no superusers defined, do nothing
    if (!CONFIG.SUPERUSERS || CONFIG.SUPERUSERS.length === 0) {
      return;
    }

    try {
      let isAllowed = false;

      // 1. Check if the guild owner is a superuser
      if (CONFIG.SUPERUSERS.includes(guild.ownerId)) {
        isAllowed = true;
      } else {
        // 2. Check Audit Logs to see who added the bot
        // This requires the 'View Audit Log' permission
        try {
          const auditLogs = await guild.fetchAuditLogs({ limit: 10, type: AuditLogEvent.BotAdd });
          const botAddLog = auditLogs.entries.find((log) => log.target?.id === client.user.id);
          
          if (botAddLog && botAddLog.executor) {
            if (CONFIG.SUPERUSERS.includes(botAddLog.executor.id)) {
              isAllowed = true;
            }
          }
        } catch (auditErr) {
          logger.warn(`[GUILD JOIN] Could not fetch audit logs for ${guild.name} to check inviter. Falling back to owner check.`);
        }
      }

      // If the inviter or owner is not a superuser, leave the guild
      if (!isAllowed) {
        logger.warn(`[GUILD JOIN] Unauthorized guild! Leaving ${guild.name} (${guild.id}). Neither owner nor inviter is a superuser.`);
        
        // Optional: Try to send a message to the system channel before leaving
        if (guild.systemChannel) {
          try {
            await guild.systemChannel.send("❌ This is a private bot. Only authorized superusers can add it to servers. I will now leave.");
          } catch (err) {
            // Ignore if we can't send messages
          }
        }
        
        await guild.leave();
      } else {
        logger.info(`[GUILD JOIN] Authorized guild! Added by or owned by a superuser.`);
      }
    } catch (error) {
      logger.error(`[GUILD JOIN] Error checking guild authorization:`, error);
    }
  },
};
