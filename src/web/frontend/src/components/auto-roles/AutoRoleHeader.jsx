import React from "react";

export default function AutoRoleHeader({ isEnabled }) {
  return (
    <div className="mb-8 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm font-display text-brand-crimson tracking-wider">स्वचालन</span>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest opacity-80">/ Rewards / Automation</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Leaderboard Auto-Roles</h1>
        <p className="text-sm text-slate-400">Automatically reward the most active community members with weekly Discord roles.</p>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/5 bg-slate-900/50">
        <div className={`w-2 h-2 rounded-full ${isEnabled ? "bg-emerald-500 animate-pulse" : "bg-slate-500"}`}></div>
        <span className="text-xs font-semibold text-slate-300">{isEnabled ? "Active" : "Disabled"}</span>
      </div>
    </div>
  );
}
