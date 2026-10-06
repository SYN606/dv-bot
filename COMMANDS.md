# 📜 DV-BOT Command Reference

> Complete reference of all commands, categories, permissions, and invocation syntax.
> 
> ℹ️ **Notice:** Sensitive moderation and security actions (`/role`, `/lock`, `/unlock`, `/hide`, `/unhide`, `/slowmode`, `/purge`, `/fakeban`, `/checkperms`) are configured as **Slash Only** (`slashOnly: true`) to guarantee Discord permission enforcement, avoid prefix spoofing, and ensure full audit trail consistency. All other general utility commands support both Slash (`/`) and configurable prefix syntax (`PREFIX` in `.env`, e.g. `dv` or `ts`).

---

## 🛡️ Admin & Permissions

| Command | Description | Slash Usage | Prefix Usage |
|:---|:---|:---|:---|
| `/checkperms` | Audit a member's assigned permissions and danger flags | `/checkperms <user>` | *Slash Only (No Prefix)* |
| `/command` | Manage channel command restrictions (disable / enable / list / panel) | `/command [panel] [disable] [enable] [list]` | `dvcommand [panel] [disable] [enable] [list]` |
| `/permscan` | Scan permissions of the server or a specific member | `/permscan [server] [member]` | `dvpermscan [server] [member]` |
| `/purge` | Bulk message deletion in guild channels | `/purge <amount> [user]` | *Slash Only (No Prefix)* |
| `/rename` | Change or reset a member's server nickname | `/rename <user> <nickname>` | `dvrename <user> <nickname>` |
| `/role` | Assign (`add`) or remove (`remove`) a role from a member | `/role <add\|remove> <user> <role>` | *Slash Only (No Prefix)* |
| `/whois` | Comprehensive user and member lookup information | `/whois [user]` | `dvwhois [user]` |

---

## 🔒 Channels

| Command | Description | Slash Usage | Prefix Usage |
|:---|:---|:---|:---|
| `/hide` | Hide a channel from regular members (verification-aware) | `/hide [channel]` | *Slash Only (No Prefix)* |
| `/unhide` | Restore visibility of a hidden channel (verification-aware) | `/unhide [channel]` | *Slash Only (No Prefix)* |
| `/lock` | Lock a channel to prevent messaging, with optional timer | `/lock [duration] [channel]` | *Slash Only (No Prefix)* |
| `/unlock` | Unlock a locked channel and restore member messaging | `/unlock [channel]` | *Slash Only (No Prefix)* |
| `/slowmode` | Set or remove the slowmode rate limit for the channel | `/slowmode <seconds>` | *Slash Only (No Prefix)* |

---

## 🔨 Moderation

| Command | Description | Slash Usage | Prefix Usage |
|:---|:---|:---|:---|
| `/ban` | Permanently ban a member from the server | `/ban <user> [reason]` | `dvban <user> [reason]` |
| `/fakeban` | Simulate a user ban completely (Sends DM and custom channel warnings) | `/fakeban <user> [reason]` | *Slash Only (No Prefix)* |
| `/kick` | Kick a member from the server | `/kick <user> [reason]` | `dvkick <user> [reason]` |
| `/punishments` | View all punishments and warnings for a user | `/punishments [user]` | `dvpunishments [user]` |
| `/tempban` | Temporarily ban or isolate a member from the server | `/tempban <user> <duration> [reason]` | `dvtempban <user> <duration> [reason]` |
| `/untempban` | Remove temporary ban status manually | `/untempban <user>` | `dvuntempban <user>` |
| `/timeout` | Mute/timeout a member for a specified duration | `/timeout <user> <duration> [reason]` | `dvtimeout <user> <duration> [reason]` |
| `/unban` | Unban a previously banned user from the server | `/unban <userid> [reason]` | `dvunban <userid> [reason]` |
| `/warn` | Issue a formal warning to a server member | `/warn <user> <reason>` | `dvwarn <user> <reason>` |
| `/warnings` | Manage and inspect member warnings | `/warnings [add] [list] [delete] [clear]` | `dvwarnings [add] [list] [delete] [clear]` |

---

## 📈 Analytics

| Command | Description | Slash Usage | Prefix Usage |
|:---|:---|:---|:---|
| `/leaderboard` | View server chat and voice leaderboards | `/leaderboard [type] [timeframe]` | `dvleaderboard [type] [timeframe]` |
| `/userstats` | View member chat and voice activity statistics | `/userstats [user]` | `dvuserstats [user]` |

---

## 🛠️ Utility

| Command | Description | Slash Usage | Prefix Usage |
|:---|:---|:---|:---|
| `/afk` | Set your Away-From-Keyboard status for this server | `/afk [reason]` | `dvafk [reason]` |
| `/avatar` | View user avatar in high resolution | `/avatar [user]` | `dvavatar [user]` |
| `/banner` | View user banner in high resolution | `/banner [user]` | `dvbanner [user]` |
| `/fuck` | Generate a witty, non-repetitive roast for a user | `/fuck [user]` | `dvfuck [user]` |
| `/help` | View bot commands, syntax, and categories | `/help [command]` | `dvhelp [command]` |
| `/ping` | Measure WebSocket gateway heartbeat and HTTP API latency | `/ping` | `dvping` |
| `/roleinfo` | Display detailed permissions, color, and stats for a role | `/roleinfo <role>` | `dvroleinfo <role>` |
| `/serverinfo` | Display comprehensive information about the server | `/serverinfo` | `dvserverinfo` |
| `/steal` | Steal custom emojis and stickers from messages or URLs | `/steal <source> [name]` | `dvsteal <source> [name]` |

---

## 🔊 Voice

| Command | Description | Slash Usage | Prefix Usage |
|:---|:---|:---|:---|
| `/drag` | Move a member to a specified voice channel or your current channel | `/drag <user> [channel]` | `dvdrag <user> [channel]` |
| `/moveall` | Move all members from one voice channel to another | `/moveall <source> [target]` | `dvmoveall <source> [target]` |
