import React, { useMemo } from "react";
import { Line } from "react-chartjs-2";
import { MessageSquare } from "lucide-react";
import { commonChartOptions, analyticsColors, formatShortDate } from "../../utils/analytics";

export default function MessageActivityChart({ timeline, loading }) {
  const chartData = useMemo(() => {
    if (!timeline || timeline.length === 0) return null;
    return {
      labels: timeline.map(t => formatShortDate(t.date)),
      datasets: [
        {
          label: "Messages",
          data: timeline.map(t => t.messages),
          borderColor: analyticsColors.primary,
          backgroundColor: analyticsColors.primaryBg,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: analyticsColors.primary,
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 4,
        },
      ],
    };
  }, [timeline]);

  return (
    <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4 flex flex-col h-90">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-white/5 text-slate-300 border border-white/10">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-200">Message Activity</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Daily messages sent</p>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0 relative">
        {loading ? (
          <div className="absolute inset-0 bg-white/5 animate-pulse rounded-lg"></div>
        ) : !chartData ? (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">
            No activity recorded for this period
          </div>
        ) : (
          <Line data={chartData} options={commonChartOptions} />
        )}
      </div>
    </div>
  );
}
