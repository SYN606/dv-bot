import { Events, type GuildBan, AuditLogEvent } from "discord.js";
import { sendModLog } from "../utils/modLog.js";
import { ANTINUKE_AUDIT } from "../services/antinukeAuditResolver.js";

export default {
  name: Events.GuildBanRemove,
  async execute(client: any, ban: GuildBan) {
    if (!ban || !ban.guild || !ban.user) return;

    try {
      // Resolve executor safely
      const executor = await ANTINUKE_AUDIT.resolveExecutor(
        ban.guild,
        AuditLogEvent.MemberBanRemove,
        ban.user.id
      );

      // Mod Log
      await sendModLog({
        guild: ban.guild,
        category: "UNBAN",
        eventType: "member_unbanned",
        title: "Member Unbanned",
        level: "SUCCESS",
        actor: executor || null,
        target: ban.user,
        description: `Member <@${ban.user.id}> (${ban.user.tag}) was unbanned.`,
        extraFields: {
          User: `<@${ban.user.id}> (\`${ban.user.id}\`)`,
          Reason: ban.reason || "*No reason provided*",
        },
      });
    } catch (err) {
      console.error("[EVENT GUILD BAN REMOVE ERROR]:", err);
    }
  },
};
