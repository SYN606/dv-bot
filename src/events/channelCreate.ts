import { Events, type GuildChannel, AuditLogEvent, PermissionFlagsBits } from "discord.js";
import { sendModLog } from "../utils/modLog.js";
import { ANTINUKE_AUDIT } from "../services/antinukeAuditResolver.js";
import { ANTINUKE_SERVICE, ThreatType } from "../services/antinukeService.js";
import { TOPOLOGY_MIRROR } from "../services/topologyMirror.js";
import { getAntinukeSettings } from "../db/helpers/antinuke.js";

export default {
  name: Events.ChannelCreate,
  async execute(client: any, channel: GuildChannel) {
    if (!channel || !channel.guild) return;

    try {
      // 1. Update in-memory topology mirror
      TOPOLOGY_MIRROR.updateChannel(channel);

      // 2. Resolve executor safely
      const executor = await ANTINUKE_AUDIT.resolveExecutor(
        channel.guild,
        AuditLogEvent.ChannelCreate,
        channel.id
      );

      // 3. Anti-Nuke Threat Interception
      if (executor) {
        const settings = await getAntinukeSettings(channel.guild.id);
        if (settings.enabled) {
          const immune = await ANTINUKE_SERVICE.isImmune(channel.guild, executor, ThreatType.CHANNEL_CREATE);
          if (!immune) {
            const { triggered, count } = ANTINUKE_SERVICE.registerAction(
              channel.guild.id,
              executor.id,
              ThreatType.CHANNEL_CREATE,
              settings.channel_create_threshold,
              settings.window_seconds
            );

            if (triggered) {
              await ANTINUKE_SERVICE.executeMitigation({
                guild: channel.guild,
                executorId: executor.id,
                threatType: ThreatType.CHANNEL_CREATE,
                count,
                details: `Created spam channel #${channel.name} (${channel.id})`,
              });

              // Clean up newly created spam channel
              await channel.delete("[DV-BOT ANTI-NUKE] Mass channel creation nuke attempt").catch(() => {});
              return;
            }
          }
        }
      }

      // 4. Mod Log
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
