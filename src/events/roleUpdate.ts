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
  name: Events.GuildRoleUpdate,
  async execute(client: any, oldRole: Role, newRole: Role) {
    if (!newRole || !newRole.guild) return;

    try {
      // 1. Check for Dangerous Permission Escalation (Zero-Tolerance)
      const isEveryone = newRole.id === newRole.guild.roles.everyone.id;
      const gainedDangerous = DANGEROUS_FLAGS.some(
        (flag) => !oldRole.permissions.has(flag) && newRole.permissions.has(flag)
      );

      if (gainedDangerous) {
        const settings = await getAntinukeSettings(newRole.guild.id);
        if (settings.enabled && settings.strict_dangerous_perms) {
          const executor = await ANTINUKE_AUDIT.resolveExecutor(
            newRole.guild,
            AuditLogEvent.RoleUpdate,
            newRole.id
          );

          if (executor) {
            const immune = await ANTINUKE_SERVICE.isImmune(newRole.guild, executor, ThreatType.DANGEROUS_PERMS);
            if (!immune || isEveryone) {
              // Immediately revert permissions back to safe state
              await newRole.setPermissions(
                oldRole.permissions.bitfield,
                "[DV-BOT ANTI-NUKE] Dangerous permission escalation reverted."
              ).catch(() => {});

              if (!immune) {
                await ANTINUKE_SERVICE.executeMitigation({
                  guild: newRole.guild,
                  executorId: executor.id,
                  threatType: ThreatType.DANGEROUS_PERMS,
                  details: `Attempted to grant dangerous permissions to role @${newRole.name}`,
                });
                return;
              }
            }
          }
        }
      }

      // 2. Update Topology Mirror
      TOPOLOGY_MIRROR.updateRole(newRole);

      // 3. Mod Log
      const changes: string[] = [];
      const extraFields: Record<string, any> = {
        Role: `<@&${newRole.id}>`,
        "Role ID": `\`${newRole.id}\``,
      };

      if (oldRole.name !== newRole.name) {
        changes.push(`**Name:** \`@${oldRole.name}\` ➔ \`@${newRole.name}\``);
      }
      if (oldRole.hexColor !== newRole.hexColor) {
        changes.push(`**Color:** \`${oldRole.hexColor}\` ➔ \`${newRole.hexColor}\``);
      }
      if (oldRole.hoist !== newRole.hoist) {
        changes.push(`**Hoisted:** \`${oldRole.hoist ? "Yes" : "No"}\` ➔ \`${newRole.hoist ? "Yes" : "No"}\``);
      }
      if (oldRole.mentionable !== newRole.mentionable) {
        changes.push(`**Mentionable:** \`${oldRole.mentionable ? "Yes" : "No"}\` ➔ \`${newRole.mentionable ? "Yes" : "No"}\``);
      }
      if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
        const addedPerms = newRole.permissions.missing(oldRole.permissions);
        const removedPerms = oldRole.permissions.missing(newRole.permissions);
        if (addedPerms.length > 0) {
          changes.push(`**Permissions Removed:** \`${addedPerms.slice(0, 5).join(", ")}${addedPerms.length > 5 ? ` +${addedPerms.length - 5} more` : ""}\``);
        }
        if (removedPerms.length > 0) {
          changes.push(`**Permissions Added:** \`${removedPerms.slice(0, 5).join(", ")}${removedPerms.length > 5 ? ` +${removedPerms.length - 5} more` : ""}\``);
        }
      }

      if (changes.length === 0) return;

      const executor = await ANTINUKE_AUDIT.resolveExecutor(newRole.guild, AuditLogEvent.RoleUpdate, newRole.id);

      await sendModLog({
        guild: newRole.guild,
        category: "ROLES",
        title: "Role Updated",
        level: "INFO",
        actor: executor || null,
        description: changes.join("\n"),
        extraFields,
      });
    } catch (err) {
      console.error("[EVENT ROLE UPDATE ERROR]:", err);
    }
  },
};
