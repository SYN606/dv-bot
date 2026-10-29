import React, { useState } from "react";
import {
  Search,
  X,
  User,
  Shield,
  Layers,
  Bot,
  Hash,
  MessageSquare,
  Sparkles,
  Zap,
  Clock,
  Filter,
  Check,
  ChevronDown,
  Trash2,
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

const PRESETS = [
  { id: "all", label: "All Activity", icon: Layers },
  { id: "high_impact", label: "High Impact", icon: Zap, color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  { id: "moderation_only", label: "Moderation", icon: Shield, color: "text-rose-400 bg-rose-500/10 border-rose-500/30" },
  { id: "staff_activity", label: "Staff Ops", icon: User, color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30" },
  { id: "channel_perms", label: "Channels", icon: Hash, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" },
  { id: "deletions", label: "Purges & Deletes", icon: Trash2, color: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
];

const TIME_WINDOWS = [
  { id: "all", label: "All Time" },
  { id: "1h", label: "< 1 Hour" },
  { id: "24h", label: "< 24 Hours" },
  { id: "7d", label: "< 7 Days" },
];

export default function AuditLogFilters({
  category,
  onSelectCategory,
  preset,
  onSelectPreset,
  timeWindow,
  onSelectTimeWindow,
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
  categoryStats = {},
}) {
  const [executorDropdownOpen, setExecutorDropdownOpen] = useState(false);
  const [actionDropdownOpen, setActionDropdownOpen] = useState(false);

  // Selected executor details
  const selectedExecutor = executors.find((e) => e.id === executorId);
  const selectedAction = availableActions.find((a) => String(a.id) === String(actionType));

  // Compute Distribution Percentages for the Visual Heatline
  const total = totalResults || 1;
  const modPercent = Math.round(((categoryStats.moderation || 0) / total) * 100);
  const memberPercent = Math.round(((categoryStats.members || 0) / total) * 100);
  const channelPercent = Math.round(((categoryStats.channels || 0) / total) * 100);
  const rolePercent = Math.round(((categoryStats.roles || 0) / total) * 100);
  const msgPercent = Math.round(((categoryStats.messages || 0) / total) * 100);

  return (
    <div className="space-y-4">
      {/* 1. Smart Preset Chips (Modern Alternative to Traditional Dropdowns) */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-mono text-slate-500 uppercase tracking-widest mr-1 font-bold">
            Presets:
          </span>
          {PRESETS.map((p) => {
            const Icon = p.icon;
            const isActive = preset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPreset(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                  isActive
                    ? p.color || "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20"
                    : "bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-white/5"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* Time-Window Chips */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-white/10 shrink-0">
          <Clock className="w-3 h-3 text-slate-500 ml-1.5 mr-0.5" />
          {TIME_WINDOWS.map((tw) => {
            const isActive = timeWindow === tw.id;
            return (
              <button
                key={tw.id}
                type="button"
                onClick={() => onSelectTimeWindow(tw.id)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tw.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Visual Distribution Activity Heatline */}
      {totalResults > 0 && (
        <div className="space-y-1.5">
          <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden flex ring-1 ring-white/5">
            {modPercent > 0 && (
              <div
                style={{ width: `${modPercent}%` }}
                className="bg-rose-500 h-full transition-all"
                title={`Moderation: ${categoryStats.moderation || 0}`}
              />
            )}
            {memberPercent > 0 && (
              <div
                style={{ width: `${memberPercent}%` }}
                className="bg-indigo-500 h-full transition-all"
                title={`Members: ${categoryStats.members || 0}`}
              />
            )}
            {channelPercent > 0 && (
              <div
                style={{ width: `${channelPercent}%` }}
                className="bg-cyan-500 h-full transition-all"
                title={`Channels: ${categoryStats.channels || 0}`}
              />
            )}
            {rolePercent > 0 && (
              <div
                style={{ width: `${rolePercent}%` }}
                className="bg-amber-500 h-full transition-all"
                title={`Roles: ${categoryStats.roles || 0}`}
              />
            )}
            {msgPercent > 0 && (
              <div
                style={{ width: `${msgPercent}%` }}
                className="bg-purple-500 h-full transition-all"
                title={`Messages: ${categoryStats.messages || 0}`}
              />
            )}
          </div>
        </div>
      )}

      {/* 3. Omnisearch Bar with Syntax Helper Pills */}
      <div className="glass-panel p-4 rounded-2xl border border-white/10 bg-slate-900/60 space-y-3 shadow-lg shadow-black/20">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Tokenized Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search or filter: by:username target:general reason:spam action:kick..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-sans"
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

          {/* Custom Modern Executor Popover (Replaces traditional select) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setExecutorDropdownOpen(!executorDropdownOpen)}
              className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-slate-200 flex items-center justify-between gap-2 hover:border-white/20 transition-colors shrink-0"
            >
              <div className="flex items-center gap-2 truncate max-w-[150px]">
                {selectedExecutor?.avatar ? (
                  <img src={selectedExecutor.avatar} alt="" className="w-4 h-4 rounded-full object-cover shrink-0" />
                ) : (
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
                <span className="truncate">{selectedExecutor ? selectedExecutor.tag : "All Staff / Bots"}</span>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {executorDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setExecutorDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-64 max-h-72 overflow-y-auto rounded-2xl glass-panel bg-slate-900 border border-white/15 shadow-2xl p-1.5 z-50 animate-in zoom-in-95 duration-150 scrollbar-thin">
                  <div className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold border-b border-white/5">
                    Filter by Moderator / Bot
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onExecutorChange("all");
                      setExecutorDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                      executorId === "all" ? "bg-indigo-600/20 text-indigo-300 font-bold" : "text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    <span>All Staff &amp; Bots</span>
                    {executorId === "all" && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                  </button>

                  {executors.map((ex) => (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => {
                        onExecutorChange(ex.id);
                        setExecutorDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                        executorId === ex.id ? "bg-indigo-600/20 text-indigo-300 font-bold" : "text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {ex.avatar ? (
                          <img src={ex.avatar} alt="" className="w-4 h-4 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-slate-800 text-[9px] flex items-center justify-center font-bold">?</div>
                        )}
                        <span className="truncate">{ex.tag || ex.username}</span>
                        {ex.bot && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-400 font-mono font-bold">
                            BOT
                          </span>
                        )}
                      </div>
                      {executorId === ex.id && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Custom Action Popover (Replaces traditional select) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActionDropdownOpen(!actionDropdownOpen)}
              className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-slate-200 flex items-center justify-between gap-2 hover:border-white/20 transition-colors shrink-0"
            >
              <div className="flex items-center gap-2 truncate max-w-[140px]">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{selectedAction ? selectedAction.name : "All Action Types"}</span>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {actionDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setActionDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-64 max-h-72 overflow-y-auto rounded-2xl glass-panel bg-slate-900 border border-white/15 shadow-2xl p-1.5 z-50 animate-in zoom-in-95 duration-150 scrollbar-thin">
                  <div className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold border-b border-white/5">
                    Filter by Action Event
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onActionTypeChange("all");
                      setActionDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                      actionType === "all" ? "bg-indigo-600/20 text-indigo-300 font-bold" : "text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    <span>All Action Types</span>
                    {actionType === "all" && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                  </button>

                  {availableActions.map((act) => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => {
                        onActionTypeChange(act.id);
                        setActionDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                        String(actionType) === String(act.id) ? "bg-indigo-600/20 text-indigo-300 font-bold" : "text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      <span className="truncate">{act.name}</span>
                      {String(actionType) === String(act.id) && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Syntax Helper Chips & Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
          <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500">
            <span className="font-mono uppercase text-[10px] tracking-wider text-slate-400 font-bold">Token Quick-Insert:</span>
            <button
              type="button"
              onClick={() => onSearchChange(searchQuery ? `${searchQuery.trim()} by:` : "by:")}
              className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-300 text-slate-300 font-mono transition-colors border border-white/5"
            >
              by:user
            </button>
            <button
              type="button"
              onClick={() => onSearchChange(searchQuery ? `${searchQuery.trim()} target:` : "target:")}
              className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-300 text-slate-300 font-mono transition-colors border border-white/5"
            >
              target:name
            </button>
            <button
              type="button"
              onClick={() => onSearchChange(searchQuery ? `${searchQuery.trim()} reason:` : "reason:")}
              className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-300 text-slate-300 font-mono transition-colors border border-white/5"
            >
              reason:text
            </button>
            <button
              type="button"
              onClick={() => onSearchChange(searchQuery ? `${searchQuery.trim()} action:` : "action:")}
              className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-300 text-slate-300 font-mono transition-colors border border-white/5"
            >
              action:event
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Human Staff Only Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
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
                Staff Only
              </span>
            </label>

            {/* Entry Limit Control */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 p-0.5 rounded-lg border border-white/10 text-[11px] font-mono">
              {[25, 50, 100].map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => onLimitChange(l)}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    limit === l ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
