import React from "react";
import { Download, RefreshCw } from "lucide-react";
import { exportAnalyticsCSV } from "../../utils/analytics";

export default function AnalyticsHeader({ timeframe, setTimeframe, data, loading, refresh }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm font-display text-brand-crimson tracking-wider">विश्लेषण</span>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest opacity-80">/ Analytics</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Server Insights</h1>
        <p className="text-sm text-slate-400">Understand activity, growth and engagement across your community.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center bg-slate-900 border border-white/10 rounded-lg p-1">
          {[7, 14, 30].map((days) => (
            <button
              key={days}
              onClick={() => setTimeframe(days)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                timeframe === days ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {days}D
            </button>
          ))}
        </div>

        <button
          onClick={() => exportAnalyticsCSV(data)}
          disabled={loading || !data}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold transition-all disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>

        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center justify-center p-2 rounded-lg bg-brand-crimson hover:bg-brand-crimson-dark text-white text-xs font-semibold transition-all shadow-lg shadow-brand-crimson/20 disabled:opacity-50"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
    </div>
  );
}
