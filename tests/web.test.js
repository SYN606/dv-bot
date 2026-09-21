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
    mockCommands.set("userstats", { name: "userstats", description: "View member statistics", category: "analytics" });

    const mockGuilds = new Collection();
    mockGuilds.set(testGuildId, {
      id: testGuildId,
      name: "Test Server",
      channels: { cache: mockChannels },
      roles: { cache: mockRoles },
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

  // 3. Authenticated Guild Metadata
  it("GET /api/guilds/1001/meta with auth should return channels and roles", async () => {
    const res = await app.request("/api/guilds/1001/meta", {
      headers: { Cookie: validCookie },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.channels)).toBe(true);
    expect(Array.isArray(body.roles)).toBe(true);
    expect(body.channels.some((c) => c.name === "general")).toBe(true);
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
  });

  // 7. Autoresponder API
  it("POST & GET & DELETE /api/guilds/1001/autoresponder should manage rules", async () => {
    const postRes = await app.request("/api/guilds/1001/autoresponder", {
      method: "POST",
      headers: {
        Cookie: validCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        trigger_phrase: "rules_query",
        reply_content: "Please read the server rules!",
        match_type: "exact",
      }),
    });
    expect(postRes.status).toBe(200);
    const postBody = await postRes.json();
    const responderId = postBody.responder.responder_id;

    const getRes = await app.request("/api/guilds/1001/autoresponder", {
      headers: { Cookie: validCookie },
    });
    expect(getRes.status).toBe(200);
    const rules = await getRes.json();
    expect(rules.some((r) => r.trigger_phrase === "rules_query")).toBe(true);

    const delRes = await app.request(`/api/guilds/1001/autoresponder/${responderId}`, {
      method: "DELETE",
      headers: { Cookie: validCookie },
    });
    expect(delRes.status).toBe(200);
  });
});
