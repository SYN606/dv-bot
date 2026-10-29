import React from "react";
import {
  Search,
  X,
  Filter,
  User,
  Shield,
  Layers,
  Bot,
  Hash,
  MessageSquare,
  Sparkles,
} from "lucide-react";

const CATEGORIES = [
  { id: "all", label: "All Events", icon: Layers },
  { id: "moderation", label: "Moderation", icon: Shield },
  { id: "members", label: "Members", icon: User },
  { id: "channels", label: "Channels", icon: Hash },
  { id: "roles", label: "Roles", icon: Sparkles },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "server", label: "Server & Bots", icon: Bot },
];

export default function AuditLogFilters({
  category,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  actionType,
  onActionTypeChange,
  availableActions = [],
  executorId,
  onExecutorChange,
  executors = [],
  hideBots,
  onToggleHideBots,
  limit,
  onLimitChange,
  totalResults,
}) {
  // Filter available actions based on chosen category if category !== "all"
  const filteredActionOptions = availableActions.filter((a) => {
    if (category === "all") return true;
    return a.category === category;
  });

  return (
    <div className="space-y-4">
      {/* 1. Category Pill Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = category === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                onSelectCategory(cat.id);
                // Reset actionType if it doesn't belong to new category
                if (cat.id !== "all" && actionType !== "all") {
                  const match = availableActions.find(
                    (a) => String(a.id) === String(actionType) && a.category === cat.id
                  );
                  if (!match) onActionTypeChange("all");
                }
              }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
                isActive
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 ring-1 ring-indigo-400/30"
                  : "bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-white/5"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Controls Toolbar: Search + Action Filter + Executor Filter + Hide Bots */}
      <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-white/10 bg-slate-900/50 flex flex-wrap items-center justify-between gap-3 shadow-lg shadow-black/20">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by user, target, reason, or action..."
            className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Action Type Dropdown */}
        <div className="w-full sm:w-auto">
          <select
            value={actionType}
            onChange={(e) => onActionTypeChange(e.target.value)}
            className="w-full sm:w-44 px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Action Types</option>
            {filteredActionOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>

        {/* Executor / Moderator Dropdown */}
        <div className="w-full sm:w-auto">
          <select
            value={executorId}
            onChange={(e) => onExecutorChange(e.target.value)}
            className="w-full sm:w-44 px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Executors / Staff</option>
            {executors.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.tag || ex.username} {ex.bot ? "(Bot)" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Hide Bot Actions Toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none px-2 py-1 rounded-lg hover:bg-white/5 transition-colors">
          <input
            type="checkbox"
            checked={hideBots}
            onChange={(e) => onToggleHideBots(e.target.checked)}
            className="sr-only"
          />
          <div
            className={`w-7 h-4 rounded-full transition-colors relative flex items-center ${
              hideBots ? "bg-indigo-600" : "bg-slate-700"
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full bg-white transition-transform ${
                hideBots ? "translate-x-3.5" : "translate-x-0.5"
              }`}
            />
          </div>
          <span className="text-xs text-slate-300 font-medium whitespace-nowrap">
            Human Staff Only
          </span>
        </label>

        {/* Limit Selector & Result Count */}
        <div className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
          <span className="hidden md:inline font-mono">
            {totalResults} {totalResults === 1 ? "entry" : "entries"}
          </span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-white/10 text-xs text-slate-300 focus:outline-none"
          >
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
        </div>
      </div>
    </div>
  );
}
