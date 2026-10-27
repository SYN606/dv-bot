import React from "react";
import Switch from "../ui/Switch";

export default function SupporterRewardsHeader({ enabled, onToggle, hasChanges, onSave, saving }) {
  return (
    <div className="mb-8 border-b border-white/5 pb-8">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-display text-brand-crimson tracking-wider">समुदाय</span>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest opacity-80">/ Community / Engagement</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Supporter Rewards</h1>
          <p className="text-sm text-slate-400 max-w-xl">
            Reward members who represent the server through their Discord status or server clan identity.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 shrink-0">
          {onSave && (
            <button
              onClick={onSave}
              disabled={!hasChanges || saving}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          )}

          <div className="flex items-center gap-4 p-4 glass-panel bg-slate-900/50 rounded-2xl border border-white/5 shrink-0">
            <div>
              <div className="text-sm font-bold text-white mb-0.5">{enabled ? "Enabled" : "Disabled"}</div>
              <div className="text-[10px] text-slate-400">Master switch</div>
            </div>
            <Switch checked={enabled} onChange={onToggle} />
          </div>
        </div>
      </div>
      
      {!enabled && (
        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
          <p className="text-sm text-indigo-300">
            <strong>Supporter Rewards Disabled:</strong> Realtime status and clan reward evaluation is currently paused. Configuration can still be edited and saved.
          </p>
        </div>
      )}
    </div>
  );
}
