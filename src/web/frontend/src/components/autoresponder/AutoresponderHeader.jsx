import React from "react";
import { RefreshCw } from "lucide-react";
import Switch from "../ui/Switch";

export default function AutoresponderHeader({
  activeCount = 0,
  totalCount = 0,
  loading = false,
  onRefresh,
  enabled = true,
  onToggle
}) {
  return (
    <div className="mb-8 border-b border-white/5 pb-8">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-display text-indigo-400 tracking-wider">स्वचालन</span>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest opacity-80">/ Autoresponder / Triggers</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Autoresponder</h1>
          <p className="text-sm text-slate-400 max-w-xl">
            Automatically reply, send rich embeds, or add reactions when community messages match configured triggers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 shrink-0">
          <div className="flex items-center gap-3 bg-slate-900/50 px-4 py-3 rounded-2xl border border-white/5 text-xs font-mono text-slate-400">
            <div>
              <span className="text-white font-bold">{activeCount}</span> Active / {totalCount} Total
            </div>
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={loading}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all disabled:opacity-50"
                title="Refresh Rules"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            )}
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
            <strong>Autoresponder Disabled:</strong> Automated responses and trigger reactions are currently paused server-wide. Rules can still be configured and saved.
          </p>
        </div>
      )}
    </div>
  );
}
