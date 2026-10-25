import React from "react";
import { Terminal, Sparkles, ShieldCheck } from "lucide-react";

export default function CommandHeader({ totalCommands = 43, activeCommands = 34 }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-b border-white/5 pb-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-display text-brand-crimson font-bold tracking-wider">नियंत्रण</span>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">/ Core / Command Permissions</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <span>Command Control Center</span>
        </h1>
        <p className="text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">
          Manage command availability, enforce channel-specific restrictions, and toggle functional modules across your server in real time.
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900/80 border border-white/10 text-xs text-slate-300 shadow-inner">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-white">Live Gateway Synced</span>
        </div>
      </div>
    </div>
  );
}
