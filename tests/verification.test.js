import { describe, expect, it, beforeAll } from "bun:test";
import { Collection } from "discord.js";
import { createWebApp } from "../src/web/server.js";
import { createSessionToken } from "../src/web/auth.js";
import { initDb } from "../src/db/index.js";

describe("Graceful Verification & Role Hierarchy Tests", () => {
  let app;
  let validCookie;
  const testGuildId = "4001";
  let promptSent = false;

  beforeAll(async () => {
    await initDb();

    const mockChannels = new Collection();
    mockChannels.set("5001", {
      id: "5001",
      name: "verify-here",
      type: 0,
      send: async () => {
        promptSent = true;
        return {};
      },
    });

    const mockRoles = new Collection();
    // Bot role at position 10
    // Verified role at position 5 (manageable by bot)
    // Higher role at position 15 (above bot)
    mockRoles.set("6001", { id: "6001", name: "Verified Member", position: 5, managed: false, hexColor: "#00ff00" });
    mockRoles.set("6002", { id: "6002", name: "Unverified", position: 3, managed: false, hexColor: "#888888" });
    mockRoles.set("6003", { id: "6003", name: "Owner VIP", position: 15, managed: false, hexColor: "#ff0000" });

    const mockBotMember = {
      roles: {
        highest: { position: 10 },
      },
    };

    const mockGuilds = new Collection();
    mockGuilds.set(testGuildId, {
      id: testGuildId,
      name: "Verification Server",
      channels: { cache: mockChannels },
      roles: { cache: mockRoles },
      members: { me: mockBotMember },
    });

    const mockClient = {
      guilds: { cache: mockGuilds },
      commands: new Collection(),
    };

    app = createWebApp(mockClient);

    const token = createSessionToken({
      user: { id: "9999", username: "AdminUser", discriminator: "0001" },
      guilds: [
        {
          id: testGuildId,
          name: "Verification Server",
          permissions: "8",
          owner: true,
        },
      ],
    });

    validCookie = `dv_session=${token}`;
  });

  it("should return role hierarchy position and isAboveBot flag in guild meta", async () => {
    const res = await app.request(`/api/guilds/${testGuildId}/meta`, {
      headers: { Cookie: validCookie },
    });
    expect(res.status).toBe(200);
    const body = await res.json();

    const verifiedRole = body.roles.find((r) => r.id === "6001");
    const higherRole = body.roles.find((r) => r.id === "6003");

    expect(verifiedRole).toBeDefined();
    expect(verifiedRole.isAboveBot).toBe(false);

    expect(higherRole).toBeDefined();
    expect(higherRole.isAboveBot).toBe(true);
  });

  it("should save full verification config with mode, minAccountAgeHours, and custom embed", async () => {
    const payload = {
      enabled: true,
      channelId: "5001",
      verifiedRoleId: "6001",
      unverifiedRoleId: "6002",
      mode: "captcha",
      minAccountAgeHours: 24,
      embedTitle: "Welcome - Please Verify",
      embedDescription: "Click below to complete captcha",
      buttonLabel: "Unlock Channels",
      buttonEmoji: "🛡️",
    };

    const postRes = await app.request(`/api/guilds/${testGuildId}/verification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: validCookie,
      },
      body: JSON.stringify(payload),
    });
    expect(postRes.status).toBe(200);

    const getRes = await app.request(`/api/guilds/${testGuildId}/verification`, {
      headers: { Cookie: validCookie },
    });
    expect(getRes.status).toBe(200);
    const saved = await getRes.json();

    expect(saved.enabled).toBe(true);
    expect(saved.channelId).toBe("5001");
    expect(saved.verifiedRoleId).toBe("6001");
    expect(saved.unverifiedRoleId).toBe("6002");
    expect(saved.mode).toBe("captcha");
    expect(saved.minAccountAgeHours).toBe(24);
    expect(saved.buttonLabel).toBe("Unlock Channels");
    expect(saved.buttonEmoji).toBe("🛡️");
  });

  it("should deploy verification button prompt to configured channel via /post_button", async () => {
    promptSent = false;
    const res = await app.request(`/api/guilds/${testGuildId}/verification/post_button`, {
      method: "POST",
      headers: { Cookie: validCookie },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(promptSent).toBe(true);
  });
});
