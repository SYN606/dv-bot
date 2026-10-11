import React from "react";
import { Sliders, Sparkles, Moon, Sun, Disc, Mic2, Zap, Waves } from "lucide-react";

const FILTERS = [
  { id: "clear", label: "Normal / Flat", desc: "No filters applied", icon: Sliders },
  { id: "bassboost_medium", label: "Bass Boost (Mid)", desc: "Warm rich low-end punch", icon: Zap },
  { id: "bassboost_high", label: "Bass Boost (High)", desc: "Heavy sub-bass enhancement", icon: Zap },
  { id: "nightcore", label: "Nightcore", desc: "1.25x speed & higher pitch", icon: Moon },
  { id: "vaporwave", label: "Vaporwave", desc: "0.85x slowed down lo-fi vibe", icon: Sun },
  { id: "8d", label: "8D Audio", desc: "Rotating binaural 360 sound", icon: Disc },
  { id: "karaoke", label: "Karaoke", desc: "Vocal attenuation / cut", icon: Mic2 },
  { id: "rock", label: "Rock EQ", desc: "Crisp highs and punchy kick", icon: Sparkles },
  { id: "electronic", label: "EDM / Electronic", desc: "Enhanced bass & bright treble", icon: Waves },
];

export default function AudioFiltersCard({ activeFilter, onSelectFilter, actionLoading }) {
  return (
    <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-slate-900/60 shadow-xl">
      <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-white/5">
        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <Sliders className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Audio DSP Filters</h3>
          <p className="text-[11px] text-slate-400">Real-time studio equalization & audio processing</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {FILTERS.map((f) => {
          const Icon = f.icon;
          const isActive = (activeFilter || "clear") === f.id;

          return (
            <button
              key={f.id}
              onClick={() => onSelectFilter(f.id)}
              disabled={actionLoading}
              className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-3 disabled:opacity-40 ${
                isActive
                  ? "bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10"
                  : "bg-slate-950/40 hover:bg-slate-950/70 border-white/5 text-slate-300 hover:text-white"
              }`}
            >
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  isActive ? "bg-indigo-500 text-white" : "bg-white/5 text-slate-400"
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold leading-tight truncate">{f.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{f.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
