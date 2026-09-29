import React from "react";
import { Lock, Loader2 } from "lucide-react";

export default function CommandRow({ command, isGloballyDisabled, isChannelScope, isDisabledInScope, isPending, onToggle }) {
  const isProtected = command.isProtected;
  
  // A command can't be toggled in a channel if it's already disabled globally
  const blockedByGlobal = isChannelScope && isGloballyDisabled;

  return (
    <div className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl hover:bg-slate-800/50 transition-colors border border-transparent hover:border-white/5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold text-white font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10">/{command.name}</span>
          {isProtected && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded uppercase tracking-widest border border-indigo-500/20">
              <Lock className="w-3 h-3" /> Core
            </span>
          )}
          {blockedByGlobal && (
            <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded uppercase tracking-widest border border-rose-500/20">
              Globally Disabled
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 line-clamp-2">{command.description}</p>
      </div>

      <div className="shrink-0 flex items-center justify-end">
        {isProtected ? (
          <div className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 bg-slate-900 border border-white/5 cursor-not-allowed">
            Required
          </div>
        ) : (
          <button
            onClick={() => onToggle(command.name, isDisabledInScope)}
            disabled={isPending || blockedByGlobal}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${
              blockedByGlobal
                ? "bg-white/5 text-white/50 border-white/10 cursor-not-allowed"
                : isDisabledInScope
                  ? "bg-slate-900 text-slate-400 hover:text-white border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/10"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20"
            } disabled:opacity-50`}
            title={blockedByGlobal ? "Globally disabled." : isDisabledInScope ? "Click to enable" : "Click to disable"}
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <span className={`w-1.5 h-1.5 rounded-full ${blockedByGlobal ? "bg-rose-500/50" : isDisabledInScope ? "bg-slate-500" : "bg-emerald-400 animate-pulse"}`} />
            )}
            <span>{blockedByGlobal ? "Locked" : isPending ? "Saving..." : isDisabledInScope ? "Enable" : "Active"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
