import React from "react";

export default function StickyHeader({ activeCount, totalRepins }) {
  return (
    <div className="mb-8 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm font-display text-brand-crimson tracking-wider">स्वचालन</span>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest opacity-80">/ Automation / Messaging</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Sticky Notices</h1>
        <p className="text-sm text-slate-400">Keep important announcements visible by automatically reposting them after channel activity.</p>
      </div>
      <div className="shrink-0 flex items-center gap-3 bg-slate-900/50 px-4 py-2 rounded-xl border border-white/5">
        <div className="text-sm font-bold text-white">
          {activeCount} <span className="text-slate-400 font-normal">Active</span>
        </div>
        <div className="w-1 h-1 rounded-full bg-slate-600"></div>
        <div className="text-sm font-bold text-white">
          {totalRepins.toLocaleString()} <span className="text-slate-400 font-normal">Repins</span>
        </div>
      </div>
    </div>
  );
}
