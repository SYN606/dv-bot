import React from "react";
import { Lock, Loader2, Check, X, Unlock, Terminal } from "lucide-react";
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
  const blockedByGlobal = isChannelScope && isGloballyDisabled;
  const isEnabled = !isDisabledInScope && !blockedByGlobal;

  return (
    <div
      className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-4 shadow-sm ${
        blockedByGlobal
          ? "bg-slate-950/40 border-rose-500/10 opacity-80"
          : !isEnabled
          ? "bg-slate-950/60 border-white/5 hover:border-white/10"
          : "bg-slate-900/60 border-white/10 hover:border-white/20 hover:shadow-lg hover:shadow-black/25"
      }`}
    >
      {/* Top Header Row: Command Pill + Badges + Controls */}
      <div className="flex items-start justify-between gap-4">
        {/* Left: Command Name & Status Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-bold text-white font-mono bg-white/10 px-3 py-1 rounded-xl border border-white/15 tracking-tight shadow-sm">
            /{command.name}
          </span>

          {isProtected && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-lg uppercase tracking-wider border border-indigo-500/20">
              <Lock className="w-3 h-3" /> Core Lock
            </span>
          )}

          {blockedByGlobal && (
            <span className="text-[10px] font-bold text-rose-400 bg-rose-500/15 px-2.5 py-0.5 rounded-lg uppercase tracking-wider border border-rose-500/25">
              Disabled Server-Wide
            </span>
          )}

          {!isProtected && !blockedByGlobal && (
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg uppercase tracking-wider border ${
                isEnabled
                  ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                  : "text-rose-400 bg-rose-500/10 border-rose-500/20"
              }`}
            >
              {isEnabled ? "Enabled" : isChannelScope ? "Blocked in Channel" : "Disabled"}
            </span>
          )}
        </div>

        {/* Right: Toggle Switch & Action Button */}
        <div className="shrink-0 flex items-center gap-3">
          {isProtected ? (
            <div className="px-3 py-1 rounded-xl text-xs font-semibold text-slate-500 bg-slate-900 border border-white/5 cursor-not-allowed">
              Always Active
            </div>
          ) : blockedByGlobal ? (
            <div className="flex items-center gap-2">
              {onUnlockGlobal && (
                <button
                  type="button"
                  onClick={() => onUnlockGlobal(command.name)}
                  disabled={isPending}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
                  title="Enable this command server-wide"
                >
                  <Unlock className="w-3.5 h-3.5 text-rose-400" />
                  <span>Enable Globally</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Switch
                checked={isEnabled}
                disabled={isPending}
                onChange={() => onToggle(command.name, isDisabledInScope)}
              />

              <button
                type="button"
                onClick={() => onToggle(command.name, isDisabledInScope)}
                disabled={isPending}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 shadow-sm ${
                  isEnabled
                    ? "bg-slate-900 text-slate-300 border-white/10 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20"
                    : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20 hover:text-white"
                } disabled:opacity-50`}
              >
                {isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isEnabled ? (
                  <X className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>{isPending ? "Saving..." : isEnabled ? "Disable" : "Enable"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Middle: Command Description */}
      <p className="text-sm text-slate-300 leading-relaxed min-h-[2.5rem]">
        {command.description || "No description provided."}
      </p>

      {/* Bottom Footer: Aliases & Syntax Metadata */}
      {command.aliases && command.aliases.length > 0 && (
        <div className="pt-3 border-t border-white/5 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-slate-500 font-mono font-medium">aliases:</span>
          {command.aliases.slice(0, 4).map((alias) => (
            <span
              key={alias}
              className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/5"
            >
              {alias}
            </span>
          ))}
          {command.aliases.length > 4 && (
            <span className="text-[10px] text-slate-500 font-mono">
              +{command.aliases.length - 4} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}
