import { useState, useEffect, useCallback, useRef } from "react";
import {
  getMusicPlayer,
  musicPlayerAction,
  getMusicQueue,
  removeMusicQueueTrack,
  moveMusicQueueTrack,
  clearMusicQueue,
  getMusicSettings,
  updateMusicSettings,
  getMusicPlaylists,
  createMusicPlaylist,
  deleteMusicPlaylist,
  loadMusicPlaylist,
} from "../api/client";

export function useMusic(guildId, showToast) {
  const [player, setPlayer] = useState(null);
  const [queue, setQueue] = useState({ tracks: [], size: 0, totalDuration: 0 });
  const [settings, setSettings] = useState(null);
  const [playlists, setPlaylists] = useState({ userPlaylists: [], publicPlaylists: [] });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const pollTimerRef = useRef(null);

  // Fetch player state and queue
  const fetchState = useCallback(async (isInitial = false) => {
    if (!guildId) return;
    try {
      const [playerData, queueData] = await Promise.all([
        getMusicPlayer(guildId).catch(() => null),
        getMusicQueue(guildId).catch(() => null),
      ]);

      if (playerData) setPlayer(playerData);
      if (queueData) setQueue(queueData);
      setError(null);
    } catch (err) {
      if (isInitial) setError(err.message);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [guildId]);

  // Fetch settings & playlists once or on demand
  const fetchMetadata = useCallback(async () => {
    if (!guildId) return;
    try {
      const [settingsData, playlistsData] = await Promise.all([
        getMusicSettings(guildId).catch(() => null),
        getMusicPlaylists(guildId).catch(() => null),
      ]);
      if (settingsData) setSettings(settingsData);
      if (playlistsData) setPlaylists(playlistsData);
    } catch {}
  }, [guildId]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    fetchState(true);
    fetchMetadata();
  }, [guildId, fetchState, fetchMetadata]);

  // Periodic polling for real-time player and progress bar updates
  useEffect(() => {
    const pollInterval = player?.isPlaying ? 2000 : 5000;
    pollTimerRef.current = setInterval(() => {
      fetchState(false);
    }, pollInterval);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [player?.isPlaying, fetchState]);

  // Player controls
  const handleAction = async (action, payload = {}, successMsg = null) => {
    try {
      setActionLoading(true);
      const res = await musicPlayerAction(guildId, action, payload);
      if (successMsg && showToast) {
        showToast(successMsg, "success");
      }
      await fetchState(false);
      return res;
    } catch (err) {
      if (showToast) showToast(err.message || "Player action failed", "error");
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const play = async (query, source = "ytsearch") => {
    return handleAction("play", { query, source }, "Added to playback queue");
  };

  const pause = async () => handleAction("pause", {}, "Playback paused");
  const resume = async () => handleAction("resume", {}, "Playback resumed");
  const skip = async () => handleAction("skip", {}, "Track skipped");
  const previous = async () => handleAction("previous", {}, "Playing previous track");
  const stop = async () => handleAction("stop", {}, "Playback stopped");
  const seek = async (position) => handleAction("seek", { position });
  const setVolume = async (volume) => handleAction("volume", { volume });
  const setLoop = async (mode) => handleAction("loop", { mode }, `Loop mode: ${mode.toUpperCase()}`);
  const setFilter = async (filter) => handleAction("filter", { filter }, `Audio filter: ${filter.toUpperCase()}`);
  const shuffle = async () => handleAction("shuffle", {}, "Queue shuffled");

  // Queue actions
  const removeTrack = async (index) => {
    try {
      await removeMusicQueueTrack(guildId, index);
      if (showToast) showToast("Track removed from queue", "info");
      await fetchState(false);
    } catch (err) {
      if (showToast) showToast(err.message || "Failed removing track", "error");
    }
  };

  const moveTrack = async (from, to) => {
    try {
      await moveMusicQueueTrack(guildId, from, to);
      await fetchState(false);
    } catch (err) {
      if (showToast) showToast(err.message || "Failed moving track", "error");
    }
  };

  const clearQueue = async () => {
    try {
      await clearMusicQueue(guildId);
      if (showToast) showToast("Queue cleared", "info");
      await fetchState(false);
    } catch (err) {
      if (showToast) showToast(err.message || "Failed clearing queue", "error");
    }
  };

  // Settings
  const saveSettings = async (updates) => {
    try {
      const updated = await updateMusicSettings(guildId, updates);
      setSettings(updated);
      if (showToast) showToast("Music settings saved", "success");
      return updated;
    } catch (err) {
      if (showToast) showToast(err.message || "Failed saving settings", "error");
      throw err;
    }
  };

  // Playlists
  const createNewPlaylist = async (payload) => {
    try {
      const pl = await createMusicPlaylist(guildId, payload);
      if (showToast) showToast("Playlist created", "success");
      await fetchMetadata();
      return pl;
    } catch (err) {
      if (showToast) showToast(err.message || "Failed creating playlist", "error");
      throw err;
    }
  };

  const deleteExistingPlaylist = async (playlistId) => {
    try {
      await deleteMusicPlaylist(guildId, playlistId);
      if (showToast) showToast("Playlist deleted", "info");
      await fetchMetadata();
    } catch (err) {
      if (showToast) showToast(err.message || "Failed deleting playlist", "error");
      throw err;
    }
  };

  const loadPlaylistTracks = async (playlistId) => {
    try {
      await loadMusicPlaylist(guildId, playlistId);
      if (showToast) showToast("Playlist loaded into queue", "success");
      await fetchState(false);
    } catch (err) {
      if (showToast) showToast(err.message || "Failed loading playlist", "error");
      throw err;
    }
  };

  return {
    player,
    queue,
    settings,
    playlists,
    loading,
    actionLoading,
    error,
    refresh: fetchState,
    play,
    pause,
    resume,
    skip,
    previous,
    stop,
    seek,
    setVolume,
    setLoop,
    setFilter,
    shuffle,
    removeTrack,
    moveTrack,
    clearQueue,
    saveSettings,
    createNewPlaylist,
    deleteExistingPlaylist,
    loadPlaylistTracks,
  };
}
