import React from "react";
import { Trash2, ArrowDown } from "lucide-react";
import Badge from "../ui/Badge";
import { formatPunishmentDuration, getPunishmentType } from "../../utils/warning-punishments/punishment";

function getPunishmentVariant(actionType) {
  switch (actionType) {
    case "ban": return "danger";
    case "tempban": return "warning";
    case "kick": return "warning";
    case "timeout": return "default";
    default: return "default";
  }
}

export default function PunishmentRuleItem({ rule, onDelete, isDeleting, isLast }) {
  const pType = getPunishmentType(rule.action_type);
  const hasDuration = pType ? pType.requiresDuration : (rule.action_type === "timeout" || rule.action_type === "tempban");
  const variant = getPunishmentVariant(rule.action_type);

  return (
    <div className="flex flex-col items-start">
      <div className="w-full glass-panel bg-slate-900/50 p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors group flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="shrink-0 mt-0.5">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex flex-col items-center justify-center">
              <span className="text-base font-black font-mono text-white leading-none">{rule.warn_count}</span>
              <span className="text-[8px] text-slate-500 uppercase tracking-wider leading-none">warns</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-bold text-white">{pType?.name || rule.action_type}</span>
              <Badge variant={variant}>{rule.action_type.toUpperCase()}</Badge>
            </div>
            {hasDuration && rule.duration && (
              <div className="text-sm text-slate-400 mt-1">
                Duration: <span className="text-indigo-300 font-semibold">{formatPunishmentDuration(rule.duration)}</span>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => onDelete(rule)}
          disabled={isDeleting}
          className="shrink-0 p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
          title="Remove rule"
          aria-label={`Remove punishment rule for ${rule.warn_count} warnings`}
        >
          {isDeleting
            ? <span className="w-4 h-4 border-2 border-rose-400/50 border-t-rose-400 rounded-full animate-spin inline-block" />
            : <Trash2 className="w-4 h-4" />
          }
        </button>
      </div>

      {!isLast && (
        <div className="ml-5 my-1 flex items-center gap-2 text-xs text-slate-600">
          <ArrowDown className="w-3 h-3" />
        </div>
      )}
    </div>
  );
}
