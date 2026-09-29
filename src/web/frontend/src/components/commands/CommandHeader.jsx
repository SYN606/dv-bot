import React from "react";
import { Terminal } from "lucide-react";

export default function CommandHeader() {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-sm font-display text-brand-crimson tracking-wider">नियंत्रण</span>
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest opacity-80">/ Core / Settings</span>
      </div>
      <h1 className="text-3xl font-bold text-white tracking-tight mb-2 flex items-center gap-3">
        Command Control Center
      </h1>
      <p className="text-sm text-slate-400">Manage permissions, enable or disable modules, and restrict command usage across your server.</p>
    </div>
  );
}
