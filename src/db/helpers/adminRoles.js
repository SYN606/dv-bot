import { AdminRole, AdminUser } from "../models/index.js";
import { ensureGuild, ensureGuildAndUser } from "./common.js";

const adminRoleCache = new Map();
const adminUserCache = new Map();

export function clearAdminRoleCache(guildId = null) {
  if (guildId) {
    adminRoleCache.delete(String(guildId));
  } else {
    adminRoleCache.clear();
  }
}

export function clearAdminUserCache(guildId = null) {
  if (guildId) {
    adminUserCache.delete(String(guildId));
  } else {
    adminUserCache.clear();
  }
}

export function clearAdminStaffCache(guildId = null) {
  clearAdminRoleCache(guildId);
  clearAdminUserCache(guildId);
}

// --- Admin Roles ---

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

// --- Admin Users ---

export async function getAdminUsers(guildId) {
  const gId = String(guildId);
  if (adminUserCache.has(gId)) {
    return adminUserCache.get(gId);
  }

  const records = await AdminUser.findAll({
    where: { guild_id: gId },
    attributes: ["user_id"],
  });

  const userIds = records.map((r) => String(r.user_id));
  adminUserCache.set(gId, userIds);
  return userIds;
}

export async function addAdminUser(guildId, userId) {
  const gId = String(guildId);
  const uId = String(userId);

  await ensureGuildAndUser(gId, uId);

  const [record, created] = await AdminUser.findOrCreate({
    where: { guild_id: gId, user_id: uId },
    defaults: { guild_id: gId, user_id: uId },
  });

  clearAdminUserCache(gId);
  return created;
}

export async function removeAdminUser(guildId, userId) {
  const gId = String(guildId);
  const uId = String(userId);

  const deleted = await AdminUser.destroy({
    where: { guild_id: gId, user_id: uId },
  });

  clearAdminUserCache(gId);
  return deleted > 0;
}

export async function isAdminUser(guildId, userId) {
  const users = await getAdminUsers(guildId);
  return users.includes(String(userId));
}
