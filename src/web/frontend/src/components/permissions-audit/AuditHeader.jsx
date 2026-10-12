import React from "react";
import { Download, RefreshCw, ShieldAlert, Sparkles } from "lucide-react";
import { exportPermissionsAuditCsv } from "../../utils/permissions-audit";

export default function AuditHeader({ guildId, auditData, onRefresh, refreshing }) {
  const memberCount = auditData?.members?.length || 0;
  const roleCount = auditData?.roles?.length || 0;

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-display text-brand-crimson tracking-wider">सुरक्षा ऑडिट</span>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest opacity-80">/ Security / Permissions Audit</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-white tracking-wide mb-1 flex items-center gap-2.5">
          <span>Permissions Audit</span>
          <span className="text-xs font-mono font-normal text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
            LIVE SCAN
          </span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
          Deep vulnerability scan detecting members and roles with elevated, administrator, or destructive Discord permissions.
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => exportPermissionsAuditCsv(auditData, guildId)}
          disabled={!memberCount || refreshing}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-all border border-white/10 disabled:opacity-50"
          title="Export CSV audit report"
        >
          <Download className="w-3.5 h-3.5 text-slate-300" />
          <span>Export CSV</span>
        </button>

        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-crimson hover:bg-brand-crimson-dark text-white text-xs font-bold transition-all shadow-lg shadow-brand-crimson/20 disabled:opacity-50"
          title="Run fresh permissions audit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          <span>{refreshing ? "Scanning..." : "Refresh Audit"}</span>
        </button>
      </div>
    </div>
  );
}
