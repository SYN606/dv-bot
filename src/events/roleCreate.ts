import { Events, type Role, AuditLogEvent, PermissionFlagsBits } from "discord.js";
import { sendModLog } from "../utils/modLog.js";

export default {
  name: Events.GuildRoleCreate,
  async execute(client: any, role: Role) {
    if (!role || !role.guild) return;

    try {
      let executor: any = null;
      if (role.guild.members.me?.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
        try {
          const logs = await role.guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.RoleCreate,
          });
          const entry = logs.entries.first();
          if (entry && entry.targetId === role.id && Date.now() - entry.createdTimestamp < 5000) {
            executor = entry.executor;
          }
        } catch (_) {}
      }

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
