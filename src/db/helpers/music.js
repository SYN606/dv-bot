import crypto from "node:crypto";
import {
  MusicSettings,
  MusicPlaylist,
  MusicPlaylistTrack,
  MusicHistory,
} from "../models/index.js";
import { ensureGuild } from "./common.js";
import { CONFIG } from "../../config.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Guild Music Settings
// ─────────────────────────────────────────────────────────────────────────────

export async function getMusicSettings(guildId) {
  const gId = String(guildId);
  await ensureGuild(gId);

  let record = await MusicSettings.findOne({
    where: { guild_id: gId },
  });

  if (!record) {
    record = await MusicSettings.create({
      guild_id: gId,
      enabled: 1,
      dj_role_id: null,
      dj_only: 0,
      default_volume: CONFIG.MUSIC_DEFAULT_VOLUME,
      max_volume: CONFIG.MUSIC_MAX_VOLUME,
      mode_247: CONFIG.MUSIC_DEFAULT_247 ? 1 : 0,
      voice_channel_id: null,
      text_channel_id: null,
      autoplay: 0,
      default_loop: "off",
      vote_skip: 0,
      vote_skip_threshold: 50,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  const raw = typeof record.toJSON === "function" ? record.toJSON() : { ...record };
  return {
    ...raw,
    enabled: Boolean(raw.enabled),
    dj_only: Boolean(raw.dj_only),
    mode_247: Boolean(raw.mode_247),
    autoplay: Boolean(raw.autoplay),
    vote_skip: Boolean(raw.vote_skip),
    default_volume: Number(raw.default_volume) || 80,
    max_volume: Number(raw.max_volume) || 150,
    vote_skip_threshold: Number(raw.vote_skip_threshold) || 50,
  };
}

export async function updateMusicSettings(guildId, updates = {}) {
  const gId = String(guildId);
  await ensureGuild(gId);

  let record = await MusicSettings.findOne({
    where: { guild_id: gId },
  });

  const payload = {
    updated_at: new Date().toISOString(),
  };

  if (updates.enabled !== undefined) payload.enabled = updates.enabled ? 1 : 0;
  if (updates.dj_role_id !== undefined) payload.dj_role_id = updates.dj_role_id ? String(updates.dj_role_id) : null;
  if (updates.dj_only !== undefined) payload.dj_only = updates.dj_only ? 1 : 0;
  if (updates.default_volume !== undefined) {
    payload.default_volume = Math.min(Math.max(1, Number(updates.default_volume) || 80), 150);
  }
  if (updates.max_volume !== undefined) {
    payload.max_volume = Math.min(Math.max(50, Number(updates.max_volume) || 150), 200);
  }
  if (updates.mode_247 !== undefined) payload.mode_247 = updates.mode_247 ? 1 : 0;
  if (updates.voice_channel_id !== undefined) {
    payload.voice_channel_id = updates.voice_channel_id ? String(updates.voice_channel_id) : null;
  }
  if (updates.text_channel_id !== undefined) {
    payload.text_channel_id = updates.text_channel_id ? String(updates.text_channel_id) : null;
  }
  if (updates.autoplay !== undefined) payload.autoplay = updates.autoplay ? 1 : 0;
  if (updates.default_loop !== undefined) {
    payload.default_loop = ["off", "track", "queue"].includes(updates.default_loop)
      ? updates.default_loop
      : "off";
  }
  if (updates.vote_skip !== undefined) payload.vote_skip = updates.vote_skip ? 1 : 0;
  if (updates.vote_skip_threshold !== undefined) {
    payload.vote_skip_threshold = Math.min(
      Math.max(10, Number(updates.vote_skip_threshold) || 50),
      100
    );
  }

  if (record) {
    if (typeof record.update === "function") {
      await record.update(payload);
    } else {
      Object.assign(record, payload);
      await record.save?.();
    }
  } else {
    payload.guild_id = gId;
    payload.created_at = new Date().toISOString();
    record = await MusicSettings.create(payload);
  }

  return getMusicSettings(gId);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Playlists Management
// ─────────────────────────────────────────────────────────────────────────────

export async function createPlaylist({
  userId,
  guildId = null,
  name,
  description = "",
  isPrivate = false,
  tracks = [],
}) {
  const uId = String(userId);
  const pId = crypto.randomUUID();

  const playlistRecord = await MusicPlaylist.create({
    id: pId,
    user_id: uId,
    guild_id: guildId ? String(guildId) : null,
    name: String(name).slice(0, 100).trim(),
    description: String(description || "").slice(0, 500).trim(),
    is_private: isPrivate ? 1 : 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (Array.isArray(tracks) && tracks.length > 0) {
    let pos = 0;
    for (const track of tracks) {
      if (!track || !track.uri) continue;
      await MusicPlaylistTrack.create({
        playlist_id: pId,
        position: pos++,
        title: String(track.title || "Unknown Title").slice(0, 300),
        author: String(track.author || "Unknown Artist").slice(0, 200),
        uri: String(track.uri).slice(0, 1000),
        identifier: String(track.identifier || "").slice(0, 255),
        source_name: String(track.sourceName || track.source_name || "unknown").slice(0, 50),
        duration: Number(track.length || track.duration) || 0,
        thumbnail: track.thumbnail ? String(track.thumbnail).slice(0, 1000) : null,
        track_data: String(track.track || track.track_data || ""),
        created_at: new Date().toISOString(),
      });
    }
  }

  return getPlaylist(pId, uId);
}

export async function getPlaylist(playlistId, requestingUserId = null) {
  const pId = String(playlistId);
  const playlist = await MusicPlaylist.findOne({
    where: { id: pId },
  });

  if (!playlist) return null;

  const raw = typeof playlist.toJSON === "function" ? playlist.toJSON() : { ...playlist };

  // Access check: private playlists can only be viewed by owner
  if (raw.is_private && requestingUserId && String(raw.user_id) !== String(requestingUserId)) {
    return null;
  }

  const trackRows = await MusicPlaylistTrack.findAll({
    where: { playlist_id: pId },
    order: [["position", "ASC"]],
  });

  const tracks = trackRows.map((t) => (typeof t.toJSON === "function" ? t.toJSON() : { ...t }));

  return {
    ...raw,
    is_private: Boolean(raw.is_private),
    tracks,
    track_count: tracks.length,
    total_duration: tracks.reduce((acc, t) => acc + (Number(t.duration) || 0), 0),
  };
}

export async function getUserPlaylists(userId, guildId = null) {
  const uId = String(userId);

  const rows = await MusicPlaylist.findAll({
    where: { user_id: uId },
    order: [["updated_at", "DESC"]],
  });

  const playlists = [];
  for (const row of rows) {
    const raw = typeof row.toJSON === "function" ? row.toJSON() : { ...row };
    const trackRows = await MusicPlaylistTrack.findAll({
      where: { playlist_id: raw.id },
      order: [["position", "ASC"]],
    });
    playlists.push({
      ...raw,
      is_private: Boolean(raw.is_private),
      track_count: trackRows.length,
      total_duration: trackRows.reduce((acc, t) => acc + (Number(t.duration) || 0), 0),
    });
  }

  return playlists;
}

export async function getGuildPublicPlaylists(guildId) {
  const gId = String(guildId);

  const rows = await MusicPlaylist.findAll({
    where: { guild_id: gId, is_private: 0 },
    order: [["updated_at", "DESC"]],
  });

  const playlists = [];
  for (const row of rows) {
    const raw = typeof row.toJSON === "function" ? row.toJSON() : { ...row };
    const trackRows = await MusicPlaylistTrack.findAll({
      where: { playlist_id: raw.id },
      order: [["position", "ASC"]],
    });
    playlists.push({
      ...raw,
      is_private: false,
      track_count: trackRows.length,
      total_duration: trackRows.reduce((acc, t) => acc + (Number(t.duration) || 0), 0),
    });
  }

  return playlists;
}

export async function updatePlaylist(playlistId, userId, updates = {}) {
  const pId = String(playlistId);
  const uId = String(userId);

  const playlist = await MusicPlaylist.findOne({
    where: { id: pId, user_id: uId },
  });

  if (!playlist) return null;

  const payload = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) payload.name = String(updates.name).slice(0, 100).trim();
  if (updates.description !== undefined) {
    payload.description = String(updates.description || "").slice(0, 500).trim();
  }
  if (updates.is_private !== undefined) payload.is_private = updates.is_private ? 1 : 0;

  if (typeof playlist.update === "function") {
    await playlist.update(payload);
  } else {
    Object.assign(playlist, payload);
    await playlist.save?.();
  }

  return getPlaylist(pId, uId);
}

export async function deletePlaylist(playlistId, userId) {
  const pId = String(playlistId);
  const uId = String(userId);

  const playlist = await MusicPlaylist.findOne({
    where: { id: pId, user_id: uId },
  });

  if (!playlist) return false;

  // Delete all tracks
  await MusicPlaylistTrack.destroy({
    where: { playlist_id: pId },
  });

  // Delete playlist record
  await playlist.destroy();
  return true;
}

export async function addTrackToPlaylist(playlistId, userId, trackData) {
  const pId = String(playlistId);
  const uId = String(userId);

  const playlist = await MusicPlaylist.findOne({
    where: { id: pId, user_id: uId },
  });

  if (!playlist) return null;

  const existingTracks = await MusicPlaylistTrack.findAll({
    where: { playlist_id: pId },
  });

  const nextPos = existingTracks.length;

  const created = await MusicPlaylistTrack.create({
    playlist_id: pId,
    position: nextPos,
    title: String(trackData.title || "Unknown Title").slice(0, 300),
    author: String(trackData.author || "Unknown Artist").slice(0, 200),
    uri: String(trackData.uri).slice(0, 1000),
    identifier: String(trackData.identifier || "").slice(0, 255),
    source_name: String(trackData.sourceName || trackData.source_name || "unknown").slice(0, 50),
    duration: Number(trackData.length || trackData.duration) || 0,
    thumbnail: trackData.thumbnail ? String(trackData.thumbnail).slice(0, 1000) : null,
    track_data: String(trackData.track || trackData.track_data || ""),
    created_at: new Date().toISOString(),
  });

  // Touch playlist updated_at
  await playlist.update?.({ updated_at: new Date().toISOString() });

  return created;
}

export async function removeTrackFromPlaylist(playlistId, userId, trackRecordIdOrPosition) {
  const pId = String(playlistId);
  const uId = String(userId);

  const playlist = await MusicPlaylist.findOne({
    where: { id: pId, user_id: uId },
  });

  if (!playlist) return false;

  const targetNum = Number(trackRecordIdOrPosition);

  // Try finding by primary key ID or position
  let track = await MusicPlaylistTrack.findOne({
    where: { playlist_id: pId, id: targetNum },
  });

  if (!track) {
    track = await MusicPlaylistTrack.findOne({
      where: { playlist_id: pId, position: targetNum },
    });
  }

  if (!track) {
    const allTracks = await MusicPlaylistTrack.findAll({
      where: { playlist_id: pId },
      order: [["position", "ASC"]],
    });
    if (targetNum >= 0 && targetNum < allTracks.length) {
      track = allTracks[targetNum];
    }
  }

  if (!track) return false;

  await track.destroy();

  // Re-sequence positions
  const remainingTracks = await MusicPlaylistTrack.findAll({
    where: { playlist_id: pId },
    order: [["position", "ASC"]],
  });

  for (let i = 0; i < remainingTracks.length; i++) {
    if (remainingTracks[i].position !== i) {
      await remainingTracks[i].update?.({ position: i });
    }
  }

  await playlist.update?.({ updated_at: new Date().toISOString() });
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Playback History
// ─────────────────────────────────────────────────────────────────────────────

export async function recordMusicHistory(guildIdOrObj, track, playedBy) {
  let gId, tTitle, tAuthor, tUri, tDuration, tUser;

  if (typeof guildIdOrObj === "object" && guildIdOrObj !== null) {
    gId = String(guildIdOrObj.guildId || guildIdOrObj.guild_id);
    tTitle = guildIdOrObj.title;
    tAuthor = guildIdOrObj.author;
    tUri = guildIdOrObj.uri;
    tDuration = guildIdOrObj.duration || guildIdOrObj.length;
    tUser = guildIdOrObj.userId || guildIdOrObj.playedBy || guildIdOrObj.played_by;
  } else {
    gId = String(guildIdOrObj);
    tTitle = track?.title;
    tAuthor = track?.author;
    tUri = track?.uri;
    tDuration = track?.length || track?.duration;
    tUser = playedBy;
  }

  await ensureGuild(gId);

  return MusicHistory.create({
    guild_id: gId,
    title: String(tTitle || "Unknown Title").slice(0, 300),
    author: String(tAuthor || "Unknown Artist").slice(0, 200),
    uri: String(tUri || "").slice(0, 1000),
    duration: Number(tDuration) || 0,
    played_by: String(tUser || "Unknown User"),
    played_at: new Date().toISOString(),
  });
}

export async function getMusicHistory(guildId, limit = 20) {
  const gId = String(guildId);
  const safeLimit = Math.min(Math.max(1, Number(limit) || 20), 50);

  const rows = await MusicHistory.findAll({
    where: { guild_id: gId },
    order: [["played_at", "DESC"]],
    limit: safeLimit,
  });

  return rows.map((r) => (typeof r.toJSON === "function" ? r.toJSON() : { ...r }));
}

export const getGuildMusicHistory = getMusicHistory;

export async function clearMusicHistory(guildId) {
  const gId = String(guildId);
  await MusicHistory.destroy({
    where: { guild_id: gId },
  });
  return true;
}
