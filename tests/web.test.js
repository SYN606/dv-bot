import { describe, expect, it, beforeAll } from "bun:test";
import { Collection } from "discord.js";
import { createWebApp } from "../src/web/server.js";
import { createSessionToken, verifySessionToken } from "../src/web/auth.js";
import { initDb } from "../src/db/index.js";

describe("Web Dashboard & API Tests", () => {
  let app;
  let validCookie;
  const testGuildId = "1001";

  beforeAll(async () => {
    await initDb();

    // Mock client with Collection-backed caches
    const mockChannels = new Collection();
    mockChannels.set("2001", {
      id: "2001",
      name: "general",
      type: 0,
      send: async () => ({ id: "mock_sticky_2001" }),
      messages: { fetch: async () => null },
    });
    mockChannels.set("2002", { id: "2002", name: "media-channel", type: 0, send: async () => ({ id: "mock_sticky_123" }) });

    const mockRoles = new Collection();
    mockRoles.set("3001", { id: "3001", name: "Verified", hexColor: "#57f287" });
    mockRoles.set("3002", { id: "3002", name: "Unverified", hexColor: "#99aab5" });

    const mockCommands = new Collection();
    mockCommands.set("ping", { name: "ping", description: "Latency test", category: "utility" });
    mockCommands.set("avatar", { name: "avatar", description: "User avatar", category: "utility" });
    mockCommands.set("help", { name: "help", description: "Bot help command", category: "utility" });
    mockCommands.set("userstats", { name: "userstats", description: "View member statistics", category: "analytics" });
    mockCommands.set("kick", { name: "kick", description: "Kick a member", category: "moderation", modOnly: true });

    const mockEmojis = new Collection();
    mockEmojis.set("5001", {
      id: "5001",
      name: "pepe_cool",
      animated: false,
      imageURL: () => "https://cdn.discordapp.com/emojis/5001.png",
      toString: () => "<:pepe_cool:5001>",
    });
    mockEmojis.set("5002", {
      id: "5002",
      name: "party_blob",
      animated: true,
      imageURL: () => "https://cdn.discordapp.com/emojis/5002.gif",
      toString: () => "<a:party_blob:5002>",
    });

    const mockMembers = new Collection();
    mockMembers.set("900100000000000001", {
      id: "900100000000000001",
      displayName: "ServerOwnerUser",
      user: {
        id: "900100000000000001",
        username: "ServerOwnerUser",
        bot: false,
        displayAvatarURL: () => "https://cdn.discordapp.com/avatars/owner.png",
      },
    });
    mockMembers.set("900200000000000002", {
      id: "900200000000000002",
      displayName: "StaffUser",
      user: {
        id: "900200000000000002",
        username: "StaffUser",
        bot: false,
        displayAvatarURL: () => null,
      },
    });
    mockMembers.set("900300000000000003", {
      id: "900300000000000003",
      displayName: "MusicBot",
      user: {
        id: "900300000000000003",
        username: "MusicBot",
        bot: true,
        displayAvatarURL: () => null,
      },
    });

    const mockGuilds = new Collection();
    mockGuilds.set(testGuildId, {
      id: testGuildId,
      name: "Test Server",
      ownerId: "900100000000000001",
      channels: { cache: mockChannels },
      roles: { cache: mockRoles },
      emojis: { cache: mockEmojis },
      members: {
        cache: mockMembers,
        fetch: async (id) => mockMembers.get(id) || null,
        search: async ({ query, limit }) => {
          const q = query.toLowerCase();
          const filtered = new Collection();
          for (const [id, m] of mockMembers) {
            if (
              m.displayName.toLowerCase().includes(q) ||
              m.user.username.toLowerCase().includes(q) ||
              id.includes(query)
            ) {
              filtered.set(id, m);
              if (filtered.size >= limit) break;
            }
          }
          return filtered;
        },
      },
    });

    const mockClient = {
      guilds: { cache: mockGuilds },
      commands: mockCommands,
    };

    app = createWebApp(mockClient);

    const token = createSessionToken({
      user: { id: "9001", username: "DashboardAdmin", discriminator: "0001" },
    });

    validCookie = `dv_session=${token}`;
    
    const { apiCache } = await import("../src/web/routes/cache.js");
    apiCache.set("user_guilds:9001", [
      {
        id: testGuildId,
        name: "Test Server",
        permissions: "8", // Administrator
        owner: true,
      },
    ]);
  });

  // 1. Session Token Unit Tests
  it("should create and verify HMAC-signed session tokens", () => {
    const payload = { userId: "12345", role: "admin" };
    const token = createSessionToken(payload);
    expect(token).toContain(".");

    const verified = verifySessionToken(token);
    expect(verified).toMatchObject(payload);
    expect(verified.exp).toBeGreaterThan(Date.now());

    // Tampered signature
    const tampered = token.slice(0, -4) + "abcd";
    expect(verifySessionToken(tampered)).toBeNull();

    // Invalid formats
    expect(verifySessionToken("")).toBeNull();
    expect(verifySessionToken(null)).toBeNull();
    expect(verifySessionToken("randomstringwithoutperiod")).toBeNull();
  });

  // 2. Landing & Authentication Guards
  it("GET / should return 200 HTML", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("The Modern Discord Bot Dashboard");
    expect(html).toContain("https://digitalvigital.fun");
    expect(html).toContain("Digital vigital Network");
    expect(html).toContain("https://syn606.wtf");
    expect(html).toContain("SYN 606 | cybermind Networks");
  });

  it("GET /api/guilds/1001/meta without auth should return 401", async () => {
    const res = await app.request("/api/guilds/1001/meta");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Unauthorized");
  });

  it("GET /dashboard without auth should redirect to /auth/login", async () => {
    const res = await app.request("/dashboard");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/auth/login");
  });

  it("public routes (/docs, /terms, /privacy, /error) should return 200 HTML without auth", async () => {
    for (const route of ["/docs", "/documentation", "/terms", "/terms-of-service", "/privacy", "/privacy-policy", "/error"]) {
      const res = await app.request(route);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/html");
    }
  });

  it("GET /api/commands should return public documentation for all slash and prefix commands", async () => {
    const res = await app.request("/api/commands");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.count).toBeGreaterThanOrEqual(5);
    expect(Array.isArray(data.commands)).toBe(true);

    const kickCmd = data.commands.find((c) => c.name === "kick");
    expect(kickCmd).toBeDefined();
    expect(kickCmd.category).toBe("moderation");
    expect(kickCmd.prefixUsage).toContain("!kick");
    expect(kickCmd.slashUsage).toBe("/kick");
    expect(kickCmd.modOnly).toBe(true);

    const pingCmd = data.commands.find((c) => c.name === "ping");
    expect(pingCmd).toBeDefined();
    expect(pingCmd.category).toBe("utility");
  });

  it("GET /api/me should return current user session and guilds", async () => {
    const unauthRes = await app.request("/api/me");
    expect(unauthRes.status).toBe(200);
    const unauthBody = await unauthRes.json();
    expect(unauthBody.user).toBeNull();

    const authRes = await app.request("/api/me", {
      headers: { Cookie: validCookie },
    });
    expect(authRes.status).toBe(200);
    const authBody = await authRes.json();
    expect(authBody.user.id).toBe("9001");
    expect(authBody.user.username).toBe("DashboardAdmin");
    expect(authBody.guilds.length).toBeGreaterThan(0);
  });

  it("GET /api/bot should return bot user profile, avatar, and banner", async () => {
    const res = await app.request("/api/bot");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("avatar");
    expect(body).toHaveProperty("banner");
    expect(body).toHaveProperty("username");
    expect(body).toHaveProperty("guildIds");
  });

  // 3. Authenticated Guild Metadata
  it("GET /api/guilds/1001/meta with auth should return channels, roles, and emojis", async () => {
    const res = await app.request("/api/guilds/1001/meta", {
      headers: { Cookie: validCookie },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.channels)).toBe(true);
    expect(Array.isArray(body.roles)).toBe(true);
    expect(Array.isArray(body.emojis)).toBe(true);
    expect(body.channels.some((c) => c.name === "general")).toBe(true);
    expect(body.emojis.length).toBe(2);
    expect(body.emojis.some((e) => e.name === "pepe_cool")).toBe(true);
  });

  it("GET /api/guilds/1001/emojis should return server custom emojis list", async () => {
    const res = await app.request("/api/guilds/1001/emojis", {
      headers: { Cookie: validCookie },
    });
    expect(res.status).toBe(200);
    const emojis = await res.json();
    expect(Array.isArray(emojis)).toBe(true);
    expect(emojis.length).toBe(2);
    expect(emojis.some((e) => e.name === "party_blob" && e.animated)).toBe(true);
  });

  // 4. Verification Setup API
  it("POST /api/guilds/1001/verification should save configuration", async () => {
    const res = await app.request("/api/guilds/1001/verification", {
      method: "POST",
      headers: {
        Cookie: validCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        verify_channel_id: "2001",
        verified_role_id: "3001",
        unverified_role_id: "3002",
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(String(body.config.verified_role_id)).toBe("3001");
  });

  it("GET /api/guilds/1001/verification should retrieve saved config", async () => {
    const res = await app.request("/api/guilds/1001/verification", {
      headers: { Cookie: validCookie },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(String(body.verified_role_id)).toBe("3001");
  });

  // 5. Media-Only Setup API
  it("POST & GET & DELETE /api/guilds/1001/media_only should manage media channels", async () => {
    // Add media channel with whitelist_role_id, image_only, auto_mute, and post_sticky_notice
    const postRes = await app.request("/api/guilds/1001/media_only", {
      method: "POST",
      headers: {
        Cookie: validCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel_id: "2002",
        image_only: true,
        auto_mute: true,
        whitelist_role_id: "3002",
        post_sticky_notice: true,
      }),
    });
    expect(postRes.status).toBe(200);

    // List media channels
    const getRes = await app.request("/api/guilds/1001/media_only", {
      headers: { Cookie: validCookie },
    });
    expect(getRes.status).toBe(200);
    const channels = await getRes.json();
    const created = channels.find((c) => String(c.channel_id) === "2002");
    expect(created).toBeDefined();
    expect(Boolean(created.image_only)).toBe(true);
    expect(Boolean(created.auto_mute)).toBe(true);
    expect(String(created.whitelist_role_id)).toBe("3002");
    expect(String(created.sticky_message_id)).toBe("mock_sticky_123");

    // Delete media channel
    const delRes = await app.request("/api/guilds/1001/media_only/2002", {
      method: "DELETE",
      headers: { Cookie: validCookie },
    });
    expect(delRes.status).toBe(200);
  });

  // 6. Channel Command Restrictions API
  it("POST /api/guilds/1001/commands/toggle should toggle command state", async () => {
    // Disable ping in channel 2001
    const disableRes = await app.request("/api/guilds/1001/commands/toggle", {
      method: "POST",
      headers: {
        Cookie: validCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel_id: "2001",
        command_name: "ping",
        enable: false,
      }),
    });
    expect(disableRes.status).toBe(200);

    // Verify it is listed under disabled
    const getRes = await app.request("/api/guilds/1001/commands?channel_id=2001", {
      headers: { Cookie: validCookie },
    });
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.disabled).toContain("ping");

    // Re-enable ping
    const enableRes = await app.request("/api/guilds/1001/commands/toggle", {
      method: "POST",
      headers: {
        Cookie: validCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel_id: "2001",
        command_name: "ping",
        enable: true,
      }),
    });
    expect(enableRes.status).toBe(200);

    // Verify it is no longer listed under disabled
    const getResAfter = await app.request("/api/guilds/1001/commands?channel_id=2001", {
      headers: { Cookie: validCookie },
    });
    const getBodyAfter = await getResAfter.json();
    expect(getBodyAfter.disabled).not.toContain("ping");

    // Verify rejection when attempting to disable a protected command
    const rejectRes = await app.request("/api/guilds/1001/commands/toggle", {
      method: "POST",
      headers: {
        Cookie: validCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel_id: "2001",
        command_name: "help",
        enable: false,
      }),
    });
    expect(rejectRes.status).toBe(400);

    // Verify GET returns modules grouping and stats
    expect(getBodyAfter.modules).toBeDefined();
    expect(getBodyAfter.modules.some((m) => m.id === "utility")).toBe(true);
    expect(getBodyAfter.stats).toBeDefined();
    expect(getBodyAfter.stats.total).toBe(5);
    expect(getBodyAfter.stats.protected).toBe(1); // help is protected

    // Module Bulk Toggle: disable entire 'utility' module
    const bulkDisableRes = await app.request("/api/guilds/1001/commands/module_toggle", {
      method: "POST",
      headers: {
        Cookie: validCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel_id: "2001",
        category: "utility",
        enable: false,
      }),
    });
    expect(bulkDisableRes.status).toBe(200);
    const bulkDisableBody = await bulkDisableRes.json();
    expect(bulkDisableBody.success).toBe(true);
    expect(bulkDisableBody.affectedCount).toBe(2); // ping and avatar (help skipped)
    expect(bulkDisableBody.skippedProtected).toBe(1); // help

    // Verify channel commands disabled state
    const checkBulkRes = await app.request("/api/guilds/1001/commands?channel_id=2001", {
      headers: { Cookie: validCookie },
    });
    const checkBulkBody = await checkBulkRes.json();
    expect(checkBulkBody.disabled).toContain("ping");
    expect(checkBulkBody.disabled).toContain("avatar");
    expect(checkBulkBody.disabled).not.toContain("help");

    // Module Bulk Toggle: re-enable entire 'utility' module
    const bulkEnableRes = await app.request("/api/guilds/1001/commands/module_toggle", {
      method: "POST",
      headers: {
        Cookie: validCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel_id: "2001",
        category: "utility",
        enable: true,
      }),
    });
    expect(bulkEnableRes.status).toBe(200);

    const checkFinalRes = await app.request("/api/guilds/1001/commands?channel_id=2001", {
      headers: { Cookie: validCookie },
    });
    const checkFinalBody = await checkFinalRes.json();
    expect(checkFinalBody.disabled).not.toContain("ping");
    expect(checkFinalBody.disabled).not.toContain("avatar");

    // Guild-wide toggle: disable 'ping' across the entire server (no channel_id)
    const guildDisableRes = await app.request("/api/guilds/1001/commands/toggle", {
      method: "POST",
      headers: {
        Cookie: validCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        command_name: "ping",
        enable: false,
        // Note: no channel_id → guild-wide scope
      }),
    });
    expect(guildDisableRes.status).toBe(200);
    const guildDisableBody = await guildDisableRes.json();
    expect(guildDisableBody.success).toBe(true);
    expect(guildDisableBody.scope).toBe("guild");

    // Verify guild-wide disabled appears in GET response
    const guildCheckRes = await app.request("/api/guilds/1001/commands", {
      headers: { Cookie: validCookie },
    });
    const guildCheckBody = await guildCheckRes.json();
    expect(guildCheckBody.guildDisabled).toContain("ping");
    // The merged disabled list should also contain it
    expect(guildCheckBody.disabled).toContain("ping");
    // Each command in modules should have guildDisabled flag
    const utilMod = guildCheckBody.modules.find((m) => m.id === "utility");
    const pingCmd = utilMod?.commands.find((cmd) => cmd.name === "ping");
    expect(pingCmd?.guildDisabled).toBe(true);

    // Protected command rejection (guild-wide)
    const guildRejectRes = await app.request("/api/guilds/1001/commands/toggle", {
      method: "POST",
      headers: {
        Cookie: validCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        command_name: "help",
        enable: false,
      }),
    });
    expect(guildRejectRes.status).toBe(400);

    // Guild-wide re-enable 'ping'
    const guildEnableRes = await app.request("/api/guilds/1001/commands/toggle", {
      method: "POST",
      headers: {
        Cookie: validCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        command_name: "ping",
        enable: true,
      }),
    });
    expect(guildEnableRes.status).toBe(200);
    expect((await guildEnableRes.json()).scope).toBe("guild");

    // Verify guild-wide re-enabled
    const guildFinalRes = await app.request("/api/guilds/1001/commands", {
      headers: { Cookie: validCookie },
    });
    const guildFinalBody = await guildFinalRes.json();
    expect(guildFinalBody.guildDisabled).not.toContain("ping");
  });

  // 7. Autoresponder API
  it("POST & GET & TOGGLE & DELETE /api/guilds/1001/autoresponder should manage rules and reactions", async () => {
    const postRes = await app.request("/api/guilds/1001/autoresponder", {
      method: "POST",
      headers: {
        Cookie: validCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        trigger: "rules_query",
        reply: "Please read the server rules!",
        matchMode: "exact",
        reactions: ["<:pepe_cool:5001>", "🔥"],
        isEmbed: true,
        embedTitle: "Server Guidelines",
      }),
    });
    expect(postRes.status).toBe(200);
    const postBody = await postRes.json();
    const responderId = postBody.responder.responder_id;

    // Verify GET returns rule with reactions and aliases
    const getRes = await app.request("/api/guilds/1001/autoresponder", {
      headers: { Cookie: validCookie },
    });
    expect(getRes.status).toBe(200);
    const rules = await getRes.json();
    const createdRule = rules.find((r) => r.trigger_phrase === "rules_query");
    expect(createdRule).toBeDefined();
    expect(createdRule.trigger).toBe("rules_query");
    expect(createdRule.reactions).toContain("<:pepe_cool:5001>");
    expect(createdRule.reactions).toContain("🔥");
    expect(createdRule.enabled).toBe(true);

    // Edit existing rule via PUT
    const putRes = await app.request(`/api/guilds/1001/autoresponder/${responderId}`, {
      method: "PUT",
      headers: {
        Cookie: validCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        trigger: "rules_query_edited",
        reply: "Updated guidelines text",
        matchMode: "startswith",
        reactions: ["✅"],
      }),
    });
    expect(putRes.status).toBe(200);

    // Fetch single rule via GET /api/guilds/1001/autoresponder/:id
    const getSingleRes = await app.request(`/api/guilds/1001/autoresponder/${responderId}`, {
      headers: { Cookie: validCookie },
    });
    expect(getSingleRes.status).toBe(200);
    const singleRule = await getSingleRes.json();
    expect(singleRule.trigger).toBe("rules_query_edited");
    expect(singleRule.reply).toBe("Updated guidelines text");
    expect(singleRule.match_mode).toBe("startswith");
    expect(singleRule.reactions).toEqual(["✅"]);

    // Test reaction-only autoresponder (no reply, but valid reactions)
    const reactionOnlyRes = await app.request("/api/guilds/1001/autoresponder", {
      method: "POST",
      headers: {
        Cookie: validCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        trigger: "gg",
        matchMode: "exact",
        reactions: ["🏆", "🎉"],
      }),
    });
    expect(reactionOnlyRes.status).toBe(200);
    const reactionOnlyBody = await reactionOnlyRes.json();
    expect(reactionOnlyBody.success).toBe(true);

    // Test regex syntax error rejection
    const invalidRegexRes = await app.request("/api/guilds/1001/autoresponder", {
      method: "POST",
      headers: {
        Cookie: validCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        trigger: "[unclosed_regex(",
        reply: "should fail",
        matchMode: "regex",
      }),
    });
    expect(invalidRegexRes.status).toBe(400);

    // Clean up reaction-only rule
    await app.request(`/api/guilds/1001/autoresponder/${reactionOnlyBody.id}`, {
      method: "DELETE",
      headers: { Cookie: validCookie },
    });

    // Delete original rule
    const delRes = await app.request(`/api/guilds/1001/autoresponder/${responderId}`, {
      method: "DELETE",
      headers: { Cookie: validCookie },
    });
    expect(delRes.status).toBe(200);
  });

  // 8. Staff Admin Roles API
  it("POST & GET & DELETE /api/guilds/1001/admin_roles should manage admin roles", async () => {
    // Supports camelCase roleId
    const postRes = await app.request("/api/guilds/1001/admin_roles", {
      method: "POST",
      headers: {
        Cookie: validCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ roleId: "3001" }),
    });
    expect(postRes.status).toBe(200);

    const getRes = await app.request("/api/guilds/1001/admin_roles", {
      headers: { Cookie: validCookie },
    });
    expect(getRes.status).toBe(200);
    const body = await getRes.json();
    expect(body.adminRoles.some((r) => r.id === "3001")).toBe(true);
    expect(body.roleIds).toContain("3001");

    const delRes = await app.request("/api/guilds/1001/admin_roles/3001", {
      method: "DELETE",
      headers: { Cookie: validCookie },
    });
    expect(delRes.status).toBe(200);
  });

  // 8a. Guild Members Endpoint
  it("GET /api/guilds/1001/members should list server members and support search", async () => {
    // List all
    const allRes = await app.request("/api/guilds/1001/members", {
      headers: { Cookie: validCookie },
    });
    expect(allRes.status).toBe(200);
    const allMembers = await allRes.json();
    expect(Array.isArray(allMembers)).toBe(true);
    expect(allMembers.length).toBeGreaterThanOrEqual(2);

    const owner = allMembers.find((m) => m.id === "900100000000000001");
    expect(owner).toBeDefined();
    expect(owner.isOwner).toBe(true);

    const botMember = allMembers.find((m) => m.id === "900300000000000003");
    expect(botMember).toBeDefined();
    expect(botMember.isBot).toBe(true);

    // Search query
    const searchRes = await app.request("/api/guilds/1001/members?q=Staff", {
      headers: { Cookie: validCookie },
    });
    expect(searchRes.status).toBe(200);
    const searchResults = await searchRes.json();
    expect(searchResults.some((m) => m.username === "StaffUser")).toBe(true);
  });

  // 8b. Staff Admin Users API
  it("POST & GET & DELETE /api/guilds/1001/admin_users should manage individual admin users and protect owner", async () => {
    const adminUserId = "900200000000000002";

    // 1. Rejection on invalid snowflake ID
    const invalidRes = await app.request("/api/guilds/1001/admin_users", {
      method: "POST",
      headers: {
        Cookie: validCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId: "invalid_not_a_snowflake" }),
    });
    expect(invalidRes.status).toBe(400);
    const invalidBody = await invalidRes.json();
    expect(invalidBody.error).toContain("Snowflake");

    // 2. Add valid admin user
    const addRes = await app.request("/api/guilds/1001/admin_users", {
      method: "POST",
      headers: {
        Cookie: validCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId: adminUserId }),
    });
    expect(addRes.status).toBe(200);
    const addBody = await addRes.json();
    expect(addBody.success).toBe(true);

    // 3. Verify in GET /api/guilds/1001/admin_roles
    const getRes = await app.request("/api/guilds/1001/admin_roles", {
      headers: { Cookie: validCookie },
    });
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.userIds).toContain(adminUserId);
    expect(getData.adminUsers.some((u) => u.id === adminUserId)).toBe(true);
    expect(getData.ownerId).toBe("900100000000000001");

    // 4. Server Owner Protection: Cannot delete server owner
    const deleteOwnerRes = await app.request("/api/guilds/1001/admin_users/900100000000000001", {
      method: "DELETE",
      headers: { Cookie: validCookie },
    });
    expect(deleteOwnerRes.status).toBe(403);
    const deleteOwnerBody = await deleteOwnerRes.json();
    expect(deleteOwnerBody.error).toContain("Server Owner");

    // 5. Delete admin user
    const deleteRes = await app.request(`/api/guilds/1001/admin_users/${adminUserId}`, {
      method: "DELETE",
      headers: { Cookie: validCookie },
    });
    expect(deleteRes.status).toBe(200);
    const deleteBody = await deleteRes.json();
    expect(deleteBody.success).toBe(true);

    // 6. Verify removed
    const getAfterRes = await app.request("/api/guilds/1001/admin_roles", {
      headers: { Cookie: validCookie },
    });
    const getAfterData = await getAfterRes.json();
    expect(getAfterData.userIds).not.toContain(adminUserId);
  });

  // 8b. Sticky Channel Messages API
  it("POST & GET & DELETE /api/guilds/1001/sticky should manage sticky messages", async () => {
    // Add sticky with camelCase channelId
    const postRes = await app.request("/api/guilds/1001/sticky", {
      method: "POST",
      headers: {
        Cookie: validCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channelId: "2001",
        content: "Important channel announcement!",
      }),
    });
    expect(postRes.status).toBe(200);

    // Get all sticky messages for guild
    const getRes = await app.request("/api/guilds/1001/sticky", {
      headers: { Cookie: validCookie },
    });
    expect(getRes.status).toBe(200);
    const body = await getRes.json();
    expect(Array.isArray(body.stickyList)).toBe(true);
    const stickyItem = body.stickyList.find((s) => s.channel_id === "2001");
    expect(stickyItem).toBeDefined();
    expect(stickyItem.channelName).toBe("general");
    expect(stickyItem.last_message_id).toBe("mock_sticky_2001");

    // Get specific channel sticky message
    const getSingleRes = await app.request("/api/guilds/1001/sticky/2001", {
      headers: { Cookie: validCookie },
    });
    expect(getSingleRes.status).toBe(200);
    const single = await getSingleRes.json();
    expect(single.sticky_content).toBe("Important channel announcement!");

    // Delete sticky message
    const delRes = await app.request("/api/guilds/1001/sticky/2001", {
      method: "DELETE",
      headers: { Cookie: validCookie },
    });
    expect(delRes.status).toBe(200);
  });

  // 8c. General Modlog, VC Role, and Tempban Config API
  it("POST & GET /api/guilds/1001/config should manage modlog and vcrole settings", async () => {
    const postRes = await app.request("/api/guilds/1001/config", {
      method: "POST",
      headers: {
        Cookie: validCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        modLogChannelId: "2001",
        vcRoleId: "3001",
        tempbanRoleId: "4001",
      }),
    });
    expect(postRes.status).toBe(200);

    const getRes = await app.request("/api/guilds/1001/config", {
      headers: { Cookie: validCookie },
    });
    expect(getRes.status).toBe(200);
    const body = await getRes.json();
    expect(body.modLogChannelId).toBe("2001");
    expect(body.vcRoleId).toBe("3001");
    expect(body.tempbanRoleId).toBe("4001");

    // Dedicated /tempban endpoints
    const dedicatedGet = await app.request("/api/guilds/1001/tempban", {
      headers: { Cookie: validCookie },
    });
    expect(dedicatedGet.status).toBe(200);
    const tempbanBody = await dedicatedGet.json();
    expect(tempbanBody.role_id).toBe("4001");
    expect(tempbanBody.enabled).toBe(true);

    // Clear tempban role via dedicated endpoint
    const clearRes = await app.request("/api/guilds/1001/tempban", {
      method: "POST",
      headers: {
        Cookie: validCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ roleId: "" }),
    });
    expect(clearRes.status).toBe(200);
    const clearBody = await clearRes.json();
    expect(clearBody.enabled).toBe(false);
    expect(clearBody.role_id).toBeNull();
  });

  // 9. Analytics API & Timeline
  it("GET /api/guilds/1001/analytics should return 7-day timeline and leaderboards", async () => {
    const res = await app.request("/api/guilds/1001/analytics", {
      headers: { Cookie: validCookie },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.timeframe).toBe(7);
    expect(Array.isArray(body.timeline)).toBe(true);
    expect(body.timeline.length).toBe(7);
    expect(body.summary).toBeDefined();
    expect(body.summary.retentionRate).toBeDefined();
    expect(body.insights).toBeDefined();
    expect(body.insights.primeWindow).toBeDefined();
    expect(Array.isArray(body.channelBreakdown)).toBe(true);
    expect(Array.isArray(body.hourlyDistribution)).toBe(true);
    expect(body.hourlyDistribution.length).toBe(24);
    expect(Array.isArray(body.topChatters)).toBe(true);
    expect(Array.isArray(body.topVoice)).toBe(true);

    // Test 14-day timeframe
    const res14 = await app.request("/api/guilds/1001/analytics?days=14", {
      headers: { Cookie: validCookie },
    });
    expect(res14.status).toBe(200);
    const body14 = await res14.json();
    expect(body14.timeframe).toBe(14);
    expect(body14.timeline.length).toBe(14);
  });

  // 10. API In-Memory Cache Unit Tests
  it("ApiCache should cache, expire, and invalidate by guild prefix", async () => {
    const { ApiCache } = await import("../src/web/routes/cache.js");
    const cache = new ApiCache(50); // 50ms TTL

    cache.set("guild:1001:test", { data: 123 }, 50);
    cache.set("guild:1001:meta", { name: "Test" }, 50);
    cache.set("guild:2002:meta", { name: "Other" }, 50);

    expect(cache.get("guild:1001:test")).toEqual({ data: 123 });
    expect(cache.get("guild:2002:meta")).toEqual({ name: "Other" });

    // Invalidate guild 1001
    cache.invalidateGuild("1001");
    expect(cache.get("guild:1001:test")).toBeNull();
    expect(cache.get("guild:1001:meta")).toBeNull();
    expect(cache.get("guild:2002:meta")).toEqual({ name: "Other" });

    // Test TTL expiry
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(cache.get("guild:2002:meta")).toBeNull();
  });

  // 11. OAuth2 Dynamic Redirect Unit Test
  it("OAuth redirect URI should adapt dynamically to environment and contain valid callback", async () => {
    const { getOAuthUrl } = await import("../src/web/auth.js");
    const oauthUrl = getOAuthUrl();
    expect(oauthUrl).toContain("response_type=code");
    expect(oauthUrl).toContain("scope=identify+guilds");
    expect(decodeURIComponent(oauthUrl)).toContain("/auth/callback");
  });
});

