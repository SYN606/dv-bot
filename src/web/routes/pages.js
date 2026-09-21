import { Hono } from "hono";
import { requireAuth, requireGuildAdmin } from "../middleware/auth.js";
import { CONFIG } from "../../config.js";

export const pagesRouter = new Hono();

function renderLayout({
  title,
  content,
  user = null,
  currentGuild = null,
  activeTab = "",
}) {
  const avatarUrl = user?.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
    : "https://cdn.discordapp.com/embed/avatars/0.png";

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} • Digital Vigital Dashboard</title>
  
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  
  <!-- Tailwind CSS Play CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['Plus Jakarta Sans', 'sans-serif'],
            mono: ['JetBrains Mono', 'monospace'],
          },
          colors: {
            brand: {
              50: '#eef2ff',
              100: '#e0e7ff',
              400: '#818cf8',
              500: '#6366f1',
              600: '#4f46e5',
              700: '#4338ca',
            }
          }
        }
      }
    }
  </script>

  <!-- Lucide Icons -->
  <script src="https://unpkg.com/lucide@latest"></script>

  <style>
    /* Glassmorphism custom enhancements */
    .glass-panel {
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5);
    }
    .glass-input {
      background: rgba(2, 6, 23, 0.6);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.2s ease;
    }
    .glass-input:focus {
      border-color: rgba(99, 102, 241, 0.8);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
    }
    .glass-card-hover {
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .glass-card-hover:hover {
      transform: translateY(-3px);
      border-color: rgba(99, 102, 241, 0.4);
      box-shadow: 0 20px 30px -10px rgba(99, 102, 241, 0.15);
    }
    /* Custom subtle scrollbar */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 9999px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200 antialiased relative overflow-x-hidden">
  
  <!-- Glowing ambient background orbs -->
  <div class="fixed top-[-100px] left-[-100px] w-[500px] h-[500px] rounded-full bg-indigo-600/15 blur-[140px] pointer-events-none -z-10"></div>
  <div class="fixed bottom-[-100px] right-[-100px] w-[550px] h-[550px] rounded-full bg-purple-600/15 blur-[150px] pointer-events-none -z-10"></div>
  <div class="fixed top-[40%] left-[50%] -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-cyan-600/10 blur-[130px] pointer-events-none -z-10"></div>

  <!-- Sticky Glass Navbar -->
  <header class="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/75 border-b border-white/10 px-6 py-3.5 flex items-center justify-between transition-all">
    <div class="flex items-center gap-6">
      <a href="/" class="flex items-center gap-3 group">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-[1px] shadow-lg shadow-indigo-500/25">
          <div class="w-full h-full bg-slate-950/80 backdrop-blur-md rounded-[11px] flex items-center justify-center">
            <i data-lucide="shield-check" class="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform"></i>
          </div>
        </div>
        <div class="flex flex-col">
          <span class="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
            Digital<span class="text-indigo-400">Vigital</span>
          </span>
          <span class="text-[10px] font-mono tracking-widest text-slate-400 uppercase -mt-1">Dashboard</span>
        </div>
      </a>
    </div>

    <!-- User Pill / Actions -->
    <div class="flex items-center gap-3">
      ${
        user
          ? `
          <div class="flex items-center gap-3">
            <a href="/dashboard" class="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md text-xs font-semibold text-slate-200 transition-all">
              <img src="${avatarUrl}" alt="${user.username}" class="w-5 h-5 rounded-full ring-1 ring-indigo-400/50">
              <span>${user.username}</span>
            </a>
            <a href="/auth/logout" class="p-2 rounded-xl bg-white/5 hover:bg-rose-500/15 border border-white/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 transition-all" title="Logout">
              <i data-lucide="log-out" class="w-4 h-4"></i>
            </a>
          </div>
        `
          : `
          <a href="/auth/login" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/30 transition-all">
            <i data-lucide="log-in" class="w-3.5 h-3.5"></i>
            <span>Login with Discord</span>
          </a>
        `
      }
    </div>
  </header>

  <!-- Main View Container -->
  <main class="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex-1">
    ${
      currentGuild
        ? `
        <!-- Server Header Card -->
        <div class="glass-panel rounded-2xl p-5 sm:p-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-[2px] shadow-lg shadow-indigo-500/20">
              <div class="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center overflow-hidden">
                ${
                  currentGuild.icon
                    ? `<img src="https://cdn.discordapp.com/icons/${currentGuild.id}/${currentGuild.icon}.png" alt="" class="w-full h-full object-cover">`
                    : `<span class="font-bold text-lg text-indigo-300 font-mono">${currentGuild.name.slice(0, 2).toUpperCase()}</span>`
                }
              </div>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-white">${currentGuild.name}</h1>
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active
                </span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">Digital Vigital Management & Module Controls</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <a href="/dashboard" class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white backdrop-blur-md transition-all">
              <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
              <span>Switch Server</span>
            </a>
          </div>
        </div>

        <!-- Glass Navigation Tabs -->
        <nav class="flex gap-2 p-1.5 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl mb-8 overflow-x-auto shadow-inner">
          <a href="/dashboard/${currentGuild.id}" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === "overview"
              ? "bg-gradient-to-r from-indigo-500/30 to-purple-500/30 text-white border border-indigo-400/40 shadow-lg shadow-indigo-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
          }">
            <i data-lucide="layout-dashboard" class="w-4 h-4"></i>
            <span>Overview</span>
          </a>

          <a href="/dashboard/${currentGuild.id}/verification" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === "verification"
              ? "bg-gradient-to-r from-indigo-500/30 to-purple-500/30 text-white border border-indigo-400/40 shadow-lg shadow-indigo-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
          }">
            <i data-lucide="shield-check" class="w-4 h-4"></i>
            <span>Verification</span>
          </a>

          <a href="/dashboard/${currentGuild.id}/media-only" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === "media_only"
              ? "bg-gradient-to-r from-indigo-500/30 to-purple-500/30 text-white border border-indigo-400/40 shadow-lg shadow-indigo-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
          }">
            <i data-lucide="image" class="w-4 h-4"></i>
            <span>Media-Only</span>
          </a>

          <a href="/dashboard/${currentGuild.id}/commands" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === "commands"
              ? "bg-gradient-to-r from-indigo-500/30 to-purple-500/30 text-white border border-indigo-400/40 shadow-lg shadow-indigo-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
          }">
            <i data-lucide="terminal" class="w-4 h-4"></i>
            <span>Commands</span>
          </a>

          <a href="/dashboard/${currentGuild.id}/autoresponder" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === "autoresponder"
              ? "bg-gradient-to-r from-indigo-500/30 to-purple-500/30 text-white border border-indigo-400/40 shadow-lg shadow-indigo-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
          }">
            <i data-lucide="bot" class="w-4 h-4"></i>
            <span>Autoresponder</span>
          </a>

          <a href="/dashboard/${currentGuild.id}/sticky" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === "sticky"
              ? "bg-gradient-to-r from-indigo-500/30 to-purple-500/30 text-white border border-indigo-400/40 shadow-lg shadow-indigo-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
          }">
            <i data-lucide="pin" class="w-4 h-4"></i>
            <span>Sticky Notice</span>
          </a>

          <a href="/dashboard/${currentGuild.id}/config" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === "config"
              ? "bg-gradient-to-r from-indigo-500/30 to-purple-500/30 text-white border border-indigo-400/40 shadow-lg shadow-indigo-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
          }">
            <i data-lucide="sliders" class="w-4 h-4"></i>
            <span>Roles & Logs</span>
          </a>
        </nav>
      `
        : ""
    }

    ${content}
  </main>

  <!-- Modern Floating Toast Notification -->
  <div id="toast" class="fixed bottom-6 right-6 z-50 glass-panel border-emerald-500/30 text-emerald-300 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-semibold transition-all duration-300 transform translate-y-12 opacity-0 pointer-events-none">
    <i data-lucide="check-circle" class="w-4 h-4 text-emerald-400 flex-shrink-0"></i>
    <span id="toastMsg">Settings Saved Successfully!</span>
  </div>

  <footer class="mt-auto border-t border-white/5 py-6 text-center text-xs text-slate-500 font-mono">
    <span>Powered by <strong class="text-indigo-400">Digital Vigital</strong> • Pure JS Bun Engine</span>
  </footer>

  <script>
    // Initialize Lucide Icons
    document.addEventListener("DOMContentLoaded", () => {
      if (window.lucide) lucide.createIcons();
    });

    function showToast(msg = "Settings Saved Successfully!") {
      const toast = document.getElementById("toast");
      const msgEl = document.getElementById("toastMsg");
      msgEl.textContent = msg;
      toast.classList.remove("translate-y-12", "opacity-0", "pointer-events-none");
      toast.classList.add("translate-y-0", "opacity-100");
      if (window.lucide) lucide.createIcons();
      setTimeout(() => {
        toast.classList.remove("translate-y-0", "opacity-100");
        toast.classList.add("translate-y-12", "opacity-0", "pointer-events-none");
      }, 3000);
    }
  </script>
</body>
</html>`;
}

// 1. Landing Page
pagesRouter.get("/", (c) => {
  return c.html(
    renderLayout({
      title: "Home",
      content: `
      <!-- Hero Section -->
      <div class="py-12 sm:py-20 text-center max-w-3xl mx-auto">
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 mb-6 backdrop-blur-md shadow-inner">
          <i data-lucide="sparkles" class="w-3.5 h-3.5 text-indigo-400"></i>
          <span>The Modern Discord Bot Dashboard</span>
        </div>

        <h1 class="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          Next-Gen Control with <br>
          <span class="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">Digital Vigital</span>
        </h1>

        <p class="text-slate-300 text-base sm:text-lg leading-relaxed mb-8 max-w-2xl mx-auto">
          Configure automated verification gates, media-only channels, command restrictions, autoresponder triggers, and audit logs without tedious Discord chat commands.
        </p>

        <div class="flex flex-wrap items-center justify-center gap-4">
          <a href="/dashboard" class="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-xl shadow-indigo-500/25 border border-indigo-400/30 transition-all hover:scale-105">
            <span>Open Dashboard</span>
            <i data-lucide="arrow-right" class="w-4 h-4"></i>
          </a>
          <a href="https://discord.com/oauth2/authorize?client_id=${CONFIG.CLIENT_ID}&scope=bot%20applications.commands&permissions=8" target="_blank" class="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white backdrop-blur-md transition-all">
            <i data-lucide="plus-circle" class="w-4 h-4 text-indigo-400"></i>
            <span>Invite Bot</span>
          </a>
        </div>
      </div>

      <!-- Feature Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mt-4 mb-12">
        <div class="glass-panel p-6 rounded-2xl glass-card-hover">
          <div class="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 text-indigo-400">
            <i data-lucide="shield-check" class="w-6 h-6"></i>
          </div>
          <h3 class="text-base font-bold text-white mb-2">Automated Verification</h3>
          <p class="text-xs text-slate-400 leading-relaxed">
            Deploy interactive click-to-verify buttons inside your welcome channel with instant role assignment and unverified role clearance.
          </p>
        </div>

        <div class="glass-panel p-6 rounded-2xl glass-card-hover">
          <div class="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4 text-purple-400">
            <i data-lucide="image" class="w-6 h-6"></i>
          </div>
          <h3 class="text-base font-bold text-white mb-2">Media-Only Channels</h3>
          <p class="text-xs text-slate-400 leading-relaxed">
            Enforce media-first channels by automatically purging regular text messages while keeping art, screenshots, and video posts clean.
          </p>
        </div>

        <div class="glass-panel p-6 rounded-2xl glass-card-hover">
          <div class="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4 text-cyan-400">
            <i data-lucide="terminal" class="w-6 h-6"></i>
          </div>
          <h3 class="text-base font-bold text-white mb-2">Command Restrictions</h3>
          <p class="text-xs text-slate-400 leading-relaxed">
            Disable intrusive bot commands in chat or serious channels with visual toggles while keeping them available everywhere else.
          </p>
        </div>
      </div>
    `,
    })
  );
});

// 2. Guild Selector
pagesRouter.get("/dashboard", requireAuth, (c) => {
  const user = c.get("user");
  const userGuilds = c.get("guilds") || [];
  const client = c.get("discordClient");

  const adminGuilds = userGuilds.filter((g) => {
    const perms = BigInt(g.permissions || 0);
    return g.owner || (perms & 0x8n) === 0x8n || (perms & 0x20n) === 0x20n;
  });

  const cardsHtml = adminGuilds
    .map((g) => {
      const isBotPresent = !!client?.guilds.cache.has(g.id);
      const iconUrl = g.icon
        ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`
        : null;

      return `
      <a href="${
        isBotPresent
          ? `/dashboard/${g.id}`
          : `https://discord.com/oauth2/authorize?client_id=${CONFIG.CLIENT_ID}&scope=bot%20applications.commands&permissions=8&guild_id=${g.id}`
      }" 
         class="glass-panel p-5 rounded-2xl glass-card-hover flex items-center gap-4 group">
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-[2px] shadow-lg shadow-indigo-500/20 flex-shrink-0">
          <div class="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center overflow-hidden">
            ${
              iconUrl
                ? `<img src="${iconUrl}" alt="" class="w-full h-full object-cover">`
                : `<span class="font-bold text-indigo-300 font-mono">${g.name
                    .slice(0, 2)
                    .toUpperCase()}</span>`
            }
          </div>
        </div>

        <div class="flex-1 min-w-0">
          <h3 class="text-sm font-bold text-white truncate group-hover:text-indigo-300 transition-colors">${
            g.name
          }</h3>
          <div class="mt-1 flex items-center gap-1.5">
            ${
              isBotPresent
                ? `
              <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Manage Server
              </span>
            `
                : `
              <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400">
                <i data-lucide="plus" class="w-3 h-3"></i>
                Invite Digital Vigital
              </span>
            `
            }
          </div>
        </div>

        <div class="text-slate-500 group-hover:text-indigo-400 transition-colors">
          <i data-lucide="chevron-right" class="w-5 h-5"></i>
        </div>
      </a>
    `;
    })
    .join("");

  return c.html(
    renderLayout({
      title: "Select Server",
      user,
      content: `
      <div class="mb-8">
        <h1 class="text-2xl font-bold tracking-tight text-white mb-2">Select a Server</h1>
        <p class="text-xs text-slate-400">Choose a server where you have Administrator or Manage Server permissions to configure Digital Vigital.</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        ${cardsHtml}
      </div>
    `,
    })
  );
});

// 3. Guild Overview
pagesRouter.get("/dashboard/:guildId", requireAuth, requireGuildAdmin, (c) => {
  const user = c.get("user");
  const currentGuild = c.get("currentGuild");
  const botGuild = c.get("botGuild");

  return c.html(
    renderLayout({
      title: currentGuild.name,
      user,
      currentGuild,
      activeTab: "overview",
      content: `
      <!-- Stats Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div class="glass-panel p-6 rounded-2xl flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <i data-lucide="users" class="w-6 h-6"></i>
          </div>
          <div>
            <span class="text-[11px] font-mono tracking-wider uppercase text-slate-400 font-semibold">Total Members</span>
            <h3 class="text-2xl font-extrabold text-white mt-0.5">${botGuild?.memberCount || "N/A"}</h3>
          </div>
        </div>

        <div class="glass-panel p-6 rounded-2xl flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <i data-lucide="hash" class="w-6 h-6"></i>
          </div>
          <div>
            <span class="text-[11px] font-mono tracking-wider uppercase text-slate-400 font-semibold">Text Channels</span>
            <h3 class="text-2xl font-extrabold text-white mt-0.5">${
              botGuild?.channels.cache.filter((ch) => ch.type === 0).size || 0
            }</h3>
          </div>
        </div>

        <div class="glass-panel p-6 rounded-2xl flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <i data-lucide="shield" class="w-6 h-6"></i>
          </div>
          <div>
            <span class="text-[11px] font-mono tracking-wider uppercase text-slate-400 font-semibold">Configured Roles</span>
            <h3 class="text-2xl font-extrabold text-white mt-0.5">${
              botGuild?.roles.cache.size || 0
            }</h3>
          </div>
        </div>
      </div>

      <!-- Quick Action Cards -->
      <div class="glass-panel p-6 sm:p-8 rounded-2xl">
        <h2 class="text-base font-bold text-white mb-2 flex items-center gap-2">
          <i data-lucide="sparkles" class="w-5 h-5 text-indigo-400"></i>
          <span>Active Server Modules</span>
        </h2>
        <p class="text-xs text-slate-400 mb-6">Access and configure each server policy using the navigation tabs above or the quick links below.</p>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <a href="/dashboard/${currentGuild.id}/verification" class="p-4 rounded-xl bg-slate-900/40 border border-white/5 hover:border-indigo-500/40 hover:bg-slate-900/80 transition-all group">
            <div class="flex items-center gap-3">
              <i data-lucide="shield-check" class="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform"></i>
              <div>
                <h4 class="text-xs font-bold text-white">Verification Gate</h4>
                <p class="text-[11px] text-slate-400">Setup member entry panel</p>
              </div>
            </div>
          </a>

          <a href="/dashboard/${currentGuild.id}/media-only" class="p-4 rounded-xl bg-slate-900/40 border border-white/5 hover:border-purple-500/40 hover:bg-slate-900/80 transition-all group">
            <div class="flex items-center gap-3">
              <i data-lucide="image" class="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform"></i>
              <div>
                <h4 class="text-xs font-bold text-white">Media-Only Channels</h4>
                <p class="text-[11px] text-slate-400">Filter chat vs attachments</p>
              </div>
            </div>
          </a>

          <a href="/dashboard/${currentGuild.id}/commands" class="p-4 rounded-xl bg-slate-900/40 border border-white/5 hover:border-cyan-500/40 hover:bg-slate-900/80 transition-all group">
            <div class="flex items-center gap-3">
              <i data-lucide="terminal" class="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform"></i>
              <div>
                <h4 class="text-xs font-bold text-white">Command Restrictions</h4>
                <p class="text-[11px] text-slate-400">Disable commands in channels</p>
              </div>
            </div>
          </a>
        </div>
      </div>
    `,
    })
  );
});

// 4. Verification Setup Page
pagesRouter.get("/dashboard/:guildId/verification", requireAuth, requireGuildAdmin, (c) => {
  const user = c.get("user");
  const currentGuild = c.get("currentGuild");
  const guildId = currentGuild.id;

  return c.html(
    renderLayout({
      title: `Verification • ${currentGuild.name}`,
      user,
      currentGuild,
      activeTab: "verification",
      content: `
      <div class="glass-panel p-6 sm:p-8 rounded-2xl">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <i data-lucide="shield-check" class="w-5 h-5"></i>
          </div>
          <div>
            <h2 class="text-lg font-bold text-white">Verification Gate Configuration</h2>
            <p class="text-xs text-slate-400">Deploy an interactive verification button panel to automatically grant member roles.</p>
          </div>
        </div>

        <form id="verifyForm" class="mt-6 space-y-5">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label class="block text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold mb-2">Verification Channel</label>
              <select id="verifyChannel" class="glass-input rounded-xl w-full px-4 py-2.5 text-xs text-white outline-none">
                <option value="">Loading channels...</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold mb-2">Verified Role (Granted on Click)</label>
              <select id="verifiedRole" class="glass-input rounded-xl w-full px-4 py-2.5 text-xs text-white outline-none">
                <option value="">Loading roles...</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold mb-2">Unverified Role (Removed on Click, Optional)</label>
              <select id="unverifiedRole" class="glass-input rounded-xl w-full px-4 py-2.5 text-xs text-white outline-none">
                <option value="">None</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold mb-2">Verification Audit Log Channel (Optional)</label>
              <select id="logChannel" class="glass-input rounded-xl w-full px-4 py-2.5 text-xs text-white outline-none">
                <option value="">None</option>
              </select>
            </div>
          </div>

          <div class="pt-4 flex flex-wrap items-center gap-3">
            <button type="submit" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/30 transition-all cursor-pointer">
              <i data-lucide="save" class="w-4 h-4"></i>
              <span>Save Settings</span>
            </button>

            <button type="button" id="deployBtn" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white backdrop-blur-md transition-all cursor-pointer">
              <i data-lucide="send" class="w-4 h-4 text-indigo-400"></i>
              <span>Save & Deploy Panel in Discord</span>
            </button>
          </div>
        </form>
      </div>

      <script>
        async function loadData() {
          const [metaRes, confRes] = await Promise.all([
            fetch('/api/guilds/${guildId}/meta'),
            fetch('/api/guilds/${guildId}/verification')
          ]);
          const meta = await metaRes.json();
          const conf = await confRes.json();

          const chSelect = document.getElementById('verifyChannel');
          const logSelect = document.getElementById('logChannel');
          const chOpts = '<option value="">-- None --</option>' + meta.channels.map(c => '<option value="' + c.id + '">' + '#' + c.name + '</option>').join('');
          chSelect.innerHTML = chOpts;
          logSelect.innerHTML = chOpts;

          const roleOpts = '<option value="">-- None --</option>' + meta.roles.map(r => '<option value="' + r.id + '">' + '@' + r.name + '</option>').join('');
          document.getElementById('verifiedRole').innerHTML = roleOpts;
          document.getElementById('unverifiedRole').innerHTML = roleOpts;

          if (conf.verify_channel_id) chSelect.value = conf.verify_channel_id;
          if (conf.verified_role_id) document.getElementById('verifiedRole').value = conf.verified_role_id;
          if (conf.unverified_role_id) document.getElementById('unverifiedRole').value = conf.unverified_role_id;
          if (conf.log_channel_id) logSelect.value = conf.log_channel_id;
        }

        async function save(deploy = false) {
          const body = {
            verify_channel_id: document.getElementById('verifyChannel').value,
            verified_role_id: document.getElementById('verifiedRole').value,
            unverified_role_id: document.getElementById('unverifiedRole').value,
            log_channel_id: document.getElementById('logChannel').value,
            deployPanel: deploy
          };
          const res = await fetch('/api/guilds/${guildId}/verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          if (res.ok) showToast(deploy ? "Saved & Verification Panel Deployed!" : "Settings Saved Successfully!");
        }

        document.getElementById('verifyForm').onsubmit = (e) => { e.preventDefault(); save(false); };
        document.getElementById('deployBtn').onclick = () => save(true);
        loadData();
      </script>
    `,
    })
  );
});

// 5. Media-Only Setup Page
pagesRouter.get("/dashboard/:guildId/media-only", requireAuth, requireGuildAdmin, (c) => {
  const user = c.get("user");
  const currentGuild = c.get("currentGuild");
  const guildId = currentGuild.id;

  return c.html(
    renderLayout({
      title: `Media-Only Channels • ${currentGuild.name}`,
      user,
      currentGuild,
      activeTab: "media_only",
      content: `
      <div class="glass-panel p-6 sm:p-8 rounded-2xl">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <i data-lucide="image" class="w-5 h-5"></i>
          </div>
          <div>
            <h2 class="text-lg font-bold text-white">Media-Only Channel Policies</h2>
            <p class="text-xs text-slate-400">Channels where only images, videos, and media link attachments are permitted.</p>
          </div>
        </div>

        <form id="addMediaForm" class="mt-6 flex flex-col sm:flex-row gap-3 items-end mb-8">
          <div class="w-full sm:flex-1">
            <label class="block text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold mb-2">Select Target Channel</label>
            <select id="mediaChannelSelect" class="glass-input rounded-xl w-full px-4 py-2.5 text-xs text-white outline-none">
              <option value="">Loading channels...</option>
            </select>
          </div>
          <button type="submit" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/30 transition-all cursor-pointer flex-shrink-0">
            <i data-lucide="plus" class="w-4 h-4"></i>
            <span>Enable Media-Only</span>
          </button>
        </form>

        <div class="border-t border-white/10 pt-6">
          <h3 class="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold mb-4">Active Media-Only Channels</h3>
          <div id="mediaChannelsList" class="space-y-3">
            <div class="p-4 rounded-xl bg-slate-900/40 text-xs text-slate-400">Loading active channels...</div>
          </div>
        </div>
      </div>

      <script>
        async function loadChannels() {
          const [metaRes, mediaRes] = await Promise.all([
            fetch('/api/guilds/${guildId}/meta'),
            fetch('/api/guilds/${guildId}/media_only')
          ]);
          const meta = await metaRes.json();
          const media = await mediaRes.json();

          const select = document.getElementById('mediaChannelSelect');
          select.innerHTML = meta.channels.map(c => '<option value="' + c.id + '">#' + c.name + '</option>').join('');

          const list = document.getElementById('mediaChannelsList');
          if (media.length === 0) {
            list.innerHTML = '<div class="p-6 text-center text-xs text-slate-500 border border-dashed border-white/10 rounded-xl">No channels are currently configured as media-only.</div>';
            return;
          }

          list.innerHTML = media.map(m => {
            const ch = meta.channels.find(c => String(c.id) === String(m.channel_id));
            const name = ch ? '#' + ch.name : 'Channel ' + m.channel_id;
            return '<div class="flex items-center justify-between p-4 rounded-xl bg-slate-900/40 border border-white/5">' +
              '<div class="flex items-center gap-3">' +
                '<i data-lucide="image" class="w-4 h-4 text-purple-400"></i>' +
                '<div>' +
                  '<strong class="text-xs font-bold text-white">' + name + '</strong>' +
                  '<div class="flex gap-2 text-[10px] text-slate-400 mt-0.5">' +
                    '<span>Image Only: ' + (m.image_only ? 'Yes' : 'No') + '</span> • ' +
                    '<span>NSFW Bypass: ' + (m.nsfw_bypass ? 'Yes' : 'No') + '</span>' +
                  '</div>' +
                '</div>' +
              '</div>' +
              '<button class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 transition-all cursor-pointer" onclick="removeMedia(' + m.channel_id + ')">' +
                '<i data-lucide="trash-2" class="w-3.5 h-3.5"></i>' +
                '<span>Remove</span>' +
              '</button>' +
            '</div>';
          }).join('');
          if (window.lucide) lucide.createIcons();
        }

        async function removeMedia(channelId) {
          const res = await fetch('/api/guilds/${guildId}/media_only/' + channelId, { method: 'DELETE' });
          if (res.ok) { showToast("Media Policy Removed!"); loadChannels(); }
        }

        document.getElementById('addMediaForm').onsubmit = async (e) => {
          e.preventDefault();
          const channel_id = document.getElementById('mediaChannelSelect').value;
          const res = await fetch('/api/guilds/${guildId}/media_only', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channel_id, image_only: true, nsfw_bypass: true })
          });
          if (res.ok) { showToast("Media-Only Enabled for Channel!"); loadChannels(); }
        };

        loadChannels();
      </script>
    `,
    })
  );
});

// 6. Command Restrictions Page
pagesRouter.get("/dashboard/:guildId/commands", requireAuth, requireGuildAdmin, (c) => {
  const user = c.get("user");
  const currentGuild = c.get("currentGuild");
  const guildId = currentGuild.id;

  return c.html(
    renderLayout({
      title: `Command Restrictions • ${currentGuild.name}`,
      user,
      currentGuild,
      activeTab: "commands",
      content: `
      <div class="glass-panel p-6 sm:p-8 rounded-2xl">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <i data-lucide="terminal" class="w-5 h-5"></i>
          </div>
          <div>
            <h2 class="text-lg font-bold text-white">Channel Command Restrictions</h2>
            <p class="text-xs text-slate-400">Disable specific bot commands in target channels. Administrators always bypass these restrictions.</p>
          </div>
        </div>

        <div class="mt-6 max-w-sm mb-6">
          <label class="block text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold mb-2">Select Channel</label>
          <select id="channelPicker" class="glass-input rounded-xl w-full px-4 py-2.5 text-xs text-white outline-none" onchange="loadCommands()">
            <option value="">Loading channels...</option>
          </select>
        </div>

        <div class="border-t border-white/10 pt-6">
          <h3 class="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold mb-4">Command Availability</h3>
          <div id="commandsTable" class="space-y-2">
            <div class="p-4 rounded-xl bg-slate-900/40 text-xs text-slate-400">Loading command list...</div>
          </div>
        </div>
      </div>

      <script>
        let allChannels = [];

        async function init() {
          const meta = await (await fetch('/api/guilds/${guildId}/meta')).json();
          allChannels = meta.channels;
          const picker = document.getElementById('channelPicker');
          picker.innerHTML = allChannels.map(c => '<option value="' + c.id + '">#' + c.name + '</option>').join('');
          loadCommands();
        }

        async function loadCommands() {
          const chId = document.getElementById('channelPicker').value;
          if (!chId) return;

          const data = await (await fetch('/api/guilds/${guildId}/commands?channel_id=' + chId)).json();
          const table = document.getElementById('commandsTable');
          const disabledSet = new Set(data.disabled.map(d => d.toLowerCase()));

          table.innerHTML = data.commands.map(cmd => {
            const isDis = disabledSet.has(cmd.name.toLowerCase());
            return '<div class="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/40 border border-white/5">' +
              '<div>' +
                '<div class="flex items-center gap-2">' +
                  '<span class="font-mono text-xs font-bold text-indigo-300">/' + cmd.name + '</span>' +
                  '<span class="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/5 text-slate-400 uppercase">' + cmd.category + '</span>' +
                '</div>' +
                '<p class="text-[11px] text-slate-400 mt-0.5">' + cmd.description + '</p>' +
              '</div>' +
              '<div>' +
                (cmd.isProtected
                  ? '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20"><i data-lucide="lock" class="w-3 h-3"></i> Protected</span>'
                  : '<button class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ' + (isDis ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30') + ' transition-all cursor-pointer" onclick="toggleCmd(\\'' + cmd.name + '\\', ' + isDis + ')">' +
                      '<i data-lucide="' + (isDis ? 'check' : 'slash') + '" class="w-3.5 h-3.5"></i>' +
                      '<span>' + (isDis ? 'Enable' : 'Disable') + '</span>' +
                    '</button>'
                ) +
              '</div>' +
            '</div>';
          }).join('');
          if (window.lucide) lucide.createIcons();
        }

        async function toggleCmd(cmdName, enable) {
          const chId = document.getElementById('channelPicker').value;
          const res = await fetch('/api/guilds/${guildId}/commands/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channel_id: chId, command_name: cmdName, enable })
          });
          if (res.ok) {
            showToast(enable ? "Command Re-enabled in Channel!" : "Command Disabled in Channel!");
            loadCommands();
          }
        }

        init();
      </script>
    `,
    })
  );
});

// 7. Roles & Logs Page
pagesRouter.get("/dashboard/:guildId/config", requireAuth, requireGuildAdmin, (c) => {
  const user = c.get("user");
  const currentGuild = c.get("currentGuild");
  const guildId = currentGuild.id;

  return c.html(
    renderLayout({
      title: `Roles & Logs • ${currentGuild.name}`,
      user,
      currentGuild,
      activeTab: "config",
      content: `
      <div class="glass-panel p-6 sm:p-8 rounded-2xl">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <i data-lucide="sliders" class="w-5 h-5"></i>
          </div>
          <div>
            <h2 class="text-lg font-bold text-white">Server Audit Logs & Automated Roles</h2>
            <p class="text-xs text-slate-400">Manage moderation logging channels and automatic voice channel roles.</p>
          </div>
        </div>

        <form id="configForm" class="mt-6 space-y-5">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label class="block text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold mb-2">Moderation Audit Log Channel</label>
              <select id="logChannel" class="glass-input rounded-xl w-full px-4 py-2.5 text-xs text-white outline-none">
                <option value="">Loading channels...</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold mb-2">Voice Channel Auto-Role (While in VC)</label>
              <select id="vcRole" class="glass-input rounded-xl w-full px-4 py-2.5 text-xs text-white outline-none">
                <option value="">Loading roles...</option>
              </select>
            </div>
          </div>

          <div class="pt-4">
            <button type="submit" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/30 transition-all cursor-pointer">
              <i data-lucide="save" class="w-4 h-4"></i>
              <span>Save Configurations</span>
            </button>
          </div>
        </form>
      </div>

      <script>
        async function loadConfig() {
          const [metaRes, confRes] = await Promise.all([
            fetch('/api/guilds/${guildId}/meta'),
            fetch('/api/guilds/${guildId}/config')
          ]);
          const meta = await metaRes.json();
          const conf = await confRes.json();

          const logSelect = document.getElementById('logChannel');
          logSelect.innerHTML = '<option value="">-- None (Disabled) --</option>' + meta.channels.map(c => '<option value="' + c.id + '">#' + c.name + '</option>').join('');

          const vcSelect = document.getElementById('vcRole');
          vcSelect.innerHTML = '<option value="">-- None (Disabled) --</option>' + meta.roles.map(r => '<option value="' + r.id + '">@' + r.name + '</option>').join('');

          if (conf.modlog?.channel_id) logSelect.value = conf.modlog.channel_id;
          if (conf.vcrole?.role_id) vcSelect.value = conf.vcrole.role_id;
        }

        document.getElementById('configForm').onsubmit = async (e) => {
          e.preventDefault();
          const body = {
            log_channel_id: document.getElementById('logChannel').value || null,
            vc_role_id: document.getElementById('vcRole').value || null
          };
          const res = await fetch('/api/guilds/${guildId}/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          if (res.ok) showToast("Configurations Saved Successfully!");
        };

        loadConfig();
      </script>
    `,
    })
  );
});

// 8. Autoresponder Page
pagesRouter.get("/dashboard/:guildId/autoresponder", requireAuth, requireGuildAdmin, (c) => {
  const user = c.get("user");
  const currentGuild = c.get("currentGuild");
  const guildId = currentGuild.id;

  return c.html(
    renderLayout({
      title: `Autoresponder • ${currentGuild.name}`,
      user,
      currentGuild,
      activeTab: "autoresponder",
      content: `
      <div class="glass-panel p-6 sm:p-8 rounded-2xl">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <i data-lucide="bot" class="w-5 h-5"></i>
          </div>
          <div>
            <h2 class="text-lg font-bold text-white">Automated Trigger Responses</h2>
            <p class="text-xs text-slate-400">Automatically reply with text and add emoji reactions when designated phrases appear in chat.</p>
          </div>
        </div>

        <!-- Add Trigger Form -->
        <form id="arForm" class="mt-6 p-5 rounded-2xl bg-slate-900/50 border border-white/10 space-y-4 mb-8">
          <h3 class="text-xs font-mono uppercase tracking-wider text-indigo-300 font-bold flex items-center gap-2">
            <i data-lucide="plus-circle" class="w-4 h-4"></i>
            <span>Create New Trigger</span>
          </h3>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold mb-2">Trigger Phrase</label>
              <input type="text" id="arTrigger" class="glass-input rounded-xl w-full px-4 py-2.5 text-xs text-white outline-none" placeholder="e.g. !discord or welcome" required>
            </div>

            <div>
              <label class="block text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold mb-2">Match Pattern</label>
              <select id="arMatchType" class="glass-input rounded-xl w-full px-4 py-2.5 text-xs text-white outline-none">
                <option value="contains">Contains (Default)</option>
                <option value="exact">Exact Match</option>
                <option value="startswith">Starts With</option>
                <option value="endswith">Ends With</option>
                <option value="regex">Regular Expression</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold mb-2">Reply Message Text</label>
            <textarea id="arReply" class="glass-input rounded-xl w-full px-4 py-2.5 text-xs text-white outline-none" rows="3" placeholder="Message content to reply with..." required></textarea>
          </div>

          <div>
            <label class="block text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold mb-2">Reaction Emojis (Separated by space)</label>
            <input type="text" id="arReactions" class="glass-input rounded-xl w-full px-4 py-2.5 text-xs text-white outline-none" placeholder="👍 ❤️ 🔥">
          </div>

          <button type="submit" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/30 transition-all cursor-pointer">
            <i data-lucide="plus" class="w-4 h-4"></i>
            <span>Create Trigger</span>
          </button>
        </form>

        <div class="border-t border-white/10 pt-6">
          <h3 class="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold mb-4">Active Triggers</h3>
          <div id="arList" class="space-y-3">
            <div class="p-4 rounded-xl bg-slate-900/40 text-xs text-slate-400">Loading triggers...</div>
          </div>
        </div>
      </div>

      <script>
        async function loadAR() {
          const res = await fetch('/api/guilds/${guildId}/autoresponder');
          const rules = await res.json();
          const list = document.getElementById('arList');

          if (rules.length === 0) {
            list.innerHTML = '<div class="p-6 text-center text-xs text-slate-500 border border-dashed border-white/10 rounded-xl">No autoresponder triggers configured yet.</div>';
            return;
          }

          list.innerHTML = rules.map(r => {
            const emojis = (r.reactions || []).map(re => re.emoji).join(' ');
            return '<div class="flex items-center justify-between p-4 rounded-xl bg-slate-900/40 border border-white/5">' +
              '<div>' +
                '<div class="flex items-center gap-2">' +
                  '<span class="font-mono text-xs font-bold text-indigo-300">"' + r.trigger_phrase + '"</span>' +
                  '<span class="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/5 text-slate-400 uppercase">' + r.match_type + '</span>' +
                '</div>' +
                '<p class="text-xs text-slate-300 mt-1">' + r.reply_content + '</p>' +
                (emojis ? '<span class="text-xs text-slate-400 mt-1 inline-block">Reactions: ' + emojis + '</span>' : '') +
              '</div>' +
              '<button class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 transition-all cursor-pointer" onclick="deleteAR(' + r.responder_id + ')">' +
                '<i data-lucide="trash-2" class="w-3.5 h-3.5"></i>' +
                '<span>Delete</span>' +
              '</button>' +
            '</div>';
          }).join('');
          if (window.lucide) lucide.createIcons();
        }

        async function deleteAR(id) {
          const res = await fetch('/api/guilds/${guildId}/autoresponder/' + id, { method: 'DELETE' });
          if (res.ok) { showToast("Trigger Deleted!"); loadAR(); }
        }

        document.getElementById('arForm').onsubmit = async (e) => {
          e.preventDefault();
          const body = {
            trigger_phrase: document.getElementById('arTrigger').value,
            match_type: document.getElementById('arMatchType').value,
            reply_content: document.getElementById('arReply').value,
            emoji_reactions: document.getElementById('arReactions').value.split(/\\s+/).filter(Boolean)
          };
          const res = await fetch('/api/guilds/${guildId}/autoresponder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          if (res.ok) {
            showToast("Trigger Created Successfully!");
            document.getElementById('arForm').reset();
            loadAR();
          }
        };

        loadAR();
      </script>
    `,
    })
  );
});

// 9. Sticky Messages Page
pagesRouter.get("/dashboard/:guildId/sticky", requireAuth, requireGuildAdmin, (c) => {
  const user = c.get("user");
  const currentGuild = c.get("currentGuild");
  const guildId = currentGuild.id;

  return c.html(
    renderLayout({
      title: `Sticky Messages • ${currentGuild.name}`,
      user,
      currentGuild,
      activeTab: "sticky",
      content: `
      <div class="glass-panel p-6 sm:p-8 rounded-2xl">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <i data-lucide="pin" class="w-5 h-5"></i>
          </div>
          <div>
            <h2 class="text-lg font-bold text-white">Persistent Sticky Channel Notice</h2>
            <p class="text-xs text-slate-400">Set up a notice that automatically repins itself to the bottom of the channel as members chat.</p>
          </div>
        </div>

        <form id="stickyForm" class="mt-6 space-y-5">
          <div class="max-w-sm">
            <label class="block text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold mb-2">Select Channel</label>
            <select id="stickyChannel" class="glass-input rounded-xl w-full px-4 py-2.5 text-xs text-white outline-none" onchange="loadSticky()">
              <option value="">Loading channels...</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold mb-2">Sticky Notice Message Content</label>
            <textarea id="stickyContent" class="glass-input rounded-xl w-full px-4 py-2.5 text-xs text-white outline-none font-sans" rows="5" placeholder="Enter notice announcement text..."></textarea>
          </div>

          <div class="pt-2 flex flex-wrap items-center gap-3">
            <button type="submit" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/30 transition-all cursor-pointer">
              <i data-lucide="save" class="w-4 h-4"></i>
              <span>Save Sticky Notice</span>
            </button>

            <button type="button" id="removeStickyBtn" class="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 transition-all cursor-pointer">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
              <span>Remove Notice</span>
            </button>
          </div>
        </form>
      </div>

      <script>
        async function init() {
          const meta = await (await fetch('/api/guilds/${guildId}/meta')).json();
          document.getElementById('stickyChannel').innerHTML = meta.channels.map(c => '<option value="' + c.id + '">#' + c.name + '</option>').join('');
          loadSticky();
        }

        async function loadSticky() {
          const chId = document.getElementById('stickyChannel').value;
          if (!chId) return;
          const res = await fetch('/api/guilds/${guildId}/sticky/' + chId);
          const data = await res.json();
          document.getElementById('stickyContent').value = data.sticky_content || '';
        }

        document.getElementById('stickyForm').onsubmit = async (e) => {
          e.preventDefault();
          const chId = document.getElementById('stickyChannel').value;
          const content = document.getElementById('stickyContent').value;
          const res = await fetch('/api/guilds/${guildId}/sticky', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channel_id: chId, content })
          });
          if (res.ok) showToast("Sticky Notice Saved Successfully!");
        };

        document.getElementById('removeStickyBtn').onclick = async () => {
          const chId = document.getElementById('stickyChannel').value;
          const res = await fetch('/api/guilds/${guildId}/sticky/' + chId, { method: 'DELETE' });
          if (res.ok) {
            document.getElementById('stickyContent').value = '';
            showToast("Sticky Notice Removed!");
          }
        };

        init();
      </script>
    `,
    })
  );
});
