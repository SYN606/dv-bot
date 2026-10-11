import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed, COLORS } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import {
  createPlaylist,
  getPlaylist,
  getUserPlaylists,
  getGuildPublicPlaylists,
  deletePlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
} from "../../db/helpers/music.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("playlist")
  .setDescription("Create, manage, and play custom playlists")
  .addSubcommand((sub) =>
    sub
      .setName("create")
      .setDescription("Create a new empty custom playlist")
      .addStringOption((opt) => opt.setName("name").setDescription("Playlist name").setRequired(true))
      .addStringOption((opt) => opt.setName("description").setDescription("Optional description").setRequired(false))
      .addBooleanOption((opt) => opt.setName("private").setDescription("Keep private only to you (default: false)").setRequired(false))
  )
  .addSubcommand((sub) =>
    sub
      .setName("save")
      .setDescription("Save the current queue into a new playlist")
      .addStringOption((opt) => opt.setName("name").setDescription("Name for the new playlist").setRequired(true))
      .addBooleanOption((opt) => opt.setName("private").setDescription("Keep private to you").setRequired(false))
  )
  .addSubcommand((sub) =>
    sub
      .setName("load")
      .setDescription("Load and play a saved playlist")
      .addStringOption((opt) => opt.setName("name").setDescription("Name or ID of the playlist").setRequired(true))
  )
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Add a song to one of your playlists")
      .addStringOption((opt) => opt.setName("playlist").setDescription("Name or ID of your playlist").setRequired(true))
      .addStringOption((opt) => opt.setName("query").setDescription("Song title or URL to add").setRequired(true))
  )
  .addSubcommand((sub) =>
    sub
      .setName("remove")
      .setDescription("Remove a song from your playlist")
      .addStringOption((opt) => opt.setName("playlist").setDescription("Name or ID of your playlist").setRequired(true))
      .addIntegerOption((opt) => opt.setName("position").setDescription("Track position number to remove").setMinValue(1).setRequired(true))
  )
  .addSubcommand((sub) =>
    sub
      .setName("delete")
      .setDescription("Delete one of your playlists")
      .addStringOption((opt) => opt.setName("name").setDescription("Name or ID of the playlist to delete").setRequired(true))
  )
  .addSubcommand((sub) =>
    sub.setName("list").setDescription("List all your playlists and public server playlists")
  );

async function findPlaylistByNameOrId(userId, guildId, search) {
  const query = search.trim().toLowerCase();
  const userPlaylists = await getUserPlaylists(userId, guildId);

  // Exact ID match or name match
  let found = userPlaylists.find((p) => p.id === search || p.name.toLowerCase() === query);
  if (found) return await getPlaylist(found.id, userId);

  // Search public playlists
  if (guildId) {
    const publicPlaylists = await getGuildPublicPlaylists(guildId);
    found = publicPlaylists.find((p) => p.id === search || p.name.toLowerCase() === query);
    if (found) return await getPlaylist(found.id, userId);
  }

  // Fuzzy prefix match
  found = userPlaylists.find((p) => p.name.toLowerCase().includes(query));
  if (found) return await getPlaylist(found.id, userId);

  return null;
}

