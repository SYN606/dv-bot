import React from "react";
import { MessageSquare, Mic, Users, Zap } from "lucide-react";

export default function AnalyticsKpis({ summary, loading, timeframe }) {
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

  const kpis = [
    {
      title: "MESSAGES",
      value: summary?.totalMessages?.toLocaleString() || "0",
      subtext: `~${Math.round((summary?.totalMessages || 0) / timeframe).toLocaleString()} / day`,
      icon: MessageSquare,
    },
    {
      title: "VOICE HOURS",
      value: summary?.totalVoiceHours?.toLocaleString() || "0",
      subtext: `~${Math.round((summary?.totalVoiceHours || 0) / timeframe).toLocaleString()} / day`,
      icon: Mic,
    },
    {
      title: "MEMBER GROWTH",
      value: `${(summary?.netGrowth || 0) >= 0 ? "+" : ""}${summary?.netGrowth?.toLocaleString() || "0"}`,
      subtext: "Net new joins",
      icon: Users,
    },
    {
      title: "RETENTION",
      value: summary?.retentionRate != null ? `${summary.retentionRate}%` : "—",
      subtext: "7-day return rate",
      icon: Zap,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <div key={idx} className="glass-card p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
            <Icon className="absolute top-6 right-6 w-16 h-16 text-white/[0.02] -z-10 group-hover:scale-110 transition-transform" />
            <h3 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3">
              {kpi.title}
            </h3>
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
