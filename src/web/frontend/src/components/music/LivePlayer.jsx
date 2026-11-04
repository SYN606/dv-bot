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

  return (
    <div className="glass-panel p-6 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden bg-slate-900/60 backdrop-blur-xl">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-brand-crimson/10 rounded-full blur-3xl pointer-events-none -z-0" />

      <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center">
        {/* Track Artwork */}
        <div className="w-40 h-40 md:w-44 md:h-44 rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-slate-950 shrink-0 relative group">
          {currentTrack?.info?.artworkUrl ? (
            <img
              src={currentTrack.info.artworkUrl}
              alt={currentTrack.info.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
              <Radio className="w-12 h-12 mb-2 animate-pulse" />
              <span className="text-[10px] font-mono tracking-widest uppercase">DV AUDIO</span>
            </div>
          )}

          {isPlaying && (
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>LIVE</span>
            </div>
          )}
        </div>

        {/* Track Details & Controls */}
        <div className="flex-1 w-full min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                {player?.voiceChannelName ? `🔊 ${player.voiceChannelName}` : "Idle"}
              </span>
              {player?.filter && player.filter !== "clear" && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  {player.filter}
                </span>
              )}
              {player?.mode247 && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  24/7 STAY
                </span>
              )}
            </div>

            <h2 className="text-xl md:text-2xl font-black text-white truncate tracking-tight">
              {currentTrack ? currentTrack.info.title : "Nothing Playing"}
            </h2>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {currentTrack ? `By ${currentTrack.info.author}` : "Select a song or playlist below to start playback"}
            </p>
          </div>

          {/* Progress Slider */}
          <div className="my-4">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
              <span>{isStream ? "🔴 STREAM" : formatMs(position)}</span>
              <span>{isStream ? "LIVE" : formatMs(length)}</span>
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
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            />
          </div>

          {/* Buttons & Volume */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Control Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={onPrevious}
                disabled={actionLoading}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors disabled:opacity-40"
                title="Previous Track"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={onPlayPause}
                disabled={actionLoading || !currentTrack}
                className="p-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-40 active:scale-95"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>

              <button
                onClick={onSkip}
                disabled={actionLoading || !currentTrack}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors disabled:opacity-40"
                title="Skip Track"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <button
                onClick={onStop}
                disabled={actionLoading || !currentTrack}
                className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors disabled:opacity-40"
                title="Stop & Clear"
              >
                <Square className="w-4 h-4" />
              </button>

              <button
                onClick={onShuffle}
                disabled={actionLoading || (player?.queueSize || 0) < 2}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors disabled:opacity-40"
                title="Shuffle Queue"
              >
                <Shuffle className="w-4 h-4" />
              </button>

              <button
                onClick={nextLoopMode}
                disabled={actionLoading}
                className={`p-2.5 rounded-xl transition-colors ${
                  player?.loopMode !== "off"
                    ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                    : "bg-white/5 hover:bg-white/10 text-slate-400"
                }`}
                title={`Loop: ${player?.loopMode || "off"}`}
              >
                <Repeat className="w-4 h-4" />
              </button>
            </div>

            {/* Volume Slider */}
            <div className="flex items-center gap-2.5 min-w-[130px]">
              {volume === 0 ? (
                <VolumeX className="w-4 h-4 text-slate-500 shrink-0" />
              ) : (
                <Volume2 className="w-4 h-4 text-slate-400 shrink-0" />
              )}
              <input
                type="range"
                min="0"
                max="200"
                value={volume}
                onChange={handleVolumeChange}
                className="w-24 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
              />
              <span className="text-[10px] font-mono text-slate-400 w-8">{volume}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
