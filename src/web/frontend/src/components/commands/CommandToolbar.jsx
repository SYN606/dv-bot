import React from "react";
import { Search, X, CheckCheck, Ban } from "lucide-react";

export default function CommandToolbar({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  statusFilter,
  setStatusFilter,
  categories,
  onOpenBulkConfirm,
  isBulkPending = false,
}) {
  return (
    <div className="space-y-4 mb-8">
      {/* Search Bar + Global Bulk Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search commands, descriptions, or aliases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-10 py-3 bg-slate-900/80 border border-white/10 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Global Bulk Enable / Disable Buttons */}
        {onOpenBulkConfirm && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onOpenBulkConfirm(true)}
              disabled={isBulkPending}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-40"
              title="Enable all configurable commands in this scope"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Enable All</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenBulkConfirm(false)}
              disabled={isBulkPending}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-40"
              title="Disable all configurable commands in this scope"
            >
              <Ban className="w-3.5 h-3.5 text-rose-400" />
              <span>Disable All</span>
            </button>
          </div>
        )}
      </div>

      {/* Filters Row: Status Filter + Category Pills */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center bg-slate-900/60 border border-white/10 rounded-2xl p-1 overflow-x-auto scrollbar-none gap-1 max-w-full">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? "bg-white/10 text-white shadow-sm border border-white/10"
                  : "text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
            >
              <span>{cat.label}</span>
              {cat.count !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    selectedCategory === cat.id ? "bg-white/20 text-white" : "bg-white/5 text-slate-400"
                  }`}
                >
                  {cat.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Status Filter (All / Active / Disabled) */}
        {setStatusFilter && (
          <div className="inline-flex p-1 bg-slate-900/60 border border-white/10 rounded-2xl shrink-0 self-start lg:self-auto">
            {["all", "active", "disabled"].map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                  statusFilter === filter
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {filter === "all" ? "All Status" : filter}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
