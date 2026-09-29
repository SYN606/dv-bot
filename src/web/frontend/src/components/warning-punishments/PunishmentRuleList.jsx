import React from "react";
import PunishmentRuleItem from "./PunishmentRuleItem";
import EmptyState from "../ui/EmptyState";
import { Shield } from "lucide-react";

export default function PunishmentRuleList({ rules, onDelete, deletingWarnCount }) {
  if (rules.length === 0) {
    return (
      <EmptyState
        icon={Shield}
        title="No punishment rules configured"
        description="Warnings are currently recorded without triggering automatic punishment thresholds."
      />
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold">Punishment Rules</h2>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/5 text-slate-400">
          {rules.length} {rules.length === 1 ? "rule" : "rules"}
        </span>
      </div>

      <div className="space-y-0">
        {rules.map((rule, idx) => (
          <PunishmentRuleItem
            key={rule.warn_count}
            rule={rule}
            onDelete={onDelete}
            isDeleting={deletingWarnCount === rule.warn_count}
            isLast={idx === rules.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
