import React from "react";

export default function InsightsPanel({ insights, loading }) {
  if (loading) {
    return (
      <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-white/5 mb-8 animate-pulse flex flex-wrap gap-6">
        <div className="h-4 w-32 bg-white/5 rounded"></div>
        <div className="h-4 w-24 bg-white/5 rounded"></div>
        <div className="h-4 w-32 bg-white/5 rounded"></div>
      </div>
    );
  }

  // Only show if we have data to display. Don't show fake fallbacks.
  const hasInsights = insights && (insights.primeWindow || insights.busiestDay || insights.topChannel || insights.growthSummary);

  if (!hasInsights) return null;

  return (
    <div className="glass-panel px-6 py-5 rounded-2xl border border-white/5 mb-8 flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-12 overflow-x-auto scrollbar-none">
      <div className="text-[10px] font-mono text-brand-crimson font-bold uppercase tracking-widest shrink-0">
        Community Signals
      </div>
      
      <div className="flex items-center gap-8 sm:gap-12">
        {insights.primeWindow && (
          <div className="shrink-0">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Prime Hours</div>
            <div className="text-sm font-semibold text-slate-200">{insights.primeWindow}</div>
          </div>
        )}
        
        {insights.busiestDay && (
          <div className="shrink-0">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Peak Day</div>
            <div className="text-sm font-semibold text-slate-200">{insights.busiestDay}</div>
          </div>
        )}
        
        {insights.topChannel && (
          <div className="shrink-0">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Top Channel</div>
            <div className="text-sm font-mono text-slate-200 truncate max-w-[120px]">{insights.topChannel}</div>
          </div>
        )}
        
        {insights.growthSummary && (
          <div className="shrink-0">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Growth</div>
            <div className="text-sm font-semibold text-brand-green">{insights.growthSummary}</div>
          </div>
        )}
      </div>
    </div>
  );
}
