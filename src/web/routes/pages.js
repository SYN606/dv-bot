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
  breadcrumbs = [],
  client = null,
}) {
  const avatarUrl = user?.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
    : "https://cdn.discordapp.com/embed/avatars/0.png";

  const botAvatar =
    client?.user?.displayAvatarURL?.({ extension: "png", size: 256 }) ||
    (client?.user?.avatar
      ? `https://cdn.discordapp.com/avatars/${client.user.id}/${client.user.avatar}.png`
      : "https://cdn.discordapp.com/embed/avatars/0.png");

  const botName = client?.user?.username || "Digital Vigital";

  const navItems = currentGuild
    ? [
        {
          group: "GENERAL",
          items: [
            { id: "overview", label: "Overview", icon: "layout-dashboard", path: `/dashboard/${currentGuild.id}` },
            { id: "analytics", label: "Analytics & Trends", icon: "trending-up", path: `/dashboard/${currentGuild.id}/analytics` },
          ],
        },
        {
          group: "SECURITY & ACCESS",
          items: [
            { id: "verification", label: "Verification Gate", icon: "shield-check", path: `/dashboard/${currentGuild.id}/verification` },
            { id: "admin_roles", label: "Staff Admin Roles", icon: "shield", path: `/dashboard/${currentGuild.id}/admin-roles` },
          ],
        },
        {
          group: "CHANNELS & MODERATION",
          items: [
            { id: "media_only", label: "Media-Only Channels", icon: "image", path: `/dashboard/${currentGuild.id}/media-only` },
            { id: "commands", label: "Command Restrictions", icon: "terminal", path: `/dashboard/${currentGuild.id}/commands` },
            { id: "sticky", label: "Sticky Channel Notice", icon: "pin", path: `/dashboard/${currentGuild.id}/sticky` },
          ],
        },
        {
          group: "AUTOMATION",
          items: [
            { id: "autoresponder", label: "Autoresponder", icon: "bot", path: `/dashboard/${currentGuild.id}/autoresponder` },
            { id: "config", label: "Roles & Audit Logs", icon: "sliders", path: `/dashboard/${currentGuild.id}/config` },
          ],
        },
      ]
    : [];

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} • ${botName} Dashboard</title>
  
  <!-- Favicon uses bot picture -->
  <link rel="icon" type="image/png" href="${botAvatar}">

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
          }
        }
      }
    }
  </script>

  <!-- Lucide Icons -->
  <script src="https://unpkg.com/lucide@latest"></script>

  <!-- Chart.js for Analytics Graphs -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

  <style>
    /* Glassmorphism custom styling */
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

  ${
    currentGuild
      ? `
    <!-- Modern Side Panel Layout -->
    <div class="min-h-screen flex flex-col md:flex-row flex-1">
      
      <!-- Mobile Top Bar with Drawer Toggle -->
      <div class="md:hidden flex items-center justify-between p-4 glass-panel border-b border-white/10 sticky top-0 z-50">
        <a href="/" class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg overflow-hidden ring-1 ring-indigo-500/40">
            <img src="${botAvatar}" alt="${botName}" class="w-full h-full object-cover">
          </div>
          <span class="font-extrabold text-sm text-white tracking-tight">${botName}</span>
        </a>
        <button id="mobileMenuBtn" class="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-300">
          <i data-lucide="menu" class="w-5 h-5"></i>
        </button>
      </div>

      <!-- Backdrop for mobile drawer -->
      <div id="drawerBackdrop" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 hidden md:hidden"></div>

      <!-- Left Glass Sidebar -->
      <aside id="sidebarDrawer" class="fixed inset-y-0 left-0 w-64 glass-panel border-r border-white/10 flex flex-col z-50 transform -translate-x-full md:translate-x-0 md:static md:h-screen transition-transform duration-300 shrink-0">
        
        <!-- Sidebar Brand Header with Bot Picture -->
        <div class="p-4 border-b border-white/5 flex items-center justify-between">
          <a href="/" class="flex items-center gap-2.5 group">
            <div class="w-9 h-9 rounded-xl overflow-hidden ring-1 ring-indigo-500/50 shadow-md shadow-indigo-500/20 shrink-0">
              <img src="${botAvatar}" alt="${botName}" class="w-full h-full object-cover group-hover:scale-105 transition-transform">
            </div>
            <div class="flex flex-col">
              <span class="font-bold text-sm tracking-tight text-white leading-tight truncate max-w-[130px]">${botName}</span>
              <span class="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Control Panel</span>
            </div>
          </a>
          <a href="/dashboard" class="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all text-xs" title="Switch Server">
            <i data-lucide="arrow-left-right" class="w-3.5 h-3.5"></i>
          </a>
        </div>

        <!-- Active Server Badge -->
        <div class="p-3 m-3 rounded-xl bg-slate-900/60 border border-white/5 flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-[1px] shrink-0">
            <div class="w-full h-full bg-slate-900 rounded-[11px] flex items-center justify-center overflow-hidden">
              ${
                currentGuild.icon
                  ? `<img src="https://cdn.discordapp.com/icons/${currentGuild.id}/${currentGuild.icon}.png" alt="" class="w-full h-full object-cover">`
                  : `<span class="font-bold text-xs text-indigo-300 font-mono">${currentGuild.name.slice(0, 2).toUpperCase()}</span>`
              }
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="text-xs font-bold text-white truncate">${currentGuild.name}</h4>
            <span class="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Connected
            </span>
          </div>
        </div>

        <!-- Sidebar Navigation Menu -->
        <nav class="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          ${navItems
            .map(
              (group) => `
            <div>
              <span class="px-3 text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase">${group.group}</span>
              <div class="mt-1 space-y-1">
                ${group.items
                  .map(
                    (item) => `
                  <a href="${item.path}" class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === item.id
                        ? "bg-gradient-to-r from-indigo-500/25 to-purple-500/25 text-white border border-indigo-500/30 shadow-md shadow-indigo-500/10"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                    }">
                    <i data-lucide="${item.icon}" class="w-4 h-4 ${activeTab === item.id ? "text-indigo-400" : "text-slate-400"}"></i>
                    <span>${item.label}</span>
                  </a>
                `
                  )
                  .join("")}
              </div>
            </div>
          `
            )
            .join("")}
        </nav>

        <!-- Sidebar User Profile Footer with Discord PFP -->
        <div class="p-3 border-t border-white/5">
          <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-white/10">
            <div class="flex items-center gap-2.5 min-w-0">
              <img src="${avatarUrl}" alt="${user?.username || 'User'}" class="w-8 h-8 rounded-full ring-2 ring-indigo-500/40 shrink-0 object-cover">
              <div class="min-w-0">
                <p class="text-xs font-bold text-white truncate">${user?.username || "Admin"}</p>
                <p class="text-[10px] text-slate-400 font-mono">ID: ${(user?.id || "").slice(0, 8)}...</p>
              </div>
            </div>
            <a href="/auth/logout" class="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors" title="Logout">
              <i data-lucide="log-out" class="w-4 h-4"></i>
            </a>
          </div>
        </div>
      </aside>

      <!-- Right Main Content Area -->
      <div class="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        <!-- Top Navbar with Breadcrumb & Quick Actions -->
        <header class="p-4 sm:px-8 border-b border-white/5 flex items-center justify-between backdrop-blur-xl bg-slate-950/40">
          <div class="flex items-center gap-2 text-xs text-slate-400">
            <a href="/dashboard" class="hover:text-white transition-colors">Servers</a>
            <i data-lucide="chevron-right" class="w-3.5 h-3.5 text-slate-600"></i>
            <span class="text-slate-200 font-medium truncate max-w-[150px] sm:max-w-none">${currentGuild.name}</span>
            ${
              breadcrumbs.length > 0
                ? breadcrumbs
                    .map(
                      (b) => `
                <i data-lucide="chevron-right" class="w-3.5 h-3.5 text-slate-600"></i>
                <span class="text-indigo-300 font-semibold">${b}</span>
              `
                    )
                    .join("")
                : ""
            }
          </div>

          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/60 border border-white/10">
              <img src="${avatarUrl}" alt="${user?.username || ''}" class="w-5 h-5 rounded-full ring-1 ring-indigo-500/50">
              <span class="text-xs font-semibold text-slate-200">${user?.username || "User"}</span>
            </div>
            <a href="/auth/logout" class="p-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 border border-white/10 text-slate-400 hover:text-rose-300 transition-all" title="Logout">
              <i data-lucide="log-out" class="w-4 h-4"></i>
            </a>
          </div>
        </header>

        <!-- Main Content Area -->
        <main class="p-4 sm:p-8 max-w-6xl w-full mx-auto flex-1">
          ${content}
        </main>
      </div>
    </div>
    `
      : `
    <!-- Top-nav Layout (for Landing & Server Selector) -->
    <header class="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/75 border-b border-white/10 px-6 py-3.5 flex items-center justify-between">
      <a href="/" class="flex items-center gap-3 group">
        <div class="w-10 h-10 rounded-xl overflow-hidden ring-1 ring-indigo-500/50 shadow-lg shadow-indigo-500/25 shrink-0">
          <img src="${botAvatar}" alt="${botName}" class="w-full h-full object-cover group-hover:scale-105 transition-transform">
        </div>
        <div class="flex flex-col">
          <span class="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
            ${botName}
          </span>
          <span class="text-[10px] font-mono tracking-widest text-slate-400 uppercase -mt-1">Dashboard</span>
        </div>
      </a>

      <div class="flex items-center gap-3">
        ${
          user
            ? `
            <div class="flex items-center gap-3">
              <a href="/dashboard" class="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-900 border border-white/10 backdrop-blur-md text-xs font-semibold text-slate-200 transition-all shadow-md">
                <img src="${avatarUrl}" alt="${user.username}" class="w-6 h-6 rounded-full ring-2 ring-indigo-400/50 object-cover">
                <span>${user.username}</span>
              </a>
              <a href="/auth/logout" class="p-2 rounded-xl bg-white/5 hover:bg-rose-500/15 border border-white/10 text-slate-400 hover:text-rose-300 transition-all" title="Logout">
                <i data-lucide="log-out" class="w-4 h-4"></i>
              </a>
            </div>
          `
            : `
            <a href="/auth/login" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#5865F2] hover:bg-[#4752c4] text-white shadow-lg shadow-indigo-500/25 transition-all">
              <i data-lucide="disc" class="w-4 h-4"></i>
              <span>Login with Discord</span>
            </a>
          `
        }
      </div>
    </header>

    <main class="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex-1">
      ${content}
    </main>
    `
  }

  <!-- Modern Floating Toast Notification -->
  <div id="toast" class="fixed bottom-6 right-6 z-50 glass-panel border-emerald-500/30 text-emerald-300 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-semibold transition-all duration-300 transform translate-y-12 opacity-0 pointer-events-none">
    <i data-lucide="check-circle" class="w-4 h-4 text-emerald-400 shrink-0"></i>
    <span id="toastMsg">Settings Saved Successfully!</span>
  </div>

  <footer class="border-t border-white/5 py-6 text-center text-xs text-slate-500 font-mono">
    <span>Powered by <strong class="text-indigo-400">${botName}</strong> • Pure JS Bun Engine</span>
  </footer>

  <script>
    // Initialize Lucide Icons
    document.addEventListener("DOMContentLoaded", () => {
      if (window.lucide) lucide.createIcons();

      // Mobile drawer toggle
      const btn = document.getElementById("mobileMenuBtn");
      const drawer = document.getElementById("sidebarDrawer");
      const backdrop = document.getElementById("drawerBackdrop");

      if (btn && drawer && backdrop) {
        btn.onclick = () => {
          drawer.classList.remove("-translate-x-full");
          backdrop.classList.remove("hidden");
        };
        backdrop.onclick = () => {
          drawer.classList.add("-translate-x-full");
          backdrop.classList.add("hidden");
        };
      }
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

// 1. Landing Page with Bot Banner and Bot Avatar
pagesRouter.get("/", (c) => {
  const client = c.get("discordClient");
  const user = c.get("user");

  const botAvatar =
    client?.user?.displayAvatarURL?.({ extension: "png", size: 256 }) ||
    "https://cdn.discordapp.com/embed/avatars/0.png";
  const botBanner = client?.user?.bannerURL?.({ extension: "png", size: 1024 }) || null;
  const botUsername = client?.user?.username || "Digital Vigital";

  return c.html(
    renderLayout({
      title: "Home",
      client,
      user,
      content: `
      <!-- Bot Hero Banner Card -->
      <div class="relative w-full max-w-4xl mx-auto mb-10 rounded-3xl overflow-hidden glass-panel border border-white/10 shadow-2xl">
        ${
          botBanner
            ? `
          <div class="w-full h-44 sm:h-64 relative overflow-hidden">
            <img src="${botBanner}" alt="${botUsername} Banner" class="w-full h-full object-cover">
            <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
          </div>
        `
            : `
          <div class="w-full h-44 sm:h-56 relative overflow-hidden bg-gradient-to-r from-indigo-900/50 via-purple-900/40 to-slate-950">
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent"></div>
            <div class="absolute -right-10 -bottom-10 opacity-10">
              <img src="${botAvatar}" class="w-64 h-64 rounded-full">
            </div>
          </div>
        `
        }

        <!-- Bot Picture & Brand Badge Floating Over Banner -->
        <div class="relative px-6 sm:px-8 pb-8 pt-0 flex flex-col sm:flex-row items-center sm:items-end gap-6 -mt-16 sm:-mt-20">
          <div class="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-slate-950 p-1.5 ring-4 ring-indigo-500/40 shadow-2xl relative shrink-0">
            <img src="${botAvatar}" alt="${botUsername}" class="w-full h-full rounded-[22px] object-cover">
            <span class="absolute bottom-2 right-2 w-4 h-4 rounded-full bg-emerald-400 ring-4 ring-slate-950 animate-pulse" title="Online"></span>
          </div>

          <div class="text-center sm:text-left flex-1 min-w-0">
            <div class="flex items-center justify-center sm:justify-start gap-2.5">
              <h1 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">${botUsername}</h1>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">DISCORD BOT</span>
            </div>
            <p class="text-xs sm:text-sm text-slate-300 mt-1">
              The Modern Discord Bot Dashboard — Verification, Media Channels, Command Controls, and Real-Time Analytics
            </p>
          </div>

          <div class="shrink-0 flex items-center gap-3">
            <a href="/dashboard" class="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-xl shadow-indigo-500/25 border border-indigo-400/30 transition-all hover:scale-105">
              <span>Open Dashboard</span>
              <i data-lucide="arrow-right" class="w-4 h-4"></i>
            </a>
            <a href="https://discord.com/oauth2/authorize?client_id=${CONFIG.CLIENT_ID}&scope=bot%20applications.commands&permissions=8" target="_blank" class="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white backdrop-blur-md transition-all">
              <i data-lucide="plus-circle" class="w-4 h-4 text-indigo-400"></i>
              <span>Invite</span>
            </a>
          </div>
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
            <i data-lucide="trending-up" class="w-6 h-6"></i>
          </div>
          <h3 class="text-base font-bold text-white mb-2">Visual Analytics</h3>
          <p class="text-xs text-slate-400 leading-relaxed">
            Track 7-day chat message surges, voice channel hours, and top community leaders with high-definition interactive graphs.
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
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-[2px] shadow-lg shadow-indigo-500/20 shrink-0">
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
          <h3 class="text-sm font-bold text-white truncate group-hover:text-indigo-300 transition-colors">${g.name}</h3>
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
                Invite Bot
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
      client,
      content: `
      <div class="mb-8">
        <h1 class="text-2xl font-bold tracking-tight text-white mb-2">Select a Server</h1>
        <p class="text-xs text-slate-400">Choose a server where you have Administrator or Manage Server permissions to configure the bot.</p>
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
  const client = c.get("discordClient");

  return c.html(
    renderLayout({
      title: currentGuild.name,
      user,
      client,
      currentGuild,
      activeTab: "overview",
      breadcrumbs: ["Overview"],
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
            <span class="text-[11px] font-mono tracking-wider uppercase text-slate-400 font-semibold">Server Roles</span>
            <h3 class="text-2xl font-extrabold text-white mt-0.5">${botGuild?.roles.cache.size || 0}</h3>
          </div>
        </div>
      </div>

      <!-- Quick Action Modules -->
      <div class="glass-panel p-6 sm:p-8 rounded-2xl mb-8">
        <h2 class="text-base font-bold text-white mb-2 flex items-center gap-2">
          <i data-lucide="sparkles" class="w-5 h-5 text-indigo-400"></i>
          <span>Feature Control Center</span>
        </h2>
        <p class="text-xs text-slate-400 mb-6">Manage all server automations and channel policies directly using the sidebar navigation.</p>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <a href="/dashboard/${currentGuild.id}/analytics" class="p-4 rounded-xl bg-slate-900/40 border border-white/5 hover:border-indigo-500/40 hover:bg-slate-900/80 transition-all group">
            <div class="flex items-center gap-3">
              <i data-lucide="trending-up" class="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform"></i>
              <div>
                <h4 class="text-xs font-bold text-white">Visual Analytics</h4>
                <p class="text-[11px] text-slate-400">7-day graphs & leaderboards</p>
              </div>
            </div>
          </a>

          <a href="/dashboard/${currentGuild.id}/verification" class="p-4 rounded-xl bg-slate-900/40 border border-white/5 hover:border-purple-500/40 hover:bg-slate-900/80 transition-all group">
            <div class="flex items-center gap-3">
              <i data-lucide="shield-check" class="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform"></i>
              <div>
                <h4 class="text-xs font-bold text-white">Verification Gate</h4>
                <p class="text-[11px] text-slate-400">Deploy click-to-verify panels</p>
              </div>
            </div>
          </a>

          <a href="/dashboard/${currentGuild.id}/admin-roles" class="p-4 rounded-xl bg-slate-900/40 border border-white/5 hover:border-cyan-500/40 hover:bg-slate-900/80 transition-all group">
            <div class="flex items-center gap-3">
              <i data-lucide="shield" class="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform"></i>
              <div>
                <h4 class="text-xs font-bold text-white">Staff Admin Roles</h4>
                <p class="text-[11px] text-slate-400">Designate bot authority roles</p>
              </div>
            </div>
          </a>
        </div>
      </div>
    `,
    })
  );
});

// 4. Analytics & Graphs Page
pagesRouter.get("/dashboard/:guildId/analytics", requireAuth, requireGuildAdmin, (c) => {
  const user = c.get("user");
  const currentGuild = c.get("currentGuild");
  const guildId = currentGuild.id;
  const client = c.get("discordClient");

  return c.html(
    renderLayout({
      title: `Analytics • ${currentGuild.name}`,
      user,
      client,
      currentGuild,
      activeTab: "analytics",
      breadcrumbs: ["Analytics & Trends"],
      content: `
      <!-- Graphs Container -->
      <div class="space-y-6">
        
        <!-- Header -->
        <div class="glass-panel p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-lg font-bold text-white flex items-center gap-2">
              <i data-lucide="trending-up" class="w-5 h-5 text-indigo-400"></i>
              <span>Server Telemetry & Activity Graphs</span>
            </h2>
            <p class="text-xs text-slate-400 mt-1">Real-time tracking of message volume, voice minutes, and top active members.</p>
          </div>
          <button onclick="loadAnalytics()" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all">
            <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
            <span>Refresh</span>
          </button>
        </div>

        <!-- 7-Day Messages Trend Chart -->
        <div class="glass-panel p-6 rounded-2xl">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-sm font-bold text-white">Chat Message Volume (Last 7 Days)</h3>
              <p class="text-[11px] text-slate-400">Daily message count trend across all server channels</p>
            </div>
            <span id="totalMessages7d" class="text-sm font-mono font-bold text-indigo-400">0 messages</span>
          </div>
          <div class="w-full h-64">
            <canvas id="messagesChart"></canvas>
          </div>
        </div>

        <!-- 7-Day Voice Activity Chart -->
        <div class="glass-panel p-6 rounded-2xl">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-sm font-bold text-white">Voice Channel Activity (Minutes per Day)</h3>
              <p class="text-[11px] text-slate-400">Daily cumulative time spent by members in voice channels</p>
            </div>
            <span id="totalVc7d" class="text-sm font-mono font-bold text-purple-400">0 mins</span>
          </div>
          <div class="w-full h-64">
            <canvas id="vcChart"></canvas>
          </div>
        </div>

        <!-- Leaderboards Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <!-- Top Chatters -->
          <div class="glass-panel p-6 rounded-2xl">
            <h3 class="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <i data-lucide="message-square" class="w-4 h-4 text-indigo-400"></i>
              <span>Top Active Chatters</span>
            </h3>
            <p class="text-[11px] text-slate-400 mb-4">Members with the highest message count</p>
            <div id="topChattersList" class="space-y-2.5">
              <div class="text-xs text-slate-500">Loading chat leaderboard...</div>
            </div>
          </div>

          <!-- Top Voice Members -->
          <div class="glass-panel p-6 rounded-2xl">
            <h3 class="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <i data-lucide="mic" class="w-4 h-4 text-purple-400"></i>
              <span>Top Voice Leaders</span>
            </h3>
            <p class="text-[11px] text-slate-400 mb-4">Members with the most time spent in voice</p>
            <div id="topVoiceList" class="space-y-2.5">
              <div class="text-xs text-slate-500">Loading voice leaderboard...</div>
            </div>
          </div>

        </div>
      </div>

      <script>
        let msgChartInstance = null;
        let vcChartInstance = null;

        async function loadAnalytics() {
          const res = await fetch('/api/guilds/${guildId}/analytics');
          const data = await res.json();

          const labels = data.timeline.map(t => t.date.slice(5)); // MM-DD
          const msgCounts = data.timeline.map(t => t.messages);
          const vcCounts = data.timeline.map(t => t.vc_minutes);

          const sumMessages = msgCounts.reduce((a, b) => a + b, 0);
          const sumVc = vcCounts.reduce((a, b) => a + b, 0);
          document.getElementById('totalMessages7d').textContent = sumMessages.toLocaleString() + ' messages';
          document.getElementById('totalVc7d').textContent = sumVc.toLocaleString() + ' mins (' + (sumVc / 60).toFixed(1) + ' hrs)';

          // 1. Render Messages Line Chart
          const ctxMsg = document.getElementById('messagesChart').getContext('2d');
          if (msgChartInstance) msgChartInstance.destroy();

          const gradientMsg = ctxMsg.createLinearGradient(0, 0, 0, 250);
          gradientMsg.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
          gradientMsg.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

          msgChartInstance = new Chart(ctxMsg, {
            type: 'line',
            data: {
              labels,
              datasets: [{
                label: 'Messages',
                data: msgCounts,
                borderColor: '#6366f1',
                backgroundColor: gradientMsg,
                fill: true,
                tension: 0.35,
                borderWidth: 2.5,
                pointBackgroundColor: '#818cf8',
                pointRadius: 4,
                pointHoverRadius: 6,
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { grid: { color: 'rgba(255, 255, 255, 0.04)' }, ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } } },
                y: { grid: { color: 'rgba(255, 255, 255, 0.04)' }, ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 }, precision: 0 }, beginAtZero: true }
              }
            }
          });

          // 2. Render VC Bar Chart
          const ctxVc = document.getElementById('vcChart').getContext('2d');
          if (vcChartInstance) vcChartInstance.destroy();

          vcChartInstance = new Chart(ctxVc, {
            type: 'bar',
            data: {
              labels,
              datasets: [{
                label: 'Voice Minutes',
                data: vcCounts,
                backgroundColor: 'rgba(168, 85, 247, 0.5)',
                borderColor: '#a855f7',
                borderWidth: 1.5,
                borderRadius: 8,
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } } },
                y: { grid: { color: 'rgba(255, 255, 255, 0.04)' }, ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 }, precision: 0 }, beginAtZero: true }
              }
            }
          });

          // 3. Render Leaderboards
          const chatList = document.getElementById('topChattersList');
          if (data.topChatters.length === 0) {
            chatList.innerHTML = '<p class="text-xs text-slate-500">No message activity recorded yet.</p>';
          } else {
            chatList.innerHTML = data.topChatters.map((m, idx) => {
              const avatar = m.avatar ? '<img src="' + m.avatar + '" class="w-full h-full object-cover">' : '<span class="text-[10px] text-slate-400">?</span>';
              return '<div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/40 border border-white/5">' +
                '<div class="flex items-center gap-2.5">' +
                  '<span class="w-5 font-mono text-xs font-bold text-slate-500">#' + (idx + 1) + '</span>' +
                  '<div class="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden">' + avatar + '</div>' +
                  '<span class="text-xs font-semibold text-white">' + m.username + '</span>' +
                '</div>' +
                '<span class="text-xs font-mono text-indigo-400 font-bold">' + m.messages.toLocaleString() + ' msgs</span>' +
              '</div>';
            }).join('');
          }

          const vcList = document.getElementById('topVoiceList');
          if (data.topVoice.length === 0) {
            vcList.innerHTML = '<p class="text-xs text-slate-500">No voice activity recorded yet.</p>';
          } else {
            vcList.innerHTML = data.topVoice.map((m, idx) => {
              const avatar = m.avatar ? '<img src="' + m.avatar + '" class="w-full h-full object-cover">' : '<span class="text-[10px] text-slate-400">?</span>';
              return '<div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/40 border border-white/5">' +
                '<div class="flex items-center gap-2.5">' +
                  '<span class="w-5 font-mono text-xs font-bold text-slate-500">#' + (idx + 1) + '</span>' +
                  '<div class="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden">' + avatar + '</div>' +
                  '<span class="text-xs font-semibold text-white">' + m.username + '</span>' +
                '</div>' +
                '<span class="text-xs font-mono text-purple-400 font-bold">' + m.vcMinutes + ' mins</span>' +
              '</div>';
            }).join('');
          }

          if (window.lucide) lucide.createIcons();
        }

        loadAnalytics();
      </script>
    `,
    })
  );
});

// 5. Verification Setup Page
pagesRouter.get("/dashboard/:guildId/verification", requireAuth, requireGuildAdmin, (c) => {
  const user = c.get("user");
  const currentGuild = c.get("currentGuild");
  const guildId = currentGuild.id;
  const client = c.get("discordClient");

  return c.html(
    renderLayout({
      title: `Verification • ${currentGuild.name}`,
      user,
      client,
      currentGuild,
      activeTab: "verification",
      breadcrumbs: ["Verification Gate"],
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

// 6. Staff & Admin Roles Page
pagesRouter.get("/dashboard/:guildId/admin-roles", requireAuth, requireGuildAdmin, (c) => {
  const user = c.get("user");
  const currentGuild = c.get("currentGuild");
  const guildId = currentGuild.id;
  const client = c.get("discordClient");

  return c.html(
    renderLayout({
      title: `Staff Admin Roles • ${currentGuild.name}`,
      user,
      client,
      currentGuild,
      activeTab: "admin_roles",
      breadcrumbs: ["Staff Admin Roles"],
      content: `
      <div class="glass-panel p-6 sm:p-8 rounded-2xl">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <i data-lucide="shield" class="w-5 h-5"></i>
          </div>
          <div>
            <h2 class="text-lg font-bold text-white">Staff Admin Role Authorization</h2>
            <p class="text-xs text-slate-400">Designate server roles that receive full bot administration privileges without needing the Discord Administrator permission.</p>
          </div>
        </div>

        <form id="addAdminRoleForm" class="mt-6 flex flex-col sm:flex-row gap-3 items-end mb-8">
          <div class="w-full sm:flex-1">
            <label class="block text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold mb-2">Select Server Role</label>
            <select id="adminRoleSelect" class="glass-input rounded-xl w-full px-4 py-2.5 text-xs text-white outline-none">
              <option value="">Loading roles...</option>
            </select>
          </div>
          <button type="submit" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-lg shadow-amber-500/25 border border-amber-400/30 transition-all cursor-pointer shrink-0">
            <i data-lucide="plus" class="w-4 h-4"></i>
            <span>Add Admin Role</span>
          </button>
        </form>

        <div class="border-t border-white/10 pt-6">
          <h3 class="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold mb-4">Authorized Admin Roles</h3>
          <div id="adminRolesList" class="space-y-3">
            <div class="p-4 rounded-xl bg-slate-900/40 text-xs text-slate-400">Loading admin roles...</div>
          </div>
        </div>
      </div>

      <script>
        async function loadAdminRoles() {
          const [metaRes, rolesRes] = await Promise.all([
            fetch('/api/guilds/${guildId}/meta'),
            fetch('/api/guilds/${guildId}/admin_roles')
          ]);
          const meta = await metaRes.json();
          const { adminRoles } = await rolesRes.json();

          const select = document.getElementById('adminRoleSelect');
          select.innerHTML = meta.roles.map(r => '<option value="' + r.id + '">@' + r.name + '</option>').join('');

          const list = document.getElementById('adminRolesList');
          if (adminRoles.length === 0) {
            list.innerHTML = '<div class="p-6 text-center text-xs text-slate-500 border border-dashed border-white/10 rounded-xl">No custom admin roles configured. Server Owner & Discord Admins bypass all restrictions automatically.</div>';
            return;
          }

          list.innerHTML = adminRoles.map(r => {
            return '<div class="flex items-center justify-between p-4 rounded-xl bg-slate-900/40 border border-white/5">' +
              '<div class="flex items-center gap-3">' +
                '<span class="w-3.5 h-3.5 rounded-full ring-2 ring-white/10" style="background-color: ' + r.color + ';"></span>' +
                '<div>' +
                  '<strong class="text-xs font-bold text-white">@' + r.name + '</strong>' +
                  '<p class="text-[10px] text-slate-400 font-mono">ID: ' + r.id + '</p>' +
                '</div>' +
              '</div>' +
              '<button class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 transition-all cursor-pointer" onclick="removeAdminRole(\\'' + r.id + '\\')">' +
                '<i data-lucide="trash-2" class="w-3.5 h-3.5"></i>' +
                '<span>Revoke</span>' +
              '</button>' +
            '</div>';
          }).join('');

          if (window.lucide) lucide.createIcons();
        }

        async function removeAdminRole(roleId) {
          const res = await fetch('/api/guilds/${guildId}/admin_roles/' + roleId, { method: 'DELETE' });
          if (res.ok) { showToast("Admin Role Revoked!"); loadAdminRoles(); }
        }

        document.getElementById('addAdminRoleForm').onsubmit = async (e) => {
          e.preventDefault();
          const role_id = document.getElementById('adminRoleSelect').value;
          const res = await fetch('/api/guilds/${guildId}/admin_roles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role_id })
          });
          if (res.ok) { showToast("Admin Role Authorized!"); loadAdminRoles(); }
        };

        loadAdminRoles();
      </script>
    `,
    })
  );
});

// 7. Media-Only Setup Page
pagesRouter.get("/dashboard/:guildId/media-only", requireAuth, requireGuildAdmin, (c) => {
  const user = c.get("user");
  const currentGuild = c.get("currentGuild");
  const guildId = currentGuild.id;
  const client = c.get("discordClient");

  return c.html(
    renderLayout({
      title: `Media-Only Channels • ${currentGuild.name}`,
      user,
      client,
      currentGuild,
      activeTab: "media_only",
      breadcrumbs: ["Media-Only Channels"],
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
          <button type="submit" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/30 transition-all cursor-pointer shrink-0">
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

// 8. Command Restrictions Page
pagesRouter.get("/dashboard/:guildId/commands", requireAuth, requireGuildAdmin, (c) => {
  const user = c.get("user");
  const currentGuild = c.get("currentGuild");
  const guildId = currentGuild.id;
  const client = c.get("discordClient");

  return c.html(
    renderLayout({
      title: `Command Restrictions • ${currentGuild.name}`,
      user,
      client,
      currentGuild,
      activeTab: "commands",
      breadcrumbs: ["Command Restrictions"],
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

// 9. Sticky Notices Page
pagesRouter.get("/dashboard/:guildId/sticky", requireAuth, requireGuildAdmin, (c) => {
  const user = c.get("user");
  const currentGuild = c.get("currentGuild");
  const guildId = currentGuild.id;
  const client = c.get("discordClient");

  return c.html(
    renderLayout({
      title: `Sticky Messages • ${currentGuild.name}`,
      user,
      client,
      currentGuild,
      activeTab: "sticky",
      breadcrumbs: ["Sticky Channel Notice"],
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

// 10. Autoresponder Page
pagesRouter.get("/dashboard/:guildId/autoresponder", requireAuth, requireGuildAdmin, (c) => {
  const user = c.get("user");
  const currentGuild = c.get("currentGuild");
  const guildId = currentGuild.id;
  const client = c.get("discordClient");

  return c.html(
    renderLayout({
      title: `Autoresponder • ${currentGuild.name}`,
      user,
      client,
      currentGuild,
      activeTab: "autoresponder",
      breadcrumbs: ["Autoresponder"],
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

// 11. Roles & Audit Logs Page
pagesRouter.get("/dashboard/:guildId/config", requireAuth, requireGuildAdmin, (c) => {
  const user = c.get("user");
  const currentGuild = c.get("currentGuild");
  const guildId = currentGuild.id;
  const client = c.get("discordClient");

  return c.html(
    renderLayout({
      title: `Roles & Logs • ${currentGuild.name}`,
      user,
      client,
      currentGuild,
      activeTab: "config",
      breadcrumbs: ["Roles & Audit Logs"],
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
