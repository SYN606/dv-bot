import { describe, expect, it, beforeAll } from "bun:test";
import { PermissionFlagsBits } from "discord.js";
import {
  isBotAdmin,
  hasConfigAccess,
  PROTECTED_COMMANDS,
} from "../src/core/permissions.js";
import { initDb } from "../src/db/index.js";
import { addAdminUser, addAdminRole } from "../src/db/helpers/adminRoles.js";

describe("Permissions Hierarchy Tests", () => {
  beforeAll(async () => {
    await initDb();
  });
  it("should contain all critical safeguard commands in PROTECTED_COMMANDS", () => {
    for (const cmd of ["help", "adminrole", "command", "disable", "enable"]) {
      expect(PROTECTED_COMMANDS.has(cmd)).toBe(true);
    }
  });

  it("should grant full authority to Server Owner", async () => {
    const guild = { id: "10", ownerId: "user_owner" };
    const member = { id: "user_owner", permissions: new Set() };
    const ctx = { guild, member, user: { id: "user_owner" } };

    expect(await isBotAdmin(ctx)).toBe(true);
    expect(await hasConfigAccess(ctx)).toBe(true);
  });

  it("should grant authority to Administrators", async () => {
    const guild = { id: "10", ownerId: "user_owner" };
    const member = {
      id: "admin_user",
      permissions: {
        has: (flag) => flag === PermissionFlagsBits.Administrator,
      },
    };
    const ctx = { guild, member, user: { id: "admin_user" } };

    expect(await isBotAdmin(ctx)).toBe(true);
    expect(await hasConfigAccess(ctx)).toBe(true);
  });

  it("should deny authority to regular members without permissions", async () => {
    const guild = { id: "10", ownerId: "user_owner" };
    const member = {
      id: "regular_user",
      permissions: {
        has: () => false,
      },
      roles: { cache: new Map() },
    };
    const ctx = { guild, member, user: { id: "regular_user" } };

    expect(await isBotAdmin(ctx)).toBe(false);
    expect(await hasConfigAccess(ctx)).toBe(false);
  });

  it("should grant authority to designated Admin Users directly", async () => {
    const guildId = "99001";
    const customAdminUserId = "900999000111222333";
    await addAdminUser(guildId, customAdminUserId);

    const guild = { id: guildId, ownerId: "user_owner" };
    const member = {
      id: customAdminUserId,
      permissions: { has: () => false },
      roles: { cache: new Map() },
    };
    const ctx = { guild, member, user: { id: customAdminUserId } };

    expect(await isBotAdmin(ctx)).toBe(true);
    expect(await hasConfigAccess(ctx)).toBe(true);
  });

  it("should grant authority to members holding designated Admin Roles", async () => {
    const guildId = "99002";
    const customAdminRoleId = "880099000111222333";
    await addAdminRole(guildId, customAdminRoleId);

    const rolesMap = new Map();
    rolesMap.set(customAdminRoleId, { id: customAdminRoleId, name: "Bot Moderator" });

    const guild = { id: guildId, ownerId: "user_owner" };
    const member = {
      id: "regular_user_with_role",
      permissions: { has: () => false },
      roles: { cache: rolesMap },
    };
    const ctx = { guild, member, user: { id: "regular_user_with_role" } };

    expect(await isBotAdmin(ctx)).toBe(true);
    expect(await hasConfigAccess(ctx)).toBe(true);
  });
});
