import { Events, type GuildMember, AuditLogEvent, PermissionFlagsBits } from "discord.js";
import { VCRoleConfig } from "../db/models/index.js";
import { checkGuildTag, clearUserClanCache } from "../handlers/supporterHandler.js";
import { sendModLog } from "../utils/modLog.js";
import { dispatchWelcomeOnTrigger } from "../services/welcomeService.js";
import { ANTINUKE_AUDIT } from "../services/antinukeAuditResolver.js";
import { ANTINUKE_SERVICE, ThreatType } from "../services/antinukeService.js";
import { getAntinukeSettings } from "../db/helpers/antinuke.js";

const DANGEROUS_PERMS = [
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.KickMembers,
];

export default {
  name: Events.GuildMemberUpdate,
  once: false,
  async execute(client: any, oldMember: GuildMember, newMember: GuildMember) {
    if (!oldMember || !newMember || !newMember.guild) return;

    const avatarChanged = oldMember.avatar !== newMember.avatar;
    const bannerChanged = oldMember.banner !== newMember.banner;
    const nicknameChanged = oldMember.nickname !== newMember.nickname;
    const displayNameChanged = oldMember.displayName !== newMember.displayName;

    // Guild Member Updates can also contain clan/identity or name changes
    if (avatarChanged || bannerChanged || nicknameChanged || displayNameChanged) {
      clearUserClanCache(newMember.id);
      await checkGuildTag(newMember, true);
    }

    // Discord Membership Screening & Onboarding Completion Detection
    if (oldMember.pending && !newMember.pending) {
      try {
        await dispatchWelcomeOnTrigger({
          guild: newMember.guild,
          member: newMember,
          trigger: "onboarding",
        });
      } catch (_) {}
    }

    // Role Changes Detection & Logging
    try {
      const oldRoles = oldMember.roles.cache;
      const newRoles = newMember.roles.cache;

      let addedRoles = newRoles.filter((r) => !oldRoles.has(r.id) && r.id !== newMember.guild.id);
      let removedRoles = oldRoles.filter((r) => !newRoles.has(r.id) && r.id !== newMember.guild.id);

      // Suppress automated VC auto-role assignments from role logs
      try {
        const vcConfig: any = await VCRoleConfig.findByPk(newMember.guild.id);
        if (vcConfig && vcConfig.role_id) {
          const vcRoleId = String(vcConfig.role_id);
          addedRoles = addedRoles.filter((r) => r.id !== vcRoleId);
          removedRoles = removedRoles.filter((r) => r.id !== vcRoleId);
        }
      } catch (_) {}

      if (addedRoles.size > 0 || removedRoles.size > 0) {
        // Resolve the moderator/executor who added or removed the roles
        const executor = await ANTINUKE_AUDIT.resolveExecutor(
          newMember.guild,
          AuditLogEvent.MemberRoleUpdate,
          newMember.id
        );

        // Anti-Nuke: Zero-tolerance check for unauthorized administrative role grants
        if (addedRoles.size > 0) {
          const dangerousAddedRoles = addedRoles.filter((r) =>
            DANGEROUS_PERMS.some((perm) => r.permissions.has(perm))
          );

          if (dangerousAddedRoles.size > 0) {
            try {
              const settings = await getAntinukeSettings(newMember.guild.id);
              if (settings.enabled && settings.strict_dangerous_perms && executor) {
                const immune = await ANTINUKE_SERVICE.isImmune(
                  newMember.guild,
                  executor,
                  ThreatType.DANGEROUS_PERMS
                );

                if (!immune) {
                  // 1. Instantly strip the dangerous role(s) from the target member
                  await newMember.roles.remove(
                    dangerousAddedRoles,
                    "[DV-BOT ANTI-NUKE] Unauthorized administrative role assignment reverted."
                  ).catch(() => {});

                  // 2. Mitigate the rogue moderator who granted the role
                  await ANTINUKE_SERVICE.executeMitigation({
                    guild: newMember.guild,
                    executorId: executor.id,
                    threatType: ThreatType.DANGEROUS_PERMS,
                    details: `Unauthorized grant of privileged role(s) (${dangerousAddedRoles.map((r) => '@' + r.name).join(', ')}) to @${newMember.user.tag || newMember.user.username}`,
                  });
                  return;
                }
              }
            } catch (_) {}
          }
        }

        const extraFields: Record<string, any> = {
          Member: `<@${newMember.id}> (\`${newMember.user.tag || newMember.user.username}\`)`,
        };

        if (addedRoles.size > 0) {
          extraFields["Roles Added"] = addedRoles.map((r) => `<@&${r.id}>`).join(", ");
        }
        if (removedRoles.size > 0) {
          extraFields["Roles Removed"] = removedRoles.map((r) => `<@&${r.id}>`).join(", ");
        }

        await sendModLog({
          guild: newMember.guild,
          category: "MEMBERS",
          eventType: "member_roles_updated",
          title: "Member Roles Updated",
          level: "INFO",
          actor: executor || null,
          target: newMember.user,
          description: `Roles were modified for <@${newMember.id}>.`,
          extraFields,
        });
      }
    } catch (_) {}
  },
};
