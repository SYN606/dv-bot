import React from "react";
import CommandRow from "./CommandRow";
import { Terminal, ShieldAlert, ShieldCheck, BarChart3, Hash, Wrench, Volume2, Power, Loader2 } from "lucide-react";

function getCategoryIcon(catId) {
  switch (catId?.toLowerCase()) {
    case "moderation": return <ShieldAlert className="w-5 h-5 text-indigo-400" />;
    case "admin": return <ShieldCheck className="w-5 h-5 text-emerald-400" />;
    case "analytics": return <BarChart3 className="w-5 h-5 text-amber-400" />;
    case "channels": return <Hash className="w-5 h-5 text-sky-400" />;
    case "utility": return <Wrench className="w-5 h-5 text-fuchsia-400" />;
    case "voice": return <Volume2 className="w-5 h-5 text-rose-400" />;
    default: return <Terminal className="w-5 h-5 text-slate-400" />;
  }
}

export default function CommandModule({ module, isChannelScope, disabledCommands, pendingCommands, pendingModules, onToggleCommand, onToggleModule }) {
  const isModulePending = pendingModules.has(module.id);
  
  // Calculate module-level toggle state based on its unprotected commands
  const unprotectedCommands = module.commands.filter(c => !c.isProtected);
  const canToggleModule = unprotectedCommands.length > 0;
  
  // Count how many unprotected commands are currently disabled
  const disabledCount = unprotectedCommands.filter(c => disabledCommands.includes(c.name)).length;
  // If ALL unprotected commands are disabled, the module is effectively off
  const isModuleOff = unprotectedCommands.length > 0 && disabledCount === unprotectedCommands.length;

  return (
    <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden">
      {/* Module Header */}
      <div className="p-6 border-b border-white/5 bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-900 rounded-2xl border border-white/5 shadow-inner">
            {getCategoryIcon(module.id)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white capitalize">{module.id} Commands</h2>
            <p className="text-xs text-slate-400">{module.commands.length} commands total</p>
          </div>
        </div>

        {canToggleModule && (
          <button
            onClick={() => onToggleModule(module.id, isModuleOff)}
            disabled={isModulePending}
            className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              isModuleOff
                ? "bg-slate-900 text-slate-300 hover:text-white border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/10"
                : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
            } disabled:opacity-50`}
          >
            {isModulePending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Power className="w-4 h-4" />
            )}
            {isModulePending ? "Applying..." : isModuleOff ? "Enable Module" : "Disable Module"}
          </button>
        )}
      </div>

      {/* Commands List */}
      <div className="p-2 space-y-1">
        {module.commands.map(cmd => (
          <CommandRow
            key={cmd.name}
            command={cmd}
            isGloballyDisabled={cmd.guildDisabled}
            isChannelScope={isChannelScope}
            isDisabledInScope={disabledCommands.includes(cmd.name)}
            isPending={pendingCommands.has(cmd.name) || isModulePending}
            onToggle={onToggleCommand}
          />
        ))}
      </div>
    </div>
  );
}
