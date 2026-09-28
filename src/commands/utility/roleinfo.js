import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("roleinfo")
  .setDescription("Get detailed statistics, member count, and permissions for a role.")
  .addRoleOption((opt) => opt.setName("role").setDescription("The role you want to inspect.").setRequired(true));

export default createCommand({
  name: "roleinfo",
  description: "Get detailed statistics, member count, and permissions for a role.",
  category: "Utility",
  adminOnly: true,
  slashBuilder,
  aliases: ["rinfo", "role-info"],

  async execute(ctx) {
    const { guild, interaction, message, user } = ctx;
    if (!guild) return;

    let targetRole = ctx.options.role;
    
    // Fallback for prefix command usage
    if (!ctx.isInteraction) {
      if (message) {
        try {
          await message.delete().catch(() => {});
        } catch (err) {}
      }

      if (!targetRole) {
        const rawRole = ctx.options._args?.[0];
        if (rawRole) {
          const roleId = rawRole.replace(/[<@&>]/g, "");
          targetRole = guild.roles.cache.get(roleId) || guild.roles.cache.find(r => r.name.toLowerCase() === rawRole.toLowerCase());
        }
      }

      if (!targetRole) {
        return await ctx.reply({
          embeds: [makeEmbed({ title: "Usage", description: "`/roleinfo <role>`", level: "INFO" })],
          ephemeral: true,
        });
      }
    }

    if (typeof targetRole === "string") {
      targetRole = guild.roles.cache.get(targetRole);
    }

    if (!targetRole) {
      return await ctx.reply({
        embeds: [makeEmbed({ title: "Error", description: "Role not found.", level: "ERROR" })],
        ephemeral: true
      });
    }

    // Force fetch all members to ensure role.members cache is fully accurate
    try {
      await guild.members.fetch();
    } catch (e) {
      // Ignored if large server and disabled intents
    }

    const totalMembers = targetRole.members.size;
    const humans = targetRole.members.filter(m => !m.user.bot).size;
    const bots = targetRole.members.filter(m => m.user.bot).size;

    const isHoisted = targetRole.hoist ? "Yes" : "No";
    const isMentionable = targetRole.mentionable ? "Yes" : "No";
    const isManaged = targetRole.managed ? "Yes (Integration/Bot)" : "No";
    const positionStr = `${targetRole.position} / ${guild.roles.cache.size - 1}`;

    const perms = targetRole.permissions;
    let keyPermissions = [];

    if (perms.has(PermissionFlagsBits.Administrator)) {
      keyPermissions.push("`Administrator` (All Permissions Granted)");
    } else {
      const checks = [
        { bit: PermissionFlagsBits.ManageGuild, name: "Manage Server" },
        { bit: PermissionFlagsBits.ManageRoles, name: "Manage Roles" },
        { bit: PermissionFlagsBits.ManageChannels, name: "Manage Channels" },
        { bit: PermissionFlagsBits.KickMembers, name: "Kick Members" },
        { bit: PermissionFlagsBits.BanMembers, name: "Ban Members" },
        { bit: PermissionFlagsBits.ModerateMembers, name: "Timeout Members" },
        { bit: PermissionFlagsBits.ManageMessages, name: "Manage Messages" },
        { bit: PermissionFlagsBits.ManageWebhooks, name: "Manage Webhooks" },
        { bit: PermissionFlagsBits.MentionEveryone, name: "Mention Everyone" },
        { bit: PermissionFlagsBits.ViewAuditLog, name: "View Audit Log" },
      ];

      for (const check of checks) {
        if (perms.has(check.bit)) {
          keyPermissions.push(`\`${check.name}\``);
        }
      }
    }

    const formattedPerms = keyPermissions.length > 0 
      ? keyPermissions.join(", ") 
      : "*No key administrative permissions.*";

    const timestamp = Math.floor(targetRole.createdAt.getTime() / 1000);

    const embed = makeEmbed({
      title: `Role Information — ${targetRole.name}`,
      description: `**Mention:** ${targetRole}\n**ID:** \`${targetRole.id}\``,
      level: "INFO",
      footer: `Requested by ${user?.tag || user?.username || "Unknown"}`,
    });

    if (targetRole.hexColor !== "#000000") {
      embed.setColor(targetRole.hexColor);
    }

    embed.addFields([
      {
        name: "📊 Member Overview",
        value: `• **Total Members:** \`${totalMembers}\`\n• **Humans:** \`${humans}\`\n• **Bots:** \`${bots}\``,
        inline: true
      },
      {
        name: "⚙️ Settings & Info",
        value: `• **Position:** \`${positionStr}\`\n• **Hoisted:** \`${isHoisted}\`\n• **Mentionable:** \`${isMentionable}\`\n• **Managed:** \`${isManaged}\`\n• **Color Code:** \`${targetRole.hexColor.toUpperCase()}\`\n• **Created:** <t:${timestamp}:R>`,
        inline: true
      },
      {
        name: "🔐 Key Administrative Permissions",
        value: formattedPerms,
        inline: false
      }
    ]);

    await ctx.reply({ embeds: [embed], ephemeral: false });
  },
});