export default createCommand({
  name: "playlist",
  description: "Create, manage, and play custom playlists",
  category: "Music",
  aliases: ["pl"],
  slashBuilder,

  async execute(ctx) {
    const { guild, member, user, channel } = ctx;
    if (!guild || !member) return;

    const sub = ctx.subcommand || ctx.options._subcommand || ctx.options._args?.[0];

    switch (sub) {
      case "create": {
        const name = ctx.options.name || ctx.options._args?.[1];
        if (!name) return await ctx.reply({ content: "Please provide a playlist name.", ephemeral: true });

        const description = ctx.options.description || "";
        const isPrivate = Boolean(ctx.options.private);

        const playlist = await createPlaylist({
          userId: user.id,
          guildId: guild.id,
          name,
          description,
          isPrivate,
        });

        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "✅ Playlist Created",
              description: `Created playlist **${playlist.name}**\nPrivacy: \`${isPrivate ? "Private (Only You)" : "Public (Server)"}\`\nID: \`${playlist.id}\``,
              level: "SUCCESS",
            }),
          ],
        });
      }

      case "save": {
        const name = ctx.options.name || ctx.options._args?.[1];
        if (!name) return await ctx.reply({ content: "Please provide a playlist name.", ephemeral: true });

        const player = ctx.client.music.getPlayer(guild.id);
        if (!player || (!player.currentTrack && player.queue.size === 0)) {
          return await ctx.reply({
            content: "There is no music playing or in the queue to save.",
            ephemeral: true,
          });
        }

        const tracksToSave = [];
        if (player.currentTrack) {
          tracksToSave.push({
            title: player.currentTrack.info.title,
            author: player.currentTrack.info.author,
            uri: player.currentTrack.info.uri,
            identifier: player.currentTrack.info.identifier,
            sourceName: player.currentTrack.info.sourceName,
            length: player.currentTrack.info.length,
            thumbnail: player.currentTrack.info.artworkUrl,
            track: player.currentTrack.track,
          });
        }
        for (const t of player.queue.tracks) {
          tracksToSave.push({
            title: t.info.title,
            author: t.info.author,
            uri: t.info.uri,
            identifier: t.info.identifier,
            sourceName: t.info.sourceName,
            length: t.info.length,
            thumbnail: t.info.artworkUrl,
            track: t.track,
          });
        }

        const isPrivate = Boolean(ctx.options.private);
        const saved = await createPlaylist({
          userId: user.id,
          guildId: guild.id,
          name,
          description: `Saved from queue in ${guild.name}`,
          isPrivate,
          tracks: tracksToSave,
        });

        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "💾 Queue Saved to Playlist",
              description: `Saved **${tracksToSave.length}** tracks to playlist [**${saved.name}**].`,
              level: "SUCCESS",
            }),
          ],
        });
      }

      case "load": {
        const query = ctx.options.name || ctx.options._args?.[1];
        if (!query) return await ctx.reply({ content: "Please provide a playlist name or ID.", ephemeral: true });

        const voiceChannel = member.voice?.channel;
        if (!voiceChannel) {
          return await ctx.reply({
            content: "You must be in a voice channel to load and play a playlist.",
            ephemeral: true,
          });
        }

        await ctx.defer();

        const playlist = await findPlaylistByNameOrId(user.id, guild.id, query);
        if (!playlist || !playlist.tracks || playlist.tracks.length === 0) {
          return await ctx.reply({
            content: `Playlist \`${query}\` was not found or has no tracks.`,
            ephemeral: true,
          });
        }

        let player = ctx.client.music.getPlayer(guild.id);
        if (!player) {
          player = await ctx.client.music.join({
            guildId: guild.id,
            voiceChannelId: voiceChannel.id,
            textChannelId: channel.id,
          });
        }

        // Resolve tracks from playlist
        let queuedCount = 0;
        for (const pt of playlist.tracks) {
          try {
            const res = await ctx.client.music.search(pt.uri || pt.title, user);
            if (res.tracks.length > 0) {
              player.queue.add(res.tracks[0]);
              queuedCount++;
            }
          } catch {}
        }

        if (queuedCount > 0 && !player.isPlaying && !player.isPaused) {
          await player.play();
        }

        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "🎶 Playlist Loaded",
              description: `Loaded **${queuedCount}** songs from playlist [**${playlist.name}**] into the queue.`,
              level: "SUCCESS",
            }),
          ],
        });
      }

      case "add": {
        const playlistQuery = ctx.options.playlist || ctx.options._args?.[1];
        const songQuery = ctx.options.query || ctx.options._args?.slice(2).join(" ");
        if (!playlistQuery || !songQuery) {
          return await ctx.reply({ content: "Usage: `/playlist add playlist:<name> query:<song>`", ephemeral: true });
        }

        await ctx.defer();

        const playlist = await findPlaylistByNameOrId(user.id, guild.id, playlistQuery);
        if (!playlist || String(playlist.user_id) !== String(user.id)) {
          return await ctx.reply({
            content: `Playlist \`${playlistQuery}\` not found or you are not its owner.`,
            ephemeral: true,
          });
        }

        const res = await ctx.client.music.search(songQuery, user);
        if (!res.tracks.length) {
          return await ctx.reply({ content: `No tracks found for: \`${songQuery}\``, ephemeral: true });
        }

        const track = res.tracks[0];
        await addTrackToPlaylist(playlist.id, user.id, {
          title: track.info.title,
          author: track.info.author,
          uri: track.info.uri,
          identifier: track.info.identifier,
          sourceName: track.info.sourceName,
          length: track.info.length,
          thumbnail: track.info.artworkUrl,
          track: track.track,
        });

        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "➕ Track Added to Playlist",
              description: `Added [**${track.info.title}**](${track.info.uri}) to playlist **${playlist.name}**.`,
              level: "SUCCESS",
            }),
          ],
        });
      }

      case "remove": {
        const playlistQuery = ctx.options.playlist || ctx.options._args?.[1];
        const pos = ctx.options.position || parseInt(ctx.options._args?.[2], 10);
        if (!playlistQuery || !pos) {
          return await ctx.reply({ content: "Usage: `/playlist remove playlist:<name> position:<number>`", ephemeral: true });
        }

        const playlist = await findPlaylistByNameOrId(user.id, guild.id, playlistQuery);
        if (!playlist || String(playlist.user_id) !== String(user.id)) {
          return await ctx.reply({
            content: `Playlist \`${playlistQuery}\` not found or you are not its owner.`,
            ephemeral: true,
          });
        }

        const ok = await removeTrackFromPlaylist(playlist.id, user.id, pos - 1);
        if (!ok) {
          return await ctx.reply({
            content: `Could not remove track at position #${pos}. Check playlist track count.`,
            ephemeral: true,
          });
        }

        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "🗑️ Track Removed",
              description: `Removed track #${pos} from playlist **${playlist.name}**.`,
              level: "INFO",
            }),
          ],
        });
      }

      case "delete": {
        const name = ctx.options.name || ctx.options._args?.[1];
        if (!name) return await ctx.reply({ content: "Please specify the playlist name to delete.", ephemeral: true });

        const playlist = await findPlaylistByNameOrId(user.id, guild.id, name);
        if (!playlist || String(playlist.user_id) !== String(user.id)) {
          return await ctx.reply({
            content: `Playlist \`${name}\` not found or you are not the owner.`,
            ephemeral: true,
          });
        }

        await deletePlaylist(playlist.id, user.id);
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "🗑️ Playlist Deleted",
              description: `Deleted playlist **${playlist.name}**.`,
              level: "INFO",
            }),
          ],
        });
      }

      case "list":
      default: {
        const userPlaylists = await getUserPlaylists(user.id, guild.id);
        const publicPlaylists = await getGuildPublicPlaylists(guild.id);

        const yourList = userPlaylists.length
          ? userPlaylists
              .map(
                (p) =>
                  `• **${p.name}** (\`${p.track_count || 0}\` tracks) — \`${p.is_private ? "Private" : "Public"}\` | ID: \`${p.id.slice(0, 8)}\``
              )
              .join("\n")
          : "*You have not created any playlists yet.*";

        const guildList = publicPlaylists.length
          ? publicPlaylists
              .filter((p) => p.user_id !== user.id)
              .slice(0, 10)
              .map(
                (p) =>
                  `• **${p.name}** (\`${p.track_count || 0}\` tracks) by <@${p.user_id}> | ID: \`${p.id.slice(0, 8)}\``
              )
              .join("\n")
          : "*No other public playlists in this server.*";

        const embed = makeEmbed({
          title: "📚 Saved Playlists",
          description: `**Your Playlists:**\n${yourList}\n\n**Server Public Playlists:**\n${guildList}`,
          level: "PRIMARY",
          color: COLORS.PRIMARY,
        });

        return await ctx.reply({ embeds: [embed] });
      }
    }
  },
});
