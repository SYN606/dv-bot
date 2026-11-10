import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed, COLORS } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { MusicPermissionService } from "../../music/MusicPermissionService.js";
import { PlayerState } from "../../music/GuildPlayer.js";

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
    "dvplay Bohemian Rhapsody",
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
      let player = ctx.client.music.getPlayer(guild.id);

      const perm = await MusicPermissionService.checkPermission(member, player, "play");
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

      if (!player) {
        player = await ctx.client.music.join({
          guildId: guild.id,
          voiceChannelId: voiceChannel.id,
          textChannelId: channel?.id || null,
        });
      }

      if (channel) {
        player.textChannelId = channel.id;
      }

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

      const isAlreadyActive = Boolean(
        player.currentTrack !== null ||
        player.state === PlayerState.PLAYING ||
        player.state === PlayerState.BUFFERING ||
        player.state === PlayerState.PAUSED
      );

      if (result.loadType === "playlist") {
        const added = player.queue.addMany(result.tracks, ctx.user);
        if (!isAlreadyActive) {
          const next = player.queue.next();
          if (next) await player.playTrack(next);
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

      const track = result.tracks[0];
      if (!track) {
        return await ctx.reply({ content: "Failed to load track data.", ephemeral: true });
      }

      const position = player.queue.add(track, ctx.user);

      if (!isAlreadyActive) {
        const next = player.queue.next();
        if (next) await player.playTrack(next);

        // If executed via slash interaction, silently dismiss the deferral so only the official Now Playing card appears
        if (ctx.isInteraction && ctx.interaction?.deferred) {
          await ctx.interaction.deleteReply().catch(() => {});
        }
        return;
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
    } catch (err: any) {
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
