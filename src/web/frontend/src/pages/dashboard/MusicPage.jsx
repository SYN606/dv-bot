import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useMusic } from "../../hooks/useMusic";
import LivePlayer from "../../components/music/LivePlayer";
import QuickPlayBar from "../../components/music/QuickPlayBar";
import QueueManager from "../../components/music/QueueManager";
import AudioFiltersCard from "../../components/music/AudioFiltersCard";
import MusicSettingsCard from "../../components/music/MusicSettingsCard";
import PlaylistManager from "../../components/music/PlaylistManager";
import {
  Music,
  AlertCircle,
  CheckCircle2,
  ListMusic,
  Sliders,
  Settings,
  FolderHeart,
  Coffee,
  Sparkles,
  Radio,
} from "lucide-react";

export default function MusicPage({ showToast }) {
  const { guildId } = useParams();
  const [activeTab, setActiveTab] = useState("player"); // "player", "filters", "settings", "playlists"
  const [lofiMode, setLofiMode] = useState(false);

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

  const toggleLofiMode = () => {
    const nextState = !lofiMode;
    setLofiMode(nextState);
    if (nextState) {
      setFilter("lofi");
      if (showToast) showToast("☕ Lo-Fi Mode Activated: Warm tape flutter & low-pass EQ applied", "success");
    } else {
      setFilter("clear");
      if (showToast) showToast("Lo-Fi Mode Deactivated: Audio filters cleared", "info");
    }
  };

  const handleStartLofiRadio = () => {
    play("https://www.youtube.com/watch?v=jfKfPfyJRdk", "ytsearch");
    setLofiMode(true);
    setFilter("lofi");
    if (showToast) showToast("☕ Streaming 24/7 Lo-Fi Girl Radio", "success");
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-16 animate-fade-in max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="p-2.5 rounded-2xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shadow-md">
              <Music className="w-6 h-6" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
              Audio & Music Engine
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 font-medium">
            Studio-grade 48kHz audio streaming with Lavalink v4, real-time DSP, vintage Lo-Fi acoustic filters, and queue controls.
          </p>
        </div>

        {/* Status Indicators & Lo-Fi Mode Switch */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Lo-Fi Quick Switch */}
          <button
            type="button"
            onClick={toggleLofiMode}
            disabled={actionLoading}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 border shadow-lg ${
              lofiMode
                ? "bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-amber-500/20"
                : "bg-slate-900/80 hover:bg-slate-800 border-white/10 text-slate-300 hover:text-white"
            }`}
            title="Toggle Lo-Fi vintage ambience & DSP audio filter"
          >
            <Coffee className={`w-4 h-4 ${lofiMode ? "text-slate-950" : "text-amber-400"}`} />
            <span>{lofiMode ? "Lo-Fi Mode: ON" : "Lo-Fi Mode"}</span>
          </button>

          {/* Lavalink Status Indicator */}
          {isLavalinkConnected ? (
            <div className="px-3.5 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs sm:text-sm font-mono font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Lavalink v4 Online</span>
            </div>
          ) : (
            <div className="px-3.5 py-2 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs sm:text-sm font-mono font-bold flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <span>Lavalink Offline</span>
            </div>
          )}
        </div>
      </div>

      {/* Lo-Fi Ambient Banner when active */}
      {lofiMode && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-slate-900/60 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl shadow-amber-500/5 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
              <Coffee className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>☕ Lo-Fi Ambient Mode is Active</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  WARM ACOUSTIC DSP
                </span>
              </p>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                Playback is processed with vintage tape flutter, smooth low-pass acoustic filtering, and warm EQ.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStartLofiRadio}
            disabled={actionLoading}
            className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-black transition-all shadow-md shadow-amber-500/20 shrink-0 flex items-center gap-2 active:scale-95"
          >
            <Radio className="w-4 h-4" />
            <span>Play 24/7 Lo-Fi Radio</span>
          </button>
        </div>
      )}

      {/* Offline Alert if Lavalink is unreachable */}
      {!isLavalinkConnected && (
        <div className="p-4 sm:p-5 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3.5 text-amber-200 text-xs sm:text-sm shadow-lg">
          <AlertCircle className="w-6 h-6 shrink-0 text-amber-400" />
          <div>
            <p className="font-bold text-sm sm:text-base text-amber-300">Lavalink Audio Node Unreachable</p>
            <p className="text-xs sm:text-sm text-amber-300/80 mt-0.5">
              The audio backend is currently disconnected or starting up. Ensure your Lavalink service is running and accessible on the configured host.
            </p>
          </div>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2.5 border-b border-white/10 pb-3 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("player")}
          className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2.5 shrink-0 ${
            activeTab === "player"
              ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/30"
              : "text-slate-300 hover:text-white hover:bg-white/5"
          }`}
        >
          <Music className="w-4 h-4" />
          <span>Player & Queue</span>
        </button>

        <button
          onClick={() => setActiveTab("filters")}
          className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2.5 shrink-0 ${
            activeTab === "filters"
              ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/30"
              : "text-slate-300 hover:text-white hover:bg-white/5"
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Equalizer & Filters</span>
          {player?.filter && player.filter !== "clear" && (
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("playlists")}
          className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2.5 shrink-0 ${
            activeTab === "playlists"
              ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/30"
              : "text-slate-300 hover:text-white hover:bg-white/5"
          }`}
        >
          <FolderHeart className="w-4 h-4" />
          <span>Saved Playlists</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2.5 shrink-0 ${
            activeTab === "settings"
              ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/30"
              : "text-slate-300 hover:text-white hover:bg-white/5"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Server Audio Settings</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "player" && (
        <div className="space-y-6 sm:space-y-8">
          {/* Quick Play Search Bar & Instant Vibes */}
          <QuickPlayBar
            onPlay={play}
            actionLoading={actionLoading}
            onActivateLofiMode={() => {
              setLofiMode(true);
              setFilter("lofi");
            }}
          />

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
            lofiMode={lofiMode}
            onToggleLofiMode={toggleLofiMode}
            actionLoading={actionLoading}
          />

          {/* Structured 2-Column: Queue (Left 2/3) + Quick DSP & Playlists (Right 1/3) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
            <div className="lg:col-span-2">
              <QueueManager
                queue={queue}
                onRemoveTrack={removeTrack}
                onMoveTrack={moveTrack}
                onClearQueue={clearQueue}
                actionLoading={actionLoading}
              />
            </div>

            <div className="space-y-6">
              {/* Quick Audio Filter Card right beside the queue */}
              <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/10 bg-slate-900/60 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Quick DSP Presets</h4>
                  </div>
                  {player?.filter && player.filter !== "clear" && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300">
                      {player.filter.toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "clear", label: "Normal Flat", icon: "🎵" },
                    { id: "lofi", label: "☕ Lo-Fi Chill", icon: "☕", isLofi: true },
                    { id: "bassboost_medium", label: "Bass Boost", icon: "⚡" },
                    { id: "nightcore", label: "Nightcore", icon: "🌙" },
                    { id: "vaporwave", label: "Vaporwave", icon: "📼" },
                    { id: "8d", label: "8D Audio", icon: "🎧" },
                  ].map((preset) => {
                    const isActive = (player?.filter || "clear") === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setFilter(preset.id);
                          if (preset.id === "lofi") setLofiMode(true);
                          else if (lofiMode && preset.id === "clear") setLofiMode(false);
                        }}
                        disabled={actionLoading}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center gap-2 ${
                          isActive
                            ? preset.isLofi
                              ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black"
                              : "bg-indigo-600 text-white border-indigo-500 shadow-md"
                            : "bg-slate-950/60 hover:bg-slate-800 border-white/5 text-slate-300 hover:text-white"
                        }`}
                      >
                        <span>{preset.icon}</span>
                        <span className="truncate">{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Playlists Quick Panel */}
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
          onSelectFilter={(filter) => {
            setFilter(filter);
            if (filter === "lofi") setLofiMode(true);
            else if (lofiMode && filter === "clear") setLofiMode(false);
          }}
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
          guildId={guildId}
          settings={settings}
          onSaveSettings={saveSettings}
          actionLoading={actionLoading}
        />
      )}
    </div>
  );
}
