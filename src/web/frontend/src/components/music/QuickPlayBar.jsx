import React, { useState } from "react";
import { Search, Music, Coffee, Sparkles, Moon, Radio, Zap } from "lucide-react";

const QUICK_PRESETS = [
  {
    label: "☕ 24/7 Lo-Fi Girl",
    query: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
    source: "ytsearch",
    desc: "Chill beats to study/relax to",
    badge: "LO-FI RADIO",
    theme: "amber",
  },
  {
    label: "🌙 Synthwave Lo-Fi",
    query: "synthwave lofi chill beats",
    source: "ytsearch",
    desc: "Retro analog synthwave",
    theme: "purple",
  },
  {
    label: "🎷 Coffeehouse Jazz",
    query: "coffee shop jazz instrumental",
    source: "ytsearch",
    desc: "Warm acoustic piano & jazz",
    theme: "emerald",
  },
  {
    label: "⚡ Cyberpunk / Phonk",
    query: "drift phonk workout playlist",
    source: "ytsearch",
    desc: "High-energy bass & phonk",
    theme: "indigo",
  },
];

export default function QuickPlayBar({ onPlay, actionLoading, onActivateLofiMode }) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("ytsearch");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    onPlay(query.trim(), source);
    setQuery("");
  };

  const handlePresetClick = (preset) => {
    onPlay(preset.query, preset.source);
    if (preset.badge === "LO-FI RADIO" && onActivateLofiMode) {
      onActivateLofiMode();
    }
  };

  return (
    <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/10 bg-slate-900/60 shadow-xl space-y-4">
      {/* Search Bar Form */}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search song title, artist, album, or paste YouTube / Spotify / SoundCloud URL..."
            className="w-full bg-slate-950/80 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 justify-between sm:justify-start">
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="bg-slate-950/80 border border-white/10 rounded-2xl px-4 py-3.5 text-xs sm:text-sm font-medium text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ytsearch">YouTube</option>
            <option value="ytmsearch">YouTube Music</option>
            <option value="scsearch">SoundCloud</option>
          </select>

          <button
            type="submit"
            disabled={actionLoading || !query.trim()}
            className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-40 flex items-center gap-2 shrink-0 active:scale-95"
          >
            <Music className="w-4 h-4" />
            <span>Play</span>
          </button>
        </div>
      </form>

      {/* Instant Vibes & Lo-Fi Shortcuts */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pt-1">
        <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1.5 mr-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Instant Vibes:
        </span>
        {QUICK_PRESETS.map((p, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handlePresetClick(p)}
            disabled={actionLoading}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 border disabled:opacity-40 bg-slate-950/40 hover:bg-slate-800/60 border-white/10 text-slate-300 hover:text-white hover:border-indigo-500/30"
          >
            <span>{p.label}</span>
            {p.badge && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {p.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
