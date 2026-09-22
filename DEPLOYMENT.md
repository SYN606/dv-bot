# 🚀 DV-BOT Production Deployment Guide

Complete, step-by-step production deployment guide for hosting **DV-BOT** on a Linux VPS (Ubuntu/Debian) with **isolated persistent database storage**, **systemd auto-healing**, and **Nginx reverse proxy** locked strictly to `bot.digitalvigital.fun`.

---

## 📑 Table of Contents
1. [Architecture & Isolation Model](#1-architecture--isolation-model)
2. [Discord Developer Portal Configuration](#2-discord-developer-portal-configuration)
3. [Environment Configuration & Auto-Switching](#3-environment-configuration--auto-switching)
4. [Server Setup & User Permissions](#4-server-setup--user-permissions)
5. [Code Deployment & Build](#5-code-deployment--build)
6. [Systemd Service Management](#6-systemd-service-management)
7. [Nginx Reverse Proxy & SSL (Strict Domain Lock)](#7-nginx-reverse-proxy--ssl-strict-domain-lock)
8. [Safe Code-Only Updates](#8-safe-code-only-updates)
9. [Troubleshooting & Maintenance](#9-troubleshooting--maintenance)

---

## 1. Architecture & Isolation Model

To ensure zero risk of data loss during updates or git pulls, the codebase and databases are decoupled into separate directories:

```
Linux VPS
├── /var/webhost/dv-bot/          # [CODEBASE] Owned by syn:webhost (Git repo, frontend build, scripts)
│   ├── .env                      # Production secrets & configuration
│   ├── entrypoint.sh             # Production lifecycle manager
│   ├── dvbot.service             # Systemd service unit
│   └── src/
│
├── /var/db/                      # [PERSISTENT DATA] Owned by syn:webhost (chmod 700)
│   ├── bot.db                    # Active production SQLite database
│   ├── bot.db-wal                # SQLite Write-Ahead Log
│   └── bot.db-shm                # SQLite Shared Memory
│
└── /etc/nginx/sites-available/   # [GATEWAY] Nginx proxy locked to bot.digitalvigital.fun
```

- **User**: `syn`
- **Group**: `webhost`
- **Internal Web Port**: `3000` (Bound to `127.0.0.1:3000`, not exposed publicly)
- **Public Domain**: `https://bot.digitalvigital.fun`

---

## 2. Discord Developer Portal Configuration

Before deploying, configure your application in the [Discord Developer Portal](https://discord.com/developers/applications):

### A. OAuth2 Redirect URIs
Navigate to **Applications** ➔ Select your Bot ➔ **OAuth2** ➔ **General**:
Under **Redirects**, click **Add Redirect** and add **BOTH** URLs:

1. **Production:**
   ```
   https://bot.digitalvigital.fun/auth/callback
   ```
2. **Local Development (Fallback):**
   ```
   http://localhost:3000/auth/callback
   ```

> [!NOTE]
> Discord allows multiple registered redirect URLs. Having both listed allows seamless switching between local testing and production hosting without touching your Discord Developer settings.

### B. Privileged Gateway Intents
Navigate to **Bot** ➔ **Privileged Gateway Intents**:
- ✅ **Server Members Intent** (Required for verification, role hierarchy, member tracking)
- ✅ **Message Content Intent** (Required for prefix commands, autoresponder, media-only enforcement)

---

## 3. Environment Configuration & Auto-Switching

DV-BOT automatically adapts the OAuth redirect URI based on the `ENV` mode:
- When `ENV=prod` or `ENV=production` ➔ Uses `DASHBOARD_URL_PROD` (`https://bot.digitalvigital.fun`)
- When `ENV=dev` or `ENV=development` ➔ Uses `DASHBOARD_URL_DEV` (`http://localhost:3000`)

### Production `.env` (`/var/webhost/dv-bot/.env`):
```env
# ==========================================
# ───── BOT ENVIRONMENT CONFIGURATION ─────
# ==========================================
ENV=prod
PREFIX=ts
DEV_GUILD_ID=1033451129364811929

# ==========================================
# ───── DISCORD APPLICATION SECRETS ────────
# ==========================================
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=1468995670797975614
DISCORD_CLIENT_SECRET=your_client_secret_here

SYNC_COMMANDS=true
DEBUG_HTTP=false

# ==========================================
# ───── WEB DASHBOARD CONFIGURATION ────────
# ==========================================
DASHBOARD_PORT=3000
DASHBOARD_URL_PROD=https://bot.digitalvigital.fun
DASHBOARD_URL_DEV=http://localhost:3000
SESSION_SECRET=your_super_secure_random_32_char_secret_key

# ==========================================
# ───── DATABASE CONFIGURATION ─────────────
# ==========================================
DB_TYPE=sqlite
SQLITE_NAME=bot.db

# Isolated production database directory outside of codebase
DB_DIR=/var/db

ALLOW_TABLE_DROP=false

# ==========================================
# ───── MEDIA & CDN ASSET URLS ─────────────
# ==========================================
AFK_IMAGE_URL=https://cdn.discordapp.com/attachments/1476443404207652916/1512558268197765221/afk.gif
MENTION_GIF_URL=https://cdn.discordapp.com/attachments/1476443404207652916/1512558249474527344/mention.gif
HELP_BANNER_GIF=https://cdn.discordapp.com/attachments/1476443404207652916/1512558276418736178/help.gif
```

---

## 4. Server Setup & User Permissions

Run the following commands as `root` (or with `sudo`):

```bash
# 1. Create webhost group and syn user
groupadd -r webhost 2>/dev/null || true
useradd -r -g webhost -m -d /home/syn -s /bin/bash syn 2>/dev/null || true

# 2. Create codebase and database directories
mkdir -p /var/webhost/dv-bot
mkdir -p /var/db

# 3. Assign ownership to syn:webhost
chown -R syn:webhost /var/webhost
chown -R syn:webhost /var/db

# 4. Set directory permissions
chmod 750 /var/webhost
chmod 750 /var/webhost/dv-bot
chmod 700 /var/db
```

### Install Bun Runtime for `syn`:
```bash
# Switch to syn user
su - syn

# Install Bun
curl -fsSL https://bun.sh/install | bash

# Ensure Bun is in PATH for user syn
echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc
echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Exit back to root
exit

# Link Bun globally so systemd and all tools locate it immediately:
ln -sf /home/syn/.bun/bin/bun /usr/local/bin/bun
bun --version
```

---

## 5. Code Deployment & Build

Switch to user `syn` to clone the repository and build:

```bash
su - syn
cd /var/webhost/dv-bot

# Clone the repository
git clone -b bun-migration https://github.com/SYN606/dv-bot.git .

# Create production .env
nano .env
# (Paste the production .env configuration from Step 3, including DISCORD_TOKEN)

# Install production dependencies
bun install --frozen-lockfile || bun install

# Build the React web dashboard frontend assets
bun run build:web

# If you have an existing database to migrate, place it in /var/db/bot.db
exit
```

---

## 6. Systemd Service Management

The unit file [`dvbot.service`](file:///d:/projects/DV-BOT/dvbot.service) handles auto-restarts, environment injection, and graceful SIGTERM shutdown.

As `root`:
```bash
# 1. Copy the unit file into systemd
cp /var/webhost/dv-bot/dvbot.service /etc/systemd/system/dvbot.service

# 2. Reload systemd
systemctl daemon-reload

# 3. Enable auto-start on boot & start the bot
systemctl enable --now dvbot

# 4. Verify status
systemctl status dvbot
```

### Viewing Live Logs:
```bash
# Stream live logs in realtime
journalctl -u dvbot -f -o cat
```

---

## 7. Nginx Reverse Proxy & SSL (Strict Domain Lock)

To ensure that **only** `bot.digitalvigital.fun` can access the web dashboard and direct IP visits/scanners are instantly dropped:

### A. Default Server Block (Drop all unauthorized IP traffic)
Edit `/etc/nginx/sites-available/default` or add to `/etc/nginx/conf.d/default.conf`:
```nginx
# Drop all direct IP hits and unrecognized domain requests
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    return 444; # Connection closed without response
}
```

### B. Dedicated Virtual Host for `bot.digitalvigital.fun`
Create `/etc/nginx/sites-available/bot.digitalvigital.fun`:
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name bot.digitalvigital.fun;

    # Strictly reject any request whose Host header does not match the domain
    if ($host != "bot.digitalvigital.fun") {
        return 403;
    }

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Upload size limit
    client_max_body_size 15M;

    # Forward to Bun Web Server
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Forwarded Identity Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### C. Enable Site & Obtain Free SSL with Certbot:
```bash
# Enable the site
ln -s /etc/nginx/sites-available/bot.digitalvigital.fun /etc/nginx/sites-enabled/

# Test Nginx syntax
nginx -t

# Reload Nginx
systemctl reload nginx

# Install Certbot (if not already installed)
apt update && apt install -y certbot python3-certbot-nginx

# Obtain SSL Certificate and automatically configure HTTPS redirection
certbot --nginx -d bot.digitalvigital.fun
```

Certbot will automatically install the SSL certificates and set up HTTP ➔ HTTPS 301 redirection.

---

## 8. Safe Code-Only Updates

Because your SQLite database lives in `/var/db/bot.db`, you can update your code at any time without worrying about git conflicts or overwriting data:

```bash
# Switch to syn user
su - syn
cd /var/webhost/dv-bot

# Pull latest code
git pull origin bun-migration

# Install dependencies if package.json was updated
bun install

# Rebuild frontend if web assets were updated
bun run build:web

# Restart the service (as root or via sudo)
sudo systemctl restart dvbot
```

Your server database, analytics history, role configurations, and sticky messages in `/var/db/` remain completely untouched.

---

## 9. Troubleshooting & Maintenance

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| `Failed to open database` | Permission issue on `/var/db` | Run `chown -R syn:webhost /var/db` and `chmod 700 /var/db` |
| `OAuth2 Invalid redirect_uri` | Mismatch in Discord Portal | Verify `https://bot.digitalvigital.fun/auth/callback` is listed in Discord App redirects |
| `502 Bad Gateway in Nginx` | Bot service is offline or crashed | Check `systemctl status dvbot` and inspect `journalctl -u dvbot -n 50` |
| `Port 3000 already in use` | Zombie node/bun process | Run `lsof -i :3000` or `fuser -k 3000/tcp` then restart `dvbot` |

### Database Backup Script
You can schedule automated SQLite database backups via cron without stopping the bot:
```bash
# Add to crontab -e for user syn (runs daily at 3:00 AM):
0 3 * * * sqlite3 /var/db/bot.db ".backup '/var/db/bot_backup_$(date +\%F).db'"
```
