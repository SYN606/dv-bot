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
        <html lang="en" class="dark">
        <head>
          <title>OAuth Notice • Digital Vigital</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <script src="https://unpkg.com/lucide@latest"></script>
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
          <style>body { font-family: 'Plus Jakarta Sans', sans-serif; }</style>
        </head>
        <body class="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
          <div class="fixed top-[-100px] left-[-100px] w-[500px] h-[500px] rounded-full bg-indigo-600/15 blur-[140px] pointer-events-none"></div>
          <div class="fixed bottom-[-100px] right-[-100px] w-[500px] h-[500px] rounded-full bg-purple-600/15 blur-[140px] pointer-events-none"></div>
          
          <div class="max-w-md w-full p-8 rounded-3xl bg-slate-900/60 backdrop-blur-2xl border border-white/10 shadow-2xl text-center relative z-10">
            <div class="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
              <i data-lucide="shield-alert" class="w-7 h-7"></i>
            </div>
            
            <h2 class="text-xl font-bold text-white mb-2">OAuth2 Credentials Notice</h2>
            <p class="text-xs text-slate-400 leading-relaxed mb-6">
              <code class="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono">CLIENT_ID</code> or <code class="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono">CLIENT_SECRET</code> are not configured in your <code class="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">.env</code>.
            </p>

            <a href="/auth/dev-login" class="inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/30 transition-all">
              <i data-lucide="user-check" class="w-4 h-4"></i>
              <span>Proceed with Dev Admin Login</span>
            </a>
          </div>
          <script>if (window.lucide) lucide.createIcons();</script>
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
    return c.html(`
      <!DOCTYPE html>
      <html lang="en" class="dark">
      <head>
        <title>404 Not Found • Digital Vigital</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://unpkg.com/lucide@latest"></script>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
        <style>body { font-family: 'Plus Jakarta Sans', sans-serif; }</style>
      </head>
      <body class="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div class="fixed top-[-100px] left-[-100px] w-[500px] h-[500px] rounded-full bg-indigo-600/15 blur-[140px] pointer-events-none"></div>
        <div class="max-w-md w-full p-8 rounded-3xl bg-slate-900/60 backdrop-blur-2xl border border-white/10 shadow-2xl text-center relative z-10">
          <div class="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
            <i data-lucide="help-circle" class="w-7 h-7"></i>
          </div>
          <h1 class="text-3xl font-extrabold text-white mb-2">404</h1>
          <p class="text-xs text-slate-400 mb-6">The page or dashboard view you are looking for does not exist.</p>
          <a href="/dashboard" class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white transition-all">
            <i data-lucide="home" class="w-4 h-4"></i>
            <span>Return to Dashboard</span>
          </a>
        </div>
        <script>if (window.lucide) lucide.createIcons();</script>
      </body>
      </html>
    `, 404);
  });

  app.onError((err, c) => {
    console.error("[WEB SERVER ERROR]:", err);
    if (c.req.path.startsWith("/api/")) {
      return c.json({ error: err.message || "Internal Server Error" }, 500);
    }
    return c.html(`
      <!DOCTYPE html>
      <html lang="en" class="dark">
      <head>
        <title>Error • Digital Vigital</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://unpkg.com/lucide@latest"></script>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
        <style>body { font-family: 'Plus Jakarta Sans', sans-serif; }</style>
      </head>
      <body class="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div class="max-w-md w-full p-8 rounded-3xl bg-slate-900/60 backdrop-blur-2xl border border-rose-500/20 shadow-2xl text-center relative z-10">
          <div class="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
            <i data-lucide="alert-triangle" class="w-7 h-7"></i>
          </div>
          <h1 class="text-xl font-bold text-white mb-2">Unexpected Server Error</h1>
          <p class="text-xs text-rose-300 font-mono mb-6 bg-slate-950/60 p-3 rounded-xl border border-rose-500/20 text-left overflow-auto">${err.message}</p>
          <a href="/dashboard" class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white transition-all">
            <i data-lucide="arrow-left" class="w-4 h-4"></i>
            <span>Back to Dashboard</span>
          </a>
        </div>
        <script>if (window.lucide) lucide.createIcons();</script>
      </body>
      </html>
    `, 500);
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
