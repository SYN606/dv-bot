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
}) {
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-3 mb-1.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-tight">
              Server Audit Logs
            </h1>
            <span className="font-samarkan text-sm px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              ऑडिट लॉग्स
            </span>
            {autoRefresh && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-semibold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE STREAM
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Live Discord audit stream, moderation disciplinary actions, role & channel permission diffs, and security events.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Auto-Refresh Toggle Pill */}
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

          {/* Mod Log Channel Config Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenConfig}
            className="text-xs flex items-center gap-1.5 bg-slate-900/60"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Mod Log:</span>
            <span className="text-indigo-400 font-mono text-[11px]">
              {modLogChannelName ? `#${modLogChannelName}` : "Not Set"}
            </span>
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
                <div className="absolute right-0 mt-2 w-44 rounded-2xl glass-panel bg-slate-900 border border-white/10 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      onExportJson();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left rounded-xl hover:bg-white/10 text-slate-200 transition-colors"
                  >
                    <FileJson className="w-4 h-4 text-indigo-400" />
                    <span>Export as JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      onExportCsv();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left rounded-xl hover:bg-white/10 text-slate-200 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>Export as CSV</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Refresh Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing}
            className="text-xs p-2.5 text-slate-300 hover:text-white"
            title="Refresh Audit Logs"
          >
            <RotateCcw className={`w-4 h-4 ${refreshing ? "animate-spin text-indigo-400" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Quick Stat Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl glass-panel bg-slate-900/40 border border-white/[0.06]">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
            Total Inspected
          </div>
          <div className="text-xl font-extrabold text-white font-mono">
            {stats.total || 0}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl glass-panel bg-slate-900/40 border border-rose-500/15">
          <div className="text-[11px] font-mono text-rose-400 uppercase tracking-wider mb-1">
            Moderation
          </div>
          <div className="text-xl font-extrabold text-rose-300 font-mono">
            {stats.moderation || 0}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl glass-panel bg-slate-900/40 border border-indigo-500/15">
          <div className="text-[11px] font-mono text-indigo-400 uppercase tracking-wider mb-1">
            Member Diffs
          </div>
          <div className="text-xl font-extrabold text-indigo-300 font-mono">
            {stats.members || 0}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl glass-panel bg-slate-900/40 border border-cyan-500/15">
          <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider mb-1">
            Channels
          </div>
          <div className="text-xl font-extrabold text-cyan-300 font-mono">
            {stats.channels || 0}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl glass-panel bg-slate-900/40 border border-amber-500/15">
          <div className="text-[11px] font-mono text-amber-400 uppercase tracking-wider mb-1">
            Roles
          </div>
          <div className="text-xl font-extrabold text-amber-300 font-mono">
            {stats.roles || 0}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl glass-panel bg-slate-900/40 border border-emerald-500/15">
          <div className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider mb-1">
            Server / Bots
          </div>
          <div className="text-xl font-extrabold text-emerald-300 font-mono">
            {(stats.server || 0) + (stats.messages || 0)}
          </div>
        </div>
      </div>
    </div>
  );
}
