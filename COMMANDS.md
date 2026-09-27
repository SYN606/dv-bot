# DV-BOT Command Reference

> This document provides a complete list of all available commands, their categories, descriptions, and usage syntax.
> All commands can be triggered using Slash Commands (`/`) or the configured prefix (default: `ts`).

## Admin

| Command | Description | Slash Usage | Prefix Usage |
|---------|-------------|-------------|--------------|
| `/checkperms` | Audit a member's assigned permissions. | `/checkperms &lt;user&gt;` | `tscheckperms &lt;user&gt;` |
| `/command` | Manage channel command restrictions (disable / enable / list / panel) | `/command [panel] [disable] [enable] [list]` | `tscommand [panel] [disable] [enable] [list]` |
| `/permscan` | Scan permissions of the server or a specific member. | `/permscan [server] [member]` | `tspermscan [server] [member]` |
| `/purge` | Cog for performing bulk message deletion in guild channels. | `/purge &lt;amount&gt; [user]` | `tspurge &lt;amount&gt; [user]` |
| `/rename` | Change or reset a member's server nickname | `/rename &lt;user&gt; &lt;nickname&gt;` | `tsrename &lt;user&gt; &lt;nickname&gt;` |
| `/role` | Assign or remove a role from a member | `/role [add] [remove]` | `tsrole [add] [remove]` |
| `/whois` | Cog providing comprehensive user and member lookup information. | `/whois [user]` | `tswhois [user]` |

## Analytics

| Command | Description | Slash Usage | Prefix Usage |
|---------|-------------|-------------|--------------|
| `/leaderboard` | View server chat and voice leaderboards | `/leaderboard [type] [timeframe]` | `tsleaderboard [type] [timeframe]` |
| `/userstats` | View member chat and voice activity statistics | `/userstats [user]` | `tsuserstats [user]` |

## Channels

| Command | Description | Slash Usage | Prefix Usage |
|---------|-------------|-------------|--------------|
| `/hide` | Hide or unhide a channel — verification-aware | `/hide &lt;action&gt; [channel]` | `tshide &lt;action&gt; [channel]` |
| `/lock` | Lock or unlock a channel — verification-aware | `/lock &lt;action&gt; [duration] [channel]` | `tslock &lt;action&gt; [duration] [channel]` |
| `/slowmode` | Set the slowmode rate limit for the current channel | `/slowmode &lt;seconds&gt;` | `tsslowmode &lt;seconds&gt;` |

## Moderation

| Command | Description | Slash Usage | Prefix Usage |
|---------|-------------|-------------|--------------|
| `/ban` | Permanently ban a member from the server | `/ban &lt;user&gt; [reason]` | `tsban &lt;user&gt; [reason]` |
| `/fakeban` | Simulate a user ban completely (Sends DM and custom channel warnings) | `/fakeban &lt;user&gt; [reason]` | `tsfakeban &lt;user&gt; [reason]` |
| `/kick` | Kick a member from the server | `/kick &lt;user&gt; [reason]` | `tskick &lt;user&gt; [reason]` |
| `/permscan` | Run a security audit on a member or the entire server. | `/permscan [member] [server]` | `tspermscan [member] [server]` |
| `/punishments` | View all punishments and warnings for a user | `/punishments` | `tspunishments` |
| `/tempban` | Temporarily ban or isolate a member from the server | `/tempban [add] [remove] [role]` | `tstempban [add] [remove] [role]` |
| `/timeout` | Mute/timeout a member for a specified duration | `/timeout &lt;user&gt; [duration] [reason]` | `tstimeout &lt;user&gt; [duration] [reason]` |
| `/unban` | Unban a previously banned user from the server | `/unban &lt;userid&gt; [reason]` | `tsunban &lt;userid&gt; [reason]` |
| `/warnings` | Manage and view member warnings | `/warnings [add] [list] [delete] [clear]` | `tswarnings [add] [list] [delete] [clear]` |

## Utility

| Command | Description | Slash Usage | Prefix Usage |
|---------|-------------|-------------|--------------|
| `/afk` | Set your Away-From-Keyboard status for this server | `/afk [reason]` | `tsafk [reason]` |
| `/avatar` | View user avatar in high resolution | `/avatar [user]` | `tsavatar [user]` |
| `/banner` | View user banner in high resolution | `/banner [user]` | `tsbanner [user]` |
| `/fuck` | Generate a witty, non-repetitive roast for a user | `/fuck [user]` | `tsfuck [user]` |
| `/help` | View bot commands and usage instructions | `/help [command]` | `tshelp [command]` |
| `/ping` | Measure WebSocket gateway heartbeat and HTTP API round-trip latency. | `/ping` | `tsping` |
| `/serverinfo` | Display comprehensive, beautifully formatted information about the server. | `/serverinfo` | `tsserverinfo` |
| `/steal` | Steal custom emojis and stickers from messages or URLs | `/steal &lt;source&gt; [name]` | `tssteal &lt;source&gt; [name]` |

## Voice

| Command | Description | Slash Usage | Prefix Usage |
|---------|-------------|-------------|--------------|
| `/drag` | Move a member to a specified voice channel or your current channel | `/drag &lt;user&gt; [channel]` | `tsdrag &lt;user&gt; [channel]` |
| `/moveall` | Move all members from one voice channel to another | `/moveall &lt;source&gt; [target]` | `tsmoveall &lt;source&gt; [target]` |

