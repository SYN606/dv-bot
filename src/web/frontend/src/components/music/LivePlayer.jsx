import React, { useState, useEffect } from "react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Square,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  Coffee,
  Disc3,
  Flame,
} from "lucide-react";

function formatMs(ms) {
  if (!ms || isNaN(ms)) return "00:00";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec < 10 ? "0" : ""}${sec}`;
}

export default function LivePlayer({
  player,
  onPlayPause,
  onSkip,
  onPrevious,
  onStop,
  onSeek,
  onVolume,
  onLoop,
  onShuffle,
  onFilterChange,
  lofiMode,
  onToggleLofiMode,
  actionLoading,
}) {
  const currentTrack = player?.currentTrack;
  const isPlaying = player?.isPlaying;
  const isPaused = player?.isPaused;
  const length = currentTrack?.info?.length || 0;
  const isStream = currentTrack?.info?.isStream;

  // Local optimistic progress state
  const [position, setPosition] = useState(player?.position || 0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [volume, setVolume] = useState(player?.volume || 80);

  useEffect(() => {
    if (!isSeeking && player?.position !== undefined) {
      setPosition(player.position);
    }
  }, [player?.position, isSeeking]);

  useEffect(() => {
    if (player?.volume !== undefined) {
      setVolume(player.volume);
    }
  }, [player?.volume]);

  // Interpolate progress every second when playing
  useEffect(() => {
    if (!isPlaying || isPaused || isSeeking || isStream) return;
    const interval = setInterval(() => {
      setPosition((prev) => Math.min(prev + 1000, length));
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, isPaused, isSeeking, isStream, length]);

  const handleSeekCommit = (e) => {
    const newPos = Number(e.target.value);
    setIsSeeking(false);
    setPosition(newPos);
    onSeek(newPos);
  };

  const handleVolumeChange = (e) => {
    const newVol = Number(e.target.value);
    setVolume(newVol);
    onVolume(newVol);
  };

  const loopModes = ["off", "track", "queue"];
  const nextLoopMode = () => {
    const curIdx = loopModes.indexOf(player?.loopMode || "off");
    const next = loopModes[(curIdx + 1) % loopModes.length];
    onLoop(next);
  };

  const isLofiActive = lofiMode || (player?.filter && (player.filter === "lofi" || player.filter === "chill"));

  return (
    <div
      className={`glass-panel p-6 sm:p-8 rounded-3xl border transition-all duration-700 shadow-2xl relative overflow-hidden backdrop-blur-2xl ${
        isLofiActive
          ? "bg-gradient-to-br from-amber-950/40 via-purple-950/30 to-slate-900/90 border-amber-500/30 shadow-amber-500/10"
          : "bg-slate-900/70 border-white/10 shadow-indigo-500/5"
      }`}
    >
      {/* Dynamic Background Glow */}
      <div
        className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-colors duration-700 -z-0 ${
          isLofiActive ? "bg-amber-500/15" : "bg-indigo-600/15"
        }`}
      />
      <div
        className={`absolute bottom-0 left-0 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-colors duration-700 -z-0 ${
          isLofiActive ? "bg-purple-600/15" : "bg-brand-crimson/10"
        }`}
      />

      <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
        {/* Track Artwork & Vinyl Assembly */}
        <div className="relative group shrink-0">
          {/* Animated Vinyl Disc for Lo-Fi / Playing */}
          <div
            className={`hidden sm:block absolute top-1/2 -right-8 -translate-y-1/2 w-44 h-44 rounded-full bg-slate-950 border-4 border-slate-800/80 shadow-2xl transition-all duration-700 ${
              isPlaying && !isPaused ? "animate-spin-slow opacity-90 translate-x-4" : "opacity-40 translate-x-0"
            }`}
          >
            {/* Vinyl Grooves */}
            <div className="absolute inset-2 rounded-full border border-white/5" />
            <div className="absolute inset-5 rounded-full border border-white/5" />
            <div className="absolute inset-9 rounded-full border border-white/5" />
            <div
              className={`absolute inset-14 rounded-full flex items-center justify-center text-[9px] font-mono font-bold tracking-widest text-slate-400 border ${
                isLofiActive ? "bg-amber-600 border-amber-400 text-slate-950" : "bg-indigo-600 border-indigo-400 text-white"
              }`}
            >
              LOFI
            </div>
          </div>

          {/* Album Cover Card */}
          <div className="w-48 h-48 md:w-52 md:h-52 rounded-3xl overflow-hidden shadow-2xl border border-white/15 bg-slate-950 shrink-0 relative z-10 transition-transform duration-500 group-hover:scale-[1.02]">
            {currentTrack?.info?.artworkUrl ? (
              <img
                src={currentTrack.info.artworkUrl}
                alt={currentTrack.info.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                <Radio className="w-14 h-14 mb-2 animate-pulse text-indigo-400" />
                <span className="text-xs font-mono tracking-widest uppercase font-bold text-slate-400">DV AUDIO ENGINE</span>
              </div>
            )}

            {/* Live Indicator */}
            {isPlaying && (
              <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/15 flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>LIVE</span>
              </div>
            )}

            {/* Lo-Fi Stamp Badge */}
            {isLofiActive && (
              <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-amber-500/90 backdrop-blur-md text-slate-950 text-[10px] font-mono font-black uppercase tracking-wider flex items-center gap-1 shadow-lg">
                <Coffee className="w-3 h-3" />
                <span>LO-FI</span>
              </div>
            )}
          </div>
        </div>

        {/* Track Details & Deck Controls */}
        <div className="flex-1 w-full min-w-0 flex flex-col justify-between space-y-5">
          {/* Top Metadata & Lo-Fi Mode Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold uppercase bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 shadow-sm">
                <span>🔊</span>
                <span>{player?.voiceChannelName ? player.voiceChannelName : "Voice Channel Idle"}</span>
              </span>

              {player?.filter && player.filter !== "clear" && (
                <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{player.filter}</span>
                </span>
              )}

              {player?.mode247 && (
                <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  24/7 MODE
                </span>
              )}
            </div>

            {/* Quick Lo-Fi Mode Toggle Button */}
            <button
              type="button"
              onClick={() => {
                if (onToggleLofiMode) onToggleLofiMode();
                if (onFilterChange) {
                  onFilterChange(isLofiActive ? "clear" : "lofi");
                }
              }}
              disabled={actionLoading}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border shadow-sm ${
                isLofiActive
                  ? "bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-amber-500/20"
                  : "bg-slate-950/60 hover:bg-slate-900 border-white/10 text-slate-300 hover:text-white"
              }`}
              title="Toggle Lo-Fi Vintage Filter & Visual Mode"
            >
              <Coffee className={`w-3.5 h-3.5 ${isLofiActive ? "text-slate-950" : "text-amber-400"}`} />
              <span>{isLofiActive ? "Lo-Fi Mode: ON" : "Lo-Fi Mode"}</span>
            </button>
          </div>

          {/* Titles */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white truncate tracking-tight">
              {currentTrack ? currentTrack.info.title : "Nothing Currently Playing"}
            </h2>
            <p className="text-sm sm:text-base font-medium text-slate-300 truncate mt-1">
              {currentTrack ? (
                <>
                  <span className="text-slate-400">By</span>{" "}
                  <span className="text-indigo-300 font-semibold">{currentTrack.info.author}</span>
                </>
              ) : (
                "Search for a song, pick an Instant Vibe above, or load a playlist"
              )}
            </p>
          </div>

          {/* Seek Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs sm:text-sm font-mono font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                {isPlaying && !isPaused && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                {isStream ? "🔴 LIVE STREAM" : formatMs(position)}
              </span>
              <span>{isStream ? "24/7 BROADCAST" : formatMs(length)}</span>
            </div>

            <input
              type="range"
              min="0"
              max={length || 100}
              value={position}
              disabled={!currentTrack || isStream}
              onChange={(e) => {
                setIsSeeking(true);
                setPosition(Number(e.target.value));
              }}
              onMouseUp={handleSeekCommit}
              onTouchEnd={handleSeekCommit}
              className="w-full h-2.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-inner"
            />
          </div>

          {/* Control Buttons & Volume */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            {/* Primary Transport Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={onPrevious}
                disabled={actionLoading}
                className="p-3 rounded-2xl bg-slate-950/60 hover:bg-slate-800 border border-white/5 text-slate-300 hover:text-white transition-all disabled:opacity-30 active:scale-95"
                title="Previous Track"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              <button
                onClick={onPlayPause}
                disabled={actionLoading || !currentTrack}
                className={`p-4 rounded-2xl text-white shadow-xl transition-all disabled:opacity-30 active:scale-95 ${
                  isLofiActive
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 shadow-amber-500/20 text-slate-950 font-black"
                    : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30"
                }`}
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </button>

              <button
                onClick={onSkip}
                disabled={actionLoading || !currentTrack}
                className="p-3 rounded-2xl bg-slate-950/60 hover:bg-slate-800 border border-white/5 text-slate-300 hover:text-white transition-all disabled:opacity-30 active:scale-95"
                title="Skip Track"
              >
                <SkipForward className="w-5 h-5" />
              </button>

              <button
                onClick={onStop}
                disabled={actionLoading || !currentTrack}
                className="p-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all disabled:opacity-30 active:scale-95"
                title="Stop Playback & Clear Player"
              >
                <Square className="w-5 h-5" />
              </button>

              <button
                onClick={onShuffle}
                disabled={actionLoading || (player?.queueSize || 0) < 2}
                className="p-3 rounded-2xl bg-slate-950/60 hover:bg-slate-800 border border-white/5 text-slate-300 hover:text-white transition-all disabled:opacity-30"
                title="Shuffle Queue"
              >
                <Shuffle className="w-5 h-5" />
              </button>

              <button
                onClick={nextLoopMode}
                disabled={actionLoading}
                className={`p-3 rounded-2xl transition-all border ${
                  player?.loopMode !== "off"
                    ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/40 shadow-md shadow-indigo-500/10"
                    : "bg-slate-950/60 hover:bg-slate-800 border-white/5 text-slate-400"
                }`}
                title={`Loop Mode: ${player?.loopMode || "off"}`}
              >
                <Repeat className="w-5 h-5" />
              </button>
            </div>

            {/* Volume Slider */}
            <div className="flex items-center gap-3 p-2 rounded-2xl bg-slate-950/60 border border-white/5 min-w-[170px]">
              <button
                type="button"
                onClick={() => onVolume(volume === 0 ? 80 : 0)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                {volume === 0 ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="200"
                value={volume}
                onChange={handleVolumeChange}
                className="w-24 sm:w-28 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
              />
              <span className="text-xs sm:text-sm font-mono font-bold text-slate-300 w-10 text-right">
                {volume}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
