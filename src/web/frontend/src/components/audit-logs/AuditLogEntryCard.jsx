import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Shield,
  User,
  Hash,
  Sparkles,
  MessageSquare,
  Bot,
  AlertTriangle,
  Clock,
  ArrowRight,
  PlusCircle,
  MinusCircle,
  Info,
} from "lucide-react";
import Badge from "../ui/Badge";

function getCategoryIcon(category, severity) {
  switch (category) {
    case "moderation":
      return Shield;
    case "members":
      return User;
    case "channels":
      return Hash;
    case "roles":
      return Sparkles;
    case "messages":
      return MessageSquare;
    case "server":
      return Bot;
    default:
      return Info;
  }
}

function getSeverityBadge(severity) {
  switch (severity) {
    case "danger":
      return "danger";
    case "warning":
      return "warning";
    case "success":
      return "success";
    default:
      return "neutral";
  }
}

function formatRelativeTime(dateString) {
  try {
    const diff = Date.now() - new Date(dateString).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateString).toLocaleDateString();
  } catch {
    return dateString;
  }
}

export default function AuditLogEntryCard({ entry }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = getCategoryIcon(entry.category, entry.severity);

  const hasDiffs = (entry.changes && entry.changes.length > 0) || entry.extra;

  return (
    <div className="glass-panel rounded-2xl border border-white/[0.08] bg-slate-900/60 hover:bg-slate-900/80 transition-all p-4 sm:p-5 space-y-3.5 shadow-md shadow-black/20">
      {/* Top Meta Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-3">
          {/* Action Category Icon Badge */}
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
              entry.severity === "danger"
                ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
                : entry.severity === "warning"
                ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                : entry.severity === "success"
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                : "bg-indigo-500/15 border-indigo-500/30 text-indigo-400"
            }`}
          >
            <Icon className="w-4 h-4" />
          </div>

          {/* Action Name and Badges */}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-white tracking-tight">
                {entry.actionName}
              </span>
              <Badge variant={getSeverityBadge(entry.severity)} size="sm">
                {entry.category.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>

        {/* Timestamp */}
        <div
          className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0 font-mono"
          title={new Date(entry.createdAt).toLocaleString()}
        >
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>{formatRelativeTime(entry.createdAt)}</span>
        </div>
      </div>

      {/* Narrative Row: Executor -> Target */}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs bg-slate-950/50 p-3 rounded-xl border border-white/5">
        {/* Executor */}
        <div className="flex items-center gap-2">
          {entry.executor?.avatar ? (
            <img
              src={entry.executor.avatar}
              alt=""
              className="w-5 h-5 rounded-full object-cover ring-1 ring-white/10"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 font-bold">
              ?
            </div>
          )}
          <span className="font-semibold text-white">
            {entry.executor?.tag || entry.executor?.username || "Unknown Moderator"}
          </span>
          {entry.executor?.bot && (
            <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-mono text-[9px] uppercase font-bold">
              BOT
            </span>
          )}
        </div>

        <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

        {/* Target */}
        {entry.target ? (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">{entry.targetType || "Target"}:</span>
            <span className="font-semibold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
              {entry.target.name || entry.target.id}
            </span>
          </div>
        ) : (
          <span className="text-slate-500 italic">No specific target</span>
        )}

        {/* Extra Information Tag (e.g. Channel or Count) */}
        {entry.extra?.channel && (
          <span className="text-slate-400">
            in <strong className="text-slate-200">#{entry.extra.channel.name}</strong>
          </span>
        )}
        {entry.extra?.count && (
          <span className="text-slate-400">
            ({entry.extra.count} items)
          </span>
        )}
      </div>

      {/* Reason Box (if provided by moderator/action) */}
      {entry.reason && (
        <div className="text-xs text-slate-300 bg-slate-950/70 border-l-2 border-indigo-500 rounded-r-xl px-3.5 py-2 italic font-sans flex items-start gap-2">
          <span className="text-slate-500 not-italic font-bold">Reason:</span>
          <span>"{entry.reason}"</span>
        </div>
      )}

      {/* Expandable Diff Inspector */}
      {hasDiffs && (
        <div>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors pt-1"
          >
            <span>{expanded ? "Hide Details & Diffs" : "Inspect Detailed Changes"}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {expanded && (
            <div className="mt-3 space-y-2.5 p-3.5 rounded-xl bg-slate-950 border border-white/5 animate-in fade-in duration-200">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-bold mb-2">
                Modified Properties & Audit Payload
              </div>

              {entry.changes && entry.changes.length > 0 ? (
                <div className="space-y-2">
                  {entry.changes.map((change, idx) => {
                    // Check if change is role add/remove ($add, $remove)
                    const isAdd = change.key === "$add";
                    const isRemove = change.key === "$remove";

                    if (isAdd || isRemove) {
                      const rolesList = Array.isArray(change.new) ? change.new : [change.new];
                      return (
                        <div key={idx} className="flex items-start gap-2 text-xs">
                          {isAdd ? (
                            <PlusCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <MinusCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <span className="text-slate-400">
                              {isAdd ? "Roles Added: " : "Roles Removed: "}
                            </span>
                            <div className="inline-flex flex-wrap gap-1 mt-1">
                              {rolesList.map((r, rIdx) => (
                                <span
                                  key={rIdx}
                                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                                    isAdd
                                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                      : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                                  }`}
                                >
                                  {r.name || r.id || JSON.stringify(r)}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={idx}
                        className="text-xs p-2 rounded-lg bg-slate-900 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <span className="font-mono text-slate-300 font-semibold">
                          {change.key}
                        </span>
                        <div className="flex items-center gap-2 font-mono text-[11px] overflow-hidden text-ellipsis">
                          {change.old !== null && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 line-through">
                              {typeof change.old === "object" ? JSON.stringify(change.old) : String(change.old)}
                            </span>
                          )}
                          {change.old !== null && change.new !== null && (
                            <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                          )}
                          {change.new !== null && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300">
                              {typeof change.new === "object" ? JSON.stringify(change.new) : String(change.new)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic">
                  No property diffs recorded for this action.
                </div>
              )}

              {/* Extra Payload Meta */}
              {entry.extra && (
                <div className="pt-2 border-t border-white/5 text-[11px] font-mono text-slate-400">
                  <span className="text-slate-500">Extra: </span>
                  {JSON.stringify(entry.extra)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
