import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { VCRoleConfig } from "../../db/models/index.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("vcrole")
  .setDescription("Configure a role to automatically give to members in voice channels")
  .addRoleOption((opt) => opt.setName("role").setDescription("The role to assign (leave empty to disable)").setRequired(false));

export default createCommand({
  name: "vcrole",
  description: "Configure a role to automatically give to members in voice channels",
  category: "Voice",
  configOnly: true,
  requiredPermission: PermissionFlagsBits.ManageRoles,
  slashBuilder,

  async execute(ctx) {
    const { guild } = ctx;
    if (!guild) return;

    const roleId = ctx.options.role || ctx.options._args?.[0]?.replace(/[<@&>]/g, "");

    if (!roleId) {
      await VCRoleConfig.destroy({ where: { guild_id: String(guild.id) } });
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "VC Role Disabled",
            description: `${EMOJIS.get("success") || "✅"} Voice channel automated role has been **disabled**.`,
            level: "SUCCESS",
          }),
        ],
      });
    }

    const role = guild.roles.cache.get(roleId);
    if (!role) return await ctx.reply("Role not found.");

    await VCRoleConfig.upsert({
      guild_id: String(guild.id),
      role_id: String(role.id),
    });

    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "VC Role Configured",
          description: `${EMOJIS.get("success") || "✅"} Members will now automatically receive ${role} when joining voice channels.`,
          level: "SUCCESS",
        }),
      ],
    });
  },
});
