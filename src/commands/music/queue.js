import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed, COLORS } from "../../core/embeds.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("queue")
  .setDescription("View the current queue of upcoming songs")
  .addIntegerOption((opt) =>
    opt.setName("page").setDescription("Page number").setMinValue(1).setRequired(false)
  );

export default createCommand({
  name: "queue",
  description: "View upcoming tracks in the music queue",
  category: "Music",
  aliases: ["q"],
  usage: "[page]",
  slashBuilder,

  async execute(ctx) {
    const { guild } = ctx;
    if (!guild) return;

    const player = ctx.client.music.getPlayer(guild.id);
    if (!player || (!player.currentTrack && player.queue.size === 0)) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Queue is Empty",
            description: "No music is currently playing or queued.",
            level: "INFO",
          }),
        ],
        ephemeral: true,
      });
    }

    const requestedPage = ctx.options.page || parseInt(ctx.options._args?.[0], 10) || 1;
    const { page, totalPages, tracks } = player.queue.getPage(requestedPage, 10);

    const nowPlayingStr = player.currentTrack
      ? `**Now Playing:**\n[**${player.currentTrack.info.title}**](${player.currentTrack.info.uri}) (\`${player.formatTime(player.currentPosition)} / ${player.currentTrack.formattedDuration}\`) — <@${player.currentTrack.requester?.id || "Dashboard"}>\n\n`
      : "";

    let queueStr = "";
    if (tracks.length === 0) {
      queueStr = "*No upcoming tracks in queue.*";
    } else {
      const startIndex = (page - 1) * 10;
      queueStr = tracks
        .map(
          (t, i) =>
            `\`${startIndex + i + 1}.\` [**${t.info.title}**](${t.info.uri}) (\`${t.formattedDuration}\`) — <@${t.requester?.id || "Unknown"}>`
        )
        .join("\n");
    }

    const embed = makeEmbed({
      title: `🎵 Music Queue (Page ${page} of ${totalPages || 1})`,
      description: `${nowPlayingStr}**Upcoming Tracks (${player.queue.size}):**\n${queueStr}`,
      fields: [
        { name: "Total Queue Duration", value: player.queue.formattedTotalDuration, inline: true },
        { name: "Loop Mode", value: `\`${player.queue.loopMode.toUpperCase()}\``, inline: true },
        { name: "Autoplay", value: player.queue.autoplay ? "`ON`" : "`OFF`", inline: true },
      ],
      level: "PRIMARY",
      color: COLORS.PRIMARY,
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
