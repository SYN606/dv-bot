import { Events, type GuildMember } from "discord.js";
import { VCRoleConfig } from "../db/models/index.js";
import { checkGuildTag, clearUserClanCache } from "../handlers/supporterHandler.js";
import { sendModLog } from "../utils/modLog.js";
import { dispatchWelcomeOnTrigger } from "../services/welcomeService.js";

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
          target: newMember.user,
          description: `Roles were modified for <@${newMember.id}>.`,
          extraFields,
        });
      }
    } catch (_) {}
  },
};
