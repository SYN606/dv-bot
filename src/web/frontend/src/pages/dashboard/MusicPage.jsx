import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useMusic } from "../../hooks/useMusic";
import LivePlayer from "../../components/music/LivePlayer";
import QuickPlayBar from "../../components/music/QuickPlayBar";
import QueueManager from "../../components/music/QueueManager";
import AudioFiltersCard from "../../components/music/AudioFiltersCard";
import MusicSettingsCard from "../../components/music/MusicSettingsCard";
import PlaylistManager from "../../components/music/PlaylistManager";
import { Music, AlertCircle, CheckCircle2, ListMusic, Sliders, Settings, FolderHeart } from "lucide-react";

export default function MusicPage({ showToast }) {
  const { guildId } = useParams();
  const [activeTab, setActiveTab] = useState("player"); // "player", "filters", "settings", "playlists"

  const {
    player,
    queue,
    settings,
    playlists,
    loading,
    actionLoading,
    error,
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
  } = useMusic(guildId, showToast);

  const isLavalinkConnected = player?.isLavalinkConnected ?? true;

  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Music className="w-5 h-5" />
            </span>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase">
              Music Engine
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            High-fidelity 48kHz audio streaming with Lavalink v4, real-time DSP, and queue controls.
          </p>
        </div>

        {/* Lavalink Node Status Indicator */}
        <div className="flex items-center gap-2">
          {isLavalinkConnected ? (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono flex items-center gap-2 shadow-lg shadow-emerald-500/5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Lavalink v4 Online</span>
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span>Lavalink Offline</span>
            </div>
          )}
        </div>
      </div>

      {/* Offline Alert if Lavalink is unreachable */}
      {!isLavalinkConnected && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3 text-amber-300 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-400" />
          <div>
            <p className="font-bold">Lavalink Audio Node Unreachable</p>
            <p className="text-[11px] text-amber-400/80 mt-0.5">
              The audio backend is currently disconnected or starting up. Ensure your Lavalink service is running on the configured host and port.
            </p>
          </div>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("player")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "player"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Music className="w-4 h-4" />
          <span>Player & Queue</span>
        </button>

        <button
          onClick={() => setActiveTab("filters")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "filters"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Audio Filters</span>
          {player?.filter && player.filter !== "clear" && (
            <span className="w-2 h-2 rounded-full bg-amber-400" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("playlists")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "playlists"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <FolderHeart className="w-4 h-4" />
          <span>Playlists</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "settings"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "player" && (
        <div className="space-y-6">
          {/* Quick Play Search Bar */}
          <QuickPlayBar onPlay={play} actionLoading={actionLoading} />

          {/* Live Player Deck */}
          <LivePlayer
            player={player}
            onPlayPause={() => (player?.isPlaying ? pause() : resume())}
            onSkip={skip}
            onPrevious={previous}
            onStop={stop}
            onSeek={seek}
            onVolume={setVolume}
            onLoop={setLoop}
            onShuffle={shuffle}
            onFilterChange={setFilter}
            actionLoading={actionLoading}
          />

          {/* Queue Manager & Quick Info */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <QueueManager
                queue={queue}
                onRemoveTrack={removeTrack}
                onMoveTrack={moveTrack}
                onClearQueue={clearQueue}
                actionLoading={actionLoading}
              />
            </div>
            <div>
              <PlaylistManager
                playlists={playlists}
                onCreatePlaylist={createNewPlaylist}
                onDeletePlaylist={deleteExistingPlaylist}
                onLoadPlaylist={loadPlaylistTracks}
                actionLoading={actionLoading}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === "filters" && (
        <AudioFiltersCard
          activeFilter={player?.filter}
          onSelectFilter={setFilter}
          actionLoading={actionLoading}
        />
      )}

      {activeTab === "playlists" && (
        <PlaylistManager
          playlists={playlists}
          onCreatePlaylist={createNewPlaylist}
          onDeletePlaylist={deleteExistingPlaylist}
          onLoadPlaylist={loadPlaylistTracks}
          actionLoading={actionLoading}
        />
      )}

      {activeTab === "settings" && (
        <MusicSettingsCard
          settings={settings}
          onSaveSettings={saveSettings}
          actionLoading={actionLoading}
        />
      )}
    </div>
  );
}
