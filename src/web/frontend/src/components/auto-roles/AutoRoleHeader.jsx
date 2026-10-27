import React from "react";
import Switch from "../ui/Switch";

export default function AutoRoleHeader({ enabled, isEnabled, onToggle }) {
  const active = enabled !== undefined ? enabled : Boolean(isEnabled);

  return (
    <div className="mb-8 border-b border-white/5 pb-8">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-display text-brand-crimson tracking-wider">स्वचालन</span>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest opacity-80">/ Rewards / Automation</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Leaderboard Auto-Roles</h1>
          <p className="text-sm text-slate-400 max-w-xl">
            Automatically reward the most active community members with weekly Discord roles.
          </p>
        </div>

        <div className="flex items-center gap-4 p-4 glass-panel bg-slate-900/50 rounded-2xl border border-white/5 shrink-0">
          <div>
            <div className="text-sm font-bold text-white mb-0.5">{active ? "Enabled" : "Disabled"}</div>
            <div className="text-[10px] text-slate-400">Master switch</div>
          </div>
          <Switch checked={active} onChange={onToggle} />
        </div>
      </div>

      {!active && (
        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
          <p className="text-sm text-indigo-300">
            <strong>Auto-Roles Disabled:</strong> Automated weekly leaderboard role distribution is currently paused. Configuration can still be edited and saved.
          </p>
        </div>
      )}
    </div>
  );
}
