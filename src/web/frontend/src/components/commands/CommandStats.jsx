import React from "react";
import { Terminal, ShieldAlert, PowerOff, ShieldCheck } from "lucide-react";

export default function CommandStats({ stats }) {
  const statItems = [
    { label: "Total Commands", value: stats.total, icon: <Terminal className="w-4 h-4" />, color: "text-slate-400" },
    { label: "Active", value: stats.active, icon: <ShieldCheck className="w-4 h-4" />, color: "text-emerald-400" },
    { label: "Disabled", value: stats.disabled, icon: <PowerOff className="w-4 h-4" />, color: "text-rose-400" },
    { label: "Protected", value: stats.protected, icon: <ShieldAlert className="w-4 h-4" />, color: "text-indigo-400" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {statItems.map((s, i) => (
        <div key={i} className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className={`p-2.5 rounded-xl bg-white/5 ${s.color}`}>
            {s.icon}
          </div>
          <div>
            <div className="text-xl font-extrabold text-white">{s.value}</div>
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
