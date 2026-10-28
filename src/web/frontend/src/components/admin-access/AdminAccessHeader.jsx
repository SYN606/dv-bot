import React from "react";
import { ShieldCheck, Info } from "lucide-react";

export default function AdminAccessHeader() {
  return (
    <div className="space-y-4 mb-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm font-display text-indigo-400 tracking-wider">पहुँच नियंत्रण</span>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest opacity-80">/ Dashboard & Bot Access</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Admin & Dashboard Access</h1>
        <p className="text-sm text-slate-400">
          Control which Discord roles and members are authorized to access this web dashboard and configure bot settings.
        </p>
      </div>

      <div className="p-4 rounded-2xl glass-panel bg-slate-900/60 border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Access Hierarchy Rules</div>
            <div className="text-[11px] text-slate-400">
              Server Owner and Discord Administrators have full access by default. Additional roles and members authorized below can log in and manage the dashboard without requiring server admin permissions.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
