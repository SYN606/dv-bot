import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { MusicPermissionService } from "../../music/MusicPermissionService.js";
import { CONFIG } from "../../config.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("volume")
  .setDescription("View or set playback volume (0 - 200%)")
  .addIntegerOption((opt) =>
    opt
      .setName("level")
      .setDescription("Volume percentage (0 - 200)")
      .setMinValue(0)
      .setMaxValue(200)
      .setRequired(false)
  );

export default createCommand({
  name: "volume",
  description: "View or change player volume",
  category: "Music",
  aliases: ["vol", "v"],
  usage: "[0-200]",
  slashBuilder,

  async execute(ctx) {
    const { guild, member } = ctx;
    if (!guild || !member) return;

    const player = ctx.client.music.getPlayer(guild.id);
    if (!player) {
      return await ctx.reply({
        content: "No active music player in this server.",
        ephemeral: true,
      });
    }

    const level = ctx.options.level ?? (ctx.options._args?.[0] ? parseInt(ctx.options._args[0], 10) : null);

    if (level === null || isNaN(level)) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "🔊 Current Volume",
            description: `The current playback volume is **${player.volume}%**.`,
            level: "INFO",
          }),
        ],
      });
    }

    const perm = await MusicPermissionService.canControlMusic(member, player);
    if (!perm.allowed) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Permission Denied",
            description: `${EMOJIS.get("fail") || "❌"} ${perm.reason}`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    const clamped = Math.max(0, Math.min(CONFIG.MUSIC_MAX_VOLUME, level));
    await player.setVolume(clamped);

    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "🔊 Volume Changed",
          description: `Volume set to **${clamped}%** by <@${member.id}>.`,
          level: "SUCCESS",
        }),
      ],
    });
  },
});
