# 🤖 Digital Vigital (DV-BOT) v2.0
### Advanced Discord Moderation & Management Framework

A production-ready, high-performance, fully async Discord framework powered by **Bun**, **discord.js v14**, and **Hono/React**. Features a stunning web dashboard, persistent UI components, dynamic command directories, and an ultra-fast SQLite/Drizzle database.

---

<p align="center">
  <img src="https://img.shields.io/badge/Bun-1.4+-black?style=for-the-badge&logo=bun&logoColor=white" alt="Bun">
  <img src="https://img.shields.io/badge/discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord.js">
  <img src="https://img.shields.io/badge/React-Web_Dashboard-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React Dashboard">
  <img src="https://img.shields.io/badge/Drizzle-SQLite-C4D600?style=for-the-badge&logo=sqlite&logoColor=white" alt="Database">
</p>

---

## ⚙️ Core Systems

### 🌐 Web Dashboard & API
* **React + TailwindCSS Dashboard:** A sleek, real-time configuration panel built with Vite and React Router.
* **Hono REST API:** High-speed backend router for modifying configurations instantly without restarting the bot.
* **Modules:** Configure Supporter Rewards, Leaderboard Auto-Roles, Autoresponders, Sticky Messages, and Media Only Channels.

### 📈 Growth & Activity Modules
* **Supporter Rewards (Vanity):** Automatically grant roles to users who put your server's vanity URL or Clan Tag in their Discord Custom Status. Features built-in anti-spam caching and multi-role exclusions.
* **Leaderboard Auto-Roles:** A background worker runs weekly to calculate top Text and Voice chatters, automatically assigning exclusive medals and roles.
* **Analytics Batcher:** Real-time metrics engine tracking messages, voice seconds, and hourly peak activity.

### 🛡️ Bot Admin & Permissions
* **Delegated Roles:** Database-backed custom bot-admin roles per guild.
* **Permission Scanners:** Built-in auditing (`/checkperms`, `/permscan`) to detect dangerous admin privileges, ensuring roles assigned through automated systems never compromise server security.

### 🔨 Moderation & Logging
* **Role-Based Tempbans:** Automatic temporary bans with a dedicated worker script for expirations.
* **Warnings & Punishments:** Full audit trail for strikes, kicks, mutes, and bans.
* **Verification-Aware Channel Controls:** Dedicated `/lock`, `/unlock`, `/hide`, and `/unhide` commands respecting server verification roles.

---

## ⚡ Tech Stack & Architecture

