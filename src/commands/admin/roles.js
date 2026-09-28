import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { sendModLog } from "../../utils/modLog.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("role")
  .setDescription("Assign or remove a role from a member")
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Give a role to a member")
      .addUserOption((opt) => opt.setName("user").setDescription("The target member").setRequired(true))
      .addRoleOption((opt) => opt.setName("role").setDescription("The role to give").setRequired(true))
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
  description: "Assign or remove a role from a member",
  category: "Admin",
  modOnly: true,
  requiredPermission: PermissionFlagsBits.ManageRoles,
  slashBuilder,

  async execute(ctx) {
    // Restrict to Slash Command Only
    if (!ctx.isInteraction) {
      return;
    }

    const { guild, member: actorMember, user } = ctx;
    if (!guild) return;

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
        embeds: [makeEmbed({ title: "Not Found", description: `${EMOJIS.get("fail") || "❌"} Member not found in this server.`, level: "ERROR" })],
        ephemeral: true,
      });
    }

    if (!role) {
      return await ctx.reply({
        embeds: [makeEmbed({ title: "Not Found", description: `${EMOJIS.get("fail") || "❌"} Role not found.`, level: "ERROR" })],
        ephemeral: true,
      });
    }

    const botMember = guild.members.me;

    // Bot hierarchy check
    if (role.position >= botMember.roles.highest.position) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Hierarchy Error",
            description: `${EMOJIS.get("fail") || "❌"} I cannot manage ${role} - it is at or above my highest role.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    // Actor hierarchy check
    if (actorMember && role.position >= actorMember.roles.highest.position && guild.ownerId !== user.id) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Permission Denied",
            description: `${EMOJIS.get("fail") || "❌"} You cannot manage ${role} - it is at or above your highest role.`,
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
              title: "Already Assigned",
              description: `${EMOJIS.get("warning") || "⚠️"} ${targetMember} already has the ${role} role.`,
              level: "WARNING",
            }),
          ],
          ephemeral: true,
        });
      }

      await targetMember.roles.add(role, `Role assigned by ${user.tag || user.username}`).catch(() => {});

      await sendModLog({
        guild,
        title: "Role Added",
        description: `${role} given to ${targetMember} by ${user}.`,
        level: "INFO",
        actor: user,
        extraFields: { Role: role.name, Member: targetMember.user.tag || targetMember.user.username },
      }).catch(() => {});

      return await ctx.reply({
        embeds: [
          makeEmbed({
            author: { name: "Role Management", iconURL: guild.iconURL?.({ dynamic: true }) || undefined },
            title: "Role Added",
            description:
              `${EMOJIS.get("success") || "✅"} Successfully gave ${role} to ${targetMember}.\n\n` +
              `• **Member:** ${targetMember} (`${targetMember.user.tag || targetMember.user.username}`)\n` +
              `• **Role:** ${role} (`${role.name}`)\n` +
              `• **Moderator:** ${user}`,
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
              title: "Not Assigned",
              description: `${EMOJIS.get("warning") || "⚠️"} ${targetMember} does not have the ${role} role.`,
              level: "WARNING",
            }),
          ],
          ephemeral: true,
        });
      }

      await targetMember.roles.remove(role, `Role removed by ${user.tag || user.username}`).catch(() => {});

      await sendModLog({
        guild,
        title: "Role Removed",
        description: `${role} removed from ${targetMember} by ${user}.`,
        level: "INFO",
        actor: user,
        extraFields: { Role: role.name, Member: targetMember.user.tag || targetMember.user.username },
      }).catch(() => {});

      return await ctx.reply({
        embeds: [
          makeEmbed({
            author: { name: "Role Management", iconURL: guild.iconURL?.({ dynamic: true }) || undefined },
            title: "Role Removed",
            description:
              `${EMOJIS.get("success") || "✅"} Successfully removed ${role} from ${targetMember}.\n\n` +
              `• **Member:** ${targetMember} (`${targetMember.user.tag || targetMember.user.username}`)\n` +
              `• **Role:** ${role} (`${role.name}`)\n` +
              `• **Moderator:** ${user}`,
            level: "SUCCESS",
            headerDivider: false,
          }),
        ],
        ephemeral: false
      });
    }
  },
});
