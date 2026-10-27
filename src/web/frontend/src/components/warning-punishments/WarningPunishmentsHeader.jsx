import React from "react";
import Switch from "../ui/Switch";

export default function WarningPunishmentsHeader({ activeCount = 0, enabled = true, onToggle }) {
  return (
    <div className="mb-8 border-b border-white/5 pb-8">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-display text-brand-crimson tracking-wider">संयम</span>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest opacity-80">
              / Moderation / Automation
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Auto-Punishments</h1>
          <p className="text-sm text-slate-400 max-w-xl">
            Automatically take moderation action when members reach configured warning thresholds.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 shrink-0">
          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900/50 border border-white/5 text-xs font-mono text-slate-400">
            <span className="text-white font-bold">{activeCount}</span> {activeCount === 1 ? "Threshold" : "Thresholds"} Configured
          </div>

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
            <strong>Auto-Punishments Disabled:</strong> Automatic disciplinary actions upon reaching warning thresholds are currently paused server-wide. Warnings will continue to be recorded.
          </p>
        </div>
      )}
    </div>
  );
}
