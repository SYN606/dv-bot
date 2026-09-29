import React from "react";
import Badge from "../ui/Badge";

export default function MediaOnlyHeader({ activeCount }) {
  return (
    <div className="mb-8 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm font-display text-brand-crimson tracking-wider">नियम</span>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest opacity-80">/ Moderation / Media Control</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Media-Only Channels</h1>
        <p className="text-sm text-slate-400">Keep selected channels focused on media by automatically removing unsupported messages.</p>
      </div>
      <div className="shrink-0 flex items-center gap-3 bg-slate-900/50 px-4 py-2 rounded-xl border border-white/5">
        <Badge variant={activeCount > 0 ? "brand" : "default"}>
          {activeCount} {activeCount === 1 ? "Rule" : "Rules"} Active
        </Badge>
      </div>
    </div>
  );
}
