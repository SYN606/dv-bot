import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("role")
  .setDescription("Assign or remove roles from a member")
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Give a role to a member")
      .addUserOption((opt) => opt.setName("user").setDescription("The member").setRequired(true))
      .addRoleOption((opt) => opt.setName("role").setDescription("The role to give").setRequired(true))
  )
  .addSubcommand((sub) =>
    sub
      .setName("remove")
      .setDescription("Remove a role from a member")
      .addUserOption((opt) => opt.setName("user").setDescription("The member").setRequired(true))
      .addRoleOption((opt) => opt.setName("role").setDescription("The role to remove").setRequired(true))
  );

export default createCommand({
  name: "role",
  description: "Assign or remove roles from a member",
  category: "Admin",
  modOnly: true,
  requiredPermission: PermissionFlagsBits.ManageRoles,
  slashBuilder,

  async execute(ctx) {
    const { guild, member: actorMember } = ctx;
    if (!guild) return;

    const sub = ctx.subcommand || ctx.options._args?.[0] || "add";
    const targetUserId = ctx.options.user || ctx.options._args?.[1]?.replace(/[<@!>]/g, "");
    const roleId = ctx.options.role || ctx.options._args?.[2]?.replace(/[<@&>]/g, "");

    if (!targetUserId || !roleId) {
      return await ctx.reply("Usage: `/role add <user> <role>` or `/role remove <user> <role>`");
    }

    const targetMember = await guild.members.fetch(targetUserId).catch(() => null);
    const role = guild.roles.cache.get(roleId);

    if (!targetMember || !role) {
      return await ctx.reply("Member or role not found.");
    }

    const botMember = guild.members.me;
    if (role.position >= botMember.roles.highest.position) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Action Failed",
            description: `${EMOJIS.get("fail") || "❌"} I cannot manage ${role} because it is higher than my highest role.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    if (actorMember && role.position >= actorMember.roles.highest.position && guild.ownerId !== ctx.user.id) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Action Failed",
            description: `${EMOJIS.get("fail") || "❌"} You cannot manage ${role} because it is higher than your highest role.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    if (sub === "add") {
      await targetMember.roles.add(role).catch(() => {});
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Role Added",
            description: `${EMOJIS.get("success") || "✅"} Added ${role} to ${targetMember}.`,
            level: "SUCCESS",
          }),
        ],
      });
    }

    if (sub === "remove") {
      await targetMember.roles.remove(role).catch(() => {});
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Role Removed",
            description: `${EMOJIS.get("success") || "✅"} Removed ${role} from ${targetMember}.`,
            level: "SUCCESS",
          }),
        ],
      });
    }
  },
});
