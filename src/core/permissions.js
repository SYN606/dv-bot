import { PermissionFlagsBits } from "discord.js";
import { getAdminRoles } from "../db/helpers/adminRoles.js";

export const PROTECTED_COMMANDS = new Set([
  "help",
  "adminrole",
  "command",
  "disable",
  "enable",
]);

function extractMemberAndGuild(target) {
  if (!target) return { member: null, guild: null };

  // Context or Interaction
  const guild = target.guild || null;
  const member = target.member || (target.author && guild ? guild.members.cache.get(target.author.id) : null);
  const user = target.user || target.author || (member ? member.user : null);

  return { member, guild, user };
}

export async function isBotAdmin(target) {
  const { member, guild, user } = extractMemberAndGuild(target);
  if (!guild || !member) return false;

  // 1. Guild Owner always has full authority
  if (guild.ownerId === (user?.id || member.id)) {
    return true;
  }

  // 2. Administrator permission
  if (member.permissions && member.permissions.has(PermissionFlagsBits.Administrator)) {
    return true;
  }

  // 3. Database configured Admin Roles
  const adminRoleIds = await getAdminRoles(guild.id);
  if (adminRoleIds.length > 0 && member.roles && member.roles.cache) {
    for (const roleId of adminRoleIds) {
      if (member.roles.cache.has(roleId)) {
        return true;
      }
    }
  }

  return false;
}

export async function hasConfigAccess(target) {
  const { member, guild } = extractMemberAndGuild(target);
  if (!guild || !member) return false;

  if (await isBotAdmin(target)) {
    return true;
  }

  if (member.permissions && member.permissions.has(PermissionFlagsBits.ManageGuild)) {
    return true;
  }

  return false;
}

export async function hasModerationAccess(target, requiredPermission = null) {
  const { member, guild } = extractMemberAndGuild(target);
  if (!guild || !member) return false;

  if (await isBotAdmin(target)) {
    return true;
  }

  if (!member.permissions) return false;

  if (requiredPermission) {
    const permBit = typeof requiredPermission === "string" ? PermissionFlagsBits[requiredPermission] : requiredPermission;
    if (permBit && member.permissions.has(permBit)) {
      return true;
    }
  }

  // General moderation permissions
  return (
    member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
    member.permissions.has(PermissionFlagsBits.BanMembers) ||
    member.permissions.has(PermissionFlagsBits.KickMembers) ||
    member.permissions.has(PermissionFlagsBits.ManageMessages)
  );
}

export async function hasRoleManagementAccess(target) {
  const { member, guild } = extractMemberAndGuild(target);
  if (!guild || !member) return false;

  if (await isBotAdmin(target)) return true;

  return !!(member.permissions && member.permissions.has(PermissionFlagsBits.ManageRoles));
}
