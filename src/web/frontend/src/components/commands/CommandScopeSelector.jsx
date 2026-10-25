import React from "react";
import { ChannelSelector } from "../discord";
import { Globe, Hash, RotateCcw, AlertCircle } from "lucide-react";

export default function CommandScopeSelector({
  guildId,
  channels,
  selectedChannel,
  setSelectedChannel,
  channelDisabledCount = 0,
  guildDisabledCount = 0,
  onResetChannel,
  isResetPending = false,
}) {
  const isGlobal = selectedChannel === "global";
  const currentChannelObj = channels.find((c) => c.id === selectedChannel);

  return (
    <div className="glass-panel p-6 rounded-3xl border border-white/5 mb-8 space-y-6">
      {/* Scope Mode Switcher Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Configuration Scope
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Choose whether to configure global server defaults or override rules for a specific channel.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex p-1 bg-slate-900 border border-white/10 rounded-2xl shrink-0">
          <button
            type="button"
            onClick={() => setSelectedChannel("global")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              isGlobal
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Server-Wide Policy</span>
            {guildDisabledCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/20 text-rose-300 font-mono">
                {guildDisabledCount} off
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
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              !isGlobal
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/25"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>Channel Overrides</span>
            {channelDisabledCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-mono">
                {channelDisabledCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Scope Details / Channel Dropdown */}
      {isGlobal ? (
        <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Applying Default Server-Wide Policy</div>
              <p className="text-xs text-slate-400 mt-0.5">
                Commands disabled here will be completely unavailable across all server channels.
              </p>
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/5 text-xs text-indigo-300 font-medium">
            Global Scope Active
          </div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white flex items-center gap-2">
                <span>Overriding rules for</span>
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 font-mono text-xs border border-emerald-500/20">
                  #{currentChannelObj?.name || "selected-channel"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-lg">
                Commands disabled here only affect this specific channel. Server-wide disabled commands remain locked.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="w-full sm:w-64">
              <ChannelSelector
                guildId={guildId}
                channels={channels}
                value={selectedChannel}
                onChange={setSelectedChannel}
                allowedTypes={[0, 5]}
                placeholder="Select channel..."
              />
            </div>

            {onResetChannel && (
              <button
                type="button"
                onClick={onResetChannel}
                disabled={isResetPending}
                className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                title="Remove all channel restrictions and revert to server defaults"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isResetPending ? "animate-spin" : ""}`} />
                <span>Reset Channel</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
