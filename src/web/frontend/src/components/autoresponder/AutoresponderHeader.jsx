import React from "react";
import { RefreshCw } from "lucide-react";

export default function AutoresponderHeader({ activeCount, totalCount, loading, onRefresh }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm font-display text-brand-crimson tracking-wider">स्वचालन</span>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest opacity-80">/ Autoresponder</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Autoresponder</h1>
        <p className="text-sm text-slate-400">Automatically reply or react when messages match configured triggers.</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-xs font-mono text-slate-400">
          <span className="text-white font-bold">{activeCount}</span> Active / {totalCount} Total
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center justify-center p-2 rounded-lg bg-brand-crimson hover:bg-brand-crimson-dark text-white text-xs font-semibold transition-all shadow-lg shadow-brand-crimson/20 disabled:opacity-50"
          title="Refresh Rules"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
    </div>
  );
}
