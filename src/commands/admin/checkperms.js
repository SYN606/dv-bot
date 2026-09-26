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
  .setName("checkperms")
  .setDescription("Scan and audit a member's dangerous permissions")
  .addUserOption(opt => opt.setName("user").setDescription("The member to audit").setRequired(true));

export default createCommand({
  name: "checkperms",
  description: "Scan and audit a member's dangerous permissions",
  category: "Admin",
  modOnly: true,
  slashOnly: true,
  slashBuilder,

  async execute(ctx) {
    const { guild, client } = ctx;
    if (!guild) return;

    const targetUserId = ctx.options.user?.id || ctx.options.user;
    if (!targetUserId) {
      return await ctx.reply("Please specify a user to audit.");
    }

    const member = await guild.members.fetch(targetUserId).catch(() => null);
    if (!member) {
      return await ctx.reply({ content: "Could not find that member in the server.", ephemeral: true });
    }

    const dangerous = [];
    for (const perm of DANGEROUS_PERMISSIONS) {
      if (member.permissions.has(perm.flag)) {
        dangerous.push(perm.name);
      }
    }

    const modEmoji = EMOJIS.get("moderation") || "🛡️";
    const warningEmoji = EMOJIS.get("warning") || "⚠️";
    const successEmoji = EMOJIS.get("success") || "✅";

    if (dangerous.length === 0) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Permissions Audit",
            description: `${successEmoji} **${member.user.tag}** does not have any dangerous administrative permissions.`,
            level: "SUCCESS"
          })
        ]
      });
    }

    const roles = member.roles.cache.filter(r => r.id !== guild.id).map(r => r.toString()).join(", ") || "None";

    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "Permissions Audit",
          description: `${warningEmoji} **${member.user.tag}** has potentially dangerous permissions!`,
          level: "WARNING",
          fields: [
            {
              name: `${modEmoji} Dangerous Permissions (${dangerous.length})`,
              value: dangerous.map(d => `• ${d}`).join("\n"),
              inline: false
            },
            {
              name: "Roles",
              value: roles,
              inline: false
            }
          ]
        })
      ]
    });
  }
});
