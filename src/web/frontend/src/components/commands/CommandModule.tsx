import React from "react";
import CommandRow from "./CommandRow";
import {
  Terminal,
  ShieldAlert,
  ShieldCheck,
  BarChart3,
  Hash,
  Wrench,
  Volume2,
  Sparkles,
  CheckCheck,
  Ban,
  Loader2,
} from "lucide-react";

function getCategoryIcon(catId) {
  switch (catId?.toLowerCase()) {
    case "moderation":
      return <ShieldAlert className="w-6 h-6 text-indigo-400" />;
    case "admin":
      return <ShieldCheck className="w-6 h-6 text-emerald-400" />;
    case "analytics":
      return <BarChart3 className="w-6 h-6 text-amber-400" />;
    case "channels":
      return <Hash className="w-6 h-6 text-sky-400" />;
    case "utility":
      return <Wrench className="w-6 h-6 text-fuchsia-400" />;
    case "fun":
      return <Sparkles className="w-6 h-6 text-pink-400" />;
    case "voice":
      return <Volume2 className="w-6 h-6 text-rose-400" />;
    default:
      return <Terminal className="w-6 h-6 text-slate-400" />;
  }
}

export default function CommandModule({
  module,
  isChannelScope,
  disabledCommands,
  pendingCommands,
  pendingModules,
  onToggleCommand,
  onToggleModule,
  onUnlockGlobal,
}) {
  const isModulePending = pendingModules.has(module.id);

  // Unprotected commands that can be toggled
  const unprotectedCommands = module.commands.filter((c) => !c.isProtected);
  const canToggleModule = unprotectedCommands.length > 0;

  // Active / Disabled count in this module
  const disabledInModule = unprotectedCommands.filter((c) => {
    const isOffInScope = disabledCommands.includes(c.name.toLowerCase());
    const isOffGlobal = isChannelScope && c.guildDisabled;
    return isOffInScope || isOffGlobal;
  }).length;

  const activeInModule = unprotectedCommands.length - disabledInModule;
  const isAllDisabled = unprotectedCommands.length > 0 && disabledInModule === unprotectedCommands.length;
  const isAllActive = unprotectedCommands.length > 0 && disabledInModule === 0;

  return (
    <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-xl bg-slate-900/40">
      {/* Module Header */}
      <div className="p-6 sm:p-7 border-b border-white/10 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-slate-950 rounded-2xl border border-white/10 shadow-inner shrink-0">
            {getCategoryIcon(module.id)}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white capitalize tracking-tight">
                {module.name || `${module.id} Suite`}
              </h2>
              {canToggleModule && (
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full border shadow-sm ${
                    isAllActive
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                      : isAllDisabled
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/25"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/25"
                  }`}
                >
                  {isAllActive
                    ? "All Commands Active"
                    : isAllDisabled
                    ? "Module Disabled"
                    : `${activeInModule} Active • ${disabledInModule} Disabled`}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {module.commands.length} commands total • {module.description || `${module.id} commands module`}
            </p>
          </div>
        </div>

        {/* Category-Wide Controls: Enable All & Disable All options */}
        {canToggleModule && (
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {/* Enable All in Module */}
            <button
              type="button"
              onClick={() => onToggleModule(module.id, true)}
              disabled={isModulePending || isAllActive}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                isAllActive
                  ? "opacity-35 cursor-not-allowed bg-slate-950 text-slate-500 border-white/5"
                  : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20 hover:text-white"
              } disabled:opacity-40 shadow-sm`}
              title="Enable all commands in this category"
            >
              {isModulePending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCheck className="w-4 h-4 text-emerald-400" />
              )}
              <span>Enable All</span>
            </button>

            {/* Disable All in Module */}
            <button
              type="button"
              onClick={() => onToggleModule(module.id, false)}
              disabled={isModulePending || isAllDisabled}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                isAllDisabled
                  ? "opacity-35 cursor-not-allowed bg-slate-950 text-slate-500 border-white/5"
                  : "bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20 hover:text-white"
              } disabled:opacity-40 shadow-sm`}
              title="Disable all commands in this category"
            >
              {isModulePending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Ban className="w-4 h-4 text-rose-400" />
              )}
              <span>Disable All</span>
            </button>
          </div>
        )}
      </div>

      {/* Spacious 2-Column Responsive Command Cards Grid */}
      <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
        {module.commands.map((cmd) => (
          <CommandRow
            key={cmd.name}
            command={cmd}
            isGloballyDisabled={cmd.guildDisabled}
            isChannelScope={isChannelScope}
            isDisabledInScope={disabledCommands.includes(cmd.name.toLowerCase())}
            isPending={pendingCommands.has(cmd.name) || isModulePending}
            onToggle={onToggleCommand}
            onUnlockGlobal={onUnlockGlobal}
          />
        ))}
      </div>
    </div>
  );
}
