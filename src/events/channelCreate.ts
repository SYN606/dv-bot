import { Events, type GuildChannel, AuditLogEvent, PermissionFlagsBits } from "discord.js";
import { sendModLog } from "../utils/modLog.js";

export default {
  name: Events.ChannelCreate,
  async execute(client: any, channel: GuildChannel) {
    if (!channel || !channel.guild) return;

    try {
      let executor: any = null;
      if (channel.guild.members.me?.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
        try {
          const logs = await channel.guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.ChannelCreate,
          });
          const entry = logs.entries.first();
          if (entry && entry.targetId === channel.id && Date.now() - entry.createdTimestamp < 5000) {
            executor = entry.executor;
          }
        } catch (_) {}
      }

      const channelTypeNames: Record<number, string> = {
        0: "Text Channel",
        2: "Voice Channel",
        4: "Category",
        5: "Announcement",
        13: "Stage Channel",
        15: "Forum",
        16: "Media Channel",
      };

      const typeLabel = channelTypeNames[channel.type] || `Type ${channel.type}`;
      const extraFields: Record<string, any> = {
        Channel: `<#${channel.id}> (\`#${channel.name}\`)`,
        Type: typeLabel,
        "Channel ID": `\`${channel.id}\``,
      };

      if (channel.parent) {
        extraFields["Category"] = channel.parent.name;
      }

      await sendModLog({
        guild: channel.guild,
        category: "CHANNELS",
        title: "Channel Created",
        level: "INFO",
        actor: executor || null,
        description: `New channel <#${channel.id}> was created.`,
        extraFields,
      });
    } catch (err) {
      console.error("[EVENT CHANNEL CREATE ERROR]:", err);
    }
  },
};
