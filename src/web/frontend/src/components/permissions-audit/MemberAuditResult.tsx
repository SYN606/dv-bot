import React from "react";
import Badge from "../ui/Badge";
import { getRiskLabel, getRiskVariant } from "../../utils/permissions-audit";
import { AlertTriangle, Key, ShieldCheck, ShieldAlert, User, Shield, ExternalLink, Crown, Clock } from "lucide-react";
import { getDiscordAvatarUrl } from "../../utils/discord";

const PERMISSION_EXPLANATIONS = {
  "Administrator": "Bypasses all channel permission overrides and grants full server authority.",
  "Manage Roles": "Can create, modify, or delete lower roles and grant permissions.",
  "Manage Server": "Can modify server settings, vanity URL, integrations, and widgets.",
  "Manage Channels": "Can create, modify, or delete text and voice channels.",
  "Ban Members": "Can permanently ban users from the server.",
  "Kick Members": "Can remove members from the server.",
  "Manage Webhooks": "Can create webhooks to post unverified external messages as any webhook identity.",
  "Mention Everyone": "Can ping @everyone and @here across entire server channels.",
  "Manage Messages": "Can delete any messages and pin/unpin messages.",
  "Timeout Members": "Can timeout users preventing them from chatting or joining voice channels.",
  "Manage Threads": "Can archive, delete, or modify server threads.",
  "Manage Nicknames": "Can change nicknames of other server members.",
};

