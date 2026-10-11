import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed, COLORS } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { MusicPermissionService } from "../../music/MusicPermissionService.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("play")
  .setDescription("Play a song or playlist from URL or search query")
  .addStringOption((opt) =>
    opt
      .setName("query")
      .setDescription("The song name, artist, YouTube, Spotify, or SoundCloud URL")
      .setRequired(true)
  )
  .addStringOption((opt) =>
    opt
      .setName("source")
      .setDescription("Preferred search engine for non-URL queries")
      .setRequired(false)
      .addChoices(
        { name: "YouTube", value: "ytsearch" },
        { name: "YouTube Music", value: "ytmsearch" },
        { name: "SoundCloud", value: "scsearch" }
      )
  );

export default createCommand({
  name: "play",
  description: "Play a song or playlist from URL or search query",
  category: "Music",
  aliases: ["p"],
  usage: "<query or URL>",
  examples: [
    "/play query:Bohemian Rhapsody",
    "/play query:https://www.youtube.com/watch?v=fJ9rUzIMcZQ",
  ],
  slashBuilder,

  async execute(ctx) {
    const { guild, member, channel } = ctx;
    if (!guild || !member) return;

    const voiceChannel = member.voice?.channel;
    if (!voiceChannel) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Voice Channel Required",
            description: `${EMOJIS.get("warning") || "⚠️"} You must be in a voice channel to play music.`,
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    const query = ctx.options.query || ctx.options._args?.join(" ");
    if (!query) {
      return await ctx.reply({
        content: "Please provide a song title or URL to play.",
        ephemeral: true,
      });
    }

    const source = ctx.options.source || "ytsearch";

    await ctx.defer();

    try {
      // 1. Get or create player
      let player = ctx.client.music.getPlayer(guild.id);

      if (player) {
        const perm = await MusicPermissionService.canControlMusic(member, player);
        if (!perm.allowed) {
          return await ctx.reply({
            embeds: [
              makeEmbed({
                title: "Voice Channel Mismatch",
                description: `${EMOJIS.get("fail") || "❌"} ${perm.reason}`,
                level: "ERROR",
              }),
            ],
            ephemeral: true,
          });
        }
      } else {
        player = await ctx.client.music.join({
          guildId: guild.id,
          voiceChannelId: voiceChannel.id,
          textChannelId: channel.id,
        });
      }

      // Update text channel to where play was requested
      player.textChannelId = channel.id;

      // 2. Search query
      const result = await ctx.client.music.search(query, ctx.user, source);

      if (result.loadType === "empty" || !result.tracks.length) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "No Results Found",
              description: `Could not find any tracks matching: \`${query}\``,
              level: "WARNING",
            }),
          ],
        });
      }

      if (result.loadType === "playlist") {
        const added = player.queue.addMany(result.tracks);
        if (!player.isPlaying && !player.isPaused) {
          await player.play();
        }

        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "🎶 Playlist Added to Queue",
              description: `Queued **${added}** tracks from playlist [**${result.playlistName}**](${query})`,
              fields: [
                { name: "Total Duration", value: player.queue.formattedTotalDuration, inline: true },
                { name: "Queue Position", value: `#${player.queue.size - added + 1}`, inline: true },
              ],
              level: "SUCCESS",
              color: COLORS.SUCCESS,
            }),
          ],
        });
      }

      // Single track or top search result
      const track = result.tracks[0];
      const position = player.queue.add(track);

      if (!player.isPlaying && !player.isPaused) {
        await player.play();
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "🎶 Now Playing",
              description: `[**${track.info.title}**](${track.info.uri})\nAuthor: \`${track.info.author}\` | Length: \`${track.formattedDuration}\``,
              thumbnail: track.info.artworkUrl,
              level: "PRIMARY",
              color: COLORS.PRIMARY,
            }),
          ],
        });
      }

      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "🎵 Track Queued",
            description: `[**${track.info.title}**](${track.info.uri})\nAuthor: \`${track.info.author}\``,
            fields: [
              { name: "Position in Queue", value: `#${position}`, inline: true },
              { name: "Duration", value: track.formattedDuration, inline: true },
            ],
            thumbnail: track.info.artworkUrl,
            level: "INFO",
            color: COLORS.INFO,
          }),
        ],
      });
    } catch (err) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Playback Error",
            description: `${EMOJIS.get("fail") || "❌"} ${err.message || "Failed to load track."}`,
            level: "ERROR",
          }),
        ],
      });
    }
  },
});
