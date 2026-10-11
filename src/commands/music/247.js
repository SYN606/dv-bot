import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { getMusicSettings, updateMusicSettings } from "../../db/helpers/music.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("247")
  .setDescription("Toggle 24/7 mode (keeps bot in voice channel indefinitely)")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addBooleanOption((opt) => opt.setName("enabled").setDescription("Enable or disable 24/7 mode").setRequired(false));

export default createCommand({
  name: "247",
  description: "Toggle 24/7 voice channel stay",
  category: "Music",
  aliases: ["stay"],
  modOnly: true,
  requiredPermission: PermissionFlagsBits.ManageGuild,
  slashBuilder,

  async execute(ctx) {
    const { guild, member } = ctx;
    if (!guild) return;

    if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return await ctx.reply({
        content: "You need `Manage Server` permission to configure 24/7 mode.",
        ephemeral: true,
      });
    }

    const current = await getMusicSettings(guild.id);
    const explicit = ctx.options.enabled;
    const newState = explicit !== undefined ? explicit : !current.mode_247;

    const player = ctx.client.music.getPlayer(guild.id);
    const vcId = player?.voiceChannelId || member.voice?.channelId || current.voice_channel_id;

    await updateMusicSettings(guild.id, {
      mode_247: newState,
      voice_channel_id: newState ? vcId : current.voice_channel_id,
    });

    if (player) {
      player.mode247 = newState;
      if (newState) {
        player.clearIdleTimer();
      }
    }

    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "🕒 24/7 Mode Updated",
          description: `24/7 voice mode is now **${newState ? "ENABLED" : "DISABLED"}**.\n${newState ? "The bot will stay in the voice channel even when playback stops or no users are present." : "The bot will disconnect after the idle timeout when empty."}`,
          level: newState ? "SUCCESS" : "INFO",
        }),
      ],
    });
  },
});
