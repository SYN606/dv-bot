import React from "react";
import { Lock, Loader2, Check, X, Unlock } from "lucide-react";
import Switch from "../ui/Switch";

export default function CommandRow({
  command,
  isGloballyDisabled,
  isChannelScope,
  isDisabledInScope,
  isPending,
  onToggle,
  onUnlockGlobal,
}) {
  const isProtected = Boolean(command.isProtected);

  // In channel scope, if a command is disabled globally, channel override is overridden by global policy
  const blockedByGlobal = isChannelScope && isGloballyDisabled;

  // Active status
  const isEnabled = !isDisabledInScope && !blockedByGlobal;

  return (
    <div className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl hover:bg-slate-800/40 transition-colors border border-transparent hover:border-white/5">
      {/* Left: Command info, badges, aliases */}
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-white font-mono bg-white/5 px-2.5 py-0.5 rounded-lg border border-white/10">
            /{command.name}
          </span>

          {isProtected && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider border border-indigo-500/20">
              <Lock className="w-3 h-3" /> Core Protected
            </span>
          )}

          {blockedByGlobal && (
            <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider border border-rose-500/20">
              Disabled Server-Wide
            </span>
          )}

          {!isProtected && !blockedByGlobal && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border ${
                isEnabled
                  ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                  : "text-rose-400 bg-rose-500/10 border-rose-500/20"
              }`}
            >
              {isEnabled ? "Enabled" : isChannelScope ? "Blocked in Channel" : "Disabled"}
            </span>
          )}

          {command.aliases && command.aliases.length > 0 && (
            <span className="text-[11px] text-slate-500 font-mono">
              alias: {command.aliases.slice(0, 3).map((a) => `${a}`).join(", ")}
            </span>
          )}
        </div>

        <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">{command.description}</p>
      </div>

      {/* Right: Controls & Explicit Enable/Disable Action */}
      <div className="shrink-0 flex items-center gap-3 justify-end">
        {isProtected ? (
          <div className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 bg-slate-900 border border-white/5 cursor-not-allowed">
            Always Required
          </div>
        ) : blockedByGlobal ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-rose-400 font-medium">Locked (Global Off)</span>
            {onUnlockGlobal && (
              <button
                type="button"
                onClick={() => onUnlockGlobal(command.name)}
                disabled={isPending}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 transition-all disabled:opacity-50"
                title="Enable this command server-wide"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Enable Globally</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {/* Toggle Switch */}
            <Switch
              checked={isEnabled}
              disabled={isPending}
              onChange={() => onToggle(command.name, isDisabledInScope)}
            />

            {/* Explicit Action Button */}
            <button
              type="button"
              onClick={() => onToggle(command.name, isDisabledInScope)}
              disabled={isPending}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                isEnabled
                  ? "bg-slate-900 text-slate-300 border-white/10 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
              } disabled:opacity-50`}
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isEnabled ? (
                <X className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>{isPending ? "Updating..." : isEnabled ? "Disable" : "Enable"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
