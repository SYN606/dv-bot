import React from "react";
import Badge from "../ui/Badge";
import { getRiskLabel, getRiskVariant } from "../../utils/permissions-audit";
import { ShieldCheck, ShieldAlert, Key, Users, Bot, AlertOctagon, Shield } from "lucide-react";

export default function SecurityOverview({ auditData }) {
  const members = auditData?.members || [];
  const roles = auditData?.roles || [];

  const auditedCount = members.length;
  const elevatedRolesCount = roles.length;

  const criticalCount = members.filter(m => getRiskLabel(m.threatLevel) === "CRITICAL").length;
  const highCount = members.filter(m => getRiskLabel(m.threatLevel) === "ELEVATED").length;
  const moderateCount = members.filter(m => getRiskLabel(m.threatLevel) === "MODERATE").length;

  const humanCount = members.filter(m => !m.bot).length;
  const botCount = members.filter(m => m.bot).length;

  const adminRolesCount = roles.filter(r => 
    r.permissions?.some(p => p.name === "Administrator" || p.permission === "Administrator")
  ).length;

  let postureStatus = "PROTECTED";
  let postureDescription = "No critical permission leaks or unauthorized administrative escalation detected.";
  let postureVariant = "success";

  if (criticalCount > 0 || adminRolesCount > 3) {
    postureStatus = "CRITICAL EXPOSURE";
    postureDescription = `${criticalCount} member(s) hold destructive permissions (Administrator / Manage Roles / Ban).`;
    postureVariant = "danger";
  } else if (highCount > 0 || elevatedRolesCount > 0) {
    postureStatus = "ELEVATED POSTURE";
    postureDescription = `${highCount} member(s) hold elevated management rights (Manage Server / Channels).`;
    postureVariant = "warning";
  }

  // Calculate percentage bar
  const totalRisky = criticalCount + highCount + moderateCount || 1;
  const criticalPct = Math.round((criticalCount / totalRisky) * 100);
  const highPct = Math.round((highCount / totalRisky) * 100);
  const modPct = Math.max(0, 100 - criticalPct - highPct);

  return (
    <div className="space-y-4 mb-6">
      {/* 4 Spacious Telemetry Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        
        {/* Card 1: Privileged Actors */}
        <div className="glass-card p-4 sm:p-5 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between group hover:border-white/10 transition-colors">
          <div className="flex items-center justify-between mb-3 text-slate-400 text-xs font-mono uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              Privileged Actors
            </span>
            <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-slate-300">
              {auditedCount} Total
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-sans font-bold text-white tracking-tight mb-1">
              {auditedCount}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
              <span className="text-slate-300 font-semibold">{humanCount}</span> humans
              <span>•</span>
              <span className="text-slate-300 font-semibold">{botCount}</span> bots
            </div>
          </div>
        </div>

        {/* Card 2: Critical Threats */}
        <div className="glass-card p-4 sm:p-5 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between group hover:border-brand-crimson/30 transition-colors">
          <div className="flex items-center justify-between mb-3 text-slate-400 text-xs font-mono uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <AlertOctagon className="w-3.5 h-3.5 text-brand-crimson" />
              Critical Access
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              criticalCount > 0 ? "bg-brand-crimson/20 text-brand-crimson border border-brand-crimson/30" : "bg-emerald-500/10 text-emerald-400"
            }`}>
              {criticalCount > 0 ? "ATTENTION" : "CLEAN"}
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-sans font-bold text-brand-crimson tracking-tight mb-1">
              {criticalCount}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Holding Administrator or Role control
            </div>
          </div>
        </div>

        {/* Card 3: Elevated Roles */}
        <div className="glass-card p-4 sm:p-5 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between group hover:border-amber-500/30 transition-colors">
          <div className="flex items-center justify-between mb-3 text-slate-400 text-xs font-mono uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              Elevated Roles
            </span>
            <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono">
              {adminRolesCount} Admin Roles
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-sans font-bold text-amber-400 tracking-tight mb-1">
              {elevatedRolesCount}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Roles granting elevated permissions
            </div>
          </div>
        </div>

        {/* Card 4: Security Posture Index */}
        <div className="glass-card p-4 sm:p-5 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between group hover:border-white/10 transition-colors">
          <div className="flex items-center justify-between mb-3 text-slate-400 text-xs font-mono uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              Security Posture
            </span>
            {postureStatus === "PROTECTED" ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-brand-crimson animate-pulse" />
            )}
          </div>
          <div>
            <div className="mb-1">
              <Badge variant={postureVariant} className="text-xs px-2.5 py-0.5 tracking-wider font-mono">
                {postureStatus}
              </Badge>
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {postureDescription}
            </div>
          </div>
        </div>

      </div>

      {/* Visual Risk Distribution Bar */}
      {auditedCount > 0 && (
        <div className="glass-panel p-3.5 sm:p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-mono text-slate-400 shrink-0">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            <span className="text-slate-300 font-semibold">Risk Spectrum:</span>
          </div>

          <div className="w-full flex-1 max-w-xl flex h-2 rounded-full overflow-hidden bg-slate-900 border border-white/5">
            {criticalCount > 0 && (
              <div 
                style={{ width: `${Math.max(8, criticalPct)}%` }} 
                className="bg-brand-crimson transition-all" 
                title={`Critical: ${criticalCount}`}
              />
            )}
            {highCount > 0 && (
              <div 
                style={{ width: `${Math.max(8, highPct)}%` }} 
                className="bg-amber-500 transition-all" 
                title={`Elevated: ${highCount}`}
              />
            )}
            <div 
              style={{ width: `${modPct}%` }} 
              className="bg-indigo-500/50 transition-all flex-1" 
              title={`Moderate / Low: ${moderateCount}`}
            />
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px] shrink-0">
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span> {criticalCount} Critical
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> {highCount} Elevated
            </span>
            <span className="flex items-center gap-1 text-indigo-400">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span> {moderateCount} Moderate
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
