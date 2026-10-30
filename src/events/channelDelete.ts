import { Events, type GuildChannel, AuditLogEvent, PermissionFlagsBits } from "discord.js";
import { sendModLog } from "../utils/modLog.js";

export default {
  name: Events.ChannelDelete,
  async execute(client: any, channel: GuildChannel) {
    if (!channel || !channel.guild) return;

    try {
      let executor: any = null;
      if (channel.guild.members.me?.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
        try {
          const logs = await channel.guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.ChannelDelete,
          });
          const entry = logs.entries.first();
          if (entry && entry.targetId === channel.id && Date.now() - entry.createdTimestamp < 5000) {
            executor = entry.executor;
          }
        } catch (_) {}
      }

      const extraFields: Record<string, any> = {
        "Channel Name": `\`#${channel.name}\``,
        "Channel ID": `\`${channel.id}\``,
      };

      if (channel.parent) {
        extraFields["Category"] = channel.parent.name;
      }

      await sendModLog({
        guild: channel.guild,
        category: "CHANNELS",
        title: "Channel Deleted",
        level: "WARNING",
        actor: executor || null,
        description: `Channel \`#${channel.name}\` was deleted.`,
        extraFields,
      });
    } catch (err) {
      console.error("[EVENT CHANNEL DELETE ERROR]:", err);
    }
  },
};
