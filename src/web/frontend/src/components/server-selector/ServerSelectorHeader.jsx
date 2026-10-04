import React from "react";
import { Search, RotateCw } from "lucide-react";
import SuperuserBadge from "../ui/SuperuserBadge";

export default function ServerSelectorHeader({ search, setSearch, refreshing, onRefresh, user }) {
  return (
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest opacity-80">Dashboard</span>
          {user?.isSuperuser && <SuperuserBadge size="sm" />}
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Your Servers</h1>
        <p className="text-sm text-slate-400 max-w-xl">
          Choose a Discord server to manage Digital Vigital.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search your servers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors shadow-sm"
          />
        </div>
        
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-sm font-semibold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
          title="Refresh servers and permissions from Discord."
        >
          <RotateCw className={`w-4 h-4 ${refreshing ? "animate-spin text-indigo-400" : "text-slate-400"}`} />
          {refreshing ? "Syncing..." : "Sync Servers"}
        </button>
      </div>
    </div>
  );
}
