import React, { useState, useEffect } from "react";
import {
  X,
  Globe,
  CheckCircle2,
  Ban,
  Search,
  Hash,
  Volume2,
  Sparkles,
  ShieldAlert,
  Terminal,
  Loader2,
  Check,
} from "lucide-react";

export default function CommandChannelRuleModal({
  isOpen,
  onClose,
  target,
  isCategory = false,
  channels = [],
  onSave,
  isPending = false,
}) {
  const [mode, setMode] = useState("everywhere");
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (target && isOpen) {
      const existingRule = target.channelRule || {};
      const currentMode = existingRule.mode || "everywhere";
      setMode(currentMode);

      const initialChannels =
        currentMode === "enable_only"
          ? existingRule.allowChannels || existingRule.channels || []
          : currentMode === "disable_only"
          ? existingRule.denyChannels || existingRule.channels || []
          : [];

      setSelectedChannels(Array.isArray(initialChannels) ? [...initialChannels] : []);
      setSearch("");
    }
  }, [target, isOpen]);

  if (!isOpen || !target) return null;

  const featureKey = isCategory
    ? `category:${target.id || target.name?.toLowerCase()}`
    : target.name?.toLowerCase();

  const titleName = isCategory
    ? `Category: ${target.name || target.id}`
    : `/${target.name}`;

  const filteredChannels = (channels || []).filter((ch) => {
    if (!search) return true;
    return ch.name?.toLowerCase().includes(search.toLowerCase());
  });

  const handleToggleChannel = (channelId) => {
    setSelectedChannels((prev) => {
      if (prev.includes(channelId)) {
        return prev.filter((id) => id !== channelId);
      } else {
        return [...prev, channelId];
      }
    });
  };

  const handleSelectAll = () => {
    const allIds = (channels || []).map((ch) => String(ch.id));
    setSelectedChannels(allIds);
  };

  const handleClearSelection = () => {
    setSelectedChannels([]);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (mode !== "everywhere" && selectedChannels.length === 0) {
      // If user selected whitelist/blacklist but didn't pick channels, revert to everywhere
      await onSave(featureKey, "everywhere", []);
    } else {
      await onSave(featureKey, mode, selectedChannels);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="glass-card max-w-xl w-full rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200 my-8"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                {isCategory ? "Category Rule" : "Command Policy"}
              </span>
              <span className="text-xs font-mono text-white/50">{titleName}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Channel Availability Rules</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {isCategory
                ? `Manage which channels all commands in category '${target.name}' can be executed in.`
                : `Control exactly where '${titleName}' can or cannot be executed in this server.`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Cards */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Restriction Mode
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Mode 1: Everywhere */}
            <button
              type="button"
              onClick={() => setMode("everywhere")}
              className={`flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all ${
                mode === "everywhere"
                  ? "bg-indigo-600/15 border-indigo-500/50 shadow-lg shadow-indigo-500/10"
                  : "bg-slate-900/60 border-white/5 hover:border-white/15"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className={`p-2 rounded-xl ${mode === "everywhere" ? "bg-indigo-500/20 text-indigo-400" : "bg-white/5 text-slate-400"}`}>
                  <Globe className="w-4 h-4" />
                </div>
                {mode === "everywhere" && <Check className="w-4 h-4 text-indigo-400" />}
              </div>
              <span className="text-xs font-bold text-white">Everywhere</span>
              <span className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Allowed in all channels
              </span>
            </button>

            {/* Mode 2: Enable Only In (Whitelist) */}
            <button
              type="button"
              onClick={() => setMode("enable_only")}
              className={`flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all ${
                mode === "enable_only"
                  ? "bg-emerald-600/15 border-emerald-500/50 shadow-lg shadow-emerald-500/10"
                  : "bg-slate-900/60 border-white/5 hover:border-white/15"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className={`p-2 rounded-xl ${mode === "enable_only" ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-slate-400"}`}>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                {mode === "enable_only" && <Check className="w-4 h-4 text-emerald-400" />}
              </div>
              <span className="text-xs font-bold text-white">Enable Only In</span>
              <span className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Allowed only in selected
              </span>
            </button>

            {/* Mode 3: Disable Only In (Blacklist) */}
            <button
              type="button"
              onClick={() => setMode("disable_only")}
              className={`flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all ${
                mode === "disable_only"
                  ? "bg-rose-600/15 border-rose-500/50 shadow-lg shadow-rose-500/10"
                  : "bg-slate-900/60 border-white/5 hover:border-white/15"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className={`p-2 rounded-xl ${mode === "disable_only" ? "bg-rose-500/20 text-rose-400" : "bg-white/5 text-slate-400"}`}>
                  <Ban className="w-4 h-4" />
                </div>
                {mode === "disable_only" && <Check className="w-4 h-4 text-rose-400" />}
              </div>
              <span className="text-xs font-bold text-white">Disable Only In</span>
              <span className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Blocked in selected
              </span>
            </button>
          </div>
        </div>

        {/* Channel Selection Box (Only visible if mode != everywhere) */}
        {mode !== "everywhere" && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>
                  {mode === "enable_only" ? "Whitelisted Channels" : "Blacklisted Channels"}
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  mode === "enable_only"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-rose-500/20 text-rose-300"
                }`}>
                  {selectedChannels.length} selected
                </span>
              </label>

              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Select All
                </button>
                <span className="text-slate-600">•</span>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-slate-400 hover:text-rose-400 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Selected Channel Chips */}
            {selectedChannels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 rounded-2xl bg-black/30 border border-white/5">
                {selectedChannels.map((cId) => {
                  const ch = (channels || []).find((c) => String(c.id) === String(cId));
                  return (
                    <span
                      key={cId}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800 border border-white/10 text-xs text-slate-200 font-mono shadow-sm"
                    >
                      <Hash className="w-3 h-3 text-slate-400" />
                      <span>{ch ? ch.name : cId}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleChannel(cId)}
                        className="hover:text-rose-400 p-0.5 rounded transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Channel Search & List */}
            <div className="rounded-2xl bg-slate-900/80 border border-white/10 p-3 space-y-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter channels..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950/80 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {filteredChannels.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-500">
                    No matching channels found.
                  </div>
                ) : (
                  filteredChannels.map((ch) => {
                    const isSelected = selectedChannels.includes(String(ch.id));
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => handleToggleChannel(String(ch.id))}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                          isSelected
                            ? mode === "enable_only"
                              ? "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30 font-medium"
                              : "bg-rose-500/15 text-rose-200 border border-rose-500/30 font-medium"
                            : "text-slate-300 hover:bg-white/5 border border-transparent"
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <Hash className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                          <span className="truncate">{ch.name}</span>
                        </span>
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors ${
                            isSelected
                              ? mode === "enable_only"
                                ? "bg-emerald-500 border-emerald-400 text-white"
                                : "bg-rose-500 border-rose-400 text-white"
                              : "border-white/20 bg-slate-950"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-crimson to-rose-600 hover:from-rose-500 hover:to-brand-crimson transition-all shadow-lg shadow-brand-crimson/25 disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Rules...</span>
              </>
            ) : (
              <span>Save Channel Rules</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
