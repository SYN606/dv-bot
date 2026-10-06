# 🌐 DV-BOT Nginx Optimal Configuration & Service Commands

This guide provides the production Nginx reverse proxy configuration for **DV-BOT**, designed for maximum security, performance, and stability, along with essential systemd service commands for both **Nginx** and **`dv-bot.service`**.

---

## ⚡ Key Optimizations Included:
1. **HTTP/2 Support:** Enabled on port 443 for faster multiplexed connections, reducing latency.
2. **Strict Domain Locking:** Silently drops requests with spoofed or incorrect `Host` headers.
3. **Gzip Compression:** Compresses HTML, CSS, JS, and JSON payloads (like API responses) before sending them to the browser, significantly reducing bandwidth and speeding up dashboard load times.
4. **Enhanced Proxy Buffers:** Prevents `502 Bad Gateway` errors caused by large OAuth session cookies or large Discord metadata headers (`proxy_buffer_size 16k;`).
5. **WebSocket Upgrades:** Explicitly proxies `Connection: upgrade` headers for real-time WebSocket communication if added in the future.
6. **Hardened Security Headers:** Applies HSTS (Strict-Transport-Security) forcing browsers to only use HTTPS, along with robust XSS and framing protections.

---

## 📋 Service Management Commands

### Nginx Service Commands
```bash
# 1. Test configuration syntax before reloading (CRITICAL)
nginx -t

# 2. Reload Nginx configuration gracefully without dropping traffic
systemctl reload nginx

# 3. Restart Nginx service completely
systemctl restart nginx

# 4. Check Nginx operational status
systemctl status nginx

# 5. Enable Nginx on system boot
systemctl enable nginx

# 6. Stream Nginx error logs
tail -f /var/log/nginx/error.log
```

### DV-BOT Systemd Service Commands (`dv-bot.service`)
```bash
# 1. Check dv-bot service status
systemctl status dv-bot

# 2. Restart dv-bot service (initiates graceful database flush & reconnect)
systemctl restart dv-bot

# 3. Stop dv-bot service
systemctl stop dv-bot

# 4. Start dv-bot service
systemctl start dv-bot

# 5. Enable dv-bot to start automatically on system boot
systemctl enable dv-bot

# 6. Stream live application logs in realtime
journalctl -u dv-bot -f -o cat

# 7. View last 100 log lines without pager
journalctl -u dv-bot -n 100 --no-pager
```

---

## 🛠️ Step-by-Step Nginx Setup

### 1. Default Server Block (Drop Unauthorized IP Scanners)
Add to `/etc/nginx/sites-available/default` (or `/etc/nginx/conf.d/default.conf`):
```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    return 444; # Connection closed immediately with no response
}
```

### 2. Create the Site Configuration
File: `/etc/nginx/sites-available/bot.digitalvigital.fun`

```bash
nano /etc/nginx/sites-available/bot.digitalvigital.fun
```

Paste the following configuration:

```nginx
# =========================================================
# HTTP -> HTTPS Redirect
# =========================================================
server {
    listen 80;
    listen [::]:80;
    server_name bot.digitalvigital.fun;

    # Redirect all HTTP traffic to HTTPS securely
    return 301 https://$host$request_uri;
}

# =========================================================
# HTTPS Application Server (Reverse Proxy to Hono Dashboard)
# =========================================================
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name bot.digitalvigital.fun;

    # Strictly reject requests whose Host header does not match
    if ($host != "bot.digitalvigital.fun") {
        return 403;
    }

    # =========================================================
    # SSL Configuration (Managed by Certbot)
    # =========================================================
    ssl_certificate /etc/letsencrypt/live/bot.digitalvigital.fun/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bot.digitalvigital.fun/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # =========================================================
    # Performance: Gzip Compression
    # =========================================================
    gzip on;
    gzip_comp_level 5;
    gzip_min_length 256;
    gzip_proxied any;
    gzip_vary on;
    gzip_types
        application/javascript
        application/json
        application/xml
        text/css
        text/javascript
        text/plain
        text/xml
        image/svg+xml;

    # =========================================================
    # Security Headers
    # =========================================================
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Upload size limit
    client_max_body_size 15M;

    # =========================================================
    # Main Bun Web Server Reverse Proxy (Internal Port 3000)
    # =========================================================
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        # WebSocket Support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Forwarded Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Proxy Buffers (Handles large OAuth / Session headers safely)
        proxy_buffer_size 16k;
        proxy_buffers 8 16k;
        proxy_busy_buffers_size 32k;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### 3. Enable Site & Obtain SSL Certificate
```bash
# Symlink to sites-enabled
ln -s /etc/nginx/sites-available/bot.digitalvigital.fun /etc/nginx/sites-enabled/

# Test Nginx syntax
nginx -t

# Reload Nginx
systemctl reload nginx

# Install Certbot (if not already installed)
apt update && apt install -y certbot python3-certbot-nginx

# Obtain SSL Certificate (automatically configures SSL and renewal)
certbot --nginx -d bot.digitalvigital.fun
```

---

## 🔍 Diagnostics & Health Checks

- **Check if port 3000 is listening internally:**
  ```bash
  curl -I http://127.0.0.1:3000
  ```
- **Check public HTTPS response:**
  ```bash
  curl -I https://bot.digitalvigital.fun
  ```
- **Troubleshoot 502 Bad Gateway:**
  1. Verify the bot service is running: `systemctl status dv-bot`
  2. If inactive/failed, inspect logs: `journalctl -u dv-bot -n 50 --no-pager`
  3. Ensure port 3000 is bound: `ss -tulpn | grep 3000`
