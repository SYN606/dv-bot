# 📜 DV-BOT Command Reference & Documentation

> Complete, authoritative reference for all **35 commands** in DV-BOT, including exact slash syntax, prefix alternatives, required permissions, subcommands, and copy-pasteable examples.
>
> 🔒 **Security Model:** Sensitive moderation, channel security, and role management actions are configured as **Slash Only** (`slashOnly: true`) to ensure Discord API permission checks, audit logging, and guard against prefix spoofing. All standard utility commands support both Slash (`/`) and configurable prefix syntax (`PREFIX` in `.env`, e.g., `dv`).

---

## 📑 Categories
- [🛡️ Admin & Permissions](#️-admin--permissions)
- [📁 Channels & Security](#-channels--security)
- [🔨 Moderation & Enforcement](#-moderation--enforcement)
- [📊 Analytics & Metrics](#-analytics--metrics)
- [🛠️ Utility & Info](#️-utility--info)
- [🔊 Voice Management](#-voice-management)

---

## 🛡️ Admin & Permissions

| Command | Type | Required Permission | Slash Syntax | Prefix Syntax | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/checkperms` | `[Slash Only]` | Moderator | `/checkperms <user>` | *N/A (Slash Only)* | Audit assigned permissions, administrative access, and danger flags for a member. |
| `/command` | `[Slash & Prefix]` | Manage Server | `/command <panel\|disable\|enable\|list> [command] [channel]` | `dvcommand <subcommand> ...` | Restrict or allow specific bot commands on a per-channel basis. |
| `/permscan` | `[Slash & Prefix]` | Moderator | `/permscan <server\|member> [user]` | `dvpermscan [server\|@user]` | Deep-scan dangerous permissions across the server or audit a specific member. |
| `/purge` | `[Slash Only]` | Manage Messages | `/purge <amount> [user]` | *N/A (Slash Only)* | Bulk delete up to 1,000 messages with optional member filtering. |
| `/rename` | `[Slash & Prefix]` | Manage Nicknames | `/rename <user> <nickname>` | `dvrename <user> <nickname>` | Change a member's server nickname or reset it back to their username (`reset`). |
| `/role` | `[Slash Only]` | Manage Roles | `/role <add\|remove> <user> <role> [silent]` | *N/A (Slash Only)* | Assign or remove a server role with hierarchy checks and silent response mode. |
| `/whois` | `[Slash & Prefix]` | Administrator | `/whois [user]` | `dvwhois [user]` | Full diagnostic member lookup: join date, account age, permissions, and roles. |

### Admin Examples:
```bash
# Audit a member's permissions:
/checkperms user:@NewModerator

# Open channel command restriction panel:
/command panel

# Disable /fuck command in #announcements:
/command disable command:fuck channel:#announcements

# Purge 50 messages from a spammer:
/purge amount:50 user:@Spammer

# Rename a member:
/rename user:@Member nickname:Champion

# Assign / remove roles safely:
/role add user:@Member role:@Supporter
/role remove user:@Member role:@Muted silent:True
```

---

## 📁 Channels & Security

All channel security tools are **verification-aware** and interact properly with server verification roles.

| Command | Type | Required Permission | Slash Syntax | Prefix Syntax | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/lock` | `[Slash Only]` | Manage Channels | `/lock [duration] [channel] [reason]` | *N/A (Slash Only)* | Lock a channel to prevent regular members from messaging, with optional auto-unlock timer. |
| `/unlock` | `[Slash Only]` | Manage Channels | `/unlock [channel] [reason]` | *N/A (Slash Only)* | Restore messaging permissions for regular and verified members in a locked channel. |
| `/hide` | `[Slash Only]` | Manage Channels | `/hide [channel] [reason]` | *N/A (Slash Only)* | Hide a channel so non-staff members cannot view it. |
| `/unhide` | `[Slash Only]` | Manage Channels | `/unhide [channel] [reason]` | *N/A (Slash Only)* | Restore visibility for verified server members in a hidden channel. |
| `/slowmode` | `[Slash Only]` | Manage Channels | `/slowmode <seconds> [channel] [reason]` | *N/A (Slash Only)* | Set slowmode rate limit (0 to 21600 seconds = 6 hours), or 0 to disable. |

### Channel Examples:
```bash
# Lock the current channel for 30 minutes during a raid:
/lock duration:30m reason:Raid containment

# Lock a specific channel indefinitely:
/lock channel:#general reason:Emergency maintenance

# Unlock a channel immediately:
/unlock channel:#general

# Hide a channel during staff setup:
/hide channel:#event-staging reason:Preparing tournament

# Restore visibility:
/unhide channel:#event-staging

# Set 10-second slowmode in #general:
/slowmode seconds:10 channel:#general reason:Chat moving too fast

# Disable slowmode:
/slowmode seconds:0
```

---

## 🔨 Moderation & Enforcement

| Command | Type | Required Permission | Slash Syntax | Prefix Syntax | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/ban` | `[Slash & Prefix]` | Ban Members | `/ban <user> [reason]` | `dvban <user> [reason]` | Permanently ban a user from the server with hierarchy validation. |
| `/fakeban` | `[Slash Only]` | Ban Members | `/fakeban <user> [reason]` | *N/A (Slash Only)* | Simulate a ban: sends authentic DM notice and public log without actually banning. |
| `/kick` | `[Slash & Prefix]` | Kick Members | `/kick <user> [reason]` | `dvkick <user> [reason]` | Kick a member from the server. |
| `/punishments` | `[Slash & Prefix]` | Moderate Members | `/punishments <user>` | `dvpunishments <user>` | View comprehensive infraction history (warnings, kicks, mutes, tempbans). |
| `/tempban` | `[Slash & Prefix]` | Manage Roles | `/tempban <user> <duration> [reason]` | `dvtempban <user> <duration> [reason]` | Temporarily isolate a member using a configured isolation role with auto-expiry. |
| `/untempban` | `[Slash & Prefix]` | Manage Roles | `/untempban <user> [reason]` | `dvuntempban <user> [reason]` | Manually release a member from isolation before the timer expires. |
| `/timeout` | `[Slash & Prefix]` | Moderate Members | `/timeout <user> [duration] [reason]` | `dvtimeout <user> <duration> [reason]` | Apply native Discord timeout (mute) for a specified duration (e.g., 10m, 1h, 1d). |
| `/unban` | `[Slash & Prefix]` | Ban Members | `/unban <userid> [reason]` | `dvunban <userid> [reason]` | Revoke a ban using the target user's Discord ID. |
| `/warn` | `[Slash & Prefix]` | Moderate Members | `/warn <user> [reason]` | `dvwarn <user> [reason]` | Issue a warning; triggers automated punishment rules if thresholds are met. |
| `/warnings` | `[Slash & Prefix]` | Moderate Members | `/warnings <add\|list\|delete\|clear> [user] [reason] [id]` | `dvwarnings <subcommand> ...` | Manage warning records (view member warnings, delete specific IDs, or clear all). |

### Moderation Examples:
```bash
# Issue a permanent ban:
/ban user:@Troublemaker reason:Severe rule violation

# Simulate a ban:
/fakeban user:@Friend reason:Trolling

# Timeout for 1 hour:
/timeout user:@Spammer duration:1h reason:Flooding chat

# Tempban for 3 days:
/tempban user:@RuleBreaker duration:3d reason:Repeated toxicity

# View member infraction history:
/punishments user:@User

# Manage warnings:
/warn user:@User reason:Caps spam
/warnings list user:@User
/warnings delete id:4
/warnings clear user:@User
```

---

## 📊 Analytics & Metrics

| Command | Type | Required Permission | Slash Syntax | Prefix Syntax | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/leaderboard` | `[Slash & Prefix]` | Everyone | `/leaderboard [type] [timeframe]` | `dvleaderboard [type] [timeframe]` | View server chat and voice leaderboards (Weekly or All-Time). |
| `/userstats` | `[Slash & Prefix]` | Everyone | `/userstats [user]` | `dvuserstats [user]` | Inspect text messages, voice minutes, and activity rank for yourself or a member. |

### Analytics Examples:
```bash
# View chat message leaderboard for the current week:
/leaderboard type:Messages timeframe:Weekly

# View all-time voice duration leaderboard:
/leaderboard type:Voice Time timeframe:All Time

# View your personal activity statistics:
/userstats

# View another member's activity:
/userstats user:@Friend
```

---

## 🛠️ Utility & Info

| Command | Type | Required Permission | Slash Syntax | Prefix Syntax | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/afk` | `[Slash & Prefix]` | Everyone | `/afk [reason]` | `dvafk [reason]` | Set your Away-From-Keyboard status; auto-responds when mentioned and cleans on return. |
| `/avatar` | `[Slash & Prefix]` | Everyone | `/avatar [user]` | `dvavatar [user]` | Display high-resolution user avatar with direct download links. |
| `/banner` | `[Slash & Prefix]` | Everyone | `/banner [user]` | `dvbanner [user]` | Display high-resolution user profile banner. |
| `/fuck` | `[Slash & Prefix]` | Everyone | `/fuck [user]` | `dvfuck [user]` | Generate a witty, 100% non-repetitive roast deck draw against a user. |
| `/help` | `[Slash & Prefix]` | Everyone | `/help [command]` | `dvhelp [command]` | Interactive directory browser with dropdown category selection and detailed syntax introspection. |
| `/ping` | `[Slash & Prefix]` | Everyone | `/ping` | `dvping` | Real-time diagnostic telemetry: WebSocket heartbeat, HTTP latency, and database query timings. |
| `/roleinfo` | `[Slash & Prefix]` | Administrator | `/roleinfo <role>` | `dvroleinfo <role>` | Deep inspection of a role: member count, permissions, color, and creation date. |
| `/serverinfo` | `[Slash & Prefix]` | Administrator | `/serverinfo` | `dvserverinfo` | Detailed overview of the guild: boost tier, verification level, channel breakdown, and security status. |
| `/steal` | `[Slash & Prefix]` | Manage Emojis | `/steal <source> [name]` | `dvsteal <source> [name]` | Clone emojis or stickers from messages, reactions, or external CDN links into your guild. |

### Utility Examples:
```bash
# Set AFK status:
/afk reason:Studying for finals

# View high-res avatar and banner:
/avatar user:@Friend
/banner user:@Friend

# Clone an emoji:
/steal source:https://cdn.discordapp.com/emojis/123456789.png name:hype

# Inspect command directory:
/help
/help command:lock
```

---

## 🔊 Voice Management

| Command | Type | Required Permission | Slash Syntax | Prefix Syntax | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/drag` | `[Slash & Prefix]` | Move Members | `/drag <user> [channel]` | `dvdrag <user> [channel]` | Move a member into your current voice channel or a specified target channel. |
| `/moveall` | `[Slash & Prefix]` | Move Members | `/moveall [source] [target]` | `dvmoveall [source] [target]` | Move all members from one voice channel to another in bulk. |

### Voice Examples:
```bash
# Drag a member into your voice channel:
/drag user:@Friend

# Drag a member into a specific channel:
/drag user:@Friend channel:#Gaming-1

# Move all members from #Lobby to #Match-Room:
/moveall source:#Lobby target:#Match-Room
```
