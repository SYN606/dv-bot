/**
 * Helper to determine user access level and permissions for a guild
 */
export function getGuildAccess(guild, isSuperuser = false) {
  if (!guild) return { canManage: false, accessLevel: "unknown" };

  let perms = 0n;
  try {
    if (guild.permissions != null && guild.permissions !== "") {
      perms = BigInt(guild.permissions);
    }
  } catch {
    perms = 0n;
  }

  const isOwner = guild.owner === true;
  const hasAdministrator = (perms & 8n) === 8n;
  const hasManageGuild = (perms & 32n) === 32n;

  const canManage = isOwner || hasAdministrator || hasManageGuild || guild.canManage === true || isSuperuser === true;

  let accessLevel = "Member";
  if (isOwner) accessLevel = "Owner";
  else if (isSuperuser) accessLevel = "Superuser";
  else if (hasAdministrator) accessLevel = "Administrator";
  else if (hasManageGuild || guild.canManage) accessLevel = "Manager";

  return {
    canManage,
    isOwner,
    hasAdministrator,
    hasManageGuild,
    accessLevel
  };
}

/**
 * Helper to determine if bot is present in guild
 */
export function isBotInGuild(guild, botGuildIds) {
  if (!guild) return false;
  if (guild.botPresent === true) return true;
  
  if (botGuildIds instanceof Set) {
    return botGuildIds.has(String(guild.id));
  }
  
  return Array.isArray(botGuildIds) && botGuildIds.map(String).includes(String(guild.id));
}
