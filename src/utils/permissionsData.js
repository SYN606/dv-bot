import { PermissionFlagsBits } from "discord.js";

export const PERMISSION_RISKS = {
  Administrator: { name: "Administrator", level: "red", flag: PermissionFlagsBits.Administrator },
  ManageRoles: { name: "Manage Roles", level: "red", flag: PermissionFlagsBits.ManageRoles },
  ManageChannels: { name: "Manage Channels", level: "red", flag: PermissionFlagsBits.ManageChannels },
  BanMembers: { name: "Ban Members", level: "red", flag: PermissionFlagsBits.BanMembers },
  KickMembers: { name: "Kick Members", level: "red", flag: PermissionFlagsBits.KickMembers },
  ManageWebhooks: { name: "Manage Webhooks", level: "red", flag: PermissionFlagsBits.ManageWebhooks },
  ManageGuild: { name: "Manage Server", level: "yellow", flag: PermissionFlagsBits.ManageGuild },
  ModerateMembers: { name: "Timeout Members", level: "yellow", flag: PermissionFlagsBits.ModerateMembers },
  ManageMessages: { name: "Manage Messages", level: "yellow", flag: PermissionFlagsBits.ManageMessages },
  MentionEveryone: { name: "Mention Everyone", level: "yellow", flag: PermissionFlagsBits.MentionEveryone },
  ManageThreads: { name: "Manage Threads", level: "yellow", flag: PermissionFlagsBits.ManageThreads },
  ManageNicknames: { name: "Manage Nicknames", level: "yellow", flag: PermissionFlagsBits.ManageNicknames },
  MoveMembers: { name: "Move Members", level: "yellow", flag: PermissionFlagsBits.MoveMembers },
  MuteMembers: { name: "Mute Members", level: "yellow", flag: PermissionFlagsBits.MuteMembers },
  DeafenMembers: { name: "Deafen Members", level: "yellow", flag: PermissionFlagsBits.DeafenMembers },
  ManageEvents: { name: "Manage Events", level: "green", flag: PermissionFlagsBits.ManageEvents },
  ViewAuditLog: { name: "View Audit Log", level: "green", flag: PermissionFlagsBits.ViewAuditLog },
  PrioritySpeaker: { name: "Priority Speaker", level: "green", flag: PermissionFlagsBits.PrioritySpeaker },
  ManageEmojisAndStickers: { name: "Manage Emojis & Stickers", level: "green", flag: PermissionFlagsBits.ManageExpressions || PermissionFlagsBits.ManageEmojisAndStickers },
  CreateInstantInvite: { name: "Create Invite", level: "green", flag: PermissionFlagsBits.CreateInstantInvite },
};

export function analyzeMemberPermissions(member) {
  const perms = member.permissions;
  const found = [];

  for (const key of Object.keys(PERMISSION_RISKS)) {
    const permData = PERMISSION_RISKS[key];
    if (perms.has(permData.flag)) {
      // Find sources
      const sources = [];
      for (const role of member.roles.cache.values()) {
        if (role.permissions.has(permData.flag)) {
          sources.push(role.name);
        }
      }

      found.push({
        permission: permData.name,
        level: permData.level,
        roles: sources.length > 0 ? sources : ["Direct / Owner"],
      });
    }
  }

  return found;
}