* **Runtime:** [Bun](https://bun.sh)
* **Discord Library:** `discord.js` v14
* **Database & ORM:** `drizzle-orm` (SQLite with WAL mode and multi-threading)
* **Web Server:** `hono`
* **Frontend:** `React`, `Vite`, `Tailwind CSS`, `lucide-react`
* **Service Manager:** `systemd` (`dv-bot.service`)
* **Reverse Proxy:** `Nginx` (HTTP/2, SSL, buffer-tuned)

---

## 📜 Command Reference

> **Note:** Sensitive moderation and channel protection commands are **Slash Only** (`slashOnly: true`) for strict permission safety. Utility, analytics, and fun commands also support the configurable prefix (`PREFIX` in `.env`, e.g. `dv`).
> 
> 📖 **Full Command Guide:** For detailed parameter breakdowns, subcommands, and copy-pasteable examples for all **48 commands**, see [**`COMMANDS.md`**](COMMANDS.md).

### 🔨 Moderation
| Command | Description | Slash Usage | Prefix Usage |
|:---|:---|:---|:---|
| `/ban` | Permanently ban a member from the server | `/ban <user> [reason]` | `dvban <user> [reason]` |
| `/fakeban` | Simulate a user ban completely (Sends DM and custom channel warnings) | `/fakeban <user> [reason]` | *Slash Only (No Prefix)* |
| `/kick` | Kick a member from the server | `/kick <user> [reason]` | `dvkick <user> [reason]` |
| `/permscan` | Run a security audit on a member or the entire server | `/permscan <server\|member> [user]` | `dvpermscan [server\|@user]` |
| `/punishments` | View all punishments and warnings for a user | `/punishments <user>` | `dvpunishments <user>` |
| `/tempban` | Temporarily ban or isolate a member from the server | `/tempban <user> <duration> [reason]` | `dvtempban <user> <duration> [reason]` |
| `/untempban` | Remove temporary ban status manually | `/untempban <user>` | `dvuntempban <user>` |
| `/timeout` | Mute/timeout a member for a specified duration | `/timeout <user> [duration] [reason]` | `dvtimeout <user> [duration] [reason]` |
| `/unban` | Unban a previously banned user from the server | `/unban <userid> [reason]` | `dvunban <userid> [reason]` |
| `/warn` | Issue a formal warning to a server member | `/warn <user> [reason]` | `dvwarn <user> [reason]` |
| `/warnings` | Manage and view member warnings | `/warnings <add\|list\|delete\|clear> [user] [reason] [id]` | `dvwarnings <subcommand> ...` |

### 🛡️ Administration
| Command | Description | Slash Usage | Prefix Usage |
|:---|:---|:---|:---|
| `/checkperms` | Audit a member's assigned permissions | `/checkperms <user>` | *Slash Only (No Prefix)* |
| `/purge` | Bulk message deletion in guild channels | `/purge <amount> [user]` | *Slash Only (No Prefix)* |
| `/role` | Assign or remove a role from a member | `/role <add\|remove> <user> <role> [silent]` | *Slash Only (No Prefix)* |
| `/whois` | Comprehensive user and member lookup information | `/whois [user]` | `dvwhois [user]` |

### 📁 Channels & Voice
| Command | Description | Slash Usage | Prefix Usage |
|:---|:---|:---|:---|
| `/hide` | Hide a channel from members | `/hide [channel] [reason]` | *Slash Only (No Prefix)* |
| `/unhide` | Unhide a channel for members | `/unhide [channel] [reason]` | *Slash Only (No Prefix)* |
| `/lock` | Lock a channel to prevent messaging | `/lock [duration] [channel] [reason]` | *Slash Only (No Prefix)* |
| `/unlock` | Unlock a channel to restore messaging | `/unlock [channel] [reason]` | *Slash Only (No Prefix)* |
| `/slowmode` | Set the slowmode rate limit for the channel | `/slowmode <seconds> [channel] [reason]` | *Slash Only (No Prefix)* |
| `/drag` | Move a member to a voice channel | `/drag <user> [channel]` | `dvdrag <user> [channel]` |
| `/moveall` | Move all members between voice channels | `/moveall [source] [target]` | `dvmoveall [source] [target]` |

### 📊 Analytics & Metrics
| Command | Description | Slash Usage | Prefix Usage |
|:---|:---|:---|:---|
| `/leaderboard` | View server chat and voice leaderboards | `/leaderboard [type] [timeframe]` | `dvleaderboard [type] [timeframe]` |
| `/serverstats` | Comprehensive server activity, growth trends, retention, and peak hours | `/serverstats [days]` | `dvserverstats [7\|14\|30]` |
| `/userstats` | View member chat and voice activity statistics | `/userstats [user]` | `dvuserstats [user]` |

### 🛠️ Utility & Info
| Command | Description | Slash Usage | Prefix Usage |
|:---|:---|:---|:---|
| `/afk` | Set your Away-From-Keyboard status for this server | `/afk [reason]` | `dvafk [reason]` |
| `/avatar` | View user avatar in high resolution | `/avatar [user]` | `dvavatar [user]` |
| `/banner` | View user banner in high resolution | `/banner [user]` | `dvbanner [user]` |
| `/help` | View bot commands and usage instructions | `/help [command]` | `dvhelp [command]` |
| `/nick` | Change or reset a member's server nickname (alias: `/rename`) | `/nick <nickname> [user]` | `dvnick [user] <nickname>` |
| `/ping` | Measure WebSocket gateway heartbeat and HTTP API round-trip latency | `/ping` | `dvping` |
| `/roast` | Generate a witty, non-repetitive roast for a user (aliases: `/fuck`, `/burn`) | `/roast [user]` | `dvroast [user]` |
| `/roleinfo` | Display detailed information for a role | `/roleinfo <role>` | `dvroleinfo <role>` |
| `/serverinfo` | Display comprehensive server information | `/serverinfo` | `dvserverinfo` |
| `/snipe` | Show the most recently deleted message in this channel or from a user | `/snipe [user]` | `dvsnipe [@user]` |
| `/steal` | Steal custom emojis and stickers from messages or URLs | `/steal <source> [name]` | `dvsteal <source> [name]` |

### 🎉 Fun & Roleplay
| Command | Description | Slash Usage | Prefix Usage |
|:---|:---|:---|:---|
| `/fun` | View directory or toggle Fun suite on/off for server | `/fun [action]` | `dvfun [list\|enable\|disable]` |
| `/ship` | Calculate relationship affinity, custom ship name & meter | `/ship <user1> [user2]` | `dvship <user1> [user2]` |
| `/bite` | Playfully nibble or bite someone (anime tease) | `/bite <user>` | `dvbite <user>` |
| `/bonk` | Bonk someone and send them to horny jail | `/bonk <user>` | `dvbonk <user>` |
| `/cuddle` | Warm, snuggly cuddle with someone | `/cuddle <user>` | `dvcuddle <user>` |
| `/hug` | Send a warm, comforting hug with anime GIF | `/hug <user>` | `dvhug <user>` |
| `/kiss` | Sweet anime kiss on the cheek or lips | `/kiss <user>` | `dvkiss <user>` |
| `/lewd` | Call out someone for being excessively lewd | `/lewd [user]` | `dvlewd [user]` |
| `/lick` | Playfully lick someone with anime GIF | `/lick <user>` | `dvlick <user>` |
| `/pat` | Gentle headpat and wholesome encouragement | `/pat <user>` | `dvpat <user>` |
| `/poke` | Poke someone to get their attention | `/poke <user>` | `dvpoke <user>` |
| `/slap` | Slap someone anime-style | `/slap <user>` | `dvslap <user>` |

---

## 🚀 Installation & Deployment

### Quickstart (Development)

1. **Install Bun:**
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **Clone & Install Dependencies:**
   ```bash
   git clone https://github.com/SYN606/dv-bot.git
   cd dv-bot
   bun install
   ```

3. **Configure Environment:**
   Create `.env` based on `example.env` and populate your `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, and `DISCORD_CLIENT_SECRET`.

4. **Build Dashboard & Start:**
   ```bash
   bun run build:web
   bun start
   ```

*During local development, run `bun run dev` to start both the bot and Vite frontend HMR concurrently.*

---

### Production Deployment (Linux VPS)

For a complete guide with isolated database directories, systemd auto-healing, and SSL, refer to:
- 📖 [Production Deployment Guide (`DEPLOYMENT.md`)](DEPLOYMENT.md)
- 🌐 [Nginx Configuration & Systemd Commands (`nginx.md`)](nginx.md)

#### Quick Production Commands (`dv-bot.service`):
```bash
# 1. Install service unit
sudo cp dv-bot.service /etc/systemd/system/dv-bot.service
sudo systemctl daemon-reload
sudo systemctl enable --now dv-bot

# 2. Manage service
sudo systemctl status dv-bot
sudo systemctl restart dv-bot
sudo journalctl -u dv-bot -f -o cat
```
