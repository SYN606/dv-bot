import { Events, type Role, AuditLogEvent, PermissionFlagsBits } from "discord.js";
import { sendModLog } from "../utils/modLog.js";
import { ANTINUKE_AUDIT } from "../services/antinukeAuditResolver.js";
import { ANTINUKE_SERVICE, ThreatType } from "../services/antinukeService.js";
import { TOPOLOGY_MIRROR } from "../services/topologyMirror.js";
import { getAntinukeSettings } from "../db/helpers/antinuke.js";

export default {
  name: Events.GuildRoleDelete,
  async execute(client: any, role: Role) {
    if (!role || !role.guild) return;

    try {
      // 1. Fetch role snapshot from topology mirror before cleanup
      const snapshot = TOPOLOGY_MIRROR.getRoleSnapshot(role.guild.id, role.id);

      // 2. Resolve executor safely
      const executor = await ANTINUKE_AUDIT.resolveExecutor(
        role.guild,
        AuditLogEvent.RoleDelete,
        role.id
      );

      // 3. Anti-Nuke Threat Interception
      if (executor) {
        const settings = await getAntinukeSettings(role.guild.id);
        if (settings.enabled) {
          const immune = await ANTINUKE_SERVICE.isImmune(role.guild, executor, ThreatType.ROLE_DELETE);
          if (!immune) {
            const { triggered, count } = ANTINUKE_SERVICE.registerAction(
              role.guild.id,
              executor.id,
              ThreatType.ROLE_DELETE,
              settings.role_delete_threshold,
              settings.window_seconds
            );

            if (triggered) {
              await ANTINUKE_SERVICE.executeMitigation({
                guild: role.guild,
                executorId: executor.id,
                threatType: ThreatType.ROLE_DELETE,
                count,
                roleSnapshot: snapshot,
                details: `Deleted role @${role.name} (${role.id})`,
              });
            }
          }
        }
      }

      // 4. Remove from topology mirror
      TOPOLOGY_MIRROR.removeRole(role.guild.id, role.id);

      // 5. Mod Log
      const extraFields: Record<string, any> = {
        "Role Name": `\`@${role.name}\``,
        "Role ID": `\`${role.id}\``,
      };

      await sendModLog({
        guild: role.guild,
        category: "ROLES",
        title: "Role Deleted",
        level: "WARNING",
        actor: executor || null,
        description: `Role \`@${role.name}\` was deleted.`,
        extraFields,
      });
    } catch (err) {
      console.error("[EVENT ROLE DELETE ERROR]:", err);
    }
  },
};
