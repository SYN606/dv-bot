import React from "react";
import { Download, RefreshCw } from "lucide-react";
import { exportPermissionsAuditCsv } from "../../utils/permissions-audit";

export default function AuditHeader({ guildId, auditData, onRefresh, refreshing }) {
  return (
    <div className="mb-8 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm font-display text-brand-crimson tracking-wider">सुरक्षा</span>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest opacity-80">/ Security / Permissions</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Permissions Audit</h1>
        <p className="text-sm text-slate-400">Identify members and roles with elevated or potentially dangerous Discord permissions.</p>
      </div>
      
      <div className="shrink-0 flex items-center gap-3">
        <button
          onClick={() => exportPermissionsAuditCsv(auditData, guildId)}
          disabled={!auditData?.members?.length || refreshing}
          className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>
    </div>
  );
}
