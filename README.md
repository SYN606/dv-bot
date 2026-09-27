# Y>? Digital Vigital (DV-BOT) v2.0
### Advanced Discord Moderation & Management Framework

A production-ready, high-performance, fully async Discord framework powered by **Bun**, **discord.js v14**, and **Hono/React**. Features a stunning web dashboard, persistent UI components, dynamic command directories, and a robust SQLite/Drizzle database.

---

<p align="center">
  <img src="https://img.shields.io/badge/Bun-1.4+-black?style=for-the-badge&logo=bun&logoColor=white" alt="Bun">
  <img src="https://img.shields.io/badge/discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord.js">
  <img src="https://img.shields.io/badge/React-Web_Dashboard-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React Dashboard">
  <img src="https://img.shields.io/badge/Drizzle-SQLite-C4D600?style=for-the-badge&logo=sqlite&logoColor=white" alt="Database">
</p>

---

## o Core Systems

### Y"- Web Dashboard & API
* **React + TailwindCSS Dashboard:** A beautiful, real-time configuration panel built with Vite and React Router.
* **Hono REST API:** High-speed backend router for modifying configurations instantly without restarting the bot.
* **Modules:** Configure Supporter Rewards, Leaderboard Auto-Roles, Autoresponders, Sticky Messages, and Media Only Channels.

### Y>? Growth & Activity Modules
* **Supporter Rewards (Vanity):** Automatically grant roles to users who put your server's vanity URL or Clan Tag in their Discord Custom Status. Features built-in anti-spam caching and multi-role exclusions.
* **Leaderboard Auto-Roles:** A background worker runs weekly to calculate the top Text and Voice chatters, automatically assigning them exclusive medals and roles.
* **Analytics Batcher:** Real-time metrics engine tracking messages, voice seconds, and hourly peak activity.

### Y' Bot Admin & Permissions
* **Delegated Roles:** Database-backed custom bot-admin roles per guild.
* **Permission Scanners:** Built-in auditing (`/checkperms`, `/permscan`) to find dangerous admin privileges, ensuring roles assigned through automated systems (like Supporter Rewards) never compromise server security.

### Y" Moderation & Logging
* **Role-Based Tempbans:** Automatic temporary bans with a dedicated worker script for expirations.
* **Warnings & Punishments:** Full audit trail for strikes, kicks, mutes, and bans.
* **Command Restriction:** Per-channel command blacklisting (`/command panel`) enforced dynamically.

---

## s Tech Stack & Architecture

