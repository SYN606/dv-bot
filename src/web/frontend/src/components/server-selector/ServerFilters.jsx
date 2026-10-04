import React from "react";

export default function ServerFilters({ filterMode, setFilterMode, manageableCount, totalCount }) {
  return (
    <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4" role="tablist" aria-label="Server Filters">
      <button
        role="tab"
        aria-selected={filterMode === "manageable"}
        onClick={() => setFilterMode("manageable")}
        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border ${
          filterMode === "manageable"
            ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30 shadow-sm shadow-indigo-500/10"
            : "text-slate-400 hover:text-white hover:bg-white/5 border-transparent"
        }`}
      >
        I Can Manage
        <span
          className={`text-[11px] px-2 py-0.5 rounded-md font-mono font-bold transition-colors ${
            filterMode === "manageable"
              ? "bg-indigo-500/25 text-indigo-300"
              : "bg-white/5 text-slate-500"
          }`}
        >
          {manageableCount}
        </span>
      </button>

      <button
        role="tab"
        aria-selected={filterMode === "all"}
        onClick={() => setFilterMode("all")}
        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border ${
          filterMode === "all"
            ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30 shadow-sm shadow-indigo-500/10"
            : "text-slate-400 hover:text-white hover:bg-white/5 border-transparent"
        }`}
      >
        All Servers
        <span
          className={`text-[11px] px-2 py-0.5 rounded-md font-mono font-bold transition-colors ${
            filterMode === "all"
              ? "bg-indigo-500/25 text-indigo-300"
              : "bg-white/5 text-slate-500"
          }`}
        >
          {totalCount}
        </span>
      </button>
    </div>
  );
}
