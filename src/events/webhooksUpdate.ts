import { Events, type GuildChannel, AuditLogEvent } from "discord.js";
import { ANTINUKE_AUDIT } from "../services/antinukeAuditResolver.js";
import { ANTINUKE_SERVICE, ThreatType } from "../services/antinukeService.js";
import { getAntinukeSettings } from "../db/helpers/antinuke.js";

export default {
  name: Events.WebhooksUpdate,
  async execute(client: any, channel: GuildChannel) {
    if (!channel || !channel.guild) return;

    try {
      const guild = channel.guild;
      const settings = await getAntinukeSettings(guild.id);
      if (!settings.enabled) return;

      const executor = await ANTINUKE_AUDIT.resolveExecutor(
        guild,
        AuditLogEvent.WebhookCreate,
        channel.id
      );

      if (executor) {
        const immune = await ANTINUKE_SERVICE.isImmune(guild, executor, ThreatType.WEBHOOK_CREATE);
        if (!immune) {
          const { triggered, count } = ANTINUKE_SERVICE.registerAction(
            guild.id,
            executor.id,
            ThreatType.WEBHOOK_CREATE,
            settings.webhook_create_threshold,
            settings.window_seconds
          );

          if (triggered) {
            await ANTINUKE_SERVICE.executeMitigation({
              guild,
              executorId: executor.id,
              threatType: ThreatType.WEBHOOK_CREATE,
              count,
              details: `Exceeded webhook creation limit in #${channel.name}`,
            });

            // Clean up rogue webhooks in the channel
            if (typeof (channel as any).fetchWebhooks === "function") {
              const webhooks = await (channel as any).fetchWebhooks().catch(() => null);
              if (webhooks) {
                for (const webhook of webhooks.values()) {
                  if (webhook.owner?.id === executor.id) {
                    await webhook.delete("[DV-BOT ANTI-NUKE] Mass webhook creation spam").catch(() => {});
                  }
                }
              }
            }
          }
        }
      }
    } catch (_) {}
  },
};
