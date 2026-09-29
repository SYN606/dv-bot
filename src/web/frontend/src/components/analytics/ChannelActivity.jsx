import React from "react";
import { Hash } from "lucide-react";

export default function ChannelActivity({ channelBreakdown, loading }) {
  if (loading) {
    return (
      <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6 h-[360px] animate-pulse">
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded bg-white/5"></div>
          <div className="flex-1 space-y-2"><div className="h-4 w-32 bg-white/5 rounded"></div></div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-4 w-full bg-white/5 rounded"></div>)}
        </div>
      </div>
    );
  }

  const channels = channelBreakdown || [];

  return (
    <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6 flex flex-col h-[360px]">
      <div className="flex items-center gap-2 shrink-0">
        <div className="p-2 rounded-xl bg-white/5 text-slate-300 border border-white/10">
          <Hash className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-200">Top Channels</h3>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Where conversation happens</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin">
        {channels.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500">
            No channel data available
          </div>
        ) : (
          channels.map((ch, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-mono text-slate-600">{(idx + 1).toString().padStart(2, "0")}</span>
                <span className="text-sm text-slate-300 truncate" title={ch.name}>{ch.name}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-24 h-1.5 rounded-full bg-white/5 overflow-hidden hidden sm:block">
                  <div className="h-full bg-brand-crimson/80 rounded-full" style={{ width: `${ch.percentage}%` }}></div>
                </div>
                <span className="text-xs font-mono text-slate-400 w-10 text-right">{ch.percentage}%</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
