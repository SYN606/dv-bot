import React from "react";
import { ChannelSelector } from "../discord";
import { Globe, Hash, RotateCcw, SlidersHorizontal, Info } from "lucide-react";

export default function CommandScopeSelector({
  guildId,
  channels,
  selectedChannel,
  setSelectedChannel,
  channelDisabledCount = 0,
  guildDisabledCount = 0,
  onResetChannel,
  onResetAll,
  isResetPending = false,
}) {
  const isGlobal = selectedChannel === "global";
  const currentChannelObj = channels.find((c) => c.id === selectedChannel);

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 mb-8 space-y-6 shadow-xl bg-slate-900/50 backdrop-blur-xl">
      {/* Top Row: Title + Scope Switcher Pills */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300">
              <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Configuration Scope</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Choose whether you are editing default global permissions or configuring channel-specific permissions.
          </p>
        </div>

        {/* Dual Scope Mode Buttons */}
        <div className="inline-flex p-1.5 bg-slate-950/80 border border-white/10 rounded-2xl shrink-0 shadow-inner">
          <button
            type="button"
            onClick={() => setSelectedChannel("global")}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              isGlobal
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 border border-indigo-400/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Server-Wide Policy</span>
            {guildDisabledCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/25 text-rose-300 font-mono border border-rose-500/30">
                {guildDisabledCount} disabled
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              if (isGlobal && channels.length > 0) {
                setSelectedChannel(channels[0].id);
              }
            }}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              !isGlobal
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 border border-emerald-400/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Hash className="w-4 h-4" />
            <span>Channel Overrides</span>
            {channelDisabledCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/25 text-amber-300 font-mono border border-amber-500/30">
                {channelDisabledCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Scope Sub-Panel */}
      {isGlobal ? (
        <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>Default Server Policy</span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                You are currently configuring commands for the entire server. Toggling any command or category here applies across all channels.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {onResetAll && (
              <button
                type="button"
                onClick={onResetAll}
                disabled={isResetPending}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-rose-500/10 text-slate-300 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
                title="Wipe all disabled and restricted commands from the database and restore all commands to default"
              >
                <RotateCcw className={`w-4 h-4 text-amber-400 ${isResetPending ? "animate-spin" : ""}`} />
                <span>Reset to Defaults</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 mt-0.5">
              <Hash className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                <span>Channel Override Mode:</span>
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 font-mono text-xs border border-emerald-500/30">
                  #{currentChannelObj?.name || "select-channel"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
                Commands disabled here will only be blocked in <span className="text-white font-medium">#{currentChannelObj?.name || "this channel"}</span>. Toggling a switch turns that command on or off for this channel.
              </p>
            </div>
          </div>

          {/* Channel Selector + Reset Action */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
            <div className="w-full sm:w-72">
              <ChannelSelector
                guildId={guildId}
                channels={channels}
                value={selectedChannel}
                onChange={setSelectedChannel}
                allowedTypes={[0, 5]}
                placeholder="Choose channel..."
              />
            </div>

            <div className="flex items-center gap-2">
              {onResetChannel && (
                <button
                  type="button"
                  onClick={onResetChannel}
                  disabled={isResetPending}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-sm"
                  title="Remove all restrictions from this channel"
                >
                  <RotateCcw className={`w-4 h-4 text-amber-400 ${isResetPending ? "animate-spin" : ""}`} />
                  <span>Reset Channel</span>
                </button>
              )}

              {onResetAll && (
                <button
                  type="button"
                  onClick={onResetAll}
                  disabled={isResetPending}
                  className="px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-400 transition-colors"
                  title="Wipe all database entries and restore everything to default"
                >
                  Reset All
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
