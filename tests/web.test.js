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
    mockChannels.set("2001", { id: "2001", name: "general", type: 0, send: async () => {} });
    mockChannels.set("2002", { id: "2002", name: "media-channel", type: 0, send: async () => {} });

    const mockRoles = new Collection();
    mockRoles.set("3001", { id: "3001", name: "Verified", hexColor: "#57f287" });
    mockRoles.set("3002", { id: "3002", name: "Unverified", hexColor: "#99aab5" });

    const mockCommands = new Collection();
    mockCommands.set("ping", { name: "ping", description: "Latency test", category: "utility" });
    mockCommands.set("avatar", { name: "avatar", description: "User avatar", category: "utility" });
    mockCommands.set("help", { name: "help", description: "Bot help command", category: "utility" });
    mockCommands.set("userstats", { name: "userstats", description: "View member statistics", category: "analytics" });

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

    const mockGuilds = new Collection();
    mockGuilds.set(testGuildId, {
      id: testGuildId,
      name: "Test Server",
      channels: { cache: mockChannels },
      roles: { cache: mockRoles },
      emojis: { cache: mockEmojis },
    });

    const mockClient = {
      guilds: { cache: mockGuilds },
      commands: mockCommands,
    };

    app = createWebApp(mockClient);

    const token = createSessionToken({
      user: { id: "9001", username: "DashboardAdmin", discriminator: "0001" },
      guilds: [
        {
          id: testGuildId,
          name: "Test Server",
          permissions: "8", // Administrator
          owner: true,
        },
      ],
    });

    validCookie = `dv_session=${token}`;
  });

  // 1. Session Token Unit Tests
  it("should create and verify HMAC-signed session tokens", () => {
    const payload = { userId: "12345", role: "admin" };
    const token = createSessionToken(payload);
    expect(token).toContain(".");

    const verified = verifySessionToken(token);
    expect(verified).toEqual(payload);

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
    // Add media channel
    const postRes = await app.request("/api/guilds/1001/media_only", {
      method: "POST",
      headers: {
        Cookie: validCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel_id: "2002",
        image_only: true,
        auto_mute: false,
      }),
    });
    expect(postRes.status).toBe(200);

    // List media channels
    const getRes = await app.request("/api/guilds/1001/media_only", {
      headers: { Cookie: validCookie },
    });
    expect(getRes.status).toBe(200);
    const channels = await getRes.json();
    expect(channels.some((c) => String(c.channel_id) === "2002")).toBe(true);

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
    expect(getBodyAfter.stats.total).toBe(4);
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

    // Toggle rule off
    const toggleOffRes = await app.request(`/api/guilds/1001/autoresponder/${responderId}/toggle`, {
      method: "POST",
      headers: { Cookie: validCookie },
    });
    expect(toggleOffRes.status).toBe(200);
    const toggleOffBody = await toggleOffRes.json();
    expect(toggleOffBody.enabled).toBe(false);

    // Toggle rule back on
    const toggleOnRes = await app.request(`/api/guilds/1001/autoresponder/${responderId}/toggle`, {
      method: "POST",
      headers: { Cookie: validCookie },
    });
    expect(toggleOnRes.status).toBe(200);
    const toggleOnBody = await toggleOnRes.json();
    expect(toggleOnBody.enabled).toBe(true);

    // Delete rule
    const delRes = await app.request(`/api/guilds/1001/autoresponder/${responderId}`, {
      method: "DELETE",
      headers: { Cookie: validCookie },
    });
    expect(delRes.status).toBe(200);
  });

  // 8. Staff Admin Roles API
  it("POST & GET & DELETE /api/guilds/1001/admin_roles should manage admin roles", async () => {
    const postRes = await app.request("/api/guilds/1001/admin_roles", {
      method: "POST",
      headers: {
        Cookie: validCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role_id: "3001" }),
    });
    expect(postRes.status).toBe(200);

    const getRes = await app.request("/api/guilds/1001/admin_roles", {
      headers: { Cookie: validCookie },
    });
    expect(getRes.status).toBe(200);
    const body = await getRes.json();
    expect(body.adminRoles.some((r) => r.id === "3001")).toBe(true);

    const delRes = await app.request("/api/guilds/1001/admin_roles/3001", {
      method: "DELETE",
      headers: { Cookie: validCookie },
    });
    expect(delRes.status).toBe(200);
  });

  // 9. Analytics API & Timeline
  it("GET /api/guilds/1001/analytics should return 7-day timeline and leaderboards", async () => {
    const res = await app.request("/api/guilds/1001/analytics", {
      headers: { Cookie: validCookie },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.timeline)).toBe(true);
    expect(body.timeline.length).toBe(7);
    expect(Array.isArray(body.topChatters)).toBe(true);
    expect(Array.isArray(body.topVoice)).toBe(true);
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
});

