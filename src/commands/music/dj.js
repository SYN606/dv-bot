import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { getMusicSettings, updateMusicSettings } from "../../db/helpers/music.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("dj")
  .setDescription("Configure DJ role and DJ-only mode permissions")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addRoleOption((opt) => opt.setName("role").setDescription("The DJ role to assign").setRequired(false))
  .addBooleanOption((opt) => opt.setName("dj_only").setDescription("Enforce DJ-only mode for music commands").setRequired(false))
  .addBooleanOption((opt) => opt.setName("clear").setDescription("Remove DJ role restriction").setRequired(false));

export default createCommand({
  name: "dj",
  description: "Configure DJ role and permissions",
  category: "Music",
  modOnly: true,
  requiredPermission: PermissionFlagsBits.ManageGuild,
  slashBuilder,

  async execute(ctx) {
    const { guild, member } = ctx;
    if (!guild) return;

    if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return await ctx.reply({
        content: "You need `Manage Server` permission to configure DJ settings.",
        ephemeral: true,
      });
    }

    const role = ctx.options.role;
    const djOnly = ctx.options.dj_only;
    const clear = ctx.options.clear;

    const current = await getMusicSettings(guild.id);

    if (clear) {
      await updateMusicSettings(guild.id, { dj_role_id: null, dj_only: false });
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "🎧 DJ Role Cleared",
            description: "DJ role and DJ-only mode have been disabled. All members can control playback.",
            level: "INFO",
          }),
        ],
      });
    }

    const updates = {};
    if (role) updates.dj_role_id = role.id;
    if (djOnly !== undefined) updates.dj_only = djOnly;

    if (Object.keys(updates).length === 0) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "🎧 DJ Configuration",
            description: `**Current DJ Role:** ${current.dj_role_id ? `<@&${current.dj_role_id}>` : "*None (everyone can control)*"}\n**DJ-Only Mode:** \`${current.dj_only ? "ENABLED" : "DISABLED"}\``,
            level: "PRIMARY",
          }),
        ],
      });
    }

    const updated = await updateMusicSettings(guild.id, updates);

    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "🎧 DJ Configuration Updated",
          description: `**DJ Role:** ${updated.dj_role_id ? `<@&${updated.dj_role_id}>` : "*None*"}\n**DJ-Only Mode:** \`${updated.dj_only ? "ENABLED" : "DISABLED"}\``,
          level: "SUCCESS",
        }),
      ],
    });
  },
});
