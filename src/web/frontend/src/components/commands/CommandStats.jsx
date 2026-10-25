import React from "react";
import { Terminal, ShieldCheck, PowerOff, Lock } from "lucide-react";

export default function CommandStats({ stats = {} }) {
  const statItems = [
    {
      label: "Total Commands",
      value: stats?.total ?? 0,
      description: "Available in directory",
      icon: <Terminal className="w-5 h-5" />,
      color: "text-slate-200",
      bg: "bg-slate-800/40 border-white/5",
      badge: "Full Suite",
      badgeColor: "bg-white/5 text-slate-400",
    },
    {
      label: "Active & Enabled",
      value: stats?.active ?? 0,
      description: "Ready for members",
      icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
      color: "text-emerald-400",
      bg: "bg-emerald-500/5 border-emerald-500/15",
      badge: "Active",
      badgeColor: "bg-emerald-500/15 text-emerald-300",
    },
    {
      label: "Disabled Commands",
      value: stats?.disabled ?? 0,
      description: "Restricted in scope",
      icon: <PowerOff className="w-5 h-5 text-rose-400" />,
      color: "text-rose-400",
      bg: "bg-rose-500/5 border-rose-500/15",
      badge: stats?.disabled > 0 ? "Restricted" : "Clean",
      badgeColor: stats?.disabled > 0 ? "bg-rose-500/15 text-rose-300" : "bg-white/5 text-slate-400",
    },
    {
      label: "Core Protected",
      value: stats?.protected ?? 0,
      description: "Always mandatory",
      icon: <Lock className="w-5 h-5 text-indigo-400" />,
      color: "text-indigo-400",
      bg: "bg-indigo-500/5 border-indigo-500/15",
      badge: "Core Lock",
      badgeColor: "bg-indigo-500/15 text-indigo-300",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      {statItems.map((s, i) => (
        <div
          key={i}
          className={`glass-panel p-5 sm:p-6 rounded-3xl border ${s.bg} flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:border-white/20 shadow-lg`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-2xl bg-slate-900/90 border border-white/10 shadow-inner">
              {s.icon}
            </div>
            <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full uppercase tracking-wider font-bold ${s.badgeColor}`}>
              {s.badge}
            </span>
          </div>

          <div>
            <div className={`text-3xl sm:text-4xl font-black tracking-tight ${s.color}`}>
              {s.value}
            </div>
            <div className="text-xs font-bold text-white mt-1">{s.label}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{s.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
