import React from "react";
import {
  Search,
  X,
  CheckCheck,
  Ban,
  SlidersHorizontal,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  BarChart3,
  Hash,
  Wrench,
  Volume2,
  Terminal,
} from "lucide-react";

function getCategoryIconSmall(catId) {
  switch (catId?.toLowerCase()) {
    case "moderation":
      return <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />;
    case "admin":
      return <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />;
    case "analytics":
      return <BarChart3 className="w-3.5 h-3.5 text-amber-400" />;
    case "channels":
      return <Hash className="w-3.5 h-3.5 text-sky-400" />;
    case "utility":
      return <Wrench className="w-3.5 h-3.5 text-fuchsia-400" />;
    case "fun":
      return <Sparkles className="w-3.5 h-3.5 text-pink-400" />;
    case "voice":
      return <Volume2 className="w-3.5 h-3.5 text-rose-400" />;
    default:
      return <Terminal className="w-3.5 h-3.5 text-slate-400" />;
  }
}

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
  totalDisabled = 0,
  totalActive = 0,
}) {
  return (
    <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/10 mb-8 space-y-5 shadow-xl bg-slate-900/40">
      {/* Row 1: Search Bar + Status Filter + Global Bulk Actions */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search commands, syntax, descriptions, or aliases (e.g. ship, ban, kiss)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-10 py-3.5 bg-slate-950/80 border border-white/10 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Right Controls: Status Filter & Bulk Buttons */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Status Tabs */}
          {setStatusFilter && (
            <div className="inline-flex p-1 bg-slate-950/80 border border-white/10 rounded-2xl shrink-0">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === "all"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                All Status
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === "active"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/25"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Active ({totalActive})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("disabled")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === "disabled"
                    ? "bg-rose-600 text-white shadow-md shadow-rose-500/25"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Disabled ({totalDisabled})
              </button>
            </div>
          )}

          {/* Bulk Enable / Disable Buttons */}
          {onOpenBulkConfirm && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenBulkConfirm(true)}
                disabled={isBulkPending}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-40"
                title="Enable all commands in this scope"
              >
                <CheckCheck className="w-4 h-4 text-emerald-400" />
                <span>Enable All</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenBulkConfirm(false)}
                disabled={isBulkPending}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-40"
                title="Disable all commands in this scope"
              >
                <Ban className="w-4 h-4 text-rose-400" />
                <span>Disable All</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Category Navigation Pills with Icons & Counts */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none flex-wrap">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                isSelected
                  ? "bg-white/15 text-white border-white/25 shadow-lg shadow-black/20"
                  : "bg-slate-950/60 text-slate-400 hover:text-white hover:bg-white/5 border-white/5"
              }`}
            >
              {cat.id !== "all" && getCategoryIconSmall(cat.id)}
              <span>{cat.label}</span>
              {cat.count !== undefined && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    isSelected ? "bg-white/20 text-white" : "bg-white/5 text-slate-400"
                  }`}
                >
                  {cat.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
