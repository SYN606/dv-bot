import React from "react";
import Badge from "../ui/Badge";
import Switch from "../ui/Switch";

export default function MediaOnlyHeader({ activeCount = 0, enabled = true, onToggle }) {
  return (
    <div className="mb-8 border-b border-white/5 pb-8">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-display text-brand-crimson tracking-wider">नियम</span>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest opacity-80">/ Moderation / Media Control</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Media-Only Channels</h1>
          <p className="text-sm text-slate-400 max-w-xl">
            Keep selected channels focused on media by automatically removing unsupported text-only messages.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 shrink-0">
          <div className="shrink-0 flex items-center gap-3 bg-slate-900/50 px-4 py-3 rounded-2xl border border-white/5">
            <Badge variant={activeCount > 0 ? "brand" : "default"}>
              {activeCount} {activeCount === 1 ? "Rule" : "Rules"} Active
            </Badge>
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
            <strong>Media-Only Enforcement Disabled:</strong> Automatic removal of non-media messages is currently paused server-wide. Channel rules remain intact.
          </p>
        </div>
      )}
    </div>
  );
}