* **Runtime:** [Bun](https://bun.sh)
* **Discord Library:** `discord.js` v14
* **Database & ORM:** `drizzle-orm` (SQLite) with a bespoke Sequelize-like adapter.
* **Web Server:** `hono`
* **Frontend:** `React`, `Vite`, `Tailwind CSS`, `lucide-react`

---

## Y>? Command Reference

> Note: All commands support Slash (`/`) invocations. If you prefer standard prefixes, the bot will automatically listen to the prefix defined by `PREFIX` in your `.env` file (e.g. `dv`).

### Moderation
| Command | Description | Slash Usage | Prefix Usage |
|---------|-------------|-------------|--------------|
| `/ban` | Permanently ban a member from the server | `/ban <user> [reason]` | `dvban <user> [reason]` |
| `/fakeban` | Simulate a user ban completely (Sends DM and custom channel warnings) | `/fakeban <user> [reason]` | `dvfakeban <user> [reason]` |
| `/kick` | Kick a member from the server | `/kick <user> [reason]` | `dvkick <user> [reason]` |
| `/permscan` | Run a security audit on a member or the entire server. | `/permscan [member] [server]` | `dvpermscan [member] [server]` |
| `/punishments` | View all punishments and warnings for a user | `/punishments` | `dvpunishments` |
| `/tempban` | Temporarily ban or isolate a member from the server | `/tempban [add] [remove] [role]` | `dvtempban [add] [remove] [role]` |
| `/timeout` | Mute/timeout a member for a specified duration | `/timeout <user> [duration] [reason]` | `dvtimeout <user> [duration] [reason]` |
| `/unban` | Unban a previously banned user from the server | `/unban <userid> [reason]` | `dvunban <userid> [reason]` |
| `/warnings` | Manage and view member warnings | `/warnings [add] [list] [delete] [clear]` | `dvwarnings [add] [list] [delete] [clear]` |

### Administration
| Command | Description | Slash Usage | Prefix Usage |
|---------|-------------|-------------|--------------|
| `/checkperms` | Audit a member's assigned permissions. | `/checkperms <user>` | `dvcheckperms <user>` |
| `/command` | Manage channel command restrictions (disable / enable / list / panel) | `/command [panel] [disable] [enable] [list]` | `dvcommand [panel] [disable] [enable] [list]` |
| `/purge` | Bulk message deletion in guild channels. | `/purge <amount> [user]` | `dvpurge <amount> [user]` |
| `/rename` | Change or reset a member's server nickname | `/rename <user> <nickname>` | `dvrename <user> <nickname>` |
| `/role` | Assign or remove a role from a member | `/role [add] [remove]` | `dvrole [add] [remove]` |
| `/whois` | Comprehensive user and member lookup information. | `/whois [user]` | `dvwhois [user]` |

### Utility
| Command | Description | Slash Usage | Prefix Usage |
|---------|-------------|-------------|--------------|
| `/afk` | Set your Away-From-Keyboard status for this server | `/afk [reason]` | `dvafk [reason]` |
| `/avatar` | View user avatar in high resolution | `/avatar [user]` | `dvavatar [user]` |
| `/banner` | View user banner in high resolution | `/banner [user]` | `dvbanner [user]` |
| `/fuck` | Generate a witty, non-repetitive roast for a user | `/fuck [user]` | `dvfuck [user]` |
| `/help` | View bot commands and usage instructions | `/help [command]` | `dvhelp [command]` |
| `/ping` | Measure WebSocket gateway heartbeat and HTTP API round-trip latency. | `/ping` | `dvping` |
| `/serverinfo` | Display comprehensive, beautifully formatted information about the server. | `/serverinfo` | `dvserverinfo` |
| `/steal` | Steal custom emojis and stickers from messages or URLs | `/steal <source> [name]` | `dvsteal <source> [name]` |

### Analytics
| Command | Description | Slash Usage | Prefix Usage |
|---------|-------------|-------------|--------------|
| `/leaderboard` | View server chat and voice leaderboards | `/leaderboard [type] [timeframe]` | `dvleaderboard [type] [timeframe]` |
| `/userstats` | View member chat and voice activity statistics | `/userstats [user]` | `dvuserstats [user]` |

### Channels & Voice
| Command | Description | Slash Usage | Prefix Usage |
|---------|-------------|-------------|--------------|
| `/hide` | Hide or unhide a channel | `/hide <action> [channel]` | `dvhide <action> [channel]` |
| `/lock` | Lock or unlock a channel | `/lock <action> [duration] [channel]` | `dvlock <action> [duration] [channel]` |
| `/slowmode` | Set the slowmode rate limit for the current channel | `/slowmode <seconds>` | `dvslowmode <seconds>` |
| `/drag` | Move a member to a specified voice channel or your current channel | `/drag <user> [channel]` | `dvdrag <user> [channel]` |
| `/moveall` | Move all members from one voice channel to another | `/moveall <source> [target]` | `dvmoveall <source> [target]` |

---

## Y" Installation & Deployment

1. **Install Bun:**
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **Clone & Install:**
   ```bash
   git clone https://github.com/SYN606/dv-bot.git
   cd dv-bot
   bun run install:all
   ```

3. **Configure Environment:**
   Create a `.env` file based on `example.env` and add your bot token.

4. **Build Dashboard & Start:**
   ```bash
   bun run build:web
   bun start
   ```

*During development, use `bun run dev` to boot the backend and Vite HMR simultaneously.*