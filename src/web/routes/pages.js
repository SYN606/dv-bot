import { Hono } from "hono";
import { requireAuth, requireGuildAdmin } from "../middleware/auth.js";
import { CONFIG } from "../../config.js";

export const pagesRouter = new Hono();

function renderLayout({ title, content, user = null, currentGuild = null, activeTab = "" }) {
  const avatarUrl = user?.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
    : "https://cdn.discordapp.com/embed/avatars/0.png";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} • DV-BOT Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-dark: #1e1f22;
      --bg-card: #2b2d31;
      --bg-elevated: #313338;
      --border: #383a40;
      --text-main: #f2f3f5;
      --text-muted: #949ba4;
      --primary: #5865f2;
      --primary-hover: #4752c4;
      --success: #57f287;
      --danger: #ed4245;
      --warning: #fee75c;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
    body { background-color: var(--bg-dark); color: var(--text-main); min-height: 100vh; display: flex; flex-direction: column; }
    header { background: var(--bg-card); border-bottom: 1px solid var(--border); padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
    .logo { font-size: 1.25rem; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 8px; text-decoration: none; }
    .logo span { color: var(--primary); }
    .user-pill { display: flex; align-items: center; gap: 10px; background: var(--bg-elevated); padding: 6px 14px; border-radius: 20px; text-decoration: none; color: inherit; font-size: 0.9rem; font-weight: 500; }
    .user-pill img { width: 28px; height: 28px; border-radius: 50%; }
    .btn { display: inline-flex; align-items: center; justify-content: center; padding: 10px 18px; border-radius: 8px; font-weight: 600; font-size: 0.9rem; text-decoration: none; cursor: pointer; border: none; transition: 0.15s; }
    .btn-primary { background: var(--primary); color: #fff; }
    .btn-primary:hover { background: var(--primary-hover); }
    .btn-danger { background: var(--danger); color: #fff; }
    .btn-secondary { background: var(--bg-elevated); color: var(--text-main); border: 1px solid var(--border); }
    .btn-secondary:hover { background: #3c3e44; }
    .container { max-width: 1100px; margin: 0 auto; width: 100%; padding: 32px 20px; flex: 1; }
    .grid-guilds { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; margin-top: 24px; }
    .card-guild { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; display: flex; align-items: center; gap: 16px; text-decoration: none; color: inherit; transition: transform 0.15s, border-color 0.15s; }
    .card-guild:hover { transform: translateY(-3px); border-color: var(--primary); }
    .guild-icon { width: 54px; height: 54px; border-radius: 16px; background: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.2rem; }
    .guild-icon img { width: 100%; height: 100%; border-radius: 16px; object-fit: cover; }
    .tabs { display: flex; gap: 8px; border-bottom: 1px solid var(--border); margin-bottom: 24px; overflow-x: auto; padding-bottom: 8px; }
    .tab { padding: 10px 18px; border-radius: 8px; font-weight: 600; text-decoration: none; color: var(--text-muted); font-size: 0.95rem; }
    .tab.active, .tab:hover { background: var(--bg-elevated); color: var(--text-main); }
    .module-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 24px; margin-bottom: 24px; }
    .module-card h2 { font-size: 1.2rem; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
    .module-card p { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 20px; line-height: 1.5; }
    .form-group { margin-bottom: 18px; }
    .form-group label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .form-control { width: 100%; background: var(--bg-elevated); border: 1px solid var(--border); padding: 12px 14px; border-radius: 8px; color: var(--text-main); font-size: 0.95rem; outline: none; }
    .form-control:focus { border-color: var(--primary); }
    .switch-group { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border); }
    .toast { position: fixed; bottom: 24px; right: 24px; background: var(--primary); color: #fff; padding: 12px 20px; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: none; z-index: 1000; }
  </style>
</head>
<body>
  <header>
    <a href="/" class="logo">🛡️ DV-<span>BOT</span></a>
    <div>
      ${
        user
          ? `<div style="display: flex; gap: 12px; align-items: center;">
              <a href="/dashboard" class="user-pill">
                <img src="${avatarUrl}" alt="${user.username}">
                <span>${user.username}</span>
              </a>
              <a href="/auth/logout" class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;">Logout</a>
            </div>`
          : `<a href="/auth/login" class="btn btn-primary">Login with Discord</a>`
      }
    </div>
  </header>
  <main class="container">
    ${
      currentGuild
        ? `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div class="guild-icon">
              ${
                currentGuild.icon
                  ? `<img src="https://cdn.discordapp.com/icons/${currentGuild.id}/${currentGuild.icon}.png" alt="">`
                  : currentGuild.name.slice(0, 2)
              }
            </div>
            <div>
              <h1 style="font-size: 1.6rem; font-weight: 700;">${currentGuild.name}</h1>
              <p style="color: var(--text-muted); font-size: 0.85rem;">Server Management & Module Configurations</p>
            </div>
          </div>
          <a href="/dashboard" class="btn btn-secondary">Switch Server</a>
        </div>
        <nav class="tabs">
          <a href="/dashboard/${currentGuild.id}" class="tab ${activeTab === "overview" ? "active" : ""}">Overview</a>
          <a href="/dashboard/${currentGuild.id}/verification" class="tab ${activeTab === "verification" ? "active" : ""}">🛡️ Verification</a>
          <a href="/dashboard/${currentGuild.id}/media-only" class="tab ${activeTab === "media_only" ? "active" : ""}">📷 Media-Only</a>
          <a href="/dashboard/${currentGuild.id}/commands" class="tab ${activeTab === "commands" ? "active" : ""}">⚡ Commands</a>
          <a href="/dashboard/${currentGuild.id}/autoresponder" class="tab ${activeTab === "autoresponder" ? "active" : ""}">🤖 Autoresponder</a>
          <a href="/dashboard/${currentGuild.id}/sticky" class="tab ${activeTab === "sticky" ? "active" : ""}">📌 Sticky Notice</a>
          <a href="/dashboard/${currentGuild.id}/config" class="tab ${activeTab === "config" ? "active" : ""}">⚙️ Roles & Logs</a>
        </nav>
      `
        : ""
    }
    ${content}
  </main>
  <div id="toast" class="toast">Settings Saved Successfully!</div>
  <script>
    function showToast(msg = "Settings Saved Successfully!") {
      const t = document.getElementById("toast");
      t.textContent = msg;
      t.style.display = "block";
      setTimeout(() => { t.style.display = "none"; }, 3000);
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
      <div style="text-align: center; padding: 60px 0;">
        <h1 style="font-size: 3rem; font-weight: 800; margin-bottom: 16px;">The Modern Discord Bot Dashboard</h1>
        <p style="font-size: 1.15rem; color: var(--text-muted); max-width: 600px; margin: 0 auto 32px auto; line-height: 1.6;">
          Configure verification gates, media-only channels, channel command restrictions, autoresponders, and audit logs without tedious Discord chat commands.
        </p>
        <a href="/dashboard" class="btn btn-primary" style="padding: 14px 28px; font-size: 1.05rem;">Open Dashboard &rarr;</a>
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
      const iconUrl = g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null;

      return `
      <a href="${isBotPresent ? `/dashboard/${g.id}` : `https://discord.com/oauth2/authorize?client_id=${CONFIG.CLIENT_ID}&scope=bot%20applications.commands&permissions=8&guild_id=${g.id}`}" 
         class="card-guild">
        <div class="guild-icon">
          ${iconUrl ? `<img src="${iconUrl}" alt="">` : g.name.slice(0, 2)}
        </div>
        <div style="flex: 1; min-width: 0;">
          <h3 style="font-size: 1.05rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${g.name}</h3>
          <span style="font-size: 0.8rem; color: ${isBotPresent ? "var(--success)" : "var(--primary)"}; font-weight: 600;">
            ${isBotPresent ? "🟢 Manage Server" : "➕ Invite Bot"}
          </span>
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
      <h1 style="font-size: 1.7rem; font-weight: 700; margin-bottom: 8px;">Select a Server</h1>
      <p style="color: var(--text-muted); margin-bottom: 24px;">Choose a server where you have administrative permissions to configure DV-BOT.</p>
      <div class="grid-guilds">${cardsHtml}</div>
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
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px;">
        <div class="module-card" style="margin-bottom: 0;">
          <span style="color: var(--text-muted); font-size: 0.85rem; font-weight: 600;">MEMBERS</span>
          <h3 style="font-size: 1.8rem; margin-top: 8px;">${botGuild?.memberCount || "N/A"}</h3>
        </div>
        <div class="module-card" style="margin-bottom: 0;">
          <span style="color: var(--text-muted); font-size: 0.85rem; font-weight: 600;">TEXT CHANNELS</span>
          <h3 style="font-size: 1.8rem; margin-top: 8px;">${botGuild?.channels.cache.filter((ch) => ch.type === 0).size || 0}</h3>
        </div>
        <div class="module-card" style="margin-bottom: 0;">
          <span style="color: var(--text-muted); font-size: 0.85rem; font-weight: 600;">ROLES</span>
          <h3 style="font-size: 1.8rem; margin-top: 8px;">${botGuild?.roles.cache.size || 0}</h3>
        </div>
      </div>
      <div class="module-card">
        <h2>Quick Module Navigation</h2>
        <p>Manage all server automations and channel policies directly using the navigation tabs above.</p>
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
      <div class="module-card">
        <h2>🛡️ Verification Gate Configuration</h2>
        <p>Set up an automated entry gate where new members click a button to receive access roles.</p>
        
        <form id="verifyForm">
          <div class="form-group">
            <label>Verification Channel</label>
            <select id="verifyChannel" class="form-control"><option value="">Loading channels...</option></select>
          </div>
          <div class="form-group">
            <label>Verified Role (Role granted upon verification)</label>
            <select id="verifiedRole" class="form-control"><option value="">Loading roles...</option></select>
          </div>
          <div class="form-group">
            <label>Unverified Role (Role removed upon verification, optional)</label>
            <select id="unverifiedRole" class="form-control"><option value="">None</option></select>
          </div>
          <div class="form-group">
            <label>Verification Log Channel (optional)</label>
            <select id="logChannel" class="form-control"><option value="">None</option></select>
          </div>
          <div style="display: flex; gap: 12px; margin-top: 24px;">
            <button type="submit" class="btn btn-primary">Save Settings</button>
            <button type="button" id="deployBtn" class="btn btn-secondary">Save & Deploy Verification Panel in Channel</button>
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
      <div class="module-card">
        <h2>📷 Media-Only Channel Configuration</h2>
        <p>Designate channels where only images, videos, and media link attachments are permitted. Non-media chat is automatically deleted.</p>

        <form id="addMediaForm" style="display: flex; gap: 12px; align-items: flex-end; margin-bottom: 24px;">
          <div class="form-group" style="flex: 1; margin-bottom: 0;">
            <label>Select Channel</label>
            <select id="mediaChannelSelect" class="form-control"><option value="">Loading channels...</option></select>
          </div>
          <button type="submit" class="btn btn-primary" style="height: 44px;">Enable Media-Only</button>
        </form>

        <div id="mediaChannelsList">Loading active media-only channels...</div>
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
            list.innerHTML = '<p style="color: var(--text-muted);">No channels are currently configured as media-only.</p>';
            return;
          }

          list.innerHTML = media.map(m => {
            const ch = meta.channels.find(c => c.id === String(m.channel_id));
            const name = ch ? '#' + ch.name : 'Channel ' + m.channel_id;
            return '<div style="display: flex; justify-content: space-between; align-items: center; padding: 14px; background: var(--bg-elevated); border-radius: 8px; margin-bottom: 10px;">' +
              '<div><strong>' + name + '</strong><br><span style="font-size: 0.8rem; color: var(--text-muted);">Image Only: ' + (m.image_only ? 'Yes' : 'No') + ' | NSFW Bypass: ' + (m.nsfw_bypass ? 'Yes' : 'No') + '</span></div>' +
              '<button class="btn btn-danger" style="padding: 6px 14px; font-size: 0.8rem;" onclick="removeMedia(' + m.channel_id + ')">Remove</button>' +
            '</div>';
          }).join('');
        }

        async function removeMedia(channelId) {
          const res = await fetch('/api/guilds/${guildId}/media_only/' + channelId, { method: 'DELETE' });
          if (res.ok) { showToast("Channel Removed!"); loadChannels(); }
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
      <div class="module-card">
        <h2>⚡ Channel Command Restrictions</h2>
        <p>Disable specific bot commands in selected channels. Server Administrators always bypass these restrictions.</p>

        <div class="form-group">
          <label>Target Channel</label>
          <select id="channelPicker" class="form-control" onchange="loadCommands()"><option value="">Loading channels...</option></select>
        </div>

        <div id="commandsTable" style="margin-top: 24px;">Loading command list...</div>
      </div>

      <script>
        let allChannels = [];
        let commandsData = [];

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
            return '<div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: var(--bg-elevated); border-radius: 8px; margin-bottom: 8px;">' +
              '<div><strong>/' + cmd.name + '</strong> <span style="color: var(--text-muted); font-size: 0.85rem;">(' + cmd.category + ')</span><br><span style="font-size: 0.8rem; color: var(--text-muted);">' + cmd.description + '</span></div>' +
              '<div>' +
                (cmd.isProtected
                  ? '<span style="font-size: 0.8rem; color: var(--warning);">Protected</span>'
                  : '<button class="btn ' + (isDis ? 'btn-primary' : 'btn-danger') + '" style="padding: 6px 14px; font-size: 0.8rem;" onclick="toggleCmd(\\'' + cmd.name + '\\', ' + isDis + ')">' + (isDis ? 'Enable' : 'Disable') + '</button>'
                ) +
              '</div>' +
            '</div>';
          }).join('');
        }

        async function toggleCmd(cmdName, enable) {
          const chId = document.getElementById('channelPicker').value;
          const res = await fetch('/api/guilds/${guildId}/commands/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channel_id: chId, command_name: cmdName, enable })
          });
          if (res.ok) {
            showToast(enable ? "Command Re-enabled!" : "Command Disabled in Channel!");
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
      <div class="module-card">
        <h2>⚙️ Server Audit Logs & Voice Roles</h2>
        <p>Configure the moderation audit log channel and automated voice channel roles.</p>

        <form id="configForm">
          <div class="form-group">
            <label>Moderation Audit Log Channel</label>
            <select id="logChannel" class="form-control"><option value="">Loading channels...</option></select>
          </div>
          <div class="form-group">
            <label>Voice Channel Auto-Role (Role granted while inside voice channels)</label>
            <select id="vcRole" class="form-control"><option value="">Loading roles...</option></select>
          </div>
          <button type="submit" class="btn btn-primary" style="margin-top: 16px;">Save Configuration</button>
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
          if (res.ok) showToast("Configurations Saved!");
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
      <div class="module-card">
        <h2>🤖 Autoresponder Triggers</h2>
        <p>Automatically reply or react with emojis when specific phrases are sent in chat.</p>

        <form id="arForm" style="background: var(--bg-elevated); padding: 20px; border-radius: 8px; margin-bottom: 24px;">
          <h3 style="margin-bottom: 16px; font-size: 1rem;">Create New Trigger</h3>
          <div class="form-group">
            <label>Trigger Phrase</label>
            <input type="text" id="arTrigger" class="form-control" placeholder="e.g. !discord or hello" required>
          </div>
          <div class="form-group">
            <label>Match Type</label>
            <select id="arMatchType" class="form-control">
              <option value="contains">Contains (Default)</option>
              <option value="exact">Exact Match</option>
              <option value="startswith">Starts With</option>
              <option value="endswith">Ends With</option>
              <option value="regex">Regular Expression</option>
            </select>
          </div>
          <div class="form-group">
            <label>Reply Text</label>
            <textarea id="arReply" class="form-control" rows="3" placeholder="Message content to reply with..." required></textarea>
          </div>
          <div class="form-group">
            <label>Emoji Reactions (separated by spaces, e.g. 👍 ❤️)</label>
            <input type="text" id="arReactions" class="form-control" placeholder="👍 🔥">
          </div>
          <button type="submit" class="btn btn-primary">Create Trigger</button>
        </form>

        <div id="arList">Loading active triggers...</div>
      </div>

      <script>
        async function loadAR() {
          const res = await fetch('/api/guilds/${guildId}/autoresponder');
          const rules = await res.json();
          const list = document.getElementById('arList');

          if (rules.length === 0) {
            list.innerHTML = '<p style="color: var(--text-muted);">No autoresponder triggers created yet.</p>';
            return;
          }

          list.innerHTML = rules.map(r => {
            const emojis = (r.reactions || []).map(re => re.emoji).join(' ');
            return '<div style="display: flex; justify-content: space-between; align-items: center; padding: 14px; background: var(--bg-elevated); border-radius: 8px; margin-bottom: 10px;">' +
              '<div><strong>"' + r.trigger_phrase + '"</strong> <span style="color: var(--text-muted); font-size: 0.8rem;">(' + r.match_type + ')</span><br>' +
              '<span style="font-size: 0.85rem; color: var(--text-muted);">' + r.reply_content + ' ' + (emojis ? '| Reactions: ' + emojis : '') + '</span></div>' +
              '<button class="btn btn-danger" style="padding: 6px 14px; font-size: 0.8rem;" onclick="deleteAR(' + r.responder_id + ')">Delete</button>' +
            '</div>';
          }).join('');
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
            showToast("Trigger Created!");
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
      <div class="module-card">
        <h2>📌 Persistent Sticky Notice</h2>
        <p>Configure a message notice that automatically stays pinned at the bottom of a channel as users chat.</p>

        <form id="stickyForm">
          <div class="form-group">
            <label>Target Channel</label>
            <select id="stickyChannel" class="form-control" onchange="loadSticky()"><option value="">Loading channels...</option></select>
          </div>
          <div class="form-group">
            <label>Sticky Message Content</label>
            <textarea id="stickyContent" class="form-control" rows="4" placeholder="Enter notice text..."></textarea>
          </div>
          <div style="display: flex; gap: 12px;">
            <button type="submit" class="btn btn-primary">Save Sticky Notice</button>
            <button type="button" id="removeStickyBtn" class="btn btn-danger">Remove from Channel</button>
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
          if (res.ok) showToast("Sticky Notice Saved!");
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
