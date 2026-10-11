# Lavalink v4 Audio Infrastructure Deployment Guide

This guide covers deploying the Lavalink v4 audio streaming backend for Digital Vigital (DV-BOT).

---

## 1. Architecture Overview

```text
[ Discord Voice Gateway ]
           ▲
           │ (Opus 48kHz audio streams)
           │
   [ Lavalink v4 ] ◄──── WebSocket (Port 2333) ────► [ DV-BOT (Shoukaku 4.3) ]
           ▲                                                        │
           │                                                        ▼
  Audio Source Nodes                                      [ Hono REST API & Web Dashboard ]
(SoundCloud, YouTube, LavaSrc)                                (Live Controls, Queue, Playlists)
```

- **Runtime:** Java 17 or Java 21 (OpenJDK recommended)
- **Audio pipeline:** Native Opus encoding, 48 kHz stereo, 20ms frame buffer
- **Client library:** Shoukaku 4.3.0 (`Connectors.DiscordJS`)
- **Protocol:** Lavalink v4 REST + WebSocket API

---

## 2. Environment Variables (.env)

Ensure the following variables are configured in your `.env` file for the bot:

```env
# Music Subsystem & Lavalink Configuration
MUSIC_ENABLED=true
LAVALINK_HOST=127.0.0.1
LAVALINK_PORT=2333
LAVALINK_PASSWORD=youshallnotpass
LAVALINK_SECURE=false

# Music Playback Defaults
MUSIC_DEFAULT_VOLUME=80
MUSIC_MAX_VOLUME=150
MUSIC_MAX_QUEUE_SIZE=500
MUSIC_IDLE_TIMEOUT=300
MUSIC_DEFAULT_247=false
```

---

## 3. Deployment Method A: Docker Compose (Recommended)

### Prerequisites
- Docker Engine & Docker Compose

### Steps
1. Navigate to the `lavalink` directory:
   ```bash
   cd lavalink
   ```
2. Start the Lavalink container:
   ```bash
   docker compose up -d
   ```
3. Check logs to confirm startup and plugin downloads:
   ```bash
   docker compose logs -f lavalink
   ```
4. Verify health status:
   ```bash
   curl -f http://localhost:2333/version
   ```

---

## 4. Deployment Method B: Native Linux Systemd (Fedora & Ubuntu)

### Fedora Linux (39 / 40 / 41)

1. **Install Java 21 OpenJDK:**
   ```bash
   sudo dnf update -y
   sudo dnf install -y java-21-openjdk-headless curl
   ```

2. **Create Service User & Directory:**
   ```bash
   sudo useradd -r -s /sbin/nologin -d /opt/lavalink lavalink
   sudo mkdir -p /opt/lavalink/plugins /opt/lavalink/logs
   ```

3. **Download Lavalink v4 Jar:**
   ```bash
   sudo curl -L -o /opt/lavalink/Lavalink.jar https://github.com/lavalink-devs/Lavalink/releases/latest/download/Lavalink.jar
   ```

4. **Copy Configuration:**
   ```bash
   sudo cp application.yml /opt/lavalink/application.yml
   sudo chown -R lavalink:lavalink /opt/lavalink
   ```

5. **Install Systemd Service:**
   ```bash
   sudo cp lavalink.service /etc/systemd/system/lavalink.service
   sudo systemctl daemon-reload
   sudo systemctl enable --now lavalink
   sudo systemctl status lavalink
   ```

---

### Ubuntu Linux (22.04 LTS / 24.04 LTS)

1. **Install Java 21 OpenJDK:**
   ```bash
   sudo apt update
   sudo apt install -y openjdk-21-jre-headless curl
   ```

2. **Create Service User & Directory:**
   ```bash
   sudo useradd -r -s /usr/sbin/nologin -d /opt/lavalink lavalink
   sudo mkdir -p /opt/lavalink/plugins /opt/lavalink/logs
   ```

3. **Download Lavalink v4 Jar:**
   ```bash
   sudo curl -L -o /opt/lavalink/Lavalink.jar https://github.com/lavalink-devs/Lavalink/releases/latest/download/Lavalink.jar
   ```

4. **Copy Configuration:**
   ```bash
   sudo cp application.yml /opt/lavalink/application.yml
   sudo chown -R lavalink:lavalink /opt/lavalink
   ```

5. **Install Systemd Service:**
   ```bash
   sudo cp lavalink.service /etc/systemd/system/lavalink.service
   sudo systemctl daemon-reload
   sudo systemctl enable --now lavalink
   sudo systemctl status lavalink
   ```

---

## 5. Reverse Proxy with Nginx (Optional for Remote Nodes)

If hosting Lavalink on a separate server or domain behind SSL:

```nginx
server {
    listen 443 ssl http2;
    server_name lavalink.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/lavalink.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lavalink.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:2333;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

Then in `.env`:
```env
LAVALINK_HOST=lavalink.yourdomain.com
LAVALINK_PORT=443
LAVALINK_SECURE=true
```

---

## 6. Troubleshooting & Diagnostics

- **401 Unauthorized:** Ensure `LAVALINK_PASSWORD` in `.env` exactly matches `server.password` in `application.yml`.
- **Node disconnected / reconnecting:** Shoukaku automatically reconnects every few seconds. Active guild queues and players are maintained across brief reconnects.
- **Bot leaves immediately:** Verify `MUSIC_IDLE_TIMEOUT` (default: 300 seconds). Enable 24/7 mode (`/247` or dashboard toggle) to stay in voice continuously.
- **View Live Logs:**
  - Systemd: `journalctl -u lavalink -f`
  - Docker: `docker compose logs -f lavalink`
