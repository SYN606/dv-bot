import React from "react";
import AuditLogEntryCard from "./AuditLogEntryCard";
import EmptyState from "../ui/EmptyState";
import { ShieldAlert, Layers } from "lucide-react";
import Button from "../ui/Button";

export default function AuditLogsList({
  entries = [],
  missingPermission = false,
  onResetFilters,
  onRefresh,
  onFilterByExecutor,
  onFilterByTarget,
  onFilterByAction,
}) {
  // If the bot lacks Discord ViewAuditLog permission
  if (missingPermission) {
    return (
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-amber-500/30 bg-amber-500/5 text-center max-w-2xl mx-auto my-8">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8 animate-pulse" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">
          Discord Permission Required: View Audit Log
        </h3>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
          Digital Vigital requires the <code className="px-1.5 py-0.5 rounded bg-slate-900 border border-white/10 text-amber-300 font-mono text-xs">View Audit Log</code> permission in this Discord server to stream and inspect internal audit history.
        </p>

        <div className="bg-slate-950/70 p-4 rounded-2xl border border-white/5 text-left text-xs text-slate-400 space-y-2 mb-6">
          <div className="font-bold text-white uppercase tracking-wider font-mono text-[11px]">
            How to resolve:
          </div>
          <ol className="list-decimal list-inside space-y-1">
            <li>Open Discord and go to <strong>Server Settings &gt; Roles</strong>.</li>
            <li>Select the <strong>Digital Vigital</strong> bot integration role.</li>
            <li>Navigate to the <strong>Permissions</strong> tab and enable <strong>View Audit Log</strong>.</li>
            <li>Save changes in Discord and return here.</li>
          </ol>
        </div>

        <Button
          variant="primary"
          onClick={onRefresh}
          className="text-xs px-6 py-2.5"
        >
          Recheck Permissions
        </Button>
      </div>
    );
  }

  // If no entries match the filters
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="No audit entries found"
        description="No audit events matched your search query or selected category filter."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={onResetFilters}
            className="text-xs"
          >
            Clear Filters & Reset
          </Button>
        }
      />
    );
  }

  // Render list of entries
  return (
    <div className="space-y-3.5 animate-in fade-in duration-300">
      {entries.map((entry) => (
        <AuditLogEntryCard
          key={entry.id}
          entry={entry}
          onFilterByExecutor={onFilterByExecutor}
          onFilterByTarget={onFilterByTarget}
          onFilterByAction={onFilterByAction}
        />
      ))}
    </div>
  );
}
