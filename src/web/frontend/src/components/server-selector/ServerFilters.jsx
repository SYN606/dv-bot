import React from "react";

export default function ServerFilters({ filterMode, setFilterMode, manageableCount, totalCount }) {
  return (
    <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
      <button
        onClick={() => setFilterMode("manageable")}
        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
          filterMode === "manageable"
            ? "bg-indigo-500/10 text-indigo-400"
            : "text-slate-400 hover:text-white hover:bg-white/5"
        }`}
      >
        I Can Manage
        <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
          filterMode === "manageable" ? "bg-indigo-500/20 text-indigo-300" : "bg-white/5 text-slate-500"
        }`}>
          {manageableCount}
        </span>
      </button>
      
      <button
        onClick={() => setFilterMode("all")}
        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
          filterMode === "all"
            ? "bg-slate-800 text-white"
            : "text-slate-400 hover:text-white hover:bg-white/5"
        }`}
      >
        All Servers
        <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
          filterMode === "all" ? "bg-white/10 text-slate-300" : "bg-white/5 text-slate-500"
        }`}>
          {totalCount}
        </span>
      </button>
    </div>
  );
}
