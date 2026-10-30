import { Events, type Role, AuditLogEvent, PermissionFlagsBits } from "discord.js";
import { sendModLog } from "../utils/modLog.js";

export default {
  name: Events.GuildRoleUpdate,
  async execute(client: any, oldRole: Role, newRole: Role) {
    if (!newRole || !newRole.guild) return;

    try {
      const changes: string[] = [];
      const extraFields: Record<string, any> = {
        Role: `<@&${newRole.id}>`,
        "Role ID": `\`${newRole.id}\``,
      };

      // 1. Name
      if (oldRole.name !== newRole.name) {
        changes.push(`**Name:** \`@${oldRole.name}\` ➔ \`@${newRole.name}\``);
      }

      // 2. Color
      if (oldRole.hexColor !== newRole.hexColor) {
        changes.push(`**Color:** \`${oldRole.hexColor}\` ➔ \`${newRole.hexColor}\``);
      }

      // 3. Hoist
      if (oldRole.hoist !== newRole.hoist) {
        changes.push(`**Hoisted:** \`${oldRole.hoist ? "Yes" : "No"}\` ➔ \`${newRole.hoist ? "Yes" : "No"}\``);
      }

      // 4. Mentionable
      if (oldRole.mentionable !== newRole.mentionable) {
        changes.push(`**Mentionable:** \`${oldRole.mentionable ? "Yes" : "No"}\` ➔ \`${newRole.mentionable ? "Yes" : "No"}\``);
      }

      // 5. Permissions
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

      let executor: any = null;
      if (newRole.guild.members.me?.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
        try {
          const logs = await newRole.guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.RoleUpdate,
          });
          const entry = logs.entries.first();
          if (entry && entry.targetId === newRole.id && Date.now() - entry.createdTimestamp < 5000) {
            executor = entry.executor;
          }
        } catch (_) {}
      }

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
