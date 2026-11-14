import { Events, AuditLogEvent } from "discord.js";
import {
  VerificationConfig,
  DailyActivitySnapshot,
  TempbanRecord,
  AutoRoleConfig,
  WelcomeConfig,
} from "../db/models/index.js";
import { getTempbanConfig } from "../db/helpers/tempban.js";
import { ensureGuild } from "../db/helpers/common.js";
import { checkMemberSupporter } from "../handlers/supporterHandler.js";
import { buildWelcomePayload } from "../utils/welcomeFormatter.js";
import { sendModLog } from "../utils/modLog.js";
import { dispatchWelcomeOnTrigger } from "../services/welcomeService.js";
import { ANTINUKE_AUDIT } from "../services/antinukeAuditResolver.js";
import { ANTINUKE_SERVICE, ThreatType } from "../services/antinukeService.js";
import { getAntinukeSettings } from "../db/helpers/antinuke.js";

export default {
  name: Events.GuildMemberAdd,
  async execute(client, member) {
    if (!member.guild) return;

    const guildId = String(member.guild.id);

    // 0. Anti-Nuke: Intercept unauthorized rogue bot invitations
    if (member.user.bot) {
      try {
        const settings = await getAntinukeSettings(guildId);
        if (settings.enabled && settings.strict_anti_bot) {
          const executor = await ANTINUKE_AUDIT.resolveExecutor(
            member.guild,
            AuditLogEvent.BotAdd,
            member.id
          );

          if (executor) {
            const immune = await ANTINUKE_SERVICE.isImmune(member.guild, executor, ThreatType.BOT_ADD);
            if (!immune) {
              // Neutralize the rogue bot immediately
              await member.ban({ reason: `[DV-BOT ANTI-NUKE] Unauthorized bot invited by ${executor.tag} (${executor.id})` }).catch(() => {});

              // Neutralize the administrator who invited it
              await ANTINUKE_SERVICE.executeMitigation({
                guild: member.guild,
                executorId: executor.id,
                threatType: ThreatType.BOT_ADD,
                count: 1,
                details: `Invited unauthorized bot @${member.user.tag} (${member.id})`,
              });

              return; // Halt further onboarding
            }
          }
        }
      } catch (_) {}
    }
    const today = new Date().toISOString().split("T")[0];

    // 1. Telemetry: Increment daily joins count
    try {
      await ensureGuild(guildId);
      const [snapshot]: any = await DailyActivitySnapshot.findOrCreate({
        where: { guild_id: guildId, date: today },
        defaults: { guild_id: guildId, date: today, joins_count: 0 },
      });
      await snapshot.increment("joins_count");
    } catch (err) {
      console.error("[MEMBER ADD TELEMETRY ERROR]:", err);
    }

    // 2. Security Check: Re-apply Tempban Isolation Role if active
    try {
      const activeTempban = await TempbanRecord.findOne({
        where: { guild_id: guildId, user_id: String(member.id), active: true },
      });
      if (activeTempban) {
        const tempbanCfg = await getTempbanConfig(guildId);
        if (tempbanCfg && tempbanCfg.role_id) {
          const isolationRole = member.guild.roles.cache.get(String(tempbanCfg.role_id));
          const botMember = member.guild.members.me;
          if (isolationRole && botMember && isolationRole.position < botMember.roles.highest.position) {
            await member.roles.add(isolationRole, "Security enforcement: active tempban isolation re-applied on join").catch(() => {});
            return; // Do not assign unverified or standard roles to actively tempbanned users
          }
        }
      }
    } catch (err) {
      console.error("[TEMPBAN RE-APPLY ERROR]:", err);
    }

    // 3. Automated Verification Gate: Assign Unverified Role
    let hasVerificationGate = false;
    try {
      const config = await VerificationConfig.findByPk(guildId);
      if (config && config.enabled && config.unverified_role_id) {
        hasVerificationGate = true;
        const unverifiedRole = member.guild.roles.cache.get(String(config.unverified_role_id));
        const botMember = member.guild.members.me;

        if (unverifiedRole && botMember && unverifiedRole.position < botMember.roles.highest.position) {
          await member.roles.add(unverifiedRole, "Automatic verification gate: assigned unverified role on join").catch(() => {});
        }
      }
    } catch (err) {
      console.error("[AUTO-UNVERIFIED ROLE ERROR]:", err);
    }

    // 4. Default Legacy Auto-Role on Join (if configured)
    if (!hasVerificationGate) {
      try {
        const autoRole = await AutoRoleConfig.findByPk(guildId);
        if (autoRole && autoRole.role_id) {
          const role = member.guild.roles.cache.get(String(autoRole.role_id));
          const botMember = member.guild.members.me;
          if (role && botMember && role.position < botMember.roles.highest.position) {
            await member.roles.add(role, "Auto-Role: automatically assigned on server join").catch(() => {});
          }
        }
      } catch (err) {
        console.error("[AUTO-ROLE ON JOIN ERROR]:", err);
      }
    }

    // 5. Supporter Rewards Check on Join (Clan Tag & Vanity Status)
    try {
      await checkMemberSupporter(member, true);
    } catch (_) {}

    // 6. Welcome Gatekeeper Engine: Auto-Roles, Public Channel Welcome & DM Onboarding
    try {
      const welcomeCfg = await WelcomeConfig.findByPk(guildId);
      if (welcomeCfg) {
        // Dedicated Bot Auto-Role on Join
        if (member.user.bot && welcomeCfg.autorole_enabled && welcomeCfg.bot_role_id) {
          const botMember = member.guild.members.me;
          const bRole = member.guild.roles.cache.get(String(welcomeCfg.bot_role_id));
          if (bRole && botMember && bRole.position < botMember.roles.highest.position) {
            await member.roles.add(bRole, "Welcome Gatekeeper: assigned bot auto-role on join").catch(() => {});
          }
        }

        // Delegate human welcome dispatch and join roles based on configured trigger timing ("join", "onboarding", "verification")
        await dispatchWelcomeOnTrigger({
          guild: member.guild,
          member,
          trigger: "join",
        });
      }
    } catch (err) {
      console.error("[WELCOME GATEKEEPER ERROR]:", err);
    }

    // 7. Mod Log: Member / Bot Joined Dispatch
    try {
      const createdAgoMs = Date.now() - member.user.createdTimestamp;
      const createdDays = Math.floor(createdAgoMs / (1000 * 60 * 60 * 24));
      const isNewAccount = createdDays < 7;

      if (member.user.bot) {
        let botInviter: any = null;
        try {
          botInviter = await ANTINUKE_AUDIT.resolveExecutor(
            member.guild,
            AuditLogEvent.BotAdd,
            member.id
          );
        } catch (_) {}

        await sendModLog({
          guild: member.guild,
          category: "MEMBERS",
          eventType: "bot_added",
          title: "Bot Added",
          level: "WARNING",
          actor: botInviter || null,
          target: member.user,
          description: `Bot <@${member.id}> was added to the server.`,
          extraFields: {
            "Member Count": `${member.guild.memberCount || "N/A"} members`,
            "Account Created": `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
            "Bot Application": "Yes",
          },
        });
      } else {
        await sendModLog({
          guild: member.guild,
          category: "MEMBERS",
          eventType: "member_joined",
          title: "Member Joined",
          level: isNewAccount ? "WARNING" : "SUCCESS",
          target: member.user,
          description: `<@${member.id}> joined the server.`,
          extraFields: {
            "Member Count": `${member.guild.memberCount || "N/A"} members`,
            "Account Created": `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>${isNewAccount ? " ⚠️ (New Account)" : ""}`,
          },
        });
      }
    } catch (_) {}
  },
};