export default function MemberAuditResult({ memberAudit, loading }) {
  if (loading) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900/40 border border-white/5 animate-pulse space-y-6">
        <div className="flex gap-4 items-center">
          <div className="w-14 h-14 rounded-full bg-white/5 shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-5 w-48 bg-white/5 rounded" />
            <div className="h-3 w-32 bg-white/5 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-32 bg-white/5 rounded-xl" />
          <div className="h-32 bg-white/5 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!memberAudit || !memberAudit.user) {
    return (
      <div className="p-10 rounded-2xl bg-slate-900/30 border border-dashed border-white/10 text-center flex flex-col items-center justify-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
          <Key className="w-6 h-6 opacity-60" />
        </div>
        <div>
          <h4 className="text-base font-bold text-white mb-1">No Member Inspected Yet</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Use the search box above or click <span className="text-white font-semibold">"Inspect"</span> on any user in the Privileged Members Directory to run a full diagnostic.
          </p>
        </div>
      </div>
    );
  }

  const { user, permissions = [], threatLevel, threatScore = 0 } = memberAudit;
  const moderationHistory = memberAudit.moderationHistory || memberAudit.history || [];
  const avatarUrl = getDiscordAvatarUrl(user);

  const riskLabel = getRiskLabel(threatLevel);
  const riskVariant = getRiskVariant(threatLevel);

  // Group permissions by severity
  const criticalPerms = permissions.filter((p) => {
    const lvl = (p.level || "").toLowerCase();
    return lvl === "red" || lvl === "critical";
  });

  const elevatedPerms = permissions.filter((p) => {
    const lvl = (p.level || "").toLowerCase();
    return lvl === "yellow" || lvl === "high" || lvl === "elevated" || lvl === "moderate";
  });

  const standardPerms = permissions.filter((p) => {
    const lvl = (p.level || "").toLowerCase();
    return lvl === "green" || lvl === "low" || lvl === "safe";
  });

  const roles = user.roles || [];

  return (
    <div className="rounded-2xl bg-slate-900/40 border border-white/10 overflow-hidden space-y-6">
      {/* Profile Header Hero */}
      <div className="p-5 sm:p-6 bg-slate-900/80 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative shrink-0">
            <img
              src={avatarUrl}
              alt={user.username}
              className="w-16 h-16 rounded-full border-2 border-white/10 object-cover shadow-lg"
              onError={(e) => {
                e.target.src = "https://cdn.discordapp.com/embed/avatars/0.png";
              }}
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap mb-1">
              <h3 className="text-xl font-bold text-white truncate">{user.global_name || user.username}</h3>
              {user.bot && (
                <span className="text-[10px] font-mono px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded font-semibold border border-indigo-500/30">
                  BOT
                </span>
              )}
              <Badge variant={riskVariant} className="text-xs px-2.5 py-0.5 font-bold tracking-wider">
                {riskLabel} RISK
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
              <span>@{user.username}</span>
              <span>•</span>
              <span className="text-slate-500">ID: {user.id}</span>
            </div>
          </div>
        </div>

        {/* Threat Score Telemetry Box */}
        <div className="flex items-center gap-4 bg-slate-950 p-3.5 sm:px-5 sm:py-3 rounded-xl border border-white/5 shrink-0 justify-between md:justify-end">
          <div className="text-right">
            <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Threat Score</div>
            <div className="text-xs text-slate-500">{permissions.length} risky flags</div>
          </div>
          <div className="text-3xl font-black font-sans text-brand-crimson">
            {threatScore}
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6 pt-0 space-y-6">
        {/* Roles List */}
        {roles.length > 0 && (
          <div>
            <h4 className="text-xs font-mono text-slate-400 uppercase tracking-widest font-bold mb-2.5 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              Assigned Server Roles ({roles.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {roles.map((r) => {
                const rawColor = r.hexColor || r.color;
                const roleColor = rawColor && rawColor !== "#000000" ? rawColor : "#818cf8";
                return (
                  <span
                    key={r.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-900 border border-white/5 text-slate-200"
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: roleColor }} />
                    <span>@{r.name}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Permission Findings Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-4">
            <h4 className="text-xs font-mono text-slate-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              Effective Dangerous Permissions
            </h4>

            {criticalPerms.length === 0 && elevatedPerms.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-900/30 border border-dashed border-white/5 text-center text-slate-400 text-xs">
                <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-60" />
                No elevated or critical permissions detected on this account.
              </div>
            ) : (
              <div className="space-y-3">
                {/* Critical Findings */}
                {criticalPerms.map((perm, idx) => {
                  const permName = perm.permission || perm.name || "Unknown Permission";
                  const explanation = PERMISSION_EXPLANATIONS[permName] || "Grants extensive administrative authority over server assets.";
                  const rolesList = perm.roles || (Array.isArray(perm.sources) ? perm.sources.map((s) => s.name || s) : []);

                  return (
                    <div key={`crit-${idx}`} className="p-4 rounded-xl bg-slate-900/70 border border-rose-500/20 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                          <span className="font-bold text-sm text-white">{permName}</span>
                        </div>
                        <Badge variant="danger" className="text-[10px] px-2 py-0.5">CRITICAL</Badge>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">{explanation}</p>

                      <div className="pt-2 border-t border-white/5 flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="font-mono text-slate-500">Source:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {rolesList.length ? (
                            rolesList.map((rName, rIdx) => (
                              <span key={rIdx} className="px-2 py-0.5 rounded bg-white/5 text-slate-200 font-semibold text-[10px]">
                                @{rName}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-500 font-semibold">Direct Owner / Explicit</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Elevated Findings */}
                {elevatedPerms.map((perm, idx) => {
                  const permName = perm.permission || perm.name || "Unknown Permission";
                  const explanation = PERMISSION_EXPLANATIONS[permName] || "Allows managing select server channels, messages, or users.";
                  const rolesList = perm.roles || (Array.isArray(perm.sources) ? perm.sources.map((s) => s.name || s) : []);

                  return (
                    <div key={`elev-${idx}`} className="p-4 rounded-xl bg-slate-900/70 border border-amber-500/20 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          <span className="font-bold text-sm text-white">{permName}</span>
                        </div>
                        <Badge variant="warning" className="text-[10px] px-2 py-0.5">ELEVATED</Badge>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">{explanation}</p>

                      <div className="pt-2 border-t border-white/5 flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="font-mono text-slate-500">Source:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {rolesList.length ? (
                            rolesList.map((rName, rIdx) => (
                              <span key={rIdx} className="px-2 py-0.5 rounded bg-white/5 text-slate-200 font-semibold text-[10px]">
                                @{rName}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-500 font-semibold">Direct Owner / Explicit</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Moderation History Dossier */}
          <div className="lg:col-span-5 space-y-4">
            <h4 className="text-xs font-mono text-slate-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-brand-crimson" />
              Disciplinary &amp; Punishment History
            </h4>

            {moderationHistory.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-900/30 border border-dashed border-white/5 text-center text-slate-400 text-xs space-y-1">
                <ShieldCheck className="w-7 h-7 text-emerald-400 mx-auto mb-1 opacity-70" />
                <p className="font-bold text-white text-xs">Clean Disciplinary Record</p>
                <p className="text-[11px]">No active warnings, tempbans, or bot punishments recorded for this member.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="text-xs text-slate-400 font-mono">
                  <span className="text-white font-bold">{moderationHistory.length}</span> recorded infraction(s)
                </div>

                {moderationHistory.map((hist, idx) => {
                  const dateVal = hist.date || hist.timestamp || hist.created_at;
                  const formattedDate = dateVal ? new Date(dateVal).toLocaleDateString() : "Recent";
                  const modId = hist.moderator_id || hist.moderatorId;

                  return (
                    <div key={idx} className="p-3.5 rounded-xl border border-white/5 bg-slate-900/60 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Badge variant="default" className="text-[10px] font-mono px-2 py-0.5">
                          {hist.type || "ACTION"}
                        </Badge>
                        <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formattedDate}
                        </span>
                      </div>
                      <div className="text-xs text-slate-200">{hist.reason || "No reason specified"}</div>
                      {modId && <div className="text-[10px] text-slate-500 font-mono">Staff ID: {modId}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
