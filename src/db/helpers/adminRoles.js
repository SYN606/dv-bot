import { AdminRole } from "../models/index.js";
import { ensureGuild } from "./common.js";

const adminRoleCache = new Map();

export function clearAdminRoleCache(guildId = null) {
  if (guildId) {
    adminRoleCache.delete(String(guildId));
  } else {
    adminRoleCache.clear();
  }
}

export async function getAdminRoles(guildId) {
  const gId = String(guildId);
  if (adminRoleCache.has(gId)) {
    return adminRoleCache.get(gId);
  }

  const records = await AdminRole.findAll({
    where: { guild_id: gId },
    attributes: ["role_id"],
  });

  const roleIds = records.map((r) => String(r.role_id));
  adminRoleCache.set(gId, roleIds);
  return roleIds;
}

export async function addAdminRole(guildId, roleId) {
  const gId = String(guildId);
  const rId = String(roleId);

  await ensureGuild(gId);

  const [record, created] = await AdminRole.findOrCreate({
    where: { guild_id: gId, role_id: rId },
    defaults: { guild_id: gId, role_id: rId },
  });

  clearAdminRoleCache(gId);
  return created;
}

export async function removeAdminRole(guildId, roleId) {
  const gId = String(guildId);
  const rId = String(roleId);

  const deleted = await AdminRole.destroy({
    where: { guild_id: gId, role_id: rId },
  });

  clearAdminRoleCache(gId);
  return deleted > 0;
}

export async function isAdminRole(guildId, roleId) {
  const roles = await getAdminRoles(guildId);
  return roles.includes(String(roleId));
}
