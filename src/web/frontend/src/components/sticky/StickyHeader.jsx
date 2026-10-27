import React from "react";
import Switch from "../ui/Switch";

export default function StickyHeader({ activeCount = 0, totalRepins = 0, enabled = true, onToggle }) {
  return (
    <div className="mb-8 border-b border-white/5 pb-8">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-display text-brand-crimson tracking-wider">स्वचालन</span>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest opacity-80">/ Automation / Messaging</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Sticky Notices</h1>
          <p className="text-sm text-slate-400 max-w-xl">
            Keep important announcements visible by automatically reposting them after channel activity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 shrink-0">
          <div className="flex items-center gap-3 bg-slate-900/50 px-4 py-3 rounded-2xl border border-white/5">
            <div className="text-sm font-bold text-white">
              {activeCount} <span className="text-slate-400 font-normal">Active</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-600"></div>
            <div className="text-sm font-bold text-white">
              {totalRepins.toLocaleString()} <span className="text-slate-400 font-normal">Repins</span>
            </div>
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
            <strong>Sticky Notices Disabled:</strong> Automatic notice reposting is currently paused server-wide. Sticky message configurations remain saved.
          </p>
        </div>
      )}
    </div>
  );
}
