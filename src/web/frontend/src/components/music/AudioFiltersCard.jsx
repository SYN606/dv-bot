import React from "react";
import { Sliders, Sparkles, Moon, Sun, Disc, Mic2, Zap, Waves, Coffee } from "lucide-react";

const FILTERS = [
  { id: "clear", label: "Normal / Flat", desc: "Original studio master audio without coloration", icon: Sliders },
  { id: "lofi", label: "Lo-Fi Chill", desc: "Warm tape flutter, low-pass EQ & cozy vintage acoustic vibe", icon: Coffee, isLofi: true },
  { id: "bassboost_medium", label: "Bass Boost (Mid)", desc: "Warm rich low-end punch for hip hop & electronic", icon: Zap },
  { id: "bassboost_high", label: "Bass Boost (High)", desc: "Maximum sub-bass enhancement for club beats", icon: Zap },
  { id: "nightcore", label: "Nightcore", desc: "1.25x tempo speed & higher vocal pitch", icon: Moon },
  { id: "vaporwave", label: "Vaporwave", desc: "0.85x slowed tempo with relaxed warm pitch", icon: Sun },
  { id: "8d", label: "8D Spatial Audio", desc: "Dynamic 360-degree binaural rotation panning", icon: Disc },
  { id: "karaoke", label: "Karaoke Mode", desc: "Center vocal band attenuation for sing-alongs", icon: Mic2 },
  { id: "rock", label: "Rock & Indie EQ", desc: "Crisp highs, open mids and punchy kick clarity", icon: Sparkles },
  { id: "electronic", label: "EDM & Club EQ", desc: "Sub-bass resonance with glistening high-end", icon: Waves },
];

export default function AudioFiltersCard({ activeFilter, onSelectFilter, actionLoading }) {
  return (
    <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 bg-slate-900/60 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-wide uppercase">Audio DSP Equalizer & Presets</h3>
            <p className="text-xs sm:text-sm text-slate-400">Real-time studio equalization, time-stretching, and acoustic modulation</p>
          </div>
        </div>

        {activeFilter && activeFilter !== "clear" && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Active: {activeFilter.toUpperCase()}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {FILTERS.map((f) => {
          const Icon = f.icon;
          const isActive = (activeFilter || "clear") === f.id;

          return (
            <button
              key={f.id}
              onClick={() => onSelectFilter(f.id)}
              disabled={actionLoading}
              className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 disabled:opacity-40 group ${
                isActive
                  ? f.isLofi
                    ? "bg-amber-500/20 border-amber-500/60 text-white shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30"
                    : "bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/30"
                  : f.isLofi
                  ? "bg-amber-950/20 hover:bg-amber-900/30 border-amber-500/20 text-slate-200 hover:text-white"
                  : "bg-slate-950/50 hover:bg-slate-950/80 border-white/5 text-slate-300 hover:text-white"
              }`}
            >
              <div
                className={`p-2.5 rounded-xl shrink-0 transition-colors ${
                  isActive
                    ? f.isLofi
                      ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                      : "bg-indigo-500 text-white shadow-md shadow-indigo-500/20"
                    : f.isLofi
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : "bg-white/5 text-slate-400 group-hover:text-indigo-300"
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold leading-snug truncate">{f.label}</p>
                  {f.isLofi && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      LO-FI
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{f.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
