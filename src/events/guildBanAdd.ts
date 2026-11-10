import { Events, type GuildBan, AuditLogEvent } from "discord.js";
import { sendModLog } from "../utils/modLog.js";
import { ANTINUKE_AUDIT } from "../services/antinukeAuditResolver.js";
import { ANTINUKE_SERVICE, ThreatType } from "../services/antinukeService.js";
import { getAntinukeSettings } from "../db/helpers/antinuke.js";

export default {
  name: Events.GuildBanAdd,
  async execute(client: any, ban: GuildBan) {
    if (!ban || !ban.guild || !ban.user) return;

    try {
      // 1. Resolve executor safely
      const executor = await ANTINUKE_AUDIT.resolveExecutor(
        ban.guild,
        AuditLogEvent.MemberBanAdd,
        ban.user.id
      );

      // 2. Anti-Nuke Threat Interception
      if (executor) {
        const settings = await getAntinukeSettings(ban.guild.id);
        if (settings.enabled) {
          const immune = await ANTINUKE_SERVICE.isImmune(ban.guild, executor, ThreatType.MEMBER_BAN);
          if (!immune) {
            const { triggered, count } = ANTINUKE_SERVICE.registerAction(
              ban.guild.id,
              executor.id,
              ThreatType.MEMBER_BAN,
              settings.member_ban_threshold,
              settings.window_seconds
            );

            if (triggered) {
              await ANTINUKE_SERVICE.executeMitigation({
                guild: ban.guild,
                executorId: executor.id,
                threatType: ThreatType.MEMBER_BAN,
                count,
                details: `Banned member <@${ban.user.id}> (${ban.user.tag})`,
              });

              // Automatically unban the victim if auto_recreate_assets is active
              if (settings.auto_recreate_assets) {
                await ban.guild.bans.remove(ban.user.id, "[DV-BOT ANTI-NUKE] Auto-unbanning victim of mass ban nuke.").catch(() => {});
              }
              return;
            }
          }
        }
      }

      // 3. Mod Log
      await sendModLog({
        guild: ban.guild,
        category: "MODERATION",
        title: "Member Banned",
        level: "WARNING",
        actor: executor || null,
        target: ban.user,
        description: `Member <@${ban.user.id}> (${ban.user.tag}) was banned.`,
        extraFields: {
          User: `<@${ban.user.id}> (\`${ban.user.id}\`)`,
          Reason: ban.reason || "*No reason provided*",
        },
      });
    } catch (err) {
      console.error("[EVENT GUILD BAN ADD ERROR]:", err);
    }
  },
};
