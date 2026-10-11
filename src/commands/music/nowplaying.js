import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed, COLORS } from "../../core/embeds.js";
import { createMusicControlComponents } from "../../music/MusicInteractionHandler.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("nowplaying")
  .setDescription("Show details, progress, and interactive controls for current track");

function createProgressBar(current, total, length = 18) {
  if (!total || total <= 0) return "🔘" + "▬".repeat(length);
  const progress = Math.min(Math.max(current / total, 0), 1);
  const progressChars = Math.round(length * progress);
  const bar =
    "▬".repeat(progressChars) +
    "🔘" +
    "▬".repeat(Math.max(length - progressChars, 0));
  return bar;
}

export default createCommand({
  name: "nowplaying",
  description: "Display currently playing song info and controls",
  category: "Music",
  aliases: ["np"],
  slashBuilder,

  async execute(ctx) {
    const { guild } = ctx;
    if (!guild) return;

    const player = ctx.client.music.getPlayer(guild.id);
    if (!player || !player.currentTrack) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Player Inactive",
            description: "No music is currently playing in this server.",
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    const track = player.currentTrack;
    const curPos = player.currentPosition;
    const totalPos = track.info.length;

    const bar = track.info.isStream
      ? "🔴 LIVE STREAM"
      : `${player.formatTime(curPos)} ${createProgressBar(curPos, totalPos)} ${player.formatTime(totalPos)}`;

    const embed = makeEmbed({
      title: "🎶 Now Playing",
      description: `[**${track.info.title}**](${track.info.uri})\nAuthor: \`${track.info.author}\`\n\n${bar}`,
      fields: [
        { name: "Requested By", value: track.requester ? `<@${track.requester.id}>` : "`Dashboard`", inline: true },
        { name: "Volume", value: `${player.volume}%`, inline: true },
        { name: "Loop Mode", value: `\`${player.queue.loopMode.toUpperCase()}\``, inline: true },
        { name: "Filter", value: `\`${player.currentFilter.toUpperCase()}\``, inline: true },
        { name: "Queue Size", value: `${player.queue.size} songs`, inline: true },
        { name: "24/7 Mode", value: player.mode247 ? "`ENABLED`" : "`DISABLED`", inline: true },
      ],
      thumbnail: track.info.artworkUrl,
      level: "PRIMARY",
      color: COLORS.PRIMARY,
    });

    const components = createMusicControlComponents(guild.id, player.isPaused, player.queue.loopMode);

    return await ctx.reply({
      embeds: [embed],
      components,
    });
  },
});
