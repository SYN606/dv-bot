import { Events, type Guild, AuditLogEvent } from "discord.js";
import { ANTINUKE_AUDIT } from "../services/antinukeAuditResolver.js";
import { ANTINUKE_SERVICE, ThreatType } from "../services/antinukeService.js";
import { TOPOLOGY_MIRROR } from "../services/topologyMirror.js";
import { getAntinukeSettings } from "../db/helpers/antinuke.js";

export default {
  name: Events.GuildUpdate,
  async execute(client: any, oldGuild: Guild, newGuild: Guild) {
    if (!oldGuild || !newGuild) return;

    try {
      const nameChanged = oldGuild.name !== newGuild.name;
      const vanityChanged = oldGuild.vanityURLCode !== newGuild.vanityURLCode;
      const iconChanged = oldGuild.icon !== newGuild.icon;

      if (!nameChanged && !vanityChanged && !iconChanged) {
        return;
      }

      const settings = await getAntinukeSettings(newGuild.id);
      if (!settings.enabled || !settings.strict_vanity_protect) {
        return;
      }

      const executor = await ANTINUKE_AUDIT.resolveExecutor(
        newGuild,
        AuditLogEvent.GuildUpdate,
        newGuild.id
      );

      if (executor) {
        const immune = await ANTINUKE_SERVICE.isImmune(newGuild, executor, ThreatType.VANITY_CHANGE);
        if (!immune) {
          await ANTINUKE_SERVICE.executeMitigation({
            guild: newGuild,
            executorId: executor.id,
            threatType: ThreatType.VANITY_CHANGE,
            count: 1,
            details: `Unauthorized server identity modification (Name: ${oldGuild.name} -> ${newGuild.name}, Vanity: ${oldGuild.vanityURLCode || "none"} -> ${newGuild.vanityURLCode || "none"})`,
          });

          // Revert server metadata
          if (nameChanged) {
            await newGuild.setName(oldGuild.name, "[DV-BOT ANTI-NUKE] Reverting unauthorized server name change").catch(() => {});
          }
          if (iconChanged && oldGuild.iconURL()) {
            await newGuild.setIcon(oldGuild.iconURL(), "[DV-BOT ANTI-NUKE] Reverting unauthorized icon change").catch(() => {});
          }
        }
      }
    } catch (_) {}
  },
};
