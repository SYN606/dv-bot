import React from "react";
import Badge from "../ui/Badge";
import { getRiskLabel, getRiskVariant } from "../../utils/permissions-audit";
import { ShieldCheck, ShieldAlert } from "lucide-react";

export default function SecurityOverview({ auditData }) {
  const members = auditData?.members || [];
  const roles = auditData?.roles || [];

  const auditedCount = members.length;
  const elevatedRolesCount = roles.length;
  
  const criticalCount = members.filter(m => getRiskLabel(m.threatLevel) === "CRITICAL").length;
  const highCount = members.filter(m => getRiskLabel(m.threatLevel) === "ELEVATED").length;

  let highestRisk = "SAFE";
  if (highCount > 0) highestRisk = "ELEVATED";
  if (criticalCount > 0) highestRisk = "CRITICAL";

  return (
    <div className="glass-panel p-6 rounded-3xl border border-white/5 mb-8 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
      <div>
        <h2 className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold mb-4">Security Overview</h2>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-white">{auditedCount}</span>
            <span className="text-xs text-slate-400">Audited</span>
          </div>
          <div className="w-px h-8 bg-white/10 hidden sm:block"></div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-rose-500">{criticalCount}</span>
            <span className="text-xs text-slate-400">Critical</span>
          </div>
          <div className="w-px h-8 bg-white/10 hidden sm:block"></div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-amber-500">{highCount}</span>
            <span className="text-xs text-slate-400">High</span>
          </div>
          <div className="w-px h-8 bg-white/10 hidden sm:block"></div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-indigo-400">{elevatedRolesCount}</span>
            <span className="text-xs text-slate-400">Elevated Roles</span>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-slate-900 border border-white/5 min-w-50">
        <div className="text-xs text-slate-400 mb-2">Highest observed risk</div>
        <div className="flex items-center justify-between">
          <Badge variant={getRiskVariant(highestRisk)} className="text-sm px-3 py-1">
            {highestRisk}
          </Badge>
          {highestRisk === "SAFE" ? (
            <ShieldCheck className="w-6 h-6 text-emerald-500 opacity-50" />
          ) : (
            <ShieldAlert className={`w-6 h-6 opacity-50 ${highestRisk === "CRITICAL" ? "text-rose-500" : "text-amber-500"}`} />
          )}
        </div>
      </div>
    </div>
  );
}
