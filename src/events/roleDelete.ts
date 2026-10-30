import { Events, type Role, AuditLogEvent, PermissionFlagsBits } from "discord.js";
import { sendModLog } from "../utils/modLog.js";

export default {
  name: Events.GuildRoleDelete,
  async execute(client: any, role: Role) {
    if (!role || !role.guild) return;

    try {
      let executor: any = null;
      if (role.guild.members.me?.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
        try {
          const logs = await role.guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.RoleDelete,
          });
          const entry = logs.entries.first();
          if (entry && entry.targetId === role.id && Date.now() - entry.createdTimestamp < 5000) {
            executor = entry.executor;
          }
        } catch (_) {}
      }

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
