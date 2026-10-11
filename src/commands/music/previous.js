import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { MusicPermissionService } from "../../music/MusicPermissionService.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("previous")
  .setDescription("Play the previous track from history");

export default createCommand({
  name: "previous",
  description: "Play the previous track from history",
  category: "Music",
  aliases: ["prev"],
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

    const ok = await player.previous();
    if (!ok) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "No Previous Track",
            description: "There are no previous tracks in playback history.",
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "⏮️ Playing Previous Track",
          description: `Now playing [**${player.currentTrack.info.title}**](${player.currentTrack.info.uri})`,
          level: "INFO",
        }),
      ],
    });
  },
});
