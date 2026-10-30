import { Events, type GuildChannel, AuditLogEvent, PermissionFlagsBits } from "discord.js";
import { sendModLog } from "../utils/modLog.js";

export default {
  name: Events.ChannelUpdate,
  async execute(client: any, oldChannel: GuildChannel, newChannel: GuildChannel) {
    if (!newChannel || !newChannel.guild) return;

    try {
      const changes: string[] = [];
      const extraFields: Record<string, any> = {
        Channel: `<#${newChannel.id}> (\`#${newChannel.name}\`)`,
      };

      // 1. Name change
      if (oldChannel.name !== newChannel.name) {
        changes.push(`**Name:** \`#${oldChannel.name}\` ➔ \`#${newChannel.name}\``);
      }

      // 2. Topic change (for text channels)
      const oldTopic = (oldChannel as any).topic || null;
      const newTopic = (newChannel as any).topic || null;
      if (oldTopic !== newTopic) {
        changes.push(`**Topic:** ${newTopic ? `"${newTopic}"` : "*Cleared*"}`);
      }

      // 3. Slowmode change
      const oldSlowmode = (oldChannel as any).rateLimitPerUser;
      const newSlowmode = (newChannel as any).rateLimitPerUser;
      if (oldSlowmode !== undefined && newSlowmode !== undefined && oldSlowmode !== newSlowmode) {
        changes.push(`**Slowmode:** \`${oldSlowmode}s\` ➔ \`${newSlowmode}s\``);
      }

      // 4. NSFW toggle
      const oldNsfw = (oldChannel as any).nsfw;
      const newNsfw = (newChannel as any).nsfw;
      if (oldNsfw !== undefined && newNsfw !== undefined && oldNsfw !== newNsfw) {
        changes.push(`**Age-Restricted (NSFW):** \`${oldNsfw ? "Enabled" : "Disabled"}\` ➔ \`${newNsfw ? "Enabled" : "Disabled"}\``);
      }

      // If no trackable property changed, skip (e.g. internal position/sync changes)
      if (changes.length === 0) return;

      let executor: any = null;
      if (newChannel.guild.members.me?.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
        try {
          const logs = await newChannel.guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.ChannelUpdate,
          });
          const entry = logs.entries.first();
          if (entry && entry.targetId === newChannel.id && Date.now() - entry.createdTimestamp < 5000) {
            executor = entry.executor;
          }
        } catch (_) {}
      }

      await sendModLog({
        guild: newChannel.guild,
        category: "CHANNELS",
        title: "Channel Updated",
        level: "INFO",
        actor: executor || null,
        description: changes.join("\n"),
        extraFields,
      });
    } catch (err) {
      console.error("[EVENT CHANNEL UPDATE ERROR]:", err);
    }
  },
};
