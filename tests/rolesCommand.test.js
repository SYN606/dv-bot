import { describe, it, expect, vi } from "bun:test";
import { PermissionFlagsBits } from "discord.js";
import roleCommand from "../src/commands/admin/roles.js";

describe("Role Command Configuration", () => {
  it("should have correct metadata and be slash-only", () => {
    expect(roleCommand.name).toBe("role");
    expect(roleCommand.slashOnly).toBe(true);
    expect(roleCommand.modOnly).toBe(true);
    expect(roleCommand.requiredPermission).toBe(PermissionFlagsBits.ManageRoles);
    expect(roleCommand.category).toBe("Admin");
  });

  it("should define slashBuilder with add and remove subcommands", () => {
    expect(roleCommand.slashBuilder).toBeDefined();
    const json = roleCommand.slashBuilder.toJSON();

    expect(json.name).toBe("role");
    expect(json.dm_permission).toBe(false);

    const addSub = json.options.find((o) => o.name === "add");
    expect(addSub).toBeDefined();
    expect(addSub.options.some((o) => o.name === "user" && o.required)).toBe(true);
    expect(addSub.options.some((o) => o.name === "role" && o.required)).toBe(true);
    expect(addSub.options.some((o) => o.name === "silent" && !o.required)).toBe(true);

    const removeSub = json.options.find((o) => o.name === "remove");
    expect(removeSub).toBeDefined();
    expect(removeSub.options.some((o) => o.name === "user" && o.required)).toBe(true);
    expect(removeSub.options.some((o) => o.name === "role" && o.required)).toBe(true);
    expect(removeSub.options.some((o) => o.name === "silent" && !o.required)).toBe(true);
  });
});

