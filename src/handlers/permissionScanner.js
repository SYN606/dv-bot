import { PermissionFlagsBits } from "discord.js";
import { sendModLog } from "../utils/modLog.js";
import { ModerationLogConfig } from "../db/models/index.js";

const DANGEROUS_PERMISSIONS = [
  { name: "Administrator", flag: PermissionFlagsBits.Administrator },
  { name: "Manage Server", flag: PermissionFlagsBits.ManageGuild },
  { name: "Manage Roles", flag: PermissionFlagsBits.ManageRoles },
  { name: "Manage Channels", flag: PermissionFlagsBits.ManageChannels },
  { name: "Manage Webhooks", flag: PermissionFlagsBits.ManageWebhooks },
  { name: "Ban Members", flag: PermissionFlagsBits.BanMembers },
  { name: "Kick Members", flag: PermissionFlagsBits.KickMembers },
  { name: "Mention Everyone", flag: PermissionFlagsBits.MentionEveryone },
  { name: "Manage Messages", flag: PermissionFlagsBits.ManageMessages },
];

export class PermissionScanner {
  constructor(client) {
    this.client = client;
    this.interval = null;
    this.scanIntervalMs = 60 * 60 * 1000; // Run once an hour
  }

  start() {
    if (this.interval) return;
    console.log("[PermissionScanner] Background scanner started.");
    
    // Initial run delayed by 30 seconds to let the bot settle
    setTimeout(() => this.runScan(), 30 * 1000);
    
    this.interval = setInterval(() => this.runScan(), this.scanIntervalMs);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async runScan() {
    console.log("[PermissionScanner] Running hourly server permission audit...");
    for (const guild of this.client.guilds.cache.values()) {
      try {
        // Skip entirely if ModLog isn't configured, saves massive API calls
        const config = await ModerationLogConfig.findByPk(String(guild.id));
        if (!config || !config.enabled || !config.channel_id) {
          continue;
        }

        await this.scanGuild(guild);
      } catch (err) {
        console.error(`[PermissionScanner] Failed to scan guild ${guild.id}:`, err);
      }
    }
  }

  async scanGuild(guild) {
    try {
      await guild.members.fetch(); // Ensure all members are cached
    } catch (e) {}

    const dangerousMembers = [];
    
    for (const member of guild.members.cache.values()) {
      if (member.user.bot) continue;
      if (member.id === guild.ownerId) continue; // Owner is always safe

      const dangerous = [];
      for (const perm of DANGEROUS_PERMISSIONS) {
        if (member.permissions.has(perm.flag)) {
          dangerous.push(perm.name);
        }
      }

      if (dangerous.length > 0) {
        dangerousMembers.push({ user: member.user, perms: dangerous });
      }
    }

    // If we found dangerous members, alert the server staff!
    if (dangerousMembers.length > 0) {
      const MAX_DISPLAY = 15;
      
      let description = `⚠️ **Automated Security Scan Alert**\n\nThe background permission scanner has detected **${dangerousMembers.length}** non-owner member(s) with potentially dangerous administrative permissions.\n\n`;

      for (let i = 0; i < Math.min(dangerousMembers.length, MAX_DISPLAY); i++) {
        const entry = dangerousMembers[i];
        description += `**${entry.user.tag}** (\`${entry.user.id}\`)\n`;
        description += `└ ${entry.perms.join(", ")}\n\n`;
      }

      if (dangerousMembers.length > MAX_DISPLAY) {
        description += `\n*...and ${dangerousMembers.length - MAX_DISPLAY} more members. Check the dashboard for the full list.*`;
      }

      description += `\n\n*Tip: Regularly review roles to ensure no user has unauthorized access. Consider stripping these permissions if they were not explicitly granted.*`;

      await sendModLog({
        guild,
        category: "SECURITY",
        title: "Dangerous Permissions Detected",
        description,
        level: "WARNING"
      });
    }
  }
}
