import React from "react";
import Badge from "../ui/Badge";
import { getRiskLabel, getRiskVariant } from "../../utils/permissions-audit";
import { AlertTriangle, Key } from "lucide-react";
import { getDiscordAvatarUrl } from "../../utils/discord";

export default function MemberAuditResult({ memberAudit, loading }) {
  if (loading) {
    return (
      <div className="glass-panel p-6 rounded-3xl border border-white/5 animate-pulse mb-8">
        <div className="flex gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-white/5"></div>
          <div className="space-y-2 flex-1">
            <div className="h-4 w-32 bg-white/5 rounded"></div>
            <div className="h-3 w-24 bg-white/5 rounded"></div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-20 w-full bg-white/5 rounded-2xl"></div>
          <div className="h-20 w-full bg-white/5 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (!memberAudit || !memberAudit.user) return null;

  const { user, permissions = [], threatLevel, threatScore } = memberAudit;
  const moderationHistory = memberAudit.moderationHistory || memberAudit.history || [];
  const avatarUrl = getDiscordAvatarUrl(user);
  
  const riskLabel = getRiskLabel(threatLevel);
  const riskVariant = getRiskVariant(threatLevel);

  // Group permissions by severity
  const groupedPerms = (permissions || []).reduce((acc, perm) => {
    const level = getRiskLabel(perm.level);
    if (!acc[level]) acc[level] = [];
    acc[level].push(perm);
    return acc;
  }, {});

  const criticalPerms = groupedPerms["CRITICAL"] || [];
  const elevatedPerms = [...(groupedPerms["ELEVATED"] || []), ...(groupedPerms["MODERATE"] || [])];

  return (
    <div className="glass-panel p-0 rounded-3xl border border-white/5 mb-8 overflow-hidden animate-in fade-in duration-300">
      {/* Header Profile */}
      <div className="p-6 bg-slate-900/50 flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-white/5">
        <div className="flex items-center gap-4">
          <img 
            src={avatarUrl} 
            alt={user.username} 
            className="w-14 h-14 rounded-full border border-white/10"
            onError={(e) => { e.target.src = "https://cdn.discordapp.com/embed/avatars/0.png"; }}
          />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-bold text-white leading-none">{user.global_name || user.username}</h3>
              <Badge variant={riskVariant}>{riskLabel} RISK</Badge>
            </div>
            <div className="flex flex-col text-sm text-slate-400">
              <span>@{user.username}</span>
              <span className="font-mono text-[10px] uppercase text-slate-500">{user.id}</span>
            </div>
          </div>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 bg-slate-900 px-4 py-2 rounded-2xl border border-white/5">
          <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Threat Score</div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-white">{threatScore}</span>
            <span className="text-xs text-slate-500 font-medium">{permissions.length} risky permissions</span>
          </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Permission Findings */}
        <div className="lg:col-span-2 space-y-6">
          <h4 className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold flex items-center gap-2">
            <Key className="w-4 h-4" />
            Permission Findings
          </h4>

          {criticalPerms.length === 0 && elevatedPerms.length === 0 ? (
            <div className="text-sm text-slate-400">No elevated permission findings detected by this audit.</div>
          ) : (
            <div className="space-y-6">
              
              {criticalPerms.length > 0 && (
                <div className="space-y-3">
                  <Badge variant="danger" className="mb-2">CRITICAL</Badge>
                  {criticalPerms.map((perm, idx) => {
                    const permName = perm.permission || perm.name || "Unknown Permission";
                    const rolesList = perm.roles || (Array.isArray(perm.sources) ? perm.sources.map(s => s.name || s) : []);

                    return (
                      <div key={idx} className="p-4 bg-slate-900 rounded-2xl border border-rose-500/10">
                        <div className="font-bold text-white mb-2">{permName}</div>
                        <div className="text-xs text-slate-400 mb-1">Granted through:</div>
                        <div className="flex flex-wrap gap-2">
                          {rolesList.length ? rolesList.map((rName, rIdx) => (
                            <span key={rIdx} className="text-xs font-semibold px-2 py-1 bg-white/5 rounded-md text-slate-300">@{rName}</span>
                          )) : (
                            <span className="text-xs font-semibold px-2 py-1 bg-white/5 rounded-md text-slate-500">Direct / Owner</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {elevatedPerms.length > 0 && (
                <div className="space-y-3">
                  <Badge variant="warning" className="mb-2">ELEVATED</Badge>
                  {elevatedPerms.map((perm, idx) => {
                    const permName = perm.permission || perm.name || "Unknown Permission";
                    const rolesList = perm.roles || (Array.isArray(perm.sources) ? perm.sources.map(s => s.name || s) : []);

                    return (
                      <div key={idx} className="p-4 bg-slate-900 rounded-2xl border border-amber-500/10">
                        <div className="font-bold text-white mb-2">{permName}</div>
                        <div className="text-xs text-slate-400 mb-1">Granted through:</div>
                        <div className="flex flex-wrap gap-2">
                          {rolesList.length ? rolesList.map((rName, rIdx) => (
                            <span key={rIdx} className="text-xs font-semibold px-2 py-1 bg-white/5 rounded-md text-slate-300">@{rName}</span>
                          )) : (
                            <span className="text-xs font-semibold px-2 py-1 bg-white/5 rounded-md text-slate-500">Direct / Owner</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}
        </div>

        {/* Moderation History */}
        <div className="space-y-6">
          <h4 className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Moderation History
          </h4>
          
          {!moderationHistory || moderationHistory.length === 0 ? (
            <div className="text-sm text-slate-400 p-4 rounded-2xl border border-dashed border-white/5 bg-slate-900/50">
              No moderation history found for this member.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-bold text-white mb-2">{moderationHistory.length} previous action(s)</div>
              {moderationHistory.map((hist, idx) => {
                const dateVal = hist.date || hist.timestamp || hist.created_at;
                const formattedDate = dateVal ? new Date(dateVal).toLocaleDateString() : "Recent";
                const modId = hist.moderator_id || hist.moderatorId;

                return (
                  <div key={idx} className="p-4 rounded-2xl border border-white/5 bg-slate-900">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="default" className="text-[10px]">{hist.type || "ACTION"}</Badge>
                      <span className="text-[10px] text-slate-500">{formattedDate}</span>
                    </div>
                    <div className="text-sm text-slate-300 mb-2">{hist.reason || "No reason provided"}</div>
                    {modId && <div className="text-[10px] text-slate-500 font-mono">Mod ID: {modId}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