describe("Role Command Execution Guards", () => {
  it("should ignore non-interaction contexts", async () => {
    const ctx = {
      isInteraction: false,
      defer: vi.fn(),
      reply: vi.fn(),
    };

    await roleCommand.execute(ctx);
    expect(ctx.defer).not.toHaveBeenCalled();
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  it("should reject execution outside a guild", async () => {
    let replyPayload = null;
    const ctx = {
      isInteraction: true,
      guild: null,
      reply: vi.fn(async (p) => {
        replyPayload = p;
      }),
    };

    await roleCommand.execute(ctx);
    expect(replyPayload.embeds[0].data.title).toContain("Command Error");
  });

  it("should reject attempts to modify @everyone role", async () => {
    let replyPayload = null;
    const roleId = "guild_123";
    const ctx = {
      isInteraction: true,
      subcommand: "add",
      user: { id: "mod_1", tag: "Mod#0001" },
      options: { user: "target_1", role: roleId },
      guild: {
        id: "guild_123",
        roles: {
          cache: new Map([[roleId, { id: roleId, name: "@everyone" }]]),
        },
      },
      reply: vi.fn(async (p) => {
        replyPayload = p;
      }),
    };

    await roleCommand.execute(ctx);
    expect(replyPayload.embeds[0].data.title).toContain("Invalid Role");
    expect(replyPayload.embeds[0].data.description).toContain("@everyone");
  });

  it("should reject attempts to modify managed (integration) roles", async () => {
    let replyPayload = null;
    const roleId = "role_bot_integration";
    const ctx = {
      isInteraction: true,
      subcommand: "add",
      user: { id: "mod_1", tag: "Mod#0001" },
      options: { user: "target_1", role: roleId },
      guild: {
        id: "guild_123",
        roles: {
          cache: new Map([[roleId, { id: roleId, name: "Bot Role", managed: true }]]),
        },
      },
      reply: vi.fn(async (p) => {
        replyPayload = p;
      }),
    };

    await roleCommand.execute(ctx);
    expect(replyPayload.embeds[0].data.title).toContain("Managed Role");
  });

  it("should reject if bot lacks ManageRoles permission", async () => {
    let replyPayload = null;
    const roleId = "role_1";
    const ctx = {
      isInteraction: true,
      subcommand: "add",
      user: { id: "mod_1", tag: "Mod#0001" },
      options: { user: "target_1", role: roleId },
      guild: {
        id: "guild_123",
        roles: {
          cache: new Map([[roleId, { id: roleId, name: "Member Role", position: 5 }]]),
        },
        members: {
          cache: new Map([["target_1", { id: "target_1", roles: { cache: new Map() } }]]),
          me: {
            id: "bot_1",
            roles: { highest: { position: 10 } },
            permissions: { has: () => false },
          },
        },
      },
      reply: vi.fn(async (p) => {
        replyPayload = p;
      }),
    };

    await roleCommand.execute(ctx);
    expect(replyPayload.embeds[0].data.title).toContain("Missing Permissions");
  });

  it("should reject if role position is higher than or equal to bot's highest role", async () => {
    let replyPayload = null;
    const roleId = "role_high";
    const ctx = {
      isInteraction: true,
      subcommand: "add",
      user: { id: "mod_1", tag: "Mod#0001" },
      options: { user: "target_1", role: roleId },
      guild: {
        id: "guild_123",
        roles: {
          cache: new Map([[roleId, { id: roleId, name: "Admin Role", position: 20 }]]),
        },
        members: {
          cache: new Map([["target_1", { id: "target_1", roles: { cache: new Map() } }]]),
          me: {
            id: "bot_1",
            roles: { highest: { position: 15 } },
            permissions: { has: () => true },
          },
        },
      },
      reply: vi.fn(async (p) => {
        replyPayload = p;
      }),
    };

    await roleCommand.execute(ctx);
    expect(replyPayload.embeds[0].data.title).toContain("Hierarchy Error");
  });

  it("should reject if target already has role on add", async () => {
    let replyPayload = null;
    const roleId = "role_1";
    const targetMember = {
      id: "target_1",
      roles: {
        cache: new Map([[roleId, { id: roleId }]]),
        highest: { position: 2 },
      },
    };

    const ctx = {
      isInteraction: true,
      subcommand: "add",
      user: { id: "mod_1", tag: "Mod#0001" },
      member: { roles: { highest: { position: 10 } } },
      options: { user: "target_1", role: roleId },
      guild: {
        id: "guild_123",
        ownerId: "owner_123",
        roles: {
          cache: new Map([[roleId, { id: roleId, name: "VIP", position: 5 }]]),
        },
        members: {
          cache: new Map([["target_1", targetMember]]),
          me: {
            id: "bot_1",
            roles: { highest: { position: 15 } },
            permissions: { has: () => true },
          },
        },
      },
      reply: vi.fn(async (p) => {
        replyPayload = p;
      }),
    };

    await roleCommand.execute(ctx);
    expect(replyPayload.embeds[0].data.title).toContain("Already Has Role");
  });

  it("should reject if target does not have role on remove", async () => {
    let replyPayload = null;
    const roleId = "role_1";
    const targetMember = {
      id: "target_1",
      roles: {
        cache: new Map(),
        highest: { position: 2 },
      },
    };

    const ctx = {
      isInteraction: true,
      subcommand: "remove",
      user: { id: "mod_1", tag: "Mod#0001" },
      member: { roles: { highest: { position: 10 } } },
      options: { user: "target_1", role: roleId },
      guild: {
        id: "guild_123",
        ownerId: "owner_123",
        roles: {
          cache: new Map([[roleId, { id: roleId, name: "VIP", position: 5 }]]),
        },
        members: {
          cache: new Map([["target_1", targetMember]]),
          me: {
            id: "bot_1",
            roles: { highest: { position: 15 } },
            permissions: { has: () => true },
          },
        },
      },
      reply: vi.fn(async (p) => {
        replyPayload = p;
      }),
    };

    await roleCommand.execute(ctx);
    expect(replyPayload.embeds[0].data.title).toContain("Missing Role");
  });

  it("should successfully assign role and respect silent flag", async () => {
    let replyPayload = null;
    const roleId = "role_1";
    const mockRole = { id: roleId, name: "VIP", position: 5 };
    const targetMember = {
      id: "target_1",
      user: { tag: "User#1234", id: "target_1" },
      roles: {
        cache: new Map(),
        highest: { position: 2 },
        add: vi.fn(async () => {}),
      },
    };

    const ctx = {
      isInteraction: true,
      subcommand: "add",
      defer: vi.fn(),
      user: { id: "mod_1", tag: "Mod#0001", username: "mod" },
      member: { roles: { highest: { position: 10 } } },
      options: { user: "target_1", role: roleId },
      interaction: {
        options: {
          getSubcommand: () => "add",
          getUser: () => ({ id: "target_1" }),
          getRole: () => mockRole,
          getMember: () => targetMember,
          getBoolean: (name) => (name === "silent" ? true : false),
        },
      },
      guild: {
        id: "guild_123",
        ownerId: "owner_123",
        roles: {
          cache: new Map([[roleId, mockRole]]),
        },
        members: {
          cache: new Map([["target_1", targetMember]]),
          me: {
            id: "bot_1",
            roles: { highest: { position: 15 } },
            permissions: { has: () => true },
          },
        },
      },
      reply: vi.fn(async (p) => {
        replyPayload = p;
      }),
    };

    await roleCommand.execute(ctx);
    expect(ctx.defer).toHaveBeenCalledWith({ ephemeral: true });
    expect(targetMember.roles.add).toHaveBeenCalledTimes(1);
    expect(targetMember.roles.add).toHaveBeenCalledWith("role_1", expect.any(String));
    expect(replyPayload.embeds[0].data.title).toContain("Role Assigned");
    expect(replyPayload.embeds[0].data.description).toContain("<@&role_1>");
    expect(replyPayload.ephemeral).toBe(true);
  });

  it("should successfully remove role with role.id string", async () => {
    let replyPayload = null;
    const roleId = "role_1";
    const mockRole = { id: roleId, name: "VIP", position: 5 };
    const targetMember = {
      id: "target_1",
      user: { tag: "User#1234", id: "target_1" },
      roles: {
        cache: new Map([[roleId, mockRole]]),
        highest: { position: 2 },
        remove: vi.fn(async () => {}),
      },
    };

    const ctx = {
      isInteraction: true,
      subcommand: "remove",
      defer: vi.fn(),
      user: { id: "mod_1", tag: "Mod#0001", username: "mod" },
      member: { roles: { highest: { position: 10 } } },
      options: { user: "target_1", role: roleId },
      interaction: {
        options: {
          getSubcommand: () => "remove",
          getUser: () => ({ id: "target_1" }),
          getRole: () => mockRole,
          getMember: () => targetMember,
          getBoolean: () => false,
        },
      },
      guild: {
        id: "guild_123",
        ownerId: "owner_123",
        roles: {
          cache: new Map([[roleId, mockRole]]),
        },
        members: {
          cache: new Map([["target_1", targetMember]]),
          me: {
            id: "bot_1",
            roles: { highest: { position: 15 } },
            permissions: { has: () => true },
          },
        },
      },
      reply: vi.fn(async (p) => {
        replyPayload = p;
      }),
    };

    await roleCommand.execute(ctx);
    expect(ctx.defer).toHaveBeenCalledWith({ ephemeral: false });
    expect(targetMember.roles.remove).toHaveBeenCalledTimes(1);
    expect(targetMember.roles.remove).toHaveBeenCalledWith("role_1", expect.any(String));
    expect(replyPayload.embeds[0].data.title).toContain("Role Removed");
    expect(replyPayload.embeds[0].data.description).toContain("<@&role_1>");
  });

  it("should allow administrators to manage lower roles for members with equal rank", async () => {
    let replyPayload = null;
    const roleId = "role_low";
    const mockRole = { id: roleId, name: "Event Role", position: 3 };
    const targetMember = {
      id: "admin_peer",
      user: { tag: "Peer#1234", id: "admin_peer" },
      roles: {
        cache: new Map(),
        highest: { position: 10 },
        add: vi.fn(async () => {}),
      },
    };

    const ctx = {
      isInteraction: true,
      subcommand: "add",
      defer: vi.fn(),
      user: { id: "admin_1", tag: "Admin#0001", username: "admin" },
      member: {
        id: "admin_1",
        roles: { highest: { position: 10 } },
        permissions: { has: (p) => p === PermissionFlagsBits.Administrator },
      },
      options: { user: "admin_peer", role: roleId },
      interaction: {
        options: {
          getSubcommand: () => "add",
          getUser: () => ({ id: "admin_peer" }),
          getRole: () => mockRole,
          getMember: () => targetMember,
          getBoolean: () => false,
        },
      },
      guild: {
        id: "guild_123",
        ownerId: "owner_123",
        roles: {
          cache: new Map([[roleId, mockRole]]),
        },
        members: {
          cache: new Map([["admin_peer", targetMember]]),
          me: {
            id: "bot_1",
            roles: { highest: { position: 15 } },
            permissions: { has: () => true },
          },
        },
      },
      reply: vi.fn(async (p) => {
        replyPayload = p;
      }),
    };

    await roleCommand.execute(ctx);
    expect(targetMember.roles.add).toHaveBeenCalledTimes(1);
    expect(replyPayload.embeds[0].data.title).toContain("Role Assigned");
  });
});
