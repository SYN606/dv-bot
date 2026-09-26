import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";

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

const slashBuilder = new SlashCommandBuilder()
  .setName("permscan")
  .setDescription("Scan the entire server for members with dangerous administrative permissions");

export default createCommand({
  name: "permscan",
  description: "Scan the entire server for members with dangerous administrative permissions",
  category: "Admin",
  modOnly: true,
  slashOnly: true,
  slashBuilder,

  async execute(ctx) {
    const { guild } = ctx;
    if (!guild) return;

    await ctx.defer({ ephemeral: true });

    try {
      await guild.members.fetch();
    } catch (e) {
      // Ignored
    }

    const dangerousMembers = [];
    
    for (const member of guild.members.cache.values()) {
      if (member.user.bot) continue; // Skip bots to keep it clean

      const dangerous = [];
      for (const perm of DANGEROUS_PERMISSIONS) {
        if (member.permissions.has(perm.flag)) {
          dangerous.push(perm.name);
        }
      }

      if (dangerous.length > 0) {
        dangerousMembers.push({
          user: member.user,
          perms: dangerous,
          isOwner: member.id === guild.ownerId
        });
      }
    }

    dangerousMembers.sort((a, b) => b.perms.length - a.perms.length);

    const modEmoji = EMOJIS.get("moderation") || "🛡️";
    const warningEmoji = EMOJIS.get("warning") || "⚠️";
    const successEmoji = EMOJIS.get("success") || "✅";

    if (dangerousMembers.length === 0) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Permissions Server Scan",
            description: `${successEmoji} The server is completely clean. No members hold dangerous permissions.`,
            level: "SUCCESS"
          })
        ]
      });
    }

    let description = `${warningEmoji} Found **${dangerousMembers.length}** members with potentially dangerous permissions.\n\n`;

    const MAX_DISPLAY = 15;
    for (let i = 0; i < Math.min(dangerousMembers.length, MAX_DISPLAY); i++) {
      const entry = dangerousMembers[i];
      const flags = entry.isOwner ? " *(Server Owner)*" : "";
      description += `**${entry.user.tag}** (\`${entry.user.id}\`)${flags}\n`;
      description += `└ ${entry.perms.join(", ")}\n\n`;
    }

    if (dangerousMembers.length > MAX_DISPLAY) {
      description += `\n*...and ${dangerousMembers.length - MAX_DISPLAY} more members. See the dashboard for the full list.*`;
    }

    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: `${modEmoji} Full Server Permissions Scan`,
          description: description,
          level: "WARNING",
        })
      ]
    });
  }
});
