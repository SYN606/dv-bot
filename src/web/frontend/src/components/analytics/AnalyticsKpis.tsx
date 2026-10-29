import React from "react";
import { MessageSquare, Mic, Users, Zap, TrendingUp, TrendingDown } from "lucide-react";

export default function AnalyticsKpis({ summary, loading, timeframe = 7 }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-panel p-6 rounded-2xl border border-white/5 animate-pulse">
            <div className="h-4 w-24 bg-white/5 rounded mb-4"></div>
            <div className="h-8 w-16 bg-white/5 rounded mb-2"></div>
            <div className="h-3 w-20 bg-white/5 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const days = Number(timeframe) || 7;
  const joins = summary?.totalJoins || 0;
  const leaves = summary?.totalLeaves || 0;
  const deltas = summary?.deltas || {};

  const kpis = [
    {
      title: "MESSAGES",
      value: (summary?.totalMessages ?? 0).toLocaleString(),
      subtext: `~${Math.round((summary?.totalMessages || 0) / days).toLocaleString()} / day`,
      delta: deltas.messagesDelta,
      icon: MessageSquare,
    },
    {
      title: "VOICE HOURS",
      value: (summary?.totalVoiceHours ?? 0).toLocaleString(),
      subtext: `~${(Math.round(((summary?.totalVoiceHours || 0) / days) * 10) / 10).toLocaleString()}h / day`,
      delta: deltas.voiceDelta,
      icon: Mic,
    },
    {
      title: "MEMBER GROWTH",
      value: `${(summary?.netGrowth || 0) >= 0 ? "+" : ""}${(summary?.netGrowth ?? 0).toLocaleString()}`,
      subtext: `+${joins} joins, -${leaves} leaves`,
      delta: deltas.joinsDelta,
      icon: Users,
    },
    {
      title: "RETENTION",
      value: summary?.retentionRate != null ? `${summary.retentionRate}%` : "—",
      subtext: `${days}-day member retention`,
      delta: null,
      icon: Zap,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        const delta = kpi.delta;
        const hasDelta = delta !== null && delta !== undefined;
        const isPositive = delta > 0;
        const isNegative = delta < 0;

        return (
          <div key={idx} className="glass-card p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
            <Icon className="absolute top-6 right-6 w-16 h-16 text-white/2 -z-10 group-hover:scale-110 transition-transform" />
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                {kpi.title}
              </h3>
              {hasDelta && (
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                    isPositive
                      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                      : isNegative
                      ? "text-rose-400 bg-rose-500/10 border-rose-500/20"
                      : "text-slate-400 bg-white/5 border-white/10"
                  }`}
                  title={`${isPositive ? "+" : ""}${delta}% vs previous ${days} days`}
                >
                  {isPositive && <TrendingUp className="w-3 h-3 text-emerald-400" />}
                  {isNegative && <TrendingDown className="w-3 h-3 text-rose-400" />}
                  {isPositive ? `+${delta}%` : `${delta}%`}
                </span>
              )}
            </div>
            <div className="text-3xl font-mono text-white mb-1">
              {kpi.value}
            </div>
            <div className="text-xs text-slate-400">
              {kpi.subtext}
            </div>
          </div>
        );
      })}
    </div>
  );
}
