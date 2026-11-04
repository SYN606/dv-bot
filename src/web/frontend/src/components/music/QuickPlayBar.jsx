import React, { useState } from "react";
import { Search, Music, Disc3, Radio } from "lucide-react";

export default function QuickPlayBar({ onPlay, actionLoading }) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("ytsearch");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    onPlay(query.trim(), source);
    setQuery("");
  };

  return (
    <form onSubmit={handleSubmit} className="glass-panel p-3 rounded-2xl border border-white/10 bg-slate-900/60 shadow-xl flex flex-col sm:flex-row gap-2.5 items-center">
      <div className="relative flex-1 w-full">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, artist, or paste YouTube / Spotify / SoundCloud URL..."
          className="w-full bg-slate-950/70 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
        />
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-between sm:justify-start">
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="bg-slate-950/70 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/50"
        >
          <option value="ytsearch">YouTube</option>
          <option value="ytmsearch">YouTube Music</option>
          <option value="scsearch">SoundCloud</option>
        </select>

        <button
          type="submit"
          disabled={actionLoading || !query.trim()}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-40 flex items-center gap-1.5 shrink-0"
        >
          <Music className="w-3.5 h-3.5" />
          <span>Play</span>
        </button>
      </div>
    </form>
  );
}
