import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import {
  addAdminRole,
  getAdminRoles,
  removeAdminRole,
} from "../../db/helpers/adminRoles.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("adminrole")
  .setDescription("Manage authorized bot administration roles (Server Owner only)")
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Authorize a role for administrative bot override permissions")
      .addRoleOption((opt) => opt.setName("role").setDescription("The target role").setRequired(true))
  )
  .addSubcommand((sub) =>
    sub
      .setName("remove")
      .setDescription("Revoke administrative bot authority from a role")
      .addRoleOption((opt) => opt.setName("role").setDescription("The target role").setRequired(true))
  )
  .addSubcommand((sub) =>
    sub.setName("list").setDescription("List all currently authorized admin roles")
  );

export default createCommand({
  name: "adminrole",
  description: "Manage authorized bot administration roles",
  category: "Admin",
  slashBuilder,

  async execute(ctx) {
    const { guild, user, member } = ctx;
    if (!guild) return;

    // Strict Server Owner validation
    if (guild.ownerId !== user.id) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Permission Denied",
            description: `${EMOJIS.get("fail") || "❌"} Administrative role configurations are strictly restricted to the **Server Owner**.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    const sub = ctx.subcommand || ctx.options._args?.[0] || "list";
    const roleId = ctx.options.role || ctx.options._args?.[1]?.replace(/[<@&>]/g, "");

    if (sub === "add") {
      if (!roleId) return await ctx.reply("Please specify a role.");
      const role = guild.roles.cache.get(roleId);
      if (!role) return await ctx.reply("Role not found.");

      const created = await addAdminRole(guild.id, role.id);
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: created ? "Admin Role Added" : "Already Authorized",
            description: created
              ? `${EMOJIS.get("success") || "✅"} Granted bot administration authority to ${role}.`
              : `${EMOJIS.get("warning") || "⚠️"} Role ${role} is already an authorized admin role.`,
            level: created ? "SUCCESS" : "WARNING",
          }),
        ],
      });
    }

    if (sub === "remove") {
      if (!roleId) return await ctx.reply("Please specify a role.");
      const role = guild.roles.cache.get(roleId);
      const deleted = await removeAdminRole(guild.id, roleId);
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: deleted ? "Admin Role Removed" : "Not Authorized",
            description: deleted
              ? `${EMOJIS.get("success") || "✅"} Revoked bot administration authority from ${role ? role : `<@&${roleId}>`}.`
              : `${EMOJIS.get("warning") || "⚠️"} Role is not in the admin role registry.`,
            level: deleted ? "SUCCESS" : "WARNING",
          }),
        ],
      });
    }

    if (sub === "list") {
      const roles = await getAdminRoles(guild.id);
      const roleMentions = roles
        .map((rId) => {
          const r = guild.roles.cache.get(rId);
          return r ? `• ${r} (\`${r.id}\`)` : `• <@&${rId}> (\`${rId}\`)`;
        })
        .join("\n");

      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: `Admin Roles • ${guild.name}`,
            description:
              roles.length > 0
                ? `Authorized roles with bot admin permissions:\n\n${roleMentions}`
                : `${EMOJIS.get("warning") || "⚠️"} No admin roles configured. Only Server Owner & Administrators have authority.`,
            level: "INFO",
          }),
        ],
      });
    }
  },
});
