# DV-BOT Nginx Optimal Configuration

This file contains the highly-optimized production Nginx configuration for **DV-BOT**, designed for maximum security, performance, and stability.

## Key Optimizations Included:
1. **HTTP/2 Support:** Enabled on port 443 for faster multiplexed connections, reducing latency.
2. **Strict Domain Locking:** Silently drops requests with spoofed or incorrect `Host` headers.
3. **Gzip Compression:** Compresses HTML, CSS, JS, and JSON payloads (like API responses) before sending them to the browser, significantly reducing bandwidth and speeding up dashboard load times.
4. **Enhanced Proxy Buffers:** Prevents `502 Bad Gateway` errors caused by large OAuth session cookies or large Discord metadata headers (`proxy_buffer_size 16k;`).
5. **WebSocket Upgrades:** Explicitly proxies `Connection: upgrade` headers for real-time WebSocket communication if added in the future.
6. **Hardened Security Headers:** Applies HSTS (Strict-Transport-Security) forcing browsers to only use HTTPS, along with robust XSS and framing protections.

---

## Configuration File
**Path:** `/etc/nginx/sites-available/bot.digitalvigital.fun`

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
# HTTPS Application Server
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
    # Main Bun Web Server Reverse Proxy
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

        # Proxy Buffers (Handles large OAuth/Session Headers safely)
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
