import { Events, type GuildChannel, AuditLogEvent, PermissionFlagsBits } from "discord.js";
import { sendModLog } from "../utils/modLog.js";
import { ANTINUKE_AUDIT } from "../services/antinukeAuditResolver.js";
import { ANTINUKE_SERVICE, ThreatType } from "../services/antinukeService.js";
import { TOPOLOGY_MIRROR } from "../services/topologyMirror.js";
import { getAntinukeSettings } from "../db/helpers/antinuke.js";
import { unregisterActiveTicketChannel } from "../db/helpers/tickets.js";

export default {
  name: Events.ChannelDelete,
  async execute(client: any, channel: GuildChannel) {
    if (!channel || !channel.guild) return;

    try {
      // 1. Fetch channel snapshot from Topology Mirror before cleanup
      const snapshot = TOPOLOGY_MIRROR.getChannelSnapshot(channel.guild.id, channel.id);

      // 2. Resolve executor safely with rate-limit deduplication
      const executor = await ANTINUKE_AUDIT.resolveExecutor(
        channel.guild,
        AuditLogEvent.ChannelDelete,
        channel.id
      );

      // 3. Anti-Nuke Threat Interception
      if (executor) {
        const settings = await getAntinukeSettings(channel.guild.id);
        if (settings.enabled) {
          const immune = await ANTINUKE_SERVICE.isImmune(channel.guild, executor, ThreatType.CHANNEL_DELETE);
          if (!immune) {
            const { triggered, count } = ANTINUKE_SERVICE.registerAction(
              channel.guild.id,
              executor.id,
              ThreatType.CHANNEL_DELETE,
              settings.channel_delete_threshold,
              settings.window_seconds
            );

            if (triggered) {
              await ANTINUKE_SERVICE.executeMitigation({
                guild: channel.guild,
                executorId: executor.id,
                threatType: ThreatType.CHANNEL_DELETE,
                count,
                channelSnapshot: snapshot,
                details: `Deleted channel #${channel.name} (${channel.id})`,
              });
            }
          }
        }
      }

      // 4. Remove from topology mirror & active ticket channel tracking
      TOPOLOGY_MIRROR.removeChannel(channel.guild.id, channel.id);
      unregisterActiveTicketChannel(channel.id);

      // 5. Mod Log
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
