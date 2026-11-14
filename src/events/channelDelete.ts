import { Events, type GuildChannel, type TextChannel, AuditLogEvent, PermissionFlagsBits } from "discord.js";
import { sendModLog } from "../utils/modLog.js";
import { ANTINUKE_AUDIT } from "../services/antinukeAuditResolver.js";
import { ANTINUKE_SERVICE, ThreatType } from "../services/antinukeService.js";
import { TOPOLOGY_MIRROR } from "../services/topologyMirror.js";
import { getAntinukeSettings } from "../db/helpers/antinuke.js";
import {
  unregisterActiveTicketChannel,
  getTicketByChannel,
  getTicketByVoiceChannel,
  updateTicket,
  setTicketVoiceChannel,
  logTicketEvent,
} from "../db/helpers/tickets.js";

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

      // Handle ticket lifecycle cleanup if a ticket text or voice channel was deleted in Discord
      try {
        const ticket = await getTicketByChannel(channel.id);
        if (ticket && ticket.status !== "closed") {
          await updateTicket(ticket.id, {
            status: "closed",
            closed_by: executor ? executor.id : "system",
            closed_by_tag: executor ? executor.tag : "System",
            close_reason: "Ticket channel deleted in Discord",
            closed_at: new Date().toISOString(),
          });

          await logTicketEvent({
            ticket_id: ticket.id,
            guild_id: channel.guild.id,
            actor_id: executor ? executor.id : "system",
            actor_tag: executor ? executor.tag : "System",
            event_type: "ticket_closed_channel_deleted",
            event_data: { channel_id: channel.id },
          }).catch(() => null);

          if (ticket.voice_channel_id) {
            const vc = await channel.guild.channels.fetch(ticket.voice_channel_id).catch(() => null);
            if (vc) {
              await vc.delete("Ticket text channel was deleted").catch(() => null);
            }
            await setTicketVoiceChannel(ticket.id, null);
          }
        } else {
          const vcTicket = await getTicketByVoiceChannel(channel.id);
          if (vcTicket) {
            await setTicketVoiceChannel(vcTicket.id, null);
            await logTicketEvent({
              ticket_id: vcTicket.id,
              guild_id: channel.guild.id,
              actor_id: executor ? executor.id : "system",
              actor_tag: executor ? executor.tag : "System",
              event_type: "ticket_vc_deleted",
              event_data: { voice_channel_id: channel.id, reason: "Voice channel deleted in Discord" },
            }).catch(() => null);

            if (vcTicket.channel_id) {
              try {
                const textChannel = (await channel.guild.channels.fetch(vcTicket.channel_id).catch(() => null)) as TextChannel | null;
                if (textChannel && textChannel.isTextBased()) {
                  const recent = await textChannel.messages.fetch({ limit: 20 }).catch(() => null);
                  if (recent) {
                    const targetButtonId = `ticket_delete_vc:${vcTicket.id}`;
                    for (const [, msg] of recent) {
                      const hasVcButton = msg.components?.some((row: any) =>
                        row.components?.some((comp: any) =>
                          (comp.customId && comp.customId === targetButtonId) ||
                          (comp.data?.custom_id && comp.data.custom_id === targetButtonId)
                        )
                      );
                      if (hasVcButton) {
                        await msg.edit({ components: [] }).catch(() => null);
                      }
                    }
                  }
                }
              } catch (_) {}
            }
          }
        }
      } catch (err: any) {
        console.error("[EVENT CHANNEL DELETE TICKET CLEANUP ERROR]:", err);
      }

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
