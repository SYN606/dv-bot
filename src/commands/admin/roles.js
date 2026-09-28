import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { sendModLog } from "../../utils/modLog.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("role")
  .setDescription("Manage server roles")
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Assign a role to a member")
      .addUserOption((opt) => opt.setName("user").setDescription("The target member").setRequired(true))
      .addRoleOption((opt) => opt.setName("role").setDescription("The role to assign").setRequired(true))
  )
  .addSubcommand((sub) =>
    sub
      .setName("remove")
      .setDescription("Remove a role from a member")
      .addUserOption((opt) => opt.setName("user").setDescription("The target member").setRequired(true))
      .addRoleOption((opt) => opt.setName("role").setDescription("The role to remove").setRequired(true))
  );

export default createCommand({
  name: "role",
  description: "Manage server roles.",
  category: "Admin",
  slashOnly: true, // User requested strict slash
  adminOnly: true,
  requiredPermission: PermissionFlagsBits.ManageRoles,
  slashBuilder,

  async execute(ctx) {
    const { guild, user, member } = ctx;
    if (!guild || !ctx.isInteraction) return; // Enforce strict slash command

    const sub = ctx.subcommand;
    const targetUserId = ctx.options.user;
    const roleId = ctx.options.role;

    if (!targetUserId || !roleId) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Usage",
            description: "**Slash:**\n`/role add <user> <role>`\n`/role remove <user> <role>`",
            level: "INFO",
          }),
        ],
        ephemeral: true,
      });
    }

    const targetMember = await guild.members.fetch(targetUserId).catch(() => null);
    const role = guild.roles.cache.get(roleId);

    if (!targetMember) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Not Found",
            description: "Member not found in this server.",
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    if (!role) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Not Found",
            description: "Role not found in this server.",
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    // Role Hierarchy Checks
    const botMember = guild.members.me;

    // 1. Can Bot Manage this Role?
    if (role.position >= botMember.roles.highest.position) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Hierarchy Error",
            description: `I cannot manage ${role} because it is higher than or equal to my highest role.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    // 2. Can Mod Manage this Role?
    if (guild.ownerId !== user.id && role.position >= member.roles.highest.position) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Permission Denied",
            description: `You cannot manage ${role} because it is higher than or equal to your highest role.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    // 3. Mod vs Target Member Hierarchy (Only applies if doing aggressive actions, but good practice for roles too)
    if (
      guild.ownerId !== user.id &&
      targetMember.id !== user.id &&
      targetMember.roles.highest.position >= member.roles.highest.position
    ) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Permission Denied",
            description: `You cannot manage roles for ${targetMember} because they have an equal or higher role than you.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    if (sub === "add") {
      if (targetMember.roles.cache.has(role.id)) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Already Has Role",
              description: `${targetMember} already has the ${role} role.`,
              level: "WARNING",
            }),
          ],
          ephemeral: true,
        });
      }

      await ctx.defer({ ephemeral: false });
      await targetMember.roles.add(role, `Role assigned by ${user.tag}`);

      await sendModLog({
        guild,
        category: "ADMIN",
        title: "Role Added",
        description: `${user} assigned the ${role} role to ${targetMember}.`,
        level: "INFO",
        actor: user,
      });

      return await ctx.reply({
        embeds: [
          makeEmbed({
            author: { name: "Role Management", iconURL: guild.iconURL?.({ dynamic: true }) || undefined },
            title: "Role Added",
            description:
              `${EMOJIS.get("success") || "✅"} Successfully gave ${role} to ${targetMember}.\n\n` +
              `➡️ **Member:** ${targetMember} (\`${targetMember.user.tag || targetMember.user.username}\`)\n` +
              `➡️ **Role:** ${role} (\`${role.name}\`)\n` +
              `➡️ **Moderator:** ${user}`,
            level: "SUCCESS",
            headerDivider: false,
          }),
        ],
        ephemeral: false
      });
    }

    if (sub === "remove") {
      if (!targetMember.roles.cache.has(role.id)) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Missing Role",
              description: `${targetMember} does not have the ${role} role.`,
              level: "WARNING",
            }),
          ],
          ephemeral: true,
        });
      }

      await ctx.defer({ ephemeral: false });
      await targetMember.roles.remove(role, `Role removed by ${user.tag}`);

      await sendModLog({
        guild,
        category: "ADMIN",
        title: "Role Removed",
        description: `${user} removed the ${role} role from ${targetMember}.`,
        level: "INFO",
        actor: user,
      });

      return await ctx.reply({
        embeds: [
          makeEmbed({
            author: { name: "Role Management", iconURL: guild.iconURL?.({ dynamic: true }) || undefined },
            title: "Role Removed",
            description:
              `${EMOJIS.get("success") || "✅"} Successfully removed ${role} from ${targetMember}.\n\n` +
              `➡️ **Member:** ${targetMember} (\`${targetMember.user.tag || targetMember.user.username}\`)\n` +
              `➡️ **Role:** ${role} (\`${role.name}\`)\n` +
              `➡️ **Moderator:** ${user}`,
            level: "SUCCESS",
            headerDivider: false,
          }),
        ],
        ephemeral: false
      });
    }
  },
});
