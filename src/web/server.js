import { Hono } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import { CONFIG } from "../config.js";
import {
  getOAuthUrl,
  exchangeCode,
  fetchDiscordUser,
  fetchDiscordGuilds,
  createSessionToken,
} from "./auth.js";
import { apiRouter } from "./routes/api.js";
import { pagesRouter } from "./routes/pages.js";

export function createWebApp(client = null) {
  const app = new Hono();

  // Attach discordClient to context
  app.use("*", async (c, next) => {
    c.set("discordClient", client);
    await next();
  });

  // 1. OAuth Routes
  app.get("/auth/login", (c) => {
    if (
      !CONFIG.CLIENT_ID ||
      !CONFIG.CLIENT_SECRET ||
      CONFIG.CLIENT_ID === "123456789012345678"
    ) {
      // If running locally without credentials, offer Dev Login shortcut
      return c.html(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>OAuth Configuration Notice • DV-BOT</title>
          <style>
            body { background: #1e1f22; color: #f2f3f5; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .box { background: #2b2d31; padding: 32px; border-radius: 12px; max-width: 500px; text-align: center; border: 1px solid #383a40; }
            .btn { display: inline-block; background: #5865f2; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px; }
            .btn:hover { background: #4752c4; }
            code { background: #111214; padding: 2px 6px; border-radius: 4px; color: #57f287; }
          </style>
        </head>
        <body>
          <div class="box">
            <h2>⚠️ Discord OAuth2 Notice</h2>
            <p style="color: #949ba4; margin: 16px 0; line-height: 1.5;">
              <code>CLIENT_ID</code> or <code>CLIENT_SECRET</code> are not configured in your <code>.env</code> file.
            </p>
            <p style="color: #949ba4; margin-bottom: 20px;">
              For development and local testing, you can proceed directly with Dev Admin mode:
            </p>
            <a href="/auth/dev-login" class="btn">Proceed with Dev Mode Login</a>
          </div>
        </body>
        </html>
      `);
    }
    return c.redirect(getOAuthUrl());
  });

  // Dev mode login shortcut for local testing
  app.get("/auth/dev-login", (c) => {
    const mockGuilds = client?.guilds?.cache?.map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      permissions: "8", // Administrator
      owner: true,
    })) || [
      {
        id: "123456789012345678",
        name: "Dev Test Guild",
        icon: null,
        permissions: "8",
        owner: true,
      },
    ];

    const sessionToken = createSessionToken({
      user: {
        id: "123456789012345678",
        username: "DeveloperAdmin",
        discriminator: "0001",
        avatar: null,
      },
      guilds: mockGuilds,
    });

    setCookie(c, "dv_session", sessionToken, {
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    return c.redirect("/dashboard");
  });

  app.get("/auth/callback", async (c) => {
    const code = c.req.query("code");
    const error = c.req.query("error");

    if (error) {
      return c.html(
        `<div style="font-family:sans-serif;padding:40px;text-align:center;"><h2>Discord Login Error</h2><p>${error}</p><a href="/">Back</a></div>`,
        400
      );
    }

    if (!code) {
      return c.redirect("/auth/login");
    }

    try {
      const tokenData = await exchangeCode(code);
      const user = await fetchDiscordUser(tokenData.access_token);
      const rawGuilds = await fetchDiscordGuilds(tokenData.access_token);

      const guilds = rawGuilds.map((g) => ({
        id: g.id,
        name: g.name,
        icon: g.icon,
        permissions: g.permissions,
        owner: g.owner,
      }));

      const sessionToken = createSessionToken({
        user: {
          id: user.id,
          username: user.username,
          discriminator: user.discriminator,
          avatar: user.avatar,
        },
        guilds,
      });

      setCookie(c, "dv_session", sessionToken, {
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
        maxAge: 60 * 60 * 24 * 7,
      });

      return c.redirect("/dashboard");
    } catch (err) {
      console.error("[OAUTH CALLBACK ERROR]:", err);
      return c.html(
        `<div style="font-family:sans-serif;padding:40px;text-align:center;"><h2>Authentication Failed</h2><p>${err.message}</p><a href="/">Back</a></div>`,
        500
      );
    }
  });

  app.get("/auth/logout", (c) => {
    deleteCookie(c, "dv_session", { path: "/" });
    return c.redirect("/");
  });

  // 2. Mount API and Dashboard Routers
  app.route("/api", apiRouter);
  app.route("/", pagesRouter);

  // 3. Fallbacks
  app.notFound((c) => {
    if (c.req.path.startsWith("/api/")) {
      return c.json({ error: "API route not found" }, 404);
    }
    return c.html(
      `<div style="font-family:sans-serif;padding:60px;text-align:center;background:#1e1f22;color:#f2f3f5;min-height:100vh;"><h1>404 - Not Found</h1><p><a href="/dashboard" style="color:#5865f2;">Return to Dashboard</a></p></div>`,
      404
    );
  });

  app.onError((err, c) => {
    console.error("[WEB SERVER ERROR]:", err);
    if (c.req.path.startsWith("/api/")) {
      return c.json({ error: err.message || "Internal Server Error" }, 500);
    }
    return c.html(
      `<div style="font-family:sans-serif;padding:60px;text-align:center;background:#1e1f22;color:#f2f3f5;min-height:100vh;"><h1>Server Error</h1><p>${err.message}</p></div>`,
      500
    );
  });

  return app;
}

export function startWebServer(client = null, port = CONFIG.DASHBOARD_PORT) {
  const app = createWebApp(client);
  const serverPort = Number(port) || 3000;

  const server = Bun.serve({
    fetch: app.fetch,
    port: serverPort,
  });

  console.log(`[WEB DASHBOARD] Listening on http://localhost:${server.port}`);
  return server;
}
