import React, { useState } from "react";
import {
  ScrollText,
  RotateCcw,
  Download,
  Settings,
  Radio,
  FileJson,
  FileSpreadsheet,
  ShieldAlert,
  ChevronDown,
  Sliders,
} from "lucide-react";
import Button from "../ui/Button";

export default function AuditLogsHeader({
  stats,
  refreshing,
  autoRefresh,
  onToggleAutoRefresh,
  onRefresh,
  onOpenConfig,
  onExportJson,
  onExportCsv,
  modLogChannelName,
  activeTab = "channels",
  onTabChange,
}: any) {
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-3 mb-1.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-tight">
              Server Logs & Audit Center
            </h1>
            <span className="font-samarkan text-sm px-2.5 py-0.5 rounded-full bg-brand-crimson/10 border border-brand-crimson/20 text-brand-crimson">
              लॉग्स एवं ऑडिट
            </span>
            {activeTab === "stream" && autoRefresh && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-semibold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE STREAM
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Configure destination log channels for moderation, messages, members, voice, and roles, or stream real-time Discord audit events.
          </p>

          {/* Segmented View Mode Tabs */}
          <div className="flex items-center gap-2 mt-4">
            <button
              type="button"
              onClick={() => onTabChange?.("channels")}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "channels"
                  ? "bg-brand-crimson text-white shadow-lg shadow-brand-crimson/20 border border-brand-crimson/50"
                  : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Log Channels Architecture</span>
              <span className="px-1.5 py-0.2 rounded-md bg-white/15 text-[10px] font-mono">
                Noctaly-Style
              </span>
            </button>
            <button
              type="button"
              onClick={() => onTabChange?.("stream")}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "stream"
                  ? "bg-brand-crimson text-white shadow-lg shadow-brand-crimson/20 border border-brand-crimson/50"
                  : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5"
              }`}
            >
              <ScrollText className="w-3.5 h-3.5" />
              <span>Live Audit Stream</span>
              <span className="px-1.5 py-0.2 rounded-md bg-white/15 text-[10px] font-mono">
                {stats?.total || 0}
              </span>
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {activeTab === "stream" && (
            <button
              type="button"
              onClick={onToggleAutoRefresh}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                autoRefresh
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-md shadow-emerald-500/10"
                  : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
              }`}
              title="Toggle live 20s polling"
            >
              <Radio className={`w-3.5 h-3.5 ${autoRefresh ? "animate-pulse text-emerald-400" : ""}`} />
              <span>{autoRefresh ? "Live 20s" : "Live Off"}</span>
            </button>
          )}

          {/* Quick Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            isLoading={refreshing}
            loadingText="Refreshing..."
            className="text-xs flex items-center gap-1.5 bg-slate-900/60"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          {/* Export Dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="text-xs flex items-center gap-1.5 bg-slate-900/60"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </Button>

            {exportMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setExportMenuOpen(false)}
                />
                <div className="absolute right-0 top-10 z-50 p-2 rounded-2xl glass-panel border border-white/10 shadow-2xl bg-slate-950/95 w-48 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      onExportJson?.();
                      setExportMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <FileJson className="w-4 h-4 text-amber-400" />
                    <span>Export JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onExportCsv?.();
                      setExportMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stat Counter Cards (Visible on Stream View) */}
      {activeTab === "stream" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 animate-in fade-in duration-200">
          <div className="p-3.5 rounded-2xl glass-panel bg-slate-900/40 border border-white/[0.06]">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
              Total Inspected
            </div>
            <div className="text-xl font-extrabold text-white font-mono">
              {stats?.total || 0}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl glass-panel bg-slate-900/40 border border-rose-500/15">
            <div className="text-[11px] font-mono text-rose-400 uppercase tracking-wider mb-1">
              Moderation
            </div>
            <div className="text-xl font-extrabold text-rose-300 font-mono">
              {stats?.moderation || 0}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl glass-panel bg-slate-900/40 border border-indigo-500/15">
            <div className="text-[11px] font-mono text-indigo-400 uppercase tracking-wider mb-1">
              Member Diffs
            </div>
            <div className="text-xl font-extrabold text-indigo-300 font-mono">
              {stats?.members || 0}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl glass-panel bg-slate-900/40 border border-cyan-500/15">
            <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider mb-1">
              Channels
            </div>
            <div className="text-xl font-extrabold text-cyan-300 font-mono">
              {stats?.channels || 0}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl glass-panel bg-slate-900/40 border border-amber-500/15">
            <div className="text-[11px] font-mono text-amber-400 uppercase tracking-wider mb-1">
              Roles
            </div>
            <div className="text-xl font-extrabold text-amber-300 font-mono">
              {stats?.roles || 0}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl glass-panel bg-slate-900/40 border border-emerald-500/15">
            <div className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider mb-1">
              Server / Bots
            </div>
            <div className="text-xl font-extrabold text-emerald-300 font-mono">
              {(stats?.server || 0) + (stats?.messages || 0)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
