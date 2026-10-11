import { PermissionFlagsBits, SlashCommandBuilder, ChannelType } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed, COLORS } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { getMusicSettings, updateMusicSettings } from "../../db/helpers/music.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("musicsettings")
  .setDescription("View and configure server-wide music settings")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addIntegerOption((opt) =>
    opt.setName("default_volume").setDescription("Default playback volume (1-150)").setMinValue(1).setMaxValue(150).setRequired(false)
  )
  .addIntegerOption((opt) =>
    opt.setName("vote_skip_threshold").setDescription("Percentage of listeners needed to skip (10-100)").setMinValue(10).setMaxValue(100).setRequired(false)
  )
  .addBooleanOption((opt) =>
    opt.setName("vote_skip").setDescription("Enable or disable vote skipping requirement").setRequired(false)
  )
  .addChannelOption((opt) =>
    opt.setName("voice_channel").setDescription("Default voice channel for bot").addChannelTypes(ChannelType.GuildVoice).setRequired(false)
  )
  .addChannelOption((opt) =>
    opt.setName("text_channel").setDescription("Default channel for now-playing messages").addChannelTypes(ChannelType.GuildText).setRequired(false)
  );

export default createCommand({
  name: "musicsettings",
  description: "View and edit guild music settings",
  category: "Music",
  aliases: ["msettings"],
  modOnly: true,
  requiredPermission: PermissionFlagsBits.ManageGuild,
  slashBuilder,

  async execute(ctx) {
    const { guild, member } = ctx;
    if (!guild) return;

    if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return await ctx.reply({
        content: "You need `Manage Server` permission to configure music settings.",
        ephemeral: true,
      });
    }

    const updates = {};
    if (ctx.options.default_volume !== undefined) updates.default_volume = ctx.options.default_volume;
    if (ctx.options.vote_skip_threshold !== undefined) updates.vote_skip_threshold = ctx.options.vote_skip_threshold;
    if (ctx.options.vote_skip !== undefined) updates.vote_skip = ctx.options.vote_skip;
    if (ctx.options.voice_channel) updates.voice_channel_id = ctx.options.voice_channel.id;
    if (ctx.options.text_channel) updates.text_channel_id = ctx.options.text_channel.id;

    let settings = await getMusicSettings(guild.id);

    if (Object.keys(updates).length > 0) {
      settings = await updateMusicSettings(guild.id, updates);
    }

    const embed = makeEmbed({
      title: `⚙️ Music Configuration — ${guild.name}`,
      description: "Here are the current audio and player preferences for this server:",
      fields: [
        { name: "Music Enabled", value: settings.enabled ? "✅ Yes" : "❌ No", inline: true },
        { name: "24/7 Mode", value: settings.mode_247 ? "✅ Enabled" : "❌ Disabled", inline: true },
        { name: "Default Volume", value: `${settings.default_volume}% (Max: ${settings.max_volume}%)`, inline: true },
        { name: "DJ Role", value: settings.dj_role_id ? `<@&${settings.dj_role_id}>` : "*None (Public)*", inline: true },
        { name: "DJ Only Mode", value: settings.dj_only ? "🔒 Restricted" : "🔓 Open", inline: true },
        { name: "Vote Skip", value: settings.vote_skip ? `✅ Required (${settings.vote_skip_threshold}%)` : "❌ Off (Anyone can skip)", inline: true },
        { name: "Default Voice Channel", value: settings.voice_channel_id ? `<#${settings.voice_channel_id}>` : "*None*", inline: true },
        { name: "Default Text Channel", value: settings.text_channel_id ? `<#${settings.text_channel_id}>` : "*Current Channel*", inline: true },
        { name: "Autoplay Default", value: settings.autoplay ? "✅ On" : "❌ Off", inline: true },
      ],
      level: Object.keys(updates).length > 0 ? "SUCCESS" : "PRIMARY",
      color: Object.keys(updates).length > 0 ? COLORS.SUCCESS : COLORS.PRIMARY,
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
