import { Hono } from "hono";
import {
  getMusicSettings,
  updateMusicSettings,
  getGuildMusicHistory,
  getUserPlaylists,
  getGuildPublicPlaylists,
  createPlaylist,
  deletePlaylist,
  getPlaylist,
} from "../../db/helpers/music.js";
import { apiCache } from "./cache.js";
import { logger } from "../../utils/logger.js";

export const musicRoutes = new Hono();

// Helper to get client and player
function getClientAndPlayer(c) {
  const client = c.get("discordClient");
  const guildId = c.req.param("guildId");
  const player = client?.music?.getPlayer(guildId) || null;
  return { client, guildId, player };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Live Player State & Status
// ─────────────────────────────────────────────────────────────────────────────

musicRoutes.get("/guilds/:guildId/music/player", async (c) => {
  const { client, guildId, player } = getClientAndPlayer(c);
  const isLavalinkConnected = Boolean(client?.music?.hasAvailableNode);

  if (!player) {
    const settings = await getMusicSettings(guildId);
    return c.json({
      connected: false,
      isLavalinkConnected,
      settings,
      state: "idle",
      isPlaying: false,
      isPaused: false,
      currentTrack: null,
      position: 0,
      volume: settings.default_volume || 80,
      filter: "clear",
      loopMode: "off",
      autoplay: Boolean(settings.autoplay),
      mode247: Boolean(settings.mode_247),
      queueSize: 0,
      totalDuration: 0,
      voiceChannelId: null,
      voiceChannelName: null,
    });
  }

  const voiceChannel = player.guild?.channels?.cache?.get(player.voiceChannelId);

  return c.json({
    connected: true,
    isLavalinkConnected,
    guildId,
    state: player.state,
    isPlaying: player.isPlaying,
    isPaused: player.isPaused,
    currentTrack: player.currentTrack,
    position: player.currentPosition,
    volume: player.volume,
    filter: player.currentFilter,
    loopMode: player.queue.loopMode,
    autoplay: player.queue.autoplay,
    mode247: player.mode247,
    queueSize: player.queue.size,
    totalDuration: player.queue.totalDuration,
    formattedTotalDuration: player.queue.formattedTotalDuration,
    voiceChannelId: player.voiceChannelId,
    voiceChannelName: voiceChannel ? voiceChannel.name : null,
    textChannelId: player.textChannelId,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Playback Control Endpoints
// ─────────────────────────────────────────────────────────────────────────────

// Play or Queue track from dashboard
musicRoutes.post("/guilds/:guildId/music/player/play", async (c) => {
  const { client, guildId } = getClientAndPlayer(c);
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  const query = body.query?.trim();
  const source = body.source || "ytsearch";

  if (!query) {
    return c.json({ error: "Query or URL is required." }, 400);
  }

  if (!client?.music) {
    return c.json({ error: "Music subsystem not available." }, 503);
  }

  let player = client.music.getPlayer(guildId);

  if (!player) {
    // If not in VC, try to find a voice channel to join
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return c.json({ error: "Guild not found." }, 404);

    const settings = await getMusicSettings(guildId);
    let targetVcId = body.voiceChannelId || settings.voice_channel_id;

    if (!targetVcId) {
      // Find first available voice channel
      const firstVc = guild.channels.cache.find(
        (ch) => ch.type === 2 && ch.members.size > 0
      ) || guild.channels.cache.find((ch) => ch.type === 2);
      if (firstVc) targetVcId = firstVc.id;
    }

    if (!targetVcId) {
      return c.json({ error: "No voice channel specified or found in server." }, 400);
    }

    try {
      player = await client.music.join({
        guildId,
        voiceChannelId: targetVcId,
        textChannelId: settings.text_channel_id || null,
      });
    } catch (err) {
      return c.json({ error: `Failed connecting to voice: ${err.message}` }, 500);
    }
  }

  try {
    const requester = user ? { id: user.id, username: user.username } : null;
    const res = await client.music.search(query, requester, source);

    if (res.loadType === "empty" || !res.tracks.length) {
      return c.json({ error: "No tracks found matching query." }, 404);
    }

    if (res.loadType === "playlist") {
      const added = player.queue.addMany(res.tracks);
      if (!player.isPlaying && !player.isPaused) {
        await player.play();
      }
      return c.json({
        success: true,
        type: "playlist",
        playlistName: res.playlistName,
        tracksAdded: added,
      });
    }

    const track = res.tracks[0];
    const position = player.queue.add(track);

    if (!player.isPlaying && !player.isPaused) {
      await player.play();
    }

    return c.json({
      success: true,
      type: "track",
      track,
      queuePosition: position,
    });
  } catch (err) {
    logger.error("[API MUSIC PLAY ERROR]:", err);
    return c.json({ error: err.message || "Failed to search/play track." }, 500);
  }
});

// Pause playback
musicRoutes.post("/guilds/:guildId/music/player/pause", async (c) => {
  const { player } = getClientAndPlayer(c);
  if (!player || !player.isPlaying) {
    return c.json({ error: "Player is not playing." }, 400);
  }
  await player.pause();
  return c.json({ success: true, isPaused: true });
});

// Resume playback
musicRoutes.post("/guilds/:guildId/music/player/resume", async (c) => {
  const { player } = getClientAndPlayer(c);
  if (!player || !player.isPaused) {
    return c.json({ error: "Player is not paused." }, 400);
  }
  await player.resume();
  return c.json({ success: true, isPaused: false });
});

// Skip track
musicRoutes.post("/guilds/:guildId/music/player/skip", async (c) => {
  const { player } = getClientAndPlayer(c);
  if (!player || (!player.isPlaying && !player.isPaused)) {
    return c.json({ error: "No active track to skip." }, 400);
  }
  const result = await player.skip(null, true); // force skip from dashboard
  return c.json({ success: true, skipped: result.skipped });
});

// Previous track
musicRoutes.post("/guilds/:guildId/music/player/previous", async (c) => {
  const { player } = getClientAndPlayer(c);
  if (!player) return c.json({ error: "No active player." }, 400);

  const ok = await player.previous();
  if (!ok) return c.json({ error: "No previous track in history." }, 404);

  return c.json({ success: true, currentTrack: player.currentTrack });
});

// Stop player and clear queue
musicRoutes.post("/guilds/:guildId/music/player/stop", async (c) => {
  const { player } = getClientAndPlayer(c);
  if (!player) return c.json({ error: "No active player." }, 400);

  await player.stop();
  return c.json({ success: true, message: "Playback stopped." });
});

// Seek position
musicRoutes.post("/guilds/:guildId/music/player/seek", async (c) => {
  const { player } = getClientAndPlayer(c);
  if (!player || !player.currentTrack) {
    return c.json({ error: "No active track to seek." }, 400);
  }

  const body = await c.req.json().catch(() => ({}));
  const ms = Number(body.position);
  if (isNaN(ms) || ms < 0) {
    return c.json({ error: "Invalid position timestamp." }, 400);
  }

  await player.seek(ms);
  return c.json({ success: true, position: ms });
});

// Volume control
musicRoutes.post("/guilds/:guildId/music/player/volume", async (c) => {
  const { player } = getClientAndPlayer(c);
  if (!player) return c.json({ error: "No active player." }, 400);

  const body = await c.req.json().catch(() => ({}));
  const vol = Number(body.volume);
  if (isNaN(vol) || vol < 0 || vol > 200) {
    return c.json({ error: "Volume must be between 0 and 200." }, 400);
  }

  await player.setVolume(vol);
  return c.json({ success: true, volume: player.volume });
});

// Loop mode
musicRoutes.post("/guilds/:guildId/music/player/loop", async (c) => {
  const { player } = getClientAndPlayer(c);
  if (!player) return c.json({ error: "No active player." }, 400);

  const body = await c.req.json().catch(() => ({}));
  const mode = String(body.mode).toLowerCase();
  if (!["off", "track", "queue"].includes(mode)) {
    return c.json({ error: "Loop mode must be off, track, or queue." }, 400);
  }

  player.queue.setLoopMode(mode);
  await player.updateNowPlayingMessage();
  return c.json({ success: true, loopMode: mode });
});

// Filter preset
musicRoutes.post("/guilds/:guildId/music/player/filter", async (c) => {
  const { player } = getClientAndPlayer(c);
  if (!player) return c.json({ error: "No active player." }, 400);

  const body = await c.req.json().catch(() => ({}));
  const filter = String(body.filter || "clear");

  await player.setFilter(filter);
  return c.json({ success: true, filter: player.currentFilter });
});

// Shuffle queue
musicRoutes.post("/guilds/:guildId/music/player/shuffle", async (c) => {
  const { player } = getClientAndPlayer(c);
  if (!player) return c.json({ error: "No active player." }, 400);

  player.queue.shuffle();
  return c.json({ success: true, queueSize: player.queue.size });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Queue Management Endpoints
// ─────────────────────────────────────────────────────────────────────────────

// Get full queue
musicRoutes.get("/guilds/:guildId/music/queue", async (c) => {
  const { player } = getClientAndPlayer(c);
  if (!player) {
    return c.json({
      tracks: [],
      currentTrack: null,
      size: 0,
      totalDuration: 0,
      formattedTotalDuration: "00:00",
    });
  }

  return c.json({
    tracks: player.queue.tracks,
    currentTrack: player.currentTrack,
    size: player.queue.size,
    totalDuration: player.queue.totalDuration,
    formattedTotalDuration: player.queue.formattedTotalDuration,
    loopMode: player.queue.loopMode,
    autoplay: player.queue.autoplay,
  });
});

// Remove track at index
musicRoutes.delete("/guilds/:guildId/music/queue/:index", async (c) => {
  const { player } = getClientAndPlayer(c);
  if (!player) return c.json({ error: "No active player." }, 400);

  const index = parseInt(c.req.param("index"), 10);
  if (isNaN(index) || index < 0 || index >= player.queue.size) {
    return c.json({ error: "Invalid queue track index." }, 400);
  }

  const removed = player.queue.remove(index);
  return c.json({ success: true, removedTrack: removed });
});

// Move track position
musicRoutes.post("/guilds/:guildId/music/queue/move", async (c) => {
  const { player } = getClientAndPlayer(c);
  if (!player) return c.json({ error: "No active player." }, 400);

  const body = await c.req.json().catch(() => ({}));
  const from = parseInt(body.from, 10);
  const to = parseInt(body.to, 10);

  const moved = player.queue.move(from, to);
  if (!moved) return c.json({ error: "Invalid move indices." }, 400);

  return c.json({ success: true, movedTrack: moved });
});

// Clear queue
musicRoutes.delete("/guilds/:guildId/music/queue", async (c) => {
  const { player } = getClientAndPlayer(c);
  if (!player) return c.json({ error: "No active player." }, 400);

  player.queue.clear();
  return c.json({ success: true, message: "Queue cleared." });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Guild Music Settings Endpoints
// ─────────────────────────────────────────────────────────────────────────────

musicRoutes.get("/guilds/:guildId/music/settings", async (c) => {
  const guildId = c.req.param("guildId");
  const cacheKey = `guild:${guildId}:music_settings`;
  const cached = apiCache.get(cacheKey);
  if (cached) return c.json(cached);

  const settings = await getMusicSettings(guildId);
  apiCache.set(cacheKey, settings, 15000);
  return c.json(settings);
});

musicRoutes.patch("/guilds/:guildId/music/settings", async (c) => {
  const { client, guildId, player } = getClientAndPlayer(c);
  const body = await c.req.json().catch(() => ({}));

  const updated = await updateMusicSettings(guildId, body);
  apiCache.delete(`guild:${guildId}:music_settings`);

  // Propagate changes to live player if active
  if (player) {
    if (body.mode_247 !== undefined) player.mode247 = Boolean(body.mode_247);
    if (body.autoplay !== undefined) player.queue.setAutoplay(Boolean(body.autoplay));
  }

  return c.json(updated);
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Playback History
// ─────────────────────────────────────────────────────────────────────────────

musicRoutes.get("/guilds/:guildId/music/history", async (c) => {
  const guildId = c.req.param("guildId");
  const history = await getGuildMusicHistory(guildId, 25);
  return c.json(history);
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Playlists
// ─────────────────────────────────────────────────────────────────────────────

musicRoutes.get("/guilds/:guildId/music/playlists", async (c) => {
  const guildId = c.req.param("guildId");
  const user = c.get("user");

  const [userPlaylists, publicPlaylists] = await Promise.all([
    user ? getUserPlaylists(user.id, guildId) : [],
    getGuildPublicPlaylists(guildId),
  ]);

  return c.json({
    userPlaylists,
    publicPlaylists,
  });
});

musicRoutes.post("/guilds/:guildId/music/playlists", async (c) => {
  const guildId = c.req.param("guildId");
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));

  if (!body.name) return c.json({ error: "Playlist name is required." }, 400);

  const playlist = await createPlaylist({
    userId: user?.id || "dashboard_user",
    guildId,
    name: body.name,
    description: body.description || "",
    isPrivate: Boolean(body.isPrivate),
    tracks: body.tracks || [],
  });

  return c.json(playlist);
});

musicRoutes.delete("/guilds/:guildId/music/playlists/:playlistId", async (c) => {
  const playlistId = c.req.param("playlistId");
  const user = c.get("user");

  const deleted = await deletePlaylist(playlistId, user?.id || "dashboard_user");
  if (!deleted) return c.json({ error: "Could not delete playlist." }, 404);

  return c.json({ success: true });
});

musicRoutes.post("/guilds/:guildId/music/playlists/:playlistId/load", async (c) => {
  const { client, guildId } = getClientAndPlayer(c);
  const playlistId = c.req.param("playlistId");
  const user = c.get("user");

  const playlist = await getPlaylist(playlistId, user?.id);
  if (!playlist || !playlist.tracks.length) {
    return c.json({ error: "Playlist not found or is empty." }, 404);
  }

  let player = client.music.getPlayer(guildId);
  if (!player) {
    const settings = await getMusicSettings(guildId);
    const guild = client.guilds.cache.get(guildId);
    const targetVc =
      guild?.channels?.cache?.get(settings.voice_channel_id) ||
      guild?.channels?.cache?.find((ch) => ch.type === 2);

    if (!targetVc) {
      return c.json({ error: "No voice channel available to join." }, 400);
    }

    player = await client.music.join({
      guildId,
      voiceChannelId: targetVc.id,
      textChannelId: settings.text_channel_id,
    });
  }

  let added = 0;
  for (const pt of playlist.tracks) {
    try {
      const res = await client.music.search(pt.uri || pt.title, user);
      if (res.tracks.length > 0) {
        player.queue.add(res.tracks[0]);
        added++;
      }
    } catch {}
  }

  if (added > 0 && !player.isPlaying && !player.isPaused) {
    await player.play();
  }

  return c.json({ success: true, tracksLoaded: added });
});
