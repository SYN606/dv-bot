import { Events, type Role, AuditLogEvent, PermissionFlagsBits } from "discord.js";
import { sendModLog } from "../utils/modLog.js";
import { ANTINUKE_AUDIT } from "../services/antinukeAuditResolver.js";
import { ANTINUKE_SERVICE, ThreatType } from "../services/antinukeService.js";
import { TOPOLOGY_MIRROR } from "../services/topologyMirror.js";
import { getAntinukeSettings } from "../db/helpers/antinuke.js";

const DANGEROUS_FLAGS = [
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.MentionEveryone,
];

export default {
  name: Events.GuildRoleCreate,
  async execute(client: any, role: Role) {
    if (!role || !role.guild) return;

    try {
      // 1. Update in-memory topology mirror
      TOPOLOGY_MIRROR.updateRole(role);

      // 2. Resolve executor safely
      const executor = await ANTINUKE_AUDIT.resolveExecutor(
        role.guild,
        AuditLogEvent.RoleCreate,
        role.id
      );

      // 3. Anti-Nuke Threat Interception
      if (executor) {
        const settings = await getAntinukeSettings(role.guild.id);
        if (settings.enabled) {
          // Zero-Tolerance Check for dangerous permissions on new role
          const hasDangerousPerms = DANGEROUS_FLAGS.some((flag) => role.permissions.has(flag));
          if (hasDangerousPerms && settings.strict_dangerous_perms) {
            const immune = await ANTINUKE_SERVICE.isImmune(role.guild, executor, ThreatType.DANGEROUS_PERMS);
            if (!immune) {
              await role.delete("[DV-BOT ANTI-NUKE] Unauthorized administrative role creation").catch(() => {});
              await ANTINUKE_SERVICE.executeMitigation({
                guild: role.guild,
                executorId: executor.id,
                threatType: ThreatType.DANGEROUS_PERMS,
                details: `Created administrative role @${role.name} with dangerous permissions`,
              });
              return;
            }
          }

          const immune = await ANTINUKE_SERVICE.isImmune(role.guild, executor, ThreatType.ROLE_CREATE);
          if (!immune) {
            const { triggered, count } = ANTINUKE_SERVICE.registerAction(
              role.guild.id,
              executor.id,
              ThreatType.ROLE_CREATE,
              settings.role_create_threshold,
              settings.window_seconds
            );

            if (triggered) {
              await ANTINUKE_SERVICE.executeMitigation({
                guild: role.guild,
                executorId: executor.id,
                threatType: ThreatType.ROLE_CREATE,
                count,
                details: `Created spam role @${role.name} (${role.id})`,
              });

              // Clean up spam role
              await role.delete("[DV-BOT ANTI-NUKE] Mass role creation spam").catch(() => {});
              return;
            }
          }
        }
      }

      // 4. Mod Log
      const hexColor = role.hexColor && role.hexColor !== "#000000" ? role.hexColor : "Default";
      const extraFields: Record<string, any> = {
        Role: `<@&${role.id}> (\`${role.name}\`)`,
        "Role ID": `\`${role.id}\``,
        Color: `\`${hexColor}\``,
        Hoist: role.hoist ? "Yes (Separated)" : "No",
        Mentionable: role.mentionable ? "Yes" : "No",
      };

      await sendModLog({
        guild: role.guild,
        category: "ROLES",
        title: "Role Created",
        level: "INFO",
        actor: executor || null,
        description: `New role <@&${role.id}> was created.`,
        extraFields,
      });
    } catch (err) {
      console.error("[EVENT ROLE CREATE ERROR]:", err);
    }
  },
};
