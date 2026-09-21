import { describe, expect, it, beforeAll } from "bun:test";
import { initDb } from "../src/db/index.js";
import {
  addRoleRestriction,
  removeRoleRestriction,
  addChannelRestriction,
  removeChannelRestriction,
  getGuildAcl,
  isExecutionAllowed,
  invalidateAclCache,
} from "../src/db/helpers/acl.js";
import {
  initAfkCache,
  getAfkStatus,
  setAfkStatus,
  removeAfkStatus,
} from "../src/db/helpers/afk.js";
import {
  initStickyCache,
  getStickyMessage,
  setStickyMessage,
  removeStickyMessage,
} from "../src/db/helpers/sticky.js";

describe("Unified ACL & Hot-Path Cache Tests", () => {
  const guildId = "9901";
  const channelId = "9902";
  const blockedChannelId = "9903";
  const whitelistedChannelId = "9904";
  const regularRoleId = "8801";
  const blacklistedRoleId = "8802";
  const whitelistedRoleId = "8803";

  beforeAll(async () => {
    await initDb();
    invalidateAclCache();
  });

  it("should add and retrieve role and channel restrictions", async () => {
    await addRoleRestriction(guildId, blacklistedRoleId, "all", "deny");
    await addChannelRestriction(guildId, blockedChannelId, "all", "deny");

    const acl = await getGuildAcl(guildId);
    expect(acl.roles.some((r) => r.roleId === blacklistedRoleId && r.type === "deny")).toBe(true);
    expect(acl.channels.some((c) => c.channelId === blockedChannelId && c.type === "deny")).toBe(true);
  });

  it("should block execution when user has a blacklisted role", async () => {
    const mockMember = {
      id: "7701",
      roles: {
        cache: new Map([
          [regularRoleId, { id: regularRoleId }],
          [blacklistedRoleId, { id: blacklistedRoleId }],
        ]),
      },
      permissions: { has: () => false },
    };

    const res = await isExecutionAllowed(guildId, channelId, mockMember, "ping");
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain("blacklisted");
  });

  it("should block execution when invoked in a blacklisted channel", async () => {
    const mockMember = {
      id: "7702",
      roles: {
        cache: new Map([[regularRoleId, { id: regularRoleId }]]),
      },
      permissions: { has: () => false },
    };

    const res = await isExecutionAllowed(guildId, blockedChannelId, mockMember, "ping");
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain("cannot be used in this channel");
  });

  it("should enforce channel whitelists when configured", async () => {
    await addChannelRestriction(guildId, whitelistedChannelId, "ping", "allow");

    const mockMember = {
      id: "7703",
      roles: {
        cache: new Map([[regularRoleId, { id: regularRoleId }]]),
      },
      permissions: { has: () => false },
    };

    // Invoked in non-whitelisted channel
    const blockedRes = await isExecutionAllowed(guildId, channelId, mockMember, "ping");
    expect(blockedRes.allowed).toBe(false);
    expect(blockedRes.reason).toContain("designated bot channels");

    // Invoked in whitelisted channel
    const allowedRes = await isExecutionAllowed(guildId, whitelistedChannelId, mockMember, "ping");
    expect(allowedRes.allowed).toBe(true);
  });

  it("should always allow Server Administrators to bypass ACL restrictions", async () => {
    const adminMember = {
      id: "7704",
      roles: {
        cache: new Map([[blacklistedRoleId, { id: blacklistedRoleId }]]),
      },
      permissions: { has: (perm) => true },
    };

    const res = await isExecutionAllowed(guildId, blockedChannelId, adminMember, "ping");
    expect(res.allowed).toBe(true);
  });

  it("should support hot-path zero-query AFK caching", async () => {
    const testUserId = "6601";

    // Not AFK -> should return null immediately without finding anything
    const notAfk = await getAfkStatus(testUserId, guildId);
    expect(notAfk).toBe(null);

    // Set AFK
    await setAfkStatus(testUserId, guildId, "Taking a break", false);
    const isAfk = await getAfkStatus(testUserId, guildId);
    expect(isAfk).not.toBe(null);
    expect(isAfk.afk_reason).toBe("Taking a break");

    // Remove AFK
    await removeAfkStatus(testUserId, guildId);
    const removedAfk = await getAfkStatus(testUserId, guildId);
    expect(removedAfk).toBe(null);
  });

  it("should support hot-path zero-query Sticky caching", async () => {
    const randomChannelId = "5501";

    // Non-sticky channel returns null
    const noSticky = await getStickyMessage(guildId, randomChannelId);
    expect(noSticky).toBe(null);

    // Set sticky
    await setStickyMessage(guildId, randomChannelId, "Read rules!");
    const sticky = await getStickyMessage(guildId, randomChannelId);
    expect(sticky).not.toBe(null);
    expect(sticky.sticky_content).toBe("Read rules!");

    // Remove sticky
    await removeStickyMessage(guildId, randomChannelId);
    const removedSticky = await getStickyMessage(guildId, randomChannelId);
    expect(removedSticky).toBe(null);
  });
});
