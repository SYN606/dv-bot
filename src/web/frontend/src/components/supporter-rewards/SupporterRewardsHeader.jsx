import React from "react";
import Switch from "../ui/Switch";

export default function SupporterRewardsHeader({ enabled, onToggle, hasChanges, onSave, saving }) {
  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
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
        <div className="flex items-center gap-4 shrink-0">
          <button
            onClick={onSave}
            disabled={!hasChanges || saving}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
      
      <div className="mt-8 p-5 glass-panel bg-slate-900/50 rounded-2xl border border-white/5 flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-bold text-white mb-1">Module Enabled</div>
          <p className="text-xs text-slate-400">
            {enabled 
              ? "Rewards are currently active and listening for status changes." 
              : "Rewards are currently paused. Configuration will become active when enabled."}
          </p>
        </div>
        <div className="shrink-0 mt-1">
          <Switch 
            checked={enabled} 
            onChange={onToggle} 
          />
        </div>
      </div>
      
      {!enabled && (
        <div className="mt-4 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
          <p className="text-xs text-indigo-300">
            <strong>Supporter Rewards is currently disabled.</strong> Your configuration is preserved and will become active when the module is enabled.
          </p>
        </div>
      )}
    </div>
  );
}
